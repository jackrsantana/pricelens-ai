/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { City, Market, CanonicalProduct, Category, Flyer, Offer } from './types';

export const CITIES: City[] = [
  { id: 'sao-gotardo', name: 'São Gotardo', state: 'MG' }
];

export const MARKETS: Market[] = [
  { id: 'm-lopes', name: 'Supermercado Lopes', address: 'Av. Rui Barbosa, 345, Centro, São Gotardo - MG', cityId: 'sao-gotardo' },
  { id: 'm-abc', name: 'Sacolão e Supermercado ABC', address: 'Rua Bento de Sousa, 120, Centro, São Gotardo - MG', cityId: 'sao-gotardo' },
  { id: 'm-real', name: 'Supermercado Real', address: 'Av. Pio XII, 890, Alto da Colina, São Gotardo - MG', cityId: 'sao-gotardo' },
  { id: 'm-sao-gotardo', name: 'Supermercado São Gotardo', address: 'Rua Coronel Frederico, 14, Centro, São Gotardo - MG', cityId: 'sao-gotardo' },
  { id: 'm-martminas', name: 'Mart Minas Atacado', address: 'Rodovia MG-235, Km 82, São Gotardo - MG', cityId: 'sao-gotardo' }
];

export const CATEGORIES: Category[] = [
  { id: 'mercearia', name: 'Mercearia', icon: 'ShoppingBag' },
  { id: 'acougue', name: 'Açougue', icon: 'Beef' },
  { id: 'hortifruti', name: 'Hortifrúti', icon: 'Apple' },
  { id: 'bebidas', name: 'Bebidas', icon: 'CupSoda' },
  { id: 'limpeza', name: 'Limpeza', icon: 'Sparkles' },
  { id: 'higiene', name: 'Higiene', icon: 'Heart' }
];

export const CANONICAL_PRODUCTS: CanonicalProduct[] = [
  // Mercearia
  { id: 'p-arroz-camil-5k', name: 'Arroz Branco Camil Tipo 1', brand: 'Camil', category: 'mercearia', weightVolume: '5kg', unit: 'kg' },
  { id: 'p-arroz-tiojoao-5k', name: 'Arroz Branco Tio João Tipo 1', brand: 'Tio João', category: 'mercearia', weightVolume: '5kg', unit: 'kg' },
  { id: 'p-feijao-kicaldo-1k', name: 'Feijão Carioca Kicaldo Tipo 1', brand: 'Kicaldo', category: 'mercearia', weightVolume: '1kg', unit: 'kg' },
  { id: 'p-cafe-pilao-500g', name: 'Café Torrado e Moído Pilão', brand: 'Pilão', category: 'mercearia', weightVolume: '500g', unit: 'un' },
  { id: 'p-oleo-lisa-900', name: 'Óleo de Soja Lisa', brand: 'Lisa', category: 'mercearia', weightVolume: '900ml', unit: 'ml' },
  { id: 'p-acucar-uniao-1k', name: 'Açúcar Refinado União', brand: 'União', category: 'mercearia', weightVolume: '1kg', unit: 'kg' },
  { id: 'p-macarrao-galo-500g', name: 'Espaguete Sêmola Galo', brand: 'Galo', category: 'mercearia', weightVolume: '500g', unit: 'un' },

  // Açougue
  { id: 'p-contra-file-kg', name: 'Contra Filé Bovino Resfriado', brand: 'Frigotas', category: 'acougue', weightVolume: '1kg', unit: 'kg' },
  { id: 'p-coxa-sobrecoxa-kg', name: 'Coxa com Sobrecoxa de Frango', brand: 'Pif Paf', category: 'acougue', weightVolume: '1kg', unit: 'kg' },
  { id: 'p-acem-bovino-kg', name: 'Acém Bovino Sem Osso', brand: 'Frigotas', category: 'acougue', weightVolume: '1kg', unit: 'kg' },
  { id: 'p-pernil-suino-kg', name: 'Pernil Suíno com Couro', brand: 'Saudali', category: 'acougue', weightVolume: '1kg', unit: 'kg' },

  // Hortifruti
  { id: 'p-tomate-kg', name: 'Tomate Italiano Selecionado', brand: 'Produtor Regional', category: 'hortifruti', weightVolume: '1kg', unit: 'kg' },
  { id: 'p-batata-kg', name: 'Batata Monalisa Lavada', brand: 'Produtor Regional', category: 'hortifruti', weightVolume: '1kg', unit: 'kg' },
  { id: 'p-cebola-kg', name: 'Cebola Nacional', brand: 'Produtor Regional', category: 'hortifruti', weightVolume: '1kg', unit: 'kg' },
  { id: 'p-banana-prata-kg', name: 'Banana Prata de Minas', brand: 'Produtor Regional', category: 'hortifruti', weightVolume: '1kg', unit: 'kg' },

  // Bebidas
  { id: 'p-cocacola-2l', name: 'Refrigerante Coca-Cola Garrafa', brand: 'Coca-Cola', category: 'bebidas', weightVolume: '2L', unit: 'L' },
  { id: 'p-cerveja-skol-350', name: 'Cerveja Skol Lata', brand: 'Skol', category: 'bebidas', weightVolume: '350ml', unit: 'ml' },
  { id: 'p-suco-ades-1l', name: 'Suco de Soja AdeS Original', brand: 'AdeS', category: 'bebidas', weightVolume: '1L', unit: 'L' },

  // Limpeza
  { id: 'p-omo-lavagem-16', name: 'Sabão em Pó Omo Lavagem Perfeita', brand: 'Omo', category: 'limpeza', weightVolume: '1.6kg', unit: 'kg' },
  { id: 'p-detergente-ype-500', name: 'Detergente Líquido Ypê Neutro', brand: 'Ypê', category: 'limpeza', weightVolume: '500ml', unit: 'un' },

  // Higiene
  { id: 'p-shampoo-colgate-350', name: 'Shampoo Seda Ceramidas', brand: 'Seda', category: 'higiene', weightVolume: '325ml', unit: 'un' },
  { id: 'p-creme-dental-colgate', name: 'Creme Dental Colgate Tripla Ação', brand: 'Colgate', category: 'higiene', weightVolume: '90g', unit: 'un' }
];

// Helper to determine product typical baseline price
export const PRODUCT_BASE_PRICES: Record<string, number> = {
  'p-arroz-camil-5k': 26.90,
  'p-arroz-tiojoao-5k': 29.90,
  'p-feijao-kicaldo-1k': 7.80,
  'p-cafe-pilao-500g': 18.90,
  'p-oleo-lisa-900': 6.50,
  'p-acucar-uniao-1k': 4.20,
  'p-macarrao-galo-500g': 3.60,
  'p-contra-file-kg': 39.90,
  'p-coxa-sobrecoxa-kg': 8.90,
  'p-acem-bovino-kg': 26.90,
  'p-pernil-suino-kg': 15.90,
  'p-tomate-kg': 5.90,
  'p-batata-kg': 4.90,
  'p-cebola-kg': 4.50,
  'p-banana-prata-kg': 5.50,
  'p-cocacola-2l': 8.90,
  'p-cerveja-skol-350': 2.99,
  'p-suco-ades-1l': 7.20,
  'p-omo-lavagem-16': 18.90,
  'p-detergente-ype-500': 2.19,
  'p-shampoo-colgate-350': 9.80,
  'p-creme-dental-colgate': 3.49
};

// ----------------- Deterministic Statistics Algorithms -----------------

// 1. Inflação por categoria (compared to baseline or W=0)
export function calculateCategoryInflation(flyers: Flyer[], offers: Offer[], categoryId: string, daysBack: number = 30): { currentAvg: number, prevAvg: number, changePercent: number } {
  const now = new Date('2026-07-15T00:00:00Z');
  const boundaryDate = new Date(now.getTime() - daysBack * 24 * 3600 * 1000);
  const prevBoundaryDate = new Date(boundaryDate.getTime() - daysBack * 24 * 3600 * 1000);

  // Group offers by flyer date
  // Need mapping flyerId -> date
  const flyerMap = new Map<string, string>();
  flyers.forEach(f => flyerMap.set(f.id, f.startDate));

  // Find products in this category
  const catProds = CANONICAL_PRODUCTS.filter(p => p.category === categoryId).map(p => p.id);

  const currentPeriodPrices: number[] = [];
  const prevPeriodPrices: number[] = [];

  offers.forEach(o => {
    if (!o.productCanonicalId || !catProds.includes(o.productCanonicalId)) return;
    const dateStr = flyerMap.get(o.flyerId);
    if (!dateStr) return;
    const date = new Date(dateStr);

    if (date >= boundaryDate && date <= now) {
      currentPeriodPrices.push(o.price);
    } else if (date >= prevBoundaryDate && date < boundaryDate) {
      prevPeriodPrices.push(o.price);
    }
  });

  const currentAvg = currentPeriodPrices.length > 0 ? currentPeriodPrices.reduce((a, b) => a + b, 0) / currentPeriodPrices.length : 0;
  const prevAvg = prevPeriodPrices.length > 0 ? prevPeriodPrices.reduce((a, b) => a + b, 0) / prevPeriodPrices.length : 0;

  let changePercent = 0;
  if (prevAvg > 0) {
    changePercent = ((currentAvg - prevAvg) / prevAvg) * 100;
  }

  return {
    currentAvg: Math.round(currentAvg * 100) / 100,
    prevAvg: Math.round(prevAvg * 100) / 100,
    changePercent: Math.round(changePercent * 100) / 100
  };
}

// 2. Custo da Cesta Básica de São Gotardo - MG over time
// Let's define the monthly Cesta Básica weightings based on Brazilian DIEESE standards but simplified:
// - Arroz: 3 pacotes de 5kg (equivalent canonical: p-arroz-camil-5k) -> weight = 3
// - Feijão: 4 pacotes de 1kg (p-feijao-kicaldo-1k) -> weight = 4
// - Café: 2 pacotes de 500g (p-cafe-pilao-500g) -> weight = 2
// - Açúcar: 3 pacotes de 1kg (p-acucar-uniao-1k) -> weight = 3
// - Óleo: 4 garrafas de 900ml (p-oleo-lisa-900) -> weight = 4
// - Batata: 6kg (p-batata-kg) -> weight = 6
// - Tomate: 6kg (p-tomate-kg) -> weight = 6
// - Contra-Filé (representing Meat): 5kg (p-contra-file-kg) -> weight = 5
export const CESTA_BASICA_COMPOSITION = [
  { productId: 'p-arroz-camil-5k', weight: 3 },
  { productId: 'p-feijao-kicaldo-1k', weight: 4 },
  { productId: 'p-cafe-pilao-500g', weight: 2 },
  { productId: 'p-oleo-lisa-900', weight: 4 },
  { productId: 'p-acucar-uniao-1k', weight: 3 },
  { productId: 'p-batata-kg', weight: 6 },
  { productId: 'p-tomate-kg', weight: 6 },
  { productId: 'p-contra-file-kg', weight: 5 }
];

export function calculateBasketHistory(flyers: Flyer[], offers: Offer[]): { date: string; cost: number }[] {
  // We want to calculate the cost of the basket for each week
  // For each week, find the average price of each product, then multiply by its weight, then sum.
  // Group flyers by startDate
  const weeks = Array.from(new Set(flyers.map(f => f.startDate))).sort();
  const basketHistory: { date: string; cost: number }[] = [];

  weeks.forEach(weekDateStr => {
    // Flyers in this week
    const weekFlyerIds = flyers.filter(f => f.startDate === weekDateStr).map(f => f.id);
    if (weekFlyerIds.length === 0) return;

    const weekOffers = offers.filter(o => weekFlyerIds.includes(o.flyerId));

    let basketCost = 0;
    let itemsFound = 0;

    CESTA_BASICA_COMPOSITION.forEach(item => {
      const itemOffers = weekOffers.filter(o => o.productCanonicalId === item.productId);
      if (itemOffers.length > 0) {
        const avgPrice = itemOffers.reduce((sum, o) => sum + o.price, 0) / itemOffers.length;
        basketCost += avgPrice * item.weight;
        itemsFound++;
      } else {
        // Fallback to baseline price
        const fallbackPrice = PRODUCT_BASE_PRICES[item.productId] || 10.0;
        basketCost += fallbackPrice * item.weight;
      }
    });

    basketHistory.push({
      date: formatDateToLocal(weekDateStr),
      cost: Math.round(basketCost * 100) / 100
    });
  });

  return basketHistory;
}

// 3. Supermarket Competitiveness Ranking
export function calculateMarketRanking(flyers: Flyer[], offers: Offer[]): { id: string; name: string; flyerCount: number; offerCount: number; averagePriceIndex: number; estimatedSavings: number }[] {
  // To evaluate competitiveness objectively without just summing raw prices (as some sell meat which is expensive, some sell cheaper items):
  // We calculate a relative "Price Index" for each market.
  // For each offer of a canonical product in a flyer:
  // compare the market's price with the average price of that same canonical product in the exact same week.
  // Then average these relative ratios across all offers for that market.
  // Relative ratio = price / weekly_average_of_product

  // Group flyers by week to map flyerId -> weekStartDate
  const flyerMap = new Map<string, { marketId: string; startDate: string }>();
  flyers.forEach(f => flyerMap.set(f.id, { marketId: f.marketId, startDate: f.startDate }));

  // Group offers by week and product to compute averages
  const weeklyProductPrices = new Map<string, number[]>(); // key: week_productId -> price[]

  offers.forEach(o => {
    if (!o.productCanonicalId) return;
    const flyerMeta = flyerMap.get(o.flyerId);
    if (!flyerMeta) return;

    const key = `${flyerMeta.startDate}_${o.productCanonicalId}`;
    if (!weeklyProductPrices.has(key)) {
      weeklyProductPrices.set(key, []);
    }
    weeklyProductPrices.get(key)!.push(o.price);
  });

  // Calculate the weekly average for each product
  const weeklyProductAverages = new Map<string, number>();
  weeklyProductPrices.forEach((prices, key) => {
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    weeklyProductAverages.set(key, avg);
  });

  // Now, calculate relative index for each market
  const marketRatios: Record<string, number[]> = {};
  const marketOfferCounts: Record<string, number> = {};
  const marketFlyerCounts: Record<string, Set<string>> = {};

  MARKETS.forEach(m => {
    marketRatios[m.id] = [];
    marketOfferCounts[m.id] = 0;
    marketFlyerCounts[m.id] = new Set<string>();
  });

  offers.forEach(o => {
    if (!o.productCanonicalId) return;
    const flyerMeta = flyerMap.get(o.flyerId);
    if (!flyerMeta) return;

    const key = `${flyerMeta.startDate}_${o.productCanonicalId}`;
    const avg = weeklyProductAverages.get(key);
    
    if (avg && avg > 0) {
      const ratio = o.price / avg;
      if (marketRatios[flyerMeta.marketId]) {
        marketRatios[flyerMeta.marketId].push(ratio);
        marketOfferCounts[flyerMeta.marketId]++;
        marketFlyerCounts[flyerMeta.marketId].add(o.flyerId);
      }
    }
  });

  return MARKETS.map(m => {
    const ratios = marketRatios[m.id] || [];
    const avgIndex = ratios.length > 0 ? ratios.reduce((a, b) => a + b, 0) / ratios.length : 1.0;
    
    // Estimated average savings: how much cheaper is it compared to the regional average
    // if averagePriceIndex is 0.92, savings is approx 8%. On a 500 reais monthly checkout, that's ~40 reais.
    const savingsPercent = Math.max(0, (1 - avgIndex) * 100);
    const estimatedSavings = Math.round(savingsPercent * 5); // scale to typical basket purchase

    return {
      id: m.id,
      name: m.name,
      flyerCount: marketFlyerCounts[m.id]?.size || 0,
      offerCount: marketOfferCounts[m.id] || 0,
      averagePriceIndex: Math.round(avgIndex * 100) / 100, // 0.92 means 8% below average
      estimatedSavings: Math.round(estimatedSavings * 100) / 100
    };
  }).sort((a, b) => a.averagePriceIndex - b.averagePriceIndex); // cheaper first
}

// 4. Product Price History analysis
export function getProductPriceHistory(flyers: Flyer[], offers: Offer[], productId: string): { date: string; marketName: string; price: number }[] {
  const flyerMap = new Map<string, { marketId: string; startDate: string }>();
  flyers.forEach(f => flyerMap.set(f.id, { marketId: f.marketId, startDate: f.startDate }));

  const marketMap = new Map<string, string>();
  MARKETS.forEach(m => marketMap.set(m.id, m.name));

  return offers
    .filter(o => o.productCanonicalId === productId)
    .map(o => {
      const fMeta = flyerMap.get(o.flyerId);
      return {
        date: fMeta?.startDate || '',
        marketName: marketMap.get(o.marketId) || 'Supermercado',
        price: o.price
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function formatDateToLocal(isoString: string): string {
  if (!isoString) return '';
  const parts = isoString.split('-');
  if (parts.length < 3) return isoString;
  return `${parts[2]}/${parts[1]}/${parts[0].slice(2)}`;
}
