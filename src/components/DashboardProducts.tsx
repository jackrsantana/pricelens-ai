/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */


import React, { useState, useMemo, memo } from 'react';
import { } from 'motion/react';
import { Offer, Flyer, CanonicalProduct, Market } from '../types';
import { formatDateToLocal } from '../data';
import { APP_CONFIG } from '../config/app';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid, BarChart, Bar } from 'recharts';
import { Search, TrendingUp, TrendingDown, Minus, AlertCircle, Sparkles } from 'lucide-react';

interface Props {
  flyers: Flyer[];
  offers: Offer[];
  canonicalProducts: CanonicalProduct[];
  markets: Market[];
  isLoading?: boolean;
}

function DashboardProducts({ flyers, offers, canonicalProducts, markets, isLoading }: Props) {
  const [selectedProductId, setSelectedProductId] = useState<string>('p-arroz-camil-5k');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Filter canonical products based on search
  const filteredProducts = useMemo(() => {
    return canonicalProducts.filter(p => 
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, canonicalProducts]);

  const selectedProduct = useMemo(() => {
    return canonicalProducts.find(p => p.id === selectedProductId) || canonicalProducts[0];
  }, [selectedProductId, canonicalProducts]);

  // Map flyer ID to start date
  const flyerMap = useMemo(() => {
    const map = new Map<string, string>();
    flyers.forEach(f => map.set(f.id, f.startDate));
    return map;
  }, [flyers]);

  // Extract price history for the selected product
  const historyData = useMemo(() => {
    // We want a weekly data structure: { date: '01/02', 'Market Name 1': price1, 'Market Name 2': price2 }
    const weeks = Array.from(new Set(flyers.map(f => f.startDate))).sort();
    
    return weeks.map(weekStart => {
      // Find flyers in this week
      const weekFlyerIds = flyers.filter(f => f.startDate === weekStart).map(f => f.id);
      
      // Find offers for the selected product in this week
      const weekOffers = offers.filter(o => o.productCanonicalId === selectedProductId && weekFlyerIds.includes(o.flyerId));

      const entry: any = {
        date: formatDateToLocal(weekStart)
      };

      markets.forEach(m => {
        const mOffer = weekOffers.find(o => o.marketId === m.id);
        if (mOffer) {
          entry[m.name] = mOffer.price;
        }
      });

      return entry;
    });
  }, [flyers, offers, selectedProductId, markets]);

  // Compute stats (Min, Max, Avg, Inflation, Trend)
  const productStats = useMemo(() => {
    const prodOffers = offers.filter(o => o.productCanonicalId === selectedProductId);
    if (prodOffers.length === 0) {
      return { min: 0, max: 0, avg: 0, inflation: 0, trend: 'stable' };
    }

    const prices = prodOffers.map(o => o.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;

    // Calculate inflation (average of oldest month vs average of newest month)
    // Oldest 4 weeks
    const oldestFlyers = flyers.slice(0, 15).map(f => f.id);
    const oldestOffers = prodOffers.filter(o => oldestFlyers.includes(o.flyerId));
    const oldestAvg = oldestOffers.length > 0 ? oldestOffers.reduce((sum, o) => sum + o.price, 0) / oldestOffers.length : avg;

    // Newest 4 weeks
    const newestFlyers = flyers.slice(-15).map(f => f.id);
    const newestOffers = prodOffers.filter(o => newestFlyers.includes(o.flyerId));
    const newestAvg = newestOffers.length > 0 ? newestOffers.reduce((sum, o) => sum + o.price, 0) / newestOffers.length : avg;

    const inflation = oldestAvg > 0 ? ((newestAvg - oldestAvg) / oldestAvg) * 100 : 0;
    
    let trend = 'stable';
    if (inflation > 1.5) trend = 'up';
    else if (inflation < -1.5) trend = 'down';

    return {
      min,
      max,
      avg: Math.round(avg * 100) / 100,
      inflation: Math.round(inflation * 100) / 100,
      trend
    };
  }, [offers, selectedProductId, flyers]);

  // Compute distribution histogram data (5 buckets)
  const histogramData = useMemo(() => {
    const prodOffers = offers.filter(o => o.productCanonicalId === selectedProductId);
    if (prodOffers.length === 0) return [];

    const prices = prodOffers.map(o => o.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min;
    const bucketSize = range > 0 ? range / 5 : 1;

    const buckets = Array.from({ length: 5 }, (_, i) => {
      const start = min + i * bucketSize;
      const end = start + bucketSize;
      return {
        rangeStr: `R$ ${start.toFixed(1)} - ${end.toFixed(1)}`,
        quantidade: 0,
        start,
        end
      };
    });

    prices.forEach(p => {
      let placed = false;
      for (let i = 0; i < 5; i++) {
        const bucket = buckets[i];
        if (p >= bucket.start && p <= bucket.end) {
          bucket.quantidade++;
          placed = true;
          break;
        }
      }
      if (!placed && prices.length > 0) {
        buckets[4].quantidade++;
      }
    });

    return buckets;
  }, [offers, selectedProductId]);

  // Active Deals list (current prices in supermarkets)
  const activeDeals = useMemo(() => {
    // Map flyer ID to dates and status
    const activeFlyerIds = flyers.slice(-5).map(f => f.id); // last week's flyers
    const prodOffers = offers.filter(o => o.productCanonicalId === selectedProductId && activeFlyerIds.includes(o.flyerId));

    const marketMap = new Map<string, string>();
    markets.forEach(m => marketMap.set(m.id, m.name));

    return prodOffers.map(o => ({
      id: o.id,
      marketId: o.marketId,
      marketName: marketMap.get(o.marketId) || 'Supermercado',
      price: o.price,
      confidence: o.confidence,
      promotionType: o.promotionType || 'Normal',
      rules: o.rules
    })).sort((a, b) => a.price - b.price); // Cheapest first
  }, [offers, selectedProductId, flyers, markets]);

  // Colors for lines
  const marketColors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <Sparkles className="w-8 h-8 text-indigo-300 animate-pulse" />
        <p className="text-slate-500 font-medium">Carregando análise de produtos...</p>
      </div>
    );
  }

  if (canonicalProducts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <AlertCircle className="w-8 h-8 text-slate-300" />
        <p className="text-slate-500 font-medium">Nenhum produto disponível para análise.</p>
      </div>
    );
  }

  if (!selectedProduct) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <AlertCircle className="w-8 h-8 text-slate-300" />
        <p className="text-slate-500 font-medium">Produto selecionado não encontrado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-sans font-bold tracking-tight text-slate-900">
          Análise de Produtos
        </h1>
        <p className="text-slate-500 mt-1">
          Histórico de preços, distribuição, tendências e melhores ofertas ativas em {APP_CONFIG.defaultCityShort}
        </p>
      </div>

      {/* Selector and Search Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Left selector rail */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Pesquisar produto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 hover:bg-slate-100 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
            />
          </div>

          <div className="max-h-96 overflow-y-auto space-y-1.5 pr-1">
            {filteredProducts.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedProductId(p.id)}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 flex items-center justify-between cursor-pointer ${
                  selectedProductId === p.id
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                    : 'bg-transparent text-slate-600 hover:bg-slate-50 border border-transparent'
                }`}
              >
                <div className="truncate pr-1">
                  <span className="block font-bold text-slate-800 truncate">{p.name}</span>
                  <span className="block text-[10px] text-slate-400 font-medium mt-0.5">{p.brand} • {p.weightVolume}</span>
                </div>
                <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                  {p.category}
                </span>
              </button>
            ))}
            {filteredProducts.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-4">Nenhum produto correspondente.</p>
            )}
          </div>
        </div>

        {/* Right detailed stats and charts */}
        <div className="md:col-span-3 space-y-6">
          {/* Main Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <span className="text-xs uppercase font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full">
                {selectedProduct.category}
              </span>
              <h2 className="text-xl font-bold text-slate-800 mt-1">{selectedProduct.name}</h2>
              <p className="text-sm text-slate-400">Marca original: **{selectedProduct.brand}** • Embalagem: **{selectedProduct.weightVolume}**</p>
            </div>

            <div className="flex gap-4">
              <div className="text-center px-4 py-2 bg-slate-50 rounded-xl">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Menor Preço</span>
                <span className="text-lg font-bold text-slate-800">R$ {productStats.min.toFixed(2)}</span>
              </div>
              <div className="text-center px-4 py-2 bg-slate-50 rounded-xl">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Preço Médio</span>
                <span className="text-lg font-bold text-indigo-600">R$ {productStats.avg.toFixed(2)}</span>
              </div>
              <div className="text-center px-4 py-2 bg-slate-50 rounded-xl">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Inflação Recente</span>
                <span className={`text-sm font-bold flex items-center justify-center gap-0.5 mt-1 ${productStats.inflation >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {productStats.trend === 'up' && <TrendingUp className="w-4 h-4" />}
                  {productStats.trend === 'down' && <TrendingDown className="w-4 h-4" />}
                  {productStats.trend === 'stable' && <Minus className="w-4 h-4" />}
                  {productStats.inflation >= 0 ? '+' : ''}{productStats.inflation}%
                </span>
              </div>
            </div>
          </div>

          {/* Historical price chart */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="text-base font-bold text-slate-800 mb-4">Série Histórica Semanal por Supermercado</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    formatter={(value: any, name: any) => [`R$ ${value}`, name]}
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #f1f5f9' }}
                  />
                  <Legend tick={{ fontSize: 11 }} iconType="circle" wrapperStyle={{ paddingTop: '10px' }} />
                  {markets.map((m, idx) => (
                    <Line
                      key={m.id}
                      type="monotone"
                      dataKey={m.name}
                      stroke={marketColors[idx % marketColors.length]}
                      strokeWidth={selectedProduct.id.includes('arroz') ? 3 : 2}
                      dot={false}
                      activeDot={{ r: 6 }}
                      connectNulls={true}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Histogram distribution */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 mb-1">Distribuição de Frequência dos Preços</h3>
              <p className="text-xs text-slate-400 mb-4">Número de vezes que ofertas caíram em faixas de preço específicas</p>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={histogramData} margin={{ left: -30, right: 10 }}>
                    <XAxis dataKey="rangeStr" tick={{ fontSize: 9, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: '12px' }} />
                    <Bar dataKey="quantidade" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Best Active Offers */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800 mb-1">Ofertas Ativas nos Panfletos</h3>
                <p className="text-xs text-slate-400 mb-4">Últimas ofertas registradas nos supermercados locais</p>
                
                <div className="space-y-3">
                  {activeDeals.map((deal) => (
                    <div key={deal.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-700">{deal.marketName}</h4>
                        <div className="flex gap-1.5 mt-1.5">
                          <span className="text-[9px] font-bold px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded">
                            {deal.proType}
                          </span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded">
                            Confiança: {deal.confidence}%
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-extrabold text-slate-800 block">R$ {deal.price.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                  {activeDeals.length === 0 && (
                    <div className="text-center py-6 text-slate-400 text-xs flex flex-col items-center gap-2">
                      <AlertCircle className="w-8 h-8 text-slate-300" />
                      Nenhum folheto ativo esta semana com este produto.
                    </div>
                  )}
                </div>
              </div>

              {/* AI Assistant Hook */}
              <div className="mt-4 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100/50 flex items-center gap-3">
                <div className="p-2 bg-indigo-500 text-white rounded-lg">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-indigo-900">Previsão Inteligente</h4>
                  <p className="text-[10px] text-indigo-700 mt-0.5 truncate">Pergunte à IA: "Qual o melhor momento para comprar {selectedProduct.brand}?"</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(DashboardProducts);
