import nodemailer from "nodemailer";
import { Env } from "../config/env";

/**
 * Simple email service abstraction.
 *
 * Hiện tại:
 * - Nếu thiếu cấu hình SMTP (ENV) hoặc EMAIL_SENDING_ENABLED = false,
 *   hàm sẽ chỉ log ra console và không gửi mail thực.
 * - Bạn chỉ cần điền các biến ENV, không cần sửa code.
 */
export type ApplicationStatusForEmail =
  | "APPLIED"
  | "REVIEWING"
  | "SHORTLISTED"
  | "INTERVIEW_SCHEDULED"
  | "INTERVIEWED"
  | "OFFER_SENT"
  | "HIRED"
  | "REJECTED"
  | "WITHDRAWN";

export interface ApplicationStatusEmailPayload {
  to: string;
  candidateName?: string;
  jobTitle?: string;
  newStatus: ApplicationStatusForEmail;
}

export interface NewJobEmailPayload {
  to: string;
  candidateName?: string | null;
  jobTitle: string;
  companyName?: string | null;
  jobLink: string;
}

// Các trạng thái coi như là "được duyệt" để gửi mail cho ứng viên
export const APPROVED_APPLICATION_STATUSES: ApplicationStatusForEmail[] = [
  "SHORTLISTED",
  "INTERVIEW_SCHEDULED",
  "OFFER_SENT",
  "HIRED",
];

/**
 * Gửi email khi trạng thái application thay đổi sang trạng thái "được duyệt".
 * Nếu ENV chưa đủ, sẽ fallback sang chế độ log-only (không ném lỗi ra ngoài).
 */
export async function sendApplicationStatusEmail(
  payload: ApplicationStatusEmailPayload
): Promise<void> {
  const { to, candidateName, jobTitle, newStatus } = payload;

  const subject = buildStatusSubject(newStatus, jobTitle);
  const { text, html } = buildStatusBody(newStatus, candidateName, jobTitle);

  // Nếu chưa bật gửi mail hoặc thiếu config, chỉ log để tham khảo
  if (
    !Env.EMAIL_SENDING_ENABLED ||
    !Env.SMTP_HOST ||
    !Env.SMTP_PORT ||
    !Env.SMTP_USER ||
    !Env.SMTP_PASS ||
    !Env.SMTP_FROM
  ) {
    console.log("[EMAIL:ApplicationStatus] Email sending disabled or misconfigured. Payload:", {
      to,
      subject,
      body,
      EMAIL_SENDING_ENABLED: Env.EMAIL_SENDING_ENABLED,
      SMTP_HOST: Env.SMTP_HOST,
      SMTP_PORT: Env.SMTP_PORT,
      SMTP_USER: Env.SMTP_USER,
      SMTP_FROM: Env.SMTP_FROM,
    });
    return;
  }

  const transporter = nodemailer.createTransport({
    host: Env.SMTP_HOST,
    port: Env.SMTP_PORT,
    secure: Env.SMTP_PORT === 465, // true cho 465, false cho các port khác (587,...)
    auth: {
      user: Env.SMTP_USER,
      pass: Env.SMTP_PASS,
    },
  });

  try {
    await transporter.sendMail({
      from: Env.SMTP_FROM,
      to,
      subject,
      text,
      html,
    });
    console.log("[EMAIL:ApplicationStatus] Email sent successfully to", to);
  } catch (err) {
    console.error("[EMAIL:ApplicationStatus] Failed to send email", err);
  }
}

function buildStatusSubject(status: ApplicationStatusForEmail, jobTitle?: string): string {
  switch (status) {
    case "SHORTLISTED":
      return jobTitle
        ? `You've been shortlisted for ${jobTitle}`
        : "You've been shortlisted for a position";
    case "INTERVIEW_SCHEDULED":
      return jobTitle
        ? `Your interview for ${jobTitle} has been scheduled`
        : "Your interview has been scheduled";
    case "OFFER_SENT":
      return jobTitle
        ? `Job offer for ${jobTitle}`
        : "Job offer from our team";
    case "HIRED":
      return jobTitle
        ? `Welcome onboard for ${jobTitle}`
        : "Welcome onboard";
    case "REJECTED":
      return jobTitle
        ? `Update on your application for ${jobTitle}`
        : "Update on your job application";
    default:
      return "Update on your job application";
  }
}

function buildStatusBody(
  status: ApplicationStatusForEmail,
  candidateName?: string,
  jobTitle?: string
): { text: string; html: string } {
  const greeting = candidateName ? `Hi ${candidateName},` : "Hi there,";

  if (status === "SHORTLISTED") {
    const text = `${greeting}

Good news! Your application${jobTitle ? ` for "${jobTitle}"` : ""} has been shortlisted.

Our team will review your profile in more detail and contact you soon with next steps.

Best regards,
DevPrep Team`;
    const html = buildBaseHtml({
      title: "You've been shortlisted",
      heading: "You're shortlisted! 🎉",
      bodyLines: [
        greeting,
        `Good news! Your application${jobTitle ? ` for <strong>${jobTitle}</strong>` : ""} has been shortlisted.`,
        "Our team will review your profile in more detail and contact you soon with next steps.",
      ],
      ctaLabel: "View your application",
      ctaUrl: Env.APP_BASE_URL || "#",
    });
    return { text, html };
  }

  if (status === "INTERVIEW_SCHEDULED") {
    const text = `${greeting}

Your interview${jobTitle ? ` for "${jobTitle}"` : ""} has been scheduled.

Please check your DevPrep dashboard for the exact time, date, and interview format.

Best regards,
DevPrep Team`;
    const html = buildBaseHtml({
      title: "Interview scheduled",
      heading: "Your interview is scheduled 📅",
      bodyLines: [
        greeting,
        `Your interview${jobTitle ? ` for <strong>${jobTitle}</strong>` : ""} has been scheduled.`,
        "Please check your DevPrep dashboard for the exact time, date, and interview format.",
      ],
      ctaLabel: "View interview details",
      ctaUrl: Env.APP_BASE_URL || "#",
    });
    return { text, html };
  }

  if (status === "OFFER_SENT") {
    const text = `${greeting}

Congratulations! We have sent you a job offer${jobTitle ? ` for "${jobTitle}"` : ""}.

Please review the offer in your DevPrep account and respond as soon as you can.

Best regards,
DevPrep Team`;
    const html = buildBaseHtml({
      title: "Job offer sent",
      heading: "You have a job offer 🎁",
      bodyLines: [
        greeting,
        `Congratulations! We have sent you a job offer${jobTitle ? ` for <strong>${jobTitle}</strong>` : ""}.`,
        "Please review the offer in your DevPrep account and respond as soon as you can.",
      ],
      ctaLabel: "Review your offer",
      ctaUrl: Env.APP_BASE_URL || "#",
    });
    return { text, html };
  }

  if (status === "HIRED") {
    const text = `${greeting}

Amazing news! You have been hired${jobTitle ? ` for the position "${jobTitle}"` : ""}.

The company will contact you shortly with onboarding details.

Best regards,
DevPrep Team`;
    const html = buildBaseHtml({
      title: "You're hired",
      heading: "Welcome on board 🚀",
      bodyLines: [
        greeting,
        `Amazing news! You have been hired${jobTitle ? ` for the position <strong>${jobTitle}</strong>` : ""}.`,
        "The company will contact you shortly with onboarding details.",
      ],
      ctaLabel: "View details",
      ctaUrl: Env.APP_BASE_URL || "#",
    });
    return { text, html };
  }

  if (status === "REJECTED") {
    const text = `${greeting}

Thank you for taking the time to apply${jobTitle ? ` for "${jobTitle}"` : ""}.

After careful consideration, we’ve decided not to move forward with your application for this role.

We really appreciate your interest and encourage you to keep exploring other opportunities on DevPrep.

Best regards,
DevPrep Team`;
    const html = buildBaseHtml({
      title: "Application update",
      heading: "Update on your application",
      bodyLines: [
        greeting,
        `Thank you for taking the time to apply${jobTitle ? ` for <strong>${jobTitle}</strong>` : ""}.`,
        "After careful consideration, we've decided not to move forward with your application for this role.",
        "We really appreciate your interest and encourage you to keep exploring other opportunities on DevPrep.",
      ],
      ctaLabel: "Browse more jobs",
      ctaUrl: Env.APP_BASE_URL || "#",
    });
    return { text, html };
  }

  const text = `${greeting}

There is an update on your job application${jobTitle ? ` for "${jobTitle}"` : ""}.

Please log in to your DevPrep account to see the latest status.

Best regards,
DevPrep Team`;
  const html = buildBaseHtml({
    title: "Application update",
    heading: "Update on your application",
    bodyLines: [
      greeting,
      `There is an update on your job application${jobTitle ? ` for <strong>${jobTitle}</strong>` : ""}.`,
      "Please log in to your DevPrep account to see the latest status.",
    ],
    ctaLabel: "Open DevPrep",
    ctaUrl: Env.APP_BASE_URL || "#",
  });
  return { text, html };
}

/**
 * Gửi email cho candidate khi có job mới từ công ty mà họ đang follow.
 */
export async function sendNewJobEmailToFollower(
  payload: NewJobEmailPayload
): Promise<void> {
  const { to, candidateName, jobTitle, companyName, jobLink } = payload;

  const subject = companyName
    ? `New role at ${companyName}: ${jobTitle}`
    : `New job posted: ${jobTitle}`;

  const greeting = candidateName ? `Hi ${candidateName},` : "Hi there,";

  const text = `${greeting}

A company you follow has just posted a new job:

- Company: ${companyName || "A company you follow"}
- Role: ${jobTitle}

You can view the full job description and apply using the link below:
${jobLink}

Best regards,
DevPrep Team`;

  const html = buildBaseHtml({
    title: "New job from a company you follow",
    heading: "New opportunity just dropped ✨",
    bodyLines: [
      greeting,
      companyName
        ? `<strong>${companyName}</strong> has just published a new role: <strong>${jobTitle}</strong>.`
        : `A company you follow has just published a new role: <strong>${jobTitle}</strong>.`,
      "Click the button below to view the job details and apply if it's a good fit.",
    ],
    ctaLabel: "View job",
    ctaUrl: jobLink,
  });

  if (
    !Env.EMAIL_SENDING_ENABLED ||
    !Env.SMTP_HOST ||
    !Env.SMTP_PORT ||
    !Env.SMTP_USER ||
    !Env.SMTP_PASS ||
    !Env.SMTP_FROM
  ) {
    console.log("[EMAIL:NewJobFollower] Email sending disabled or misconfigured. Payload:", {
      to,
      subject,
      text,
      EMAIL_SENDING_ENABLED: Env.EMAIL_SENDING_ENABLED,
      SMTP_HOST: Env.SMTP_HOST,
      SMTP_PORT: Env.SMTP_PORT,
      SMTP_USER: Env.SMTP_USER,
      SMTP_FROM: Env.SMTP_FROM,
    });
    return;
  }

  const transporter = nodemailer.createTransport({
    host: Env.SMTP_HOST,
    port: Env.SMTP_PORT,
    secure: Env.SMTP_PORT === 465,
    auth: {
      user: Env.SMTP_USER,
      pass: Env.SMTP_PASS,
    },
  });

  try {
    await transporter.sendMail({
      from: Env.SMTP_FROM,
      to,
      subject,
      text,
      html,
    });
    console.log("[EMAIL:NewJobFollower] Email sent successfully to", to);
  } catch (err) {
    console.error("[EMAIL:NewJobFollower] Failed to send email", err);
  }
}

type BaseEmailTemplateParams = {
  title: string;
  heading: string;
  bodyLines: string[];
  ctaLabel: string;
  ctaUrl: string;
};

function buildBaseHtml(params: BaseEmailTemplateParams): string {
  const { title, heading, bodyLines, ctaLabel, ctaUrl } = params;

  const safeCtaUrl = ctaUrl || "#";

  const bodyHtml = bodyLines
    .filter(Boolean)
    .map((line) => `<p style="margin: 0 0 8px; font-size: 14px; line-height: 1.5; color: #1f2933;">${line}</p>`)
    .join("");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>${title}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f4f5f7;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f4f5f7;padding:24px 0;">
      <tr>
        <td align="center">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;background-color:#ffffff;border-radius:12px;border:1px solid #e5e7eb;box-shadow:0 10px 25px rgba(15,23,42,0.08);overflow:hidden;">
            <tr>
              <td style="padding:20px 24px 16px;border-bottom:1px solid #e5e7eb;background:linear-gradient(135deg,#0f766e,#0369a1);">
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                  <tr>
                    <td align="left">
                      <div style="font-size:14px;font-weight:600;color:#e0f2fe;letter-spacing:0.08em;text-transform:uppercase;">DevPrep</div>
                      <div style="margin-top:4px;font-size:20px;font-weight:700;color:#f9fafb;">${heading}</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 24px 24px;">
                ${bodyHtml}
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:18px;">
                  <tr>
                    <td>
                      <a href="${safeCtaUrl}" style="display:inline-block;padding:10px 18px;border-radius:9999px;background:linear-gradient(135deg,#0f766e,#0369a1);color:#f9fafb;font-size:14px;font-weight:600;text-decoration:none;">
                        ${ctaLabel}
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 24px 16px;border-top:1px solid #e5e7eb;background-color:#f9fafb;">
                <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.5;">
                  You are receiving this email because you use DevPrep for your job search.
                  If you did not expect this, you can safely ignore this email.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}



