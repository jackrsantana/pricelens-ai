/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Flyer, Offer, Market, UploadSession } from '../types';
import { CITIES } from '../data';
import { APP_CONFIG } from '../config/app';
import { db } from '../lib/firebase';
import { doc } from 'firebase/firestore';
import { FirestoreRepository } from '../services/FirestoreRepository';
import { useQueryClient } from '@tanstack/react-query';
import { UploadCloud, Calendar, Eye, MapPin, Sparkles, CheckCircle2, ChevronRight, AlertTriangle, FileImage, Image as ImageIcon, Trash2, Bug, Code, RefreshCw, Copy, Plus, Store, X, AlertCircle } from 'lucide-react';
import DashboardUploadAudit from "./DashboardUploadAudit";

interface Props {
  onAddFlyerAndOffers: (flyer: Flyer, offers: Offer[]) => void;
  markets: Market[];
  uploadSession: any;
  setUploadSession: React.Dispatch<React.SetStateAction<any>>; canonicalProducts?: any[]; categories?: any[];
}

// A high-quality base64 mock flyer of "Supermercado Lopes" to allow seamless testing without requiring real uploads
const DEMO_FLYER_IMAGE = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800';

interface PipelineStatusStep {
  id: number;
  label: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  details?: string;
}

export default function DashboardUpload({ onAddFlyerAndOffers, markets = [], uploadSession, setUploadSession, canonicalProducts = [], categories = [] }: Props) {
  const queryClient = useQueryClient();
  const {
    selectedFile,
    originalFile,
    status,
    marketId,
    cityId,
    startDate,
    endDate,
    observations,
    error,
    uploadedFlyer,
    extractedOffers,
    selectedOffer,
    debugData,
    pipelineSteps,
    detectedNewMarket,
    geminiModel
  } = uploadSession;

  const [dragActive, setDragActive] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateSession = (fields: Partial<any>) => {
    setUploadSession((prev: any) => ({ ...prev, ...fields }));
  };

  // State for the custom market registration form
  const [newMarketForm, setNewMarketForm] = useState<Partial<Market>>({
    name: '',
    cnpj: '',
    address: '',
    phone: '',
    businessHours: '',
    socialMedia: '',
    additionalInfo: '',
    marketType: 'supermercado'
  });

  // Pre-fill market assistant form when detectedNewMarket changes
  useEffect(() => {
    if (detectedNewMarket) {
      setNewMarketForm({
        name: detectedNewMarket.name || '',
        cnpj: detectedNewMarket.cnpj || '',
        address: detectedNewMarket.address || '',
        phone: detectedNewMarket.phone || '',
        businessHours: detectedNewMarket.businessHours || '',
        socialMedia: detectedNewMarket.socialMedia || '',
        additionalInfo: detectedNewMarket.additionalInfo || '',
        marketType: detectedNewMarket.marketType || 'supermercado'
      });
    }
  }, [detectedNewMarket]);

  const handleUpdateExtractedOffer = (updated: Offer) => {
    updateSession({
      extractedOffers: extractedOffers.map((o: Offer) => o.id === updated.id ? updated : o),
      selectedOffer: updated
    });
  };

  const handleDeleteExtractedOffer = (id: string) => {
    const remaining = extractedOffers.filter((o: Offer) => o.id !== id);
    updateSession({
      extractedOffers: remaining,
      selectedOffer: remaining.length > 0 ? remaining[0] : null
    });
  };

  const handleAddManualOffer = () => {
    const newOffer: Offer = {
      id: `o-manual-${Date.now()}`,
      flyerId: uploadedFlyer?.id || 'f-manual',
      pageNum: 1,
      marketId: marketId,
      originalName: 'Novo Item Manual',
      price: 1.99,
      unit: 'un',
      confidence: 100,
      boundingBox: { x: 30, y: 30, width: 40, height: 25 },
      status: 'valid'
    };
    updateSession({
      extractedOffers: [...extractedOffers, newOffer],
      selectedOffer: newOffer
    });
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      convertToBase64(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      convertToBase64(e.target.files[0]);
    }
  };

  const convertToBase64 = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const originalBase64 = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        
        // Optimized MAX_SIDE for reliable OCR and lightweight storage
        const MAX_SIDE = 850;
        if (width > MAX_SIDE || height > MAX_SIDE) {
          if (width > height) {
            height = Math.round((height * MAX_SIDE) / width);
            width = MAX_SIDE;
          } else {
            width = Math.round((width * MAX_SIDE) / height);
            height = MAX_SIDE;
          }
        }
        
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          
          let quality = 0.65;
          let compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          
          if (compressedBase64.length > 700000) {
            quality = 0.5;
            compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          }
          if (compressedBase64.length > 700000) {
            const smallCanvas = document.createElement('canvas');
            smallCanvas.width = Math.round(width * 0.7);
            smallCanvas.height = Math.round(height * 0.7);
            const smallCtx = smallCanvas.getContext('2d');
            if (smallCtx) {
              smallCtx.drawImage(canvas, 0, 0, smallCanvas.width, smallCanvas.height);
              compressedBase64 = smallCanvas.toDataURL('image/jpeg', 0.45);
            }
          }
          
          console.log(`[Upload Compression] Optimized image size: ${(compressedBase64.length / 1024).toFixed(1)} KB`);
          updateSession({
            selectedFile: compressedBase64,
            originalFile: originalBase64
          });
        } else {
          updateSession({
            selectedFile: originalBase64,
            originalFile: originalBase64
          });
        }
      };
      img.src = originalBase64;
    };
    reader.readAsDataURL(file);
  };

  const handleUseDemo = () => {
    updateSession({
      selectedFile: DEMO_FLYER_IMAGE,
      originalFile: DEMO_FLYER_IMAGE,
      observations: 'Processando panfleto demonstrativo do Supermercado Lopes com ofertas da semana.'
    });
  };

  const handleUploadAndProcess = async () => {
    if (!selectedFile) return;

    const activeModel = localStorage.getItem('gemini_model') || 'gemini-3.5-flash';
    const activeModelLabel = `Análise multimodal (${activeModel})`;

    updateSession({
      status: 'processing',
      error: null,
      debugData: null,
      pipelineSteps: [
        { id: 1, label: 'Carregamento do folheto', status: 'completed', details: '✓ Imagem recebida com sucesso e pronta para análise.' },
        { id: 2, label: 'Transmissão segura para a IA', status: 'processing', details: 'Transmitindo imagem do folheto para processamento...' },
        { id: 3, label: activeModelLabel, status: 'pending', details: 'Aguardando...' },
        { id: 4, label: 'Extração estruturada e Mapeamento de Coordenadas', status: 'pending', details: 'Aguardando...' },
        { id: 5, label: 'Normalização canônica e validação do lote', status: 'pending', details: 'Aguardando...' }
        ]
      });

      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
      const startTimeTotal = Date.now();

    try {
      await delay(400);
      
      updateSession({
        pipelineSteps: [
          { id: 1, label: 'Carregamento do folheto', status: 'completed', details: '✓ Imagem recebida.' },
          { id: 2, label: 'Transmissão segura para a IA', status: 'completed', details: '✓ Transmissão de bytes concluída.' },
          { id: 3, label: activeModelLabel, status: 'processing', details: `O modelo ${activeModel} está analisando os elementos visuais, textos e preços...` },
          { id: 4, label: 'Extração estruturada e Mapeamento de Coordenadas', status: 'pending', details: 'Aguardando...' },
          { id: 5, label: 'Normalização canônica e validação do lote', status: 'pending', details: 'Aguardando...' }
        ]
      });

      const apiPromise = await fetch('/api/process-flyer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: selectedFile,
          marketId,
          cityName: CITIES.find(c => c.id === cityId)?.name || APP_CONFIG.defaultCityShort,
          startDate,
          endDate,
          observations,
          geminiModel: activeModel
        })
      });

      const data = await apiPromise.json();

      if (!apiPromise.ok) {
        throw new Error(data.error || 'Falha na consolidação inteligente do folheto.');
      }

      const stats = data.stats || { ocrWordsFound: 0, pricesIdentified: 0, candidatesGrouped: 0, geminiNormalized: 0, geminiUsed: false };

      updateSession({
        pipelineSteps: [
          { id: 1, label: 'Carregamento do folheto', status: 'completed', details: '✓ Imagem recebida.' },
          { id: 2, label: 'Transmissão segura para a IA', status: 'completed', details: '✓ Transmissão de bytes concluída.' },
          { id: 3, label: activeModelLabel, status: 'completed', details: `✓ Análise com ${data.modelUsed || activeModel} concluída.` },
          { id: 4, label: 'Extração estruturada e Mapeamento de Coordenadas', status: 'processing', details: 'Mapeando coordenadas espaciais das ofertas...' },
          { id: 5, label: 'Normalização canônica e validação do lote', status: 'pending', details: 'Aguardando...' }
        ]
      });

      await delay(500);

      updateSession({
        pipelineSteps: [
          { id: 1, label: 'Carregamento do folheto', status: 'completed', details: '✓ Imagem recebida.' },
          { id: 2, label: 'Transmissão segura para a IA', status: 'completed', details: '✓ Transmissão de bytes concluída.' },
          { id: 3, label: 'Análise multimodal Gemini Flash Vision', status: 'completed', details: '✓ Análise multimodal Gemini Flash Vision concluída.' },
          { id: 4, label: 'Extração estruturada e Mapeamento de Coordenadas', status: 'completed', details: `✓ Coordenadas espaciais mapeadas com sucesso (${data.offers.length} ofertas com caixas delimitadoras).` },
          { id: 5, label: 'Normalização canônica e validação do lote', status: 'processing', details: 'Cruzando com o catálogo de produtos canônicos...' }
        ]
      });

      await delay(500);

      // Intelligent Establishment Matching
      let resolvedMarketId = marketId;
      let detectedNewMarketObj = null;

      if (data.detectedEstablishment && data.detectedEstablishment.name) {
        const detectedName = data.detectedEstablishment.name;
        const cleanStr = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
        const cleanedDetected = cleanStr(detectedName);

        // Search in current live markets
        let foundMarket = markets.find(m => {
          const cleanedName = cleanStr(m.name);
          return cleanedDetected.includes(cleanedName) || cleanedName.includes(cleanedDetected);
        });

        if (!foundMarket) {
          // Token similarity check
          const getTokens = (s: string) => cleanStr(s).split(/\s+/).filter(Boolean);
          const detTokens = getTokens(detectedName);
          for (const m of markets) {
            const mTokens = getTokens(m.name);
            const intersection = detTokens.filter(t => mTokens.includes(t));
            const union = Array.from(new Set([...detTokens, ...mTokens]));
            const score = union.length > 0 ? (intersection.length / union.length) : 0;
            if (score >= 0.50) {
              foundMarket = m;
              break;
            }
          }
        }

        if (foundMarket) {
          resolvedMarketId = foundMarket.id;
          console.log(`[Pipeline Auto-match] Matched detected establishment "${detectedName}" to registered market "${foundMarket.name}" (ID: ${foundMarket.id})`);
        } else {
          // Flag that a potential new market was found
          detectedNewMarketObj = data.detectedEstablishment;
        }
      }

      updateSession({
        pipelineSteps: [
          { id: 1, label: 'Carregamento do folheto', status: 'completed', details: '✓ Imagem recebida.' },
          { id: 2, label: 'Transmissão segura para a IA', status: 'completed', details: '✓ Transmissão de bytes concluída.' },
          { id: 3, label: 'Análise multimodal Gemini Flash Vision', status: 'completed', details: '✓ Análise multimodal Gemini Flash Vision concluída.' },
          { id: 4, label: 'Extração estruturada e Mapeamento de Coordenadas', status: 'completed', details: `✓ Coordenadas espaciais mapeadas.` },
          { id: 5, label: 'Normalização canônica e validação do lote', status: 'completed', details: `✓ Normalização canônica concluída (${stats.geminiNormalized} de ${data.offers.length} ofertas vinculadas automaticamente).` }
        ],
        status: 'completed',
        uploadedFlyer: data.flyer ? { ...data.flyer, marketId: resolvedMarketId } : null,
        extractedOffers: data.offers.map((o: any) => ({ ...o, marketId: resolvedMarketId })),
        selectedOffer: data.offers.length > 0 ? data.offers[0] : null,
        marketId: resolvedMarketId,
        detectedNewMarket: detectedNewMarketObj,
        debugData: {
          originalImage: selectedFile,
          preprocessedImage: selectedFile,
          rawText: `Extração Visual Gemini Vision Multimodal. Foram encontradas ${data.offers.length} ofertas diretamente na imagem original de forma inteligente.`,
          promptSent: data.debug?.promptSent || 'Prompt gerado dinamicamente com instruções estritas.',
          rawResponse: data.debug?.rawResponse || 'Resposta em formato JSON estruturado com coordenadas espaciais.',
          finalOffersCount: data.offers?.length || 0,
          stats,
          durationSeconds: ((Date.now() - startTimeTotal) / 1000).toFixed(1)
        }
      });

      if (data.flyer) {
        const start = data.flyer.startDate && data.flyer.startDate !== 'Invalid Date' ? data.flyer.startDate : '';
        const end = data.flyer.endDate && data.flyer.endDate !== 'Invalid Date' ? data.flyer.endDate : '';
        updateSession({
          startDate: start || end,
          endDate: end || start
        });
      }

    } catch (err: any) {
      console.error('[Upload Pipeline Error]', err);
      
      updateSession({
        status: 'failed',
        error: err.message || 'Erro de conexão ou timeout na análise inteligente.',
        debugData: {
          originalImage: selectedFile,
          rawText: 'Erro durante análise multimodal Gemini Flash Vision.',
          finalOffersCount: 0,
          durationSeconds: ((Date.now() - startTimeTotal) / 1000).toFixed(1),
          rawResponse: `FALHA NO PIPELINE: ${err.message || err}`
        },
        pipelineSteps: [
          { id: 1, label: 'Carregamento do folheto', status: 'completed' },
          { id: 2, label: 'Transmissão segura para a IA', status: 'completed' },
          { id: 3, label: 'Análise multimodal Gemini Flash Vision', status: 'failed', details: `Erro: ${err.message || 'Falha de comunicação'}` },
          { id: 4, label: 'Extração estruturada e Mapeamento de Coordenadas', status: 'pending' },
          { id: 5, label: 'Normalização canônica e validação do lote', status: 'pending' }
        ]
      });
    }
  };

  const handleConfirmAndSave = () => {
    if (!uploadedFlyer) return;
    
    // Clean and validate dates
    let finalStart = startDate || uploadedFlyer.startDate;
    let finalEnd = endDate || uploadedFlyer.endDate;

    if (!finalStart || finalStart === 'Invalid Date') {
      finalStart = finalEnd && finalEnd !== 'Invalid Date' ? finalEnd : new Date().toISOString().split('T')[0];
    }
    if (!finalEnd || finalEnd === 'Invalid Date') {
      finalEnd = finalStart && finalStart !== 'Invalid Date' ? finalStart : new Date().toISOString().split('T')[0];
    }

    // Double check single-day equality
    if (finalStart !== finalEnd && (!finalStart || !finalEnd)) {
      if (finalStart) finalEnd = finalStart;
      if (finalEnd) finalStart = finalEnd;
    }

    const flyerToSave: Flyer = {
      ...uploadedFlyer,
      startDate: finalStart,
      endDate: finalEnd,
      linkOriginal: originalFile || selectedFile || undefined
    };

    onAddFlyerAndOffers(flyerToSave, extractedOffers);
    
    // Reset page states
    updateSession({
      selectedFile: null,
      originalFile: null,
      status: 'idle',
      marketId: 'm-lopes',
      cityId: 'sao-gotardo',
      startDate: '',
      endDate: '',
      observations: '',
      error: null,
      uploadedFlyer: null,
      extractedOffers: [],
      selectedOffer: null,
      debugData: null,
      pipelineSteps: [
        { id: 1, label: 'Carregamento do folheto', status: 'pending', details: 'Aguardando...' },
        { id: 2, label: 'Transmissão segura para a IA', status: 'pending', details: 'Aguardando...' },
        { id: 3, label: 'Análise multimodal Gemini Flash Vision', status: 'pending', details: 'Aguardando...' },
        { id: 4, label: 'Extração estruturada e Mapeamento de Coordenadas', status: 'pending', details: 'Aguardando...' },
        { id: 5, label: 'Normalização canônica e validação do lote', status: 'pending', details: 'Aguardando...' }
      ],
      detectedNewMarket: null
    });
  };

  const handleRegisterNewMarket = async () => {
    if (!newMarketForm.name) {
      alert('Por favor, preencha o nome do estabelecimento.');
      return;
    }

    try {
      const targetId = `m-custom-${Date.now()}`;
      const payload: Market = {
        id: targetId,
        name: newMarketForm.name,
        tradeName: newMarketForm.name,
        cnpj: newMarketForm.cnpj || '',
        address: newMarketForm.address || '',
        phone: newMarketForm.phone || '',
        businessHours: newMarketForm.businessHours || '',
        socialMedia: newMarketForm.socialMedia || '',
        additionalInfo: newMarketForm.additionalInfo || '',
        cityId: 'sao-gotardo',
        marketType: newMarketForm.marketType || 'supermercado',
        logoUrl: ''
      };

      await FirestoreRepository.saveMarket(targetId, payload);
      queryClient.invalidateQueries({ queryKey: ['markets'] });
      
      // Auto-select the newly registered market
      updateSession({
        marketId: targetId,
        detectedNewMarket: null,
        uploadedFlyer: uploadedFlyer ? { ...uploadedFlyer, marketId: targetId } : null,
        extractedOffers: extractedOffers.map((o: any) => ({ ...o, marketId: targetId }))
      });

      alert(`Estabelecimento "${payload.name}" cadastrado e selecionado com sucesso!`);
    } catch (err: any) {
      console.error('Failed to register detected establishment:', err);
      alert(`Erro ao cadastrar estabelecimento: ${err.message}`);
    }
  };

  const currentMarket = markets.find((m: any) => m.id === marketId) || markets[0] ;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-sans font-bold tracking-tight text-slate-900">
          Módulo de Upload de Folhetos
        </h1>
        <p className="text-slate-500 mt-1">
          Adicione novos folhetos, configure metadados e acione o processador de OCR espacial
        </p>
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1: File selection & metadata form */}
        {status !== 'processing' && !uploadedFlyer && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Left: File drop area */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4 flex flex-col h-full justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-800 mb-1">Selecionar Imagem do Folheto</h3>
                  <p className="text-xs text-slate-400">Arraste a foto do panfleto ou utilize o folheto demonstrativo da cidade</p>
                </div>

                {!selectedFile ? (
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    className={`flex-1 border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center gap-3 transition-colors min-h-[300px] ${
                      dragActive ? 'border-indigo-500 bg-indigo-50/20' : 'border-slate-200 bg-slate-50/40 hover:bg-slate-50/80'
                    }`}
                  >
                    <UploadCloud className="w-12 h-12 text-slate-400" />
                    <div className="text-center">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer"
                      >
                        Clique para carregar
                      </button>
                      <span className="text-xs text-slate-400"> ou arraste e solte</span>
                    </div>
                    <p className="text-[10px] text-slate-400">Formatos aceitos: JPG, PNG • Tamanho máximo: 10MB</p>
                    
                    <div className="mt-4 pt-4 border-t border-slate-100 w-full flex justify-center">
                      <button
                        onClick={handleUseDemo}
                        id="btn-demo-flyer"
                        className="px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-xs rounded-xl border border-indigo-100 transition-all cursor-pointer flex items-center gap-2"
                      >
                        <ImageIcon className="w-3.5 h-3.5" /> Utilizar Imagem Demonstrativa de {APP_CONFIG.defaultCityShort}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 rounded-2xl border border-slate-100 bg-slate-50 relative p-4 flex flex-col items-center justify-center min-h-[300px]">
                    <img
                      src={selectedFile}
                      alt="Preview do panfleto"
                      className="max-h-64 object-contain rounded-lg shadow-sm border border-slate-100"
                    />
                    <div className="absolute top-4 right-4 flex gap-2">
                      <button
                        onClick={() => updateSession({ selectedFile: null, originalFile: null })}
                        className="p-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow"
                      >
                        Remover
                      </button>
                    </div>
                    <p className="text-slate-400 text-[10px] font-mono mt-3 flex items-center gap-1">
                      <FileImage className="w-3 h-3" /> Imagem carregada com sucesso
                    </p>
                  </div>
                )}

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
              </div>
            </div>

            {/* Right: Metadata Form */}
            <div className="space-y-4">
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <h3 className="text-base font-bold text-slate-800 border-b border-slate-50 pb-2 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-500" /> Metadados do Folheto
                </h3>

                {/* Market input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 block uppercase">Estabelecimento</label>
                  <select
                    value={marketId}
                    onChange={(e) => updateSession({ marketId: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700"
                  >
                    {markets.map((m: any) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>

                {/* Validity Period */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 block uppercase">Válido De</label>
                    <div className="relative">
                      <input
                        type="date"
                        value={startDate === 'Invalid Date' ? '' : startDate}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateSession({ 
                            startDate: val,
                            // If end date is empty or invalid, set it to start date to handle single-day offers nicely
                            endDate: !endDate || endDate === 'Invalid Date' ? val : endDate
                          });
                        }}
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl outline-none text-slate-600 font-bold"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 block uppercase">Válido Até</label>
                    <div className="relative">
                      <input
                        type="date"
                        value={endDate === 'Invalid Date' ? '' : endDate}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateSession({ 
                            endDate: val,
                            // If start date is empty or invalid, set it to end date to handle single-day offers nicely
                            startDate: !startDate || startDate === 'Invalid Date' ? val : startDate
                          });
                        }}
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl outline-none text-slate-600 font-bold"
                      />
                    </div>
                  </div>
                </div>

                {/* Observations */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 block uppercase">Observações do Envio</label>
                  <textarea
                    rows={3}
                    placeholder="Adicione notas do lote (ex: Encarte extra de Hortifrúti, panfleto entregue na praça, etc.)"
                    value={observations}
                    onChange={(e) => updateSession({ observations: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-600 font-medium"
                  />
                </div>

                {error && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-700 text-xs font-semibold leading-relaxed">
                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Run trigger */}
                <button
                  disabled={!selectedFile}
                  onClick={handleUploadAndProcess}
                  className={`w-full py-3 rounded-xl font-bold text-sm cursor-pointer transition-all duration-200 shadow-md flex items-center justify-center gap-2 ${
                    selectedFile
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200 shadow-none'
                  }`}
                >
                  <Sparkles className="w-4 h-4" /> Processar Panfleto com OCR
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 2: Processing progress animation screen */}
        {status === 'processing' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="bg-white p-10 rounded-3xl border border-slate-100 shadow-sm text-center max-w-xl mx-auto space-y-6 py-12"
          >
            <div className="relative flex items-center justify-center">
              {error ? (
                <div className="w-16 h-16 bg-rose-50 border-2 border-rose-200 rounded-full flex items-center justify-center text-rose-500 animate-pulse">
                  <AlertTriangle className="w-8 h-8" />
                </div>
              ) : (
                <>
                  <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                  <Sparkles className="w-6 h-6 text-indigo-500 absolute animate-pulse" />
                </>
              )}
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-slate-800">
                {error ? 'Falha no Processamento' : 'Processando Folheto de Preços'}
              </h3>
              <p className="text-xs text-slate-400">
                {error ? 'Ocorreu um erro ao executar uma das etapas do pipeline' : 'Acompanhe as etapas de leitura OCR e normalização inteligente'}
              </p>
            </div>

            {/* Steps progression visual */}
            <div className="space-y-4 max-w-md mx-auto bg-slate-50 p-5 rounded-2xl border border-slate-100 text-left">
              {pipelineSteps.map((step) => {
                const isPending = step.status === 'pending';
                const isProcessingStep = step.status === 'processing';
                const isCompleted = step.status === 'completed';
                const isFailed = step.status === 'failed';

                return (
                  <div key={step.id} className="space-y-1">
                    <div className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 transition-colors ${
                        isCompleted 
                          ? 'bg-emerald-500 text-white' 
                          : step.status === 'processing'
                          ? 'bg-indigo-600 text-white animate-pulse' 
                          : isFailed 
                          ? 'bg-rose-500 text-white' 
                          : 'bg-slate-200 text-slate-500'
                      }`}>
                        {isCompleted ? '✓' : isFailed ? '×' : step.id}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <span className={`text-xs font-bold block transition-colors ${
                          step.status === 'processing' 
                            ? 'text-indigo-600' 
                            : isCompleted 
                            ? 'text-slate-700' 
                            : isFailed 
                            ? 'text-rose-600' 
                            : 'text-slate-400'
                        }`}>
                          {step.label}
                        </span>
                        {step.details && (
                          <p className={`text-[10px] leading-tight font-medium mt-0.5 ${
                            isFailed 
                              ? 'text-rose-500' 
                              : step.status === 'processing'
                              ? 'text-indigo-400' 
                              : 'text-slate-500'
                          }`}>
                            {step.details}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Dismiss / Retry button on failure */}
            {error && (
              <div className="pt-2">
                <button
                  onClick={() => {
                    updateSession({ status: 'idle', error: null });
                  }}
                  className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-rose-200 cursor-pointer"
                >
                  Fechar e Tentar Novamente
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* Step 3: Interactive Spatial Overlay Mapped View */}
        {status !== 'processing' && uploadedFlyer && (
          <DashboardUploadAudit
            uploadedFlyer={uploadedFlyer}
            extractedOffers={extractedOffers}
            selectedOffer={selectedOffer}
            originalFile={originalFile}
            selectedFile={selectedFile}
            markets={markets}
            canonicalProducts={canonicalProducts}
            categories={categories}
            updateSession={updateSession}
            handleConfirmAndSave={handleConfirmAndSave}
            handleAddManualOffer={handleAddManualOffer}
            debugData={debugData}
          />
        )}
      </AnimatePresence>

      {/* Establishment Registration Assistant Modal */}
      <AnimatePresence>
        {detectedNewMarket && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl max-w-xl w-full border border-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex justify-between items-center bg-indigo-50 border-b border-indigo-100 px-6 py-4">
                <div className="flex items-center gap-2">
                  <Store className="w-5 h-5 text-indigo-600" />
                  <div>
                    <h3 className="font-sans font-bold text-slate-800 text-xs">Assistente Inteligente de Cadastro</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Identificamos um estabelecimento não cadastrado neste folheto</p>
                  </div>
                </div>
                <button
                  onClick={() => updateSession({ detectedNewMarket: null })}
                  className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl font-semibold flex items-start gap-2 leading-relaxed">
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <span>
                    A IA detectou o estabelecimento <strong>"{detectedNewMarket.name}"</strong>, mas ele não consta na base de dados de {APP_CONFIG.defaultCityShort}. Confirme ou altere os dados extraídos abaixo para cadastrá-lo.
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 block uppercase">Razão Social / Nome Fantasia *</label>
                    <input
                      type="text"
                      value={newMarketForm.name}
                      onChange={(e) => setNewMarketForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-indigo-500 font-bold text-slate-800"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 block uppercase">CNPJ (Opcional)</label>
                      <input
                        type="text"
                        placeholder="Ex: 00.000.000/0000-00"
                        value={newMarketForm.cnpj}
                        onChange={(e) => setNewMarketForm(prev => ({ ...prev, cnpj: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-indigo-500 text-slate-600"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 block uppercase">Tipo de Loja</label>
                      <select
                        value={newMarketForm.marketType}
                        onChange={(e) => setNewMarketForm(prev => ({ ...prev, marketType: e.target.value as any }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-indigo-500 text-slate-600 font-bold"
                      >
                        <option value="supermercado">Supermercado / Hiper</option>
                        <option value="atacarejo">Atacarejo</option>
                        <option value="hortifruti">Hortifrúti / Sacolão</option>
                        <option value="padaria">Padaria / Confeitaria</option>
                        <option value="farmacia">Drogaria / Farmácia</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 block uppercase">Endereço Extraído</label>
                    <input
                      type="text"
                      placeholder="Ex: Av. Rui Barbosa, 120"
                      value={newMarketForm.address}
                      onChange={(e) => setNewMarketForm(prev => ({ ...prev, address: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-indigo-500 text-slate-600"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 block uppercase">Telefone de Contato</label>
                      <input
                        type="text"
                        placeholder="Ex: (34) 3671-1000"
                        value={newMarketForm.phone}
                        onChange={(e) => setNewMarketForm(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-indigo-500 text-slate-600"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 block uppercase">Horário de Funcionamento</label>
                      <input
                        type="text"
                        placeholder="Ex: Seg a Sáb: 07h às 21h"
                        value={newMarketForm.businessHours}
                        onChange={(e) => setNewMarketForm(prev => ({ ...prev, businessHours: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-indigo-500 text-slate-600"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 block uppercase">Mídias Sociais / WhatsApp</label>
                    <input
                      type="text"
                      placeholder="Ex: @supermercadolopes, (34) 99999-9999"
                      value={newMarketForm.socialMedia}
                      onChange={(e) => setNewMarketForm(prev => ({ ...prev, socialMedia: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-indigo-500 text-slate-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 block uppercase">Informações Adicionais / Observações</label>
                    <input
                      type="text"
                      placeholder="Ex: Aceita vale alimentação, estacionamento próprio"
                      value={newMarketForm.additionalInfo}
                      onChange={(e) => setNewMarketForm(prev => ({ ...prev, additionalInfo: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-indigo-500 text-slate-600"
                    />
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                <button
                  onClick={() => updateSession({ detectedNewMarket: null })}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Descartar / Não Cadastrar
                </button>
                <button
                  onClick={handleRegisterNewMarket}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-500/15 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Cadastrar Estabelecimento
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
