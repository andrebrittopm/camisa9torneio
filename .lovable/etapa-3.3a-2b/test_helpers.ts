import { verifyTurnstileToken } from "../../src/lib/server/av-turnstile";
import { assert } from "console";

async function runTests() {
  console.log("Running Unit Tests for av-turnstile helper...");

  // Mock global fetch
  const originalFetch = global.fetch;

  // TUR10: Timeout (8s)
  console.log("Testing TUR10 (Timeout)...");
  global.fetch = () => new Promise((resolve) => {
    // Simula delay longo, o AbortController deve disparar
    setTimeout(() => resolve(new Response()), 15000);
  });

  const res10 = await verifyTurnstileToken("token", "secret", "corr-10");
  if (!res10.success && res10.error === "TURNSTILE_UNAVAILABLE") {
    console.log("TUR10: PASS (Timeout handled)");
  } else {
    console.error("TUR10: FAIL", res10);
  }

  // TUR11: Resposta JSON Inválida
  console.log("Testing TUR11 (Invalid JSON)...");
  global.fetch = async () => new Response("not-a-json", { status: 200 });
  const res11 = await verifyTurnstileToken("token", "secret", "corr-11");
  if (!res11.success && res11.error === "TURNSTILE_UNAVAILABLE") {
    console.log("TUR11: PASS (Invalid JSON handled)");
  } else {
    console.error("TUR11: FAIL", res11);
  }

  // TUR08: Action Mismatch
  console.log("Testing TUR08 (Action Mismatch)...");
  global.fetch = async () => new Response(JSON.stringify({
    success: true,
    action: "wrong_action",
    hostname: "localhost"
  }), { status: 200 });
  const res08 = await verifyTurnstileToken("token", "secret", "corr-08", ["localhost"], "test");
  if (!res08.success && res08.error === "TURNSTILE_FAILED") {
    console.log("TUR08: PASS (Action Mismatch handled)");
  } else {
    console.error("TUR08: FAIL", res08);
  }

  // TUR09: Hostname Mismatch
  console.log("Testing TUR09 (Hostname Mismatch)...");
  global.fetch = async () => new Response(JSON.stringify({
    success: true,
    action: "test",
    hostname: "evil.example"
  }), { status: 200 });
  const res09 = await verifyTurnstileToken("token", "secret", "corr-09", ["localhost"], "test");
  if (!res09.success && res09.error === "TURNSTILE_FAILED") {
    console.log("TUR09: PASS (Hostname Mismatch handled)");
  } else {
    console.error("TUR09: FAIL", res09);
  }

  // TUR22: Produção sem Hostname
  console.log("Testing TUR22 (Production without hostname)...");
  const oldNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  const res22 = await verifyTurnstileToken("token", "secret", "corr-22", []);
  if (!res22.success && res22.error === "CONFIG_MISSING") {
    console.log("TUR22: PASS (Production without hostname handled)");
  } else {
    console.error("TUR22: FAIL", res22);
  }
  process.env.NODE_ENV = oldNodeEnv;

  // Restaura fetch
  global.fetch = originalFetch;
}

runTests().catch(console.error);
