export async function runAdminCommand(argument: string) {
  const [action = "help", id, ...extra] = argument
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (extra.length)
    throw Error("Use admin help for the available admin commands.");
  const response = await fetch("/api/reports", {
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  const data = await response.json();
  if (!response.ok)
    throw Error(data.error ?? "The admin service is unavailable.");
  if (!data.admin)
    throw Error(
      "Admin access required. Sign in with a username configured by the site owner.",
    );
  if (action === "help")
    return "Administration\nadmin reports              List recent issue reports\nadmin triage <report-id>   Mark a report as triaged\nadmin resolve <report-id>  Mark a report as resolved\nadmin reopen <report-id>   Reopen a report\n\nFull report details are available in footer Settings → Reports. Every admin request is authorized on the server.";
  if (action === "reports" && !id)
    return data.reports.length
      ? data.reports
          .slice(0, 20)
          .map(
            (report: {
              id: string;
              status: string;
              category: string;
              message: string;
            }) =>
              `${report.id}\n${report.status} · ${report.category} · ${report.message.slice(0, 180)}`,
          )
          .join("\n\n")
      : "No reports yet.";
  const statuses: Record<string, string> = {
    triage: "triaged",
    resolve: "resolved",
    reopen: "open",
  };
  const status = statuses[action];
  if (
    !status ||
    !id ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id)
  )
    throw Error(
      "Use admin reports to find a full report ID, then admin triage, resolve, or reopen <id>.",
    );
  const update = await fetch("/api/reports", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, status }),
    signal: AbortSignal.timeout(10000),
  });
  const result = await update.json();
  if (!update.ok)
    throw Error(result.error ?? "The report could not be updated.");
  return `Report ${id} marked ${status}.`;
}
