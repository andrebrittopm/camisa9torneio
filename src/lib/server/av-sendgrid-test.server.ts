import { createClient } from '@supabase/supabase-js';
import { queueOrderEmail, sendOrderConfirmationEmail, sendReceiptConfirmationEmail } from './av-email.server';

/**
 * Script de Teste — ETAPA 7.3 — SENDGRID VALIDATION
 * Simula o fluxo de envio e falha para validar a implementação do SendGrid.
 */

async function testSendGridFlow() {
  const correlationId = `test-${crypto.randomUUID()}`;
  const testEmail = process.env['EMAIL_FROM']; // Usar o email verificado como destino de teste
  const orderId = '00000000-0000-0000-0000-000000000000'; // ID fake para teste
  const eventKey = `test-ev-${Date.now()}`;
  
  console.log(`[TEST] Iniciando bateria de testes SendGrid...`);
  console.log(`[TEST] correlation=${correlationId}`);
  console.log(`[TEST] target=${testEmail}`);

  if (!testEmail) {
    console.error(`[TEST] FAILED: EMAIL_FROM não configurado.`);
    return;
  }

  // 1. Teste de Fila (Outbox)
  console.log(`[TEST] 1. Testando queueOrderEmail...`);
  try {
    await queueOrderEmail(orderId, 'ORDER_CREATED', eventKey, testEmail);
    console.log(`[TEST] 1. PASS: Evento enfileirado.`);
  } catch (e: any) {
    console.error(`[TEST] 1. FAIL: ${e.message}`);
  }

  // 2. Teste de Envio Real (ou falha controlada se sem credenciais)
  console.log(`[TEST] 2. Testando sendOrderConfirmationEmail...`);
  try {
    const result = await sendOrderConfirmationEmail(
      testEmail,
      'André Teste',
      'AV-2026-TEST',
      '1x CAMISA OFICIAL - G',
      'http://localhost:8080/order/test',
      correlationId,
      orderId,
      eventKey
    );
    
    if (result.success) {
      console.log(`[TEST] 2. PASS: E-mail aceito pelo SendGrid. MessageID: ${result.message_id}`);
    } else {
      console.warn(`[TEST] 2. INFO: Envio não realizado. Motivo: ${result.error}`);
      if (result.error === 'SENDGRID_CREDENTIALS_REQUIRED') {
        console.log(`[TEST] 2. RESULT: ETAPA 7.3 — SENDGRID_CREDENTIALS_REQUIRED.`);
      }
    }
  } catch (e: any) {
    console.error(`[TEST] 2. FAIL: Erro fatal no teste: ${e.message}`);
  }

  // 3. Teste de Comprovante
  const receiptEventKey = `test-rec-${Date.now()}`;
  console.log(`[TEST] 3. Testando sendReceiptConfirmationEmail...`);
  try {
    const result = await sendReceiptConfirmationEmail(
      testEmail,
      'André Teste',
      'AV-2026-TEST',
      correlationId,
      orderId,
      receiptEventKey
    );
    
    if (result.success) {
      console.log(`[TEST] 3. PASS: E-mail de comprovante aceito.`);
    } else {
      console.warn(`[TEST] 3. INFO: Envio não realizado. Motivo: ${result.error}`);
    }
  } catch (e: any) {
    console.error(`[TEST] 3. FAIL: ${e.message}`);
  }
}

// Executar se chamado via command line (embora aqui seja via import/build)
// testSendGridFlow();
