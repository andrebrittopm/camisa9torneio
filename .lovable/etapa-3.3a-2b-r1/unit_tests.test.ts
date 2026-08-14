import { test, expect } from "vitest";
import { verifyTurnstileToken } from "../../src/lib/server/av-turnstile";

// Mock global fetch
const originalFetch = global.fetch;

test("TUR06 - success=false returns false", async () => {
  global.fetch = async () => new Response(JSON.stringify({ success: false, "error-codes": ["invalid-input-response"] }), { status: 200 });
  
  const result = await verifyTurnstileToken("dummy-token", "1x0000000000000000000000000000000AA", "test");
  expect(result).toEqual({ success: false, error: "TURNSTILE_FAILED" });
  
  global.fetch = originalFetch;
});

test("TUR12 - spent token returns false", async () => {
  global.fetch = async () => new Response(JSON.stringify({ success: false, "error-codes": ["timeout-or-duplicate"] }), { status: 200 });
  
  const result = await verifyTurnstileToken("dummy-token", "1x0000000000000000000000000000000AA", "test");
  expect(result).toEqual({ success: false, error: "TURNSTILE_FAILED" });
  
  global.fetch = originalFetch;
});

test("TUR21 - invalid body (malformed JSON) returns false", async () => {
  global.fetch = async () => new Response("not json", { status: 200 });
  
  const result = await verifyTurnstileToken("dummy-token", "1x0000000000000000000000000000000AA", "test");
  expect(result).toEqual({ success: false, error: "TURNSTILE_UNAVAILABLE" });
  
  global.fetch = originalFetch;
});

test("TUR08 - Action mismatch", async () => {
  global.fetch = async () => new Response(JSON.stringify({ success: true, action: "wrong_action", hostname: "localhost" }), { status: 200 });
  
  const result = await verifyTurnstileToken("dummy-token", "1x0000000000000000000000000000000AA", "test", ["localhost"], "correct_action");
  expect(result).toEqual({ success: false, error: "TURNSTILE_FAILED" });
  
  global.fetch = originalFetch;
});

test("TUR09 - Hostname mismatch", async () => {
  global.fetch = async () => new Response(JSON.stringify({ success: true, action: "test", hostname: "malicious.com" }), { status: 200 });
  
  const result = await verifyTurnstileToken("dummy-token", "1x0000000000000000000000000000000AA", "test", ["localhost"], "test");
  expect(result).toEqual({ success: false, error: "TURNSTILE_FAILED" });
  
  global.fetch = originalFetch;
});


