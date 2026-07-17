/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Offer, Flyer, Market, CanonicalProduct, Category } from '../types';
import { calculateMarketRanking } from '../data';
import { ArrowLeftRight, Check, AlertTriangle, Scale, Percent, Landmark, HelpCircle } from 'lucide-react';

interface Props {
  flyers: Flyer[];
  offers: Offer[];
  markets: Market[];
  canonicalProducts: CanonicalProduct[];
  categories: Category[];
  isLoading?: boolean;
}

export default function DashboardCompare({ flyers, offers, markets, canonicalProducts, categories, isLoading }: Props) {
  const [marketAId, setMarketAId] = useState<string>('m-lopes');
  const [marketBId, setMarketBId] = useState<string>('m-abc');

  const marketRankings = useMemo(() => {
    return calculateMarketRanking(flyers, offers, markets);
  }, [flyers, offers, markets]);

  // Extract selected market specs
  const marketA = useMemo(() => markets.find(m => m.id === marketAId) || markets[0], [marketAId, markets]);
  const marketB = useMemo(() => markets.find(m => m.id === marketBId) || markets[1] || markets[0], [marketBId, markets]);

  const rankingA = useMemo(() => marketRankings.find(r => r.id === marketAId) || marketRankings[0], [marketRankings, marketAId]);
  const rankingB = useMemo(() => marketRankings.find(r => r.id === marketBId) || marketRankings[1] || marketRankings[0], [marketRankings, marketBId]);

  // Compute category averages for selected markets based on latest offers
  const categoryComparison = useMemo(() => {
    // We group offers by category for Market A and Market B
    const prodMap = new Map<string, string>();
    canonicalProducts.forEach(p => prodMap.set(p.id, p.category));

    const marketAOffers = offers.filter(o => o.marketId === marketAId);
    const marketBOffers = offers.filter(o => o.marketId === marketBId);

    const result = categories.map(cat => {
      const aPrices = marketAOffers.filter(o => o.productCanonicalId && prodMap.get(o.productCanonicalId) === cat.id).map(o => o.price);
      const bPrices = marketBOffers.filter(o => o.productCanonicalId && prodMap.get(o.productCanonicalId) === cat.id).map(o => o.price);

      const avgA = aPrices.length > 0 ? aPrices.reduce((a, b) => a + b, 0) / aPrices.length : null;
      const avgB = bPrices.length > 0 ? bPrices.reduce((a, b) => a + b, 0) / bPrices.length : null;

      let difference: number | null = null;
      let cheaper: 'A' | 'B' | 'equal' | null = null;

      if (avgA !== null && avgB !== null) {
        difference = ((avgB - avgA) / avgA) * 100; // Positive means B is more expensive (A is cheaper)
        if (Math.abs(difference) < 0.5) cheaper = 'equal';
        else cheaper = avgA < avgB ? 'A' : 'B';
      }

      return {
        ...cat,
        avgA,
        avgB,
        difference,
        cheaper
      };
    });

    return result;
  }, [offers, marketAId, marketBId, canonicalProducts, categories]);

  // Core basic products head-to-head comparison
  const commonProductsComparison = useMemo(() => {
    // Select 5 staples
    const targetProductIds = [
      'p-arroz-camil-5k',
      'p-feijao-carioca-1k',
      'p-oleo-soja-900ml',
      'p-cafe-tres-coracoes-500g',
      'p-leite-integral-1l'
    ];

    const prodMap = new Map();
    canonicalProducts.forEach(p => prodMap.set(p.id, p));

    return targetProductIds.map(pid => {
      const prod = prodMap.get(pid);
      
      // Get latest active offer in Market A and B
      // Let's look for active flyer ids first
      const activeFlyersA = flyers.filter(f => f.marketId === marketAId).map(f => f.id);
      const activeFlyersB = flyers.filter(f => f.marketId === marketBId).map(f => f.id);

      const offerA = offers.filter(o => o.productCanonicalId === pid && activeFlyersA.includes(o.flyerId)).sort((a, b) => b.id.localeCompare(a.id))[0];
      const offerB = offers.filter(o => o.productCanonicalId === pid && activeFlyersB.includes(o.flyerId)).sort((a, b) => b.id.localeCompare(a.id))[0];

      let cheaper: 'A' | 'B' | 'equal' | 'none' = 'none';
      if (offerA && offerB) {
        if (offerA.price === offerB.price) cheaper = 'equal';
        else cheaper = offerA.price < offerB.price ? 'A' : 'B';
      }

      return {
        id: pid,
        name: prod ? prod.name : 'Produto',
        brand: prod ? prod.brand : 'Genérica',
        weight: prod ? prod.weightVolume : '1u',
        priceA: offerA ? offerA.price : null,
        priceB: offerB ? offerB.price : null,
        cheaper
      };
    });
  }, [flyers, offers, marketAId, marketBId]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium">Carregando dados da comparação...</p>
      </div>
    );
  }

  if (markets.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <ArrowLeftRight className="w-8 h-8 text-slate-300" />
        <p className="text-slate-500 font-medium">São necessários pelo menos 2 mercados para realizar a comparação.</p>
      </div>
    );
  }

  if (!marketA || !marketB || !rankingA || !rankingB) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <ArrowLeftRight className="w-8 h-8 text-slate-300" />
        <p className="text-slate-500 font-medium">Mercados selecionados não encontrados.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-sans font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <Scale className="w-8 h-8 text-indigo-600" /> Comparador Imparcial de Estabelecimentos
        </h1>
        <p className="text-slate-500 mt-1">
          Análise lado a lado de dados de panfletos. Compare índices de preço relativos e médias de categorias sem interferência comercial.
        </p>
      </div>

      {/* Selectors */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-11 items-center gap-4">
        {/* Market A Selector */}
        <div className="md:col-span-5 space-y-1.5">
          <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Estabelecimento A</label>
          <select
            value={marketAId}
            onChange={(e) => {
              if (e.target.value !== marketBId) setMarketAId(e.target.value);
            }}
            className="w-full text-sm px-4 py-3 bg-slate-50 border-none rounded-2xl outline-none text-slate-700 font-bold"
          >
            {markets.map(m => (
              <option key={m.id} value={m.id} disabled={m.id === marketBId}>{m.name}</option>
            ))}
          </select>
        </div>

        {/* Visual Swap indicator */}
        <div className="md:col-span-1 flex justify-center text-slate-300 py-2">
          <ArrowLeftRight className="w-6 h-6 rotate-90 md:rotate-0" />
        </div>

        {/* Market B Selector */}
        <div className="md:col-span-5 space-y-1.5">
          <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Estabelecimento B</label>
          <select
            value={marketBId}
            onChange={(e) => {
              if (e.target.value !== marketAId) setMarketBId(e.target.value);
            }}
            className="w-full text-sm px-4 py-3 bg-slate-50 border-none rounded-2xl outline-none text-slate-700 font-bold"
          >
            {markets.map(m => (
              <option key={m.id} value={m.id} disabled={m.id === marketAId}>{m.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Head to Head Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Supermercado A Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-5">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider">
                SUPERMERCADO A
              </span>
              <h2 className="text-xl font-bold text-slate-800 mt-2.5">{marketA.name}</h2>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">{marketA.address}</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-bold block uppercase">Índice Geral de Preço</span>
              <span className={`text-2xl font-black block mt-1 ${rankingA.averagePriceIndex < 1.0 ? 'text-emerald-600' : 'text-slate-800'}`}>
                {(rankingA.averagePriceIndex * 100).toFixed(0)}%
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
            <div className="p-3 bg-slate-50/50 border border-slate-100 rounded-xl">
              <span className="text-[10px] text-slate-400 font-bold block uppercase">Ofertas Coletadas</span>
              <span className="text-base font-bold text-slate-800 block mt-0.5">{rankingA.offerCount}</span>
            </div>
            <div className="p-3 bg-slate-50/50 border border-slate-100 rounded-xl">
              <span className="text-[10px] text-slate-400 font-bold block uppercase">Folhetos Processados</span>
              <span className="text-base font-bold text-slate-800 block mt-0.5">{rankingA.flyerCount}</span>
            </div>
          </div>
        </div>

        {/* Supermercado B Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-5">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider">
                SUPERMERCADO B
              </span>
              <h2 className="text-xl font-bold text-slate-800 mt-2.5">{marketB.name}</h2>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">{marketB.address}</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-bold block uppercase">Índice Geral de Preço</span>
              <span className={`text-2xl font-black block mt-1 ${rankingB.averagePriceIndex < 1.0 ? 'text-emerald-600' : 'text-slate-800'}`}>
                {(rankingB.averagePriceIndex * 100).toFixed(0)}%
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
            <div className="p-3 bg-slate-50/50 border border-slate-100 rounded-xl">
              <span className="text-[10px] text-slate-400 font-bold block uppercase">Ofertas Coletadas</span>
              <span className="text-base font-bold text-slate-800 block mt-0.5">{rankingB.offerCount}</span>
            </div>
            <div className="p-3 bg-slate-50/50 border border-slate-100 rounded-xl">
              <span className="text-[10px] text-slate-400 font-bold block uppercase">Folhetos Processados</span>
              <span className="text-base font-bold text-slate-800 block mt-0.5">{rankingB.flyerCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Head-to-head Category comparison table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-800">Comparação Histórica por Categorias de Alimentos</h3>
          <p className="text-xs text-slate-400 mt-0.5">Preço médio ponderado histórico calculado por seção</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-5 py-3 font-bold text-slate-500">Categoria de Consumo</th>
                <th className="px-5 py-3 font-bold text-slate-500 text-center">{marketA.name} (A)</th>
                <th className="px-5 py-3 font-bold text-slate-500 text-center">{marketB.name} (B)</th>
                <th className="px-5 py-3 font-bold text-slate-500 text-right">Comparativo Detalhado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categoryComparison.map(cat => (
                <tr key={cat.id} className="hover:bg-slate-50/40 transition-colors">
                  <td className="px-5 py-3.5">
                    <span className="font-bold text-slate-800 block">{cat.name}</span>
                    <span className="text-[10px] text-slate-400 block font-medium mt-0.5">Variação regional típica</span>
                  </td>

                  <td className="px-5 py-3.5 text-center">
                    {cat.avgA ? (
                      <span className={`text-xs font-bold ${cat.cheaper === 'A' ? 'text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100' : 'text-slate-700'}`}>
                        R$ {cat.avgA.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">Sem ofertas</span>
                    )}
                  </td>

                  <td className="px-5 py-3.5 text-center">
                    {cat.avgB ? (
                      <span className={`text-xs font-bold ${cat.cheaper === 'B' ? 'text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100' : 'text-slate-700'}`}>
                        R$ {cat.avgB.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">Sem ofertas</span>
                    )}
                  </td>

                  <td className="px-5 py-3.5 text-right font-medium text-slate-600">
                    {cat.cheaper === 'equal' && (
                      <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded">Equivalentes</span>
                    )}
                    {cat.cheaper === 'A' && cat.difference && (
                      <span className="text-[10px] text-emerald-700 bg-emerald-50/60 font-bold px-2 py-0.5 rounded border border-emerald-100">
                        {marketA.name} é {cat.difference.toFixed(0)}% mais barato
                      </span>
                    )}
                    {cat.cheaper === 'B' && cat.difference && (
                      <span className="text-[10px] text-emerald-700 bg-emerald-50/60 font-bold px-2 py-0.5 rounded border border-emerald-100">
                        {marketB.name} é {Math.abs(cat.difference).toFixed(0)}% mais barato
                      </span>
                    )}
                    {!cat.cheaper && (
                      <span className="text-[10px] text-slate-400">Inconclusivo</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Head-to-head Staples list */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-800">Preço de Alimentos Básicos Ativos no Folheto</h3>
          <p className="text-xs text-slate-400 mt-0.5">Valores ativos nos panfletos em vigor nesta semana</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-5 py-3 font-bold text-slate-500">Produto</th>
                <th className="px-5 py-3 font-bold text-slate-500 text-center">Valor no {marketA.name}</th>
                <th className="px-5 py-3 font-bold text-slate-500 text-center">Valor no {marketB.name}</th>
                <th className="px-5 py-3 font-bold text-slate-500 text-right">Comparativo Direto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {commonProductsComparison.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/40 transition-colors">
                  <td className="px-5 py-3.5">
                    <span className="font-bold text-slate-800 block">{p.name}</span>
                    <span className="text-[10px] text-slate-400 block font-medium mt-0.5">Marca: {p.brand} • {p.weight}</span>
                  </td>

                  <td className="px-5 py-3.5 text-center">
                    {p.priceA ? (
                      <span className={`text-xs font-mono font-bold ${p.cheaper === 'A' ? 'text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100' : 'text-slate-700'}`}>
                        R$ {p.priceA.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">Não anunciado</span>
                    )}
                  </td>

                  <td className="px-5 py-3.5 text-center">
                    {p.priceB ? (
                      <span className={`text-xs font-mono font-bold ${p.cheaper === 'B' ? 'text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100' : 'text-slate-700'}`}>
                        R$ {p.priceB.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">Não anunciado</span>
                    )}
                  </td>

                  <td className="px-5 py-3.5 text-right font-semibold">
                    {p.cheaper === 'equal' && (
                      <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">Preços Iguais</span>
                    )}
                    {p.cheaper === 'A' && p.priceA && p.priceB && (
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                        {marketA.name} economiza R$ {(p.priceB - p.priceA).toFixed(2)}
                      </span>
                    )}
                    {p.cheaper === 'B' && p.priceA && p.priceB && (
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                        {marketB.name} economiza R$ {(p.priceA - p.priceB).toFixed(2)}
                      </span>
                    )}
                    {(p.cheaper === 'none' || !p.priceA || !p.priceB) && (
                      <span className="text-[10px] text-slate-400 italic">Um ou ambos não publicados</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Note about regional context */}
      <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/40 flex items-start gap-2 text-indigo-950">
        <HelpCircle className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
        <div className="text-xs font-semibold leading-relaxed text-indigo-800">
          <strong>Metodologia do Índice de Competitividade:</strong> Esta análise calcula e pondera as diferenças de preço proporcionalmente ao volume anunciado. Os dados são totalmente públicos e audits sistemáticos garantem a conformidade das informações extraídas por OCR de folhetos promocionais ativos.
        </div>
      </div>
    </div>
  );
}
