import { betterAuth } from "better-auth";
import { bearer, twoFactor } from "better-auth/plugins";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@repo/db";
import { ENV } from "../config/env.js";
import { sendVerificationEmail, sendResetPasswordEmail } from "../services/email.service.js";
import { hashPassword, verifyPassword } from "./passwords.js";

export const auth = betterAuth({
  plugins: [
    bearer(),
    twoFactor({
      issuer: "DealFlow 360",
    }),
  ],
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    password: {
      hash: hashPassword,
      verify: verifyPassword,
    },
    async sendResetPassword({ user, url, token }) {
      await sendResetPasswordEmail({
        email: user.email,
        name: user.name,
        url,
        token,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: false, // Allows account creation without hard-blocking, user verifies via profile button or email
    autoSignInAfterVerification: true,
    async sendVerificationEmail({ user, url, token }) {
      await sendVerificationEmail({
        email: user.email,
        name: user.name,
        url,
        token,
      });
    },
  },
  secret: ENV.BETTER_AUTH_SECRET,
  baseURL: ENV.BETTER_AUTH_URL,
  trustedOrigins: [
    ENV.WEB_ORIGIN,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://localhost:8081", // Expo dev server
  ],
});
