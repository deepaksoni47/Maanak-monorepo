import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { AuthService, defaultAuthService } from "./service.js";
import { requireAuth } from "./middleware.js";

const LoginBodySchema = z
  .object({
    email: z.string().email().optional(),
    username: z.string().min(1).optional(),
    identifier: z.string().min(1).optional(),
    password: z.string().min(1, "Password is required"),
  })
  .refine((data) => data.email || data.username || data.identifier, {
    message: "Either email, username, or identifier must be provided",
  });

const RefreshBodySchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

const RegisterBodySchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Valid official email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["INSPECTOR", "REVIEWER", "DIRECTOR", "ADMIN"]).optional(),
  designation: z.string().optional(),
  facility: z.string().optional(),
});

/**
 * Creates the Authentication REST router.
 */
export function createAuthRouter(
  authService: AuthService = defaultAuthService,
): Router {
  const router = Router();

  /**
   * POST /api/v1/auth/register
   * Registers a new Legal Metrology officer account and returns tokens.
   */
  router.post(
    "/register",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const validated = RegisterBodySchema.parse(req.body);
        const result = await authService.registerUser(validated);
        return res.status(201).json({
          success: true,
          user: result.user,
          tokens: result.tokens,
        });
      } catch (err: any) {
        if (err instanceof z.ZodError) {
          return next(err);
        }
        return next(err);
      }
    },
  );

  /**
   * POST /api/v1/auth/login
   * Authenticates user using Argon2id and returns access & refresh tokens.
   */
  router.post(
    "/login",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const validated = LoginBodySchema.parse(req.body);
        const result = await authService.authenticateUser(validated);
        return res.status(200).json({
          success: true,
          user: result.user,
          tokens: result.tokens,
        });
      } catch (err: any) {
        if (err instanceof z.ZodError) {
          return next(err);
        }
        if (
          err?.message?.includes("Invalid credentials") ||
          err?.message?.includes("inactive")
        ) {
          return res.status(401).json({
            error: "Invalid credentials or account inactive.",
            code: "INVALID_CREDENTIALS",
            path: req.originalUrl,
            requestId: req.headers["x-request-id"],
          });
        }
        return next(err);
      }
    },
  );

  /**
   * POST /api/v1/auth/refresh
   * Exchanges a valid refresh token for a fresh token pair.
   */
  router.post(
    "/refresh",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const validated = RefreshBodySchema.parse(req.body);
        const tokens = await authService.refreshUserToken(
          validated.refreshToken,
        );
        return res.status(200).json({
          success: true,
          tokens,
        });
      } catch (err: any) {
        if (err instanceof z.ZodError) {
          return next(err);
        }
        return res.status(401).json({
          error: "Invalid or expired refresh token.",
          code: "INVALID_REFRESH_TOKEN",
          path: req.originalUrl,
          requestId: req.headers["x-request-id"],
        });
      }
    },
  );

  /**
   * GET /api/v1/auth/me
   * Returns current authenticated user profile from JWT token.
   */
  router.get("/me", requireAuth, (req: Request, res: Response) => {
    return res.status(200).json({
      success: true,
      user: req.user,
    });
  });

  return router;
}

export const authRouter = createAuthRouter();
