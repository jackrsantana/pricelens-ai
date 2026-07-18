export interface GeminiModelInfo {
  id: string;
  name: string;
  description: string;
  limitations: string;
  recommendations: ('images' | 'ocr' | 'fast' | 'quality')[];
  isFree: boolean;
}

export const KNOWN_MODELS: GeminiModelInfo[] = [
  {
    id: 'gemini-3.5-flash',
    name: 'Gemini 3.5 Flash',
    description: 'Recomendado por padrão. Equilíbrio perfeito.',
    limitations: '',
    recommendations: ['fast', 'images', 'ocr', 'quality'],
    isFree: true
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash Lite',
    description: 'Leve e economico',
    limitations: '',
    recommendations: ['fast'],
    isFree: true
  },
  {
    id: 'gemini-flash-latest',
    name: 'Gemini Flash Latest',
    description: 'Latest',
    limitations: '',
    recommendations: ['fast', 'ocr'],
    isFree: true
  },
  {
    id: 'gemini-3.1-pro-preview',
    name: 'Gemini 3.1 Pro (Preview)',
    description: 'Premium',
    limitations: '',
    recommendations: ['quality'],
    isFree: false
  }
];

export const DEFAULT_FREE_MODEL = 'gemini-3.5-flash';

export function normalizeModelId(id: string): string {
  if (!id) return DEFAULT_FREE_MODEL;
  return id.replace(/^models\//, '');
}

export function getValidModelOrFallback(modelId: string, availableIds: string[]): { validModel: string; wasFallbackUsed: boolean; reason?: string } {
  const normalizedInput = normalizeModelId(modelId);
  const normalizedAvailable = availableIds.map(normalizeModelId);
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
  if (normalizedAvailable.includes(normalizedInput)) {
    return { validModel: normalizedInput, wasFallbackUsed: false };
  }
  const firstAvailableFree = KNOWN_MODELS.find(m => m.isFree && normalizedAvailable.includes(m.id))?.id;
  const fallback = firstAvailableFree || normalizedAvailable[0] || DEFAULT_FREE_MODEL;
  return {
    validModel: fallback,
    wasFallbackUsed: true,
    reason: `O modelo selecionado "${modelId}" não está disponível.`
  };
}

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
  let friendlyMessage = 'Ocorreu um erro inesperado.';
  let isQuotaExceeded = false;
  let isKeyInvalid = false;
  let isModelUnavailable = false;
  let suggestedAction = 'Tente novamente.';
  
  if (errStatus === 429 || errMessage.includes('429')) {
    friendlyMessage = `Limite de requisições excedido.`;
    isQuotaExceeded = true;
  } else if (errStatus === 403 || errMessage.includes('403')) {
    friendlyMessage = 'Chave inválida.';
    isKeyInvalid = true;
  } else if (errStatus === 404 || errMessage.includes('404')) {
    friendlyMessage = `Modelo não encontrado.`;
    isModelUnavailable = true;
  }
  
  return { friendlyMessage, isQuotaExceeded, isKeyInvalid, isModelUnavailable, suggestedAction };
}
