import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '../models/database';

const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_THIS_IN_PRODUCTION';
const SALT_ROUNDS = 10;

interface User {
  id: string;
  email: string;
  password_hash: string;
  role: string;
}

interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

/**
 * Real authentication service - not theater
 */
export class AuthService {
  /**
   * Hash password securely
   */
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  /**
   * Verify password against hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Create JWT token for user
   */
  static createToken(user: Omit<User, 'password_hash'>): string {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: '8h',
      issuer: 'account-manager',
    });
  }

  /**
   * Verify and decode JWT token
   */
  static verifyToken(token: string): JWTPayload | null {
    try {
      return jwt.verify(token, JWT_SECRET, {
        issuer: 'account-manager',
      }) as JWTPayload;
    } catch {
      return null;
    }
  }

  /**
   * Authenticate user with email and password
   */
  static async authenticate(email: string, password: string): Promise<string | null> {
    try {
      // Get user from database
      const result = await query<User>(
        'SELECT id, email, password_hash, role FROM users WHERE email = $1 AND is_active = true',
        [email]
      );

      const user = result.rows[0];
      if (!user) {
        return null;
      }

      // Verify password
      const isValid = await this.verifyPassword(password, user.password_hash);
      if (!isValid) {
        return null;
      }

      // Create and return token
      return this.createToken({
        id: user.id,
        email: user.email,
        role: user.role,
      });
    } catch (error) {
      console.error('Authentication error:', error);
      return null;
    }
  }

  /**
   * Create new user account
   */
  static async createUser(email: string, password: string, role = 'user'): Promise<User | null> {
    try {
      const passwordHash = await this.hashPassword(password);

      const result = await query<User>(
        `INSERT INTO users (email, password_hash, role, is_active, created_at)
         VALUES ($1, $2, $3, true, NOW())
         RETURNING id, email, role`,
        [email, passwordHash, role]
      );

      return result.rows[0] || null;
    } catch (error) {
      console.error('User creation error:', error);
      return null;
    }
  }

  /**
   * Middleware to verify JWT from cookie
   */
  static middleware(request: NextRequest): NextResponse | null {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const payload = this.verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Add user info to request headers for downstream use
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', payload.userId);
    requestHeaders.set('x-user-email', payload.email);
    requestHeaders.set('x-user-role', payload.role);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  /**
   * Get current user from request
   */
  static getCurrentUser(request: NextRequest): JWTPayload | null {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) return null;

    return this.verifyToken(token);
  }

  /**
   * Logout by creating response that clears cookie
   */
  static logout(): NextResponse {
    const response = NextResponse.json({ success: true });
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0, // Delete cookie
    });
    return response;
  }
}

/**
 * Rate limiting per user (not per IP)
 */
export class UserRateLimiter {
  private static attempts = new Map<string, { count: number; resetAt: number }>();
  private static readonly MAX_ATTEMPTS = 100; // per user per window
  private static readonly WINDOW_MS = 60000; // 1 minute

  static check(userId: string): boolean {
    const now = Date.now();
    const record = this.attempts.get(userId);

    if (!record || record.resetAt < now) {
      this.attempts.set(userId, {
        count: 1,
        resetAt: now + this.WINDOW_MS,
      });
      return true;
    }

    if (record.count >= this.MAX_ATTEMPTS) {
      return false;
    }

    record.count++;
    return true;
  }

  static reset(userId: string): void {
    this.attempts.delete(userId);
  }
}

/**
 * Session store for server-side session management
 */
export class SessionStore {
  private static sessions = new Map<string, { userId: string; expiresAt: number; data: any }>();

  static create(userId: string, data: any = {}): string {
    const sessionId = crypto.randomUUID();
    const expiresAt = Date.now() + (8 * 60 * 60 * 1000); // 8 hours

    this.sessions.set(sessionId, {
      userId,
      expiresAt,
      data,
    });

    // Clean up expired sessions periodically
    this.cleanup();

    return sessionId;
  }

  static get(sessionId: string): { userId: string; data: any } | null {
    const session = this.sessions.get(sessionId);

    if (!session) return null;
    if (session.expiresAt < Date.now()) {
      this.sessions.delete(sessionId);
      return null;
    }

    return {
      userId: session.userId,
      data: session.data,
    };
  }

  static destroy(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  private static cleanup(): void {
    const now = Date.now();
    for (const [id, session] of this.sessions.entries()) {
      if (session.expiresAt < now) {
        this.sessions.delete(id);
      }
    }
  }
}