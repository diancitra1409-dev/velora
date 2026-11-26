/**
 * Represents an HTTP error response returned by a reachable backend/API server.
 */
export class ApiHttpError extends Error {
  constructor(status, message, statusText = '') {
    super(message || `HTTP ${status}`);
    this.name = 'ApiHttpError';
    this.status = status;
    this.statusText = statusText;
    this.isHttpError = true;
  }
}

/**
 * Recursively unwrap JSON-encoded error payloads or strings so users never see raw JSON.
 */
function extractMessageFromUnknown(input, depth = 0) {
  if (depth > 4 || input == null) return '';

  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return '';

    // Strip HTML error pages (e.g. proxy 502/404 HTML) rather than leaking markup
    if (/^<!doctype\s+html|^<html[\s>]/i.test(trimmed)) {
      return '';
    }

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
 * Build an ApiHttpError from a non-OK fetch Response without throwing raw JSON/HTML.
 */
export async function buildHttpErrorFromResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  let serverMessage = '';

  try {
    if (contentType.includes('application/json')) {
      const payload = await response.json();
      serverMessage = extractMessageFromUnknown(payload);
    } else {
      const rawText = await response.text();
      serverMessage = extractMessageFromUnknown(rawText);
    }
  } catch {
    serverMessage = '';
  }

  const fallbackByStatus =
    response.status === 404
      ? 'API endpoint not found.'
      : response.status >= 500
        ? response.statusText || 'Internal server error.'
        : response.statusText || 'Request failed.';

  return new ApiHttpError(
    response.status,
    serverMessage || fallbackByStatus,
    response.statusText || ''
  );
}

/**
 * Convert network failures (TypeError) vs HTTP errors into clear, human-readable messages.
 * Only reports "Unable to reach the server" on actual network/fetch failures (TypeError).
 */
export function parseFriendlyError(err, fallback = 'Something went wrong. Please try again.') {
  // Actual network / DNS / offline fetch failures
  if (err instanceof TypeError || err?.isNetworkError === true) {
    return 'Unable to reach the server. Please check your connection and ensure the API server is running.';
  }

  const status = typeof err?.status === 'number' ? err.status : null;
  const rawMessage = extractMessageFromUnknown(err) || '';

  // HTTP response returned by a reachable backend/API
  if (err?.isHttpError || status !== null) {
    const cleanMsg =
      rawMessage && !(rawMessage.includes('{') && rawMessage.includes('}'))
        ? rawMessage
        : fallback;

    if (status && !cleanMsg.includes(String(status))) {
      return `HTTP ${status}: ${cleanMsg}`;
    }
    return cleanMsg;
  }

  if (!rawMessage) {
    return fallback;
  }

  // Never leak raw JSON braces to the UI
  if (rawMessage.includes('{') && rawMessage.includes('}')) {
    return fallback;
  }

  return rawMessage;
}
