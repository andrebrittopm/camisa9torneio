import { verifyTurnstileToken } from '../../src/lib/server/av-turnstile';

async function runAudit() {
  console.log("INICIANDO AUDITORIA TÉCNICA TUR01-TUR25...");
  const results = [];
  const correlationId = "audit-" + Math.random().toString(36).substring(7);

  // TUR19: HTTP 500 no Siteverify
  console.log("TUR19: Testando HTTP 500 no Siteverify...");
  global.fetch = async () => ({
    ok: false,
    status: 500,
    text: async () => "Internal Server Error"
  });
  const res19 = await verifyTurnstileToken("token", "secret", correlationId);
  results.push({ id: "TUR19", result: (res19.success === false && res19.error === "TURNSTILE_UNAVAILABLE") ? "PASS" : "FAIL" });

  // TUR20: JSON Malformado
  console.log("TUR20: Testando JSON Malformado...");
  global.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => { throw new Error("JSON Error") }
  });
  const res20 = await verifyTurnstileToken("token", "secret", correlationId);
  results.push({ id: "TUR20", result: (res20.success === false && res20.error === "TURNSTILE_UNAVAILABLE") ? "PASS" : "FAIL" });

  // TUR21: Body Inválido
  global.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => null
  });
  const res21a = await verifyTurnstileToken("token", "secret", correlationId);
  global.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => []
  });
  const res21b = await verifyTurnstileToken("token", "secret", correlationId);
  results.push({ id: "TUR21", result: (res21a.success === false && res21b.success === false) ? "PASS" : "FAIL" });

  console.log(JSON.stringify(results, null, 2));
}
runAudit();
