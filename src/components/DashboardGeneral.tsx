/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Market, Flyer, Offer, CanonicalProduct } from '../types';
import { MARKETS, CANONICAL_PRODUCTS, calculateBasketHistory, calculateMarketRanking, formatDateToLocal } from '../data';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Store, Tag, Sparkles, TrendingUp, DollarSign, Eye, BadgeAlert, CheckCircle2 } from 'lucide-react';
import { APP_CONFIG } from '../config/app';
import FlyerOriginModal from './FlyerOriginModal';

interface Props {
  flyers: Flyer[];
  offers: Offer[];
  onNavigate: (tab: string) => void;
}

export default function DashboardGeneral({ flyers, offers, onNavigate }: Props) {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedOfferForModal, setSelectedOfferForModal] = useState<Offer | null>(null);

  // 1. Identify active flyers (most recent dates)
  const activeFlyers = useMemo(() => {
    const sorted = [...flyers].sort((a, b) => b.startDate.localeCompare(a.startDate));
    const uniqueDates = Array.from(new Set(sorted.map(f => f.startDate))).slice(0, 2);
    return flyers.filter(f => uniqueDates.includes(f.startDate));
  }, [flyers]);

  const activeFlyerIds = useMemo(() => activeFlyers.map(f => f.id), [activeFlyers]);

  // 2. Compute stats for active offers
  const stats = useMemo(() => {
    // Current Basket Cost & History
    const basketHistory = calculateBasketHistory(flyers, offers);
    const currentBasketCost = basketHistory.length > 0 ? basketHistory[basketHistory.length - 1].cost : 0;
    const prevBasketCost = basketHistory.length > 1 ? basketHistory[basketHistory.length - 2].cost : currentBasketCost;
    const basketChangePercent = prevBasketCost > 0 ? ((currentBasketCost - prevBasketCost) / prevBasketCost) * 100 : 0;

    // Calculate historical minimums for each product
    const productMins = new Map<string, number>();
    offers.forEach(o => {
      if (!o.productCanonicalId) return;
      const currentMin = productMins.get(o.productCanonicalId) || Infinity;
      if (o.price < currentMin) {
        productMins.set(o.productCanonicalId, o.price);
      }
    });

    // Count how many active offers are at or near their historical minimum
    const activeOffers = offers.filter(o => o.productCanonicalId && activeFlyerIds.includes(o.flyerId));
    let itemsAtMinCount = 0;
    activeOffers.forEach(o => {
      const minPrice = productMins.get(o.productCanonicalId!);
      if (minPrice && o.price <= minPrice * 1.015) {
        itemsAtMinCount++;
      }
    });

    // Compute potential savings on a standard checkout
    const rankings = calculateMarketRanking(flyers, offers);
    const bestIndex = rankings.length > 0 ? Math.min(...rankings.map(r => r.averagePriceIndex)) : 1.0;
    const worstIndex = rankings.length > 0 ? Math.max(...rankings.map(r => r.averagePriceIndex)) : 1.0;
    const potentialSavingsPct = Math.max(0, worstIndex - bestIndex) * 100;
    // Scale potential savings on a standard 500 Reais grocery cart
    const estimatedSavings = Math.round(potentialSavingsPct * 5);

    // Compute total number of "Excelentes" or "Boas" opportunities in active flyers
    let advantageousPromoCount = 0;
    // Compute historic averages for comparison
    const productAvgs = new Map<string, number>();
    const productCounts = new Map<string, number>();
    offers.forEach(o => {
      if (!o.productCanonicalId) return;
      productAvgs.set(o.productCanonicalId, (productAvgs.get(o.productCanonicalId) || 0) + o.price);
      productCounts.set(o.productCanonicalId, (productCounts.get(o.productCanonicalId) || 0) + 1);
    });

    activeOffers.forEach(o => {
      const total = productAvgs.get(o.productCanonicalId!);
      const count = productCounts.get(o.productCanonicalId!);
      if (total && count) {
        const avg = total / count;
        const discount = ((avg - o.price) / avg) * 100;
        if (discount >= 3.5) {
          advantageousPromoCount++;
        }
      }
    });

    return {
      currentBasketCost,
      basketChangePercent,
      basketHistory,
      itemsAtMinCount,
      estimatedSavings,
      advantageousPromoCount
    };
  }, [flyers, offers, activeFlyerIds]);

  // 3. Find top 3 deals of the week with high-end classification
  const topWeeklyDeals = useMemo(() => {
    const prodMap = new Map<string, CanonicalProduct>();
    CANONICAL_PRODUCTS.forEach(p => prodMap.set(p.id, p));

    const marketMap = new Map<string, string>();
    MARKETS.forEach(m => marketMap.set(m.id, m.name));

    // Calculate historic averages
    const productAvgs = new Map<string, { sum: number; count: number }>();
    offers.forEach(o => {
      if (!o.productCanonicalId) return;
      const data = productAvgs.get(o.productCanonicalId) || { sum: 0, count: 0 };
      data.sum += o.price;
      data.count++;
      productAvgs.set(o.productCanonicalId, data);
    });

    const activeOffers = offers.filter(o => o.productCanonicalId && activeFlyerIds.includes(o.flyerId));

    return activeOffers
      .map(o => {
        const prod = prodMap.get(o.productCanonicalId!);
        const marketName = marketMap.get(o.marketId) || 'Supermercado';
        
        const stats = productAvgs.get(o.productCanonicalId!);
        const avgPrice = stats ? stats.sum / stats.count : o.price * 1.15;
        const discountPercent = ((avgPrice - o.price) / avgPrice) * 100;

        return {
          ...o,
          product: prod,
          marketName,
          discountPercent: Math.round(discountPercent),
          avgPrice
        };
      })
      .sort((a, b) => b.discountPercent - a.discountPercent)
      .slice(0, 3);
  }, [offers, activeFlyerIds]);

  const handleOpenModal = (offer: Offer) => {
    setSelectedOfferForModal(offer);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header section - Clean consumer focus */}
      <div>
        <h1 className="text-3xl font-sans font-bold tracking-tight text-slate-900">
          Observatório de Preços
        </h1>
        <p className="text-slate-500 mt-1">
          Análise de dados imparcial de folhetos promocionais em {APP_CONFIG.defaultCity}. Ajudando você a economizar de verdade.
        </p>
      </div>

      {/* Consumer-Centric Metrics Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Potential Weekly Savings */}
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between"
        >
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Economia Potencial</p>
            <h3 className="text-2xl font-black font-sans text-emerald-600 mt-1">R$ {stats.estimatedSavings.toFixed(2)}</h3>
            <span className="text-[10px] text-slate-400 font-semibold mt-1 block">
              Diferença estimada na cesta semanal
            </span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <DollarSign className="w-6 h-6" />
          </div>
        </motion.div>

        {/* Metric 2: Advantageous Promos */}
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between"
        >
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Promoções Reais</p>
            <h3 className="text-2xl font-black font-sans text-indigo-600 mt-1">{stats.advantageousPromoCount} ofertas</h3>
            <span 
              className="text-[10px] text-indigo-600 font-bold hover:underline cursor-pointer block mt-1"
              onClick={() => onNavigate('offers')}
            >
              Ver ofertas da semana →
            </span>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Tag className="w-6 h-6" />
          </div>
        </motion.div>

        {/* Metric 3: Historical Minimums */}
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between"
        >
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mínimas Históricas</p>
            <h3 className="text-2xl font-black font-sans text-slate-800 mt-1">{stats.itemsAtMinCount} itens</h3>
            <span className="text-[10px] text-slate-400 font-semibold mt-1 block">
              Produtos no menor valor já registrado
            </span>
          </div>
          <div className="p-3 bg-slate-50 text-slate-600 rounded-xl">
            <BadgeAlert className="w-6 h-6" />
          </div>
        </motion.div>

        {/* Metric 4: Inflation/Cesta Básica */}
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between"
        >
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cesta Básica Regional</p>
            <h3 className="text-2xl font-bold font-sans text-slate-800 mt-1">R$ {stats.currentBasketCost.toFixed(2)}</h3>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp className={`w-3.5 h-3.5 ${stats.basketChangePercent >= 0 ? 'text-rose-500' : 'text-emerald-500'}`} />
              <span className={`text-[10px] font-bold ${stats.basketChangePercent >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {stats.basketChangePercent >= 0 ? '+' : ''}{stats.basketChangePercent.toFixed(1)}% este mês
              </span>
            </div>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <Store className="w-6 h-6" />
          </div>
        </motion.div>
      </div>

      {/* Main Answers Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Answer: "Como os preços estão evoluindo?" (Chart) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-bold text-slate-800">Evolução de Preços da Cesta Básica</h2>
              <p className="text-xs text-slate-400 mt-0.5">Indicador inflacionário independente de {APP_CONFIG.defaultCity}</p>
            </div>
            <div className="px-3 py-1 bg-slate-50 rounded-lg text-[10px] font-bold text-slate-500">
              SÉRIE HISTÓRICA COMPLETA
            </div>
          </div>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.basketHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorBasket" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
                <YAxis domain={['dataMin - 10', 'dataMax + 10']} tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
                <Tooltip 
                  formatter={(value: any) => [`R$ ${value}`, 'Custo da Cesta']}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="cost" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorBasket)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Answer: "O que vale a pena comprar hoje?" */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-800">O que vale a pena comprar hoje?</h2>
            <p className="text-xs text-slate-400 mt-0.5">As 3 promoções mais vantajosas identificadas esta semana</p>
            
            <div className="space-y-3 mt-4">
              {topWeeklyDeals.map((deal) => (
                <div key={deal.id} className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <span className="text-[8px] font-black uppercase px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-md">
                      {deal.marketName}
                    </span>
                    <h4 className="text-xs font-bold text-slate-800 truncate mt-1.5">
                      {deal.product ? deal.product.name : deal.originalName}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">R$ {deal.price.toFixed(2)} / {deal.product ? deal.product.weightVolume : deal.unit}</p>
                  </div>
                  
                  <div className="flex flex-col items-end shrink-0 gap-1.5">
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-100">
                      -{deal.discountPercent}%
                    </span>
                    <button
                      onClick={() => handleOpenModal(deal)}
                      className="text-[9px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer flex items-center gap-0.5"
                    >
                      <Eye className="w-3 h-3" /> Origem
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-between items-center text-xs">
            <span className="text-slate-400 font-bold">Totalmente Isento</span>
            <button 
              onClick={() => onNavigate('offers')}
              className="text-indigo-600 hover:text-indigo-800 font-bold hover:underline"
            >
              Explorar ofertas →
            </button>
          </div>
        </div>
      </div>

      {/* AI Assistant Call to Action */}
      <div className="p-6 rounded-3xl bg-slate-900 text-white relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-md">
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] opacity-10" />
        <div className="max-w-xl relative z-10 space-y-1.5">
          <h3 className="font-sans font-bold flex items-center gap-1.5 text-base">
            <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" /> Assistente Co-piloto de IA do {APP_CONFIG.shortName}
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed font-semibold">
            Nosso assistente regional inteligente está pronto para ajudar você! Pergunte sobre a inflação local, sazonalidade de safras do Cerrado, ou onde encontrar a cesta mais barata hoje.
          </p>
        </div>
        <div className="relative z-10">
          <button 
            onClick={() => onNavigate('chat')}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 font-bold text-xs rounded-xl tracking-wider uppercase transition-all duration-150 cursor-pointer shadow-lg shadow-indigo-600/20"
          >
            Falar com a IA
          </button>
        </div>
      </div>

      {/* Origin modal */}
      <FlyerOriginModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        offer={selectedOfferForModal}
        flyers={flyers}
      />
    </div>
  );
}
