import dotenv from "dotenv";

dotenv.config();

export const ENV = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: parseInt(process.env.PORT ?? "4000", 10),
  HOST: process.env.HOST ?? "0.0.0.0",
  BETTER_AUTH_SECRET:
    process.env.BETTER_AUTH_SECRET ?? "super-secret-better-auth-token-key-must-be-long",
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? "http://localhost:4000",
  WEB_ORIGIN: process.env.WEB_ORIGIN ?? "http://localhost:3000",
  DATABASE_URL: process.env.DATABASE_URL ?? "",
  // SMTP / Gmail Configuration
  SMTP_HOST: process.env.SMTP_HOST ?? "smtp.gmail.com",
  SMTP_PORT: parseInt(process.env.SMTP_PORT ?? "465", 10),
  SMTP_SECURE: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : true,
  SMTP_USER: process.env.SMTP_USER || process.env.GMAIL_USER || "",
  SMTP_PASS: process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || "",
  SMTP_FROM:
    process.env.SMTP_FROM ||
    (process.env.SMTP_USER
      ? `Workspace Auth <${process.env.SMTP_USER}>`
      : "Workspace Auth <noreply@example.com>"),
  // Meta WhatsApp Business Cloud API Configuration
  WHATSAPP_API_TOKEN:
    process.env.WHATSAPP_API_TOKEN ||
    process.env.META_WHATSAPP_API_TOKEN ||
    process.env.WHATSAPP_ACCESS_TOKEN ||
    process.env.WHATSAPP_TOKEN ||
    process.env.META_ACCESS_TOKEN ||
    "",
  WHATSAPP_PHONE_NUMBER_ID:
    process.env.WHATSAPP_PHONE_NUMBER_ID ||
    process.env.WHATSAPP_PHONE_ID ||
    process.env.META_PHONE_NUMBER_ID ||
    "",
  WHATSAPP_BUSINESS_ACCOUNT_ID:
    process.env.WHATSAPP_BUSINESS_ACCOUNT_ID ||
    process.env.WHATSAPP_WABA_ID ||
    process.env.WHATSAPP_ACCOUNT_ID ||
    "",
  WHATSAPP_OTP_TEMPLATE_NAME:
    process.env.WHATSAPP_OTP_TEMPLATE_NAME ||
    process.env.WHATSAPP_TEMPLATE_NAME ||
    process.env.WHATSAPP_TEMPLATE ||
    "dealflow_auth_verification_template",
  WHATSAPP_API_VERSION: process.env.WHATSAPP_API_VERSION || "v21.0",
} as const;
