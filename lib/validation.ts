// ============================================================
// INPUT VALIDATION UTILITIES
// ============================================================

/**
 * Validasi Ethereum address.
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validasi number string (positive, reasonable range).
 */
export function isValidNumber(
  value: string,
  min?: number,
  max?: number
): boolean {
  const num = Number(value);
  if (isNaN(num) || num <= 0) return false;
  if (min !== undefined && num < min) return false;
  if (max !== undefined && num > max) return false;
  return true;
}

/**
 * Validasi leverage percent (10-50).
 */
export function isValidLeverage(value: number): boolean {
  return [10, 20, 30, 40, 50].includes(value);
}

/**
 * Validasi token symbol (1-10 chars, uppercase letters).
 */
export function isValidTokenSymbol(symbol: string): boolean {
  return /^[A-Z]{1,10}$/.test(symbol);
}

/**
 * Validasi token name (1-50 chars).
 */
export function isValidTokenName(name: string): boolean {
  return name.length >= 1 && name.length <= 50;
}

/**
 * Validasi URL.
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitize string input (remove potential XSS).
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, 1000);
}

/**
 * Validasi chain name.
 */
export function isValidChain(chain: string): boolean {
  const validChains = ["ethereum", "arbitrum", "base", "bsc"];
  return validChains.includes(chain.toLowerCase());
}

/**
 * Validasi status value.
 */
export function isValidStatus(
  status: string,
  allowed: string[]
): boolean {
  return allowed.includes(status);
}

/**
 * Parse and validate pagination params.
 */
export function parsePagination(searchParams: URLSearchParams): {
  limit: number;
  offset: number;
} {
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")));
  const offset = Math.max(0, parseInt(searchParams.get("offset") || "0"));
  return { limit, offset };
}

/**
 * Validate request body has required fields.
 */
export function validateRequiredFields(
  body: Record<string, unknown>,
  fields: string[]
): { valid: boolean; missing: string[] } {
  const missing = fields.filter((f) => !body[f] && body[f] !== 0);
  return {
    valid: missing.length === 0,
    missing,
  };
}
