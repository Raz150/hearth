import { createHmac, timingSafeEqual } from "node:crypto";

// Standard Webhooks signature, as sent by Supabase Auth hooks.
export function verifyWebhook(secret: string, headers: Headers, body: string, now = Date.now()) {
  const id = headers.get("webhook-id");
  const timestamp = headers.get("webhook-timestamp");
  const signatures = headers.get("webhook-signature");
  if (!id || !timestamp || !signatures) return false;
  if (!(Math.abs(now / 1000 - Number(timestamp)) <= 300)) return false;

  const key = Buffer.from(secret.replace(/^v1,whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest();

  return signatures.split(" ").some((entry) => {
    const [version, value] = entry.split(",");
    const actual = Buffer.from(value ?? "", "base64");
    return version === "v1" && actual.length === expected.length && timingSafeEqual(actual, expected);
  });
}
