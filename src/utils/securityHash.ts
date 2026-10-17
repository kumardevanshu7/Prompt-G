/**
 * Utility for hashing and verifying delete-protection secret answers
 * using browser-native Web Crypto SHA-256. Never stores plaintext answers.
 */

export async function hashSecurityAnswer(answer: string): Promise<string> {
  const normalized = answer.trim().toLowerCase();
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function verifySecurityAnswer(
  input: string,
  storedValue?: string
): Promise<boolean> {
  if (!storedValue || !input.trim()) return false;
  const inputHash = await hashSecurityAnswer(input);

  // If already SHA-256 hash (64 hex characters)
  if (storedValue.length === 64 && /^[0-9a-f]{64}$/i.test(storedValue)) {
    return inputHash === storedValue.toLowerCase();
  }

  // Backward compatibility fallback for legacy plaintext answers
  return input.trim().toLowerCase() === storedValue.trim().toLowerCase();
}
