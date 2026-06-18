// ============================================================
// RATE LIMITING (in-memory, per-process)
// ============================================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Rate limit check. Returns true if request is allowed.
 *
 * @param key - Unique key (e.g., IP address or wallet address)
 * @param limit - Max requests per window
 * @param windowMs - Time window in milliseconds
 */
export function checkRateLimit(
  key: string,
  limit: number = 60,
  windowMs: number = 60_000
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    // New window
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }

  if (entry.count >= limit) {
    // Rate limited
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  // Increment
  entry.count++;
  return {
    allowed: true,
    remaining: limit - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Get client IP from request headers.
 */
export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Rate limit middleware for API routes.
 * Returns null if allowed, or NextResponse if rate limited.
 */
export async function rateLimitMiddleware(
  request: Request,
  limit: number = 60,
  windowMs: number = 60_000
): Promise<Response | null> {
  const ip = getClientIp(request);
  const result = checkRateLimit(ip, limit, windowMs);

  if (!result.allowed) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Too many requests. Please try again later.",
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": result.resetAt.toString(),
          "Retry-After": Math.ceil(
            (result.resetAt - Date.now()) / 1000
          ).toString(),
        },
      }
    );
  }

  return null; // allowed
}
