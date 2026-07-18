import React, { useState, useMemo, useCallback, memo } from 'react';
import { AlertTriangle, ShieldAlert, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../../lib/firebase';
import { FirestoreRepository } from '../../services/FirestoreRepository';
import { doc, writeBatch } from 'firebase/firestore';
import { APP_CONFIG } from '../../config/app';
import {
  useFlyers,
  useOffers,
  useMarkets,
  useProducts,
  useCategories,
  useAuditLogs,
  useBackups
} from '../../hooks/useQueries';

interface DangerZoneManagerProps {
  logAction: (action: string, details: string) => Promise<void>;
  showSuccess: (msg: string) => void;
  showError: (msg: string) => void;
}

function DangerZoneManager({ logAction, showSuccess, showError }: DangerZoneManagerProps) {
  const { data: flyers = [] } = useFlyers();
  const { data: offers = [] } = useOffers();
  const { data: markets = [] } = useMarkets();
  const { data: products = [] } = useProducts();
      
  const technicalStats = useMemo(() => {
    const pendingOcr = flyers.filter(f => f.status === 'pending_ocr');
    const processed = flyers.filter(f => f.status === 'processed');
    const errorFl = flyers.filter(f => f.status === 'error');
    
    const pendingReview = offers.filter(o => o.status === 'review_pending');
    const unnormalized = offers.filter(o => !o.productCanonicalId);
    const normalized = offers.filter(o => !!o.productCanonicalId);
    
    return {
      marketsCount: markets.length,
      flyersCount: flyers.length,
      offersCount: offers.length,
      pendingOcrCount: pendingOcr.length,
      processedFlyersCount: processed.length,
      errorFlyersCount: errorFl.length,
      manualReviewOffersCount: pendingReview.length,
      unnormalizedOffersCount: unnormalized.length,
      normalizedOffersCount: normalized.length,
      productsCount: products.length,
      processingQueue: pendingOcr.length,
      processedOCR: processed.length,
      ocrFailures: errorFl.length,
      validCount: normalized.length,
      pendingReviewCount: pendingReview.length,
      storageUsed: `${(flyers.length * 0.15).toFixed(1)} MB`
    };
  }, [flyers, offers, markets, products]);

  const [dangerAction, setDangerAction] = useState<'clean' | 'files' | null>(null);
  const [dangerConfirmPhrase, setDangerConfirmPhrase] = useState('');
  const [isDangerUnlocked, setIsDangerUnlocked] = useState(false);
  const [dangerUnderstandCheckbox, setDangerUnderstandCheckbox] = useState(false);

  const handleOpenDangerAction = useCallback((action: 'clean' | 'files') => {
    setDangerAction(action);
    setDangerConfirmPhrase('');
    setDangerUnderstandCheckbox(false);
    setIsDangerUnlocked(false);
  }, []);

  const handleDangerConfirmPhraseChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDangerConfirmPhrase(e.target.value);
  }, []);

  const handleDangerUnderstandCheckboxChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDangerUnderstandCheckbox(e.target.checked);
  }, []);

  const handleCancelDangerAction = useCallback(() => setDangerAction(null), []);

  const deleteInBatches = useCallback(async (refs: any[]) => {
    const chunks = [];
    for (let i = 0; i < refs.length; i += 400) {
      chunks.push(refs.slice(i, i + 400));
    }
    for (const chunk of chunks) {
      const batch = writeBatch(db);
      chunk.forEach(ref => batch.delete(ref));
      await batch.commit();
    }
  }, []);

  const handleExecuteDangerAction = useCallback(async () => {
    if (dangerConfirmPhrase !== 'APAGAR TODOS OS DADOS') {
      showError('Frase de segurança incorreta. Digite exatamente "APAGAR TODOS OS DADOS" em maiúsculas.');
      return;
    }
    if (dangerAction === 'clean' && !dangerUnderstandCheckbox) {
      showError('Você deve marcar a caixa de confirmação inicial antes de executar.');
      return;
    }
    try {
      if (dangerAction === 'clean') {
        const refsToDelete: any[] = [];
        
        const [
          allFlyers,
          allOffers,
          allMarkets,
          allProducts,
          allAuditLogs,
          allBackups
        ] = await Promise.all([
          FirestoreRepository.getFlyers(),
          FirestoreRepository.getOffers(),
          FirestoreRepository.getMarkets(),
          FirestoreRepository.getProducts(),
          FirestoreRepository.getAuditLogs(),
          FirestoreRepository.getBackups()
        ]);
        
        allFlyers.forEach(f => refsToDelete.push(doc(db, 'flyers', f.id)));
        allOffers.forEach(o => refsToDelete.push(doc(db, 'offers', o.id)));
        allMarkets.forEach(m => refsToDelete.push(doc(db, 'markets', m.id)));
        allProducts.forEach(p => refsToDelete.push(doc(db, 'canonical_products', p.id)));
        allAuditLogs.forEach(l => refsToDelete.push(doc(db, 'audit_logs', l.id)));
        allBackups.forEach(b => {
          refsToDelete.push(doc(db, 'backups', b.id));
          refsToDelete.push(doc(db, 'backup_payloads', b.id));
        });

        await deleteInBatches(refsToDelete);
        await logAction('DB_CLEAN', 'ZONA DE PERIGO: Administrador apagou COMPLETAMENTE todos os dados principais e derivados do sistema.');
        showSuccess('Toda a base de dados (mercados, folhetos, ofertas, canônicos, categorias, marcas, logs, backups, imagens e OCR) foi limpa permanentemente.');
      } 
      else if (dangerAction === 'files') {
        await logAction('FILES_CLEAN', 'ZONA DE PERIGO: Administrador limpou cache de arquivos de imagens de folhetos.');
        showSuccess('Cache de arquivos e imagens temporárias limpo.');
      }
      setDangerAction(null);
    } catch (err: any) {
      showError(`Falha crítica na Zona de Perigo: ${err.message}`);
    }
  }, [dangerAction, dangerConfirmPhrase, dangerUnderstandCheckbox, logAction, deleteInBatches, showError, showSuccess]);

  return (
    <div className="space-y-6">
      <div className="bg-rose-50 border-2 border-rose-200 rounded-3xl p-6 text-rose-950 flex gap-4 items-start">
        <AlertTriangle className="w-8 h-8 text-rose-600 shrink-0" />
        <div className="space-y-1">
          <h3 className="text-sm font-extrabold uppercase tracking-wide text-rose-800">Área Exclusiva de Destruição</h3>
          <p className="text-xs text-rose-900 leading-relaxed font-semibold">
            Esta seção é isolada das demais configurações administrativas. As operações listadas abaixo são IRREVERSÍVEIS e afetam diretamente a base de dados de produção do Observatório do {APP_CONFIG.shortName}. Prossiga com extremo cuidado.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-150 shadow-sm p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-800">Operações Disponíveis</h3>
        <div className="divide-y divide-slate-100">
          <div className="py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h4 className="text-xs font-bold text-slate-900 block uppercase">Limpar Toda a Base de Dados</h4>
              <span className="text-[11px] text-slate-400 mt-1 block">Remove permanentemente todos os {technicalStats.flyersCount} folhetos, {technicalStats.offersCount} ofertas, {technicalStats.marketsCount} mercados e todos os dados associados.</span>
            </div>
            <button 
              onClick={() => handleOpenDangerAction('clean')}
              className="px-4 py-2 bg-rose-100 text-rose-700 hover:bg-rose-200 rounded-xl text-xs font-bold transition-all whitespace-nowrap"
            >
              Destruir Dados
            </button>
          </div>
          <div className="py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h4 className="text-xs font-bold text-slate-900 block uppercase">Excluir Cache de Imagens e Dados OCR</h4>
              <span className="text-[11px] text-slate-400 mt-1 block">Apaga os arquivos físicos de imagens convertidas e dados de OCR temporários salvos no servidor.</span>
            </div>
            <button 
              onClick={() => handleOpenDangerAction('files')}
              className="px-4 py-2 bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-xl text-xs font-bold transition-all whitespace-nowrap"
            >
              Limpar Cache
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {dangerAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white rounded-3xl p-8 max-w-lg w-full border border-rose-100 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-rose-500 via-rose-600 to-rose-700"></div>
              <div className="flex items-center gap-3 text-rose-700 mb-4">
                <ShieldAlert className="w-8 h-8" />
                <h3 className="font-extrabold uppercase tracking-wide">Protocolo de Exclusão</h3>
              </div>
              <p className="text-sm text-slate-600 mb-6 font-semibold leading-relaxed">
                Você está prestes a executar uma rotina de exclusão em massa: <strong className="text-rose-700">"{dangerAction === 'clean' ? 'Limpar Toda a Base de Dados' : 'Excluir Cache de Imagens'}"</strong>.
                Esta ação NÃO POSSUI LIXEIRA ou desfazer.
              </p>
              
              <div className="space-y-4">
                {dangerAction === 'clean' && (
                  <label className="flex items-start gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-100 transition-colors">
                    <input 
                      type="checkbox" 
                      className="mt-1 shrink-0 text-rose-600 focus:ring-rose-500" 
                      checked={dangerUnderstandCheckbox}
                      onChange={handleDangerUnderstandCheckboxChange}
                    />
                    <span className="text-xs text-slate-700 font-bold leading-relaxed">Estou ciente que estou excluindo TODOS os dados de mercado permanentemente. Ninguém conseguirá reverter isso sem os backups fora da rede.</span>
                  </label>
                )}
                
                <div className="pt-2">
                  <label className="text-[10px] font-bold text-slate-500 block uppercase mb-1.5 font-mono">Confirmação de Segurança</label>
                  <input 
                    type="text" 
                    value={dangerConfirmPhrase}
                    onChange={handleDangerConfirmPhraseChange}
                    className="w-full px-4 py-3 bg-white border border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 rounded-xl text-xs font-bold outline-none font-mono"
                    placeholder='Digite "APAGAR TODOS OS DADOS"'
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-8">
                <button 
                  onClick={handleCancelDangerAction}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
                >
                  Cancelar Operação
                </button>
                <button 
                  onClick={handleExecuteDangerAction}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-rose-600/30"
                >
                  <Trash2 className="w-4 h-4" /> 
                  Confirmar Exclusão
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default memo(DangerZoneManager);
