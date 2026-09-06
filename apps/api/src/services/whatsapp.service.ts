import crypto from "crypto";
import { prisma } from "@repo/db";
import { ENV } from "../config/env.js";
import { AppError } from "../middleware/error.js";

/**
 * Normalizes phone numbers to standard international E.164 without special characters
 * e.g. "+1 (555) 019-2834" -> "15550192834" or "+91 98765-43210" -> "919876543210"
 */
export function normalizePhoneNumber(rawPhone: string): string {
  const cleaned = rawPhone.replace(/[^0-9]/g, "");
  return cleaned;
}

/**
 * Masks a phone number for secure UI display
 * e.g. "+15550192834" -> "+1 (•••) •••-2834" or "+919876543210" -> "+91 ••••• ••210"
 */
export function maskPhoneNumber(phone: string): string {
  if (!phone) return "";
  const cleaned = phone.replace(/[^0-9]/g, "");
  if (cleaned.length < 4) return "••••";
  const last4 = cleaned.slice(-4);
  const prefix = cleaned.length > 10 ? `+${cleaned.slice(0, cleaned.length - 10)} ` : "";
  return `${prefix}••••• ••${last4}`;
}

/**
 * Hash an OTP code with the application secret for secure DB storage
 */
function hashOtp(otp: string): string {
  return crypto
    .createHash("sha256")
    .update(`${otp}:${ENV.BETTER_AUTH_SECRET}`)
    .digest("hex");
}

/**
 * Sends a WhatsApp OTP Message using Meta WhatsApp Business Cloud API
 */
export async function sendWhatsAppOtpMessage({
  phoneNumber,
  otp,
  templateName = ENV.WHATSAPP_OTP_TEMPLATE_NAME,
}: {
  phoneNumber: string;
  otp: string;
  templateName?: string;
}): Promise<{ success: boolean; messageId?: string; simulated?: boolean; error?: string }> {
  const normalizedTo = normalizePhoneNumber(phoneNumber);

  // If Meta WhatsApp API credentials are not yet configured in .env, log in simulated dev mode
  if (!ENV.WHATSAPP_API_TOKEN || !ENV.WHATSAPP_PHONE_NUMBER_ID) {
    console.log("\n╔══════════════════════════════════════════════════════════════╗");
    console.log("║         💬 [WHATSAPP 2FA OTP DISPATCH - DEV SIMULATION]      ║");
    console.log("╠══════════════════════════════════════════════════════════════╣");
    console.log(`║ 📱 Recipient Phone : +${normalizedTo.padEnd(38)} ║`);
    console.log(`║ 🔑 6-Digit OTP Code : \x1b[1m\x1b[32m${otp}\x1b[0m (Valid for 5 mins)${" ".repeat(Math.max(0, 19 - otp.length))} ║`);
    console.log(`║ 📝 Meta Template   : ${templateName.padEnd(38)} ║`);
    console.log("╠══════════════════════════════════════════════════════════════╣");
    console.log("║ 💡 Live WhatsApp API credentials not configured in .env.    ║");
    console.log("║    Set WHATSAPP_API_TOKEN and WHATSAPP_PHONE_NUMBER_ID.      ║");
    console.log("╚══════════════════════════════════════════════════════════════╝\n");
    return { success: true, simulated: true };
  }

  const endpoint = `https://graph.facebook.com/${ENV.WHATSAPP_API_VERSION}/${ENV.WHATSAPP_PHONE_NUMBER_ID}/messages`;

  // Builds payload variations for Meta WhatsApp Cloud API template message
  const buildPayload = (mode: "copy_code" | "url" | "body_only", lang: string = "en") => {
    const components: any[] = [
      {
        type: "body",
        parameters: [
          {
            type: "text",
            text: otp,
          },
        ],
      },
    ];

    if (mode === "copy_code") {
      components.push({
        type: "button",
        sub_type: "copy_code",
        index: "0",
        parameters: [
          {
            type: "coupon_code",
            coupon_code: otp,
          },
        ],
      });
    } else if (mode === "url") {
      components.push({
        type: "button",
        sub_type: "url",
        index: "0",
        parameters: [
          {
            type: "text",
            text: otp,
          },
        ],
      });
    }

    return {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: normalizedTo,
      type: "template",
      template: {
        name: templateName,
        language: {
          code: lang,
        },
        components,
      },
    };
  };

  try {
    // Attempt 1: copy_code parameter with 'en'
    let response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ENV.WHATSAPP_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildPayload("copy_code", "en")),
    });

    let data = (await response.json().catch(() => ({}))) as any;

    // Attempt 2: If language code 'en' failed, try 'en_US'
    if (!response.ok && (data?.error?.error_user_title?.includes("language") || data?.error?.message?.includes("language") || data?.error?.error_data?.details?.includes("language"))) {
      response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ENV.WHATSAPP_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildPayload("copy_code", "en_US")),
      });
      data = (await response.json().catch(() => ({}))) as any;
    }

    // Attempt 3: url parameter fallback
    if (!response.ok && data?.error?.error_data?.details?.includes("button")) {
      response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ENV.WHATSAPP_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildPayload("url", "en")),
      });
      data = (await response.json().catch(() => ({}))) as any;
    }

    // Attempt 4: body-only fallback
    if (!response.ok && (data?.error?.error_data?.details?.includes("button") || data?.error?.code === 100)) {
      response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ENV.WHATSAPP_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildPayload("body_only", "en")),
      });
      data = (await response.json().catch(() => ({}))) as any;
    }

    if (!response.ok) {
      const errorMsg = data?.error?.message || "Unknown Meta WhatsApp API error";
      const errorCode = data?.error?.code;
      const errorSubcode = data?.error?.error_subcode;
      const errorDetails = data?.error?.error_data?.details;

      console.log("\n╔══════════════════════════════════════════════════════════════╗");
      console.log("║         ⚠️  [WHATSAPP 2FA OTP DISPATCH - META API ERROR]      ║");
      console.log("╠══════════════════════════════════════════════════════════════╣");
      console.log(`║ 📱 Recipient Phone : +${normalizedTo.padEnd(38)} ║`);
      console.log(`║ 🔑 6-Digit OTP Code : \x1b[1m\x1b[33m${otp}\x1b[0m (Use this in UI to proceed)${" ".repeat(Math.max(0, 11 - otp.length))} ║`);
      console.log(`║ ⏱️  Validity        : 5 Minutes (Stored in DB)               ║`);
      console.log("╠══════════════════════════════════════════════════════════════╣");
      console.log(`║ ❌ Meta Error Code : ${String(errorCode ?? "N/A").padEnd(38)} ║`);
      if (errorSubcode) console.log(`║ ❌ Error Subcode   : ${String(errorSubcode).padEnd(38)} ║`);
      console.log(`║ ❌ Message         : ${(errorMsg.slice(0, 38)).padEnd(38)} ║`);
      if (errorDetails) console.log(`║ 🔍 Details         : ${(errorDetails.slice(0, 38)).padEnd(38)} ║`);
      console.log("╠══════════════════════════════════════════════════════════════╣");
      if (errorCode === 131030) {
        console.log("║ 💡 DIAGNOSIS: Recipient phone number is NOT registered in   ║");
        console.log("║    your Meta Developer App's 'To' Test Recipients List!      ║");
        console.log("║    Go to Meta Developer Dashboard > WhatsApp > API Setup,    ║");
        console.log("║    and add your phone number under 'To' field.               ║");
      } else if (errorCode === 190) {
        console.log("║ 💡 DIAGNOSIS: WHATSAPP_API_TOKEN expired or invalid!        ║");
        console.log("║    Generate a new System User Token in Meta Business Manager ║");
      } else if (errorCode === 132000 || errorCode === 132001) {
        console.log("║ 💡 DIAGNOSIS: Template name or language mismatch!           ║");
        console.log(`║    Expected '${templateName}' with approved status.            ║`);
      }
      console.log("╚══════════════════════════════════════════════════════════════╝\n");

      return {
        success: true,
        simulated: true,
        error: errorMsg,
      };
    }

    const messageId = data?.messages?.[0]?.id;

    console.log("\n╔══════════════════════════════════════════════════════════════╗");
    console.log("║         ✅ [WHATSAPP 2FA OTP DISPATCHED VIA META CLOUD]     ║");
    console.log("╠══════════════════════════════════════════════════════════════╣");
    console.log(`║ 📱 Recipient Phone : +${normalizedTo.padEnd(38)} ║`);
    console.log(`║ 🔑 6-Digit OTP Code : \x1b[1m\x1b[32m${otp}\x1b[0m (Valid for 5 mins)${" ".repeat(Math.max(0, 19 - otp.length))} ║`);
    console.log(`║ 🆔 Meta Message ID : ${(messageId || "N/A").padEnd(38)} ║`);
    console.log(`║ 📝 Meta Template   : ${templateName.padEnd(38)} ║`);
    console.log("╚══════════════════════════════════════════════════════════════╝\n");

    return {
      success: true,
      messageId,
    };
  } catch (error: any) {
    console.error("Failed to connect to Meta WhatsApp Cloud API:", error?.message || error);
    console.log("\n╔══════════════════════════════════════════════════════════════╗");
    console.log("║         💬 [WHATSAPP 2FA OTP BACKUP CONSOLE LOG]            ║");
    console.log("╠══════════════════════════════════════════════════════════════╣");
    console.log(`║ 📱 Recipient Phone : +${normalizedTo.padEnd(38)} ║`);
    console.log(`║ 🔑 6-Digit OTP Code : \x1b[1m\x1b[32m${otp}\x1b[0m (Valid for 5 mins)${" ".repeat(Math.max(0, 19 - otp.length))} ║`);
    console.log("╚══════════════════════════════════════════════════════════════╝\n");
    return { success: true, simulated: true };
  }
}

/**
 * Generates a crypto-secure 6-digit OTP, saves in database with expiration, and sends to WhatsApp
 */
export async function generateAndSendWhatsAppOtp({
  userId,
  phoneNumber,
  purpose = "LOGIN_2FA",
}: {
  userId: string;
  phoneNumber: string;
  purpose?: "LOGIN_2FA" | "VERIFY_PHONE";
}): Promise<{ expiresAt: Date; maskedPhone: string; simulated?: boolean }> {
  const normalizedTo = normalizePhoneNumber(phoneNumber);
  if (!normalizedTo || normalizedTo.length < 8) {
    throw new AppError(400, "INVALID_PHONE", "Please provide a valid international phone number.");
  }

  // Rate-limiting check: ensure at least 30 seconds between OTP dispatches
  const recentOtp = await prisma.whatsAppOtp.findFirst({
    where: {
      userId,
      purpose,
      createdAt: {
        gte: new Date(Date.now() - 30 * 1000),
      },
    },
  });

  if (recentOtp) {
    throw new AppError(
      429,
      "RATE_LIMITED",
      "Please wait 30 seconds before requesting another WhatsApp OTP code."
    );
  }

  // Invalidate any previous unexpired OTPs for this user & purpose
  await prisma.whatsAppOtp.deleteMany({
    where: {
      userId,
      purpose,
    },
  });

  // Generate cryptographically secure 6-digit OTP
  const otpCode = crypto.randomInt(100000, 1000000).toString();
  const otpHash = hashOtp(otpCode);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes TTL

  await prisma.whatsAppOtp.create({
    data: {
      userId,
      phoneNumber: normalizedTo,
      otpHash,
      purpose,
      expiresAt,
    },
  });

  const sendResult = await sendWhatsAppOtpMessage({
    phoneNumber: normalizedTo,
    otp: otpCode,
  });

  return {
    expiresAt,
    maskedPhone: maskPhoneNumber(normalizedTo),
    simulated: sendResult.simulated,
  };
}

/**
 * Validates the user-submitted WhatsApp OTP
 */
export async function verifyWhatsAppOtp({
  userId,
  otp,
  purpose = "LOGIN_2FA",
}: {
  userId: string;
  otp: string;
  purpose?: "LOGIN_2FA" | "VERIFY_PHONE";
}): Promise<{ valid: boolean; phoneNumber?: string }> {
  const cleanOtp = otp.trim().replace(/[^0-9]/g, "");
  if (cleanOtp.length !== 6) {
    return { valid: false };
  }

  const record = await prisma.whatsAppOtp.findFirst({
    where: {
      userId,
      purpose,
      expiresAt: {
        gt: new Date(),
      },
    },
  });

  if (!record) {
    return { valid: false };
  }

  // Protect against brute force: max 5 attempts per OTP
  if (record.attempts >= 5) {
    await prisma.whatsAppOtp.delete({ where: { id: record.id } });
    throw new AppError(
      400,
      "OTP_EXPIRED",
      "Too many incorrect attempts. This OTP has been invalidated. Please request a new code."
    );
  }

  const candidateHash = hashOtp(cleanOtp);
  if (candidateHash !== record.otpHash) {
    await prisma.whatsAppOtp.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    return { valid: false };
  }

  // OTP is valid! Delete record immediately to prevent replay attacks
  await prisma.whatsAppOtp.delete({ where: { id: record.id } });

  return {
    valid: true,
    phoneNumber: record.phoneNumber,
  };
}
