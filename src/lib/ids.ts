import { randomBytes } from "node:crypto";

const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"; // unambiguous lowercase
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // unambiguous uppercase

function randomString(length: number, alphabet: string) {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

/** URL-safe id for trips, options, places… */
export function newId(prefix = ""): string {
  return prefix + randomString(10, ALPHABET);
}

/** 6-char invite code, e.g. "K7QM2P". */
export function newInviteCode(): string {
  return randomString(6, CODE_ALPHABET);
}

/** Secret token for the organizer link. */
export function newAdminToken(): string {
  return randomBytes(24).toString("base64url");
}
