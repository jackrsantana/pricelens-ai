import React, { useState, useMemo, memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  useFlyers, 
  useOffers, 
  useMarkets, 
  useProducts, 
  useCategories, 
  useMutateFlyer 
} from '../../hooks/useQueries';
import { Flyer, Offer, Market } from '../../types';
import { sanitizeFlyer } from '../../lib/firebase';
import { db, writeBatch, doc } from '../../lib/firebase';
import { useQueryClient } from '@tanstack/react-query';
import DashboardUpload from '../DashboardUpload';
import { formatLocalDate } from '../DashboardAdmin';
import { Edit, Trash2, Save, X, Loader2, Calendar, FileText } from 'lucide-react';
import { APP_CONFIG } from '../../config/app';

interface FlyersManagerProps {
  onAddFlyerAndOffers: (newFlyer: Flyer, newOffers: Offer[]) => void;
  logAction?: (action: string, details: string) => void;
  flyers?: Flyer[];
  offers?: Offer[];
  markets?: Market[];
  products?: any[];
  categories?: any[];
}

function FlyersManager({ onAddFlyerAndOffers, logAction, flyers: propFlyers, offers: propOffers, markets: propMarkets, products: propProducts, categories: propCategories }: FlyersManagerProps) {
  const queryClient = useQueryClient();
  const { data: queryFlyers = [], isLoading: loadingFlyers } = useFlyers({ 
    
    enabled: !propFlyers 
  });
  const { data: queryOffers = [] } = useOffers({ 
    
    enabled: !propOffers 
  });
  const { data: queryMarkets = [] } = useMarkets({ 
    
    enabled: !propMarkets 
  });
  const { data: queryProducts = [] } = useProducts({ 
    
    enabled: !propProducts 
  });
  const { data: queryCategories = [] } = useCategories({ 
    enabled: !propCategories 
  });

  const flyers = propFlyers !== undefined ? propFlyers : queryFlyers;
  const offers = propOffers !== undefined ? propOffers : queryOffers;
  const markets = propMarkets !== undefined ? propMarkets : queryMarkets;
  const products = propProducts !== undefined ? propProducts : queryProducts;
  const categories = propCategories !== undefined ? propCategories : queryCategories;

  const mutateFlyer = useMutateFlyer();

  const [flyerFilterMarket, setFlyerFilterMarket] = useState('');
  const [flyerFilterStatus, setFlyerFilterStatus] = useState('');

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [isFlyerModalOpen, setIsFlyerModalOpen] = useState(false);
  const [flyerForm, setFlyerForm] = useState<Partial<Flyer>>({ id: '', marketId: '', cityName: APP_CONFIG.defaultCityShort, startDate: '', endDate: '', observations: '', status: 'processed' });
  const [editingFlyerId, setEditingFlyerId] = useState<string | null>(null);

  // --- Resilient Upload Session State ---
  const [uploadSession, setUploadSession] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('flyerintel_upload_session');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to restore upload session from localStorage:', e);
    }
    return {
      selectedFile: null, originalFile: null, status: 'idle', marketId: '', cityId: '',
      startDate: '', endDate: '', observations: '', error: null, uploadedFlyer: null,
      extractedOffers: [], selectedOffer: null, debugData: null, pipelineSteps: [],
      detectedNewMarket: null, geminiModel: ''
    };
  });

  const handleUpdateUploadSession = useCallback((updater: any) => {
    setUploadSession((prev: any) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try {
        localStorage.setItem('flyerintel_upload_session', JSON.stringify(next));
      } catch (e) {
        console.warn('Failed to save upload session to localStorage:', e);
      }
      return next;
    });
  }, [setUploadSession]);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 5500);
  };

  const handleOpenFlyerModal = (f: Flyer) => {
    setFlyerForm(f);
    setEditingFlyerId(f.id);
    setIsFlyerModalOpen(true);
  };

  const handleSaveFlyer = async () => {
    if (!flyerForm.startDate || !flyerForm.endDate) {
      showError('As datas de início e fim do panfleto são obrigatórias.');
      return;
    }
    try {
      const targetId = flyerForm.id!;
      const cleanFlyer = sanitizeFlyer(flyerForm as Flyer);
      
      await mutateFlyer.mutateAsync({ id: targetId, payload: cleanFlyer });
      if (logAction) {
        logAction('FLYER_UPDATE', `Administrador atualizou metadados do folheto ${targetId}`);
      }
      showSuccess('Metadados do folheto gravados com sucesso!');
      setIsFlyerModalOpen(false);
    } catch (err: any) {
      showError(`Erro ao gravar folheto: ${err.message}`);
    }
  };

  const handleDeleteFlyer = async (flyerId: string) => {
    if (window.confirm(`ATENÇÃO: Deseja realmente excluir este folheto? Todas as ofertas associadas a ele também serão removidas permanentemente!`)) {
      try {
        const associatedOffers = offers.filter((o: Offer) => o.flyerId === flyerId);
        
        // Chunk array into pieces of 499 (Firestore batch limit is 500)
        const chunks = [];
        let i = 0;
        while (i < associatedOffers.length) {
          chunks.push(associatedOffers.slice(i, i + 499));
          i += 499;
        }
        
        for (const chunk of chunks) {
          const batch = writeBatch(db);
          chunk.forEach((o: Offer) => batch.delete(doc(db, 'offers', o.id)));
          await batch.commit();
        }
        
        // Delete the flyer itself
        const flyerBatch = writeBatch(db);
        flyerBatch.delete(doc(db, 'flyers', flyerId));
        await flyerBatch.commit();

        queryClient.invalidateQueries({ queryKey: ['flyers'] });
        queryClient.invalidateQueries({ queryKey: ['offers'] });

        if (logAction) {
          logAction('FLYER_DELETE', `Administrador removeu folheto ${flyerId} e ${associatedOffers.length} ofertas associadas.`);
        }
        showSuccess('Folheto e ofertas deletados com sucesso.');
      } catch (err: any) {
        showError(`Falha na exclusão do folheto: ${err.message}`);
      }
    }
  };

  const filteredFlyers = useMemo(() => {
    return flyers.filter((f: Flyer) => {
      const matchesMarket = !flyerFilterMarket || f.marketId === flyerFilterMarket;
      const matchesStatus = !flyerFilterStatus || f.status === flyerFilterStatus;
      return matchesMarket && matchesStatus;
    });
  }, [flyers, flyerFilterMarket, flyerFilterStatus]);

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

      <DashboardUpload 
        onAddFlyerAndOffers={onAddFlyerAndOffers} 
        markets={markets} 
        canonicalProducts={products} 
        categories={categories}
        uploadSession={uploadSession}
        setUploadSession={handleUpdateUploadSession}
      />

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-800">Folhetos Cadastrados no Banco</h3>
          <p className="text-xs text-slate-400 mt-0.5">Visualize, reprocesse, filtre e gerencie os folhetos ativos</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <div className="flex-1">
            <select 
              value={flyerFilterMarket}
              onChange={(e) => setFlyerFilterMarket(e.target.value)}
              className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 font-bold"
            >
              <option value="">Filtrar por Estabelecimento</option>
              {markets.map((m: Market) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div className="w-full sm:w-64">
            <select 
              value={flyerFilterStatus}
              onChange={(e) => setFlyerFilterStatus(e.target.value)}
              className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 font-bold"
            >
              <option value="">Filtrar por Status</option>
              <option value="processed">Processado</option>
              <option value="pending_ocr">Pendente OCR</option>
              <option value="error">Erro</option>
            </select>
          </div>
        </div>

        {loadingFlyers ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500">
                  <th className="px-4 py-3 font-bold">Estabelecimento</th>
                  <th className="px-4 py-3 font-bold">Imagem</th>
                  <th className="px-4 py-3 font-bold">Vigência (De/Até)</th>
                  <th className="px-4 py-3 font-bold">Data de Envio</th>
                  <th className="px-4 py-3 font-bold text-center">Ofertas Associadas</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                  <th className="px-4 py-3 font-bold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {filteredFlyers.map((f: Flyer) => {
                  const marketName = markets.find((m: Market) => m.id === f.marketId)?.name || 'Outro';
                  const associatedOffersCount = offers.filter((o: Offer) => o.flyerId === f.id).length;
                  const sendDateStr = f.createdAt ? new Date(f.createdAt).toLocaleDateString() : 'N/A';

                  return (
                    <tr key={f.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-bold text-slate-900">{marketName}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {f.imageUrl && (
                            <img 
                              src={f.imageUrl} 
                              alt="Flyer Mini" 
                              className="w-10 h-10 object-cover rounded-lg border border-slate-100"
                              referrerPolicy="no-referrer"
                            />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="block font-bold text-slate-800">{f.startDate ? formatLocalDate(f.startDate) : 'N/A'}</span>
                        <span className="text-[10px] text-slate-400">até {f.endDate ? formatLocalDate(f.endDate) : 'N/A'}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{sendDateStr}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-bold">
                          {associatedOffersCount} ofertas
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-[10px] rounded border uppercase font-bold ${
                          f.status === 'processed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                          f.status === 'pending_ocr' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                          'bg-rose-50 text-rose-700 border-rose-100'
                        }`}>
                          {f.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-1.5">
                        <button
                          onClick={() => handleOpenFlyerModal(f)}
                          className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg cursor-pointer inline-flex"
                          title="Editar informações do folheto"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteFlyer(f.id)}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg cursor-pointer inline-flex"
                          title="Excluir folheto permanentemente"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal for Flyer Dates Edit */}
      <AnimatePresence>
        {isFlyerModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl space-y-4"
            >
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-500" /> Editar Metadados do Folheto
                </h4>
                <button onClick={() => setIsFlyerModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block uppercase font-mono">Início Vigência</label>
                  <input 
                    type="date" 
                    value={flyerForm.startDate || ''}
                    onChange={(e) => setFlyerForm({ ...flyerForm, startDate: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block uppercase font-mono">Fim Vigência</label>
                  <input 
                    type="date" 
                    value={flyerForm.endDate || ''}
                    onChange={(e) => setFlyerForm({ ...flyerForm, endDate: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block uppercase font-mono">Observações</label>
                  <textarea 
                    value={flyerForm.observations || ''}
                    onChange={(e) => setFlyerForm({ ...flyerForm, observations: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none font-bold h-20 resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button 
                  onClick={() => setIsFlyerModalOpen(false)} 
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveFlyer} 
                  disabled={mutateFlyer.isPending}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {mutateFlyer.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Salvar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default memo(FlyersManager);
