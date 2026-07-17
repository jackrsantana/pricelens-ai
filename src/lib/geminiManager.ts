/**
 * Centralized Gemini AI Model Manager
 * Defines, lists, validates, and manages fallback of Gemini models.
 */

export interface GeminiModelInfo {
  id: string;          // Model identifier for the API, e.g. "gemini-3.5-flash"
  name: string;        // Human-friendly display name
  description: string; // Brief description of capabilities
  limitations: string; // Known limitations (speed, input types, etc.)
  recommendations: ('images' | 'ocr' | 'fast' | 'quality')[]; // Tags for recommended use-cases
  isFree: boolean;     // Whether the model is available on the free tier
}

// Global list of supported Gemini models
export const KNOWN_MODELS: GeminiModelInfo[] = [
  {
    id: 'gemini-3.5-flash',
    name: 'Gemini 3.5 Flash',
    description: 'Recomendado por padrão. Equilíbrio perfeito entre velocidade ultra-rápida, custo zero e qualidade excepcional.',
    limitations: 'Menor capacidade de raciocínio lógico em tópicos altamente acadêmicos ou complexos se comparado ao Pro.',
    recommendations: ['fast', 'images', 'ocr', 'quality'],
    isFree: true
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash Lite',
    description: 'O modelo mais leve e econômico, otimizado para baixíssima latência em tarefas simples.',
    limitations: 'Não suporta pensamento complexo (ThinkingLevel.HIGH) e pode ter menor precisão em OCRs de baixa qualidade.',
    recommendations: ['fast'],
    isFree: true
  },
  {
    id: 'gemini-flash-latest',
    name: 'Gemini Flash Latest',
    description: 'Aponta sempre para a versão estável mais recente do modelo Flash.',
    limitations: 'O comportamento pode mudar ligeiramente quando o Google atualizar o modelo estável padrão.',
    recommendations: ['fast', 'ocr'],
    isFree: true
  },
  {
    id: 'gemini-3.1-pro-preview',
    name: 'Gemini 3.1 Pro (Preview)',
    description: 'Modelo premium projetado para raciocínio analítico profundo, codificação avançada e resoluções complexas.',
    limitations: 'Requer faturamento ativado (conta paga/pro). Possui maior tempo de resposta (latência) que as versões Flash.',
    recommendations: ['quality'],
    isFree: false
  }
];

// Default model to fall back to if anything goes wrong
export const DEFAULT_FREE_MODEL = 'gemini-3.5-flash';

/**
 * Normalizes a model ID to remove any leading "models/" if present.
 */
export function normalizeModelId(id: string): string {
  if (!id) return DEFAULT_FREE_MODEL;
  return id.replace(/^models\//, '');
}

/**
 * Validates if a model ID is still supported and available.
 * If not, returns the best fallback model.
 */
export function getValidModelOrFallback(modelId: string, availableIds: string[]): { validModel: string; wasFallbackUsed: boolean; reason?: string } {
  const normalizedInput = normalizeModelId(modelId);
  const normalizedAvailable = availableIds.map(normalizeModelId);

  // If the list is empty (e.g. API list failed), validate against known static models
  if (normalizedAvailable.length === 0) {
    const isKnown = KNOWN_MODELS.some(m => m.id === normalizedInput);
    if (isKnown) {
      return { validModel: normalizedInput, wasFallbackUsed: false };
    }
    return {
      validModel: DEFAULT_FREE_MODEL,
      wasFallbackUsed: true,
      reason: `O modelo "${modelId}" não é conhecido pela aplicação. Utilizando fallback padrão.`
    };
  }

  // If selected model is in the available list, we are good
  if (normalizedAvailable.includes(normalizedInput)) {
    return { validModel: normalizedInput, wasFallbackUsed: false };
  }

  // Otherwise, select the first available free model, or default free model
  const firstAvailableFree = KNOWN_MODELS.find(m => m.isFree && normalizedAvailable.includes(m.id))?.id;
  const fallback = firstAvailableFree || normalizedAvailable[0] || DEFAULT_FREE_MODEL;

  return {
    validModel: fallback,
    wasFallbackUsed: true,
    reason: `O modelo selecionado "${modelId}" não está disponível ou foi desativado em sua API. Redirecionando para "${fallback}".`
  };
}

/**
 * Maps common raw API errors to user-friendly messages and actions.
 */
export interface GeminiErrorDetails {
  friendlyMessage: string;
  isQuotaExceeded: boolean;
  isKeyInvalid: boolean;
  isModelUnavailable: boolean;
  suggestedAction: string;
}

export function parseGeminiError(error: any, modelUsed: string): GeminiErrorDetails {
  const errMessage = error instanceof Error ? error.message : String(error);
  const errStatus = error?.status || 500;

  let friendlyMessage = 'Ocorreu um erro inesperado ao se conectar à inteligência artificial.';
  let isQuotaExceeded = false;
  let isKeyInvalid = false;
  let isModelUnavailable = false;
  let suggestedAction = 'Tente novamente em alguns instantes.';

  // 1. Quota / Rate limits
  if (
    errStatus === 429 ||
    errMessage.includes('429') ||
    errMessage.toLowerCase().includes('quota exceeded') ||
    errMessage.toLowerCase().includes('resource exhausted') ||
    errMessage.toLowerCase().includes('limit reached')
  ) {
    friendlyMessage = `Limite de requisições excedido para o modelo "${modelUsed}". A API gratuita do Gemini possui limites de chamadas por minuto/dia.`;
    isQuotaExceeded = true;
    suggestedAction = 'Aguarde de 1 a 2 minutos para que sua cota seja reestabelecida ou mude para outro modelo mais leve (como o Gemini 3.1 Flash Lite) nas configurações.';
  }
  // 2. API Key problems
  else if (
    errStatus === 403 ||
    errMessage.includes('403') ||
    errMessage.toLowerCase().includes('api_key_invalid') ||
    errMessage.toLowerCase().includes('invalid api key') ||
    errMessage.toLowerCase().includes('key not valid')
  ) {
    friendlyMessage = 'A chave de API do Gemini configurada é inválida ou não tem permissão para esta chamada.';
    isKeyInvalid = true;
    suggestedAction = 'Verifique se a chave de API está correta no painel de configurações (Settings > Secrets) da plataforma.';
  }
  // 3. Model not found or deprecated
  else if (
    errStatus === 404 ||
    errMessage.includes('404') ||
    errMessage.toLowerCase().includes('model not found') ||
    errMessage.toLowerCase().includes('not found') ||
    errMessage.toLowerCase().includes('deprecated')
  ) {
    friendlyMessage = `O modelo de IA "${modelUsed}" não foi encontrado ou não é mais suportado nesta conta/região.`;
    isModelUnavailable = true;
    suggestedAction = 'Por favor, vá em Configurações e selecione um modelo de IA atualizado que esteja disponível.';
  }
  // 4. Overloaded
  else if (errStatus === 503 || errMessage.includes('503') || errMessage.toLowerCase().includes('overloaded')) {
    friendlyMessage = 'Os servidores do Google Gemini estão temporariamente sobrecarregados sob alta demanda.';
    suggestedAction = 'Tente enviar novamente em instantes ou selecione um modelo diferente para processar a requisição.';
  }

  return {
    friendlyMessage,
    isQuotaExceeded,
    isKeyInvalid,
    isModelUnavailable,
    suggestedAction
  };
}
