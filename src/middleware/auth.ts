import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE_NAME = 'session-token';
const DEFAULT_SESSION_DURATION_MS = 1000 * 60 * 60 * 8; // 8 hours

export interface SessionTokenPayload {
  sub: string;
  iat: number;
  exp: number;
}

interface SessionTokenResult {
  token: string;
  payload: SessionTokenPayload;
}

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

let cachedSecret: string | null = null;
let cachedKey: CryptoKey | null = null;

function getCrypto(): Crypto {
  if (!globalThis.crypto || !globalThis.crypto.subtle) {
    throw new Error('Web Crypto API is not available in this runtime');
  }
  return globalThis.crypto;
}

function base64UrlEncode(data: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < data.byteLength; i += 1) {
    binary += String.fromCharCode(data[i]!);
  }

  const base64 =
    typeof btoa === 'function'
      ? btoa(binary)
      : Buffer.from(binary, 'binary').toString('base64');

  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '');
}

function base64UrlDecode(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');

  const binary =
    typeof atob === 'function'
      ? atob(padded)
      : Buffer.from(padded, 'base64').toString('binary');

  const output = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    output[i] = binary.charCodeAt(i);
  }
  return output;
}

async function getHmacKey(secret: string): Promise<CryptoKey> {
  if (cachedKey && cachedSecret === secret) {
    return cachedKey;
  }

  const cryptoApi = getCrypto();
  const key = await cryptoApi.subtle.importKey(
    'raw',
    textEncoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );

  cachedSecret = secret;
  cachedKey = key;
  return key;
}

function decodePayload(data: Uint8Array): SessionTokenPayload {
  const json = textDecoder.decode(data);
  return JSON.parse(json) as SessionTokenPayload;
}

export async function createSessionToken(
  subject: string,
  ttlMs: number = DEFAULT_SESSION_DURATION_MS
): Promise<SessionTokenResult> {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET is not configured');
  }

  const issuedAt = Date.now();
  const expiresAt = issuedAt + ttlMs;
  const payload: SessionTokenPayload = {
    sub: subject,
    iat: issuedAt,
    exp: expiresAt,
  };

  const payloadBytes = textEncoder.encode(JSON.stringify(payload));
  const encodedPayload = base64UrlEncode(payloadBytes);
  const cryptoApi = getCrypto();
  const key = await getHmacKey(secret);
  const signatureBuffer = await cryptoApi.subtle.sign('HMAC', key, textEncoder.encode(encodedPayload));
  const signature = base64UrlEncode(new Uint8Array(signatureBuffer));

  return {
    token: `${encodedPayload}.${signature}`,
    payload,
  };
}

export async function verifySessionToken(
  token: string | null | undefined
): Promise<SessionTokenPayload | null> {
  if (!token) {
    return null;
  }

  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    return null;
  }

  const [encodedPayload, providedSignature] = token.split('.');
  if (!encodedPayload || !providedSignature) {
    return null;
  }

  try {
    const cryptoApi = getCrypto();
    const key = await getHmacKey(secret);
    const isValid = await cryptoApi.subtle.verify(
      'HMAC',
      key,
      base64UrlDecode(providedSignature).buffer as ArrayBuffer,
      textEncoder.encode(encodedPayload)
    );

    if (!isValid) {
      return null;
    }

    const payloadBytes = base64UrlDecode(encodedPayload);
    const payload = decodePayload(payloadBytes);

    if (typeof payload.exp !== 'number' || Date.now() >= payload.exp) {
      return null;
    }

    return payload;
  } catch (error) {
    console.error('Failed to verify session token', error);
    return null;
  }
}

export async function requireAuth(req: NextRequest): Promise<NextResponse | null> {
  const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const payload = await verifySessionToken(sessionCookie);

  if (payload) {
    return null;
  }

  return NextResponse.json(
    {
      error: 'Unauthorized',
      message: 'Valid authentication required to access this endpoint',
    },
    { status: 401 }
  );
}

const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string,
  limit: number = 100,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const record = requestCounts.get(identifier);

  if (!record || record.resetTime < now) {
    requestCounts.set(identifier, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count += 1;
  return true;
}

export function resetRateLimit(identifier?: string): void {
  if (identifier) {
    requestCounts.delete(identifier);
    return;
  }
  requestCounts.clear();
}

export { SESSION_COOKIE_NAME, DEFAULT_SESSION_DURATION_MS };
