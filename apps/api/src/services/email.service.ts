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

interface SendInvitationEmailParams {
  email: string;
  name?: string;
  organizationName: string;
  role: string;
  inviteUrl: string;
  inviterName?: string;
}

/**
 * Sends an organization member invitation email with role assignment via SMTP.
 */
export async function sendInvitationEmail({
  email,
  name,
  organizationName,
  role,
  inviteUrl,
  inviterName = "An Administrator",
}: SendInvitationEmailParams): Promise<boolean> {
  const recipientName = name || email.split("@")[0] || "Team Member";

  // Role display label
  const roleDisplayNames: Record<string, string> = {
    SALES_REP: "Sales Representative",
    SALES_MANAGER: "Sales Manager / Approver",
    FINANCE_OPS: "Finance / Operations User",
    ADMIN: "Administrator",
    CUSTOMER: "Customer / Client Portal",
  };
  const readableRole = roleDisplayNames[role] || role;


  // If SMTP not configured, print to console for development testing
  if (!ENV.SMTP_USER || !ENV.SMTP_PASS) {
    console.log("\n==================================================");
    console.log("  ✉️  MEMBER INVITATION LINK (SMTP NOT CONFIGURED)");
    console.log(`  Recipient    : ${email}`);
    console.log(`  Organization : ${organizationName}`);
    console.log(`  Assigned Role: ${readableRole}`);
    console.log(`  Invited By   : ${inviterName}`);
    console.log(`  Invitation URL:`);
    console.log(`  ${inviteUrl}`);
    console.log("  (To enable actual email delivery, set SMTP_USER & SMTP_PASS in apps/api/.env)");
    console.log("==================================================\n");
    return true;
  }

  try {
    let nodemailer: typeof import("nodemailer");
    try {
      const nodemailerModule = await import("nodemailer");
      nodemailer = nodemailerModule.default || nodemailerModule;
    } catch {
      console.warn("[Email Service] 'nodemailer' not available. Fallback invitation link:");
      console.log(`[Email Service] Invite URL for ${email}:\n${inviteUrl}`);
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
  <title>Invitation to Join ${organizationName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 540px; background-color: #131b2e; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px; padding: 36px 32px; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);">
          <tr>
            <td style="text-align: center; padding-bottom: 24px;">
              <div style="display: inline-block; background: linear-gradient(135deg, #6366f1, #a855f7); border-radius: 12px; padding: 10px 14px; font-weight: bold; font-size: 18px; color: #ffffff; letter-spacing: 1px;">
                DEALFLOW 360
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 12px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff;">You're Invited to Join</h1>
              <p style="margin: 6px 0 0 0; font-size: 18px; font-weight: 600; color: #818cf8;">${organizationName}</p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 24px; text-align: center; color: #94a3b8; font-size: 15px; line-height: 1.6;">
              Hello <strong style="color: #f1f5f9;">${recipientName}</strong>,<br>
              <strong>${inviterName}</strong> has invited you to join <strong style="color: #f1f5f9;">${organizationName}</strong> on the DealFlow360 platform as a:
              <div style="display: inline-block; margin-top: 10px; background: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 8px; padding: 6px 16px; color: #a5b4fc; font-weight: 600; font-size: 15px;">
                ${readableRole}
              </div>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom: 28px;">
              <a href="${inviteUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #4f46e5, #7c3aed); color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px; padding: 14px 36px; border-radius: 10px; box-shadow: 0 4px 16px rgba(79, 70, 229, 0.4);">
                Accept Invitation &amp; Join
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 24px; color: #64748b; font-size: 13px; line-height: 1.5; text-align: center;">
              This invitation link is valid for 7 days.<br>
              Direct Link: <a href="${inviteUrl}" style="color: #818cf8; word-break: break-all;">${inviteUrl}</a>
            </td>
          </tr>
          <tr>
            <td style="border-top: 1px solid rgba(255, 255, 255, 0.06); padding-top: 20px; text-align: center; color: #475569; font-size: 12px;">
              If you did not expect this invitation, you can ignore this email.
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
      subject: `Invitation to join ${organizationName} on DealFlow360`,
      text: `Hello ${recipientName},\n\n${inviterName} has invited you to join ${organizationName} as a ${readableRole}.\n\nClick the link below to accept:\n${inviteUrl}\n\nThis invitation is valid for 7 days.`,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email Service] Invitation email sent to ${email} (Message ID: ${info.messageId})`);
    return true;
  } catch (error) {
    console.error(`[Email Service] Failed to send invitation email to ${email}:`, error);
    console.log(`[Email Service] Fallback Invitation Link:\n${inviteUrl}`);
    return false;
  }
}


