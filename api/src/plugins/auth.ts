import type { FastifyPluginAsync } from "fastify";
import fastifyCookie from "@fastify/cookie";
import fastifyJwt from "@fastify/jwt";
import fastifyOauth2 from "@fastify/oauth2";

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
    };
    // what req.user becomes after jwtVerify()
    user: {
      sub: string;
      email?: string;
      name?: string;
      picture?: string;
      role?: "admin" | "user";
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

      const jwt = await reply.jwtSign({ sub, email, name, role }, { expiresIn: "12h" });
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
      return reply.send({ user: req.user });
    } catch {
      return reply.code(200).send({ user: null });
    }
  });

  app.post("/auth/logout", async (_req, reply) => {
    reply.clearCookie("auth", { path: "/" }).send({ ok: true });
  });
};

export default authPlugin;
