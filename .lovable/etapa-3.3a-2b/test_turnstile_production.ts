import { verifyTurnstileToken } from "../../src/lib/server/av-turnstile";

async function testTUR23() {
  console.log("Testing TUR23 (Test mode in Production)...");
  
  const oldNodeEnv = process.env.NODE_ENV;
  const oldTestMode = process.env.TURNSTILE_TEST_MODE;
  
  process.env.NODE_ENV = "production";
  process.env.TURNSTILE_TEST_MODE = "true";
  
  const res23 = await verifyTurnstileToken("token", "secret", "corr-23");
  
  if (!res23.success && res23.error === "CONFIG_ERROR") {
    console.log("TUR23: PASS (Test mode in Production blocked)");
  } else {
    console.error("TUR23: FAIL", res23);
  }
  
  process.env.NODE_ENV = oldNodeEnv;
  process.env.TURNSTILE_TEST_MODE = oldTestMode;
}

testTUR23().catch(console.error);
