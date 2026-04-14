// NRIC: S or T prefix, 7 digits, 1 letter checksum
const NRIC_RE = /\b[ST]\d{7}[A-Z]\b/i;

// UEN: 9-digit + letter (post-2009 businesses), 8-digit + letter (pre-2009),
// or alphanumeric entity format T/S/R + 2-digit year + 2 letters + 4 digits + letter
const UEN_RE = /\b(\d{8,9}[A-Z]|[TSR]\d{2}[A-Z]{2}\d{4}[A-Z])\b/i;

const PERSONALISED_RE =
  /\b(should\s+i|will\s+i|how\s+much\s+will\s+i\s+pay|my\s+income)\b/i;

const FACTUAL_RE =
  /\b(what\s+is|what\s+are|deadline|rate|threshold)\b/i;

/**
 * Routes a query to the appropriate provider and model.
 * @param {string} query
 * @returns {{ provider: string, model: string, reason: string }}
 */
export function routeQuery(query) {
  if (NRIC_RE.test(query) || UEN_RE.test(query)) {
    return {
      provider: "anthropic",
      model: "claude-haiku-4-5-20251001",
      reason: "pii-sensitive",
    };
  }

  if (PERSONALISED_RE.test(query)) {
    return {
      provider: "anthropic",
      model: "claude-haiku-4-5-20251001",
      reason: "personalised-advice",
    };
  }

  if (FACTUAL_RE.test(query)) {
    return {
      provider: "openai",
      model: "gpt-4o-mini",
      reason: "factual-lookup",
    };
  }

  return {
    provider: "anthropic",
    model: "claude-haiku-4-5-20251001",
    reason: "default",
  };
}
