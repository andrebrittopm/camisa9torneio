import { test, expect } from "vitest";
import { verifyTurnstileToken } from "../../src/lib/server/av-turnstile";

const DUMMY_SECRET = "1x0000000000000000000000000000000AA";
const originalFetch = global.fetch;
const originalEnv = { ...process.env };

test("TUR06 - success=false returns false", async () => {
  global.fetch = async () => new Response(JSON.stringify({ success: false, "error-codes": ["invalid-input-response"] }), { status: 200 });
  const result = await verifyTurnstileToken("dummy-token", DUMMY_SECRET, "test");
  expect(result).toEqual({ success: false, error: "TURNSTILE_FAILED" });
  global.fetch = originalFetch;
});

test("TUR08 - Action mismatch", async () => {
  global.fetch = async () => new Response(JSON.stringify({ success: true, action: "wrong", hostname: "localhost" }), { status: 200 });
  const result = await verifyTurnstileToken("dummy-token", DUMMY_SECRET, "test", ["localhost"], "correct");
  expect(result).toEqual({ success: false, error: "TURNSTILE_FAILED" });
  global.fetch = originalFetch;
});

test("TUR09 - Hostname mismatch", async () => {
  global.fetch = async () => new Response(JSON.stringify({ success: true, action: "test", hostname: "malicious.com" }), { status: 200 });
  const result = await verifyTurnstileToken("dummy-token", DUMMY_SECRET, "test", ["localhost"], "test");
  expect(result).toEqual({ success: false, error: "TURNSTILE_FAILED" });
  global.fetch = originalFetch;
});

test("TUR10 - Timeout 8s", async () => {
  global.fetch = async (url, init) => {
    return new Promise((_, reject) => {
        if (init?.signal) {
            init.signal.addEventListener('abort', () => {
                const err = new Error('aborted');
                err.name = 'AbortError';
                reject(err);
            });
        }
    });
  };
  const result = await verifyTurnstileToken("dummy-token", DUMMY_SECRET, "test");
  expect(result).toEqual({ success: false, error: "TURNSTILE_UNAVAILABLE" });
  global.fetch = originalFetch;
});

test("TUR12 - spent token returns false", async () => {
  global.fetch = async () => new Response(JSON.stringify({ success: false, "error-codes": ["timeout-or-duplicate"] }), { status: 200 });
  const result = await verifyTurnstileToken("dummy-token", DUMMY_SECRET, "test");
  expect(result).toEqual({ success: false, error: "TURNSTILE_FAILED" });
  global.fetch = originalFetch;
});

test("TUR21 - invalid body (malformed JSON) returns false", async () => {
  global.fetch = async () => new Response("not json", { status: 200 });
  const result = await verifyTurnstileToken("dummy-token", DUMMY_SECRET, "test");
  expect(result).toEqual({ success: false, error: "TURNSTILE_UNAVAILABLE" });
  global.fetch = originalFetch;
});

test("TUR23 - Test Mode em Prod bloqueado", async () => {
  process.env.NODE_ENV = "production";
  process.env.TURNSTILE_TEST_MODE = "true";
  const result = await verifyTurnstileToken("dummy-token", DUMMY_SECRET, "test");
  expect(result).toEqual({ success: false, error: "CONFIG_ERROR" });
  process.env = { ...originalEnv };
});
