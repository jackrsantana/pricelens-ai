import React, { useState, useMemo, useEffect, memo } from 'react';
import { AnimatePresence } from 'motion/react';
import { useOffers, useFlyers, useMarkets, useMutateOffer } from '../../hooks/useQueries';
import { Offer, Flyer, Market } from '../../types';
import { sanitizeOffer } from '../../lib/firebase';
import CropEditorModal from '../CropEditorModal';
import { Search, Scissors, ShieldAlert, Check, Loader2 } from 'lucide-react';

interface OffersManagerProps {
  initialSubTab?: 'crops' | 'ocr' | 'history';
  logAction?: (action: string, details: string) => void;
  flyers?: Flyer[];
  offers?: Offer[];
  markets?: Market[];
  products?: any[];
}

interface CropProps {
  offer: Offer;
  parentFlyer?: Flyer;
}

const OfferCropImage = memo(function OfferCropImage({ offer, parentFlyer }: CropProps) {
  const [cropUrl, setCropUrl] = useState<string | null>(offer.croppedImageUrl || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (offer.croppedImageUrl) {
      setCropUrl(offer.croppedImageUrl);
      return;
    }

    if (!parentFlyer || !parentFlyer.imageUrl) {
      return;
    }

    setLoading(true);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setLoading(false);
          return;
        }

        const bbox = offer.boundingBox || { x: 30, y: 30, width: 40, height: 25 };
        const x = (bbox.x / 100) * img.width;
        const y = (bbox.y / 100) * img.height;
        const w = (bbox.width / 100) * img.width;
        const h = (bbox.height / 100) * img.height;

        canvas.width = Math.max(1, w);
        canvas.height = Math.max(1, h);
        ctx.drawImage(img, x, y, w, h, 0, 0, w, h);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setCropUrl(dataUrl);
      } catch (err) {
        console.error('Failed to crop:', err);
      } finally {
        setLoading(false);
      }
    };
    img.onerror = () => {
      setLoading(false);
    };
    img.src = parentFlyer.imageUrl;
  }, [offer, parentFlyer]);

  if (loading) {
    return (
      <div className="w-full h-32 bg-slate-100 flex items-center justify-center text-[10px] text-slate-400 font-bold rounded-xl animate-pulse">
        Gerando Recorte...
      </div>
    );
  }

  if (!cropUrl) {
    return (
      <div className="w-full h-32 bg-slate-100 flex items-center justify-center text-[10px] text-slate-400 font-bold rounded-xl">
        Sem Imagem do Recorte
      </div>
    );
  }

  return (
    <img 
      src={cropUrl} 
      alt={offer.originalName} 
      className="w-full h-32 object-contain bg-white rounded-xl border border-slate-100"
      referrerPolicy="no-referrer"
    />
  );
});

function OffersManager({ initialSubTab = 'crops', logAction, flyers: propFlyers, offers: propOffers, markets: propMarkets, products: propProducts }: OffersManagerProps) {
  const { data: queryOffers = [], isLoading: loadingOffers } = useOffers({ 
    
    enabled: !propOffers 
  });
  const { data: queryFlyers = [] } = useFlyers({ 
    
    enabled: !propFlyers 
  });
  const { data: queryMarkets = [] } = useMarkets({ 
    
    enabled: !propMarkets 
  });

  const offers = propOffers !== undefined ? propOffers : queryOffers;
  const flyers = propFlyers !== undefined ? propFlyers : queryFlyers;
  const markets = propMarkets !== undefined ? propMarkets : queryMarkets;

  const mutateOffer = useMutateOffer();

  const [activeTab, setActiveTab] = useState<'crops' | 'ocr' | 'history'>(initialSubTab);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Crops Tab State
  const [cropSearch, setCropSearch] = useState('');
  const [cropMarket, setCropMarket] = useState('');
  const [editingCropOffer, setEditingCropOffer] = useState<Offer | null>(null);

  // OCR Tab State
  const [selectedOcrFlyerId, setSelectedOcrFlyerId] = useState<string>('');
  const [ocrReviewingOffer, setOcrReviewingOffer] = useState<Offer | null>(null);
  const [ocrOriginalText, setOcrOriginalText] = useState<string>('');
  const [ocrOriginalPrice, setOcrOriginalPrice] = useState<number>(0);

  // History Tab State
  const [historySearch, setHistorySearch] = useState('');
  const [historyMarketFilter, setHistoryMarketFilter] = useState('all');

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 5500);
  };

  // --- Crops Filters ---
  const filteredCrops = useMemo(() => {
    return offers.filter(o => {
      const matchesSearch = o.originalName.toLowerCase().includes(cropSearch.toLowerCase());
      const matchesMarket = !cropMarket || o.marketId === cropMarket;
      return matchesSearch && matchesMarket;
    });
  }, [offers, cropSearch, cropMarket]);

  // --- OCR Filtered ---
  const ocrOffersList = useMemo(() => {
    if (!selectedOcrFlyerId) return offers.slice(0, 10);
    return offers.filter(o => o.flyerId === selectedOcrFlyerId);
  }, [offers, selectedOcrFlyerId]);

  const handleAuditOcrOffer = (o: Offer) => {
    setOcrReviewingOffer(o);
    setOcrOriginalText(o.originalName);
    setOcrOriginalPrice(o.price);
  };

  const handleSaveOcrAudit = async () => {
    if (!ocrReviewingOffer) return;
    try {
      const updated: Offer = {
        ...ocrReviewingOffer,
        originalName: ocrOriginalText,
        price: ocrOriginalPrice,
        status: 'reviewed',
        confidence: 100
      };
      const cleanOffer = sanitizeOffer(updated);
      
      await mutateOffer.mutateAsync({ id: updated.id, payload: cleanOffer });
      if (logAction) {
        logAction('OCR_CORRECTION', `Administrador corrigiu OCR da oferta ${updated.id}: "${ocrReviewingOffer.originalName}" -> "${ocrOriginalText}"`);
      }
      showSuccess('Auditoria gravada e salva!');
      setOcrReviewingOffer(null);
    } catch (err: any) {
      showError(`Erro ao auditar: ${err.message}`);
    }
  };

  // --- History Filtered ---
  const historyOffersList = useMemo(() => {
    return offers.filter(o => {
      const matchesSearch = o.originalName.toLowerCase().includes(historySearch.toLowerCase());
      const matchesMarket = historyMarketFilter === 'all' || o.marketId === historyMarketFilter;
      return matchesSearch && matchesMarket;
    });
  }, [offers, historySearch, historyMarketFilter]);

  return (
    <div className="space-y-6 animate-fade-in">
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-medium">
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl font-medium">
          {errorMsg}
        </div>
      )}

      {/* Tabs navigation */}
      <div className="flex gap-2 border-b border-slate-100 pb-px">
        <button
          onClick={() => setActiveTab('crops')}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 ${
            activeTab === 'crops' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Recortes Visuais
        </button>
        <button
          onClick={() => setActiveTab('ocr')}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 ${
            activeTab === 'ocr' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Auditoria OCR
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 ${
            activeTab === 'history' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Histórico Preços
        </button>
      </div>

      {loadingOffers ? (
        <div className="flex justify-center py-12 bg-white rounded-3xl border border-slate-100">
          <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
        </div>
      ) : activeTab === 'crops' ? (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-800">Gerenciador de Recortes Visuais</h3>
              <p className="text-xs text-slate-400 mt-0.5">Associe ofertas a recortes de imagens extraídos dos folhetos de origem</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input 
                  type="text"
                  placeholder="Buscar oferta pelo nome..."
                  value={cropSearch}
                  onChange={(e) => setCropSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 font-medium"
                />
              </div>
              <div className="w-full sm:w-64">
                <select 
                  value={cropMarket}
                  onChange={(e) => setCropMarket(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 font-bold"
                >
                  <option value="">Todos os Estabelecimentos</option>
                  {markets.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {filteredCrops.length === 0 ? (
              <div className="py-12 text-center text-slate-400 font-semibold italic">
                Nenhum recorte encontrado correspondente aos filtros.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filteredCrops.map(o => {
                  const parentFlyer = flyers.find(f => f.id === o.flyerId);
                  const market = markets.find(m => m.id === o.marketId);
                  const bbox = o.boundingBox || { x: 0, y: 0, width: 0, height: 0 };

                  return (
                    <div key={o.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col space-y-3 relative group">
                      <OfferCropImage offer={o} parentFlyer={parentFlyer} />

                      <div className="space-y-1.5 flex-1 flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            {market?.name || 'Estabelecimento Desconhecido'}
                          </span>
                          <h4 className="text-xs font-bold text-slate-800 line-clamp-2 mt-0.5 leading-tight">
                            {o.originalName}
                          </h4>
                        </div>

                        <div className="pt-2 border-t border-slate-50 flex items-center justify-between">
                          <div className="flex flex-col">
                            {o.previousPrice && (
                              <span className="text-[10px] text-slate-400 line-through font-medium">
                                R$ {o.previousPrice.toFixed(2)}
                              </span>
                            )}
                            <span className="text-sm font-black text-indigo-600">
                              R$ {o.price.toFixed(2)}
                              <span className="text-[10px] text-slate-400 font-bold ml-0.5">/{o.unit}</span>
                            </span>
                          </div>
                          
                          <div className="text-right">
                            <span className="text-[9px] font-mono text-slate-400 block">Confiança IA</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                              o.confidence >= 85 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                              o.confidence >= 60 ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                              'bg-rose-50 text-rose-700 border border-rose-100'
                            }`}>
                              {o.confidence}%
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 space-y-1 text-[10px] text-slate-500 font-mono">
                        <div className="flex justify-between">
                          <span>Coordenadas (x, y):</span>
                          <span className="font-bold text-slate-700">({bbox.x.toFixed(0)}%, {bbox.y.toFixed(0)}%)</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Tamanho (w, h):</span>
                          <span className="font-bold text-slate-700">{bbox.width.toFixed(0)}% × {bbox.height.toFixed(0)}%</span>
                        </div>
                      </div>

                      <div className="pt-1">
                        <button 
                          onClick={() => setEditingCropOffer(o)} 
                          className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-xs font-bold cursor-pointer"
                        >
                          <Scissors className="w-4 h-4" /> Ajustar Recorte
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <AnimatePresence>
            {editingCropOffer && (
              <CropEditorModal
                imageUrl={flyers.find(f => f.id === editingCropOffer.flyerId)?.imageUrl || ''}
                initialCrop={editingCropOffer.boundingBox}
                onClose={() => setEditingCropOffer(null)}
                onConfirm={async (percentCrop, croppedBase64) => {
                  const updatedOffer = {
                    ...editingCropOffer,
                    boundingBox: percentCrop,
                    croppedImageUrl: croppedBase64,
                    processingTimestamp: new Date().toISOString()
                  };
                  await mutateOffer.mutateAsync({ id: updatedOffer.id, payload: sanitizeOffer(updatedOffer) });
                  showSuccess('Recorte atualizado com sucesso!');
                  setEditingCropOffer(null);
                }}
              />
            )}
          </AnimatePresence>
        </div>
      ) : activeTab === 'ocr' ? (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Auditoria OCR</h3>
              <p className="text-xs text-slate-400 mt-0.5">Corrija textos e preços lidos pelo motor espacial PaddleOCR / Gemini</p>
            </div>
            <select 
              value={selectedOcrFlyerId}
              onChange={(e) => setSelectedOcrFlyerId(e.target.value)}
              className="text-xs px-3 py-2 bg-slate-50 border-none rounded-xl font-bold text-slate-700 outline-none w-full sm:w-64"
            >
              <option value="">-- Ver Todas as Ofertas Ativas --</option>
              {flyers.map(f => (
                <option key={f.id} value={f.id}>
                  {markets.find(m => m.id === f.marketId)?.name || 'Outro'} ({f.startDate})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500">
                    <th className="px-4 py-2.5 font-bold">Leitura do OCR</th>
                    <th className="px-4 py-2.5 font-bold text-right">Preço Lido</th>
                    <th className="px-4 py-2.5 font-bold text-right">Confiança</th>
                    <th className="px-4 py-2.5 font-bold text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {ocrOffersList.map(o => (
                    <tr key={o.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <span className="text-slate-800 font-bold block">{o.originalName}</span>
                        <span className="text-[10px] text-slate-400 block font-normal mt-0.5">ID: {o.id}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">R$ {o.price.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`px-2 py-0.5 rounded text-[10px] border font-bold ${
                          o.confidence >= 85 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                            : 'bg-rose-50 text-rose-700 border-rose-100'
                        }`}>
                          {o.confidence}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button 
                          onClick={() => handleAuditOcrOffer(o)}
                          className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-lg cursor-pointer"
                        >
                          Corrigir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Sidebar with original vs modified audit controls */}
            <div className="lg:col-span-5 bg-slate-50 p-5 rounded-2xl border border-slate-150 space-y-4">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                <ShieldAlert className="w-4 h-4 text-indigo-500" /> Painel de Correção Spatial
              </h4>

              {ocrReviewingOffer ? (
                <div className="space-y-4 text-xs font-semibold">
                  <div>
                    <span className="text-[9px] text-slate-400 block uppercase font-bold">Original Lido pelo OCR</span>
                    <p className="text-slate-800 italic bg-white p-2.5 rounded-xl border border-slate-150 mt-1">{ocrReviewingOffer.originalName}</p>
                  </div>

                  <div>
                    <label className="text-[9px] text-slate-400 block uppercase font-bold">Texto Corrigido</label>
                    <input 
                      type="text" 
                      value={ocrOriginalText}
                      onChange={(e) => setOcrOriginalText(e.target.value)}
                      className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none font-bold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] text-slate-400 block uppercase font-bold">Preço Lido</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={ocrOriginalPrice}
                      onChange={(e) => setOcrOriginalPrice(parseFloat(e.target.value) || 0)}
                      className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none font-bold text-slate-800 font-mono"
                    />
                  </div>

                  <div className="flex gap-2 justify-end pt-2">
                    <button 
                      onClick={() => setOcrReviewingOffer(null)}
                      className="px-3 py-1.5 bg-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-300"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={handleSaveOcrAudit}
                      className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" /> Salvar Alteração
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400 font-semibold">
                  <p>Selecione um item da tabela para visualizar e corrigir textos e preços do OCR.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Histórico de Preços Monitorados</h3>
              <p className="text-xs text-slate-400 mt-0.5">Verifique toda a série de preços extraídos de panfletos para auditar outliers</p>
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <select 
                value={historyMarketFilter}
                onChange={(e) => setHistoryMarketFilter(e.target.value)}
                className="text-xs px-3 py-2 bg-slate-50 border-none rounded-xl font-bold text-slate-700 outline-none w-full sm:w-48"
              >
                <option value="all">Todas as Lojas</option>
                {markets.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input 
              type="text" 
              placeholder="Filtrar histórico de ofertas por termo original lido..." 
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              className="w-full text-xs pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl font-bold text-slate-700 outline-none"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500">
                  <th className="px-4 py-2.5 font-bold">Oferta</th>
                  <th className="px-4 py-2.5 font-bold">Estabelecimento</th>
                  <th className="px-4 py-2.5 font-bold text-right">Preço</th>
                  <th className="px-4 py-2.5 font-bold text-center">Data Registro</th>
                  <th className="px-4 py-2.5 font-bold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {historyOffersList.map(o => {
                  const shop = markets.find(m => m.id === o.marketId);
                  return (
                    <tr key={o.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-bold text-slate-900">{o.originalName}</td>
                      <td className="px-4 py-3">{shop?.name || 'Mercado'}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">R$ {o.price.toFixed(2)}</td>
                      <td className="px-4 py-3 text-center text-[10px] text-slate-500">
                        {o.processingTimestamp ? new Date(o.processingTimestamp).toLocaleDateString() : 'Julho'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[9px] font-bold">
                          {o.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(OffersManager);
