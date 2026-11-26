import { GoogleGenAI } from '@google/genai';

const PRIMARY_MODEL = 'gemini-3.8-flash';
const FAST_RETRY_DELAY_MS = 400;
const REQUEST_TIMEOUT_MS = 3500;
const MAX_OUTPUT_TOKENS = 450;

// Cached in memory across warm invocations (local Express & Vercel serverless)
let cachedWorkingModel = PRIMARY_MODEL;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getCachedModel() {
  return cachedWorkingModel;
}

/**
 * Extract numeric HTTP status code or timeout signal from @google/genai errors.
 */
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

/**
 * Extract a clean, non-JSON error message suitable for API responses.
 */
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

function isModelFailureForFallback(status) {
  return status === 503 || status === 429 || status === 404 || status === 504;
}

/**
 * Normalize model resource names (e.g., "models/gemini-2.5-flash" -> "gemini-2.5-flash").
 */
function normalizeModelId(name = '') {
  return name.replace(/^models\//, '').trim();
}

/**
 * Discover alternative flash-lite / flash models dynamically via ai.models.list().
 */
async function discoverFallbackModels(ai, excludeModels) {
  const candidates = [];
  try {
    const pager = await ai.models.list({ config: { pageSize: 50 } });
    let count = 0;
    for await (const model of pager) {
      count += 1;
      const id = normalizeModelId(model?.name || '');
      if (!id || excludeModels.has(id)) continue;

      const lower = id.toLowerCase();
      const isFlashFamily = lower.includes('flash');
      const isSpecializedNonChat =
        lower.includes('tts') ||
        lower.includes('image') ||
        lower.includes('audio') ||
        lower.includes('live') ||
        lower.includes('computer-use') ||
        lower.includes('embedding');

      const supportsGenerate =
        !Array.isArray(model.supportedActions) ||
        model.supportedActions.includes('generateContent');

      if (isFlashFamily && !isSpecializedNonChat && supportsGenerate) {
        candidates.push(id);
      }

      if (count >= 60) break;
    }
  } catch (listErr) {
    console.warn('[Velora] Failed to list fallback models:', listErr?.message || listErr);
  }

  // Prioritize fast flash-lite and stable flash models
  candidates.sort((a, b) => {
    const score = (id) => {
      let s = 0;
      if (id.includes('flash-lite')) s += 40;
      else if (id.endsWith('flash')) s += 30;
      if (id.includes('2.5')) s += 20;
      else if (id.includes('3.')) s += 15;
      else if (id.includes('2.0')) s += 10;
      if (id.includes('preview')) s -= 2;
      return s;
    };
    return score(b) - score(a);
  });

  return candidates;
}

/**
 * Build strict anti-hallucination system prompt with compact book metadata (top 5 subjects, max 600 chars synopsis).
 */
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

/**
 * Keep only the last 4 chat messages for low-latency context.
 */
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
 * Execute a single generateContent call bounded by REQUEST_TIMEOUT_MS,
 * safely stripping thinkingConfig if a fallback model does not support it.
 */
async function callWithTimeout(ai, model, contents, baseConfig, timeoutMs = REQUEST_TIMEOUT_MS) {
  const invoke = async (configObj) => {
    const controller = new AbortController();
    let timerId;

    const timeoutPromise = new Promise((_, reject) => {
      timerId = setTimeout(() => {
        controller.abort();
        const timeoutErr = new Error(`Model ${model} timed out after ${timeoutMs}ms`);
        timeoutErr.isTimeout = true;
        timeoutErr.status = 504;
        reject(timeoutErr);
      }, timeoutMs);
    });

    try {
      const apiPromise = ai.models.generateContent({
        model,
        contents,
        config: {
          ...configObj,
          abortSignal: controller.signal,
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

  try {
    return await invoke(baseConfig);
  } catch (err) {
    if (isThinkingUnsupportedError(err) && baseConfig.thinkingConfig) {
      const { thinkingConfig: _removed, ...withoutThinking } = baseConfig;
      return await invoke(withoutThinking);
    }
    throw err;
  }
}

/**
 * Try a model with at most 1 fast retry (400ms delay) on 503/429 (not on stall/timeout).
 */
async function generateFast(ai, model, contents, baseConfig) {
  try {
    return await callWithTimeout(ai, model, contents, baseConfig, REQUEST_TIMEOUT_MS);
  } catch (firstErr) {
    const status = extractStatusCode(firstErr);
    // If it stalled (504) or isn't 503/429, fail immediately so fallback triggers right away
    if (status !== 503 && status !== 429) {
      throw firstErr;
    }
    await sleep(FAST_RETRY_DELAY_MS);
    return await callWithTimeout(ai, model, contents, baseConfig, REQUEST_TIMEOUT_MS);
  }
}

/**
 * Generate a fast literary assistant reply with immediate fallback & module-level model caching.
 */
export async function generateBookAssistantReply({ message, history, book }) {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    const configError = new Error(
      'GEMINI_API_KEY is not configured. Add a valid key to your .env or Vercel environment variables.'
    );
    configError.status = 500;
    throw configError;
  }

  const ai = new GoogleGenAI({ apiKey });
  const contents = buildContents(history, message);
  const baseConfig = {
    systemInstruction: buildSystemPrompt(book),
    temperature: 0.7,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    thinkingConfig: { thinkingBudget: 0 },
  };

  const triedModels = new Set();
  const activeModel = cachedWorkingModel || PRIMARY_MODEL;
  triedModels.add(activeModel);

  try {
    const reply = await generateFast(ai, activeModel, contents, baseConfig);
    cachedWorkingModel = activeModel;
    return { reply, model: activeModel };
  } catch (primaryErr) {
    const primaryStatus = extractStatusCode(primaryErr);

    if (!isModelFailureForFallback(primaryStatus)) {
      const err = new Error(extractCleanErrorMessage(primaryErr));
      err.status = primaryStatus || 500;
      throw err;
    }

    // Immediately discover and switch to an available flash-lite / flash model
    const fallbacks = await discoverFallbackModels(ai, triedModels);
    let lastFallbackErr = primaryErr;

    for (const fallbackModel of fallbacks.slice(0, 2)) {
      triedModels.add(fallbackModel);
      try {
        const reply = await generateFast(ai, fallbackModel, contents, baseConfig);
        // Cache working fallback so subsequent requests skip gemini-3.8-flash
        cachedWorkingModel = fallbackModel;
        return { reply, model: fallbackModel };
      } catch (fallbackErr) {
        lastFallbackErr = fallbackErr;
        const fbStatus = extractStatusCode(fallbackErr);
        if (!isModelFailureForFallback(fbStatus)) {
          break;
        }
      }
    }

    const finalStatus = extractStatusCode(lastFallbackErr) || primaryStatus || 503;
    const finalErr = new Error(extractCleanErrorMessage(lastFallbackErr));
    finalErr.status = finalStatus >= 400 && finalStatus < 600 ? finalStatus : 503;
    throw finalErr;
  }
}
