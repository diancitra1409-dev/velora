/**
 * Recursively unwrap JSON-encoded error payloads or strings so users never see raw JSON.
 */
function extractMessageFromUnknown(input, depth = 0) {
  if (depth > 4 || input == null) return '';

  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return '';

    // Check if string looks like JSON (object or array)
    if (
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))
    ) {
      try {
        const parsed = JSON.parse(trimmed);
        const extracted = extractMessageFromUnknown(parsed, depth + 1);
        if (extracted) return extracted;
      } catch {
        // Not valid JSON; strip brace clutter if it contains a message field
        const match = trimmed.match(/"message"\s*:\s*"([^"]+)"/);
        if (match?.[1]) return match[1];
      }
    }
    return trimmed;
  }

  if (typeof input === 'object') {
    if (input.error) {
      const fromError = extractMessageFromUnknown(input.error, depth + 1);
      if (fromError) return fromError;
    }
    if (input.message) {
      const fromMessage = extractMessageFromUnknown(input.message, depth + 1);
      if (fromMessage) return fromMessage;
    }
    if (input.detail) {
      const fromDetail = extractMessageFromUnknown(input.detail, depth + 1);
      if (fromDetail) return fromDetail;
    }
  }

  return '';
}

/**
 * Convert raw API, network, or Gemini errors into clean, human-readable messages.
 */
export function parseFriendlyError(err, fallback = 'Something went wrong. Please try again.') {
  const rawMessage = extractMessageFromUnknown(err) || '';
  const lower = rawMessage.toLowerCase();

  if (!rawMessage) {
    return fallback;
  }

  if (
    lower.includes('failed to fetch') ||
    lower.includes('fetch failed') ||
    lower.includes('networkerror') ||
    lower.includes('network request failed') ||
    lower.includes('econnrefused') ||
    lower.includes('econnreset')
  ) {
    return 'Unable to reach the server. Please check your connection and try again.';
  }

  if (
    lower.includes('429') ||
    lower.includes('resource_exhausted') ||
    lower.includes('rate limit') ||
    lower.includes('quota')
  ) {
    return 'Velora AI is currently receiving too many requests. Please wait a few seconds and try again.';
  }

  if (
    lower.includes('503') ||
    lower.includes('unavailable') ||
    lower.includes('overloaded') ||
    lower.includes('high demand')
  ) {
    return 'The AI assistant is temporarily busy. Please try again in a moment.';
  }

  if (lower.includes('api key') || lower.includes('gemini_api_key') || lower.includes('unauthorized')) {
    return 'Server AI configuration is missing or invalid. Please check GEMINI_API_KEY on the server.';
  }

  // Never leak raw JSON braces to the UI
  if (rawMessage.includes('{') && rawMessage.includes('}')) {
    return fallback;
  }

  return rawMessage;
}
