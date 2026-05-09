/**
 * Edge-compatible Auth.js config.
 * This file is imported by middleware.ts (Edge Runtime) —
 * it must NOT import any Node.js-only modules (MongoDB, Mongoose, etc).
 */
import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

export const authConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isProtected =
        nextUrl.pathname.startsWith("/dashboard") ||
        nextUrl.pathname.startsWith("/admin") ||
        (nextUrl.pathname.startsWith("/api/") &&
          !nextUrl.pathname.startsWith("/api/auth") &&
          !nextUrl.pathname.startsWith("/api/inngest"));

      if (isProtected && !isLoggedIn) {
        return false; // Redirect to login
      }

      // If logged in and visiting login page, redirect to dashboard
      if (isLoggedIn && nextUrl.pathname === "/login") {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }

      return true;
    },
  },
} satisfies NextAuthConfig;
