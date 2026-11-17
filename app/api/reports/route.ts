import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { database, databaseConfigured } from "../../lib/server/database";
import { currentAccount, isAdmin } from "../../lib/server/session";
import { tokenHash } from "../../lib/server/passwords";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const reply = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
function sameOrigin(request: NextRequest) {
  try {
    return (
      new URL(request.headers.get("origin") ?? "").origin ===
      request.nextUrl.origin
    );
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request))
    return reply({ error: "Open the report form from RyanOS." }, 403);
  if (!databaseConfigured())
    return reply(
      {
        error:
          "Report storage is unavailable. Download the report and try again later.",
      },
      503,
    );
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw) > 20000)
      return reply({ error: "Report is too large." }, 413);
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return reply({ error: "Invalid report." }, 400);
    }
    if (
      !data ||
      typeof data.message !== "string" ||
      data.message.trim().length < 10 ||
      data.message.length > 5000 ||
      !["bug", "suggestion", "data", "other"].includes(data.category)
    )
      return reply(
        { error: "Choose a category and write 10–5000 characters." },
        400,
      );
    const contact = typeof data.contact === "string" ? data.contact.trim() : "";
    if (
      contact &&
      (contact.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact))
    )
      return reply(
        { error: "Enter a valid reply email or leave it blank." },
        400,
      );
    const sql = await database();
    const ip =
      request.headers.get("x-real-ip") ??
      request.headers.get("x-forwarded-for")?.split(",")[0] ??
      "local";
    const key = tokenHash(`report:${ip}`);
    const [attempt] =
      await sql`INSERT INTO ryanos_auth_attempts (key, attempts) VALUES (${key}, 1) ON CONFLICT (key) DO UPDATE SET attempts = CASE WHEN ryanos_auth_attempts.started_at < now() - interval '1 hour' THEN 1 ELSE ryanos_auth_attempts.attempts + 1 END, started_at = CASE WHEN ryanos_auth_attempts.started_at < now() - interval '1 hour' THEN now() ELSE ryanos_auth_attempts.started_at END RETURNING attempts`;
    if (Number(attempt.attempts) > 10)
      return reply(
        { error: "Report limit reached. Try again in an hour." },
        429,
      );
    const account = await currentAccount(request);
    const id =
      typeof data.requestId === "string" &&
      /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
        data.requestId,
      )
        ? data.requestId
        : randomUUID();
    const diagnostics =
      data.diagnostics && typeof data.diagnostics === "object"
        ? JSON.stringify(data.diagnostics).slice(0, 10000)
        : null;
    // Parse again so a truncated diagnostic object cannot become invalid JSONB.
    let validDiagnostics = null;
    if (diagnostics) {
      try {
        validDiagnostics = JSON.stringify(JSON.parse(diagnostics));
      } catch {
        return reply(
          {
            error:
              "Diagnostics are too large. Disable diagnostics and try again.",
          },
          400,
        );
      }
    }
    const [inserted] =
      await sql`INSERT INTO ryanos_reports (id, username, category, message, contact, diagnostics) VALUES (${id}, ${account?.username ?? null}, ${data.category}, ${data.message.trim()}, ${contact || null}, ${validDiagnostics}::jsonb) ON CONFLICT (id) DO NOTHING RETURNING id`;
    if (!inserted) return reply({ reference: id, notification: "stored" });
    let notification = "disabled";
    if (
      process.env.RESEND_API_KEY &&
      process.env.REPORT_EMAIL_TO &&
      process.env.REPORT_EMAIL_FROM
    ) {
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
            "Idempotency-Key": `ryanos-report-${id}`,
          },
          body: JSON.stringify({
            from: process.env.REPORT_EMAIL_FROM,
            to: [process.env.REPORT_EMAIL_TO],
            subject: `RyanOS ${data.category} report ${id.slice(0, 8)}`,
            text: `Report ${id}\nFrom: ${account?.username ?? "Guest"}\nReply email: ${contact || "Not supplied"}\n\n${data.message.trim()}\n\nReview this report in RyanOS Settings → Reports.`,
          }),
          signal: AbortSignal.timeout(8000),
        });
        notification = response.ok ? "sent" : "failed";
      } catch {
        notification = "failed";
      }
      await sql`UPDATE ryanos_reports SET notification = ${notification} WHERE id = ${id}`;
    }
    return reply({ reference: id, notification });
  } catch {
    return reply(
      {
        error:
          "Report could not be confirmed. Download a copy before retrying.",
      },
      503,
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const account = await currentAccount(request);
    if (!account) return reply({ admin: false, reports: [] });
    if (!isAdmin(String(account.username)))
      return reply({ admin: false, reports: [] });
    const sql = await database();
    const reports =
      await sql`SELECT id, username, category, message, contact, diagnostics, status, notification, created_at FROM ryanos_reports ORDER BY created_at DESC LIMIT 100`;
    return reply({ admin: true, reports });
  } catch {
    return reply({ error: "Report inbox is unavailable." }, 503);
  }
}

export async function PATCH(request: NextRequest) {
  if (!sameOrigin(request)) return reply({ error: "Invalid origin." }, 403);
  try {
    const account = await currentAccount(request);
    if (!account || !isAdmin(String(account.username)))
      return reply({ error: "Admin access required." }, 403);
    const data = await request.json();
    if (
      !data ||
      !/^[a-f0-9-]{36}$/i.test(data.id) ||
      !["open", "triaged", "resolved"].includes(data.status)
    )
      return reply({ error: "Invalid report update." }, 400);
    const sql = await database();
    const [report] =
      await sql`UPDATE ryanos_reports SET status = ${data.status} WHERE id = ${data.id} RETURNING id`;
    return report
      ? reply({ ok: true })
      : reply({ error: "Report not found." }, 404);
  } catch {
    return reply({ error: "Report could not be updated." }, 503);
  }
}
