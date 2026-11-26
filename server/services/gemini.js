import { GoogleGenAI } from '@google/genai';

const MODEL_TIMEOUT_MS = 7500;
const MAX_OUTPUT_TOKENS = 450;

const EXCLUDED_MODEL_TOKENS = [
  'gemma',
  'embedding',
  'imagen',
  'veo',
  'tts',
  'aqa',
  'robotics',
  'native-audio',
  'computer-use',
  '-image',
];

const FALLBACK_SEED_MODELS = [
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
];

// Cached in module memory across warm invocations (local Express & Vercel serverless)
let cachedDiscoveredModels = null;
let cachedWorkingModel = null;

export function getCachedModel() {
  return cachedWorkingModel || cachedDiscoveredModels?.[0] || FALLBACK_SEED_MODELS[0];
}

function normalizeModelId(name = '') {
  return String(name).replace(/^models\//, '').trim();
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

function parseVersionScore(modelId) {
  const match = modelId.match(/gemini-(\d+)(?:\.(\d+))?/i);
  if (!match) return 0;
  const major = Number(match[1]) || 0;
  const minor = Number(match[2]) || 0;
  return major * 10 + minor;
}

function scoreModelPriority(modelId) {
  const lower = modelId.toLowerCase();
  let score = 0;

  if (lower.includes('flash-lite')) {
    score += 3000;
  } else if (lower.includes('flash')) {
    score += 2000;
  } else if (lower.includes('pro')) {
    score += 500;
  } else {
    score += 1000;
  }

  score += parseVersionScore(lower);

  // Slightly prefer stable aliases over preview/experimental/dated snapshots
  if (lower.includes('preview') || lower.includes('exp')) {
    score -= 5;
  }
  if (/-\d{3,}$/.test(lower) || /-\d{2}-\d{2}/.test(lower)) {
    score -= 3;
  }

  return score;
}

/**
 * Filter & sort live models from ai.models.list():
 * Keep ONLY `gemini-` models supporting `generateContent`, excluding non-chat models,
 * and sort flash-lite / flash variants ahead of pro models.
 */
export function filterAndSortGeminiModels(rawModels = []) {
  const uniqueIds = new Set();

  for (const model of rawModels) {
    const id = normalizeModelId(model?.name || '');
    if (!id) continue;

    const lower = id.toLowerCase();
    if (!lower.includes('gemini-')) continue;

    const hasExcludedToken = EXCLUDED_MODEL_TOKENS.some((tok) => lower.includes(tok));
    if (hasExcludedToken) continue;

    const supportsGenerateContent =
      Array.isArray(model?.supportedActions) &&
      model.supportedActions.includes('generateContent');
    if (!supportsGenerateContent) continue;

    uniqueIds.add(id);
  }

  return Array.from(uniqueIds).sort((a, b) => scoreModelPriority(b) - scoreModelPriority(a));
}

async function getDiscoveredModels(ai) {
  if (Array.isArray(cachedDiscoveredModels) && cachedDiscoveredModels.length > 0) {
    return cachedDiscoveredModels;
  }

  const collected = [];
  try {
    const pager = await ai.models.list({ config: { pageSize: 100 } });
    for await (const model of pager) {
      collected.push(model);
      if (collected.length >= 150) break;
    }

    const filtered = filterAndSortGeminiModels(collected);
    if (filtered.length > 0) {
      cachedDiscoveredModels = filtered;
      return filtered;
    }
  } catch (listErr) {
    console.warn('[Velora] ai.models.list() failed, using fallback seed list:', listErr?.message || listErr);
  }

  return [...FALLBACK_SEED_MODELS];
}

function buildSystemPrompt(book) {
  const baseInstructions = [
    'You are Velora, an honest, warm, and insightful literary assistant.',
    'Always reply in the same language as the user (Indonesian or English).',
    'Keep answers concise, engaging, and scannable: 2–4 short paragraphs or crisp bullet points.',
    'Keep spoiler-free requests strictly spoiler-free.',
  ];

  if (!book || !book.title) {
    return [
      ...baseInstructions,
      'Mode: General Book Discovery (No Active Book Selected).',
      'Suggest genuinely well-known real books that match the user’s mood, theme, or reading goal.',
      'If the user asks about a specific book title or author, follow this 3-tier rule:',
      '- If it is a well-known published work you know with certainty, share an accurate spoiler-free overview, themes, and reading vibe.',
      '- ONLY state that synopsis data is unavailable if the title is an obscure, indie, or unreleased work that you genuinely do not recognize—never invent fake plot details, and invite the user to paste the blurb via "+ Add Book Manually".',
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

  return [
    ...baseInstructions,
    'Mode: Active Book Context.',
    'Selected book metadata:',
    `- Title: ${book.title}`,
    `- Author(s): ${authors}`,
    `- Year: ${year}`,
    `- Subjects: ${subjects}`,
    `- Synopsis / Description: ${synopsis || 'Not provided'}`,
    '3-TIER GROUNDING RULE (follow in strict priority):',
    '- Tier 1: If a description/blurb is provided above, base your summary, themes, and analysis primarily on that text.',
    '- Tier 2: If description is empty or very short, use your own verified knowledge of the published book (this title by this author) to give an accurate, spoiler-free synopsis, premise, themes, and reading vibe.',
    '- Tier 3 (Anti-Hallucination): ONLY state that synopsis data is unavailable if this title is an obscure, indie, or unreleased work that you genuinely do not recognize—NEVER invent fake plot details, characters, or quotes, and invite the user to paste the blurb via "+ Add Book Manually".',
    'For "Ringkasan & Vibe (No Spoiler)", provide an engaging spoiler-free premise and reading atmosphere.',
    'For "Cocok untuk siapa?", highlight ideal reader profiles and reading moods.',
    'For "3 Buku Mirip Ini", recommend 3 real, verifiable books (title, author, brief reason) aligned with this book.',
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

/**
 * Call a single Gemini model bounded by a 7500ms timeout without thinkingConfig.
 */
async function callModelWithTimeout(ai, model, systemInstruction, history, message) {
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
      contents: buildContents(history, message),
      config: {
        systemInstruction,
        temperature: 0.7,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
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
}

/**
 * Generate an AI reply using cached live Gemini model discovery and fast flash-first ordering.
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
  const discoveredModels = await getDiscoveredModels(ai);

  const orderedModels = cachedWorkingModel
    ? [cachedWorkingModel, ...discoveredModels.filter((m) => m !== cachedWorkingModel)]
    : discoveredModels;

  let lastErr;
  for (const model of orderedModels.slice(0, 5)) {
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
