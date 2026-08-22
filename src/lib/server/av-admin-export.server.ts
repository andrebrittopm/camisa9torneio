import { Database } from "@/integrations/supabase/types";
import ExcelJS from 'exceljs';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const TARGET_EVENT_NUMBER = 9;
const TARGET_EVENT_YEAR = 2026;

/**
 * ABA 1: Produção
 * Ordem dos tamanhos para ordenação
 */
const SIZE_ORDER = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'XXG', 'CUSTOMIZADOS'];

function getSizeRank(size: string): number {
  const index = SIZE_ORDER.indexOf(size.toUpperCase());
  return index === -1 ? SIZE_ORDER.length : index;
}

/**
 * Proteção contra injeção de fórmulas CSV/Excel
 */
function sanitizeExcelValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  let str = String(value);
  
  // Remover/substituir caracteres de controle (0x00-0x1F)
  str = str.replace(/[\x00-\x1F\x7F]/g, '');
  
  const trimmed = str.trimStart();
  if (trimmed.startsWith('=') || trimmed.startsWith('+') || trimmed.startsWith('-') || trimmed.startsWith('@')) {
    return `'${str}`;
  }
  return str;
}

export async function generateProductionWorkbookInternal() {
  const supabaseUrl = process.env['SUPABASE_URL']!;
  const supabaseKey = process.env['SUPABASE_SERVICE_ROLE_KEY']!;
  const { createClient } = await import('@supabase/supabase-js');
  const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseKey);

  // 1. Localizar o evento atual
  const { data: event, error: eventError } = await supabaseAdmin
    .from('av_events')
    .select('id, event_year')
    .eq('event_number', TARGET_EVENT_NUMBER)
    .eq('event_year', TARGET_EVENT_YEAR)
    .eq('active', true)
    .single();

  if (eventError || !event) {
    throw new Error('EVENT_NOT_FOUND');
  }

  // 2. Consultar pedidos elegíveis
  // payment_status = 'payment_confirmed'
  // order_status != 'cancelled'
  const { data: orders, error: ordersError } = await supabaseAdmin
    .from('av_orders')
    .select(`
      id,
      order_seq,
      created_at,
      payment_status,
      order_status,
      av_order_items (
        model_name,
        shirt_type,
        size_option,
        custom_size,
        custom_name,
        custom_number,
        quantity
      )
    `)
    .eq('event_id', event.id)
    .eq('payment_status', 'payment_confirmed')
    .neq('order_status', 'cancelled');

  if (ordersError) {
    throw ordersError;
  }

  if (!orders || orders.length === 0) {
    return null;
  }

  // 3. Processar itens para a planilha
  const productionItems = orders.flatMap(order => {
    const items = (order.av_order_items as any[]) || [];
    const publicId = `AV-${event.event_year}-${order.order_seq.toString().padStart(4, '0')}`;
    
    const processedItems = items.map(item => {
      const qty = Number(item.quantity);
      if (!Number.isFinite(qty) || !Number.isInteger(qty) || qty <= 0) {
        throw new Error('INVALID_ITEM_QUANTITY');
      }

      const rawName = String(item.custom_name ?? '').trim();
      const rawNumber = String(item.custom_number ?? '').trim();
      const rawCustomSize = String(item.custom_size ?? '').trim();

      return {
        pedido: publicId,
        data: new Date(order.created_at),
        modelo: item.model_name,
        tipo: item.shirt_type,
        tamanho: item.size_option === 'custom' 
          ? (rawCustomSize || 'TAMANHO NÃO INFORMADO') 
          : item.size_option,
        nome: rawName || 'SEM NOME',
        numero: rawNumber || 'SEM NÚMERO',
        quantidade: qty,
        status: order.order_status,
        // Auxiliares para ordenação
        sizeRank: getSizeRank(item.size_option === 'custom' ? 'CUSTOMIZADOS' : item.size_option)
      };
    });

    return processedItems;
  });

  if (productionItems.length === 0) {
    return null;
  }

  // Ordenar Produção por: Tipo, Modelo, Tamanho (rank), Pedido
  productionItems.sort((a, b) => {
    if (a.tipo !== b.tipo) return a.tipo.localeCompare(b.tipo);
    if (a.modelo !== b.modelo) return a.modelo.localeCompare(b.modelo);
    if (a.sizeRank !== b.sizeRank) return a.sizeRank - b.sizeRank;
    return a.pedido.localeCompare(b.pedido);
  });

  // 4. Criar Workbook
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'TanStack Start Order Engine';
  workbook.lastModifiedBy = 'TanStack Start Order Engine';
  workbook.created = new Date();

  // --- ABA 1: Produção ---
  const prodSheet = workbook.addWorksheet('Produção');

  // Cabeçalhos
  prodSheet.columns = [
    { header: 'Pedido', key: 'pedido', width: 15 },
    { header: 'Data do pedido', key: 'data', width: 20 },
    { header: 'Modelo', key: 'modelo', width: 20 },
    { header: 'Tipo', key: 'tipo', width: 15 },
    { header: 'Tamanho', key: 'tamanho', width: 15 },
    { header: 'Nome', key: 'nome', width: 20 },
    { header: 'Número', key: 'numero', width: 15 },
    { header: 'Quantidade', key: 'quantidade', width: 12 },
    { header: 'Status', key: 'status', width: 20 },
  ];

  // Estilo do cabeçalho
  prodSheet.getRow(1).eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF000080' }, // Azul Escuro
    };
    cell.font = {
      color: { argb: 'FFFFFFFF' }, // Branco
      bold: true,
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  // Adicionar dados
  productionItems.forEach(item => {
    prodSheet.addRow({
      pedido: sanitizeExcelValue(item.pedido),
      data: item.data,
      modelo: sanitizeExcelValue(item.modelo),
      tipo: sanitizeExcelValue(item.tipo),
      tamanho: sanitizeExcelValue(item.tamanho),
      nome: sanitizeExcelValue(item.nome),
      numero: sanitizeExcelValue(item.numero),
      quantidade: item.quantidade,
      status: sanitizeExcelValue(item.status),
    });
  });

  // Formatação de data brasileira
  prodSheet.getColumn('data').numFmt = 'dd/mm/yyyy hh:mm';
  
  // Congelar primeira linha e autofiltro
  prodSheet.views = [{ state: 'frozen', ySplit: 1 }];
  prodSheet.autoFilter = 'A1:I1';

  // --- ABA 2: Resumo ---
  const summarySheet = workbook.addWorksheet('Resumo');

  summarySheet.columns = [
    { header: 'Modelo', key: 'modelo', width: 30 },
    { header: 'Tipo', key: 'tipo', width: 20 },
    { header: 'Tamanho', key: 'tamanho', width: 20 },
    { header: 'Total de peças', key: 'total', width: 20 },
  ];

  // Estilo do cabeçalho
  summarySheet.getRow(1).eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF000080' },
    };
    cell.font = {
      color: { argb: 'FFFFFFFF' },
      bold: true,
    };
  });

  // Agrupar dados
  const summaryMap = new Map<string, { modelo: string; tipo: string; tamanho: string; total: number; sizeRank: number }>();
  let totalGeral = 0;

  productionItems.forEach(item => {
    const key = `${item.modelo}|${item.tipo}|${item.tamanho}`;
    const existing = summaryMap.get(key) || { 
      modelo: item.modelo, 
      tipo: item.tipo, 
      tamanho: item.tamanho, 
      total: 0,
      sizeRank: item.sizeRank
    };
    existing.total += item.quantidade;
    totalGeral += item.quantidade;
    summaryMap.set(key, existing);
  });

  const summaryData = Array.from(summaryMap.values());
  // Mesma ordenação da aba principal
  summaryData.sort((a, b) => {
    if (a.tipo !== b.tipo) return a.tipo.localeCompare(b.tipo);
    if (a.modelo !== b.modelo) return a.modelo.localeCompare(b.modelo);
    return a.sizeRank - b.sizeRank;
  });

  summaryData.forEach(s => {
    summarySheet.addRow({
      modelo: sanitizeExcelValue(s.modelo),
      tipo: sanitizeExcelValue(s.tipo),
      tamanho: sanitizeExcelValue(s.tamanho),
      total: s.total,
    });
  });

  // Adicionar TOTAL GERAL
  summarySheet.addRow({});
  const totalRow = summarySheet.addRow({
    tamanho: 'TOTAL GERAL DE PEÇAS',
    total: totalGeral,
  });

  totalRow.getCell('tamanho').font = { bold: true };
  totalRow.getCell('tamanho').fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFFF00' }, // Destaque Amarelo
  };
  totalRow.getCell('total').font = { bold: true };

  summarySheet.views = [{ state: 'frozen', ySplit: 1 }];

  // Gerar Buffer
  const buffer = await workbook.xlsx.writeBuffer();
  
  return {
    fileName: `producao-camisas-9-torneio-${format(new Date(), 'yyyy-MM-dd')}.xlsx`,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    base64: Buffer.from(buffer).toString('base64')
  };
}
