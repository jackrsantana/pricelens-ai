/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldCheck, Calendar, Info, Store, Eye, ClipboardCheck } from 'lucide-react';
import { Offer, Flyer } from '../types';
import { MARKETS, formatDateToLocal } from '../data';
import { APP_CONFIG } from '../config/app';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  offer: Offer | null;
  flyers: Flyer[];
}

export default function FlyerOriginModal({ isOpen, onClose, offer, flyers }: Props) {
  const flyer = useMemo(() => {
    if (!offer) return null;
    return flyers.find(f => f.id === offer.flyerId) || null;
  }, [offer, flyers]);

  const market = useMemo(() => {
    if (!offer) return null;
    return MARKETS.find(m => m.id === offer.marketId) || null;
  }, [offer]);

  if (!isOpen || !offer || !flyer || !market) return null;

  const box = offer.boundingBox || { x: 10, y: 15, width: 30, height: 25 };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white rounded-3xl shadow-xl border border-slate-100 max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col relative z-10"
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
                <Eye className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-sans font-bold text-slate-900 text-lg leading-tight">
                  Comprovação de Origem da Oferta
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Visualização transparente do folheto original e validação OCR
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-200 rounded-xl text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Left: Scanned Leaflet Mock Visualizer */}
            <div className="md:col-span-7 flex flex-col space-y-3">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                Folheto Publicitário • Página {offer.pageNum}
              </span>

              {/* Leaflet Canvas Container */}
              <div className="relative border border-slate-200 rounded-2xl bg-slate-900 overflow-hidden shadow-inner aspect-[3/4] flex items-center justify-center p-4">
                {/* Background layout replicating a printed promo sheet */}
                <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] opacity-15" />
                
                {/* Flyer Scanned representation */}
                <div className="w-full h-full bg-white rounded-lg p-6 relative flex flex-col justify-between overflow-hidden select-none shadow-md">
                  {/* Market Header on flyer */}
                  <div className="border-b-4 border-rose-600 pb-3 flex justify-between items-end">
                    <div>
                      <h4 className="font-black text-rose-600 text-xl tracking-tight leading-none uppercase">
                        {market.name.replace("Supermercado", "").replace("Sacolão e", "").trim()}
                      </h4>
                      <p className="text-[7px] text-slate-500 font-bold tracking-wider uppercase mt-1">
                        OFERTAS VÁLIDAS DE {formatDateToLocal(flyer.startDate)} A {formatDateToLocal(flyer.endDate)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[8px] font-black bg-rose-600 text-white px-2 py-0.5 rounded uppercase">
                        {APP_CONFIG.defaultCity}
                      </span>
                    </div>
                  </div>

                  {/* Mock grid of items on the flyer page */}
                  <div className="grid grid-cols-3 gap-3 my-4 flex-1">
                    {/* Item 1 */}
                    <div className="border border-slate-100 p-2 rounded flex flex-col justify-between opacity-30 text-center">
                      <div className="h-10 bg-slate-100 rounded mb-1" />
                      <span className="text-[7px] font-extrabold text-slate-600 truncate uppercase">Arroz Agulhinha</span>
                      <span className="text-[10px] font-black text-rose-600">R$ 24,90</span>
                    </div>
                    {/* Item 2 */}
                    <div className="border border-slate-100 p-2 rounded flex flex-col justify-between opacity-30 text-center">
                      <div className="h-10 bg-slate-100 rounded mb-1" />
                      <span className="text-[7px] font-extrabold text-slate-600 truncate uppercase">Feijão Preto</span>
                      <span className="text-[10px] font-black text-rose-600">R$ 8,19</span>
                    </div>
                    {/* Item 3 */}
                    <div className="border border-slate-100 p-2 rounded flex flex-col justify-between opacity-30 text-center">
                      <div className="h-10 bg-slate-100 rounded mb-1" />
                      <span className="text-[7px] font-extrabold text-slate-600 truncate uppercase">Açúcar União</span>
                      <span className="text-[10px] font-black text-rose-600">R$ 4,15</span>
                    </div>

                    {/* Central Target row where our item sits */}
                    <div className="col-span-3 h-20 border border-slate-100/50 rounded flex relative opacity-35">
                      <div className="w-1/3 bg-slate-100 rounded m-2" />
                      <div className="flex-1 p-2 flex flex-col justify-center">
                        <span className="text-[8px] font-bold text-slate-600">PRODUTO EM DESTACADO</span>
                        <span className="text-[6px] text-slate-400">Oferta auditada sistematicamente</span>
                      </div>
                    </div>

                    {/* Item 5 */}
                    <div className="border border-slate-100 p-2 rounded flex flex-col justify-between opacity-30 text-center">
                      <div className="h-10 bg-slate-100 rounded mb-1" />
                      <span className="text-[7px] font-extrabold text-slate-600 truncate uppercase">Óleo de Soja</span>
                      <span className="text-[10px] font-black text-rose-600">R$ 6,45</span>
                    </div>
                    {/* Item 6 */}
                    <div className="border border-slate-100 p-2 rounded flex flex-col justify-between opacity-30 text-center">
                      <div className="h-10 bg-slate-100 rounded mb-1" />
                      <span className="text-[7px] font-extrabold text-slate-600 truncate uppercase">Leite Integral</span>
                      <span className="text-[10px] font-black text-rose-600">R$ 5,39</span>
                    </div>
                    {/* Item 7 */}
                    <div className="border border-slate-100 p-2 rounded flex flex-col justify-between opacity-30 text-center">
                      <div className="h-10 bg-slate-100 rounded mb-1" />
                      <span className="text-[7px] font-extrabold text-slate-600 truncate uppercase">Café Tradicional</span>
                      <span className="text-[10px] font-black text-rose-600">R$ 17,90</span>
                    </div>
                  </div>

                  {/* Leaflet footer */}
                  <div className="border-t border-slate-200 pt-2 flex justify-between items-center text-[6px] text-slate-400">
                    <span>Imagens meramente ilustrativas • Respeite os limites por cliente.</span>
                    <span>Pág 1/1</span>
                  </div>

                  {/* OCR HIGHLIGHT LAYER (Bounding Box overlay) */}
                  <div
                    style={{
                      position: 'absolute',
                      left: `${box.x}%`,
                      top: `${box.y}%`,
                      width: `${box.width}%`,
                      height: `${box.height}%`,
                    }}
                    className="border-2 border-indigo-600 bg-indigo-500/10 rounded-lg shadow-[0_0_15px_rgba(99,102,241,0.5)] flex flex-col justify-between p-2 z-10 animate-pulse"
                  >
                    {/* Glowing corner brackets */}
                    <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-indigo-600" />
                    <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-indigo-600" />
                    <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-indigo-600" />
                    <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-indigo-600" />

                    {/* Actual visual details inside bounding box */}
                    <div className="bg-indigo-600/95 text-white p-1 rounded text-[7px] font-black tracking-tight leading-none uppercase truncate self-start shadow-sm">
                      {offer.originalName.replace(/OFERTA IMPERDÍVEL!|PROMOÇÃO/i, '').trim()}
                    </div>
                    <div className="text-right">
                      <span className="bg-rose-600 text-white px-1 py-0.5 rounded text-[10px] font-extrabold tracking-tighter leading-none block shadow-sm">
                        R$ {offer.price.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Metadata Audit Trails */}
            <div className="md:col-span-5 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                  Metadados de Validação e Transparência
                </span>

                {/* Audit values */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3.5">
                  <div className="flex items-center gap-2.5">
                    <Store className="w-4 h-4 text-slate-500" />
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] text-slate-400 block font-bold uppercase leading-none">Supermercado</span>
                      <span className="text-xs font-bold text-slate-800 block mt-1">{market.name}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <Calendar className="w-4 h-4 text-slate-500" />
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] text-slate-400 block font-bold uppercase leading-none">Vigência da Promoção</span>
                      <span className="text-xs font-bold text-slate-800 block mt-1">
                        De {formatDateToLocal(flyer.startDate)} a {formatDateToLocal(flyer.endDate)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] text-slate-400 block font-bold uppercase leading-none">Nível de Confiança OCR</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                          {offer.confidence}% Confiável
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">Algoritmo Regional v4.1</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <ClipboardCheck className="w-4 h-4 text-indigo-600" />
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] text-slate-400 block font-bold uppercase leading-none">Id da Oferta Coletada</span>
                      <span className="text-[10px] font-mono text-slate-500 block mt-1 truncate">{offer.id}</span>
                    </div>
                  </div>
                </div>

                {/* Audit rules explanation */}
                <div className="p-3.5 bg-indigo-50/50 rounded-2xl border border-indigo-100/30 text-indigo-950">
                  <h4 className="text-xs font-bold flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-indigo-500" /> Auditoria Imparcial de Panfletos
                  </h4>
                  <p className="text-[10px] leading-relaxed text-indigo-800 mt-1">
                    Esta oferta foi extraída diretamente de material impresso público distribuído pelo estabelecimento em {APP_CONFIG.defaultCity}. Nossa plataforma garante total isenção e imparcialidade legal, sem qualquer vínculo publicitário com as marcas exibidas.
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-bold text-xs rounded-xl tracking-wider uppercase transition-colors cursor-pointer text-center"
              >
                Concluir Verificação
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
