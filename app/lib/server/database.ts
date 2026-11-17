import { neon } from "@neondatabase/serverless";

export const databaseConfigured = () => Boolean(process.env.DATABASE_URL);
let initialization: Promise<unknown> | undefined;

export async function database() {
  if (!process.env.DATABASE_URL) throw Error("DATABASE_URL is not configured.");
  const sql = neon(process.env.DATABASE_URL);
  if (!initialization) {
    initialization = sql
      .transaction([
        sql`CREATE TABLE IF NOT EXISTS ryanos_accounts (
        id uuid PRIMARY KEY,
        username text NOT NULL UNIQUE CHECK (username = lower(username) AND username ~ '^[a-z0-9_]{3,24}$'),
        password_hash text NOT NULL,
        save_data jsonb NOT NULL,
        revision integer NOT NULL DEFAULT 1,
        updated_at timestamptz NOT NULL DEFAULT now()
      )`,
        sql`CREATE TABLE IF NOT EXISTS ryanos_sessions (
        token_hash text PRIMARY KEY,
        account_id uuid NOT NULL REFERENCES ryanos_accounts(id) ON DELETE CASCADE,
        expires_at timestamptz NOT NULL
      )`,
        sql`CREATE INDEX IF NOT EXISTS ryanos_sessions_expiry ON ryanos_sessions (expires_at)`,
        sql`CREATE TABLE IF NOT EXISTS ryanos_auth_attempts (
        key text PRIMARY KEY,
        attempts integer NOT NULL,
        started_at timestamptz NOT NULL DEFAULT now()
      )`,
      ])
      .catch((error) => {
        initialization = undefined;
        throw error;
      });
  }
  await initialization;
  return sql;
}
