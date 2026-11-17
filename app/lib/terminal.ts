export function calculate(expression: string): number {
  const tokens =
    expression.match(/(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?|[()+*/%\-]/gi) ??
    [];
  if (
    tokens.join("").toLowerCase() !==
      expression.replace(/\s/g, "").toLowerCase() ||
    !tokens.length ||
    tokens.length > 200
  )
    throw Error(
      "Enter an arithmetic expression using numbers, parentheses, + - * / %.",
    );
  let index = 0;
  function factor(): number {
    const token = tokens[index++];
    if (token === "+") return factor();
    if (token === "-") return -factor();
    if (token === "(") {
      const value = sum();
      if (tokens[index++] !== ")") throw Error("Check your parentheses.");
      return value;
    }
    if (!token || !/^[\d.]/.test(token)) throw Error("Expected a number.");
    return Number(token);
  }
  function product(): number {
    let value = factor();
    while (["*", "/", "%"].includes(tokens[index])) {
      const operator = tokens[index++];
      const right = factor();
      if ((operator === "/" || operator === "%") && right === 0)
        throw Error("Division by zero.");
      value =
        operator === "*"
          ? value * right
          : operator === "/"
            ? value / right
            : value % right;
    }
    return value;
  }
  function sum(): number {
    let value = product();
    while (["+", "-"].includes(tokens[index])) {
      const operator = tokens[index++];
      const right = product();
      value = operator === "+" ? value + right : value - right;
    }
    return value;
  }
  const result = sum();
  if (index !== tokens.length || !Number.isFinite(result))
    throw Error("Check your expression.");
  return result;
}

const dayMilliseconds = 86_400_000;

function calendarDate(text: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) throw Error("Use a date in YYYY-MM-DD format.");
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(0, 0, 0, 0);
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    throw Error("That calendar date does not exist.");
  return date;
}

function localDateKey(now: Date) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function countDays(argument: string, now = new Date()) {
  const dates = argument.match(/\d{4}-\d{2}-\d{2}/g) ?? [];
  if (
    !dates.length ||
    dates.length > 2 ||
    !/^(?:(?:until|since)\s+)?\d{4}-\d{2}-\d{2}$|^(?:between\s+)?\d{4}-\d{2}-\d{2}\s+(?:and\s+)?\d{4}-\d{2}-\d{2}$/i.test(
      argument,
    )
  )
    throw Error(
      "Try days 2026-12-25, days since 2026-01-01, or days 2026-01-01 2026-12-25.",
    );
  const today = localDateKey(now);
  const first = dates[0];
  if (!first) throw Error("Enter a date in YYYY-MM-DD format.");
  const second = dates[1];
  const start = second || /^since\s/i.test(argument) ? first : today;
  const end = second ?? (/^since\s/i.test(argument) ? today : first);
  const days = Math.round(
    (calendarDate(end).getTime() - calendarDate(start).getTime()) /
      dayMilliseconds,
  );
  return `${days} calendar day${Math.abs(days) === 1 ? "" : "s"} from ${start} to ${end}.\nStart date excluded; end date included. Today uses this device’s local date.`;
}

export function addDays(argument: string, now = new Date()) {
  const match = /^([+-]?\d+)\s*(\d{4}-\d{2}-\d{2})?$/.exec(argument);
  if (!match || Math.abs(Number(match[1])) > 365_000)
    throw Error("Try dateadd 30 or dateadd -7 2026-12-25 (up to 365000 days).");
  const start = match[2] ?? localDateKey(now);
  const result = calendarDate(start);
  result.setUTCDate(result.getUTCDate() + Number(match[1]));
  if (result.getUTCFullYear() < 0 || result.getUTCFullYear() > 9999)
    throw Error("Result must be within years 0000–9999.");
  return `${start} ${Number(match[1]) >= 0 ? "+" : "−"} ${Math.abs(Number(match[1]))} days = ${result.toISOString().slice(0, 10)}`;
}

const zoneAliases: Record<string, string> = {
  pt: "America/Los_Angeles",
  pacific: "America/Los_Angeles",
  et: "America/New_York",
  eastern: "America/New_York",
  ct: "America/Chicago",
  central: "America/Chicago",
  mt: "America/Denver",
  mountain: "America/Denver",
  utc: "UTC",
  gmt: "UTC",
  london: "Europe/London",
  tokyo: "Asia/Tokyo",
  sydney: "Australia/Sydney",
};

function timezone(value: string) {
  const zone = zoneAliases[value.toLowerCase()] ?? value;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone }).format();
  } catch {
    throw Error(
      `Unknown time zone: ${value}. Use zones for shortcuts or an IANA name such as America/Los_Angeles.`,
    );
  }
  return zone;
}

function wallTime(instant: Date, zone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const part = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

function resolveWallTime(date: string, time: string, zone: string) {
  const midnight = calendarDate(date);
  const [hour, minute] = time.split(":").map(Number);
  if (hour > 23 || minute > 59)
    throw Error("Use a 24-hour time between 00:00 and 23:59.");
  const desired = midnight.getTime() + hour * 3_600_000 + minute * 60_000;
  const offsets = new Set<number>();
  // Probe both sides of timezone transitions, including half-hour changes.
  for (let hours = -36; hours <= 36; hours += 6) {
    const probe = new Date(desired + hours * 3_600_000);
    const wall = wallTime(probe, zone);
    offsets.add(Date.parse(`${wall}Z`) - probe.getTime());
  }
  const candidates = [...offsets]
    .map((offset) => new Date(desired - offset))
    .filter((instant) => wallTime(instant, zone) === `${date}T${time}`);
  if (!candidates.length)
    throw Error(
      "That local time does not exist because the clock moves forward. Choose another time.",
    );
  if (candidates.length > 1)
    throw Error(
      "That local time occurs twice when the clock moves back. Specify an ISO timestamp with its offset, for example tz 2026-11-01T01:30-07:00 to ET.",
    );
  return candidates[0];
}

export function convertTimezone(argument: string, now = new Date()) {
  const format = (date: Date, zone: string) =>
    `${wallTime(date, zone).replace("T", " ")} ${new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "shortOffset" }).formatToParts(date).find((p) => p.type === "timeZoneName")?.value} (${zone})`;
  const current = /^now\s+(?:in\s+)?(\S+)$/i.exec(argument);
  if (current) return format(now, timezone(current[1]));
  const wall =
    /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})\s+(\S+)\s+to\s+(\S+)$/i.exec(
      argument,
    );
  if (wall) {
    const from = timezone(wall[3]);
    const instant = resolveWallTime(wall[1], wall[2], from);
    return `${format(instant, from)}\n= ${format(instant, timezone(wall[4]))}`;
  }
  const iso =
    /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2}))\s+to\s+(\S+)$/i.exec(
      argument,
    );
  if (iso) {
    calendarDate(iso[1].slice(0, 10));
    const instant = new Date(iso[1]);
    if (
      !Number.isFinite(instant.getTime()) ||
      Number(iso[1].slice(11, 13)) > 23 ||
      Number(iso[1].slice(14, 16)) > 59
    )
      throw Error("Invalid timestamp.");
    return `${iso[1]}\n= ${format(instant, timezone(iso[2]))}`;
  }
  throw Error(
    "Try tz now Tokyo or tz 2026-12-25 18:00 PT to ET. Use IANA zones for other locations. Daylight saving is handled for the specified date.",
  );
}

export function listZones(now = new Date()) {
  return ["PT", "MT", "CT", "ET", "UTC", "London", "Tokyo", "Sydney"]
    .map(
      (alias) => `${alias.padEnd(8)} ${convertTimezone(`now ${alias}`, now)}`,
    )
    .join("\n");
}

const units: Record<string, { category: string; scale: number }> = {
  km: { category: "length", scale: 1000 },
  m: { category: "length", scale: 1 },
  cm: { category: "length", scale: 0.01 },
  mi: { category: "length", scale: 1609.344 },
  ft: { category: "length", scale: 0.3048 },
  in: { category: "length", scale: 0.0254 },
  kg: { category: "mass", scale: 1000 },
  g: { category: "mass", scale: 1 },
  lb: { category: "mass", scale: 453.59237 },
  oz: { category: "mass", scale: 28.349523125 },
  sec: { category: "time", scale: 1 },
  min: { category: "time", scale: 60 },
  hr: { category: "time", scale: 3600 },
  day: { category: "time", scale: 86400 },
};
export function convertUnits(argument: string) {
  const match = /^(-?(?:\d+(?:\.\d*)?|\.\d+))\s*(\w+)\s+to\s+(\w+)$/i.exec(
    argument,
  );
  if (!match)
    throw Error(
      "Try convert 10 km to mi or convert 72 f to c. Units: km m cm mi ft in, kg g lb oz, sec min hr day, c f k.",
    );
  const value = Number(match[1]);
  const from = match[2].toLowerCase();
  const to = match[3].toLowerCase();
  let result: number;
  if (["c", "f", "k"].includes(from) && ["c", "f", "k"].includes(to)) {
    const celsius =
      from === "f"
        ? ((value - 32) * 5) / 9
        : from === "k"
          ? value - 273.15
          : value;
    if (celsius < -273.15) throw Error("Temperature is below absolute zero.");
    result =
      to === "f"
        ? (celsius * 9) / 5 + 32
        : to === "k"
          ? celsius + 273.15
          : celsius;
  } else {
    if (
      !units[from] ||
      !units[to] ||
      units[from].category !== units[to].category
    )
      throw Error(
        "Choose compatible units. Use convert with no arguments to see supported units.",
      );
    result = (value * units[from].scale) / units[to].scale;
  }
  if (!Number.isFinite(result)) throw Error("The value is too large.");
  return `${value} ${from} = ${Number(result.toPrecision(10))} ${to}`;
}
