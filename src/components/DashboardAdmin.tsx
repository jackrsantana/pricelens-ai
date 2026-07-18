import React, { useMemo, useState, useEffect, useRef, memo, useCallback } from 'react';
import { MetricTracker } from '../lib/instrumentation';
import { useTrackedRender, useTrackedState } from '../hooks/useDiagnostic';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */


import CropEditorModal from './CropEditorModal';
import { Scissors } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Flyer, Offer, Market, CanonicalProduct, Category, AuditLog, Backup } from '../types';
import { 
  db, auth, reportFirestoreError, OperationType, sanitizeFlyer, sanitizeOffer,
  collection, doc, getDocs, setDoc, addDoc, deleteDoc, writeBatch, query, orderBy, onSnapshot, getDoc
} from '../lib/firebase';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { FirestoreRepository } from '../services/FirestoreRepository';
import { APP_CONFIG } from '../config/app';
import { 
  useFlyers,
  useOffers,
  useMarkets, 
  useProducts, 
  useCategories, 
  useAuditLogs, 
  useBackups,
  useDashboardStats,
  useSystemSettings,
  useMutateMarket,
  useDeleteMarket,
  useMutateFlyer,
  useMutateOffer,
  useMutateProduct,
  useDeleteProduct,
  useAddAuditLog,
  useCreateBackup,
  useDeleteBackup
} from '../hooks/useQueries';
import { 
  LayoutDashboard, 
  Store, 
  UploadCloud, 
  ShieldAlert, 
  Tag, 
  FolderEdit, 
  Bookmark, 
  History, 
  BrainCircuit, 
  Database, 
  Flame, 
  ScrollText, 
  Settings,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Sparkles,
  Search,
  Eye,
  Check,
  X,
  FileSpreadsheet,
  FileJson,
  FileCode,
  Calendar,
  AlertCircle,
  Activity,
  ShieldCheck,
  Image as ImageIcon,
  Copy
, Menu, Save, Loader2 } from 'lucide-react';
import DashboardDiagnostics from './DashboardDiagnostics';

const MarketsManager = React.lazy(() => import('./admin/MarketsManager'));
const ProductsManager = React.lazy(() => import('./admin/ProductsManager'));
const FlyersManager = React.lazy(() => import('./admin/FlyersManager'));
const OffersManager = React.lazy(() => import('./admin/OffersManager'));
const DatabaseManager = React.lazy(() => import('./admin/DatabaseManager'));
const AuditManager = React.lazy(() => import('./admin/AuditManager'));
const DangerZoneManager = React.lazy(() => import('./admin/DangerZoneManager'));

interface Props {
  flyers?: Flyer[];
  offers?: Offer[];
  loading?: boolean;
  onUpdateOffer: (offer: Offer) => void;
  onAddFlyerAndOffers: (flyer: any, offers: any[]) => void;
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





export const formatLocalDate = (dateStr: string) => {
  if (!dateStr) return 'N/A';
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};
const ADMIN_REPO_OPTIONS = { limit: 100 };

function DashboardAdmin({ loading, onUpdateOffer, onAddFlyerAndOffers }: Omit<Props, 'flyers' | 'offers'>) {
  useTrackedRender('DashboardAdmin', arguments[0] || {});
  const [activeSubTab, setActiveSubTab] = useTrackedState<string>('config', 'DashboardAdmin', 'activeSubTab');
  


  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const handleOpenMobileSidebar = useCallback(() => setIsMobileSidebarOpen(true), []);
  const handleCloseMobileSidebar = useCallback(() => setIsMobileSidebarOpen(false), []);
  
  const [viewOriginalQuality, setViewOriginalQuality] = useState<boolean>(false);
  const [editingCropOffer, setEditingCropOffer] = useState<Offer | null>(null);
  const [cropSearch, setCropSearch] = useState('');
  const [cropMarket, setCropMarket] = useState('');
  const [flyerFilterMarket, setFlyerFilterMarket] = useState('');
  const [flyerFilterStatus, setFlyerFilterStatus] = useState('');
  const [viewingOriginalFlyer, setViewingOriginalFlyer] = useState<Flyer | null>(null);
  const [viewingOriginalFlyerOffer, setViewingOriginalFlyerOffer] = useState<Offer | null>(null);
  const [userEmail, setUserEmail] = useState<string>('admin@precointeligente.com');

  // --- Resilient Upload and Background Processing Session State ---
  const [uploadSession, setUploadSession] = useTrackedState<any>(() => {
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
  }, 'DashboardAdmin', 'uploadSession');

  const queryClient = useQueryClient();
  const logAction = useCallback(async (action: string, details: string) => {
    try {
      await FirestoreRepository.addAuditLog({
        user: userEmail,
        action,
        details,
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString()
      });
      queryClient.invalidateQueries({ queryKey: ['audit_logs'] });
    } catch (err) {
      console.error('Failed to log admin action:', err);
    }
  }, [userEmail, queryClient]);

  const [ocrConfidenceThreshold, setOcrConfidenceThreshold] = useTrackedState<number>(85, 'DashboardAdmin', 'ocrConfidenceThreshold');
  const [geminiModel, setGeminiModel] = useTrackedState<string>('gemini-3.5-flash', 'DashboardAdmin', 'geminiModel');
  const [storageLimit, setStorageLimit] = useTrackedState<number>(5, 'DashboardAdmin', 'storageLimit');
  const [apiLimitRate, setApiLimitRate] = useTrackedState<number>(100, 'DashboardAdmin', 'apiLimitRate');
  const [availableModels, setAvailableModels] = useTrackedState<any[]>([], 'DashboardAdmin', 'availableModels');
  const [loadingModels, setLoadingModels] = useTrackedState<boolean>(false, 'DashboardAdmin', 'loadingModels');

  const [stagingOcrThreshold, setStagingOcrThreshold] = useState<number>(ocrConfidenceThreshold);
  const handleStagingOcrThresholdChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setStagingOcrThreshold(parseInt(e.target.value) || 85), []);
  const [stagingGeminiModel, setStagingGeminiModel] = useState<string>(geminiModel);
  const handleStagingGeminiModelChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => setStagingGeminiModel(e.target.value), []);
  const [stagingStorageLimit, setStagingStorageLimit] = useState<number>(storageLimit);
  const handleStagingStorageLimitChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setStagingStorageLimit(parseInt(e.target.value) || 5), []);
  const [stagingApiLimitRate, setStagingApiLimitRate] = useState<number>(apiLimitRate);
  const handleStagingApiLimitRateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setStagingApiLimitRate(parseInt(e.target.value) || 100), []);
  const [isSavingConfig, setIsSavingConfig] = useState<boolean>(false);

  const handleSaveConfig = useCallback(() => {
    if (stagingOcrThreshold < 50 || stagingOcrThreshold > 100) {
      showError('O limite de confiança de validação deve ser um valor inteiro entre 50% e 100%.');
      return;
    }
    if (stagingStorageLimit < 1 || stagingStorageLimit > 100) {
      showError('O limite de armazenamento deve estar entre 1 GB e 100 GB.');
      return;
    }
    if (stagingApiLimitRate < 10 || stagingApiLimitRate > 1000) {
      showError('O limite de conexões de API deve estar entre 10 e 1000 conexões por minuto.');
      return;
    }

    setIsSavingConfig(true);
    setTimeout(() => {
      setOcrConfidenceThreshold(stagingOcrThreshold);
      setGeminiModel(stagingGeminiModel);
      setStorageLimit(stagingStorageLimit);
      setApiLimitRate(stagingApiLimitRate);
      setIsSavingConfig(false);
      logAction('CONFIG_UPDATE', 'Administrador atualizou configurações gerais do sistema.');
      showSuccess('Configurações gerais atualizadas com sucesso!');
    }, 600);
  }, [stagingOcrThreshold, stagingGeminiModel, stagingStorageLimit, stagingApiLimitRate, ocrConfidenceThreshold, geminiModel, storageLimit, apiLimitRate, setOcrConfidenceThreshold, setGeminiModel, setStorageLimit, setApiLimitRate, logAction]);
  
  const subTabs = [
    { id: 'markets', label: 'Estabelecimentos', icon: <Store className="w-4 h-4" /> },
    { id: 'flyers', label: 'Gerenciar Folhetos', icon: <UploadCloud className="w-4 h-4" /> },
    { id: 'ocr', label: 'Auditoria OCR', icon: <ShieldAlert className="w-4 h-4" /> },
    { id: 'crops', label: 'Gerenciar Recortes', icon: <ImageIcon className="w-4 h-4" /> },
    { id: 'products', label: 'Normalização', icon: <Tag className="w-4 h-4" /> },
    { id: 'history', label: 'Histórico Preços', icon: <History className="w-4 h-4" /> },
    { id: 'database', label: 'Banco de Dados', icon: <Database className="w-4 h-4" /> },
    { id: 'diagnostics', label: 'Diagnóstico', icon: <Activity className="w-4 h-4" /> },
    { id: 'audit', label: 'Log Auditoria', icon: <ScrollText className="w-4 h-4" /> },
    { id: 'config', label: 'Configurações', icon: <Settings className="w-4 h-4" /> },
    { id: 'danger', label: 'ZONA DE PERIGO', icon: <Flame className="w-4 h-4" />, isDanger: true }
  ];

  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleTabClick = useCallback((tabId: string) => {
    if (activeSubTab !== tabId) {
      setActiveSubTab(tabId);
      if (tabId === 'config') {
        setStagingOcrThreshold(ocrConfidenceThreshold);
        setStagingGeminiModel(geminiModel);
        setStagingStorageLimit(storageLimit);
        setStagingApiLimitRate(apiLimitRate);
      }
    }
    setIsMobileSidebarOpen(false);
  }, [activeSubTab, ocrConfidenceThreshold, geminiModel, storageLimit, apiLimitRate, setActiveSubTab, setStagingOcrThreshold, setStagingGeminiModel, setStagingStorageLimit, setStagingApiLimitRate, setIsMobileSidebarOpen]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);


  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 5500);
  };




  // ==========================================
  // RENDER SECTIONS
  // ==========================================
  const renderSubView = () => {
    switch (activeSubTab) {
      case 'markets':
        return <MarketsManager logAction={logAction} />;

      case 'flyers':
        return <FlyersManager onAddFlyerAndOffers={onAddFlyerAndOffers} logAction={logAction} />;

      case 'ocr':
        return <OffersManager initialSubTab="ocr" logAction={logAction} />;

      case 'crops':
        return <OffersManager initialSubTab="crops" logAction={logAction} />;

      case 'products':
        return <ProductsManager logAction={logAction} />;

      case 'history':
        return <OffersManager initialSubTab="history" logAction={logAction} />;

      case 'database':
        return <DatabaseManager />;

      case 'audit':
        return <AuditManager />;

      case 'diagnostics':
        return (
          <DashboardDiagnostics />
        );

      case 'config':
        return (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Configurações Gerais do Sistema</h3>
              <p className="text-xs text-slate-400 mt-0.5">Ajuste os parâmetros padrão para processamento e normalização</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block uppercase">Confiança de Validação Automática (%)</label>
                  <input 
                    type="number" 
                    value={stagingOcrThreshold}
                    onChange={handleStagingOcrThresholdChange}
                    className="w-full mt-1.5 px-3 py-2 bg-slate-50 border-none rounded-xl text-xs font-bold outline-none text-slate-800"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Leituras de OCR com confiança abaixo deste limite entram na fila de auditoria manual.</span>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 block uppercase font-mono tracking-wider">Modelo Gemini Principal</label>
                  {loadingModels ? (
                    <div className="flex items-center gap-2 mt-2 text-slate-400 text-xs font-mono">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                      <span>Carregando modelos do Google Gemini...</span>
                    </div>
                  ) : (
                    <select 
                      value={stagingGeminiModel}
                      onChange={handleStagingGeminiModelChange}
                      className="w-full mt-1.5 px-3.5 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none text-slate-800 focus:border-indigo-500 transition-all cursor-pointer font-sans"
                    >
                      {availableModels.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.name} {!m.isFree ? '⭐ (Pago)' : ' (Gratuito)'}
                        </option>
                      ))}
                      {availableModels.length === 0 && (
                        <>
                          <option value="gemini-3.5-flash">Gemini 3.5 Flash (Padrão)</option>
                          <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite</option>
                          <option value="gemini-2.5-pro">Gemini 2.5 Pro (Sensível)</option>
                        </>
                      )}
                    </select>
                  )}

                  {/* Detailed card explaining the selected model's details */}
                  {(() => {
                    const selected = availableModels.find(m => m.id === stagingGeminiModel);
                    if (!selected) return null;
                    return (
                      <div className="mt-3.5 p-4 bg-indigo-50/40 border border-indigo-100/50 rounded-2xl space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider font-mono">
                            Ficha Técnica do Modelo
                          </span>
                          <span className={`text-[9px] px-2.5 py-0.5 rounded-full font-bold ${selected.isFree ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                            {selected.isFree ? 'Modelo Gratuito' : 'Modelo Pago'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed font-semibold">
                          {selected.description}
                        </p>
                        <div className="grid grid-cols-2 gap-4 pt-2.5 border-t border-indigo-100/40 text-[10px] font-medium text-slate-500">
                          <div>
                            <span className="font-bold text-slate-400 block uppercase text-[8px] tracking-wider mb-0.5">Limitações</span>
                            {selected.limitations}
                          </div>
                          <div>
                            <span className="font-bold text-slate-400 block uppercase text-[8px] tracking-wider mb-0.5 font-mono">Recomendações</span>
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {selected.recommendations.map((rec: string) => (
                                <span key={rec} className="px-1.5 py-0.5 bg-indigo-100/50 text-indigo-700 text-[8px] font-mono rounded font-bold uppercase">
                                  {rec === 'fast' ? 'rápido' : rec === 'images' ? 'multimodal' : rec === 'quality' ? 'preciso' : rec === 'ocr' ? 'ocr/vendas' : rec}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block uppercase">Limite de Armazenamento (GB)</label>
                  <input 
                    type="number" 
                    value={stagingStorageLimit}
                    onChange={handleStagingStorageLimitChange}
                    className="w-full mt-1.5 px-3 py-2 bg-slate-50 border-none rounded-xl text-xs font-bold outline-none text-slate-800"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Espaço máximo em GB destinado para armazenamento de panfletos processados por estabelecimento.</span>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 block uppercase">Limite Máximo de Conexões de API (Minuto)</label>
                  <input 
                    type="number" 
                    value={stagingApiLimitRate}
                    onChange={handleStagingApiLimitRateChange}
                    className="w-full mt-1.5 px-3 py-2 bg-slate-50 border-none rounded-xl text-xs font-bold outline-none text-slate-800"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Tolerância do balanceador de carga contra ataques de força bruta nas APIs do portal.</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setStagingOcrThreshold(ocrConfidenceThreshold);
                  setStagingGeminiModel(geminiModel);
                  setStagingStorageLimit(storageLimit);
                  setStagingApiLimitRate(apiLimitRate);
                  showSuccess('Alterações descartadas.');
                }}
                disabled={isSavingConfig}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Descartar
              </button>
              <button
                type="button"
                onClick={handleSaveConfig}
                disabled={isSavingConfig}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
              >
                {isSavingConfig ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar Configurações'
                )}
              </button>
            </div>
          </div>
        );

      case 'danger':
        return <DangerZoneManager logAction={logAction} showSuccess={showSuccess} showError={showError} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-sans font-bold tracking-tight text-slate-900">
            Painel de Controle Administrativo
          </h1>
          <p className="text-slate-500 mt-1">
            Garantindo integridade dos dados, calibração espacial, CRUD de estabelecimentos e zona de perigo protegida
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 flex items-center gap-1.5">
            <Lock className="w-4 h-4 text-indigo-500" />
            <span>{userEmail}</span>
          </div>
        </div>
      </div>

      {/* Dynamic Alerts Banner */}
      <AnimatePresence>
        {successMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-emerald-50 text-emerald-950 rounded-2xl border border-emerald-100 text-xs font-bold flex items-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </motion.div>
        )}
        {errorMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-rose-50 text-rose-950 rounded-2xl border border-rose-100 text-xs font-bold flex items-center gap-2"
          >
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid structure: Left Sub-navigation Tabs, Right Dynamic Render stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Mobile Header / Hamburger */}
        <div className="lg:hidden flex justify-between items-center bg-white p-4 rounded-3xl border border-slate-100 shadow-sm mb-6">
          <div className="font-bold text-slate-800 flex items-center gap-2">
            {subTabs.find(t => t.id === activeSubTab)?.icon}
            {subTabs.find(t => t.id === activeSubTab)?.label}
          </div>
          <button 
            onClick={handleOpenMobileSidebar}
            className="p-2 bg-slate-100 text-slate-600 rounded-lg"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Overlay */}
        <AnimatePresence>
          {isMobileSidebarOpen && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={handleCloseMobileSidebar}
              className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-40 lg:hidden"
            />
          )}
        </AnimatePresence>

        {/* Left Side Navigation Menu panel */}
        <div className={`
          fixed lg:static inset-y-0 left-0 z-50 w-72 lg:w-auto bg-white lg:bg-transparent lg:border-none shadow-2xl lg:shadow-none
          transform transition-transform duration-300 ease-in-out lg:transform-none lg:transition-none
          ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          lg:col-span-3 h-full overflow-y-auto lg:overflow-visible
        `}>
          <div className="bg-white lg:rounded-3xl lg:border lg:border-slate-100 lg:shadow-sm p-4 lg:p-4 min-h-full">
            <div className="flex justify-between items-center mb-6 lg:hidden">
              <h3 className="font-bold text-slate-800">Menu</h3>
              <button 
                onClick={handleCloseMobileSidebar}
                className="p-2 bg-slate-100 text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <nav className="flex flex-col gap-1">
              {subTabs.map(tab => {
                return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={`text-left px-4 py-3 lg:py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-3 ${
                    activeSubTab === tab.id
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className={`${activeSubTab === tab.id ? 'text-indigo-600' : 'text-slate-400'}`}>
                    {tab.icon}
                  </div>
                  {tab.label}
                </button>
                );
              })}
            </nav>
          </div>
        </div>
        {/* Right Dynamic Stage */}
        <div className="lg:col-span-9">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSubTab}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.1 }}
            >
              <React.Suspense fallback={<div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 text-indigo-500 animate-spin" /></div>}>
                {renderSubView()}
              </React.Suspense>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {viewingOriginalFlyer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl max-w-4xl w-full border border-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex justify-between items-center bg-slate-50 border-b border-slate-100 px-6 py-4">
                <div>
                  <h3 className="font-bold text-slate-800 text-xs">Visualizador Completo do Folheto</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full font-mono">
                      Origem: Processamento IA Multimodal
                    </span>
                    {viewingOriginalFlyer.linkOriginal && (
                      <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-mono font-bold flex items-center gap-1">
                        ✓ Imagem Original Disponível
                      </span>
                    )}
                  </div>
                  {viewingOriginalFlyerOffer && (
                    <p className="text-[11px] text-indigo-600 font-bold mt-1">
                      Destacando: {viewingOriginalFlyerOffer.originalName} (R$ {viewingOriginalFlyerOffer.price.toFixed(2)})
                    </p>
                  )}
                </div>
                
              </div>

              {/* Toolbar */}
              <div className="px-6 py-2 border-b border-slate-100 bg-white flex flex-wrap justify-between items-center gap-3">
                <div className="flex gap-2">
                  {viewingOriginalFlyer.linkOriginal && null}
                </div>
                <div className="flex gap-2">
                  
                  
                </div>
              </div>

              <div className="flex-1 overflow-auto bg-slate-100 p-6 flex items-center justify-center relative min-h-[300px]">
                <div className="relative max-h-[60vh] max-w-full">
                  <img 
                    src={viewOriginalQuality ? (viewingOriginalFlyer.linkOriginal || viewingOriginalFlyer.imageUrl) : viewingOriginalFlyer.imageUrl} 
                    alt="Folheto de Origem" 
                    className="max-h-[60vh] max-w-full object-contain rounded-xl border border-slate-200 bg-white shadow-md"
                    referrerPolicy="no-referrer"
                  />
                  {!viewOriginalQuality && viewingOriginalFlyerOffer && viewingOriginalFlyerOffer.boundingBox && (
                    <div 
                      className="absolute border-2 border-dashed border-red-500 bg-red-500/10 rounded"
                      style={{
                        left: `${viewingOriginalFlyerOffer.boundingBox.x}%`,
                        top: `${viewingOriginalFlyerOffer.boundingBox.y}%`,
                        width: `${viewingOriginalFlyerOffer.boundingBox.width}%`,
                        height: `${viewingOriginalFlyerOffer.boundingBox.height}%`,
                      }}
                    />
                  )}
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default memo(DashboardAdmin);
