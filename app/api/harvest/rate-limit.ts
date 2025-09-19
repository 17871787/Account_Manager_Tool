import { NextRequest, NextResponse } from "next/server";

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT = 10; // 10 requests
const WINDOW_MS = 60000; // per minute

export function rateLimit(req: NextRequest): NextResponse | null {
  // Get client IP or use a default for development
  const clientId = req.headers.get("x-forwarded-for") || 
                   req.headers.get("x-real-ip") || 
                   "default-client";
  
  const now = Date.now();
  const clientData = rateLimitMap.get(clientId);

  if (!clientData || clientData.resetTime < now) {
    // New window or expired window
    rateLimitMap.set(clientId, {
      count: 1,
      resetTime: now + WINDOW_MS,
    });
    return null; // Allow request
  }

  if (clientData.count >= RATE_LIMIT) {
    // Rate limit exceeded
    return NextResponse.json(
      { 
        error: "Rate limit exceeded", 
        message: `Maximum ${RATE_LIMIT} requests per minute allowed` 
      },
      { 
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((clientData.resetTime - now) / 1000)),
        },
      }
    );
  }

  // Increment count
  clientData.count++;
  return null; // Allow request
}

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (value.resetTime < now) {
      rateLimitMap.delete(key);
    }
  }
}, 60000); // Clean up every minute
