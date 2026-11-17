"use client";

import { useEffect, useRef, useState } from "react";
import {
  APP_VERSION,
  doctor,
  recentErrors,
  storageSummary,
} from "../lib/diagnostics";
import {
  addDays,
  calculate,
  convertTimezone,
  convertUnits,
  countDays,
  listZones,
} from "../lib/terminal";

export default function TerminalPanel({
  runAppCommand,
}: {
  runAppCommand: (command: string, argument: string) => string;
}) {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState([
    {
      command: "",
      result: "RyanOS terminal ready. Type help for available commands.",
    },
  ]);
  const [history, setHistory] = useState<string[]>([]);
  const [cursor, setCursor] = useState(0);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [busy, setBusy] = useState(false);
  const log = useRef<HTMLDivElement>(null);
  useEffect(() => {
    log.current?.scrollTo({
      top: log.current.scrollHeight,
      behavior: "smooth",
    });
  }, [output]);
  useEffect(() => {
    if (!deadline) return;
    const timer = window.setInterval(() => {
      const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(seconds);
      if (!seconds) {
        setDeadline(null);
        setOutput((o) => [
          ...o,
          { command: "", result: "Focus timer complete. Take a break." },
        ]);
      }
    }, 250);
    return () => clearInterval(timer);
  }, [deadline]);
  async function execute(line: string) {
    const trimmed = line.trim();
    if (!trimmed || busy) return;
    setInput("");
    setHistory((h) => [...h, trimmed]);
    setCursor(history.length + 1);
    const command = trimmed.split(/\s/, 1)[0].toLowerCase();
    const argument = trimmed.slice(command.length).trim();
    if (command === "clear") {
      setOutput([]);
      return;
    }
    setBusy(true);
    let result = "";
    try {
      switch (command) {
        case "help":
          result = `help                    Show commands
quests                  List numbered daily and weekly quests
done <number>           Complete a quest
undo <number>           Undo completion and XP
reroll <number>         Reroll an incomplete daily quest
focus <name>            Select weekly focus
stats                   Show level, XP, and streaks
open quests|trainer|visualizer|terminal
backup                  Download progress and teams
calc <expression>       Calculate arithmetic
days <date>             Calendar days until YYYY-MM-DD
days since <date>       Calendar days since a date
days <date> <date>      Days between two dates
dateadd <days> [date]   Add days to today or YYYY-MM-DD
tz now <zone>          Current time in a time zone
tz <date> <time> <from> to <to>
zones                   Time zone shortcuts and current times
convert <value> <unit> to <unit>
uuid                    Generate a UUID
encode <text>           UTF-8 text to Base64
decode <base64>         Base64 to UTF-8 text
hash <text>             SHA-256 hash
timer <minutes>|stop    Start or stop a focus timer
date                    Current local date and time
clear                   Clear terminal output

Examples
days 2026-12-25
dateadd -7 2026-12-25
tz 2026-12-25 18:00 PT to ET
tz now Tokyo
convert 10 km to mi
convert 72 f to c

Use Up / Down arrows for command history.`;
          result +=
            "\n\nRecovery\ndoctor       Check device saves, storage, and server\nlogs         Recent app errors\nstorage      Device save sizes\nversion      App version\nsafe         Stop visual effects and open the terminal\nsync         Retry account sync\nrepair       Validate and refresh readable saved data\nreload       Reload RyanOS\nreport       Open the report form\nopen settings\n\nMore command ideas: countdowns, saved notes, reminders, dice rolls, and a searchable command palette.\nIf the page is fully frozen, reopen /?safe=1.";
          break;
        case "doctor":
          result = await doctor();
          break;
        case "logs":
          result =
            recentErrors()
              .map((entry) => `${entry.time} ${entry.message}`)
              .join("\n") || "No errors recorded in this session.";
          break;
        case "storage":
          result = storageSummary();
          break;
        case "version":
          result = `RyanOS ${APP_VERSION}`;
          break;
        case "calc":
          result = String(calculate(argument));
          break;
        case "days":
          result = countDays(argument);
          break;
        case "dateadd":
          result = addDays(argument);
          break;
        case "tz":
          result = convertTimezone(argument);
          break;
        case "zones":
          result = listZones();
          break;
        case "convert":
          result = convertUnits(argument);
          break;
        case "uuid":
          result = crypto.randomUUID();
          break;
        case "date":
          result = new Date().toLocaleString();
          break;
        case "encode":
          result = btoa(
            Array.from(new TextEncoder().encode(argument), (b) =>
              String.fromCharCode(b),
            ).join(""),
          );
          break;
        case "decode":
          result = new TextDecoder("utf-8", { fatal: true }).decode(
            Uint8Array.from(atob(argument), (c) => c.charCodeAt(0)),
          );
          break;
        case "hash":
          result = Array.from(
            new Uint8Array(
              await crypto.subtle.digest(
                "SHA-256",
                new TextEncoder().encode(argument),
              ),
            ),
            (b) => b.toString(16).padStart(2, "0"),
          ).join("");
          break;
        case "timer": {
          if (argument === "stop") {
            setDeadline(null);
            setRemaining(0);
            result = "Timer stopped.";
            break;
          }
          const minutes = Number(argument);
          if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 180)
            throw Error("Choose a duration between 0 and 180 minutes.");
          setDeadline(Date.now() + minutes * 60000);
          setRemaining(Math.ceil(minutes * 60));
          result = `Focus timer started for ${minutes} minutes. Keep RyanOS open.`;
          break;
        }
        default:
          result = runAppCommand(command, argument);
      }
    } catch (error) {
      result = `Error: ${(error as Error).message}`;
    }
    setOutput((o) => [...o, { command: trimmed, result }].slice(-100));
    setBusy(false);
  }
  return (
    <section className="panel space-y-4 font-mono">
      <div className="section-heading">
        <div>
          <h2>Terminal</h2>
          <p className="muted">Quest controls, utilities, and a focus timer.</p>
        </div>
        <span className="text-xs text-emerald-300">ONLINE</span>
      </div>
      {deadline && (
        <p className="notice" role="timer">
          Focus · {Math.floor(remaining / 60)}:
          {String(remaining % 60).padStart(2, "0")}{" "}
          <button
            onClick={() => {
              setDeadline(null);
              setRemaining(0);
            }}
          >
            Stop timer
          </button>
        </p>
      )}
      <div
        ref={log}
        role="log"
        aria-live="polite"
        aria-label="Terminal output"
        className="h-96 space-y-4 overflow-y-auto rounded-xl bg-black/60 p-4 text-sm text-emerald-200"
      >
        {output.map((entry, index) => (
          <div key={index}>
            {entry.command && (
              <p className="mb-1 break-words text-zinc-400">
                &gt; {entry.command}
              </p>
            )}
            <pre className="whitespace-pre-wrap break-words font-inherit">
              {entry.result}
            </pre>
          </div>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void execute(input);
        }}
        className="flex items-end gap-2"
      >
        <label className="flex-1">
          Command
          <input
            autoComplete="off"
            spellCheck={false}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="help"
            onKeyDown={(e) => {
              if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                e.preventDefault();
                const next = Math.max(
                  0,
                  Math.min(
                    history.length,
                    cursor + (e.key === "ArrowUp" ? -1 : 1),
                  ),
                );
                setCursor(next);
                setInput(history[next] ?? "");
              }
            }}
          />
        </label>
        <button className="action" disabled={busy}>
          Run
        </button>
      </form>
      <div className="flex flex-wrap gap-2">
        {[
          "help",
          "doctor",
          "safe",
          "report",
          "stats",
          "days 2026-12-25",
          "tz now Tokyo",
          "zones",
          "convert 72 f to c",
          "timer 25",
          "backup",
        ].map((command) => (
          <button
            className="tab"
            key={command}
            disabled={busy}
            onClick={() => void execute(command)}
          >
            {command}
          </button>
        ))}
      </div>
    </section>
  );
}
