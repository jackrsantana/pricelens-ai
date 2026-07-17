import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Flyer, Offer, Market, CanonicalProduct, Category } from '../types';
import CropEditorModal from "./CropEditorModal";
import { CropIcon, Scissors } from "lucide-react";
import { 
  CheckCircle2, AlertTriangle, Eye, Copy, Sparkles, Filter, Search, 
  ChevronRight, ZoomIn, ZoomOut, Maximize, ArrowRight, Save, Trash2, 
  RotateCcw, MousePointerClick, History, FileText, ChevronDown, ChevronUp, Map as MapIcon, Database, CheckSquare, ListPlus, ArrowUp, ArrowDown, Activity, Info
} from 'lucide-react';
import { APP_CONFIG } from '../config/app';

interface Props {
  uploadedFlyer: Flyer;
  extractedOffers: Offer[];
  selectedOffer: Offer | null;
  originalFile: string | null;
  selectedFile: string | null;
  markets: Market[];
  canonicalProducts: CanonicalProduct[];
  categories: Category[];
  updateSession: (fields: any) => void;
  handleConfirmAndSave: () => void;
  handleAddManualOffer: () => void;
  debugData: any;
}

export default function DashboardUploadAudit(props: Props) {
  const {
    uploadedFlyer, extractedOffers, selectedOffer, originalFile, selectedFile,
    markets, canonicalProducts, categories, updateSession, handleConfirmAndSave,
    handleAddManualOffer, debugData
  } = props;

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [autoZoom, setAutoZoom] = useState(true);
  const [debugExpanded, setDebugExpanded] = useState(false);
  const [historyStack, setHistoryStack] = useState<Offer[][]>([]);
  
  const [cropMode, setCropMode] = useState<'none' | 'new' | 'edit'>('none');
  const [isProcessingCrop, setIsProcessingCrop] = useState(false);

    const handleProcessCrop = async (percentCrop: { x: number, y: number, width: number, height: number }, croppedBase64: string) => {
    setIsProcessingCrop(true);
    try {
      if (cropMode === 'edit' && selectedOffer) {
        // Just update the crop region without running OCR again
        const updatedOffer = {
          ...selectedOffer,
          boundingBox: percentCrop,
          croppedImageUrl: croppedBase64,
          status: 'reviewed' as const,
          processingTimestamp: new Date().toISOString()
        };
        updateSession({
          extractedOffers: extractedOffers.map(o => o.id === selectedOffer.id ? updatedOffer : o),
          selectedOffer: updatedOffer
        });
      } else {
        // Add new manual offer, run OCR
        const activeModel = localStorage.getItem('gemini_model') || 'gemini-3.5-flash';
        const apiPromise = await fetch('/api/process-crop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: croppedBase64, geminiModel: activeModel })
        });
        const data = await apiPromise.json();
        if (!apiPromise.ok) throw new Error(data.error || 'Falha ao processar recorte');
        
        const newOffer: Offer = {
          id: `manual-${Date.now()}`,
          flyerId: uploadedFlyer.id,
          pageNum: 1,
          marketId: uploadedFlyer.marketId,
          originalName: data.originalName || 'Novo Produto',
          price: data.price || 0,
          previousPrice: data.previousPrice,
          unit: data.unit || 'un',
          confidence: data.confidence || 90,
          boundingBox: percentCrop,
          productCanonicalId: data.productCanonicalId,
          promotionType: data.promotionType || 'Normal',
          status: 'reviewed',
          modelUsed: activeModel,
          processingTimestamp: new Date().toISOString(),
          originalAiResponse: data.originalAiResponse || 'Recorte manual processado',
          croppedImageUrl: croppedBase64
        };

        updateSession({
          extractedOffers: [newOffer, ...extractedOffers],
          selectedOffer: newOffer
        });
      }
    } catch (err: any) {
      alert(`Erro ao analisar recorte: ${err.message}`);
    } finally {
      setIsProcessingCrop(false);
      setCropMode('none');
    }
  };


  // Track history for undo
  useEffect(() => {
    if (historyStack.length === 0 || JSON.stringify(historyStack[historyStack.length - 1]) !== JSON.stringify(extractedOffers)) {
      setHistoryStack(prev => [...prev, extractedOffers].slice(-20)); // Keep last 20 states
    }
  }, [extractedOffers]);

  const handleUndo = () => {
    if (historyStack.length > 1) {
      const newStack = [...historyStack];
      newStack.pop(); // remove current state
      const previousState = newStack[newStack.length - 1];
      setHistoryStack(newStack);
      updateSession({ extractedOffers: previousState });
    }
  };

  const filteredOffers = useMemo(() => {
    return extractedOffers.filter(o => {
      const matchSearch = o.originalName.toLowerCase().includes(search.toLowerCase());
      const matchFilter = filter === 'all' || 
                         (filter === 'pending' && o.status !== 'reviewed') ||
                         (filter === 'low_confidence' && o.confidence < 85);
      return matchSearch && matchFilter;
    });
  }, [extractedOffers, search, filter]);

  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedOffer && listRef.current) {
      const el = document.getElementById(`offer-item-${selectedOffer.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [selectedOffer?.id]);

  const handleUpdateOffer = (updated: Offer) => {
    updateSession({
      extractedOffers: extractedOffers.map(o => o.id === updated.id ? updated : o),
      selectedOffer: updated.id === selectedOffer?.id ? updated : selectedOffer
    });
  };

  const handleMarkAuditedAndNext = () => {
    if (!selectedOffer) return;
    const updated = { ...selectedOffer, status: 'reviewed' as const };
    const newOffers = extractedOffers.map(o => o.id === updated.id ? updated : o);
    
    const currentIndex = filteredOffers.findIndex(o => o.id === selectedOffer.id);
    let nextOffer = null;
    for (let i = currentIndex + 1; i < filteredOffers.length; i++) {
      if (filteredOffers[i].status !== 'reviewed') {
        nextOffer = filteredOffers[i];
        break;
      }
    }
    if (!nextOffer && currentIndex + 1 < filteredOffers.length) {
      nextOffer = filteredOffers[currentIndex + 1];
    }

    updateSession({
      extractedOffers: newOffers,
      selectedOffer: nextOffer || updated
    });
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isInput = activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA' || activeElement?.tagName === 'SELECT';
      
      if (e.ctrlKey && e.key === 'z' && !isInput) {
        e.preventDefault();
        handleUndo();
      }
      
      if (!selectedOffer) return;

      if (e.key === 'ArrowDown' && !isInput) {
        e.preventDefault();
        const idx = filteredOffers.findIndex(o => o.id === selectedOffer.id);
        if (idx < filteredOffers.length - 1) updateSession({ selectedOffer: filteredOffers[idx + 1] });
      }
      if (e.key === 'ArrowUp' && !isInput) {
        e.preventDefault();
        const idx = filteredOffers.findIndex(o => o.id === selectedOffer.id);
        if (idx > 0) updateSession({ selectedOffer: filteredOffers[idx - 1] });
      }
      if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        handleMarkAuditedAndNext();
      } else if (e.key === 'Enter' && !isInput) {
        e.preventDefault();
        handleUpdateOffer({ ...selectedOffer, status: 'reviewed' });
      }
      if (e.key === 'Delete' && !isInput) {
        e.preventDefault();
        const remaining = extractedOffers.filter((o: Offer) => o.id !== selectedOffer.id);
        updateSession({
          extractedOffers: remaining,
          selectedOffer: remaining.length > 0 ? remaining[0] : null
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedOffer, filteredOffers, historyStack, extractedOffers]);

  // Batch actions
  const handleAuditAll = () => {
    updateSession({
      extractedOffers: extractedOffers.map(o => ({ ...o, status: 'reviewed' }))
    });
  };

  const transformStyle = selectedOffer && autoZoom ? {
    transformOrigin: `${selectedOffer.boundingBox.x + selectedOffer.boundingBox.width/2}% ${selectedOffer.boundingBox.y + selectedOffer.boundingBox.height/2}%`,
    transform: `scale(2.5)`,
    transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), transform-origin 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
  } : {
    transformOrigin: '50% 50%',
    transform: 'scale(1)',
    transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), transform-origin 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
  };

  const auditedCount = extractedOffers.filter(o => o.status === 'reviewed').length;
  const pendingCount = extractedOffers.length - auditedCount;
  const progressPercent = extractedOffers.length > 0 ? Math.round((auditedCount / extractedOffers.length) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* 1. Timeline & Progress Steps */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between overflow-x-auto">
        <div className="flex items-center space-x-2 md:space-x-4 min-w-max">
          <Step label="Upload" active={false} completed={true} />
          <Line completed={true} />
          <Step label="OCR Espacial" active={false} completed={true} />
          <Line completed={true} />
          <Step label="IA & Normalização" active={false} completed={true} />
          <Line completed={true} />
          <Step label="Auditoria" active={true} completed={false} />
          <Line completed={false} />
          <Step label="Banco de Dados" active={false} completed={false} />
        </div>
      </div>

      {/* 2. Audit Progress Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-4">
        <div className="w-full md:w-1/3 space-y-1">
          <div className="flex justify-between text-xs font-bold text-slate-700">
            <span>Progresso da Auditoria</span>
            <span className="text-indigo-600">{progressPercent}%</span>
          </div>
          <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
          </div>
        </div>
        <div className="flex-1 flex gap-4 text-xs">
          <StatBox label="Total" value={extractedOffers.length} color="text-slate-700" />
          <StatBox label="Auditados" value={auditedCount} color="text-emerald-600" />
          <StatBox label="Pendentes" value={pendingCount} color="text-amber-600" />
        </div>
        <div className="flex gap-2">
           <button onClick={handleAuditAll} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1">
             <CheckSquare className="w-3.5 h-3.5" /> Auditar Todos
           </button>
           <button onClick={handleConfirmAndSave} className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shadow-md shadow-indigo-200">
             <Database className="w-3.5 h-3.5" /> Salvar Folheto
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-320px)] min-h-[600px]">
        
        {/* LEFT: Product List (3 cols) */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-100 shadow-sm flex flex-col overflow-hidden">
          <div className="p-3 border-b border-slate-100 space-y-3 bg-slate-50">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input 
                type="text" 
                placeholder="Pesquisar oferta..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
              />
            </div>
            <div className="flex overflow-x-auto gap-1 pb-1 scrollbar-hide">
              <FilterChip label="Todos" active={filter === 'all'} onClick={() => setFilter('all')} />
              <FilterChip label="Pendentes" active={filter === 'pending'} onClick={() => setFilter('pending')} />
              <FilterChip label="Auditados" active={filter === 'audited'} onClick={() => setFilter('audited')} />
              <FilterChip label="Baixa Conf." active={filter === 'low_confidence'} onClick={() => setFilter('low_confidence')} />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1" ref={listRef}>
            {filteredOffers.map((o) => {
              const isSelected = selectedOffer?.id === o.id;
              const isAudited = o.status === 'reviewed';
              const isLowConf = o.confidence < 80;
              
              return (
                <div 
                  key={o.id}
                  id={`offer-item-${o.id}`}
                  onClick={() => updateSession({ selectedOffer: o })}
                  className={`p-2.5 rounded-lg cursor-pointer border transition-all ${
                    isSelected ? 'bg-indigo-50 border-indigo-300 ring-1 ring-indigo-200 shadow-sm' 
                    : isAudited ? 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50 opacity-70' 
                    : 'bg-white border-slate-200 hover:border-indigo-100 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-bold text-slate-800 line-clamp-1 pr-2">{o.originalName}</span>
                    <span className="text-xs font-extrabold text-indigo-700 whitespace-nowrap">R$ {o.price.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1.5">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${isAudited ? 'bg-emerald-500' : isLowConf ? 'bg-rose-500' : 'bg-amber-400'}`}></div>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {isAudited ? 'Auditado' : 'Revisar'}
                      </span>
                    </div>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${isLowConf ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-500'}`}>
                      {o.confidence}% IA
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* MIDDLE: Image View (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-100 shadow-sm flex flex-col overflow-hidden relative">
          <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50 z-20">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1"><Eye className="w-4 h-4 text-slate-400"/> Visão Espacial</h3>
              <button 
                onClick={() => setCropMode('new')}
                className="ml-2 px-2 py-1 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded text-[10px] font-bold flex items-center gap-1 transition-colors"
              >
                <Scissors className="w-3 h-3" />
                Novo Recorte
              </button>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 cursor-pointer">
                <input type="checkbox" checked={autoZoom} onChange={e => setAutoZoom(e.target.checked)} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                Zoom Automático
              </label>
              <button onClick={() => setAutoZoom(!autoZoom)} className="p-1 hover:bg-slate-200 rounded text-slate-500">
                {autoZoom ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
              </button>
            </div>
          </div>
          
          <div className="flex-1 bg-slate-200 overflow-hidden relative flex items-center justify-center">
            {/* The Image Canvas */}
            <div className="relative w-full h-full flex items-center justify-center" style={{ overflow: 'hidden' }}>
              <div style={{ ...transformStyle, width: '100%', height: '100%', position: 'relative' }}>
                <img src={selectedFile || ''} className="absolute inset-0 w-full h-full object-contain pointer-events-none" alt="Flyer" />
                
                {/* Bounding boxes */}
                {extractedOffers.map((o) => {
                  const isSelected = selectedOffer?.id === o.id;
                  const isAudited = o.status === 'reviewed';
                  
                  return (
                    <div
                      key={o.id}
                      onClick={() => updateSession({ selectedOffer: o })}
                      style={{
                        position: 'absolute',
                        left: `${o.boundingBox.x}%`,
                        top: `${o.boundingBox.y}%`,
                        width: `${o.boundingBox.width}%`,
                        height: `${o.boundingBox.height}%`,
                      }}
                      className={`border-[1.5px] cursor-pointer transition-all ${
                        isSelected ? 'bg-indigo-500/20 border-indigo-600 ring-1 ring-white z-20 shadow-[0_0_15px_rgba(79,70,229,0.5)]' 
                        : isAudited ? 'bg-emerald-500/10 border-emerald-400 z-10'
                        : 'bg-amber-400/20 border-amber-400 hover:bg-amber-300/40 z-10'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute -top-5 left-0 bg-indigo-600 text-white text-[6px] px-1 py-0.5 rounded whitespace-nowrap font-bold">
                          R$ {o.price.toFixed(2)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Minimap (Bottom Left) */}
            {selectedOffer && (
              <div className="absolute bottom-4 left-4 w-24 h-32 bg-white/90 backdrop-blur border border-slate-200 shadow-lg rounded-lg p-1 z-30 pointer-events-none hidden md:block">
                <div className="relative w-full h-full">
                  <img src={selectedFile || ''} className="w-full h-full object-contain opacity-50" alt="Minimap" />
                  <div 
                    className="absolute bg-indigo-600/40 border border-indigo-600 shadow-[0_0_0_9999px_rgba(255,255,255,0.4)]"
                    style={{
                      left: `${selectedOffer.boundingBox.x}%`,
                      top: `${selectedOffer.boundingBox.y}%`,
                      width: `${Math.max(selectedOffer.boundingBox.width, 5)}%`,
                      height: `${Math.max(selectedOffer.boundingBox.height, 5)}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Detail Editor (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-100 shadow-sm flex flex-col overflow-y-auto">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-800">Detalhes da Oferta</h3>
            {selectedOffer && (
              <div className="flex items-center gap-2">
                 <button 
                   onClick={() => setCropMode('edit')} 
                   className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition-colors flex items-center gap-1 text-[10px] font-bold" 
                   title="Ajustar Recorte"
                 >
                   <Scissors className="w-4 h-4" /> Ajustar Recorte
                 </button>
                 <button onClick={() => {
                   const remaining = extractedOffers.filter(o => o.id !== selectedOffer.id);
                   updateSession({ extractedOffers: remaining, selectedOffer: remaining[0] || null });
                 }} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded transition-colors" title="Excluir (Del)">
                   <Trash2 className="w-4 h-4" />
                 </button>
              </div>
            )}
          </div>
          
          <div className="p-4 flex-1 space-y-6">
            {!selectedOffer ? (
              <div className="text-center text-slate-400 py-10 flex flex-col items-center gap-2">
                <MousePointerClick className="w-8 h-8 opacity-50" />
                <p className="text-sm font-medium">Selecione uma oferta na lista ou na imagem para editar.</p>
              </div>
            ) : (
              <motion.div key={selectedOffer.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                
                {/* Status Toggle */}
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${selectedOffer.status === 'reviewed' ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                    <span className="text-xs font-bold text-slate-700">{selectedOffer.status === 'reviewed' ? 'Auditado' : 'Pendente de Revisão'}</span>
                  </div>
                  <button 
                    onClick={() => handleUpdateOffer({...selectedOffer, status: selectedOffer.status === 'reviewed' ? 'review_pending' : 'reviewed'})}
                    className={`text-[10px] font-bold px-2 py-1 rounded transition-colors ${
                      selectedOffer.status === 'reviewed' ? 'bg-slate-200 text-slate-600 hover:bg-slate-300' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                    }`}
                  >
                    {selectedOffer.status === 'reviewed' ? 'Desmarcar' : 'Marcar como Auditado'}
                  </button>
                </div>

                {/* Main Inputs */}
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Nome do Produto</label>
                    <input 
                      type="text" 
                      value={selectedOffer.originalName} 
                      onChange={e => handleUpdateOffer({...selectedOffer, originalName: e.target.value})}
                      className="w-full px-3 py-2 text-sm font-bold text-slate-800 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Preço (R$)</label>
                      <input 
                        type="number" step="0.01"
                        value={selectedOffer.price} 
                        onChange={e => handleUpdateOffer({...selectedOffer, price: parseFloat(e.target.value) || 0})}
                        className="w-full px-3 py-2 text-lg font-black text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Preço Ant. (R$)</label>
                      <input 
                        type="number" step="0.01"
                        value={selectedOffer.previousPrice || ''} 
                        placeholder="Nenhum"
                        onChange={e => handleUpdateOffer({...selectedOffer, previousPrice: e.target.value ? parseFloat(e.target.value) : undefined})}
                        className="w-full px-3 py-2 text-sm font-bold text-slate-500 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 line-through"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Associação Canônica</label>
                      <select 
                        value={selectedOffer.productCanonicalId || ''} 
                        onChange={e => handleUpdateOffer({...selectedOffer, productCanonicalId: e.target.value || undefined})}
                        className="w-full px-3 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Nenhuma (Produto Novo)</option>
                        {canonicalProducts.map(p => (
                          <option key={p.id} value={p.id}>{p.name} - {p.weightVolume}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Promoção</label>
                      <select 
                        value={selectedOffer.promotionType || 'Normal'} 
                        onChange={e => handleUpdateOffer({...selectedOffer, promotionType: e.target.value})}
                        className="w-full px-3 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="Normal">Normal</option>
                        <option value="Leve 3 Pague 2">Leve X Pague Y</option>
                        <option value="Clube Fidelidade">Fidelidade / Clube</option>
                        <option value="Desconto">Desconto Direto</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Extraction Comparison */}
                <div className="pt-2 border-t border-slate-100">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-2">Análise de Extração (Confiança: {selectedOffer.confidence}%)</h4>
                  <div className="grid grid-cols-1 gap-2">
                    <div className="flex flex-col bg-slate-50 p-2 rounded border border-slate-100">
                      <span className="text-[9px] text-slate-400 font-bold uppercase mb-0.5">Mapeamento Visual (OCR)</span>
                      <span className="text-xs font-medium text-slate-600 break-all">{selectedOffer.originalAiResponse || "Detectado visualmente na imagem"}</span>
                    </div>
                    <div className="flex flex-col bg-indigo-50 p-2 rounded border border-indigo-100">
                      <span className="text-[9px] text-indigo-400 font-bold uppercase mb-0.5">Tratamento IA</span>
                      <span className="text-xs font-medium text-indigo-900">{selectedOffer.originalName}</span>
                    </div>
                  </div>
                {/* Confidence Factors */}
                <div className="space-y-1.5">
                   <h4 className="text-[10px] font-bold text-slate-400 uppercase">Fatores de Confiança</h4>
                   <div className="flex flex-wrap gap-1.5">
                     {selectedOffer.price > 0 && <Badge color="emerald" label="Preço válido" />}
                     {selectedOffer.productCanonicalId ? <Badge color="emerald" label="Catálogo associado" /> : <Badge color="amber" label="Sem associação" />}
                     {selectedOffer.confidence >= 90 ? <Badge color="emerald" label="Alta clareza" /> : <Badge color="amber" label="Baixa clareza visual" />}
                     {selectedOffer.unit && <Badge color="emerald" label={`Unidade inferida (${selectedOffer.unit})`} />}
                   </div>
                </div>

                {/* Historical Context */}
                {selectedOffer.productCanonicalId && (
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
                    <h4 className="text-[10px] font-bold text-slate-500 flex items-center gap-1 uppercase">
                      <History className="w-3.5 h-3.5" /> Histórico de Preços (Simulado)
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[9px] text-slate-400 block">Último Preço</span>
                        <span className="font-bold text-slate-700">R$ {(selectedOffer.price * 1.05).toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 block">Preço Médio</span>
                        <span className="font-bold text-slate-700">R$ {(selectedOffer.price * 1.1).toFixed(2)}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[9px] text-slate-400 block">Última Ocorrência</span>
                        <span className="font-bold text-slate-700 truncate">Semana passada no mercado concorrente</span>
                      </div>
                    </div>
                  </div>
                )}
                </div>

              </motion.div>
            )}
          </div>
          
          {/* Action Bar */}
          <div className="p-4 bg-white border-t border-slate-100 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
            <button 
              onClick={handleMarkAuditedAndNext}
              disabled={!selectedOffer}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all shadow-md flex justify-center items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" /> Salvar e Próximo <span className="text-[10px] opacity-70 ml-1 font-normal">(Ctrl+Enter)</span>
            </button>
            <div className="flex justify-between items-center mt-3 text-[10px] font-medium text-slate-400">
               <span className="flex items-center gap-1"><ArrowUp className="w-3 h-3"/> <ArrowDown className="w-3 h-3"/> Navegar</span>
               <span className="flex items-center gap-1">Enter: Salvar</span>
               <span className="flex items-center gap-1">Del: Excluir</span>
               <span className="flex items-center gap-1">Ctrl+Z: Desfazer</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Collapsible Debug Panel */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <button 
          onClick={() => setDebugExpanded(!debugExpanded)}
          className="w-full p-4 flex justify-between items-center bg-slate-50 hover:bg-slate-100 transition-colors"
        >
          <div className="flex items-center gap-2 text-slate-700 font-bold text-sm">
            <Activity className="w-4 h-4" /> Qualidade da Extração & Diagnóstico
          </div>
          {debugExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>
        <AnimatePresence>
          {debugExpanded && debugData && (
            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
              <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-700">Métricas</h4>
                  <div className="space-y-1">
                    <p className="text-slate-600 flex justify-between"><span>Tempo de Proc.:</span> <strong>{debugData.durationSeconds}s</strong></p>
                    <p className="text-slate-600 flex justify-between"><span>Ofertas Encontradas:</span> <strong>{debugData.finalOffersCount}</strong></p>
                    <p className="text-slate-600 flex justify-between"><span>Normalizadas via IA:</span> <strong>{debugData.stats?.geminiNormalized || 0}</strong></p>
                  </div>
                </div>
                <div className="md:col-span-2 space-y-2">
                  <h4 className="font-bold text-slate-700">Detalhes do Folheto</h4>
                  <div className="space-y-1">
                    <p className="text-slate-600">Estabelecimento: <strong>{markets.find(m => m.id === uploadedFlyer.marketId)?.name || uploadedFlyer.marketId}</strong></p>
                    <p className="text-slate-600">Período: <strong>{uploadedFlyer.startDate} até {uploadedFlyer.endDate}</strong></p>
                    <p className="text-slate-600 text-[10px] text-slate-400 mt-2 font-mono break-all">{debugData.rawText}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {cropMode !== "none" && selectedFile && (
        <CropEditorModal
          imageUrl={selectedFile}
          initialCrop={cropMode === "edit" && selectedOffer ? selectedOffer.boundingBox : undefined}
          onClose={() => setCropMode("none")}
          onConfirm={handleProcessCrop}
        />
      )}
    </div>
  );
}
function Step({ label, active, completed }: { label: string, active: boolean, completed: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold ${
      completed ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
      : active ? 'bg-indigo-50 border-indigo-200 text-indigo-700 ring-2 ring-indigo-100 ring-offset-1'
      : 'bg-slate-50 border-slate-200 text-slate-400'
    }`}>
      {completed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />}
      {label}
    </div>
  );
}

function Line({ completed }: { completed: boolean }) {
  return <div className={`w-4 md:w-8 h-[2px] ${completed ? 'bg-emerald-300' : 'bg-slate-200'}`} />;
}

function StatBox({ label, value, color }: { label: string, value: number, color: string }) {
  return (
    <div className="flex-1 bg-slate-50 rounded-lg p-2 flex flex-col items-center justify-center border border-slate-100">
      <span className="text-[10px] uppercase font-bold text-slate-400">{label}</span>
      <span className={`text-lg font-black ${color}`}>{value}</span>
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-[10px] font-bold transition-colors whitespace-nowrap ${
        active ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
      }`}
    >
      {label}
    </button>
  );
}

function Badge({ label, color }: { label: string, color: 'emerald' | 'amber' | 'rose' }) {
  const colors = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200'
  };
  return (
    <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${colors[color]}`}>
      {label}
    </span>
  );
}
