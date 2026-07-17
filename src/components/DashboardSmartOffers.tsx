/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Offer, Flyer, CanonicalProduct } from '../types';
import { CANONICAL_PRODUCTS, MARKETS, CATEGORIES } from '../data';
import { APP_CONFIG } from '../config/app';
import { Sparkles, ArrowUpDown, Filter, Eye, ShieldCheck, BadgeHelp, CheckCircle2 } from 'lucide-react';
import FlyerOriginModal from './FlyerOriginModal';

interface Props {
  flyers: Flyer[];
  offers: Offer[];
}

export default function DashboardSmartOffers({ flyers, offers }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedClassification, setSelectedClassification] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedOfferForModal, setSelectedOfferForModal] = useState<Offer | null>(null);

  // 1. Map flyer ID to start dates & check active flyers (newest week, let's say the last 2 weeks are considered active)
  const activeFlyers = useMemo(() => {
    // Sort flyers by startDate descending
    const sorted = [...flyers].sort((a, b) => b.startDate.localeCompare(a.startDate));
    // Let's grab the unique startDates of the most recent weeks
    const uniqueDates = Array.from(new Set(sorted.map(f => f.startDate))).slice(0, 2);
    return flyers.filter(f => uniqueDates.includes(f.startDate));
  }, [flyers]);

  const activeFlyerIds = useMemo(() => activeFlyers.map(f => f.id), [activeFlyers]);

  // 2. Compute historical average price for each canonical product ID
  const productAverages = useMemo(() => {
    const map = new Map<string, { avg: number; min: number; max: number; count: number; total: number }>();
    
    // Group all historic offers by product ID to calculate their average and min/max
    offers.forEach(o => {
      if (!o.productCanonicalId) return;
      const stats = map.get(o.productCanonicalId) || { avg: 0, min: Infinity, max: -Infinity, count: 0, total: 0 };
      stats.count++;
      stats.total += o.price;
      if (o.price < stats.min) stats.min = o.price;
      if (o.price > stats.max) stats.max = o.price;
      map.set(o.productCanonicalId, stats);
    });

    // Finalize averages
    const result = new Map<string, { avg: number; min: number; max: number }>();
    map.forEach((val, key) => {
      result.set(key, {
        avg: Math.round((val.total / val.count) * 100) / 100,
        min: val.min,
        max: val.max
      });
    });

    return result;
  }, [offers]);

  // 3. Score and classify all active promotions
  const smartOffers = useMemo(() => {
    const prodMap = new Map<string, CanonicalProduct>();
    CANONICAL_PRODUCTS.forEach(p => prodMap.set(p.id, p));

    const marketMap = new Map<string, string>();
    MARKETS.forEach(m => marketMap.set(m.id, m.name));

    // Get active offers (from active flyers)
    const activeOffers = offers.filter(o => o.productCanonicalId && activeFlyerIds.includes(o.flyerId));

    return activeOffers.map(o => {
      const prod = prodMap.get(o.productCanonicalId!);
      const marketName = marketMap.get(o.marketId) || 'Supermercado';
      const stats = productAverages.get(o.productCanonicalId!);

      const avgPrice = stats?.avg || o.price * 1.1; // fallback
      const minPrice = stats?.min || o.price;
      const discountFromAvg = ((avgPrice - o.price) / avgPrice) * 100;

      // Classification Score
      let classification: 'excelente' | 'boa' | 'media' | 'pouco_vantajosa' = 'media';
      let justification = '';
      let badgeColor = '';
      let textColor = '';
      let borderColor = '';

      if (o.price <= minPrice * 1.01) {
        classification = 'excelente';
        justification = `Menor preço histórico registrado para o produto! ${Math.round(discountFromAvg)}% abaixo da média local.`;
        badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        textColor = 'text-emerald-700';
        borderColor = 'border-emerald-100';
      } else if (discountFromAvg >= 10) {
        classification = 'excelente';
        justification = `Excelente oportunidade! O preço está ${Math.round(discountFromAvg)}% abaixo da média dos últimos meses.`;
        badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        textColor = 'text-emerald-700';
        borderColor = 'border-emerald-100';
      } else if (discountFromAvg >= 3.5) {
        classification = 'boa';
        justification = `Boa oportunidade. Está R$ ${(avgPrice - o.price).toFixed(2)} mais barato do que o preço médio (${Math.round(discountFromAvg)}% de desconto).`;
        badgeColor = 'bg-indigo-50 text-indigo-700 border-indigo-200';
        textColor = 'text-indigo-700';
        borderColor = 'border-indigo-100';
      } else if (discountFromAvg >= -3.5) {
        classification = 'media';
        justification = 'Preço dentro da média histórica. Promoção padrão encontrada na região.';
        badgeColor = 'bg-slate-50 text-slate-700 border-slate-200';
        textColor = 'text-slate-600';
        borderColor = 'border-slate-100';
      } else {
        classification = 'pouco_vantajosa';
        justification = `Atenção: O preço está ${Math.abs(Math.round(discountFromAvg))}% ACIMA da média de mercado para este produto.`;
        badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
        textColor = 'text-rose-700';
        borderColor = 'border-rose-100';
      }

      return {
        ...o,
        product: prod,
        marketName,
        avgPrice,
        minPrice,
        discountPercent: Math.round(discountFromAvg),
        classification,
        justification,
        badgeStyle: badgeColor,
        textStyle: textColor,
        borderStyle: borderColor
      };
    }).sort((a, b) => b.discountPercent - a.discountPercent); // highest discount relative to average first
  }, [offers, activeFlyerIds, productAverages]);

  // Filter smart offers
  const filteredSmartOffers = useMemo(() => {
    return smartOffers.filter(o => {
      const matchCat = selectedCategory === 'all' || o.product?.category === selectedCategory;
      const matchClass = selectedClassification === 'all' || o.classification === selectedClassification;
      return matchCat && matchClass;
    });
  }, [smartOffers, selectedCategory, selectedClassification]);

  const stats = useMemo(() => {
    const total = smartOffers.length;
    const excelentes = smartOffers.filter(o => o.classification === 'excelente').length;
    const boas = smartOffers.filter(o => o.classification === 'boa').length;
    return { total, excelentes, boas };
  }, [smartOffers]);

  const handleOpenModal = (offer: Offer) => {
    setSelectedOfferForModal(offer);
    setIsModalOpen(true);
  };

  const getLabelText = (classification: string) => {
    switch (classification) {
      case 'excelente': return 'Excelente oportunidade';
      case 'boa': return 'Boa oportunidade';
      case 'media': return 'Preço dentro da média';
      case 'pouco_vantajosa': return 'Pouco vantajosa';
      default: return 'Normal';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-sans font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <Sparkles className="w-8 h-8 text-indigo-600 animate-pulse" /> Ofertas Inteligentes da Semana
        </h1>
        <p className="text-slate-500 mt-1">
          Algoritmo avançado que compara as ofertas de hoje contra a base histórica determinística de {APP_CONFIG.defaultCity}
        </p>
      </div>

      {/* Quick Summary Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total de Ofertas Ativas</span>
            <span className="text-2xl font-bold text-slate-800 block mt-1">{stats.total}</span>
          </div>
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
            <Filter className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Excelente Oportunidade 💎</span>
            <span className="text-2xl font-bold text-emerald-600 block mt-1">{stats.excelentes}</span>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Boa Oportunidade 📈</span>
            <span className="text-2xl font-bold text-indigo-600 block mt-1">{stats.boas}</span>
          </div>
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
            <ArrowUpDown className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="text-sm font-bold text-slate-800">Filtrar e Ordenar Inteligência</h3>
        
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Category Selector */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs px-3 py-2 bg-slate-50 border-none rounded-xl outline-none text-slate-700 font-bold flex-1 sm:flex-initial"
          >
            <option value="all">Todas as Categorias</option>
            {CATEGORIES.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Classification Selector */}
          <select
            value={selectedClassification}
            onChange={(e) => setSelectedClassification(e.target.value)}
            className="text-xs px-3 py-2 bg-slate-50 border-none rounded-xl outline-none text-slate-700 font-bold flex-1 sm:flex-initial"
          >
            <option value="all">Todas as Oportunidades</option>
            <option value="excelente">Excelente oportunidade 💎</option>
            <option value="boa">Boa oportunidade 📈</option>
            <option value="media">Preço dentro da média ⚖️</option>
            <option value="pouco_vantajosa">Pouco vantajosa ⚠️</option>
          </select>
        </div>
      </div>

      {/* Offers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredSmartOffers.map((o) => (
          <motion.div
            key={o.id}
            whileHover={{ y: -2 }}
            className={`p-5 bg-white border rounded-2xl shadow-sm flex flex-col justify-between space-y-4 transition-all ${o.borderStyle}`}
          >
            {/* Top row: Market and Classification tag */}
            <div className="flex justify-between items-start gap-2">
              <span className="text-[10px] font-bold uppercase text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">
                {o.marketName}
              </span>
              <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${o.badgeStyle}`}>
                {getLabelText(o.classification)}
              </span>
            </div>

            {/* Product description */}
            <div>
              <span className="text-[10px] uppercase font-bold text-indigo-500 block">
                {o.product?.category || 'mercearia'}
              </span>
              <h3 className="text-base font-bold text-slate-800 leading-snug mt-1">
                {o.product ? o.product.name : o.originalName}
              </h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Marca: **{o.product ? o.product.brand : 'Genérica'}** • Peso/Vol: **{o.product ? o.product.weightVolume : o.unit}**
              </p>
            </div>

            {/* Price values and calculations */}
            <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-50 text-center">
              <div>
                <span className="text-[9px] text-slate-400 block font-bold uppercase leading-none">Preço Atual</span>
                <span className="text-base font-black text-slate-800 block mt-1">R$ {o.price.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 block font-bold uppercase leading-none">Média Histórica</span>
                <span className="text-sm font-bold text-slate-500 block mt-1.5">R$ {o.avgPrice.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 block font-bold uppercase leading-none">Vantagem</span>
                <span className={`text-sm font-extrabold block mt-1.5 ${o.discountPercent >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {o.discountPercent >= 0 ? `-${o.discountPercent}%` : `+${Math.abs(o.discountPercent)}%`}
                </span>
              </div>
            </div>

            {/* Justification Box */}
            <div className="p-3.5 bg-slate-50/70 border border-slate-100 rounded-xl flex items-start gap-2 text-[10px] text-slate-600 leading-normal font-semibold">
              <ShieldCheck className={`w-4 h-4 shrink-0 mt-0.5 ${o.classification === 'excelente' ? 'text-emerald-600' : 'text-indigo-600'}`} />
              <span>{o.justification}</span>
            </div>

            {/* Bottom Actions */}
            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => handleOpenModal(o)}
                className="py-2 px-3.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm shadow-indigo-100/50"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Ver origem da oferta</span>
              </button>
            </div>
          </motion.div>
        ))}

        {filteredSmartOffers.length === 0 && (
          <div className="col-span-2 text-center py-12 text-slate-400 text-xs flex flex-col items-center gap-2 bg-white rounded-3xl border border-slate-100">
            <BadgeHelp className="w-10 h-10 text-slate-300" />
            Não há ofertas correspondentes aos filtros selecionados nesta semana.
          </div>
        )}
      </div>

      {/* Reuse modal for original layout proofs */}
      <FlyerOriginModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        offer={selectedOfferForModal}
        flyers={flyers}
      />
    </div>
  );
}
