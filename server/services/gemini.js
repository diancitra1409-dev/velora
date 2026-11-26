import { GoogleGenAI } from '@google/genai';

const MODEL_PRIORITY = [
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-3.8-flash',
  'gemma-3-27b-it',
];

const MODEL_TIMEOUT_MS = 4000;
const MAX_OUTPUT_TOKENS = 400;

// Cached in memory across warm invocations (local Express & Vercel serverless)
let cachedWorkingModel = null;

export function getCachedModel() {
  return cachedWorkingModel || MODEL_PRIORITY[0];
}

function extractStatusCode(err) {
  if (!err) return null;
  if (err.isTimeout || err.name === 'AbortError' || err.name === 'TimeoutError') {
    return 504;
  }
  if (typeof err.status === 'number') return err.status;
  if (typeof err.code === 'number') return err.code;
  if (typeof err?.error?.code === 'number') return err.error.code;

  const msg = String(err.message || '');
  if (/timed?\s*out|aborted/i.test(msg)) return 504;
  if (/\b503\b|UNAVAILABLE/i.test(msg)) return 503;
  if (/\b429\b|RESOURCE_EXHAUSTED|quota|rate.?limit/i.test(msg)) return 429;
  if (/\b404\b|NOT_FOUND/i.test(msg)) return 404;
  if (/\b400\b|INVALID_ARGUMENT/i.test(msg)) return 400;
  if (/\b401\b|\b403\b|API_KEY_INVALID|PERMISSION_DENIED/i.test(msg)) return 401;
  return null;
}

function isThinkingUnsupportedError(err) {
  const status = extractStatusCode(err);
  const msg = String(err?.message || '').toLowerCase();
  return (
    status === 400 &&
    (msg.includes('thinking') || msg.includes('thinkingbudget') || msg.includes('thinking_config'))
  );
}

function isSystemInstructionUnsupportedError(err) {
  const status = extractStatusCode(err);
  const msg = String(err?.message || '').toLowerCase();
  return (
    status === 400 &&
    (msg.includes('developer instruction') || msg.includes('system instruction') || msg.includes('systeminstruction'))
  );
}

function shouldTryNextModel(status) {
  return status === 504 || status === 503 || status === 429 || status === 404;
}

function extractCleanErrorMessage(err) {
  const raw = String(err?.message || '').trim();
  if (!raw) return 'Unable to generate a response from the AI assistant.';

  if (raw.startsWith('{') && raw.endsWith('}')) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.error?.message) return String(parsed.error.message);
      if (parsed?.message) return String(parsed.message);
    } catch {
      // Fall through to status mapping
    }
  }

  const status = extractStatusCode(err);
  if (status === 429) {
    return 'AI service rate limit reached. Please wait a moment and try again.';
  }
  if (status === 503 || status === 504) {
    return 'AI service is temporarily busy. Please try again in a few seconds.';
  }
  if (status === 401) {
    return 'Gemini API key is invalid or unauthorized. Please check GEMINI_API_KEY.';
  }

  return raw;
}

function buildSystemPrompt(book) {
  const baseInstructions = [
    'You are Velora, an honest, warm, and insightful literary assistant.',
    'Always reply in the same language as the user (Indonesian or English).',
    'Keep answers concise, engaging, and scannable: 2–4 short paragraphs or crisp bullet points.',
    'Keep spoiler-free requests strictly spoiler-free.',
    'STRICT ANTI-HALLUCINATION RULE: NEVER fabricate, guess, or invent plot details, character names, quotes, endings, publication facts, or authors for any book you do not have verified data on.',
  ];

  if (!book || !book.title) {
    return [
      ...baseInstructions,
      'Mode: General Book Discovery (No Active Book Selected).',
      'Suggest genuinely well-known real books that match the user’s mood, theme, or reading goal.',
      'If the user asks about a specific book title or author that is niche, local/indie, or not 100% certain in your verified knowledge, do NOT guess its plot or details. Instead, honestly tell the user (in Indonesian or English, matching their language) that verified synopsis data for that title is not in the catalog yet, and invite them to paste the book’s blurb/synopsis (or use "+ Add Book Manually") so you can analyze its vibe and recommend similar books.',
    ].join('\n');
  }

  const authors =
    Array.isArray(book.authors) && book.authors.length > 0
      ? book.authors.slice(0, 3).join(', ')
      : 'Unknown';
  const year = book.firstPublishYear || 'Unknown';
  const subjects =
    Array.isArray(book.subjects) && book.subjects.length > 0
      ? book.subjects.slice(0, 5).join(', ')
      : 'Not specified';
  const rawSynopsis = book.description || book.firstSentence || '';
  const synopsis = rawSynopsis ? String(rawSynopsis).trim().slice(0, 600) : '';
  const hasRichSynopsis = synopsis.length >= 60;

  return [
    ...baseInstructions,
    'Mode: Active Book Context.',
    'Ground your answers STRICTLY in the verified book metadata and synopsis below:',
    `- Title: ${book.title}`,
    `- Author(s): ${authors}`,
    `- Year: ${year}`,
    `- Subjects: ${subjects}`,
    `- Synopsis / Excerpt: ${synopsis || 'Not available'}`,
    hasRichSynopsis
      ? 'Base any summary or vibe analysis strictly on the provided synopsis and metadata without inventing unverified plot twists or characters.'
      : 'WARNING — Synopsis is missing or very brief: Explicitly state only what is known from the metadata above (title, author, year, subjects, or excerpt). Do NOT invent plot twists, characters, or storylines; invite the user to paste the blurb/synopsis if they want deeper analysis.',
    'For "Ringkasan & Vibe (No Spoiler)", summarize only verified premise/themes and reading atmosphere without spoilers.',
    'For "Cocok untuk siapa?", describe ideal reader profiles grounded in the verified themes/subjects.',
    'For "3 Buku Mirip Ini", recommend 3 real, verifiable books (title, author, brief reason) aligned with these themes.',
  ].join('\n');
}

function buildContents(history = [], message) {
  const contents = [];
  if (Array.isArray(history)) {
    for (const turn of history.slice(-4)) {
      if (!turn || typeof turn.text !== 'string' || !turn.text.trim()) continue;
      contents.push({
        role: turn.role === 'model' ? 'model' : 'user',
        parts: [{ text: turn.text.trim().slice(0, 1200) }],
      });
    }
  }
  contents.push({
    role: 'user',
    parts: [{ text: message.trim() }],
  });
  return contents;
}

function buildContentsWithInlineSystem(systemInstruction, history, message) {
  const base = buildContents(history, message);
  const firstUser = base[0];
  if (firstUser && firstUser.role === 'user') {
    firstUser.parts = [
      { text: `Instructions:\n${systemInstruction}\n\nUser request:\n${firstUser.parts[0].text}` },
    ];
  }
  return base;
}

/**
 * Call a single model with a strict 4000ms timeout (AbortSignal.timeout(4000)),
 * safely stripping thinkingConfig or folding systemInstruction if unsupported.
 */
async function callModelWithTimeout(ai, model, systemInstruction, history, message) {
  const invoke = async ({ contents, config }) => {
    const timeoutSignal = AbortSignal.timeout(MODEL_TIMEOUT_MS);
    let timerId;

    const timeoutPromise = new Promise((_, reject) => {
      timerId = setTimeout(() => {
        const timeoutErr = new Error(`Model ${model} timed out after ${MODEL_TIMEOUT_MS}ms`);
        timeoutErr.isTimeout = true;
        timeoutErr.status = 504;
        reject(timeoutErr);
      }, MODEL_TIMEOUT_MS);
    });

    try {
      const apiPromise = ai.models.generateContent({
        model,
        contents,
        config: {
          ...config,
          abortSignal: timeoutSignal,
        },
      });
      const response = await Promise.race([apiPromise, timeoutPromise]);
      const text = response?.text?.trim();
      if (!text) {
        throw new Error('Gemini returned an empty response.');
      }
      return text;
    } finally {
      clearTimeout(timerId);
    }
  };

  let currentContents = buildContents(history, message);
  let currentConfig = {
    systemInstruction,
    temperature: 0.7,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    ...(model.startsWith('gemma-') ? {} : { thinkingConfig: { thinkingBudget: 0 } }),
  };

  for (let pass = 0; pass < 3; pass += 1) {
    try {
      return await invoke({ contents: currentContents, config: currentConfig });
    } catch (err) {
      if (isThinkingUnsupportedError(err) && currentConfig.thinkingConfig) {
        const { thinkingConfig: _removed, ...rest } = currentConfig;
        currentConfig = rest;
        continue;
      }
      if (isSystemInstructionUnsupportedError(err) && currentConfig.systemInstruction) {
        const { systemInstruction: sys, ...rest } = currentConfig;
        currentConfig = rest;
        currentContents = buildContentsWithInlineSystem(sys, history, message);
        continue;
      }
      throw err;
    }
  }
}

/**
 * Generate an AI reply using fast-first model priority without extra network calls.
 */
export async function generateBookAssistantReply({ message, history, book }) {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    const configError = new Error('GEMINI_API_KEY is missing in environment variables.');
    configError.status = 500;
    configError.isMissingApiKey = true;
    throw configError;
  }

  const ai = new GoogleGenAI({ apiKey });
  const systemInstruction = buildSystemPrompt(book);

  const orderedModels = cachedWorkingModel
    ? [cachedWorkingModel, ...MODEL_PRIORITY.filter((m) => m !== cachedWorkingModel)]
    : [...MODEL_PRIORITY];

  let lastErr;
  for (const model of orderedModels) {
    try {
      const reply = await callModelWithTimeout(ai, model, systemInstruction, history, message);
      cachedWorkingModel = model;
      return { reply, model };
    } catch (err) {
      lastErr = err;
      const status = extractStatusCode(err);
      if (!shouldTryNextModel(status)) {
        const cleanErr = new Error(extractCleanErrorMessage(err));
        cleanErr.status = status || 500;
        throw cleanErr;
      }
    }
  }

  const finalStatus = extractStatusCode(lastErr) || 503;
  const finalErr = new Error(extractCleanErrorMessage(lastErr));
  finalErr.status = finalStatus >= 400 && finalStatus < 600 ? finalStatus : 503;
  throw finalErr;
}
