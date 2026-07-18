/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */


import React, { useState, useMemo, memo } from 'react';
import { } from 'motion/react';
import { Offer, Flyer, Market, CanonicalProduct, Category } from '../types';
import { calculateMarketRanking, formatDateToLocal } from '../data';
import { APP_CONFIG } from '../config/app';
import { Store, TrendingUp, Eye, Scale, } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import FlyerOriginModal from './FlyerOriginModal';

interface Props {
  flyers: Flyer[];
  offers: Offer[];
  markets: Market[];
  canonicalProducts: CanonicalProduct[];
  categories: Category[];
  isLoading?: boolean;
}

function DashboardMarkets({ flyers, offers, markets, canonicalProducts, categories, isLoading }: Props) {
  const [selectedMarketId, setSelectedMarketId] = useState<string>('m-lopes');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedOfferForModal, setSelectedOfferForModal] = useState<Offer | null>(null);

  // Calculate market rankings using traditional deterministic relative price index algorithms
  const marketRankings = useMemo(() => {
    return calculateMarketRanking(flyers, offers, markets);
  }, [flyers, offers, markets]);

  const selectedRanking = useMemo(() => {
    return marketRankings.find(r => r.id === selectedMarketId) || marketRankings[0];
  }, [marketRankings, selectedMarketId]);

  const selectedMarket = useMemo(() => {
    return markets.find(m => m.id === selectedMarketId) || markets[0];
  }, [selectedMarketId, markets]);

  // Active offers of this market
  const activeOffers = useMemo(() => {
    const activeFlyerIds = flyers.filter(f => f.marketId === selectedMarketId).map(f => f.id);
    const mOffers = offers.filter(o => activeFlyerIds.includes(o.flyerId));

    // Map canonical products
    const prodMap = new Map();
    canonicalProducts.forEach(p => prodMap.set(p.id, p));

    return mOffers.map(o => {
      const prod = o.productCanonicalId ? prodMap.get(o.productCanonicalId) : null;
      return {
        ...o,
        canonicalName: prod ? prod.name : 'Outro / Não Normalizado',
        category: prod ? prod.category : 'mercearia',
        brand: prod ? prod.brand : 'Genérica'
      };
    }).filter(o => categoryFilter === 'all' || o.category === categoryFilter);
  }, [flyers, offers, selectedMarketId, categoryFilter, canonicalProducts]);

  // Compute category competitiveness stats for the selected market
  // Category Index = (Market's avg price in category / City's avg price in category) * 100
  const categoryStats = useMemo(() => {
    const prodMap = new Map<string, string>();
    canonicalProducts.forEach(p => prodMap.set(p.id, p.category));

    return categories.map(cat => {
      const cityOffers = offers.filter(o => o.productCanonicalId && prodMap.get(o.productCanonicalId) === cat.id);
      const marketOffers = cityOffers.filter(o => o.marketId === selectedMarketId);

      const cityAvg = cityOffers.length > 0 ? cityOffers.reduce((sum, o) => sum + o.price, 0) / cityOffers.length : 1.0;
      const marketAvg = marketOffers.length > 0 ? marketOffers.reduce((sum, o) => sum + o.price, 0) / marketOffers.length : null;

      const index = marketAvg && cityAvg > 0 ? (marketAvg / cityAvg) * 100 : null;

      return {
        ...cat,
        avgPrice: marketAvg,
        priceIndex: index,
        offerCount: marketOffers.length
      };
    });
  }, [offers, selectedMarketId, canonicalProducts, categories]);

  // Compute simulated historical Price Index evolution for this market over the weeks
  const marketHistoryData = useMemo(() => {
    const weeks = Array.from(new Set(flyers.map(f => f.startDate))).sort();
    
    // Group flyers by week to map flyerId -> weekStartDate
    const flyerMap = new Map<string, string>();
    flyers.forEach(f => flyerMap.set(f.id, f.startDate));

    return weeks.map(weekStart => {
      const weekFlyerIds = flyers.filter(f => f.startDate === weekStart).map(f => f.id);
      const weekOffers = offers.filter(o => o.productCanonicalId && weekFlyerIds.includes(o.flyerId));

      // Calculate weekly averages for all products
      const prodAverages = new Map<string, number>();
      const prodCounts = new Map<string, number>();
      weekOffers.forEach(o => {
        prodAverages.set(o.productCanonicalId!, (prodAverages.get(o.productCanonicalId!) || 0) + o.price);
        prodCounts.set(o.productCanonicalId!, (prodCounts.get(o.productCanonicalId!) || 0) + 1);
      });

      // Filter to this market
      const marketWeekOffers = weekOffers.filter(o => o.marketId === selectedMarketId);
      
      let totalRatios = 0;
      let ratioCount = 0;

      marketWeekOffers.forEach(o => {
        const sum = prodAverages.get(o.productCanonicalId!);
        const count = prodCounts.get(o.productCanonicalId!);
        if (sum && count) {
          const avg = sum / count;
          if (avg > 0) {
            totalRatios += o.price / avg;
            ratioCount++;
          }
        }
      });

      const indexValue = ratioCount > 0 ? (totalRatios / ratioCount) * 100 : 100;

      return {
        date: formatDateToLocal(weekStart),
        indice: Math.round(indexValue * 10) / 10
      };
    });
  }, [flyers, offers, selectedMarketId]);

  const handleOpenModal = (offer: Offer) => {
    setSelectedOfferForModal(offer);
    setIsModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium">Carregando dados do mercado...</p>
      </div>
    );
  }

  if (markets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <Store className="w-8 h-8 text-slate-300" />
        <p className="text-slate-500 font-medium">Nenhum mercado disponível para análise.</p>
      </div>
    );
  }

  if (!selectedMarket || !selectedRanking) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <Store className="w-8 h-8 text-slate-300" />
        <p className="text-slate-500 font-medium">Mercado selecionado não encontrado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-sans font-bold tracking-tight text-slate-900">
          Observatório de Estabelecimentos
        </h1>
        <p className="text-slate-500 mt-1">
          Análise de desempenho imparcial por estabelecimento baseada em dados reais de panfletos em {APP_CONFIG.defaultCity}
        </p>
      </div>

      {/* Selector bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Store className="w-5 h-5 text-indigo-500" /> Selecionar Estabelecimento
        </h3>
        
        <select
          value={selectedMarketId}
          onChange={(e) => setSelectedMarketId(e.target.value)}
          className="w-full sm:w-64 text-sm px-4 py-2.5 bg-slate-50 border-none rounded-xl outline-none text-slate-700 font-bold"
        >
          {markets.map(m => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </div>

      {/* Grid: Selected Market detailed insights */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Market Overview Specs (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-5">
            <div>
              <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                Cadastro de {APP_CONFIG.defaultCity}
              </span>
              <h2 className="text-xl font-bold text-slate-800 mt-2">{selectedMarket.name}</h2>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">{selectedMarket.address}</p>
            </div>

            {/* Price Index and Savings metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                <span className="text-[9px] text-slate-400 font-bold block uppercase leading-none">Índice de Preço</span>
                <span className="text-2xl font-black text-indigo-600 block mt-2">
                  {(selectedRanking.averagePriceIndex * 100).toFixed(0)}%
                </span>
                <span className="text-[9px] text-slate-400 mt-1 block">
                  {selectedRanking.averagePriceIndex < 1.0 ? 'Mais barato que a média' : 'Dentro da média regional'}
                </span>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                <span className="text-[9px] text-slate-400 font-bold block uppercase leading-none">Economia Estimada</span>
                <span className="text-2xl font-black text-emerald-600 block mt-2">
                  R$ {selectedRanking.estimatedSavings.toFixed(2)}
                </span>
                <span className="text-[9px] text-slate-400 mt-1 block">
                  Em compras básicas mensais
                </span>
              </div>
            </div>

            {/* Additional parameters */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-400">Ofertas Processadas:</span>
                <span className="text-slate-700">{selectedRanking.offerCount}</span>
              </div>
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-400">Folhetos no Semestre:</span>
                <span className="text-slate-700">{selectedRanking.flyerCount}</span>
              </div>
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-400">Pilar Competitivo:</span>
                <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                  {selectedMarket.id === 'm-abc' && '🍓 Hortifrúti e Feira'}
                  {selectedMarket.id === 'm-real' && '🥩 Açougue Preço Baixo'}
                  {selectedMarket.id === 'm-lopes' && '📦 Mercearia em Oferta'}
                  {selectedMarket.id === 'm-martminas' && '📦 Atacarejo Geral'}
                  {selectedMarket.id === 'm-sao-gotardo' && '🏪 Conveniência Local'}
                </span>
              </div>
            </div>
          </div>

          {/* Competitiveness Index Evolution Chart */}
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-1 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-indigo-500" /> Série de Competitividade
            </h3>
            <p className="text-xs text-slate-400 mb-4">Evolução temporal do índice de preços da loja (média da cidade = 100%)</p>
            
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={marketHistoryData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#64748b' }} />
                  <YAxis domain={['dataMin - 5', 'dataMax + 5']} tick={{ fontSize: 9, fill: '#64748b' }} />
                  <Tooltip
                    formatter={(value: any) => [`${value}%`, 'Índice de Preço']}
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #f1f5f9' }}
                  />
                  <Line type="monotone" dataKey="indice" stroke="#6366f1" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Detailed stats & active offers (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Category-specific Price Indexes for the market */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-1 flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-indigo-500" /> Desempenho por Seções de Alimentos
            </h3>
            <p className="text-xs text-slate-400 mb-4">Competitividade relativa de preços por categoria (valores menores indicam maior desconto)</p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {categoryStats.map(cat => {
                const isCompetitive = cat.priceIndex && cat.priceIndex < 100;
                

  return (
                  <div key={cat.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">{cat.name}</span>
                      <span className="text-xs text-slate-400 block mt-1 font-semibold">{cat.offerCount} ofertas</span>
                    </div>

                    <div className="mt-3">
                      {cat.priceIndex ? (
                        <span className={`text-sm font-black px-2 py-0.5 rounded-lg inline-block border ${
                          isCompetitive 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          {cat.priceIndex.toFixed(0)}%
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic font-bold">Sem dados</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Offers from printed leaflet */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Ofertas Ativas no Panfleto</h3>
                <p className="text-xs text-slate-400 mt-0.5">Catálogo promocional em vigor esta semana</p>
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-xs px-2.5 py-1.5 bg-slate-50 border-none rounded-xl outline-none text-slate-700 font-bold w-full sm:w-36"
              >
                <option value="all">Todas as Seções</option>
                <option value="mercearia">Mercearia</option>
                <option value="acougue">Açougue</option>
                <option value="hortifruti">Hortifrúti</option>
                <option value="bebidas">Bebidas</option>
                <option value="limpeza">Limpeza</option>
                <option value="higiene">Higiene</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-4 py-2.5 font-bold text-slate-500">Produto</th>
                    <th className="px-4 py-2.5 font-bold text-slate-500 text-right">Valor Promocional</th>
                    <th className="px-4 py-2.5 font-bold text-slate-500 text-right">Origem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeOffers.map(o => (
                    <tr key={o.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-bold text-slate-800 block">{o.canonicalName}</span>
                        <span className="text-[10px] text-slate-400 block font-medium mt-0.5">Marca: {o.brand} • {o.unit}</span>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <span className="text-xs font-mono font-bold text-slate-800 block">R$ {o.price.toFixed(2)}</span>
                        {o.proType !== 'Normal' && (
                          <span className="text-[8px] font-extrabold text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded inline-block mt-0.5">
                            {o.proType}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleOpenModal(o)}
                          className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg hover:text-indigo-800 transition-colors cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {activeOffers.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                        Nenhuma oferta promocional em vigor esta semana para os filtros selecionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>

      {/* Reuse modal */}
      <FlyerOriginModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        offer={selectedOfferForModal}
        flyers={flyers}
      />
    </div>
  );
}

export default memo(DashboardMarkets);
