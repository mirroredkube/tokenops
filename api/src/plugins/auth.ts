import type { FastifyPluginAsync } from "fastify";
import fastifyCookie from "@fastify/cookie";
import fastifyJwt from "@fastify/jwt";
import fastifyOauth2 from "@fastify/oauth2";
import { authenticator } from 'otplib';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ✅ Correct type augmentation: tell @fastify/jwt what our payload/user look like
declare module "@fastify/jwt" {
  interface FastifyJWT {
    // what we sign into the token
    payload: {
      sub: string;
      email?: string;
      name?: string;
      picture?: string;
      role?: "admin" | "user";
      requires2FA?: boolean;
      tenant_id?: string;
    };
    // what req.user becomes after jwtVerify()
    user: {
      sub: string;
      email?: string;
      name?: string;
      picture?: string;
      role?: "admin" | "user";
      requires2FA?: boolean;
      tenant_id?: string;
    };
  }
}

// Optionally add a helper typed method on FastifyInstance
declare module "fastify" {
  interface FastifyInstance {
    verifyAuthOrApiKey: (req: any, reply: any) => Promise<void>;
  }
}

const AUTH_MODE = (process.env.AUTH_MODE ?? "off").toLowerCase(); 
// "off" = no auth; "key" = API key only; "full" = API key OR JWT

const authPlugin: FastifyPluginAsync = async (app) => {
  // cookies + JWT for UI sessions
  await app.register(fastifyCookie);
  await app.register(fastifyJwt, {
    secret: process.env.AUTH_JWT_SECRET || "dev-only-secret",
    cookie: { cookieName: "auth", signed: false },
  });

  // Google OAuth (optional; enabled if envs are present)
  const GOOGLE_READY =
    !!process.env.GOOGLE_CLIENT_ID &&
    !!process.env.GOOGLE_CLIENT_SECRET &&
    !!process.env.GOOGLE_CALLBACK_URL;

  if (GOOGLE_READY) {
    await app.register(fastifyOauth2, {
      name: "googleOAuth2",
      scope: ["openid", "email", "profile"],
      credentials: {
        client: {
          id: process.env.GOOGLE_CLIENT_ID!,
          secret: process.env.GOOGLE_CLIENT_SECRET!,
        },
        auth: fastifyOauth2.GOOGLE_CONFIGURATION,
      },
      startRedirectPath: "/auth/google",
      callbackUri: process.env.GOOGLE_CALLBACK_URL!,
    });

    // OAuth callback → issue our JWT in an HttpOnly cookie
    app.get("/auth/google/callback", async (req, reply) => {
      const token = await (app as any).googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(req);
      const idToken = token?.token?.id_token as string | undefined;
      const payload =
        idToken ? JSON.parse(Buffer.from(idToken.split(".")[1], "base64").toString("utf8")) : {};
      const email = payload.email as string | undefined;
      const name = payload.name as string | undefined;
      const sub = (payload.sub as string | undefined) || "unknown";

      const admins = (process.env.ADMIN_EMAILS || "")
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      const role: "admin" | "user" = email && admins.includes(email.toLowerCase()) ? "admin" : "user";

      // Find or create user in database
      let dbUser = await prisma.user.findUnique({
        where: { sub }
      });

      if (!dbUser) {
        // Get or create default organization
        let defaultOrg = await prisma.organization.findFirst({
          where: { name: 'Default Organization' }
        });
        
        if (!defaultOrg) {
          defaultOrg = await prisma.organization.create({
            data: {
              name: 'Default Organization',
              legalName: 'Default Organization',
              country: 'US',
              jurisdiction: 'US',
              status: 'ACTIVE',
              subdomain: 'default'
            }
          });
        }
        
        // Convert role to new enum format
        const newRole = role === 'admin' ? 'ADMIN' : 'VIEWER';
        
        // Create new user
        dbUser = await prisma.user.create({
          data: {
            email: email || '',
            name: name || '',
            sub,
            role: newRole,
            organizationId: defaultOrg.id
          }
        });
      }

      if (dbUser?.twoFactorEnabled) {
        // Store temporary session for 2FA verification
        const tempJwt = await reply.jwtSign({ 
          sub, 
          email, 
          name, 
          role, 
          requires2FA: true 
        }, { expiresIn: "5m" });
        
        reply
          .setCookie("temp_auth", tempJwt, {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: 60 * 5, // 5 minutes
          })
          .redirect((process.env.UI_ORIGIN || "http://localhost:3000") + "/login/2fa");
        return;
      }

      // No 2FA required, proceed with normal login
      // Get user's organization to include tenant_id
      const userWithOrg = await prisma.user.findUnique({
        where: { sub },
        include: { organization: true }
      });
      
      const jwt = await reply.jwtSign({ 
        sub, 
        email, 
        name, 
        role,
        tenant_id: userWithOrg?.organization?.tenantId
      }, { expiresIn: "12h" });
      reply
        .setCookie("auth", jwt, {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          path: "/",
          maxAge: 60 * 60 * 12,
        })
        .redirect((process.env.UI_ORIGIN || "http://localhost:3000") + "/app/dashboard");
    });
  } else {
    app.log.warn("Google OAuth not configured; set GOOGLE_* envs to enable /auth/google");
  }

  // Unified guard: API key OR JWT (cookie or Authorization header)
  app.decorate("verifyAuthOrApiKey", async (req, reply) => {
    if (AUTH_MODE === "off") return; // ← no-op in tests/dev
  
    const expected = process.env.REGISTRY_API_KEY;
    const got =
      (req.headers["x-api-key"] as string | undefined) ||
      (req.headers["X-API-Key"] as unknown as string | undefined);
  
    if (AUTH_MODE !== "jwt" && expected && got === expected) {
      (req as any).user = { sub: "api-key", role: "admin" };
      return;
    }
  
    try {
      await req.jwtVerify(); // requires valid JWT when AUTH_MODE is "full" or "jwt"
    } catch {
      return reply.code(401).send({ error: "unauthorized" });
    }
  });

  // Session helpers
  app.get("/auth/me", async (req, reply) => {
    try {
      await req.jwtVerify();
      const jwtUser = req.user as any;
      
      // Fetch complete user data from database with organization
      const dbUser = await prisma.user.findUnique({
        where: { sub: jwtUser.sub },
        include: {
          organization: {
            select: {
              id: true,
              tenantId: true,
              subdomain: true,
              name: true,
              legalName: true,
              country: true,
              jurisdiction: true
            }
          }
        }
      });
      
      if (dbUser) {
        // Return database user data with organization
        return reply.send({ 
          user: {
            sub: dbUser.sub,
            email: dbUser.email,
            name: dbUser.name,
            role: dbUser.role,
            twoFactorEnabled: dbUser.twoFactorEnabled,
            organizationId: dbUser.organizationId,
            organization: dbUser.organization,
            tenant_id: dbUser.organization?.tenantId,
            tenant_subdomain: dbUser.organization?.subdomain
          }
        });
      } else {
        // Fallback to JWT data if user not in database
        return reply.send({ user: jwtUser });
      }
    } catch {
      return reply.code(200).send({ user: null });
    }
  });

  app.post("/auth/logout", async (_req, reply) => {
    reply.clearCookie("auth", { path: "/" }).send({ ok: true });
  });

  // Test user settings endpoint in auth plugin
  app.get("/auth/me/settings", async (req, reply) => {
    try {
      await req.jwtVerify();
      const jwtUser = req.user as any;
      
      const dbUser = await prisma.user.findUnique({
        where: { sub: jwtUser.sub },
        include: {
          settings: true
        }
      });
      
      if (!dbUser) {
        return reply.code(404).send({ error: "User not found" });
      }
      
      // Return default settings if none exist
      const settings = dbUser.settings || {
        timezone: "UTC",
        language: "en",
        theme: "light",
        notifications: {},
        preferences: {}
      };
      
      return reply.send({ settings });
    } catch (error) {
      console.log('JWT verification failed in /auth/me/settings:', error);
      return reply.code(200).send({ settings: null });
    }
  });

  // Update user settings endpoint in auth plugin
  app.patch("/auth/me/settings", async (req, reply) => {
    try {
      await req.jwtVerify();
      const jwtUser = req.user as any;
      const { timezone, language, theme, notifications, preferences } = req.body as {
        timezone?: string
        language?: string
        theme?: string
        notifications?: any
        preferences?: any
      };
      
      const dbUser = await prisma.user.findUnique({
        where: { sub: jwtUser.sub }
      });
      
      if (!dbUser) {
        return reply.code(404).send({ error: "User not found" });
      }
      
      // Upsert settings (create if doesn't exist, update if it does)
      const settings = await prisma.userSettings.upsert({
        where: { userId: dbUser.id },
        update: {
          ...(timezone && { timezone }),
          ...(language && { language }),
          ...(theme && { theme }),
          ...(notifications && { notifications }),
          ...(preferences && { preferences }),
          updatedAt: new Date()
        },
        create: {
          userId: dbUser.id,
          timezone: timezone || "UTC",
          language: language || "en",
          theme: theme || "light",
          notifications: notifications || {},
          preferences: preferences || {}
        }
      });
      
      return reply.send({ settings });
    } catch (error) {
      console.log('JWT verification failed in PATCH /auth/me/settings:', error);
      return reply.code(200).send({ settings: null });
    }
  });

  // 2FA endpoints
  app.post("/auth/2fa/setup", async (req, reply) => {
    try {
      await req.jwtVerify();
      const user = req.user as any;
      
      app.log.info(`2FA setup request for user: ${user.email} (${user.sub})`);
      
      // Find or create user in database
      let dbUser = await prisma.user.findUnique({
        where: { sub: user.sub }
      });
      
      if (!dbUser) {
        // Get or create default organization
        let defaultOrg = await prisma.organization.findFirst({
          where: { name: 'Default Organization' }
        });
        
        if (!defaultOrg) {
          defaultOrg = await prisma.organization.create({
            data: {
              name: 'Default Organization',
              legalName: 'Default Organization',
              country: 'US',
              jurisdiction: 'US',
              status: 'ACTIVE',
              subdomain: 'default'
            }
          });
        }
        
        // Convert role to new enum format
        const newRole = user.role === 'admin' ? 'ADMIN' : 'VIEWER';
        
        dbUser = await prisma.user.create({
          data: {
            email: user.email,
            name: user.name,
            sub: user.sub,
            role: newRole,
            organizationId: defaultOrg.id
          }
        });
      }
      
      // Generate a new secret
      const secret = authenticator.generateSecret();
      
      // Create QR code URL
      const otpauth = authenticator.keyuri(user.email, 'Regula', secret);
      
      // Store the secret temporarily (in production, you'd encrypt this)
      // For now, we'll return it to the client to store temporarily
      
      return reply.send({
        secret,
        otpauth,
        qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauth)}`
      });
    } catch (error) {
      return reply.code(401).send({ error: "unauthorized" });
    }
  });

  app.post("/auth/2fa/verify", async (req, reply) => {
    try {
      await req.jwtVerify();
      const user = req.user as any;
      const { secret, token } = req.body as { secret: string; token: string };
      
      if (!secret || !token) {
        return reply.code(400).send({ error: "Missing secret or token" });
      }
      
      // Verify the token
      const isValid = authenticator.verify({ token, secret });
      
      if (!isValid) {
        return reply.code(400).send({ error: "Invalid verification code" });
      }
      
      // Find user in database
      const dbUser = await prisma.user.findUnique({
        where: { sub: user.sub }
      });
      
      if (!dbUser) {
        return reply.code(404).send({ error: "User not found" });
      }
      
      // Store the secret and enable 2FA
      await prisma.user.update({
        where: { id: dbUser.id },
        data: {
          twoFactorSecret: secret, // In production, encrypt this
          twoFactorEnabled: true
        }
      });
      
      return reply.send({ 
        success: true, 
        message: "Two-factor authentication enabled successfully" 
      });
    } catch (error) {
      return reply.code(401).send({ error: "unauthorized" });
    }
  });

  app.post("/auth/2fa/disable", async (req, reply) => {
    try {
      await req.jwtVerify();
      const user = req.user as any;
      const { token } = req.body as { token: string };
      
      if (!token) {
        return reply.code(400).send({ error: "Missing verification token" });
      }
      
      // Find user in database
      const dbUser = await prisma.user.findUnique({
        where: { sub: user.sub }
      });
      
      if (!dbUser || !dbUser.twoFactorEnabled) {
        return reply.code(400).send({ error: "2FA is not enabled for this user" });
      }
      
      // Verify the token against stored secret
      const isValid = authenticator.verify({ token, secret: dbUser.twoFactorSecret! });
      
      if (!isValid) {
        return reply.code(400).send({ error: "Invalid verification code" });
      }
      
      // Disable 2FA
      await prisma.user.update({
        where: { id: dbUser.id },
        data: {
          twoFactorSecret: null,
          twoFactorEnabled: false
        }
      });
      
      return reply.send({ 
        success: true, 
        message: "Two-factor authentication disabled successfully" 
      });
    } catch (error) {
      return reply.code(401).send({ error: "unauthorized" });
    }
  });

  app.get("/auth/2fa/status", async (req, reply) => {
    try {
      await req.jwtVerify();
      const user = req.user as any;
      
      // Find user in database
      const dbUser = await prisma.user.findUnique({
        where: { sub: user.sub }
      });
      
      if (!dbUser) {
        return reply.send({ 
          enabled: false,
          message: "2FA status retrieved successfully" 
        });
      }
      
      return reply.send({ 
        enabled: dbUser.twoFactorEnabled,
        message: "2FA status retrieved successfully" 
      });
    } catch (error) {
      return reply.code(401).send({ error: "unauthorized" });
    }
  });

  // 2FA verification during login
  app.post("/auth/2fa/verify-login", async (req, reply) => {
    try {
      // Verify temporary JWT from 2FA flow
      const tempJwt = req.cookies.temp_auth;
      app.log.info(`2FA verification attempt, temp_auth cookie: ${tempJwt ? 'present' : 'missing'}`);
      
      if (!tempJwt) {
        return reply.code(401).send({ error: "No temporary session found" });
      }

      const decoded = app.jwt.decode(tempJwt) as any;
      app.log.info(`Decoded temp JWT - sub: ${decoded?.sub}, requires2FA: ${decoded?.requires2FA}`);
      
      if (!decoded || !decoded.requires2FA) {
        return reply.code(401).send({ error: "Invalid temporary session" });
      }

      const { token } = req.body as { token: string };
      if (!token) {
        return reply.code(400).send({ error: "Missing verification code" });
      }

      // Find user and verify 2FA
      const dbUser = await prisma.user.findUnique({
        where: { sub: decoded.sub }
      });

      if (!dbUser?.twoFactorEnabled || !dbUser.twoFactorSecret) {
        return reply.code(400).send({ error: "2FA not enabled for this user" });
      }

      const isValid = authenticator.verify({ token, secret: dbUser.twoFactorSecret });
      if (!isValid) {
        return reply.code(400).send({ error: "Invalid verification code" });
      }

      // Issue final JWT and clear temp cookie
      // Get user's organization to include tenant_id
      const userWithOrg = await prisma.user.findUnique({
        where: { sub: decoded.sub },
        include: { organization: true }
      });
      
      const jwt = await reply.jwtSign({ 
        sub: decoded.sub, 
        email: decoded.email, 
        name: decoded.name, 
        role: decoded.role,
        tenant_id: userWithOrg?.organization?.tenantId
      }, { expiresIn: "12h" });

      reply
        .clearCookie("temp_auth", { path: "/" })
        .setCookie("auth", jwt, {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          path: "/",
          maxAge: 60 * 60 * 12,
        })
        .send({ success: true, redirect: "/app/dashboard" });
    } catch (error) {
      return reply.code(401).send({ error: "unauthorized" });
    }
  });
};

export default authPlugin;
