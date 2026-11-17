"use client";
import { useEffect, useRef, useState } from "react";
import { reportDiagnostics } from "../lib/diagnostics";
import { downloadFile } from "../lib/files";
type Report = {
  id: string;
  username: string | null;
  category: string;
  message: string;
  contact: string | null;
  status: string;
  notification: string;
  created_at: string;
  diagnostics?: unknown;
};

export default function ReportsPanel({
  startOpen = false,
}: {
  startOpen?: boolean;
}) {
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("bug");
  const [contact, setContact] = useState("");
  const [includeDiagnostics, setIncludeDiagnostics] = useState(false);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const attempt = useRef<{ signature: string; id: string } | null>(null);
  async function refresh() {
    try {
      const response = await fetch("/api/reports", {
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      });
      const data = await response.json();
      if (response.ok) {
        setAdmin(Boolean(data.admin));
        setReports(data.reports ?? []);
      }
    } catch {
      /* The report form remains available when the inbox is offline. */
    }
  }
  useEffect(() => {
    // Load the server-owned report inbox after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, []);
  const payload = () => {
    const signature = JSON.stringify([
      category,
      message,
      contact,
      includeDiagnostics,
    ]);
    if (attempt.current?.signature !== signature)
      attempt.current = { signature, id: crypto.randomUUID() };
    return {
      requestId: attempt.current.id,
      category,
      message,
      contact,
      diagnostics: includeDiagnostics ? reportDiagnostics() : undefined,
    };
  };
  return (
    <section className="panel space-y-4" aria-label="Reports">
      <h2>Reports & suggestions</h2>
      <details open={startOpen}>
        <summary className="cursor-pointer font-bold">
          Report a problem or suggest a feature
        </summary>
        <form
          className="mt-4 space-y-3"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            try {
              const response = await fetch("/api/reports", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload()),
                signal: AbortSignal.timeout(15000),
              });
              const data = await response.json();
              if (!response.ok) throw Error(data.error);
              setStatus(
                `Report saved. Reference ${data.reference.slice(0, 8)}.`,
              );
              setMessage("");
              void refresh();
            } catch (error) {
              setStatus((error as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Category
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="bug">Something is broken</option>
              <option value="suggestion">Feature suggestion</option>
              <option value="data">Incorrect Pokémon or quest data</option>
              <option value="other">Other feedback</option>
            </select>
          </label>
          <label>
            What happened?
            <textarea
              minLength={10}
              maxLength={5000}
              required
              rows={5}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="What were you doing, what happened, and what did you expect?"
            />
          </label>
          <label>
            Reply email · optional
            <input
              type="email"
              value={contact}
              onChange={(event) => setContact(event.target.value)}
              maxLength={254}
            />
          </label>
          <label className="flex-row items-center">
            <input
              type="checkbox"
              checked={includeDiagnostics}
              onChange={(event) => setIncludeDiagnostics(event.target.checked)}
            />
            Include browser, app version, and recent error messages
          </label>
          <div className="flex flex-wrap gap-2">
            <button className="action" disabled={busy}>
              {busy ? "Sending…" : "Send report"}
            </button>
            <button
              type="button"
              className="action"
              onClick={() =>
                downloadFile(
                  "ryanos-report.json",
                  JSON.stringify(payload(), null, 2),
                  "application/json",
                )
              }
            >
              Download report
            </button>
          </div>
        </form>
      </details>
      {status && (
        <p className="notice" role="status">
          {status}
        </p>
      )}
      {admin && (
        <div className="space-y-3 border-t border-white/10 pt-4">
          <div className="section-heading">
            <h3 className="font-bold">Admin report inbox</h3>
            <button className="action" onClick={() => void refresh()}>
              Refresh
            </button>
          </div>
          {!reports.length && <p className="muted">No reports yet.</p>}
          {reports.map((report) => (
            <article className="report-card space-y-2" key={report.id}>
              <p className="font-bold">
                {report.category} · {report.username ?? "Guest"} ·{" "}
                {report.id.slice(0, 8)}
              </p>
              <p className="muted">
                {new Date(report.created_at).toLocaleString()} · Email{" "}
                {report.notification}
              </p>
              <p className="whitespace-pre-wrap text-sm">{report.message}</p>
              {Boolean(report.diagnostics) && (
                <details>
                  <summary className="cursor-pointer text-sm">
                    Attached diagnostics
                  </summary>
                  <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs">
                    {JSON.stringify(report.diagnostics, null, 2)}
                  </pre>
                </details>
              )}
              {report.contact && (
                <p className="text-sm">Reply contact · {report.contact}</p>
              )}
              <label>
                Status
                <select
                  value={report.status}
                  onChange={async (event) => {
                    try {
                      const response = await fetch("/api/reports", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          id: report.id,
                          status: event.target.value,
                        }),
                      });
                      if (!response.ok) throw Error("Could not update report.");
                      await refresh();
                    } catch (error) {
                      setStatus((error as Error).message);
                    }
                  }}
                >
                  <option value="open">Open</option>
                  <option value="triaged">Triaged</option>
                  <option value="resolved">Resolved</option>
                </select>
              </label>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
