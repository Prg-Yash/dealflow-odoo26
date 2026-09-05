import { ENV } from "../config/env.js";

interface SendVerificationEmailParams {
  email: string;
  name?: string;
  url: string;
  token?: string;
}

/**
 * Sends email verification via SMTP (defaults to Gmail SMTP).
 * If SMTP credentials are not yet configured in .env, prints the link to the console for testing.
 */
export async function sendVerificationEmail({
  email,
  name,
  url,
}: SendVerificationEmailParams): Promise<boolean> {
  const recipientName = name || email.split("@")[0] || "User";

  // Check if Gmail SMTP credentials are configured
  if (!ENV.SMTP_USER || !ENV.SMTP_PASS) {
    console.log("\n==================================================");
    console.log("  ✉️  EMAIL VERIFICATION LINK (SMTP NOT CONFIGURED)");
    console.log(`  Recipient : ${email}`);
    console.log(`  To verify, open this URL in your browser:`);
    console.log(`  ${url}`);
    console.log("  (To enable Gmail delivery, add SMTP_USER & SMTP_PASS in apps/api/.env)");
    console.log("==================================================\n");
    return true;
  }

  try {
    // Dynamic import to avoid runtime failure if nodemailer is not yet installed
    let nodemailer: typeof import("nodemailer");
    try {
      const nodemailerModule = await import("nodemailer");
      nodemailer = nodemailerModule.default || nodemailerModule;
    } catch {
      console.warn(
        `[Email Service] 'nodemailer' is not installed yet. Please run 'npm install' in the project root.`
      );
      console.log(`[Email Service] Fallback Verification URL for ${email}:\n${url}`);
      return true;
    }

    const transporter = nodemailer.createTransport({
      host: ENV.SMTP_HOST,
      port: ENV.SMTP_PORT,
      secure: ENV.SMTP_SECURE, // true for 465, false for 587
      auth: {
        user: ENV.SMTP_USER,
        pass: ENV.SMTP_PASS,
      },
    });

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #131b2e; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px; padding: 36px 32px; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);">
          <tr>
            <td style="text-align: center; padding-bottom: 24px;">
              <div style="display: inline-block; background: linear-gradient(135deg, #6366f1, #a855f7); border-radius: 12px; padding: 10px 14px; font-weight: bold; font-size: 18px; color: #ffffff; letter-spacing: 1px;">
                DEALFLOW 360
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 12px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff;">Verify Your Email Address</h1>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 28px; text-align: center; color: #94a3b8; font-size: 15px; line-height: 1.6;">
              Hello <strong style="color: #f1f5f9;">${recipientName}</strong>, thank you for joining. Please verify your email to unlock all workspace features and secure your account.
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom: 28px;">
              <a href="${url}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #4f46e5, #7c3aed); color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px; padding: 14px 32px; border-radius: 10px; box-shadow: 0 4px 14px rgba(79, 70, 229, 0.4);">
                Verify Email Address
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 24px; color: #64748b; font-size: 13px; line-height: 1.5; text-align: center;">
              If the button above does not work, copy and paste this link into your browser:<br>
              <a href="${url}" style="color: #818cf8; word-break: break-all;">${url}</a>
            </td>
          </tr>
          <tr>
            <td style="border-top: 1px solid rgba(255, 255, 255, 0.06); padding-top: 20px; text-align: center; color: #475569; font-size: 12px;">
              If you did not request this verification, you can safely ignore this email.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const mailOptions = {
      from: ENV.SMTP_FROM,
      to: email,
      subject: "Verify your email address - Dealflow 360 Auth",
      text: `Hello ${recipientName},\n\nPlease verify your email address by clicking the link below:\n${url}\n\nIf you did not request this email, please ignore it.`,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email Service] Verification email delivered to ${email} (Message ID: ${info.messageId})`);
    return true;
  } catch (error) {
    console.error(`[Email Service] Failed to send verification email to ${email}:`, error);
    // Print fallback link so developer/user is not blocked
    console.log(`[Email Service] Fallback Verification Link:\n${url}`);
    return false;
  }
}

interface SendResetPasswordEmailParams {
  email: string;
  name?: string;
  url: string;
  token?: string;
}

/**
 * Sends a password reset email via SMTP (defaults to Gmail SMTP).
 * If SMTP credentials are not yet configured in .env, prints the link to the console for testing.
 */
export async function sendResetPasswordEmail({
  email,
  name,
  url,
}: SendResetPasswordEmailParams): Promise<boolean> {
  const recipientName = name || email.split("@")[0] || "User";

  // Check if Gmail SMTP credentials are configured
  if (!ENV.SMTP_USER || !ENV.SMTP_PASS) {
    console.log("\n==================================================");
    console.log("  🔑  PASSWORD RESET LINK (SMTP NOT CONFIGURED)");
    console.log(`  Recipient : ${email}`);
    console.log(`  To reset your password, open this URL in your browser:`);
    console.log(`  ${url}`);
    console.log("  (To enable Gmail delivery, add SMTP_USER & SMTP_PASS in apps/api/.env)");
    console.log("==================================================\n");
    return true;
  }

  try {
    let nodemailer: typeof import("nodemailer");
    try {
      const nodemailerModule = await import("nodemailer");
      nodemailer = nodemailerModule.default || nodemailerModule;
    } catch {
      console.warn(
        `[Email Service] 'nodemailer' is not installed yet. Please run 'npm install' in the project root.`
      );
      console.log(`[Email Service] Fallback Password Reset URL for ${email}:\n${url}`);
      return true;
    }

    const transporter = nodemailer.createTransport({
      host: ENV.SMTP_HOST,
      port: ENV.SMTP_PORT,
      secure: ENV.SMTP_SECURE,
      auth: {
        user: ENV.SMTP_USER,
        pass: ENV.SMTP_PASS,
      },
    });

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #131b2e; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px; padding: 36px 32px; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);">
          <tr>
            <td style="text-align: center; padding-bottom: 24px;">
              <div style="display: inline-block; background: linear-gradient(135deg, #6366f1, #a855f7); border-radius: 12px; padding: 10px 14px; font-weight: bold; font-size: 18px; color: #ffffff; letter-spacing: 1px;">
                DEALFLOW 360
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 12px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff;">Reset Your Password</h1>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 28px; text-align: center; color: #94a3b8; font-size: 15px; line-height: 1.6;">
              Hello <strong style="color: #f1f5f9;">${recipientName}</strong>, we received a request to reset your password. Click the button below to choose a new password:
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom: 28px;">
              <a href="${url}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #4f46e5, #7c3aed); color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px; padding: 14px 32px; border-radius: 10px; box-shadow: 0 4px 14px rgba(79, 70, 229, 0.4);">
                Reset Password
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 24px; color: #64748b; font-size: 13px; line-height: 1.5; text-align: center;">
              This link will expire in 1 hour.<br>
              If the button above does not work, copy and paste this link into your browser:<br>
              <a href="${url}" style="color: #818cf8; word-break: break-all;">${url}</a>
            </td>
          </tr>
          <tr>
            <td style="border-top: 1px solid rgba(255, 255, 255, 0.06); padding-top: 20px; text-align: center; color: #475569; font-size: 12px;">
              If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const mailOptions = {
      from: ENV.SMTP_FROM,
      to: email,
      subject: "Reset your password - Dealflow 360 Auth",
      text: `Hello ${recipientName},\n\nWe received a request to reset your password. Click the link below to set a new password:\n${url}\n\nThis link will expire in 1 hour.\n\nIf you did not request this, please ignore this email.`,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email Service] Password reset email delivered to ${email} (Message ID: ${info.messageId})`);
    return true;
  } catch (error) {
    console.error(`[Email Service] Failed to send password reset email to ${email}:`, error);
    console.log(`[Email Service] Fallback Password Reset Link:\n${url}`);
    return false;
  }
}

