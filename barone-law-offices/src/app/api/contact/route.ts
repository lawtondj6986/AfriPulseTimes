import { NextResponse } from "next/server";

export const runtime = "nodejs";

interface ContactPayload {
  name: string;
  phone: string;
  email: string;
  matter?: string;
  message: string;
  /** Honeypot field — should always be empty for real submissions. */
  company?: string;
}

/** Escape a string for safe interpolation into an HTML email body. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON body." },
        { status: 400 }
      );
    }

    const data = (body ?? {}) as Partial<ContactPayload>;

    // Honeypot: bots fill "company" — pretend everything went fine.
    if (isNonEmptyString(data.company)) {
      return NextResponse.json({ ok: true });
    }

    if (
      !isNonEmptyString(data.name) ||
      !isNonEmptyString(data.phone) ||
      !isNonEmptyString(data.email) ||
      !isNonEmptyString(data.message)
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing required fields: name, phone, email, and message are required.",
        },
        { status: 400 }
      );
    }

    const email = data.email.trim();
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json(
        { ok: false, error: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    const submission = {
      name: data.name.trim(),
      phone: data.phone.trim(),
      email,
      matter: isNonEmptyString(data.matter) ? data.matter.trim() : "Not specified",
      message: data.message.trim(),
    };

    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      // Dev / no-email mode: log and succeed so the form still works.
      console.log("[contact] New consultation request (email delivery disabled):", submission);
      return NextResponse.json({ ok: true, delivered: false });
    }

    const from = process.env.CONTACT_FROM_EMAIL || "website@baronelaw.com";
    const to = process.env.CONTACT_TO_EMAIL || "intake@baronelaw.com";

    const html = `
      <h2>New consultation request</h2>
      <table cellpadding="6" style="border-collapse:collapse;font-family:sans-serif;font-size:14px">
        <tr><td><strong>Name</strong></td><td>${escapeHtml(submission.name)}</td></tr>
        <tr><td><strong>Phone</strong></td><td>${escapeHtml(submission.phone)}</td></tr>
        <tr><td><strong>Email</strong></td><td>${escapeHtml(submission.email)}</td></tr>
        <tr><td><strong>Matter</strong></td><td>${escapeHtml(submission.matter)}</td></tr>
      </table>
      <h3>Message</h3>
      <p style="white-space:pre-wrap;font-family:sans-serif;font-size:14px">${escapeHtml(submission.message)}</p>
    `;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        reply_to: submission.email,
        subject: `New consultation request — ${submission.name}`,
        html,
      }),
    });

    if (!resendResponse.ok) {
      const detail = await resendResponse.text().catch(() => "");
      console.error("[contact] Resend API error:", resendResponse.status, detail);
      return NextResponse.json(
        { ok: false, error: "The message could not be delivered. Please call us instead." },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, delivered: true });
  } catch (error) {
    console.error("[contact] Unexpected error handling submission:", error);
    return NextResponse.json(
      { ok: false, error: "An unexpected error occurred. Please try again later." },
      { status: 500 }
    );
  }
}
