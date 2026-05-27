/**
 * Prompt Injection Defense
 *
 * Per claude.md §4: "If a payload contains semantic override flags
 * (e.g., 'ignore previous instructions', 'lupakan instruksi'),
 * drop database connection pipelines to the AI model instantly and
 * return a hardcoded static fallback text."
 */

// ─── Injection Patterns ─────────────────────────────────────────────────────────
// Regex patterns that detect prompt injection attempts.
// Covers English + Indonesian variants as specified in claude.md.
const INJECTION_PATTERNS: RegExp[] = [
  // English patterns
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /ignore\s+(all\s+)?prior\s+instructions/i,
  /disregard\s+(all\s+)?previous/i,
  /forget\s+(all\s+)?(your\s+)?instructions/i,
  /override\s+(system|previous)\s+(prompt|instructions)/i,
  /you\s+are\s+now\s+(?:a|an)\s+/i,
  /act\s+as\s+(?:a|an)\s+(?!customer)/i,  // "act as a [role]" but not "act as a customer"
  /pretend\s+(?:you(?:'re|\s+are)\s+|to\s+be\s+)/i,
  /new\s+instructions?\s*:/i,
  /system\s*:\s*/i,

  // Indonesian patterns (as specified in claude.md)
  /lupakan\s+instruksi/i,
  /abaikan\s+instruksi/i,
  /abaikan\s+perintah/i,
  /lupakan\s+perintah/i,
  /ganti\s+peran/i,
  /ubah\s+peran/i,
];

// ─── Static Fallback Response ───────────────────────────────────────────────────
const FALLBACK_RESPONSE =
  'Maaf, saya tidak bisa memproses permintaan tersebut. ' +
  'Ada yang lain yang bisa saya bantu? 😊';

/**
 * Scans a message for prompt injection patterns.
 *
 * @param text - The incoming customer message text
 * @returns `true` if an injection attempt is detected
 */
export function detectInjection(text: string): boolean {
  return INJECTION_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * Returns the hardcoded static fallback text used when an injection is detected.
 */
export function getFallbackResponse(): string {
  return FALLBACK_RESPONSE;
}
