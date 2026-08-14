import { checkRateLimit } from './src/lib/server/av-rate-limit'

async function audit() {
  const correlationId = 'audit-123'
  
  // Test Case: IPv4 Normalization
  console.log('--- IPv4 Normalization ---')
  const ipv4s = [' 127.0.0.1 ', '192.168.1.1', '256.256.256.256', '1.2.3', '1.2.3.4.5', '0.0.0.0']
  // Acessando via eval ou expondo a função internamente no helper para teste se necessário, 
  // mas aqui vamos testar o fluxo checkRateLimit com mocks de env.
  
  process.env['AV_RATE_LIMIT_MODE'] = 'global_only'
  process.env['AV_RATE_LIMIT_HASH_SECRET'] = 'test-secret'
  process.env['SUPABASE_URL'] = 'http://localhost:54321'
  process.env['SUPABASE_SERVICE_ROLE_KEY'] = 'test-key'
  
  const mockReq = new Request('http://localhost:8080', {
    headers: { 'CF-Connecting-IP': '127.0.0.1' }
  })
  
  try {
    // Como a RPC real não vai responder no sandbox sem Supabase real configurado para este teste, 
    // esperamos que caia no Fail-Open ou Fail-Closed dependendo do erro.
    const result = await checkRateLimit(mockReq, correlationId)
    console.log('Result (Expected Fail-Open since Supabase is not real here):', result)
  } catch (e) {
    console.log('Caught Error:', e.message)
  }
}

audit()
