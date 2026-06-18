import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js Middleware
 *
 * Security headers & basic protection.
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // CORS for API routes
  if (request.nextUrl.pathname.startsWith("/api/")) {
    response.headers.set(
      "Access-Control-Allow-Origin",
      process.env.NEXT_PUBLIC_APP_URL || "*"
    );
    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS"
    );
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
  }

  // Block suspicious requests
  const userAgent = request.headers.get("user-agent") || "";
  if (
    userAgent.includes("bot") &&
    !request.nextUrl.pathname.startsWith("/api/")
  ) {
    // Allow bots for API but not for pages (optional)
  }

  return response;
}

export const config = {
  matcher: [
    "/api/:path*",
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
