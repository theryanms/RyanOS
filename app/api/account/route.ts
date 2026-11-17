import { randomBytes, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { database, databaseConfigured } from "../../lib/server/database";
import {
  hashPassword,
  normalizeUsername,
  tokenHash,
  verifyPassword,
} from "../../lib/server/passwords";
import { parseSnapshot, type CloudSave } from "../../lib/snapshot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const cookieName = "ryanos-session";
const sessionSeconds = 60 * 60 * 24 * 30;

class AccountError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function record(row: Record<string, unknown>): CloudSave {
  return {
    username: String(row.username),
    revision: Number(row.revision),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
    snapshot: parseSnapshot(row.save_data),
  };
}

async function currentAccount(request: NextRequest) {
  const token = request.cookies.get(cookieName)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const sql = await database();
  const [account] =
    await sql`SELECT a.* FROM ryanos_accounts a JOIN ryanos_sessions s ON s.account_id = a.id WHERE s.token_hash = ${tokenHash(token)} AND s.expires_at > now()`;
  return account ?? null;
}

function assertOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  let requestOrigin;
  try {
    requestOrigin = origin ? new URL(origin).origin : null;
  } catch {
    requestOrigin = null;
  }
  if (!requestOrigin || requestOrigin !== request.nextUrl.origin)
    throw new AccountError("This request must come from RyanOS.", 403);
}

async function body(request: NextRequest) {
  const text = await request.text();
  if (Buffer.byteLength(text) > 1_100_000)
    throw new AccountError("Save data is too large.", 413);
  try {
    const value = JSON.parse(text);
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw Error();
    return value as Record<string, unknown>;
  } catch {
    throw new AccountError("Invalid request data.");
  }
}

function failure(error: unknown) {
  if (error instanceof AccountError)
    return json({ error: error.message }, error.status);
  return json(
    {
      error:
        "Cloud saving is temporarily unavailable. Your device copy is still available.",
    },
    503,
  );
}

export async function GET(request: NextRequest) {
  if (!databaseConfigured()) return json({ configured: false, account: null });
  try {
    const account = await currentAccount(request);
    return json({
      configured: true,
      account: account ? record(account) : null,
    });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    assertOrigin(request);
    if (!databaseConfigured())
      throw new AccountError(
        "Cloud accounts are waiting for the database connection.",
        503,
      );
    const data = await body(request);
    const sql = await database();
    if (data.action === "signout") {
      const token = request.cookies.get(cookieName)?.value;
      if (token)
        await sql`DELETE FROM ryanos_sessions WHERE token_hash = ${tokenHash(token)}`;
      const response = json({ account: null });
      response.cookies.set(cookieName, "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });
      return response;
    }
    if (data.action !== "signup" && data.action !== "signin")
      throw new AccountError("Choose sign in or create account.");
    let username: string;
    try {
      username = normalizeUsername(data.username);
    } catch (error) {
      throw new AccountError((error as Error).message);
    }
    if (
      typeof data.password !== "string" ||
      data.password.length < 10 ||
      data.password.length > 128
    )
      throw new AccountError("Use a password between 10 and 128 characters.");
    const ip =
      request.headers.get("x-real-ip") ??
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "local";
    const attemptKeys = [
      tokenHash(`ip:${ip}`),
      tokenHash(`username:${username}`),
    ];
    const attempts = await sql.transaction(
      attemptKeys.map(
        (key) => sql`
      INSERT INTO ryanos_auth_attempts (key, attempts) VALUES (${key}, 1)
      ON CONFLICT (key) DO UPDATE SET
        attempts = CASE WHEN ryanos_auth_attempts.started_at < now() - interval '15 minutes' THEN 1 ELSE ryanos_auth_attempts.attempts + 1 END,
        started_at = CASE WHEN ryanos_auth_attempts.started_at < now() - interval '15 minutes' THEN now() ELSE ryanos_auth_attempts.started_at END
      RETURNING attempts`,
      ),
    );
    if (
      Number(attempts[0][0].attempts) > 40 ||
      Number(attempts[1][0].attempts) > 15
    )
      throw new AccountError(
        "Too many attempts. Try again in 15 minutes.",
        429,
      );
    const sessionToken = randomBytes(32).toString("hex");
    const previousHash = tokenHash(
      request.cookies.get(cookieName)?.value ?? "",
    );
    let account: Record<string, unknown>;
    if (data.action === "signup") {
      let snapshot;
      try {
        snapshot = parseSnapshot(data.snapshot);
      } catch (error) {
        throw new AccountError((error as Error).message);
      }
      const id = randomUUID();
      const passwordHash = await hashPassword(data.password);
      try {
        const results = await sql.transaction([
          sql`INSERT INTO ryanos_accounts (id, username, password_hash, save_data) VALUES (${id}, ${username}, ${passwordHash}, ${JSON.stringify(snapshot)}::jsonb) RETURNING *`,
          sql`INSERT INTO ryanos_sessions (token_hash, account_id, expires_at) VALUES (${tokenHash(sessionToken)}, ${id}, now() + interval '30 days')`,
          sql`DELETE FROM ryanos_sessions WHERE token_hash = ${previousHash} OR expires_at <= now()`,
          sql`DELETE FROM ryanos_auth_attempts WHERE started_at < now() - interval '1 day'`,
        ]);
        account = results[0][0];
      } catch (error) {
        if ((error as { code?: string }).code === "23505")
          throw new AccountError(
            "That username is already taken. Choose another or sign in.",
            409,
          );
        throw error;
      }
    } else {
      const [found] =
        await sql`SELECT * FROM ryanos_accounts WHERE username = ${username}`;
      const storedHash = found
        ? String(found.password_hash)
        : `scrypt$${"0".repeat(32)}$${"0".repeat(128)}`;
      if (!(await verifyPassword(data.password, storedHash)) || !found)
        throw new AccountError("Username or password is incorrect.", 401);
      account = found;
      await sql.transaction([
        sql`INSERT INTO ryanos_sessions (token_hash, account_id, expires_at) VALUES (${tokenHash(sessionToken)}, ${account.id}, now() + interval '30 days')`,
        sql`DELETE FROM ryanos_sessions WHERE token_hash = ${previousHash} OR expires_at <= now()`,
        sql`DELETE FROM ryanos_auth_attempts WHERE started_at < now() - interval '1 day'`,
      ]);
    }
    const response = json({ configured: true, account: record(account) });
    response.cookies.set(cookieName, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: sessionSeconds,
    });
    return response;
  } catch (error) {
    return failure(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    assertOrigin(request);
    const account = await currentAccount(request);
    if (!account)
      throw new AccountError("Sign in again to resume cloud saving.", 401);
    const data = await body(request);
    if (!Number.isSafeInteger(data.revision) || Number(data.revision) < 1)
      throw new AccountError("Invalid save revision.");
    let snapshot;
    try {
      snapshot = parseSnapshot(data.snapshot);
    } catch (error) {
      throw new AccountError((error as Error).message);
    }
    const sql = await database();
    const [updated] =
      await sql`UPDATE ryanos_accounts SET save_data = ${JSON.stringify(snapshot)}::jsonb, revision = revision + 1, updated_at = now() WHERE id = ${account.id} AND revision = ${data.revision} RETURNING *`;
    if (!updated) {
      const [latest] =
        await sql`SELECT * FROM ryanos_accounts WHERE id = ${account.id}`;
      return json(
        {
          error:
            "Another device saved changes. Choose which copy to continue with.",
          account: record(latest),
        },
        409,
      );
    }
    return json({ account: record(updated) });
  } catch (error) {
    return failure(error);
  }
}
