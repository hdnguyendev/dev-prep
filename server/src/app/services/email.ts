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
  | "OFFER_ACCEPTED"
  | "OFFER_REJECTED"
  | "HIRED"
  | "REJECTED"
  | "WITHDRAWN";

export interface ApplicationStatusEmailPayload {
  to: string;
  candidateName?: string;
  jobTitle?: string;
  newStatus: ApplicationStatusForEmail;
  interviewAccessCode?: string;
  interviewLink?: string;
}

export interface NewJobEmailPayload {
  to: string;
  candidateName?: string | null;
  jobTitle: string;
  companyName?: string | null;
  jobLink: string;
}

export interface InterviewCompletedEmailToRecruiterPayload {
  to: string;
  recruiterName?: string;
  candidateName: string;
  jobTitle: string;
  companyName?: string | null;
  interviewId: string;
  overallScore: number;
  recommendation: string;
  applicationId: string;
  previousOverallScore?: number; // If provided, this is an updated result email
}

export interface OfferAcceptedEmailToRecruiterPayload {
  to: string;
  recruiterName?: string;
  candidateName: string;
  jobTitle: string;
  companyName?: string | null;
  offerTitle: string;
  offerId: string;
  applicationId: string;
  responseNote?: string | null;
}

export interface OfferEmailPayload {
  to: string;
  candidateName?: string;
  jobTitle: string;
  companyName?: string | null;
  offerTitle: string;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency: string;
  employmentType?: string | null;
  startDate?: string | null;
  expirationDate: string;
  location?: string | null;
  isRemote: boolean;
  description?: string | null;
  benefits?: string | null;
  terms?: string | null;
  offerId: string;
}

// Các trạng thái coi như là "được duyệt" để gửi mail cho ứng viên
export const APPROVED_APPLICATION_STATUSES: ApplicationStatusForEmail[] = [
  "SHORTLISTED",
  "INTERVIEW_SCHEDULED",
  "OFFER_SENT",
  "OFFER_ACCEPTED",
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
  const { text, html } = buildStatusBody(newStatus, candidateName, jobTitle, payload);

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
  jobTitle?: string,
  payload?: ApplicationStatusEmailPayload
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
    const accessCode = payload?.interviewAccessCode;
    const interviewLink = payload?.interviewLink;

    let text = `${greeting}

Your interview${jobTitle ? ` for "${jobTitle}"` : ""} has been scheduled.

`;
    
    let bodyLines = [
      greeting,
      `Your interview${jobTitle ? ` for <strong>${jobTitle}</strong>` : ""} has been scheduled.`,
    ];

    if (accessCode) {
      text += `Your interview access code is: ${accessCode}

`;
      bodyLines.push(
        `Your interview access code is: <strong style="font-size: 18px; letter-spacing: 2px; color: #0f766e; background-color: #f0fdfa; padding: 8px 16px; border-radius: 6px; display: inline-block; font-family: monospace;">${accessCode}</strong>`
      );
    }

    if (interviewLink) {
      text += `Click the link below to start your interview:
${interviewLink}

`;
      bodyLines.push("Click the button below to start your interview:");
    } else {
      text += `Please check your DevPrep dashboard for the exact time, date, and interview format.

`;
      bodyLines.push("Please check your DevPrep dashboard for the exact time, date, and interview format.");
    }

    text += `Best regards,
DevPrep Team`;

    const html = buildBaseHtml({
      title: "Interview scheduled",
      heading: "Your interview is scheduled 📅",
      bodyLines,
      ctaLabel: interviewLink ? "Start Interview" : "View interview details",
      ctaUrl: interviewLink || Env.APP_BASE_URL || "#",
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

  if (status === "OFFER_ACCEPTED") {
    const text = `${greeting}

Great news! You have accepted the job offer${jobTitle ? ` for "${jobTitle}"` : ""}.

The company will review your acceptance and contact you shortly with next steps.

Best regards,
DevPrep Team`;
    const html = buildBaseHtml({
      title: "Offer accepted",
      heading: "Offer accepted! 🎉",
      bodyLines: [
        greeting,
        `Great news! You have accepted the job offer${jobTitle ? ` for <strong>${jobTitle}</strong>` : ""}.`,
        "The company will review your acceptance and contact you shortly with next steps.",
      ],
      ctaLabel: "View application",
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
    .map((line) => {
      // Handle HTML content in bodyLines
      if (line.startsWith("<") && line.endsWith(">")) {
        return line;
      }
      return `<p style="margin: 0 0 8px; font-size: 14px; line-height: 1.5; color: #1f2933;">${line}</p>`;
    })
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

/**
 * Send notification email to recruiter when candidate completes interview
 */
/**
 * Send detailed offer email to candidate
 */
export async function sendOfferEmail(payload: OfferEmailPayload): Promise<void> {
  const {
    to,
    candidateName,
    jobTitle,
    companyName,
    offerTitle,
    salaryMin,
    salaryMax,
    salaryCurrency,
    employmentType,
    startDate,
    expirationDate,
    location,
    isRemote,
    description,
    benefits,
    terms,
    offerId,
  } = payload;

  const greeting = candidateName ? `Hi ${candidateName},` : "Hi there,";
  const appBaseUrl = Env.APP_BASE_URL || "http://localhost:5173";
  const offerLink = `${appBaseUrl}/candidate/applications?offerId=${offerId}`;

  // Format salary
  let salaryText = "";
  if (salaryMin !== null && salaryMin !== undefined && salaryMax !== null && salaryMax !== undefined) {
    salaryText = `${salaryCurrency} ${salaryMin.toLocaleString()} - ${salaryMax.toLocaleString()}`;
  } else if (salaryMin !== null && salaryMin !== undefined) {
    salaryText = `${salaryCurrency} ${salaryMin.toLocaleString()}+`;
  } else if (salaryMax !== null && salaryMax !== undefined) {
    salaryText = `Up to ${salaryCurrency} ${salaryMax.toLocaleString()}`;
  }

  // Build text email
  const text = `${greeting}

Congratulations! We are excited to extend a job offer to you.

${companyName ? `Company: ${companyName}` : ""}
${jobTitle ? `Position: ${jobTitle}` : ""}
${offerTitle ? `Offer: ${offerTitle}` : ""}

${salaryText ? `Salary: ${salaryText}` : ""}
${employmentType ? `Employment Type: ${employmentType}` : ""}
${startDate ? `Start Date: ${new Date(startDate).toLocaleDateString()}` : ""}
${location ? `Location: ${location}` : ""}
${isRemote ? "Remote: Yes" : ""}

Expiration Date: ${new Date(expirationDate).toLocaleDateString()}

${description ? `\nDescription:\n${description}` : ""}
${benefits ? `\nBenefits:\n${benefits}` : ""}
${terms ? `\nTerms & Conditions:\n${terms}` : ""}

Please review the offer and respond by ${new Date(expirationDate).toLocaleDateString()}.

View and respond to this offer: ${offerLink}

Best regards,
DevPrep Team`;

  // Build HTML email
  const bodyLines: string[] = [
    greeting,
    "Congratulations! We are excited to extend a job offer to you.",
    "",
  ];

  // Offer details section
  const details: string[] = [];
  if (companyName) details.push(`<strong>Company:</strong> ${companyName}`);
  if (jobTitle) details.push(`<strong>Position:</strong> ${jobTitle}`);
  if (offerTitle) details.push(`<strong>Offer:</strong> ${offerTitle}`);
  if (salaryText) details.push(`<strong>Salary:</strong> ${salaryText}`);
  if (employmentType) details.push(`<strong>Employment Type:</strong> ${employmentType}`);
  if (startDate) details.push(`<strong>Start Date:</strong> ${new Date(startDate).toLocaleDateString()}`);
  if (location) details.push(`<strong>Location:</strong> ${location}`);
  if (isRemote) details.push(`<strong>Remote:</strong> Yes`);
  details.push(`<strong>Expiration Date:</strong> ${new Date(expirationDate).toLocaleDateString()}`);

  if (details.length > 0) {
    bodyLines.push("<div style='background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;'>");
    bodyLines.push(...details.map((d) => `<div style='margin: 8px 0;'>${d}</div>`));
    bodyLines.push("</div>");
  }

  if (description) {
    bodyLines.push("<div style='margin: 16px 0;'>");
    bodyLines.push("<strong>Description:</strong>");
    bodyLines.push(`<div style='margin-top: 8px; white-space: pre-wrap;'>${description}</div>`);
    bodyLines.push("</div>");
  }

  if (benefits) {
    bodyLines.push("<div style='margin: 16px 0;'>");
    bodyLines.push("<strong>Benefits:</strong>");
    bodyLines.push(`<div style='margin-top: 8px; white-space: pre-wrap;'>${benefits}</div>`);
    bodyLines.push("</div>");
  }

  if (terms) {
    bodyLines.push("<div style='margin: 16px 0;'>");
    bodyLines.push("<strong>Terms & Conditions:</strong>");
    bodyLines.push(`<div style='margin-top: 8px; white-space: pre-wrap;'>${terms}</div>`);
    bodyLines.push("</div>");
  }

  bodyLines.push("");
  bodyLines.push(`Please review the offer and respond by <strong>${new Date(expirationDate).toLocaleDateString()}</strong>.`);

  const html = buildBaseHtml({
    title: "Job Offer",
    heading: "You have a job offer! 🎁",
    bodyLines,
    ctaLabel: "Review & Respond to Offer",
    ctaUrl: offerLink,
  });

  const subject = jobTitle
    ? `Job Offer: ${offerTitle || jobTitle}`
    : "Job Offer from DevPrep";

  // Check if email sending is enabled
  if (
    !Env.EMAIL_SENDING_ENABLED ||
    !Env.SMTP_HOST ||
    !Env.SMTP_PORT ||
    !Env.SMTP_USER ||
    !Env.SMTP_PASS ||
    !Env.SMTP_FROM
  ) {
    console.log("[EMAIL:Offer] Email sending disabled or misconfigured. Payload:", {
      to,
      subject,
      offerId,
      EMAIL_SENDING_ENABLED: Env.EMAIL_SENDING_ENABLED,
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
    console.log(`[EMAIL:Offer] Offer email sent to ${to} for offer ${offerId}`);
  } catch (error) {
    console.error("[EMAIL:Offer] Failed to send offer email:", error);
    // Don't throw - email sending failure shouldn't break the offer creation
  }
}

/**
 * Send notification email to recruiter when candidate accepts an offer
 */
export async function sendOfferAcceptedEmailToRecruiter(
  payload: OfferAcceptedEmailToRecruiterPayload
): Promise<void> {
  const {
    to,
    recruiterName,
    candidateName,
    jobTitle,
    companyName,
    offerTitle,
    offerId,
    applicationId,
    responseNote,
  } = payload;

  const subject = `Offer accepted: ${candidateName} - ${jobTitle}`;
  const greeting = recruiterName ? `Hi ${recruiterName},` : "Hi there,";

  const text = `${greeting}

Great news! Candidate ${candidateName} has accepted the job offer for ${jobTitle}${companyName ? ` at ${companyName}` : ""}.

Offer Details:
- Offer: ${offerTitle}
${responseNote ? `- Candidate Response: ${responseNote}` : ""}

You can now review the acceptance and proceed with onboarding or confirm the hire.

Best regards,
DevPrep Team`;

  const baseUrl = Env.APP_BASE_URL || "http://localhost:5173";
  const applicationUrl = `${baseUrl}/recruiter/jobs/${applicationId.split('-')[0]}/applications`;

  const bodyLines: string[] = [
    greeting,
    `<strong>${candidateName}</strong> has accepted the job offer for <strong>${jobTitle}</strong>${companyName ? ` at <strong>${companyName}</strong>` : ""}.`,
    "",
    "<div style='background-color: #f9fafb; border-radius: 8px; padding: 16px; margin: 16px 0;'>",
    "<div style='font-weight: 600; margin-bottom: 8px;'>Offer Details:</div>",
    `<div style='margin: 8px 0;'><strong>Offer:</strong> ${offerTitle}</div>`,
  ];

  if (responseNote) {
    bodyLines.push(`<div style='margin: 8px 0;'><strong>Candidate Response:</strong> <div style='margin-top: 4px; white-space: pre-wrap;'>${responseNote}</div></div>`);
  }

  bodyLines.push("</div>");
  bodyLines.push("You can now review the acceptance and proceed with onboarding or confirm the hire.");

  const html = buildBaseHtml({
    title: "Offer accepted",
    heading: "Offer Accepted! 🎉",
    bodyLines,
    ctaLabel: "View Application",
    ctaUrl: applicationUrl,
  });

  if (
    !Env.EMAIL_SENDING_ENABLED ||
    !Env.SMTP_HOST ||
    !Env.SMTP_PORT ||
    !Env.SMTP_USER ||
    !Env.SMTP_PASS ||
    !Env.SMTP_FROM
  ) {
    console.log("[EMAIL:OfferAcceptedToRecruiter] Email sending disabled or misconfigured. Payload:", {
      to,
      subject,
      candidateName,
      jobTitle,
      EMAIL_SENDING_ENABLED: Env.EMAIL_SENDING_ENABLED,
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
    console.log(`[EMAIL:OfferAcceptedToRecruiter] Email sent successfully to ${to} for offer ${offerId}`);
  } catch (error) {
    console.error("[EMAIL:OfferAcceptedToRecruiter] Failed to send email:", error);
  }
}

/**
 * Send notification email to recruiter when candidate rejects an offer
 */
export async function sendOfferRejectedEmailToRecruiter(
  payload: OfferRejectedEmailToRecruiterPayload
): Promise<void> {
  const {
    to,
    recruiterName,
    candidateName,
    jobTitle,
    companyName,
    offerTitle,
    offerId,
    applicationId,
    responseNote,
  } = payload;

  const subject = `Offer rejected: ${candidateName} - ${jobTitle}`;
  const greeting = recruiterName ? `Hi ${recruiterName},` : "Hi there,";

  const text = `${greeting}

Candidate ${candidateName} has rejected the job offer for ${jobTitle}${companyName ? ` at ${companyName}` : ""}.

Offer Details:
- Offer: ${offerTitle}
${responseNote ? `- Candidate Response: ${responseNote}` : ""}

You may want to consider other candidates or send a revised offer.

Best regards,
DevPrep Team`;

  const baseUrl = Env.APP_BASE_URL || "http://localhost:5173";
  const applicationUrl = `${baseUrl}/recruiter/jobs/${applicationId.split('-')[0]}/applications`;

  const bodyLines: string[] = [
    greeting,
    `<strong>${candidateName}</strong> has rejected the job offer for <strong>${jobTitle}</strong>${companyName ? ` at <strong>${companyName}</strong>` : ""}.`,
    "",
    "<div style='background-color: #fef2f2; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid #ef4444;'>",
    "<div style='font-weight: 600; margin-bottom: 8px; color: #991b1b;'>Offer Details:</div>",
    `<div style='margin: 8px 0;'><strong>Offer:</strong> ${offerTitle}</div>`,
  ];

  if (responseNote) {
    bodyLines.push(`<div style='margin: 8px 0;'><strong>Candidate Response:</strong> <div style='margin-top: 4px; white-space: pre-wrap;'>${responseNote}</div></div>`);
  }

  bodyLines.push("</div>");
  bodyLines.push("You may want to consider other candidates or send a revised offer.");

  const html = buildBaseHtml({
    title: "Offer rejected",
    heading: "Offer Rejected",
    bodyLines,
    ctaLabel: "View Application",
    ctaUrl: applicationUrl,
  });

  if (
    !Env.EMAIL_SENDING_ENABLED ||
    !Env.SMTP_HOST ||
    !Env.SMTP_PORT ||
    !Env.SMTP_USER ||
    !Env.SMTP_PASS ||
    !Env.SMTP_FROM
  ) {
    console.log("[EMAIL:OfferRejectedToRecruiter] Email sending disabled or misconfigured. Payload:", {
      to,
      subject,
      candidateName,
      jobTitle,
      EMAIL_SENDING_ENABLED: Env.EMAIL_SENDING_ENABLED,
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
    console.log(`[EMAIL:OfferRejectedToRecruiter] Email sent successfully to ${to} for offer ${offerId}`);
  } catch (error) {
    console.error("[EMAIL:OfferRejectedToRecruiter] Failed to send email:", error);
  }
}

export async function sendInterviewCompletedEmailToRecruiter(
  payload: InterviewCompletedEmailToRecruiterPayload
): Promise<void> {
  const {
    to,
    recruiterName,
    candidateName,
    jobTitle,
    companyName,
    interviewId,
    overallScore,
    recommendation,
    applicationId,
    previousOverallScore,
  } = payload;

  const isUpdate = typeof previousOverallScore === "number";

  const subject = isUpdate
    ? `Updated interview result: ${candidateName} - ${jobTitle}`
    : `Interview completed: ${candidateName} - ${jobTitle}`;

  const greeting = recruiterName ? `Hi ${recruiterName},` : "Hi there,";

  const recommendationText = recommendation === "HIRE" 
    ? "HIRE - Suitable candidate"
    : recommendation === "CONSIDER"
    ? "CONSIDER - Needs consideration"
    : "REJECT - Not suitable";

  const recommendationColor = recommendation === "HIRE"
    ? "#10b981" // green
    : recommendation === "CONSIDER"
    ? "#f59e0b" // yellow
    : "#ef4444"; // red

  const textLines: string[] = [
    greeting,
    "",
    `Candidate ${candidateName} has ${isUpdate ? "an updated evaluation for" : "completed the interview for"} ${jobTitle}${
      companyName ? ` at ${companyName}` : ""
    }.`,
    "",
    "Interview Results:",
  ];

  if (isUpdate && typeof previousOverallScore === "number") {
    textLines.push(
      `- Previous Overall Score: ${previousOverallScore.toFixed(1)} / 100`,
      `- Updated Overall Score: ${overallScore.toFixed(1)} / 100`
    );
  } else {
    textLines.push(`- Overall Score: ${overallScore.toFixed(1)} / 100`);
  }

  textLines.push(
    `- Recommendation: ${recommendationText}`,
    "",
    "You can view the detailed feedback in your DevPrep dashboard.",
    "",
    "Best regards,",
    "DevPrep Team"
  );

  const text = textLines.join("\n");

  const baseUrl = process.env.FRONTEND_URL || process.env.APP_BASE_URL || "http://localhost:5173";
  const feedbackUrl = `${baseUrl}/interviews/${interviewId}/feedback`;
  const applicationUrl = `${baseUrl}/recruiter/jobs/${applicationId.split('-')[0]}/applications`; // Simplified, might need jobId

  const htmlLines: string[] = [
    greeting,
    `<strong>${candidateName}</strong> has ${isUpdate ? "an updated evaluation for" : "completed the interview for"} <strong>${jobTitle}</strong>${
      companyName ? ` at <strong>${companyName}</strong>` : ""
    }.`,
    "",
    "<div style='background-color: #f9fafb; border-radius: 8px; padding: 16px; margin: 16px 0;'>",
    "<div style='font-weight: 600; margin-bottom: 8px;'>Interview Results:</div>",
  ];

  if (isUpdate && typeof previousOverallScore === "number") {
    htmlLines.push(
      `<div style='margin: 8px 0;'><strong>Previous Overall Score:</strong> <span style='font-size: 16px; font-weight: 600; color: #4b5563;'>${previousOverallScore.toFixed(
        1
      )} / 100</span></div>`,
      `<div style='margin: 8px 0;'><strong>Updated Overall Score:</strong> <span style='font-size: 18px; font-weight: 700; color: #0f766e;'>${overallScore.toFixed(
        1
      )} / 100</span></div>`
    );
  } else {
    htmlLines.push(
      `<div style='margin: 8px 0;'><strong>Overall Score:</strong> <span style='font-size: 18px; font-weight: 700; color: #0f766e;'>${overallScore.toFixed(
        1
      )} / 100</span></div>`
    );
  }

  htmlLines.push(
    `<div style='margin: 8px 0;'><strong>Recommendation:</strong> <span style='background-color: ${recommendationColor}20; color: ${recommendationColor}; padding: 4px 12px; border-radius: 6px; font-weight: 600;'>${recommendationText}</span></div>`,
    "</div>",
    "Click the button below to view detailed feedback and analysis."
  );

  const html = buildBaseHtml({
    title: isUpdate ? "Updated interview result" : "Interview completed",
    heading: isUpdate ? "Updated Interview Result 📊" : "Interview Completed 📊",
    bodyLines: htmlLines,
    ctaLabel: "View Interview Feedback",
    ctaUrl: feedbackUrl,
  });

  if (
    !Env.EMAIL_SENDING_ENABLED ||
    !Env.SMTP_HOST ||
    !Env.SMTP_PORT ||
    !Env.SMTP_USER ||
    !Env.SMTP_PASS ||
    !Env.SMTP_FROM
  ) {
    console.log("[EMAIL:InterviewCompletedToRecruiter] Email sending disabled or misconfigured. Payload:", {
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
    console.log("[EMAIL:InterviewCompletedToRecruiter] Email sent successfully to", to);
  } catch (err) {
    console.error("[EMAIL:InterviewCompletedToRecruiter] Failed to send email", err);
  }
}



