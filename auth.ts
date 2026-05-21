/**
 * Server-side Auth.js config with MongoDB adapter.
 * Only import this in Server Components and API routes — NEVER in middleware.
 */
import NextAuth from "next-auth";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "@/lib/mongodb";
import { authConfig } from "./auth.config";
import { autoPromoteAdmin } from "@/lib/admin-auth";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import { cookies } from "next/headers";

// Auto-promote ADMIN_EMAIL user on server start (no-ops if env var is unset)
let _adminPromoteRan = false;

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: MongoDBAdapter(clientPromise),
  session: { strategy: "jwt" },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production" ? "__Secure-authjs.session-token" : "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax", // 'strict' breaks OAuth redirects in modern browsers
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      // One-time admin auto-promotion on server start
      if (!_adminPromoteRan) {
        _adminPromoteRan = true;
        autoPromoteAdmin().catch(() => {}); // fire-and-forget
      }

      // On initial sign-in, attach the MongoDB user ID to the JWT
      if (user?.id) {
        token.userId = user.id;
        
        // Update last login timestamp in the database asynchronously
        dbConnect().then(() => {
          User.findByIdAndUpdate(user.id, { $set: { lastLoginAt: new Date() } }).catch(err => {
            console.warn("[auth] Failed to update lastLoginAt:", err);
          });
        }).catch(() => {});
      }

      // Always refresh role from DB so promotions take effect immediately
      if (token.userId) {
        try {
          await dbConnect();
          const dbUser = await User.findById(token.userId).select("role").lean();
          token.role = dbUser?.role || "user";
        } catch {
          if (!token.role) token.role = "user";
        }
      }

      return token;
    },
    async session({ session, token }) {
      // Expose userId and role in the client-side session
      if (token.userId && session.user) {
        session.user.id = token.userId as string;
        (session.user as unknown as Record<string, unknown>).role = token.role || "user";
      }

      // Session Impersonation Logic:
      // If the real authenticated user is an admin, check if an impersonation cookie is set.
      if (token.role === "admin") {
        try {
          const cookieStore = await cookies();
          const impersonateUserId = cookieStore.get("impersonate_user_id")?.value;

          if (impersonateUserId) {
            await dbConnect();
            const impersonatedUser = await User.findById(impersonateUserId).lean();
            if (impersonatedUser) {
              // Override active session details with the impersonated user's details
              session.user.id = impersonatedUser._id.toString();
              session.user.email = impersonatedUser.email;
              session.user.name = impersonatedUser.name || impersonatedUser.email.split("@")[0];
              (session.user as unknown as Record<string, unknown>).role = impersonatedUser.role || "user";
              
              // Inject impersonation metadata
              (session as any).isImpersonating = true;
              (session as any).impersonator = {
                id: token.userId,
                email: token.email,
                name: token.name || "Admin",
              };
            }
          }
        } catch (err) {
          console.warn("[auth] Impersonation lookup failed:", err);
        }
      }

      return session;
    },
  },
});
