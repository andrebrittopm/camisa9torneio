import { AvShirtModel } from "@/lib/av-catalog-client";

/**
 * Retorna o nome de exibição público do produto.
 * 
 * Regras P18-B2A:
 * 1. Se houver apenas um modelo ativo (cenário atual), mantém "CAMISA OFICIAL".
 * 2. Se houver múltiplos modelos ativos, distingue por "CAMISA OFICIAL — MANGA" ou "CAMISA OFICIAL — REGATA".
 */
export function getPublicProductDisplayName(model: AvShirtModel, allActiveModels: AvShirtModel[] = []) {
  const isMultiModel = allActiveModels.length > 1;

  if (!isMultiModel) {
    return "CAMISA OFICIAL";
  }

  const suffix = model.category === 'tank' ? 'REGATA' : 'MANGA';
  return `CAMISA OFICIAL — ${suffix}`;
}
