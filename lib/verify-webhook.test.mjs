import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import { verifyWebhook } from "./verify-webhook.ts";

const rawKey = Buffer.from("test-secret");
const secret = `v1,whsec_${rawKey.toString("base64")}`;
const now = 1_800_000_000_000;
const timestamp = String(now / 1000);
const body = '{"a":1}';

function headers({ ts = timestamp, signedBody = body, key = rawKey } = {}) {
  const signature = createHmac("sha256", key).update(`id1.${ts}.${signedBody}`).digest("base64");
  return new Headers({ "webhook-id": "id1", "webhook-timestamp": ts, "webhook-signature": `v1,${signature}` });
}

test("accepts a valid signature", () => assert.equal(verifyWebhook(secret, headers(), body, now), true));
test("rejects a tampered body", () => assert.equal(verifyWebhook(secret, headers({ signedBody: "{}" }), body, now), false));
test("rejects the wrong key", () => assert.equal(verifyWebhook(secret, headers({ key: Buffer.from("x") }), body, now), false));
test("rejects an old timestamp", () => assert.equal(verifyWebhook(secret, headers({ ts: String(now / 1000 - 301) }), body, now), false));
test("rejects a non-numeric timestamp", () => assert.equal(verifyWebhook(secret, headers({ ts: "abc" }), body, now), false));
test("rejects missing headers", () => assert.equal(verifyWebhook(secret, new Headers(), body, now), false));
