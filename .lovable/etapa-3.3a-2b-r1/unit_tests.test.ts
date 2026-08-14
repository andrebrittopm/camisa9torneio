import { test, expect } from "vitest";
import { verifyTurnstileToken } from "../../src/lib/server/av-turnstile";

// Mock global fetch
const originalFetch = global.fetch;

test("TUR06 - success=false returns false", async () => {
  global.fetch = async () => new Response(JSON.stringify({ success: false, "error-codes": ["invalid-input-response"] }), { status: 200 });
  
  process.env.TURNSTILE_SECRET_KEY = "1x0000000000000000000000000000000AA";
  process.env.TURNSTILE_TEST_MODE = "true";
  
  const result = await verifyTurnstileToken("dummy-token", "127.0.0.1", "test");
  expect(result).toBe(false);
  
  global.fetch = originalFetch;
});

test("TUR12 - spent token returns false", async () => {
  global.fetch = async () => new Response(JSON.stringify({ success: false, "error-codes": ["timeout-or-duplicate"] }), { status: 200 });
  
  process.env.TURNSTILE_SECRET_KEY = "1x0000000000000000000000000000000AA";
  process.env.TURNSTILE_TEST_MODE = "true";
  
  const result = await verifyTurnstileToken("dummy-token", "127.0.0.1", "test");
  expect(result).toBe(false);
  
  global.fetch = originalFetch;
});

test("TUR21 - invalid body (malformed JSON) returns false", async () => {
  global.fetch = async () => new Response("not json", { status: 200 });
  
  process.env.TURNSTILE_SECRET_KEY = "1x0000000000000000000000000000000AA";
  process.env.TURNSTILE_TEST_MODE = "true";
  
  const result = await verifyTurnstileToken("dummy-token", "127.0.0.1", "test");
  expect(result).toBe(false);
  
  global.fetch = originalFetch;
});
