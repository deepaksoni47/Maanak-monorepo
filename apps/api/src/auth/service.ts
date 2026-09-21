import argon2 from "argon2";
import jwt from "jsonwebtoken";
import { PrismaClient, prisma as defaultPrisma } from "@maanak/db";

/**
 * Standard MAANAK Legal Metrology User Roles
 */
export enum Role {
  ADMIN = "ADMIN",
  DIRECTOR = "DIRECTOR",
  REVIEWER = "REVIEWER",
  INSPECTOR = "INSPECTOR",
}

export interface JwtUserPayload {
  sub: string;
  username: string;
  email: string;
  role: string;
  laboratoryId: string;
  permissions: string[];
}

export interface AuthenticatedUser extends JwtUserPayload {
  fullName?: string;
  designation?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface AuthResult {
  user: {
    id: string;
    username: string;
    email: string;
    fullName: string;
    designation: string;
    role: string;
    laboratoryId: string;
    permissions: string[];
  };
  tokens: TokenPair;
}

/**
 * OWASP-compliant Argon2id options.
 * Balanced for metrological security and high-throughput API responses.
 */
export const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
};

/**
 * Hash plaintext password using Argon2id
 */
export async function hashPassword(
  password: string,
  options: argon2.Options = ARGON2_OPTIONS,
): Promise<string> {
  return argon2.hash(password, options);
}

/**
 * Verify plaintext password against Argon2 hash
 */
export async function verifyPassword(
  hash: string,
  password: string,
): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

/**
 * Generate Access Token (15m) and Refresh Token (7d)
 */
export function generateTokens(payload: JwtUserPayload): TokenPair {
  const jwtSecret =
    process.env.JWT_SECRET ||
    "maanak-default-access-secret-minimum-32-chars-long";
  const jwtRefreshSecret =
    process.env.JWT_REFRESH_SECRET ||
    "maanak-default-refresh-secret-minimum-32-chars-long";

  const accessToken = jwt.sign(
    {
      sub: payload.sub,
      username: payload.username,
      email: payload.email,
      role: payload.role,
      laboratoryId: payload.laboratoryId,
      permissions: payload.permissions,
    },
    jwtSecret,
    { expiresIn: "15m" },
  );

  const refreshToken = jwt.sign(
    {
      sub: payload.sub,
      tokenType: "refresh",
    },
    jwtRefreshSecret,
    { expiresIn: "7d" },
  );

  return {
    accessToken,
    refreshToken,
    tokenType: "Bearer",
    expiresIn: 15 * 60, // 900 seconds
  };
}

/**
 * Verify and decode access JWT token
 */
export function verifyAccessToken(token: string): JwtUserPayload {
  const jwtSecret =
    process.env.JWT_SECRET ||
    "maanak-default-access-secret-minimum-32-chars-long";
  return jwt.verify(token, jwtSecret) as JwtUserPayload;
}

/**
 * Verify and decode refresh JWT token
 */
export function verifyRefreshToken(token: string): {
  sub: string;
  tokenType: string;
} {
  const jwtRefreshSecret =
    process.env.JWT_REFRESH_SECRET ||
    "maanak-default-refresh-secret-minimum-32-chars-long";
  return jwt.verify(token, jwtRefreshSecret) as {
    sub: string;
    tokenType: string;
  };
}

export interface AuthenticateInput {
  identifier?: string;
  email?: string;
  username?: string;
  password: string;
}

/**
 * Core Authentication Service for MAANAK Metrology API
 */
export class AuthService {
  constructor(private db: PrismaClient = defaultPrisma) {}

  /**
   * Authenticates user credentials via email or username against Argon2id hash.
   */
  async authenticateUser(input: AuthenticateInput): Promise<AuthResult> {
    const identifier = input.email || input.username || input.identifier;
    if (!identifier) {
      throw new Error("Email or username is required for authentication.");
    }

    const user = await this.db.user.findFirst({
      where: {
        OR: [
          { email: identifier.toLowerCase() },
          { username: identifier.toLowerCase() },
        ],
      },
      include: {
        role: true,
        laboratory: true,
      },
    });

    if (!user || !user.isActive) {
      throw new Error("Invalid credentials or user account is inactive.");
    }

    const isValid = await verifyPassword(user.passwordHash, input.password);
    if (!isValid) {
      throw new Error("Invalid credentials.");
    }

    // Update last login timestamp asynchronously
    await this.db.user
      .update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      })
      .catch(() => {
        // Silently tolerate if transient update fails
      });

    const permissions = Array.isArray(user.role.permissionsJson)
      ? (user.role.permissionsJson as string[])
      : [];

    const payload: JwtUserPayload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      role: user.role.code,
      laboratoryId: user.laboratoryId,
      permissions,
    };

    const tokens = generateTokens(payload);

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        designation: user.designation,
        role: user.role.code,
        laboratoryId: user.laboratoryId,
        permissions,
      },
      tokens,
    };
  }

  /**
   * Refreshes an access token given a valid refresh token.
   */
  async refreshUserToken(refreshToken: string): Promise<TokenPair> {
    const decoded = verifyRefreshToken(refreshToken);
    if (decoded.tokenType !== "refresh") {
      throw new Error("Invalid refresh token type.");
    }

    const user = await this.db.user.findUnique({
      where: { id: decoded.sub },
      include: { role: true },
    });

    if (!user || !user.isActive) {
      throw new Error("User associated with token is inactive or not found.");
    }

    const permissions = Array.isArray(user.role.permissionsJson)
      ? (user.role.permissionsJson as string[])
      : [];

    const payload: JwtUserPayload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      role: user.role.code,
      laboratoryId: user.laboratoryId,
      permissions,
    };

    return generateTokens(payload);
  }
}

export const defaultAuthService = new AuthService();
