/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Offer, Flyer, CanonicalProduct, Market } from '../types';
import { PRODUCT_BASE_PRICES, formatDateToLocal } from '../data';
import { APP_CONFIG } from '../config/app';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { ShoppingBasket, Search, Plus, Minus, Trash2, TrendingUp, Info, HelpCircle, Store } from 'lucide-react';

interface Props {
  flyers: Flyer[];
  offers: Offer[];
  canonicalProducts: CanonicalProduct[];
  markets: Market[];
  isLoading?: boolean;
}

interface BasketItem {
  product: CanonicalProduct;
  quantity: number;
}

export default function DashboardBasket({ flyers, offers, canonicalProducts, markets, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium">Carregando comparador de cestas...</p>
      </div>
    );
  }

  if (canonicalProducts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <ShoppingBasket className="w-8 h-8 text-slate-300" />
        <p className="text-slate-500 font-medium">Nenhum produto disponível para montar cestas.</p>
      </div>
    );
  }
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [basketItems, setBasketItems] = useState<BasketItem[]>([]);

  // Initialize basket when canonical products are loaded
  useEffect(() => {
    if (canonicalProducts.length > 0 && basketItems.length === 0) {
      setBasketItems([
        { product: canonicalProducts.find(p => p.id === 'p-arroz-camil-5k') || canonicalProducts[0], quantity: 2 },
        { product: canonicalProducts.find(p => p.id === 'p-feijao-carioca-1k') || canonicalProducts[1] || canonicalProducts[0], quantity: 3 },
        { product: canonicalProducts.find(p => p.id === 'p-oleo-soja-900ml') || canonicalProducts[2] || canonicalProducts[0], quantity: 2 },
      ]);
    }
  }, [canonicalProducts]);

  // List of products available to add
  const filteredProducts = useMemo(() => {
    return canonicalProducts.filter(p => {
      const alreadyInBasket = basketItems.some(item => item.product.id === p.id);
      if (alreadyInBasket) return false;

      const query = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(query) ||
        p.brand.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query)
      );
    });
  }, [searchQuery, basketItems, canonicalProducts]);

  const addToBasket = (product: CanonicalProduct) => {
    setBasketItems(prev => [...prev, { product, quantity: 1 }]);
    setSearchQuery('');
  };

  const updateQuantity = (productId: string, change: number) => {
    setBasketItems(prev => {
      return prev.map(item => {
        if (item.product.id === productId) {
          const newQty = item.quantity + change;
          return { ...item, quantity: Math.max(1, newQty) };
        }
        return item;
      });
    });
  };

  const removeFromBasket = (productId: string) => {
    setBasketItems(prev => prev.filter(item => item.product.id !== productId));
  };

  // Get active flyer ID mappings
  const activeFlyers = useMemo(() => {
    const sorted = [...flyers].sort((a, b) => b.startDate.localeCompare(a.startDate));
    const latestWeeks = Array.from(new Set(sorted.map(f => f.startDate))).slice(0, 2);
    return flyers.filter(f => latestWeeks.includes(f.startDate));
  }, [flyers]);

  const activeFlyerIds = useMemo(() => activeFlyers.map(f => f.id), [activeFlyers]);

  // Compute total basket cost in each supermarket based on latest offers
  const marketBasketCosts = useMemo(() => {
    // Get latest offers in active flyers
    const activeOffers = offers.filter(o => activeFlyerIds.includes(o.flyerId));

    return markets.map(market => {
      let totalCost = 0;
      let itemsMatched = 0;

      basketItems.forEach(item => {
        // Find latest price of this product in this market
        const mOffer = activeOffers.find(o => o.marketId === market.id && o.productCanonicalId === item.product.id);
        
        if (mOffer) {
          totalCost += mOffer.price * item.quantity;
          itemsMatched++;
        } else {
          // Fallback to regional baseline
          const baseline = PRODUCT_BASE_PRICES[item.product.id] || 10.0;
          totalCost += baseline * item.quantity;
        }
      });

      return {
        ...market,
        totalCost: Math.round(totalCost * 100) / 100,
        completeness: Math.round((itemsMatched / Math.max(1, basketItems.length)) * 100)
      };
    }).sort((a, b) => a.totalCost - b.totalCost); // cheapest basket first
  }, [offers, activeFlyerIds, basketItems, markets]);

  // Compute weekly historical cost of this exact curated basket over the past 12-24 weeks
  const basketHistoryData = useMemo(() => {
    const weeks = Array.from(new Set(flyers.map(f => f.startDate))).sort();

    return weeks.map(weekDateStr => {
      const weekFlyerIds = flyers.filter(f => f.startDate === weekDateStr).map(f => f.id);
      const weekOffers = offers.filter(o => weekFlyerIds.includes(o.flyerId));

      let basketCost = 0;

      basketItems.forEach(item => {
        const itemOffers = weekOffers.filter(o => o.productCanonicalId === item.product.id);
        if (itemOffers.length > 0) {
          const avgPrice = itemOffers.reduce((sum, o) => sum + o.price, 0) / itemOffers.length;
          basketCost += avgPrice * item.quantity;
        } else {
          const fallbackPrice = PRODUCT_BASE_PRICES[item.product.id] || 10.0;
          basketCost += fallbackPrice * item.quantity;
        }
      });

      return {
        date: formatDateToLocal(weekDateStr),
        cost: Math.round(basketCost * 100) / 100
      };
    });
  }, [flyers, offers, basketItems]);

  const bestMarket = marketBasketCosts[0];
  const worstMarket = marketBasketCosts[marketBasketCosts.length - 1];
  const maxSavings = worstMarket ? Math.max(0, worstMarket.totalCost - bestMarket.totalCost) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-sans font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <ShoppingBasket className="w-8 h-8 text-indigo-600" /> Cesta Inteligente de Compras
        </h1>
        <p className="text-slate-500 mt-1">
          Monte sua lista personalizada de supermercado e o sistema calcula automaticamente onde comprá-la pelo menor preço com base em folhetos ativos.
        </p>
      </div>

      {/* Main Grid split: List builder vs Multi-store simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left column: List Builder (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800">Itens na sua Cesta</h3>

            {/* Live Search and Quick Add */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                type="text"
                placeholder="Pesquisar para adicionar produto à cesta..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 hover:bg-slate-100 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />

              {searchQuery.trim() && (
                <div className="absolute top-12 left-0 right-0 bg-white border border-slate-100 rounded-2xl shadow-xl z-20 max-h-56 overflow-y-auto p-2.5 space-y-1">
                  {filteredProducts.map(p => (
                    <button
                      key={p.id}
                      onClick={() => addToBasket(p)}
                      className="w-full text-left p-2.5 rounded-xl text-xs hover:bg-slate-50 flex items-center justify-between font-bold text-slate-700 cursor-pointer"
                    >
                      <div className="truncate pr-2">
                        <span className="block text-slate-800 font-bold">{p.name}</span>
                        <span className="block text-[10px] text-slate-400 font-medium mt-0.5">{p.brand} • {p.weightVolume}</span>
                      </div>
                      <Plus className="w-4 h-4 text-indigo-600 shrink-0" />
                    </button>
                  ))}
                  {filteredProducts.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-4">Nenhum produto correspondente disponível.</p>
                  )}
                </div>
              )}
            </div>

            {/* Curated Basket Items List */}
            <div className="divide-y divide-slate-100 max-h-[360px] overflow-y-auto pr-1">
              {basketItems.map(item => (
                <div key={item.product.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <span className="text-[9px] uppercase font-bold text-indigo-600">{item.product.category}</span>
                    <h4 className="text-xs font-bold text-slate-800 leading-tight mt-0.5">{item.product.name}</h4>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">{item.product.brand} • {item.product.weightVolume}</p>
                  </div>

                  {/* Quantities Controls */}
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => updateQuantity(item.product.id, -1)}
                      className="p-1 hover:bg-slate-100 border border-slate-200 rounded text-slate-500 cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-mono font-bold text-slate-800 min-w-4 text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.product.id, 1)}
                      className="p-1 hover:bg-slate-100 border border-slate-200 rounded text-slate-500 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    
                    <button
                      onClick={() => removeFromBasket(item.product.id)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700 rounded-lg cursor-pointer transition-colors ml-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {basketItems.length === 0 && (
                <div className="text-center py-12 text-slate-400 text-xs flex flex-col items-center gap-2">
                  <ShoppingBasket className="w-10 h-10 text-slate-200" />
                  Sua cesta inteligente está vazia. Adicione produtos acima para simular a economia!
                </div>
              )}
            </div>
          </div>

          {/* Historical price evolution of the basket */}
          {basketItems.length > 0 && (
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-indigo-500" /> Evolução Histórica do Custo da Cesta
              </h3>
              <p className="text-xs text-slate-400 mb-4">Custo total simulado deste grupo de itens ao longo dos últimos meses</p>
              
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={basketHistoryData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#64748b' }} />
                    <YAxis domain={['dataMin - 10', 'dataMax + 10']} tick={{ fontSize: 9, fill: '#64748b' }} />
                    <Tooltip
                      formatter={(value: any) => [`R$ ${value}`, 'Custo da Cesta']}
                      contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #f1f5f9' }}
                    />
                    <Area type="monotone" dataKey="cost" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCost)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* Right column: Multi-store simulator results (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-5">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Simulador Multiloja de Preços</h3>
              <p className="text-xs text-slate-400 mt-0.5">Onde comprar essa lista de compras hoje em {APP_CONFIG.defaultCity}</p>
            </div>

            {/* Simulated Savings Box */}
            {basketItems.length > 0 && maxSavings > 0 && (
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-950">
                <span className="text-[10px] font-bold uppercase tracking-wider block">Economia Potencial Máxima</span>
                <span className="text-2xl font-black block mt-1 text-emerald-800 font-sans">
                  R$ {maxSavings.toFixed(2)}
                </span>
                <p className="text-[10px] leading-relaxed text-emerald-700 font-semibold mt-1">
                  Diferença entre comprar toda a lista no local mais barato ({bestMarket.name}) versus o de maior preço registrado.
                </p>
              </div>
            )}

            {/* List of Supermarkets with Calculated Total Cost */}
            <div className="space-y-2.5">
              {marketBasketCosts.map((m, idx) => {
                const isBest = idx === 0 && basketItems.length > 0;
                return (
                  <div
                    key={m.id}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all ${
                      isBest
                        ? 'border-emerald-200 bg-emerald-50/20'
                        : 'border-slate-100 bg-slate-50/40'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <Store className={`w-4 h-4 ${isBest ? 'text-emerald-600' : 'text-slate-400'}`} />
                        <h4 className="text-xs font-bold text-slate-800 truncate">{m.name}</h4>
                      </div>
                      <span className="block text-[9px] font-bold text-slate-400 mt-1 uppercase">
                        Disponibilidade: {m.completeness}% das ofertas
                      </span>
                    </div>

                    <div className="text-right">
                      {basketItems.length > 0 ? (
                        <>
                          <span className={`text-sm font-extrabold block ${isBest ? 'text-emerald-700' : 'text-slate-800'}`}>
                            R$ {m.totalCost.toFixed(2)}
                          </span>
                          {isBest && (
                            <span className="text-[8px] bg-emerald-100 text-emerald-700 font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider block mt-1">
                              Melhor Opção 💎
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Cesta vazia</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Methodology clarification */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-2">
              <Info className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <p className="text-[10px] leading-relaxed text-slate-500">
                Os valores são baseados nos panfletos promocionais vigentes em {APP_CONFIG.defaultCityShort}. Quando um produto não consta nas ofertas ativas da loja, é utilizado o preço médio regional como aproximação.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
