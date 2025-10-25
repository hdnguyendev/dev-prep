import { createHash, randomBytes } from "crypto";

export function hashPassword(pw: string) {
  const salt = randomBytes(8).toString("hex");
  const hash = createHash("sha256").update(pw + salt).digest("hex");
  return `${salt}.${hash}`;
}

export function verifyPassword(pw: string, stored: string) {
  const [salt, hash] = stored.split(".");
  const now = createHash("sha256").update(pw + salt).digest("hex");
  return now === hash;
}
