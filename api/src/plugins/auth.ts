import type { FastifyPluginAsync } from "fastify";
import fastifyCookie from "@fastify/cookie";
import fastifyJwt from "@fastify/jwt";
import fastifyOauth2 from "@fastify/oauth2";
import { authenticator } from 'otplib';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

/**
 * Extract tenant subdomain from host header
 */
function extractTenantFromHost(host: string): string {
  // Remove port if present
  const hostWithoutPort = host.split(':')[0].toLowerCase();
  
  // Check for tenant subdomain pattern: {tenant}.api.localhost
  if (hostWithoutPort.endsWith('.api.localhost')) {
    const tenant = hostWithoutPort.replace('.api.localhost', '');
    // Validate tenant format (simple alphanumeric + hyphens)
    if (/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(tenant) && tenant.length <= 63) {
      return tenant;
    }
  }
  
  // Check for tenant subdomain pattern: {tenant}.app.localhost
  if (hostWithoutPort.endsWith('.app.localhost')) {
    const tenant = hostWithoutPort.replace('.app.localhost', '');
    // Validate tenant format (simple alphanumeric + hyphens)
    if (/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(tenant) && tenant.length <= 63) {
      return tenant;
    }
  }
  
  // Check for production pattern: {tenant}.api.tokenops.com
  if (hostWithoutPort.endsWith('.api.tokenops.com')) {
    const tenant = hostWithoutPort.replace('.api.tokenops.com', '');
    if (/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(tenant) && tenant.length <= 63) {
      return tenant;
    }
  }
  
  // Development fallback: plain localhost defaults to 'default' tenant
  if (hostWithoutPort === 'localhost' || hostWithoutPort === '127.0.0.1') {
    return 'default';
  }
  
  // Production fallback: if no subdomain pattern matches, default to 'default'
  return 'default';
}

/**
 * Get the callback URL based on the host
 */
function getTenantCallbackUrl(host: string): string {
  const tenant = extractTenantFromHost(host);
  
  // Build tenant-specific callback URL
  if (host.includes('.api.localhost')) {
    // Development: use tenant subdomain for callback
    return `http://${tenant}.api.localhost:4000/auth/google/callback`;
  } else if (host.includes('.api.tokenops.com')) {
    // Production: use tenant subdomain for callback
    return `https://${tenant}.api.tokenops.com/auth/google/callback`;
  } else {
    // Fallback: use default callback URL
    return 'http://localhost:4000/auth/google/callback';
  }
}

/**
 * Get the web URL based on the host
 */
function getTenantWebUrl(host: string): string {
  const tenant = extractTenantFromHost(host);
  
  // Build tenant-specific web URL
  if (host.includes('.api.localhost')) {
    // Development: use tenant subdomain for web
    return `http://${tenant}.app.localhost:3000`;
  } else if (host.includes('.api.tokenops.com')) {
    // Production: use tenant subdomain for web
    return `https://${tenant}.app.tokenops.com`;
  } else {
    // Fallback: use default web URL
    return process.env.UI_ORIGIN || 'http://localhost:3000';
  }
}

/**
 * Get the web URL based on tenant name
 */
function getTenantWebUrlFromTenant(tenant: string): string {
  // Build tenant-specific web URL
  if (tenant === 'default') {
    // Default tenant uses localhost in development
    return 'http://localhost:3000';
  } else {
    // Other tenants use subdomain in development
    return `http://${tenant}.app.localhost:3000`;
  }
}

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
      organizationId?: string;
    };
    // what req.user becomes after jwtVerify()
    user: {
      sub: string;
      email?: string;
      name?: string;
      picture?: string;
      role?: "admin" | "user";
      requires2FA?: boolean;
      organizationId?: string;
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
    !!process.env.GOOGLE_CLIENT_SECRET;

  if (GOOGLE_READY) {
    // Custom OAuth handler that's tenant-aware
    app.get("/auth/google", async (req, reply) => {
      const host = req.headers.host || '';
      const tenant = extractTenantFromHost(host);
      
      // Generate state parameter for CSRF protection + tenant info
      const state = crypto.randomBytes(32).toString('hex');
      const stateWithTenant = `${state}:${tenant}`;
      
      // Store state in session/cookie for validation
      reply.setCookie('oauth_state', stateWithTenant, {
        httpOnly: true,
        secure: false, // Set to true in production
        sameSite: 'lax',
        maxAge: 600000, // 10 minutes
        domain: 'localhost', // Make cookie available across all localhost subdomains
      });
      
      // Use single callback URL that Google accepts
      const callbackUrl = 'http://localhost:4000/auth/google/callback';
      
      // Construct Google OAuth URL
      const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      googleAuthUrl.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID!);
      googleAuthUrl.searchParams.set('redirect_uri', callbackUrl);
      googleAuthUrl.searchParams.set('response_type', 'code');
      googleAuthUrl.searchParams.set('scope', 'openid email profile');
      googleAuthUrl.searchParams.set('state', stateWithTenant);
      
      return reply.redirect(googleAuthUrl.toString());
    });

    // OAuth callback → issue our JWT in an HttpOnly cookie
    app.get("/auth/google/callback", async (req, reply) => {
      const { code, state } = req.query as { code?: string; state?: string };
      
      // Validate state parameter
      const storedState = req.cookies.oauth_state;
      if (!state || !storedState) {
        return reply.status(400).send({ error: 'Invalid state parameter' });
      }
      
      // Extract tenant from state parameter (decode URL encoding first)
      const decodedState = decodeURIComponent(state);
      const decodedStoredState = decodeURIComponent(storedState);
      
      if (decodedState !== decodedStoredState) {
        return reply.status(400).send({ error: 'Invalid state parameter' });
      }
      
      const [stateToken, tenant] = decodedState.split(':');
      if (!tenant) {
        return reply.status(400).send({ error: 'Invalid state format' });
      }
      
      // Clear the state cookie with proper domain
      reply.clearCookie('oauth_state', { 
        path: "/", 
        domain: "localhost",
        httpOnly: true,
        sameSite: "lax"
      });
      
      if (!code) {
        return reply.status(400).send({ error: 'Authorization code not provided' });
      }
      
      // Use single callback URL that Google accepts
      const callbackUrl = 'http://localhost:4000/auth/google/callback';
      
      try {
        // Exchange authorization code for access token
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            code,
            grant_type: 'authorization_code',
            redirect_uri: callbackUrl,
          }),
        });
        
        if (!tokenResponse.ok) {
          throw new Error('Failed to exchange authorization code');
        }
        
        const tokenData = await tokenResponse.json();
        const idToken = tokenData.id_token;
        
        if (!idToken) {
          throw new Error('No ID token received');
        }
        
        // Decode the ID token
        const payload = JSON.parse(Buffer.from(idToken.split(".")[1], "base64").toString("utf8"));
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
        // For new users, assign to the organization based on the tenant they're logging in from
        let targetOrg = await prisma.organization.findFirst({
          where: { subdomain: tenant }
        });
        
        if (!targetOrg) {
          // Fallback to default organization if tenant org doesn't exist
          targetOrg = await prisma.organization.findFirst({
            where: { name: 'Default Organization' }
          });
          
          if (!targetOrg) {
            targetOrg = await prisma.organization.create({
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
            organizationId: targetOrg.id
          }
        });
      }
      // Note: We don't validate existing users during login - that validation happens in /auth/me

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
            domain: "localhost", // Make temp auth cookie available across all localhost subdomains
          })
          .redirect((process.env.UI_ORIGIN || "http://localhost:3000") + "/login/2fa");
        return;
      }

      // No 2FA required, proceed with normal login
      // Get user's organization to include organizationId
      const userWithOrg = await prisma.user.findUnique({
        where: { sub },
        include: { organization: true }
      });
      
      const jwt = await reply.jwtSign({ 
        sub, 
        email, 
        name, 
        role,
        organizationId: userWithOrg?.organizationId
      }, { expiresIn: "12h" });
      reply
        .setCookie("auth", jwt, {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          path: "/",
          maxAge: 60 * 60 * 12,
          domain: "localhost", // Make JWT cookie available across all localhost subdomains
        })
        .redirect(getTenantWebUrlFromTenant(tenant) + "/app/dashboard");
      } catch (error) {
        console.error('OAuth callback error:', error);
        return reply.status(500).send({ error: 'Authentication failed' });
      }
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
      
      // Extract tenant from host for validation
      const host = req.headers.host || '';
      const tenant = extractTenantFromHost(host);
      
      // Fetch complete user data from database with organization
      const dbUser = await prisma.user.findUnique({
        where: { sub: jwtUser.sub },
        include: {
          organization: {
            select: {
              id: true,
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
        // Validate that user belongs to the correct organization
        if (dbUser.organization?.subdomain !== tenant) {
          // User doesn't belong to this organization - return 404
          return reply.code(404).send({ 
            error: 'Not Found',
            message: 'User not found in this organization'
          });
        }
        
        // Return database user data with organization
        return reply.send({ 
          user: {
            sub: dbUser.sub,
            email: dbUser.email,
            name: dbUser.name,
            role: dbUser.role,
            twoFactorEnabled: dbUser.twoFactorEnabled,
            organizationId: dbUser.organizationId,
            organization: dbUser.organization
          }
        });
      } else {
        // User not found in database - return 404
        return reply.code(404).send({ 
          error: 'Not Found',
          message: 'User not found'
        });
      }
    } catch (error) {
      // Log the error for debugging
      console.error('Error in /auth/me:', error);
      
      // If it's a JWT verification error, return 401
      
      if (error instanceof Error && (
        error.message.includes('jwt') || 
        error.message.includes('token') || 
        error.message.includes('Unauthorized') ||
        error.message.includes('No authorization') ||
        error.message.includes('Missing authorization') ||
        error.message.includes('No token') ||
        error.message.includes('Invalid token') ||
        error.message.includes('authorization') ||
        error.message.includes('Authorization') ||
        error.name === 'UnauthorizedError' ||
        error.name === 'JsonWebTokenError' ||
        error.name === 'TokenExpiredError' ||
        error.name === 'NotBeforeError'
      )) {
        return reply.code(401).send({ 
          error: 'Unauthorized',
          message: 'Invalid or expired token'
        });
      }
      
      // For other errors, return 500 but log the details
      console.error('Unexpected error in /auth/me:', error);
      return reply.code(500).send({ 
        error: 'Internal Server Error',
        message: 'Failed to fetch user information'
      });
    }
  });

  app.post("/auth/logout", async (_req, reply) => {
    // Clear cookies with the same settings they were set with
    reply
      .clearCookie("auth", { 
        path: "/", 
        domain: "localhost",
        httpOnly: true,
        sameSite: "lax"
      })
      .clearCookie("temp_auth", { 
        path: "/", 
        domain: "localhost",
        httpOnly: true,
        sameSite: "lax"
      })
      .send({ ok: true });
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
      // Get user's organization to include organizationId
      const userWithOrg = await prisma.user.findUnique({
        where: { sub: decoded.sub },
        include: { organization: true }
      });
      
      const jwt = await reply.jwtSign({ 
        sub: decoded.sub, 
        email: decoded.email, 
        name: decoded.name, 
        role: decoded.role,
        organizationId: userWithOrg?.organizationId
      }, { expiresIn: "12h" });

      reply
        .clearCookie("temp_auth", { 
          path: "/", 
          domain: "localhost",
          httpOnly: true,
          sameSite: "lax"
        })
        .setCookie("auth", jwt, {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          path: "/",
          maxAge: 60 * 60 * 12,
          domain: "localhost", // Make JWT cookie available across all localhost subdomains
        })
        .send({ success: true, redirect: "/app/dashboard" });
    } catch (error) {
      return reply.code(401).send({ error: "unauthorized" });
    }
  });
};

export default authPlugin;
