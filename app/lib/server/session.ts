import type { NextRequest } from "next/server";
import { database } from "./database";
import { tokenHash } from "./passwords";
export async function currentAccount(request: NextRequest) {
  const token = request.cookies.get("ryanos-session")?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const sql = await database();
  const [account] =
    await sql`SELECT a.* FROM ryanos_accounts a JOIN ryanos_sessions s ON s.account_id = a.id WHERE s.token_hash = ${tokenHash(token)} AND s.expires_at > now()`;
  return account ?? null;
}
export function isAdmin(username: string) {
  return (process.env.ADMIN_USERNAMES ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
    .includes(username.toLowerCase());
}
