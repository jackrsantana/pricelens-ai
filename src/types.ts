/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface City {
  id: string;
  name: string;
  state: string;
}

export interface Market {
  id: string;
  name: string;
  logoUrl?: string;
  address: string;
  cityId: string;

  // Basic info (optional)
  tradeName?: string;       // Nome fantasia
  companyName?: string;     // Razão social
  cnpj?: string;            // CNPJ
  phone?: string;           // Telefone
  whatsapp?: string;        // WhatsApp
  email?: string;           // E-mail
  website?: string;         // Site
  socialMedia?: string;     // Redes sociais

  // Location details (optional)
  neighborhood?: string;    // Bairro
  referencePoint?: string;  // Ponto de referência
  businessHours?: string;   // Horário de funcionamento
  mapLocation?: string;     // Localização no mapa

  // Commercial info (optional)
  marketType?: string;      // Tipo de mercado (supermercado, atacarejo, mercearia, hortifruti, outro)
  mainCategories?: string;  // Categorias principais
  differentials?: string;   // Diferenciais
  additionalInfo?: string;  // Informações adicionais

  // Internal control (optional)
  isActive?: boolean;       // Status ativo/inativo
  internalNotes?: string;   // Observações internas
  createdAt?: string;       // Data de cadastro
  createdBy?: string;       // Responsável pelo cadastro
}

export type FlyerStatus = 'pending_ocr' | 'processed' | 'error';

export interface Flyer {
  id: string;
  marketId: string;
  cityName: string;
  startDate: string; // ISO date
  endDate: string; // ISO date
  imageUrl: string; // base64 or placeholder URL
  numPages: number;
  observations?: string;
  status: FlyerStatus;
  createdAt: string;
  modelUsed?: string;
  processingTimestamp?: string;
  originalAiResponse?: string;
  linkOriginal?: string;
}

export interface BoundingBox {
  x: number;      // percent-based x coordinate (0 to 100)
  y: number;      // percent-based y coordinate (0 to 100)
  width: number;  // percent-based width (0 to 100)
  height: number; // percent-based height (0 to 100)
}

export interface OCRResult {
  text: string;
  price?: number;
  boundingBox: BoundingBox;
}

export type OfferStatus = 'valid' | 'review_pending' | 'reviewed';

export interface Offer {
  id: string;
  flyerId: string;
  pageNum: number;
  marketId: string;
  originalName: string;
  price: number;
  unit: string; // e.g. "kg", "un", "5kg", "l"
  confidence: number; // 0 to 100
  boundingBox: BoundingBox;
  productCanonicalId?: string;
  promotionType?: string; // "Normal", "Leve 3 Pague 2", "Clube Fidelidade", "Desconto"
  rules?: string;
  status: OfferStatus;
  previousPrice?: number;
  modelUsed?: string;
  processingTimestamp?: string;
  originalAiResponse?: string;
  croppedImageUrl?: string;
}

export interface CanonicalProduct {
  id: string;
  name: string;
  brand: string;
  category: string;
  weightVolume: string; // e.g. "5kg", "1L", "350ml"
  unit: string; // "kg", "un", "L", "ml"
}

export interface Category {
  id: string;
  name: string;
  icon: string; // lucide icon name
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  suggestions?: string[];
}
