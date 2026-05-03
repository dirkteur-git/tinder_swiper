import { createHmac, timingSafeEqual } from "node:crypto";

export function signPayload(payload: string, secret: string): string {
  return "sha256=" + createHmac("sha256", secret).update(payload).digest("hex");
}

export function verifySignature(
  payload: string,
  secret: string,
  signature: string
): boolean {
  const expected = signPayload(payload, secret);
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
