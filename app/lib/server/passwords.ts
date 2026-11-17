import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";

export function normalizeUsername(value: unknown) {
  if (typeof value !== "string") throw Error("Enter a username.");
  const username = value.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,24}$/.test(username))
    throw Error("Use 3–24 letters, numbers, or underscores for your username.");
  return username;
}

function derivePassword(password: string, salt: string) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(
      password,
      salt,
      64,
      { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 },
      (error, key) => (error ? reject(error) : resolve(key)),
    );
  });
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = await derivePassword(password, salt);
  return `scrypt$${salt}$${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [algorithm, salt, hash] = stored.split("$");
  if (
    algorithm !== "scrypt" ||
    !/^[a-f0-9]{32}$/.test(salt ?? "") ||
    !/^[a-f0-9]{128}$/.test(hash ?? "")
  )
    return false;
  return timingSafeEqual(
    await derivePassword(password, salt),
    Buffer.from(hash, "hex"),
  );
}

export const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
