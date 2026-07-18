/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */


import React, { useMemo, memo } from 'react';
import { motion } from 'motion/react';
import { Offer, Flyer, CanonicalProduct, Category } from '../types';
import { CESTA_BASICA_COMPOSITION, PRODUCT_BASE_PRICES, calculateCategoryInflation, formatDateToLocal } from '../data';
import { APP_CONFIG } from '../config/app';
import { MapPin, TrendingUp, TrendingDown, ShoppingBag, Beef, Apple, CupSoda, Sparkles, Heart, Scale, AlertCircle } from 'lucide-react';

interface Props {
  flyers: Flyer[];
  offers: Offer[];
  canonicalProducts: CanonicalProduct[];
  categories: Category[];
  isLoading?: boolean;
}

function DashboardCity({ flyers, offers, canonicalProducts, categories, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium">Carregando visão geral da cidade...</p>
      </div>
    );
  }

  if (canonicalProducts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <MapPin className="w-8 h-8 text-slate-300" />
        <p className="text-slate-500 font-medium">Nenhum dado disponível para análise da cidade.</p>
      </div>
    );
  }
  // Calculate category inflation for the last period
  const categoryStats = useMemo(() => {
    return categories.map(cat => {
      const inflationData = calculateCategoryInflation(flyers, offers, cat.id, 45); // comparing recent 45 days vs prior 45 days
      return {
        ...cat,
        ...inflationData
      };
    });
  }, [flyers, offers, categories]);

  // Map icon names to components
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'ShoppingBag': return <ShoppingBag className="w-4 h-4" />;
      case 'Beef': return <Beef className="w-4 h-4" />;
      case 'Apple': return <Apple className="w-4 h-4" />;
      case 'CupSoda': return <CupSoda className="w-4 h-4" />;
      case 'Sparkles': return <Sparkles className="w-4 h-4" />;
      case 'Heart': return <Heart className="w-4 h-4" />;
      default: return <ShoppingBag className="w-4 h-4" />;
    }
  };

  // Details on Cesta Básica itemized costs
  const basketItemsWithPrices = useMemo(() => {
    // Find average prices of products in the latest month
    const latestFlyerIds = flyers.slice(-15).map(f => f.id);
    const latestOffers = offers.filter(o => latestFlyerIds.includes(o.flyerId));

    const prodMap = new Map();
    canonicalProducts.forEach(p => prodMap.set(p.id, p));

    return CESTA_BASICA_COMPOSITION.map(item => {
      const prod = prodMap.get(item.productId);
      const itemOffers = latestOffers.filter(o => o.productCanonicalId === item.productId);
      const avgPrice = itemOffers.length > 0 
        ? itemOffers.reduce((sum, o) => sum + o.price, 0) / itemOffers.length 
        : (PRODUCT_BASE_PRICES[item.productId] || 10.0);

      return {
        id: item.productId,
        name: prod ? prod.name : 'Produto',
        brand: prod ? prod.brand : 'Genérica',
        weight: item.weight,
        unit: prod ? prod.weightVolume : '1u',
        avgPrice: Math.round(avgPrice * 100) / 100,
        subtotal: Math.round(avgPrice * item.weight * 100) / 100
      };
    });
  }, [flyers, offers, canonicalProducts]);

  const basketTotal = useMemo(() => {
    return basketItemsWithPrices.reduce((sum, item) => sum + item.subtotal, 0);
  }, [basketItemsWithPrices]);

  // Calculate top price increases (Altas) and price decreases (Baixas)
  const priceShifts = useMemo(() => {
    const prodMap = new Map<string, CanonicalProduct>();
    canonicalProducts.forEach(p => prodMap.set(p.id, p));

    // Get active flyers and latest active offers
    const sortedFlyers = [...flyers].sort((a, b) => b.startDate.localeCompare(a.startDate));
    const activeDates = Array.from(new Set(sortedFlyers.map(f => f.startDate))).slice(0, 2);
    const activeFlyerIds = flyers.filter(f => activeDates.includes(f.startDate)).map(f => f.id);

    // Compute current average for each product in active flyers
    const currentAverages = new Map<string, { sum: number; count: number }>();
    offers.filter(o => o.productCanonicalId && activeFlyerIds.includes(o.flyerId)).forEach(o => {
      const data = currentAverages.get(o.productCanonicalId!) || { sum: 0, count: 0 };
      data.sum += o.price;
      data.count++;
      currentAverages.set(o.productCanonicalId!, data);
    });

    // Compute historical average for all products
    const historicalAverages = new Map<string, { sum: number; count: number }>();
    offers.filter(o => o.productCanonicalId).forEach(o => {
      const data = historicalAverages.get(o.productCanonicalId!) || { sum: 0, count: 0 };
      data.sum += o.price;
      data.count++;
      historicalAverages.set(o.productCanonicalId!, data);
    });

    const shifts = canonicalProducts.map(p => {
      const currData = currentAverages.get(p.id);
      const histData = historicalAverages.get(p.id);

      const currAvg = currData ? currData.sum / currData.count : PRODUCT_BASE_PRICES[p.id];
      const histAvg = histData ? histData.sum / histData.count : PRODUCT_BASE_PRICES[p.id];

      const changePercent = histAvg > 0 ? ((currAvg - histAvg) / histAvg) * 100 : 0;

      return {
        product: p,
        currAvg,
        histAvg,
        changePercent
      };
    }).filter(s => s.changePercent !== 0);

    // Sort for top increases and decreases
    const altas = [...shifts].sort((a, b) => b.changePercent - a.changePercent).slice(0, 3);
    const baixas = [...shifts].sort((a, b) => a.changePercent - b.changePercent).slice(0, 3);

    return { altas, baixas };
  }, [offers, flyers, canonicalProducts]);

  // Seasonality calendar for default city (based on typical High/Low seasons for crops in MG Cerrado)
  const seasonalityData = [
    { item: 'Tomate', cheaperMonths: 'Mai - Ago', expensiveMonths: 'Dez - Mar', tip: 'Safra de inverno em Minas costuma derrubar os preços.' },
    { item: 'Batata', cheaperMonths: 'Jul - Out', expensiveMonths: 'Jan - Abr', tip: `Alta produção de batata no cerrado de ${APP_CONFIG.defaultCityShort} no meio do ano.` },
    { item: 'Cebola', cheaperMonths: 'Ago - Nov', expensiveMonths: 'Mar - Jun', tip: 'Cebolas do Nordeste e Sul entram no mercado reduzindo preços.' },
    { item: 'Banana Prata', cheaperMonths: 'Set - Dez', expensiveMonths: 'Abr - Jul', tip: 'Clima quente favorece a maturação e aumenta oferta local.' },
    { item: 'Cortes Bovinos', cheaperMonths: 'Mai - Jun', expensiveMonths: 'Nov - Dez', tip: 'Período de entressafra e festas de fim de ano elevam preços de carnes.' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-150">
          <MapPin className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-sans font-bold tracking-tight text-slate-900 font-sans">
            Indicadores de {APP_CONFIG.defaultCity}
          </h1>
          <p className="text-slate-500 mt-1">
            Índices oficiais de inflação de consumo local, custo ponderado da alimentação e sazonalidade agrícola do Cerrado
          </p>
        </div>
      </div>

      {/* Grid: Left Inflation, Right Cesta Basica itemized */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Inflation by Category */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-800">Inflação Regional de Alimentos</h2>
            <p className="text-xs text-slate-400 mt-0.5">Variação acumulada calculada no último período de 45 dias</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {categoryStats.map((cat) => {
              const isPositive = cat.changePercent >= 0;
              return (
                <div key={cat.id} className="p-4 bg-slate-50/70 border border-slate-100 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-white text-slate-700 rounded-xl shadow-sm border border-slate-100">
                      {getIcon(cat.icon)}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">{cat.name}</h4>
                      <p className="text-[10px] text-slate-400 font-medium">Médio: R$ {cat.currentAvg.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className={`inline-block text-xs font-extrabold px-2 py-0.5 rounded-lg border ${
                      isPositive 
                        ? 'bg-rose-50 text-rose-700 border-rose-200' 
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>
                      {isPositive ? '+' : ''}{cat.changePercent.toFixed(1)}%
                    </span>
                    <span className="block text-[8px] text-slate-400 font-bold mt-1 uppercase">Variação</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick info notes */}
          <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/40 text-indigo-950">
            <h3 className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-indigo-600" /> Nota Metodológica Regional
            </h3>
            <p className="text-[10px] text-indigo-800 leading-relaxed mt-1 font-semibold">
              Nosso indicador calcula a inflação de alimentos ponderada especificamente para o Cerrado de {APP_CONFIG.defaultCity}, eliminando distorções de capitais e intermediários comerciais. Os dados refletem exclusivamente ofertas e panfletos de feira vigentes.
            </p>
          </div>
        </div>

        {/* Cesta Básica Itemized breakdown */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold text-slate-800 font-sans">Cesta Básica Ponderada</h2>
              <p className="text-xs text-slate-400 mt-0.5">Componentes e pesos no orçamento familiar de {APP_CONFIG.defaultCityShort}</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 font-bold uppercase block">Custo Total</span>
              <span className="text-xl font-black text-indigo-600 font-sans">R$ {basketTotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="border border-slate-100 rounded-2xl overflow-hidden">
            <div className="max-h-[320px] overflow-y-auto">
              <table className="w-full text-left text-xs divide-y divide-slate-100">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2.5 font-bold text-slate-500">Produto</th>
                    <th className="px-4 py-2.5 font-bold text-slate-500 text-center">Peso</th>
                    <th className="px-4 py-2.5 font-bold text-slate-500 text-right">Médio Unitário</th>
                    <th className="px-4 py-2.5 font-bold text-slate-500 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {basketItemsWithPrices.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2.5">
                        <span className="font-bold text-slate-800 block">{item.name}</span>
                        <span className="text-[9px] text-slate-400 block font-medium mt-0.5">{item.brand} • {item.unit}</span>
                      </td>
                      <td className="px-4 py-2.5 text-center font-bold text-slate-600">
                        x{item.weight}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium text-slate-600">
                        R$ {item.avgPrice.toFixed(2)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-extrabold text-slate-800">
                        R$ {item.subtotal.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Top Increases vs Top Decreases */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Increases (Maiores Altas) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-rose-500" /> Maiores Altas Recentes (Atenção)
          </h3>
          <p className="text-xs text-slate-400">Produtos que apresentaram maior encarecimento em relação à média histórica</p>
          
          <div className="space-y-3">
            {priceShifts.altas.map(s => (
              <div key={s.product.id} className="p-3 bg-rose-50/30 border border-rose-100 rounded-2xl flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">{s.product.name}</h4>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">Marca: {s.product.brand} • {s.product.weightVolume}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-100 px-2.5 py-1 rounded-lg block">
                    +{s.changePercent.toFixed(0)}%
                  </span>
                  <span className="text-[9px] text-slate-400 font-bold block mt-1">SOBRE A MÉDIA</span>
                </div>
              </div>
            ))}
            {priceShifts.altas.length === 0 && (
              <p className="text-xs text-slate-400 py-4 italic text-center">Nenhuma variação expressiva para cima encontrada.</p>
            )}
          </div>
        </div>

        {/* Top Decreases (Maiores Baixas) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            <TrendingDown className="w-4 h-4 text-emerald-500" /> Maiores Reduções (Oportunidades)
          </h3>
          <p className="text-xs text-slate-400">Produtos que ficaram mais baratos em relação à sua média de preço usual</p>
          
          <div className="space-y-3">
            {priceShifts.baixas.map(s => (
              <div key={s.product.id} className="p-3 bg-emerald-50/30 border border-emerald-100 rounded-2xl flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">{s.product.name}</h4>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">Marca: {s.product.brand} • {s.product.weightVolume}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg block">
                    {s.changePercent.toFixed(0)}%
                  </span>
                  <span className="text-[9px] text-slate-400 font-bold block mt-1">SOBRE A MÉDIA</span>
                </div>
              </div>
            ))}
            {priceShifts.baixas.length === 0 && (
              <p className="text-xs text-slate-400 py-4 italic text-center">Nenhuma variação expressiva para baixo encontrada.</p>
            )}
          </div>
        </div>
      </div>

      {/* Seasonality analysis section */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <h2 className="text-sm font-bold text-slate-800 mb-1 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-indigo-500" /> Guia Sazonal de Alimentos do Cerrado Mineiro
        </h2>
        <p className="text-xs text-slate-400 mb-4">Aproveite as janelas de safra agrícola para economizar no supermercado</p>
        
        <div className="overflow-x-auto border border-slate-150 rounded-2xl">
          <table className="w-full text-left text-xs divide-y divide-slate-150">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-5 py-3.5 font-bold text-slate-500">Produto de Feira</th>
                <th className="px-5 py-3.5 font-bold text-emerald-700 bg-emerald-50/40">Meses Mais Baratos (Safra)</th>
                <th className="px-5 py-3.5 font-bold text-rose-700 bg-rose-50/40">Meses Mais Caros (Entressafra)</th>
                <th className="px-5 py-3.5 font-bold text-slate-500">Estratégia do Produtor Regional</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {seasonalityData.map((data, idx) => (
                <tr key={idx} className="hover:bg-slate-50/40 transition-colors">
                  <td className="px-5 py-3.5 font-bold text-slate-800">{data.item}</td>
                  <td className="px-5 py-3.5 font-extrabold text-emerald-600 bg-emerald-50/15">{data.cheaperMonths}</td>
                  <td className="px-5 py-3.5 font-extrabold text-rose-600 bg-rose-50/15">{data.expensiveMonths}</td>
                  <td className="px-5 py-3.5 text-slate-500 text-[11px] font-semibold leading-relaxed">{data.tip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default memo(DashboardCity);
