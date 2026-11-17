import { database, databaseConfigured } from "../../lib/server/database";
export const dynamic = "force-dynamic";
export async function GET() {
  let status = "not configured";
  if (databaseConfigured()) {
    try {
      const sql = await database();
      await sql`SELECT 1`;
      status = "connected";
    } catch {
      status = "unavailable";
    }
  }
  return Response.json(
    { app: "online", database: status },
    {
      status: status === "unavailable" ? 503 : 200,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
