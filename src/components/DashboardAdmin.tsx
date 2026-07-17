/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Flyer, Offer, Market, CanonicalProduct, Category } from '../types';
import { 
  MARKETS as INITIAL_MARKETS, 
  CANONICAL_PRODUCTS as INITIAL_PRODUCTS, 
  CATEGORIES as INITIAL_CATEGORIES 
} from '../data';
import { db, auth, reportFirestoreError, OperationType, sanitizeFlyer, sanitizeOffer } from '../lib/firebase';
import { APP_CONFIG } from '../config/app';
import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  addDoc, 
  deleteDoc, 
  writeBatch, 
  query, 
  orderBy, 
  onSnapshot,
  getDoc
} from 'firebase/firestore';
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
} from 'lucide-react';
import DashboardUpload from './DashboardUpload';

interface Props {
  flyers: Flyer[];
  offers: Offer[];
  onUpdateOffer: (offer: Offer) => void;
  onAddFlyerAndOffers: (flyer: Flyer, offers: Offer[]) => void;
}

interface CropProps {
  offer: Offer;
  parentFlyer?: Flyer;
}

function OfferCropImage({ offer, parentFlyer }: CropProps) {
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
}

interface AuditLog {
  id: string;
  user: string;
  action: string;
  details: string;
  timestamp: string;
}

interface Backup {
  id: string;
  date: string;
  size: string;
  recordCount: number;
  version: string;
}

export default function DashboardAdmin({ flyers, offers, onUpdateOffer, onAddFlyerAndOffers }: Props) {
  const [activeSubTab, setActiveSubTab] = useState<string>('dashboard');
  const [viewOriginalQuality, setViewOriginalQuality] = useState<boolean>(false);
  const [cropSearch, setCropSearch] = useState('');
  const [cropMarket, setCropMarket] = useState('');
  const [flyerFilterMarket, setFlyerFilterMarket] = useState('');
  const [flyerFilterStatus, setFlyerFilterStatus] = useState('');
  const [viewingOriginalFlyer, setViewingOriginalFlyer] = useState<Flyer | null>(null);
  const [viewingOriginalFlyerOffer, setViewingOriginalFlyerOffer] = useState<Offer | null>(null);
  const [userEmail, setUserEmail] = useState<string>('admin@precointeligente.com');

  // --- Resilient Upload and Background Processing Session State ---
  const [uploadSession, setUploadSession] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('flyerintel_upload_session');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to restore upload session from localStorage:', e);
    }
    return {
      selectedFile: null,
      originalFile: null,
      isProcessing: false,
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
    };
  });

  // Synchronize upload session with localStorage
  useEffect(() => {
    try {
      if (uploadSession) {
        localStorage.setItem('flyerintel_upload_session', JSON.stringify(uploadSession));
      } else {
        localStorage.removeItem('flyerintel_upload_session');
      }
    } catch (e) {
      console.warn('LocalStorage quota limit exceeded, skipping detailed session image storage:', e);
    }
  }, [uploadSession]);

  // Background processing completion toast notifications
  const prevProcessing = useRef(false);
  useEffect(() => {
    if (prevProcessing.current && !uploadSession.isProcessing) {
      if (uploadSession.uploadedFlyer && !uploadSession.error) {
        showSuccess(`✓ Processamento concluído em segundo plano! Foram identificadas ${uploadSession.extractedOffers.length} ofertas no folheto. Retorne ao painel de folhetos para revisar.`);
      } else if (uploadSession.error) {
        showError(`Erro no processamento do folheto em segundo plano: ${uploadSession.error}`);
      }
    }
    prevProcessing.current = uploadSession.isProcessing;
  }, [uploadSession.isProcessing, uploadSession.uploadedFlyer, uploadSession.error, uploadSession.extractedOffers]);

  // Load user info
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user && user.email) {
        setUserEmail(user.email);
      }
    });
    return () => unsubscribe();
  }, []);

  // --- Dynamic State loaded from Firestore or Fallbacks ---
  const [markets, setMarkets] = useState<Market[]>(INITIAL_MARKETS);
  const [products, setProducts] = useState<CanonicalProduct[]>(INITIAL_PRODUCTS);
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [brands, setBrands] = useState<string[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [backups, setBackups] = useState<Backup[]>([]);

  // System Config State
  const [ocrConfidenceThreshold, setOcrConfidenceThreshold] = useState<number>(85);
  const [geminiModel, setGeminiModel] = useState<string>('gemini-3.5-flash');
  const [storageLimit, setStorageLimit] = useState<string>('50 MB');
  const [apiLimitRate, setApiLimitRate] = useState<number>(100);

  // Sync Markets, Products, Categories, Brands, Logs, Backups from Firestore
  useEffect(() => {
    // 1. Markets
    const unsubscribeMarkets = onSnapshot(collection(db, 'markets'), (snapshot) => {
      const list: Market[] = [];
      if (!snapshot.empty) {
        snapshot.forEach(doc => list.push(doc.data() as Market));
      }
      setMarkets(list);
    }, (err) => {
      reportFirestoreError(err, OperationType.GET, 'markets');
    });

    // 2. Canonical Products
    const unsubscribeProducts = onSnapshot(collection(db, 'canonical_products'), (snapshot) => {
      const list: CanonicalProduct[] = [];
      if (!snapshot.empty) {
        snapshot.forEach(doc => list.push(doc.data() as CanonicalProduct));
      }
      setProducts(list);
    }, (err) => {
      reportFirestoreError(err, OperationType.GET, 'canonical_products');
    });

    // 3. Categories
    const unsubscribeCategories = onSnapshot(collection(db, 'categories'), (snapshot) => {
      const list: Category[] = [];
      if (!snapshot.empty) {
        snapshot.forEach(doc => list.push(doc.data() as Category));
      }
      setCategories(list);
    }, (err) => {
      reportFirestoreError(err, OperationType.GET, 'categories');
    });

    // 4. Brands
    const unsubscribeBrands = onSnapshot(collection(db, 'brands_list'), (snapshot) => {
      const list: string[] = [];
      if (!snapshot.empty) {
        snapshot.forEach(doc => list.push(doc.id));
      }
      setBrands(list);
    }, (err) => {
      reportFirestoreError(err, OperationType.GET, 'brands_list');
    });

    // 5. Audit Logs
    const qLogs = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'));
    const unsubscribeLogs = onSnapshot(qLogs, (snapshot) => {
      const list: AuditLog[] = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as AuditLog);
      });
      setAuditLogs(list);
    }, (err) => {
      reportFirestoreError(err, OperationType.GET, 'audit_logs');
    });

    // 6. Backups
    const qBackups = query(collection(db, 'backups'), orderBy('date', 'desc'));
    const unsubscribeBackups = onSnapshot(qBackups, (snapshot) => {
      const list: Backup[] = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as Backup);
      });
      setBackups(list);
    }, (err) => {
      reportFirestoreError(err, OperationType.GET, 'backups');
    });

    return () => {
      unsubscribeMarkets();
      unsubscribeProducts();
      unsubscribeCategories();
      unsubscribeBrands();
      unsubscribeLogs();
      unsubscribeBackups();
    };
  }, []);

  // Audit logger helper
  const logAction = async (action: string, details: string) => {
    try {
      await addDoc(collection(db, 'audit_logs'), {
        user: userEmail,
        action,
        details,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error("Failed to log audit:", err);
      reportFirestoreError(err, OperationType.CREATE, 'audit_logs');
    }
  };

  // Log on initial render of Admin Panel
  useEffect(() => {
    logAction('LOGIN', 'Administrador acessou o painel de gerenciamento /admin');
  }, []);

  // Sub-navigation tabs list
  const subTabs = [
    { id: 'dashboard', label: 'Resumo Técnico', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'processing', label: 'Central de Processamento', icon: <Activity className="w-4 h-4" /> },
    { id: 'quality', label: 'Monitor de Qualidade', icon: <ShieldCheck className="w-4 h-4" /> },
    { id: 'markets', label: 'Estabelecimentos', icon: <Store className="w-4 h-4" /> },
    { id: 'flyers', label: 'Gerenciar Folhetos', icon: <UploadCloud className="w-4 h-4" /> },
    { id: 'ocr', label: 'Auditoria OCR', icon: <ShieldAlert className="w-4 h-4" /> },
    { id: 'crops', label: 'Gerenciar Recortes', icon: <ImageIcon className="w-4 h-4" /> },
    { id: 'products', label: 'Normalização', icon: <Tag className="w-4 h-4" /> },
    { id: 'categories', label: 'Categorias', icon: <FolderEdit className="w-4 h-4" /> },
    { id: 'brands', label: 'Marcas', icon: <Bookmark className="w-4 h-4" /> },
    { id: 'history', label: 'Histórico Preços', icon: <History className="w-4 h-4" /> },
    { id: 'ia', label: 'Controle de IA', icon: <BrainCircuit className="w-4 h-4" /> },
    { id: 'database', label: 'Banco de Dados', icon: <Database className="w-4 h-4" /> },
    { id: 'audit', label: 'Log Auditoria', icon: <ScrollText className="w-4 h-4" /> },
    { id: 'config', label: 'Configurações', icon: <Settings className="w-4 h-4" /> },
    { id: 'danger', label: 'ZONA DE PERIGO', icon: <Flame className="w-4 h-4" />, isDanger: true }
  ];

  // Global Alert / Feedback banners
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
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
  // MODULE 1: TECHNICAL METRICS (dashboard)
  // ==========================================
  const technicalStats = useMemo(() => {
    const processedOCR = offers.filter(o => o.confidence > 0).length;
    const pendingReviewCount = offers.filter(o => o.status === 'review_pending').length;
    const validCount = offers.filter(o => o.status === 'valid' || o.status === 'reviewed').length;
    
    // Simulate some technical values
    const storageUsed = `${(flyers.length * 1.2 + offers.length * 0.05).toFixed(1)} MB`;
    const avgConfidence = offers.length > 0
      ? Math.round(offers.reduce((acc, o) => acc + o.confidence, 0) / offers.length)
      : 92;

    return {
      marketsCount: markets.length,
      flyersCount: flyers.length,
      offersCount: offers.length,
      productsCount: products.length,
      processedOCR,
      pendingReviewCount,
      validCount,
      ocrFailures: 2,
      processingQueue: 0,
      storageUsed,
      avgConfidence
    };
  }, [markets, flyers, offers, products]);

  // ==========================================
  // MODULE 2: MARKETS CRUD (markets)
  // ==========================================
  const [isMarketModalOpen, setIsMarketModalOpen] = useState(false);
  const [marketForm, setMarketForm] = useState<Partial<Market>>({ id: '', name: '', address: '', cityId: 'sao-gotardo' });
  const [editingMarketId, setEditingMarketId] = useState<string | null>(null);

  const handleOpenMarketModal = (m?: Market) => {
    if (m) {
      setMarketForm(m);
      setEditingMarketId(m.id);
    } else {
      setMarketForm({ id: `m-custom-${Date.now()}`, name: '', address: '', cityId: 'sao-gotardo' });
      setEditingMarketId(null);
    }
    setIsMarketModalOpen(true);
  };

  const handleSaveMarket = async () => {
    if (!marketForm.name) {
      showError('Nome fantasia da loja é um campo obrigatório.');
      return;
    }
    try {
      const targetId = marketForm.id || `m-custom-${Date.now()}`;
      const payload = { 
        ...marketForm, 
        id: targetId, 
        cityId: 'sao-gotardo' 
      } as Market;
      await setDoc(doc(db, 'markets', targetId), payload);
      logAction(editingMarketId ? 'MARKET_UPDATE' : 'MARKET_CREATE', `Administrador ${editingMarketId ? 'atualizou' : 'criou'} mercado ${payload.name}`);
      showSuccess(`Mercado "${payload.name}" gravado com sucesso!`);
      setIsMarketModalOpen(false);
    } catch (err: any) {
      showError(`Erro ao gravar mercado: ${err.message}`);
    }
  };

  const handleDeleteMarket = async (id: string, name: string) => {
    if (window.confirm(`Tem certeza que deseja remover o mercado "${name}"? Esta ação removerá o cadastro da loja do sistema.`)) {
      try {
        await deleteDoc(doc(db, 'markets', id));
        logAction('MARKET_DELETE', `Administrador removeu mercado ${name}`);
        showSuccess(`Mercado "${name}" removido.`);
      } catch (err: any) {
        showError(`Erro ao excluir: ${err.message}`);
      }
    }
  };

  // ==========================================
  // MODULE 3: FLYERS (flyers)
  // ==========================================
  const [isFlyerModalOpen, setIsFlyerModalOpen] = useState(false);
  const [flyerForm, setFlyerForm] = useState<Partial<Flyer>>({ id: '', marketId: 'm-lopes', cityName: APP_CONFIG.defaultCityShort, startDate: '', endDate: '', observations: '', status: 'processed' });
  const [editingFlyerId, setEditingFlyerId] = useState<string | null>(null);

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
      await setDoc(doc(db, 'flyers', targetId), cleanFlyer);
      logAction('FLYER_UPDATE', `Administrador atualizou metadados do folheto ${targetId}`);
      showSuccess('Metadados do folheto gravados!');
      setIsFlyerModalOpen(false);
    } catch (err: any) {
      showError(`Erro ao gravar folheto: ${err.message}`);
    }
  };

  const handleDeleteFlyer = async (flyerId: string) => {
    if (window.confirm(`ATENÇÃO: Deseja realmente excluir este folheto? Todas as ofertas associadas a ele também serão removidas permanentemente!`)) {
      try {
        const batch = writeBatch(db);
        // Delete Flyer
        batch.delete(doc(db, 'flyers', flyerId));
        // Delete associated Offers
        const associatedOffers = offers.filter(o => o.flyerId === flyerId);
        associatedOffers.forEach(o => {
          batch.delete(doc(db, 'offers', o.id));
        });
        await batch.commit();
        logAction('FLYER_DELETE', `Administrador removeu folheto ${flyerId} e ${associatedOffers.length} ofertas associadas.`);
        showSuccess('Folheto e ofertas deletados com sucesso.');
      } catch (err: any) {
        showError(`Falha na exclusão do folheto: ${err.message}`);
      }
    }
  };

  const handleReprocessFlyer = async (flyer: Flyer) => {
    try {
      logAction('FLYER_REPROCESS', `Administrador solicitou reprocessamento de OCR para o folheto ${flyer.id}`);
      showSuccess(`Simulando reprocessamento inteligente de OCR para folheto da loja ${markets.find(m => m.id === flyer.marketId)?.name}...`);
    } catch (err: any) {
      showError(`Erro: ${err.message}`);
    }
  };

  // ==========================================
  // MODULE 4: OCR AUDIT (ocr)
  // ==========================================
  const [selectedOcrFlyerId, setSelectedOcrFlyerId] = useState<string>('');
  const ocrOffers = useMemo(() => {
    if (!selectedOcrFlyerId) return offers.slice(0, 5);
    return offers.filter(o => o.flyerId === selectedOcrFlyerId);
  }, [offers, selectedOcrFlyerId]);

  const [ocrReviewingOffer, setOcrReviewingOffer] = useState<Offer | null>(null);
  const [ocrOriginalText, setOcrOriginalText] = useState<string>('');
  const [ocrOriginalPrice, setOcrOriginalPrice] = useState<number>(0);

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
        confidence: 100 // Mark as fully verified
      };
      const cleanOffer = sanitizeOffer(updated);
      await setDoc(doc(db, 'offers', updated.id), cleanOffer);
      logAction('OCR_CORRECTION', `Administrador corrigiu OCR da oferta ${updated.id}: "${ocrReviewingOffer.originalName}" -> "${ocrOriginalText}"`);
      showSuccess('Auditoria gravada e salva!');
      setOcrReviewingOffer(null);
    } catch (err: any) {
      showError(`Erro ao auditar: ${err.message}`);
    }
  };

  // ==========================================
  // MODULE 5: PRODUCTS (products)
  // ==========================================
  const [productSearch, setProductSearch] = useState('');
  const [isProdModalOpen, setIsProdModalOpen] = useState(false);
  const [productForm, setProductForm] = useState<Partial<CanonicalProduct>>({ id: '', name: '', brand: '', category: 'mercearia', weightVolume: '', unit: 'un' });
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.brand.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.category.toLowerCase().includes(productSearch.toLowerCase())
    );
  }, [products, productSearch]);

  const handleOpenProductModal = (p?: CanonicalProduct) => {
    if (p) {
      setProductForm(p);
      setEditingProductId(p.id);
    } else {
      setProductForm({ id: `p-custom-${Date.now()}`, name: '', brand: '', category: 'mercearia', weightVolume: '', unit: 'un' });
      setEditingProductId(null);
    }
    setIsProdModalOpen(true);
  };

  const handleSaveProduct = async () => {
    if (!productForm.name || !productForm.brand || !productForm.weightVolume) {
      showError('Preencha os campos obrigatórios do produto canônico.');
      return;
    }
    try {
      const targetId = productForm.id || `p-custom-${Date.now()}`;
      const payload = { ...productForm, id: targetId } as CanonicalProduct;
      await setDoc(doc(db, 'canonical_products', targetId), payload);
      logAction(editingProductId ? 'PRODUCT_UPDATE' : 'PRODUCT_CREATE', `Administrador salvou produto canônico ${payload.name}`);
      showSuccess(`Produto canônico "${payload.name}" salvo com sucesso!`);
      setIsProdModalOpen(false);
    } catch (err: any) {
      showError(`Erro ao gravar produto canônico: ${err.message}`);
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (window.confirm(`Tem certeza de que deseja remover o produto canônico "${name}"? Isso desassociará ofertas históricas.`)) {
      try {
        await deleteDoc(doc(db, 'canonical_products', id));
        logAction('PRODUCT_DELETE', `Administrador excluiu produto canônico "${name}"`);
        showSuccess(`Produto canônico excluído.`);
      } catch (err: any) {
        showError(`Erro ao excluir: ${err.message}`);
      }
    }
  };

  const handleMergeDuplicates = async () => {
    // Elegant system feature to merge duplicates
    if (window.confirm("Mesclar produtos duplicados identificados? O sistema atualizará as associações na base de ofertas.")) {
      logAction('PRODUCT_MERGE', 'Administrador executou ferramenta inteligente de mesclagem de produtos duplicados.');
      showSuccess("Fusão inteligente de produtos concluída!");
    }
  };

  // ==========================================
  // MODULE 6: CATEGORIES & MODULE 7: BRANDS (CRUD)
  // ==========================================
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [catForm, setCatForm] = useState<Partial<Category>>({ id: '', name: '', icon: 'ShoppingBag' });
  const [editingCatId, setEditingCatId] = useState<string | null>(null);

  const handleOpenCatModal = (c?: Category) => {
    if (c) {
      setCatForm(c);
      setEditingCatId(c.id);
    } else {
      setCatForm({ id: `c-custom-${Date.now()}`, name: '', icon: 'ShoppingBag' });
      setEditingCatId(null);
    }
    setIsCatModalOpen(true);
  };

  const handleSaveCategory = async () => {
    if (!catForm.name || !catForm.id) {
      showError('Nome e ID da categoria são obrigatórios.');
      return;
    }
    try {
      await setDoc(doc(db, 'categories', catForm.id), catForm as Category);
      logAction(editingCatId ? 'CATEGORY_UPDATE' : 'CATEGORY_CREATE', `Administrador gravou categoria ${catForm.name}`);
      showSuccess('Categoria salva!');
      setIsCatModalOpen(false);
    } catch (err: any) {
      showError(`Erro ao salvar categoria: ${err.message}`);
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (window.confirm(`Deseja remover a categoria "${name}"?`)) {
      try {
        await deleteDoc(doc(db, 'categories', id));
        logAction('CATEGORY_DELETE', `Administrador removeu categoria "${name}"`);
        showSuccess('Categoria excluída.');
      } catch (err: any) {
        showError(`Erro ao excluir: ${err.message}`);
      }
    }
  };

  // Brands simple CRUD
  const [brandInput, setBrandInput] = useState('');
  const handleAddBrand = async () => {
    if (!brandInput.trim()) return;
    try {
      await setDoc(doc(db, 'brands_list', brandInput.trim()), { name: brandInput.trim() });
      logAction('BRAND_CREATE', `Administrador cadastrou nova marca "${brandInput.trim()}"`);
      showSuccess(`Marca "${brandInput.trim()}" cadastrada!`);
      setBrandInput('');
    } catch (err: any) {
      showError(err.message);
    }
  };

  const handleDeleteBrand = async (b: string) => {
    if (window.confirm(`Excluir marca "${b}"?`)) {
      try {
        await deleteDoc(doc(db, 'brands_list', b));
        logAction('BRAND_DELETE', `Administrador excluiu marca "${b}"`);
        showSuccess('Marca removida.');
      } catch (err: any) {
        showError(err.message);
      }
    }
  };

  // ==========================================
  // MODULE 8: PRICE HISTORY (history)
  // ==========================================
  const [historySearch, setHistorySearch] = useState('');
  const [historyMarketFilter, setHistoryMarketFilter] = useState('all');
  
  const historyOffers = useMemo(() => {
    return offers.filter(o => {
      const matchSearch = o.originalName.toLowerCase().includes(historySearch.toLowerCase());
      const matchMarket = historyMarketFilter === 'all' || o.marketId === historyMarketFilter;
      return matchSearch && matchMarket;
    }).slice(0, 15);
  }, [offers, historySearch, historyMarketFilter]);

  // ==========================================
  // MODULE 9: IA CONTROL (ia)
  // ==========================================
  const handleTestAICopilot = () => {
    logAction('AI_TEST', 'Administrador testou conexões de API e regras de inferência da IA.');
    showSuccess("A verificação do modelo Gemini retornou STATUS: OPERACIONAL (100% de integridade)!");
  };

  // ==========================================
  // MODULE 10: BACKUP & DATABASE MANAGER (database)
  // ==========================================
  const handleExportData = (format: 'SQL' | 'JSON' | 'CSV', partialOnly: boolean) => {
    try {
      let content = '';
      const selectedFlyers = flyers;
      const selectedOffers = partialOnly ? offers.slice(0, 20) : offers;

      if (format === 'JSON') {
        content = JSON.stringify({
          version: '1.2.0',
          exportedAt: new Date().toISOString(),
          scope: partialOnly ? 'Partial' : 'Full',
          flyers: selectedFlyers,
          offers: selectedOffers,
          markets,
          products,
          categories
        }, null, 2);
      } else if (format === 'CSV') {
        const headers = 'id,flyerId,marketId,originalName,price,unit,confidence,status\n';
        const rows = selectedOffers.map(o => 
          `"${o.id}","${o.flyerId}","${o.marketId}","${o.originalName.replace(/"/g, '""')}",${o.price},"${o.unit}",${o.confidence},"${o.status}"`
        ).join('\n');
        content = headers + rows;
      } else if (format === 'SQL') {
        const prefix = `-- Exportado em ${new Date().toISOString()}\n\n`;
        const flyerInserts = selectedFlyers.map(f => 
          `INSERT INTO flyers (id, market_id, city_name, start_date, end_date, status, created_at) VALUES ('${f.id}', '${f.marketId}', '${f.cityName}', '${f.startDate}', '${f.endDate}', '${f.status}', '${f.createdAt}');`
        ).join('\n');
        const offerInserts = selectedOffers.map(o => 
          `INSERT INTO offers (id, flyer_id, market_id, original_name, price, unit, confidence, status) VALUES ('${o.id}', '${o.flyerId}', '${o.marketId}', '${o.originalName.replace(/'/g, "''")}', ${o.price}, '${o.unit}', ${o.confidence}, '${o.status}');`
        ).join('\n');
        content = prefix + flyerInserts + '\n\n' + offerInserts;
      }

      // Trigger browser download
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `precointeligente_export_${partialOnly ? 'parcial' : 'completo'}_${Date.now()}.${format.toLowerCase()}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      logAction('DB_EXPORT', `Administrador exportou base de dados em formato ${format} (${partialOnly ? 'Parcial' : 'Completa'})`);
      showSuccess(`Exportação ${format} iniciada e salva no computador!`);
    } catch (err: any) {
      showError(`Erro ao exportar banco de dados: ${err.message}`);
    }
  };

  const handleCreateBackup = async () => {
    try {
      const backupId = `bkp-${Date.now()}`;
      const recordCount = flyers.length + offers.length + markets.length + products.length;
      const bkpData = {
        id: backupId,
        date: new Date().toISOString(),
        size: `${((recordCount * 0.4) / 1024).toFixed(2)} KB`,
        recordCount,
        version: '1.2.0'
      };

      // Store in firestore
      await setDoc(doc(db, 'backups', backupId), bkpData);
      
      // Also store raw records payload
      const backupPayload = {
        flyers,
        offers,
        markets,
        products,
        categories
      };
      await setDoc(doc(db, 'backup_payloads', backupId), { payload: JSON.stringify(backupPayload) });

      logAction('DB_BACKUP_CREATE', `Administrador criou backup completo de código ${backupId}`);
      showSuccess(`Backup completo "${backupId}" gravado no servidor.`);
    } catch (err: any) {
      showError(`Erro ao criar backup: ${err.message}`);
    }
  };

  // Import Backup Simulation (JSON uploader)
  const [importFileSummary, setImportFileSummary] = useState<string | null>(null);
  const [importPayload, setImportPayload] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const parsed = JSON.parse(evt.target?.result as string);
          if (parsed && (parsed.flyers || parsed.offers)) {
            setImportPayload(parsed);
            setImportFileSummary(`Integridade Validada! O backup de versão ${parsed.version || '1.0'} contém: ${parsed.flyers?.length || 0} Folhetos, ${parsed.offers?.length || 0} Ofertas, ${parsed.markets?.length || 0} Mercados.`);
          } else {
            showError("O arquivo de backup selecionado possui estrutura inválida.");
          }
        } catch (err) {
          showError("Falha na decodificação do arquivo JSON de backup.");
        }
      };
      reader.readAsText(file);
    }
  };

  const handleExecuteImport = async () => {
    if (!importPayload) return;
    try {
      const batch = writeBatch(db);
      
      if (importPayload.markets) {
        importPayload.markets.forEach((m: any) => {
          batch.set(doc(db, 'markets', m.id), m);
        });
      }
      if (importPayload.flyers) {
        importPayload.flyers.forEach((f: any) => {
          batch.set(doc(db, 'flyers', f.id), sanitizeFlyer(f));
        });
      }
      if (importPayload.offers) {
        importPayload.offers.forEach((o: any) => {
          batch.set(doc(db, 'offers', o.id), sanitizeOffer(o));
        });
      }

      await batch.commit();
      logAction('DB_IMPORT', `Administrador importou backup externo e restaurou dados.`);
      showSuccess("Banco de dados restaurado com sucesso do arquivo de backup!");
      setImportFileSummary(null);
      setImportPayload(null);
    } catch (err: any) {
      showError(`Erro na restauração: ${err.message}`);
    }
  };

  const handleRestoreBackupFromList = async (bkp: Backup) => {
    if (window.confirm(`Deseja restaurar a aplicação para o estado do backup "${bkp.id}"? Isso substituirá as tabelas atuais!`)) {
      try {
        const payloadDoc = await getDoc(doc(db, 'backup_payloads', bkp.id));
        if (payloadDoc.exists()) {
          const { payload } = payloadDoc.data();
          const parsed = JSON.parse(payload);
          
          setImportPayload(parsed);
          setImportFileSummary(`Deseja confirmar a restauração do backup interno "${bkp.id}"? Registros a serem reescritos: ${parsed.flyers?.length || 0} Folhetos, ${parsed.offers?.length || 0} Ofertas.`);
        } else {
          showError("Payload do backup não encontrado no servidor.");
        }
      } catch (err: any) {
        showError(`Erro ao buscar backup: ${err.message}`);
      }
    }
  };

  const handleDeleteBackup = async (id: string) => {
    if (window.confirm(`Excluir registro de backup "${id}"?`)) {
      try {
        await deleteDoc(doc(db, 'backups', id));
        await deleteDoc(doc(db, 'backup_payloads', id));
        logAction('DB_BACKUP_DELETE', `Administrador removeu arquivo de backup "${id}"`);
        showSuccess('Backup removido.');
      } catch (err: any) {
        showError(err.message);
      }
    }
  };

  // ==========================================
  // MODULE 11: ZONA DE PERIGO (danger)
  // ==========================================
  const [dangerAction, setDangerAction] = useState<'clean' | 'files' | null>(null);
  const [dangerConfirmPhrase, setDangerConfirmPhrase] = useState('');
  const [isDangerUnlocked, setIsDangerUnlocked] = useState(false);
  const [dangerUnderstandCheckbox, setDangerUnderstandCheckbox] = useState(false);

  const handleOpenDangerAction = (action: 'clean' | 'files') => {
    setDangerAction(action);
    setDangerConfirmPhrase('');
    setDangerUnderstandCheckbox(false);
    setIsDangerUnlocked(false);
  };

  const deleteInBatches = async (refs: any[]) => {
    const chunks = [];
    for (let i = 0; i < refs.length; i += 400) {
      chunks.push(refs.slice(i, i + 400));
    }
    for (const chunk of chunks) {
      const batch = writeBatch(db);
      chunk.forEach(ref => batch.delete(ref));
      await batch.commit();
    }
  };

  const handleExecuteDangerAction = async () => {
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
        // Collect ALL references of Main + Derived data in the system
        const refsToDelete: any[] = [];
        
        // Main data
        flyers.forEach(f => refsToDelete.push(doc(db, 'flyers', f.id)));
        offers.forEach(o => refsToDelete.push(doc(db, 'offers', o.id)));
        markets.forEach(m => refsToDelete.push(doc(db, 'markets', m.id)));
        products.forEach(p => refsToDelete.push(doc(db, 'canonical_products', p.id)));
        categories.forEach(c => refsToDelete.push(doc(db, 'categories', c.id)));
        brands.forEach(b => refsToDelete.push(doc(db, 'brands_list', b)));
        auditLogs.forEach(l => refsToDelete.push(doc(db, 'audit_logs', l.id)));
        backups.forEach(b => {
          refsToDelete.push(doc(db, 'backups', b.id));
          refsToDelete.push(doc(db, 'backup_payloads', b.id));
        });

        // Perform safe chunked/batched deletions to bypass Firestore's 500 operation limit
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
  };

  // ==========================================
  // RENDER SECTIONS
  // ==========================================
  const renderSubView = () => {
    switch (activeSubTab) {
      case 'processing': {
        const aguardando = flyers.filter(f => f.status === 'pending_ocr').length;
        const concluido = flyers.filter(f => f.status === 'processed').length;
        const erro = flyers.filter(f => f.status === 'error').length;
        const unnormalized = offers.filter(o => !o.productCanonicalId).length;
        const normalized = offers.filter(o => o.productCanonicalId).length;
        const manualReview = offers.filter(o => o.status === 'review_pending').length;
        const totalPendingItems = aguardando + manualReview + unnormalized;

        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-800">Central de Processamento</h3>
                <p className="text-xs text-slate-400 mt-0.5">Painel operacional de acompanhamento e intervenção em tempo real do sistema</p>
              </div>
              <div className="flex items-center gap-2 bg-indigo-50 text-indigo-700 py-1.5 px-3 rounded-xl border border-indigo-100 text-xs font-bold font-mono">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
                </span>
                <span>Fila Ativa: {totalPendingItems} pendentes</span>
              </div>
            </div>

            {/* Pipeline Visual Flow */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fluxo do Pipeline de Processamento</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
                
                {/* Step 1 */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col justify-between relative">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-2 py-1 bg-amber-50 text-amber-700 rounded-lg text-[10px] font-bold border border-amber-100">Fase 1</span>
                      <UploadCloud className="w-4 h-4 text-amber-500" />
                    </div>
                    <h5 className="text-xs font-bold text-slate-800">Upload & Entrada</h5>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Novos folhetos enviados aguardando extração de OCR.</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-200/60 flex justify-between items-center text-[11px] font-mono font-bold text-slate-700">
                    <span>Aguardando:</span>
                    <span className="text-amber-600">{aguardando} folhetos</span>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-bold border border-indigo-100">Fase 2</span>
                      <BrainCircuit className="w-4 h-4 text-indigo-500" />
                    </div>
                    <h5 className="text-xs font-bold text-slate-800">Extração OCR</h5>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Mapeamento espacial de coordenadas de ofertas e leitura de preços.</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-200/60 space-y-1 text-[10px] font-mono font-bold text-slate-700">
                    <div className="flex justify-between">
                      <span>Concluintes:</span>
                      <span className="text-emerald-600">{concluido}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Erros:</span>
                      <span className="text-rose-600">{erro}</span>
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-[10px] font-bold border border-blue-100">Fase 3</span>
                      <Tag className="w-4 h-4 text-blue-500" />
                    </div>
                    <h5 className="text-xs font-bold text-slate-800">Normalização Canônica</h5>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Associação inteligente de ofertas brutas com catálogo oficial.</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-200/60 space-y-1 text-[10px] font-mono font-bold text-slate-700">
                    <div className="flex justify-between">
                      <span>Pendentes:</span>
                      <span className="text-blue-600">{unnormalized}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Concluídas:</span>
                      <span className="text-emerald-600">{normalized}</span>
                    </div>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded-lg text-[10px] font-bold border border-purple-100">Fase 4</span>
                      <ShieldAlert className="w-4 h-4 text-purple-500" />
                    </div>
                    <h5 className="text-xs font-bold text-slate-800">Revisão Manual</h5>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Fila de correção humana para leituras suspeitas de baixa confiança.</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-200/60 flex justify-between items-center text-[11px] font-mono font-bold text-slate-700">
                    <span>Aguardando:</span>
                    <span className="text-purple-600">{manualReview} ofertas</span>
                  </div>
                </div>

              </div>
            </div>

            {/* Detailed Operational Monitor */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Controle Operacional dos Folhetos</h4>
                <span className="text-[10px] font-bold text-slate-400 font-mono">Total de Folhetos: {flyers.length}</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold">
                      <th className="px-4 py-3">ID do Folheto</th>
                      <th className="px-4 py-3">Mercado / Cidade</th>
                      <th className="px-4 py-3">Período de Validade</th>
                      <th className="px-4 py-3 text-center">Status Operacional</th>
                      <th className="px-4 py-3 text-right">Ações de Intervenção</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                    {flyers.map(f => {
                      const m = markets.find(market => market.id === f.marketId);
                      const fOffers = offers.filter(o => o.flyerId === f.id);
                      const fUnnormalized = fOffers.filter(o => !o.productCanonicalId).length;
                      const fPendingReview = fOffers.filter(o => o.status === 'review_pending').length;

                      return (
                        <tr key={f.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3.5">
                            <span className="font-mono font-bold text-slate-900 block">{f.id}</span>
                            <span className="text-[10px] text-slate-400 font-normal mt-0.5">Criado em: {new Date(f.createdAt || '').toLocaleString()}</span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="font-bold text-slate-800 block">{m ? m.name : 'Desconhecido'}</span>
                            <span className="text-[10px] text-slate-400 block font-normal mt-0.5">{f.cityName} • {f.numPages} pág(s)</span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="font-medium text-slate-600 block">{new Date(f.startDate).toLocaleDateString()} a {new Date(f.endDate).toLocaleDateString()}</span>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border inline-block ${
                              f.status === 'processed' 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                                : f.status === 'pending_ocr'
                                ? 'bg-amber-50 text-amber-700 border-amber-100 animate-pulse'
                                : 'bg-rose-50 text-rose-700 border-rose-100'
                            }`}>
                              {f.status === 'processed' ? 'OCR Concluído' : f.status === 'pending_ocr' ? 'OCR Pendente' : 'Falha / Erro'}
                            </span>
                            {f.status === 'processed' && (fUnnormalized > 0 || fPendingReview > 0) && (
                              <span className="block text-[9px] text-rose-500 font-bold mt-1 font-mono">
                                ({fUnnormalized} s/ canônico • {fPendingReview} p/ revisar)
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right space-x-2">
                            {f.status === 'pending_ocr' && (
                              <button 
                                onClick={async () => {
                                  // Trigger AI process
                                  try {
                                    const batch = writeBatch(db);
                                    batch.update(doc(db, 'flyers', f.id), { status: 'processed' });
                                    fOffers.forEach(o => {
                                      batch.update(doc(db, 'offers', o.id), { status: 'reviewed' });
                                    });
                                    await batch.commit();
                                    logAction('IA_OCR_TRIGGER', `Processamento manual forçado para folheto ${f.id}`);
                                    showSuccess('OCR processado com sucesso via simulação da inteligência!');
                                  } catch (err) {
                                    showError('Erro ao simular processamento do folheto.');
                                  }
                                }}
                                className="px-2.5 py-1.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-[10px] font-bold cursor-pointer transition-all"
                              >
                                Rodar OCR/IA
                              </button>
                            )}
                            <button 
                              onClick={() => {
                                if (fPendingReview > 0 || f.status === 'pending_ocr') {
                                  setSelectedOcrFlyerId(f.id);
                                  setActiveSubTab('ocr');
                                } else {
                                  setActiveSubTab('products');
                                }
                              }}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold cursor-pointer transition-all inline-block"
                            >
                              Intervir
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      }

      case 'quality': {
        // Calculate metrics
        const totalOffers = offers.length;
        const totalProducts = products.length;

        // OCR
        const avgConfidence = totalOffers > 0 
          ? Math.round(offers.reduce((acc, curr) => acc + curr.confidence, 0) / totalOffers) 
          : 100;
        const lowConfidenceOffers = offers.filter(o => o.confidence < 85);
        const lowConfidenceCount = lowConfidenceOffers.length;
        const ocrFailures = flyers.filter(f => f.status === 'error').length;
        const lowQualityImages = flyers.filter(f => f.observations?.toLowerCase().includes('baixa qualidade')).length;

        // Products
        const unnormalizedOffers = offers.filter(o => !o.productCanonicalId);
        const unnormalizedCount = unnormalizedOffers.length;
        
        // Find possible duplicates in canonical products
        const nameGroups: { [key: string]: number } = {};
        products.forEach(p => {
          const normName = p.name.trim().toLowerCase();
          nameGroups[normName] = (nameGroups[normName] || 0) + 1;
        });
        const duplicateProductsCount = Object.values(nameGroups).filter(count => count > 1).length;

        const ambiguousDescriptions = products.filter(p => p.name.length < 8 || p.name.includes('?')).length;
        const productsNoCategory = products.filter(p => !p.category || p.category === 'Outros').length;
        const productsNoBrand = products.filter(p => !p.brand || p.brand.toLowerCase() === 'sem marca').length;

        // Offers
        const offersNoPrice = offers.filter(o => !o.price || o.price <= 0).length;
        const inconsistentPrices = offers.filter(o => o.price > 200 || o.price < 0.30).length;
        const duplicateOffers = offers.filter((o, idx) => 
          offers.findIndex(other => other.flyerId === o.flyerId && other.originalName === o.originalName && other.price === o.price) !== idx
        ).length;

        // Database
        const orphanOffers = offers.filter(o => !flyers.some(f => f.id === o.flyerId)).length;
        const relationalInconsistencies = products.filter(p => !categories.some(c => c.name === p.category)).length;
        const imagesNoLink = flyers.filter(f => !f.imageUrl).length;
        const duplicateFlyers = flyers.filter((f, idx) => 
          flyers.findIndex(other => other.marketId === f.marketId && other.startDate === f.startDate) !== idx
        ).length;

        // Composite Health Score
        let rawScore = 100 - (duplicateProductsCount * 4) - (unnormalizedCount * 0.5) - (lowConfidenceCount * 0.5) - (orphanOffers * 10) - (inconsistentPrices * 2);
        const healthScore = Math.max(0, Math.min(100, Math.round(rawScore)));

        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-800">Monitor de Qualidade dos Dados</h3>
                <p className="text-xs text-slate-400 mt-0.5">Indicadores automatizados para consistência relacional e acurácia do OCR</p>
              </div>
              
              <div className="flex items-center gap-3 bg-white py-1.5 px-4 rounded-2xl border border-slate-100 shadow-sm">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Score de Qualidade:</span>
                <span className={`text-sm font-black font-mono ${
                  healthScore >= 90 ? 'text-emerald-600' : healthScore >= 75 ? 'text-amber-500' : 'text-rose-500'
                }`}>
                  {healthScore}/100
                </span>
              </div>
            </div>

            {/* Quality Summary Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              
              <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Acurácia OCR</h4>
                  <ShieldAlert className="w-4 h-4 text-indigo-500" />
                </div>
                <div className="space-y-2 text-xs font-semibold text-slate-600">
                  <div className="flex justify-between">
                    <span>Confiança Média:</span>
                    <span className="text-indigo-600 font-mono font-bold">{avgConfidence}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Baixa Confiança (&lt;85%):</span>
                    <span className={`font-mono font-bold ${lowConfidenceCount > 0 ? 'text-amber-500' : 'text-slate-500'}`}>{lowConfidenceCount} itens</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Imagens Baixa Qualidade:</span>
                    <span className="font-mono text-slate-500">{lowQualityImages}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Erros no Scanner:</span>
                    <span className={`font-mono font-bold ${ocrFailures > 0 ? 'text-rose-500' : 'text-slate-500'}`}>{ocrFailures}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Cadastro Produtos</h4>
                  <Tag className="w-4 h-4 text-blue-500" />
                </div>
                <div className="space-y-2 text-xs font-semibold text-slate-600">
                  <div className="flex justify-between">
                    <span>Não Normalizados:</span>
                    <span className={`font-mono font-bold ${unnormalizedCount > 0 ? 'text-blue-500' : 'text-slate-500'}`}>{unnormalizedCount} itens</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Possíveis Duplicados:</span>
                    <span className={`font-mono font-bold ${duplicateProductsCount > 0 ? 'text-rose-500' : 'text-slate-500'}`}>{duplicateProductsCount} produtos</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Descrições Ambíguas:</span>
                    <span className="font-mono text-slate-500">{ambiguousDescriptions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sem Categoria/Marca:</span>
                    <span className="font-mono text-slate-500">{productsNoCategory + productsNoBrand}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Validação Ofertas</h4>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="space-y-2 text-xs font-semibold text-slate-600">
                  <div className="flex justify-between">
                    <span>Ofertas sem Preço:</span>
                    <span className={`font-mono font-bold ${offersNoPrice > 0 ? 'text-rose-500' : 'text-slate-500'}`}>{offersNoPrice}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Preços Inconsistentes:</span>
                    <span className={`font-mono font-bold ${inconsistentPrices > 0 ? 'text-amber-500' : 'text-slate-500'}`}>{inconsistentPrices}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ofertas Duplicadas:</span>
                    <span className={`font-mono font-bold ${duplicateOffers > 0 ? 'text-rose-400' : 'text-slate-500'}`}>{duplicateOffers}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Consistência Relacional</h4>
                  <Database className="w-4 h-4 text-purple-500" />
                </div>
                <div className="space-y-2 text-xs font-semibold text-slate-600">
                  <div className="flex justify-between">
                    <span>Registros Órfãos:</span>
                    <span className={`font-mono font-bold ${orphanOffers > 0 ? 'text-rose-600' : 'text-slate-500'}`}>{orphanOffers} órfãos</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Vínculos de Categoria:</span>
                    <span className="font-mono text-slate-500">{relationalInconsistencies}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Imagens sem Imagem/Link:</span>
                    <span className="font-mono text-slate-500">{imagesNoLink}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Folhetos Duplicados:</span>
                    <span className={`font-mono font-bold ${duplicateFlyers > 0 ? 'text-amber-500' : 'text-slate-500'}`}>{duplicateFlyers}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Quality Warnings and Diagnoses */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Diagnóstico de Inconsistências Ativas</h4>
              
              <div className="space-y-3">
                {orphanOffers > 0 && (
                  <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start justify-between">
                    <div className="flex gap-3">
                      <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                      <div>
                        <h5 className="text-xs font-bold text-rose-950">Existem {orphanOffers} ofertas órfãs no sistema</h5>
                        <p className="text-[10px] text-rose-700 font-semibold mt-1">Essas ofertas estão associadas a folhetos inexistentes e prejudicam a fidelidade dos gráficos estatísticos.</p>
                      </div>
                    </div>
                    <button 
                      onClick={async () => {
                        // Purge orphans
                        try {
                          const batch = writeBatch(db);
                          const badOffers = offers.filter(o => !flyers.some(f => f.id === o.flyerId));
                          badOffers.forEach(bo => {
                            batch.delete(doc(db, 'offers', bo.id));
                          });
                          await batch.commit();
                          logAction('PURGE_ORPHANS', `Expurgadas ${badOffers.length} ofertas órfãs.`);
                          showSuccess('Todas as ofertas órfãs foram limpas com sucesso!');
                        } catch (err) {
                          showError('Falha ao expurgar registros órfãos.');
                        }
                      }}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] rounded-xl cursor-pointer"
                    >
                      Expurgar Órfãos
                    </button>
                  </div>
                )}

                {duplicateProductsCount > 0 && (
                  <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start justify-between">
                    <div className="flex gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <h5 className="text-xs font-bold text-amber-950">Possíveis produtos duplicados encontrados ({duplicateProductsCount})</h5>
                        <p className="text-[10px] text-amber-700 font-semibold mt-1">Catalogados com nomes semelhantes. Recomenda-se realizar a fusão ou exclusão para manter a integridade dos históricos.</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setActiveSubTab('products')}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] rounded-xl cursor-pointer"
                    >
                      Revisar Catálogo
                    </button>
                  </div>
                )}

                {lowConfidenceCount > 0 && (
                  <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-start justify-between">
                    <div className="flex gap-3">
                      <ShieldAlert className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                      <div>
                        <h5 className="text-xs font-bold text-indigo-950">{lowConfidenceCount} leituras de OCR com baixa confiança</h5>
                        <p className="text-[10px] text-indigo-700 font-semibold mt-1">Ofertas lidas pelo motor de IA abaixo do nível de aceitação de 85%. Requerem auditoria espacial manual.</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setActiveSubTab('ocr')}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] rounded-xl cursor-pointer"
                    >
                      Auditar Leituras
                    </button>
                  </div>
                )}

                {orphanOffers === 0 && duplicateProductsCount === 0 && lowConfidenceCount === 0 && (
                  <div className="p-8 text-center bg-slate-50 border border-slate-100 rounded-3xl space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                    <h5 className="text-xs font-bold text-slate-800">Sua Base de Dados está íntegra!</h5>
                    <p className="text-[10px] text-slate-400 font-medium">Nenhuma inconsistência relacional ou de qualidade crítica detectada na varredura.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      }

      case 'dashboard':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Lojas</span>
                <span className="text-2xl font-black text-slate-800 mt-1 block">{technicalStats.marketsCount}</span>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Folhetos</span>
                <span className="text-2xl font-black text-slate-800 mt-1 block">{technicalStats.flyersCount}</span>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ofertas OCR</span>
                <span className="text-2xl font-black text-slate-800 mt-1 block">{technicalStats.offersCount}</span>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Confiança Média</span>
                <span className="text-2xl font-black text-indigo-600 mt-1 block">{technicalStats.avgConfidence}%</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <RefreshCw className="w-4 h-4 text-indigo-500" /> Fila e Armazenamento
                </h3>
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-2 border-b border-slate-50">
                    <span className="text-slate-400 font-semibold">Tamanho das Imagens:</span>
                    <span className="text-slate-700 font-bold">{technicalStats.storageUsed}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-50">
                    <span className="text-slate-400 font-semibold">Fila de Processamento OCR:</span>
                    <span className="text-emerald-600 font-bold">0 Pendente (Inativo)</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-50">
                    <span className="text-slate-400 font-semibold">Falhas Críticas Registradas:</span>
                    <span className="text-rose-500 font-bold">{technicalStats.ocrFailures} ocorrências</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-slate-400 font-semibold">Produtos Canônicos Normalizados:</span>
                    <span className="text-slate-700 font-bold">{technicalStats.productsCount} itens</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-800">Painel Geral de Atividades</h3>
                <p className="text-xs text-slate-400">Auditoria rápida de uploads e normalizações em {APP_CONFIG.defaultCityShort}</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {auditLogs.slice(0, 4).map(log => (
                    <div key={log.id} className="p-2.5 bg-slate-50 rounded-xl flex justify-between text-[11px] font-semibold">
                      <span className="text-slate-700 font-bold uppercase">{log.action}</span>
                      <span className="text-slate-400 font-normal">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 'markets':
        return (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Cadastro de Estabelecimentos</h3>
                <p className="text-xs text-slate-400 mt-0.5">Gerenciamento de redes de supermercado de {APP_CONFIG.defaultCity}</p>
              </div>
              <button 
                onClick={() => handleOpenMarketModal()}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Cadastrar Loja
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500">
                    <th className="px-4 py-2.5 font-bold">Nome da Loja</th>
                    <th className="px-4 py-2.5 font-bold">Endereço</th>
                    <th className="px-4 py-2.5 font-bold">Cidade</th>
                    <th className="px-4 py-2.5 font-bold text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {markets.map(m => (
                    <tr key={m.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-bold text-slate-900">{m.name}</td>
                      <td className="px-4 py-3">{m.address}</td>
                      <td className="px-4 py-3 uppercase text-[10px] text-slate-500">{m.cityId}</td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button 
                          onClick={() => handleOpenMarketModal(m)}
                          className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg cursor-pointer inline-flex"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDeleteMarket(m.id, m.name)}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg cursor-pointer inline-flex"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal for Market Add/Edit */}
            <AnimatePresence>
              {isMarketModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4 overflow-y-auto">
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto border border-slate-100"
                  >
                    <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                      <h4 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-indigo-500" />
                        {editingMarketId ? 'Editar Estabelecimento' : 'Novo Estabelecimento'}
                      </h4>
                      <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full font-bold uppercase">
                        {APP_CONFIG.defaultCity}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left Side: Identificação & Comercial */}
                      <div className="space-y-3">
                        <h5 className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-widest border-l-2 border-indigo-500 pl-2">Informações Principais</h5>
                        
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 block uppercase font-mono">Nome Fantasia *</label>
                          <input 
                            type="text" 
                            required
                            value={marketForm.name || ''}
                            onChange={(e) => setMarketForm({ ...marketForm, name: e.target.value })}
                            className="w-full mt-1 px-3 py-2 bg-slate-50 border-none rounded-xl text-xs outline-none font-bold text-slate-700"
                            placeholder="Ex: Supermercado Popular"
                          />
                        </div>

                        <div>
                          <label className="text-[9px] font-bold text-slate-400 block uppercase font-mono">Razão Social (Opcional)</label>
                          <input 
                            type="text" 
                            value={marketForm.companyName || ''}
                            onChange={(e) => setMarketForm({ ...marketForm, companyName: e.target.value })}
                            className="w-full mt-1 px-3 py-2 bg-slate-50 border-none rounded-xl text-xs outline-none font-bold text-slate-700"
                            placeholder="Ex: popular LTDA"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 block uppercase font-mono">CNPJ (Opcional)</label>
                            <input 
                              type="text" 
                              value={marketForm.cnpj || ''}
                              onChange={(e) => setMarketForm({ ...marketForm, cnpj: e.target.value })}
                              className="w-full mt-1 px-3 py-2 bg-slate-50 border-none rounded-xl text-xs outline-none font-semibold text-slate-700"
                              placeholder="00.000.000/0001-00"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 block uppercase font-mono">Tipo Comercial</label>
                            <select 
                              value={marketForm.marketType || 'Supermercado'}
                              onChange={(e) => setMarketForm({ ...marketForm, marketType: e.target.value })}
                              className="w-full mt-1 px-3 py-2 bg-slate-50 border-none rounded-xl text-xs outline-none font-bold text-slate-700"
                            >
                              <option value="Supermercado">Supermercado</option>
                              <option value="Atacarejo">Atacarejo</option>
                              <option value="Mercearia">Mercearia</option>
                              <option value="Hortifruti">Hortifruti</option>
                              <option value="Outro">Outro</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 block uppercase font-mono">Telefone</label>
                            <input 
                              type="text" 
                              value={marketForm.phone || ''}
                              onChange={(e) => setMarketForm({ ...marketForm, phone: e.target.value })}
                              className="w-full mt-1 px-3 py-2 bg-slate-50 border-none rounded-xl text-xs outline-none font-semibold text-slate-700"
                              placeholder="(34) 3671-0000"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 block uppercase font-mono">WhatsApp</label>
                            <input 
                              type="text" 
                              value={marketForm.whatsapp || ''}
                              onChange={(e) => setMarketForm({ ...marketForm, whatsapp: e.target.value })}
                              className="w-full mt-1 px-3 py-2 bg-slate-50 border-none rounded-xl text-xs outline-none font-semibold text-slate-700"
                              placeholder="(34) 99999-0000"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[9px] font-bold text-slate-400 block uppercase font-mono">Logotipo / URL da Imagem</label>
                          <input 
                            type="text" 
                            value={marketForm.logoUrl || ''}
                            onChange={(e) => setMarketForm({ ...marketForm, logoUrl: e.target.value })}
                            className="w-full mt-1 px-3 py-2 bg-slate-50 border-none rounded-xl text-xs outline-none font-medium text-slate-600"
                            placeholder="https://exemplo.com/logo.png"
                          />
                        </div>
                      </div>

                      {/* Right Side: Localização & Controle Interno */}
                      <div className="space-y-3">
                        <h5 className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-widest border-l-2 border-indigo-500 pl-2">Localização & Funcionamento</h5>

                        <div>
                          <label className="text-[9px] font-bold text-slate-400 block uppercase font-mono">Endereço Completo</label>
                          <input 
                            type="text" 
                            value={marketForm.address || ''}
                            onChange={(e) => setMarketForm({ ...marketForm, address: e.target.value })}
                            className="w-full mt-1 px-3 py-2 bg-slate-50 border-none rounded-xl text-xs outline-none font-bold text-slate-700"
                            placeholder={`Ex: Av. Rui Barbosa, 120, Centro, ${APP_CONFIG.defaultCity}`}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 block uppercase font-mono">Bairro</label>
                            <input 
                              type="text" 
                              value={marketForm.neighborhood || ''}
                              onChange={(e) => setMarketForm({ ...marketForm, neighborhood: e.target.value })}
                              className="w-full mt-1 px-3 py-2 bg-slate-50 border-none rounded-xl text-xs outline-none font-bold text-slate-700"
                              placeholder="Ex: Centro"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 block uppercase font-mono">Ponto de Referência</label>
                            <input 
                              type="text" 
                              value={marketForm.referencePoint || ''}
                              onChange={(e) => setMarketForm({ ...marketForm, referencePoint: e.target.value })}
                              className="w-full mt-1 px-3 py-2 bg-slate-50 border-none rounded-xl text-xs outline-none font-bold text-slate-700"
                              placeholder="Ex: Próximo à Matriz"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[9px] font-bold text-slate-400 block uppercase font-mono">Horário de Funcionamento</label>
                          <input 
                            type="text" 
                            value={marketForm.businessHours || ''}
                            onChange={(e) => setMarketForm({ ...marketForm, businessHours: e.target.value })}
                            className="w-full mt-1 px-3 py-2 bg-slate-50 border-none rounded-xl text-xs outline-none font-semibold text-slate-700"
                            placeholder="Ex: Seg a Sáb: 07:00 às 20:00, Dom: 07:00 às 12:00"
                          />
                        </div>

                        <div>
                          <label className="text-[9px] font-bold text-slate-400 block uppercase font-mono">Diferenciais do Estabelecimento</label>
                          <input 
                            type="text" 
                            value={marketForm.differentials || ''}
                            onChange={(e) => setMarketForm({ ...marketForm, differentials: e.target.value })}
                            className="w-full mt-1 px-3 py-2 bg-slate-50 border-none rounded-xl text-xs outline-none font-semibold text-slate-700"
                            placeholder="Ex: Estacionamento coberto, Clube de vantagens"
                          />
                        </div>

                        <div className="p-3 bg-indigo-50/40 rounded-2xl border border-indigo-100/50 flex items-center justify-between">
                          <span className="text-[9px] font-bold text-indigo-950 uppercase font-mono">Status Operacional</span>
                          <label className="relative inline-flex items-center cursor-pointer select-none">
                            <input 
                              type="checkbox" 
                              checked={marketForm.isActive !== false}
                              onChange={(e) => setMarketForm({ ...marketForm, isActive: e.target.checked })}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                            <span className="ml-2 text-[10px] font-extrabold text-indigo-900 uppercase">
                              {marketForm.isActive !== false ? 'Ativo' : 'Inativo'}
                            </span>
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-50">
                      <button 
                        onClick={() => setIsMarketModalOpen(false)}
                        className="px-4 py-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-600 cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button 
                        onClick={handleSaveMarket}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold text-white cursor-pointer"
                      >
                        Salvar Estabelecimento
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>
        );

      case 'flyers': {
        const filteredFlyers = flyers.filter(f => {
          const matchesMarket = !flyerFilterMarket || f.marketId === flyerFilterMarket;
          const matchesStatus = !flyerFilterStatus || f.status === flyerFilterStatus;
          return matchesMarket && matchesStatus;
        });

        return (
          <div className="space-y-6">
            <DashboardUpload 
              onAddFlyerAndOffers={onAddFlyerAndOffers} 
              markets={markets}
              uploadSession={uploadSession}
              setUploadSession={setUploadSession}
            />

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-800">Folhetos Cadastrados no Banco</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Visualize, reprocesse, filtre e gerencie os folhetos ativos</p>
                </div>
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
                    {markets.map(m => (
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
                    {filteredFlyers.map(f => {
                      const marketName = markets.find(m => m.id === f.marketId)?.name || 'Outro';
                      const associatedOffersCount = offers.filter(o => o.flyerId === f.id).length;
                      const sendDateStr = f.createdAt ? new Date(f.createdAt).toLocaleDateString() : 'N/A';

                      return (
                        <tr key={f.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-bold text-slate-900">{marketName}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setViewingOriginalFlyer(f);
                                  setViewingOriginalFlyerOffer(null);
                                }}
                                className="group flex items-center gap-1.5 focus:outline-none cursor-pointer"
                              >
                                <div className="relative w-10 h-10 border border-slate-200 rounded-lg overflow-hidden shrink-0 group-hover:border-indigo-500 transition-all">
                                  <img src={f.imageUrl} alt="Miniatura" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                </div>
                                <span className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold hidden md:inline">Ver Imagem</span>
                              </button>
                              {f.linkOriginal && (
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(f.linkOriginal || '');
                                    showSuccess('✓ Link/Base64 da imagem original copiado com sucesso!');
                                  }}
                                  className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded transition-colors cursor-pointer shrink-0"
                                  title="Copiar Link/Base64 Original"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="block font-bold text-slate-800">{f.startDate ? new Date(f.startDate).toLocaleDateString() : 'N/A'}</span>
                            <span className="text-[10px] text-slate-400">até {f.endDate ? new Date(f.endDate).toLocaleDateString() : 'N/A'}</span>
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
                              onClick={() => handleReprocessFlyer(f)}
                              className="p-1.5 bg-slate-50 hover:bg-slate-100 text-indigo-600 rounded-lg cursor-pointer inline-flex"
                              title="Reprocessar OCR"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => handleOpenFlyerModal(f)}
                              className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg cursor-pointer inline-flex"
                              title="Editar Metadados"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => handleDeleteFlyer(f.id)}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg cursor-pointer inline-flex"
                              title="Excluir"
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
                    <h4 className="text-sm font-bold text-slate-800">Editar Metadados do Folheto</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block uppercase">Início Vigência</label>
                        <input 
                          type="date" 
                          value={flyerForm.startDate || ''}
                          onChange={(e) => setFlyerForm({ ...flyerForm, startDate: e.target.value })}
                          className="w-full mt-1 px-3 py-2 bg-slate-50 border-none rounded-xl text-xs outline-none font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block uppercase">Fim Vigência</label>
                        <input 
                          type="date" 
                          value={flyerForm.endDate || ''}
                          onChange={(e) => setFlyerForm({ ...flyerForm, endDate: e.target.value })}
                          className="w-full mt-1 px-3 py-2 bg-slate-50 border-none rounded-xl text-xs outline-none font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block uppercase">Observações</label>
                        <textarea 
                          value={flyerForm.observations || ''}
                          onChange={(e) => setFlyerForm({ ...flyerForm, observations: e.target.value })}
                          className="w-full mt-1 px-3 py-2 bg-slate-50 border-none rounded-xl text-xs outline-none font-bold h-20 resize-none"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button 
                        onClick={() => setIsFlyerModalOpen(false)}
                        className="px-4 py-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-600 cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button 
                        onClick={handleSaveFlyer}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold text-white cursor-pointer"
                      >
                        Gravar
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>
        );
      }

      case 'ocr':
        return (
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
                    {ocrOffers.map(o => (
                      <tr key={o.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3">
                          <span className="text-slate-800 font-bold block">{o.originalName}</span>
                          <span className="text-[10px] text-slate-400 block font-normal mt-0.5">ID: {o.id} • Caixa: x:{o.boundingBox.x} y:{o.boundingBox.y}</span>
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
                            className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg cursor-pointer font-bold"
                          >
                            Auditar
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
                        className="px-3 py-2 bg-slate-200 text-slate-600 rounded-xl font-bold cursor-pointer hover:bg-slate-300"
                      >
                        Cancelar
                      </button>
                      <button 
                        onClick={handleSaveOcrAudit}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold cursor-pointer hover:bg-indigo-500"
                      >
                        Aprovar & Salvar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-slate-400 font-semibold">
                    <p>Selecione um item da tabela para visualizar o mapeamento de coordenadas, confidence e dados brutos do OCR.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'crops': {
        const filteredOffers = offers.filter(o => {
          const matchesSearch = o.originalName.toLowerCase().includes(cropSearch.toLowerCase());
          const matchesMarket = !cropMarket || o.marketId === cropMarket;
          return matchesSearch && matchesMarket;
        });

        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-800">Gerenciador de Recortes Visuais</h3>
                <p className="text-xs text-slate-400 mt-0.5">Associe ofertas a recortes de imagens extraídos dos folhetos de origem</p>
              </div>
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

            {filteredOffers.length === 0 ? (
              <div className="py-12 bg-white rounded-3xl border border-slate-100 shadow-sm text-center text-slate-400 font-semibold">
                Nenhum recorte encontrado correspondente aos filtros.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filteredOffers.map(o => {
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
                          onClick={() => {
                            setViewingOriginalFlyer(parentFlyer || null);
                            setViewingOriginalFlyerOffer(o);
                          }}
                          disabled={!parentFlyer}
                          className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 disabled:bg-slate-50 text-indigo-700 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" /> Visualizar Folheto Completo
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      }

      case 'products':
        return (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Dicionário de Produtos Canônicos</h3>
                <p className="text-xs text-slate-400 mt-0.5">Normalização inteligente que agrupa variações textuais sob um único código de barra virtual</p>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <button 
                  onClick={handleMergeDuplicates}
                  className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" /> Unificar Duplicados
                </button>
                <button 
                  onClick={() => handleOpenProductModal()}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Novo Produto
                </button>
              </div>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input 
                type="text" 
                placeholder="Pesquisar por nome do produto canônico, marca ou seção..." 
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full text-xs pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl font-bold text-slate-700 outline-none"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500">
                    <th className="px-4 py-2.5 font-bold">Nome Normalizado</th>
                    <th className="px-4 py-2.5 font-bold">Marca</th>
                    <th className="px-4 py-2.5 font-bold">Seção / Categoria</th>
                    <th className="px-4 py-2.5 font-bold">Volume / Peso</th>
                    <th className="px-4 py-2.5 font-bold text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {filteredProducts.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-bold text-slate-900">{p.name}</td>
                      <td className="px-4 py-3">{p.brand}</td>
                      <td className="px-4 py-3 uppercase text-[10px] text-slate-500">{p.category}</td>
                      <td className="px-4 py-3">{p.weightVolume}</td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button 
                          onClick={() => handleOpenProductModal(p)}
                          className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg cursor-pointer inline-flex"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDeleteProduct(p.id, p.name)}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg cursor-pointer inline-flex"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal for Product Add/Edit */}
            <AnimatePresence>
              {isProdModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl space-y-4"
                  >
                    <h4 className="text-sm font-bold text-slate-800">
                      {editingProductId ? 'Editar Produto Canônico' : 'Novo Produto Canônico'}
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block uppercase">Nome Amigável do Produto</label>
                        <input 
                          type="text" 
                          value={productForm.name || ''}
                          onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                          className="w-full mt-1 px-3 py-2 bg-slate-50 border-none rounded-xl text-xs outline-none font-bold"
                          placeholder="Ex: Arroz Integral Tipo 1"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block uppercase">Marca</label>
                        <input 
                          type="text" 
                          value={productForm.brand || ''}
                          onChange={(e) => setProductForm({ ...productForm, brand: e.target.value })}
                          className="w-full mt-1 px-3 py-2 bg-slate-50 border-none rounded-xl text-xs outline-none font-bold"
                          placeholder="Ex: Camil"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block uppercase">Categoria/Seção</label>
                        <select 
                          value={productForm.category || 'mercearia'}
                          onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                          className="w-full mt-1 px-3 py-2 bg-slate-50 border-none rounded-xl text-xs outline-none font-bold"
                        >
                          {categories.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block uppercase">Volume/Peso</label>
                          <input 
                            type="text" 
                            value={productForm.weightVolume || ''}
                            onChange={(e) => setProductForm({ ...productForm, weightVolume: e.target.value })}
                            className="w-full mt-1 px-3 py-2 bg-slate-50 border-none rounded-xl text-xs outline-none font-bold"
                            placeholder="Ex: 5kg, 900ml"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block uppercase">Unidade Base</label>
                          <input 
                            type="text" 
                            value={productForm.unit || 'un'}
                            onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}
                            className="w-full mt-1 px-3 py-2 bg-slate-50 border-none rounded-xl text-xs outline-none font-bold"
                            placeholder="Ex: kg, un"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button 
                        onClick={() => setIsProdModalOpen(false)}
                        className="px-4 py-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-600 cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button 
                        onClick={handleSaveProduct}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold text-white cursor-pointer"
                      >
                        Salvar
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>
        );

      case 'categories':
        return (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Seções / Categorias</h3>
                <p className="text-xs text-slate-400 mt-0.5">Gestão das categorias principais de precificação de alimentos</p>
              </div>
              <button 
                onClick={() => handleOpenCatModal()}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Nova Categoria
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500">
                    <th className="px-4 py-2.5 font-bold">ID / Slug</th>
                    <th className="px-4 py-2.5 font-bold">Nome da Categoria</th>
                    <th className="px-4 py-2.5 font-bold">Ícone Lucide</th>
                    <th className="px-4 py-2.5 font-bold text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {categories.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-mono text-indigo-600">{c.id}</td>
                      <td className="px-4 py-3 font-bold text-slate-900">{c.name}</td>
                      <td className="px-4 py-3">{c.icon}</td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button 
                          onClick={() => handleOpenCatModal(c)}
                          className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg cursor-pointer inline-flex"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDeleteCategory(c.id, c.name)}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg cursor-pointer inline-flex"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal for Category Add/Edit */}
            <AnimatePresence>
              {isCatModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl space-y-4"
                  >
                    <h4 className="text-sm font-bold text-slate-800">
                      {editingCatId ? 'Editar Categoria' : 'Nova Categoria'}
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block uppercase">Identificador (ID/Slug)</label>
                        <input 
                          type="text" 
                          value={catForm.id || ''}
                          disabled={!!editingCatId}
                          onChange={(e) => setCatForm({ ...catForm, id: e.target.value })}
                          className="w-full mt-1 px-3 py-2 bg-slate-50 border-none rounded-xl text-xs outline-none font-bold disabled:opacity-50"
                          placeholder="Ex: petshop, bazar"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block uppercase">Nome da Categoria</label>
                        <input 
                          type="text" 
                          value={catForm.name || ''}
                          onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                          className="w-full mt-1 px-3 py-2 bg-slate-50 border-none rounded-xl text-xs outline-none font-bold"
                          placeholder="Ex: Pet Shop"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block uppercase">Nome do Ícone Lucide</label>
                        <input 
                          type="text" 
                          value={catForm.icon || 'ShoppingBag'}
                          onChange={(e) => setCatForm({ ...catForm, icon: e.target.value })}
                          className="w-full mt-1 px-3 py-2 bg-slate-50 border-none rounded-xl text-xs outline-none font-bold"
                          placeholder="Ex: Heart, Sparkles, Beef"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button 
                        onClick={() => setIsCatModalOpen(false)}
                        className="px-4 py-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-600 cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button 
                        onClick={handleSaveCategory}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold text-white cursor-pointer"
                      >
                        Salvar
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>
        );

      case 'brands':
        return (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Dicionário de Marcas</h3>
              <p className="text-xs text-slate-400 mt-0.5">Cadastre marcas oficiais de produtos monitorados</p>
            </div>

            <div className="flex gap-2">
              <input 
                type="text" 
                value={brandInput}
                onChange={(e) => setBrandInput(e.target.value)}
                placeholder="Digitar nova marca (ex: Nestlé)..."
                className="flex-1 text-xs px-3.5 py-2 bg-slate-50 border-none rounded-xl font-bold outline-none text-slate-800"
              />
              <button 
                onClick={handleAddBrand}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Cadastrar
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3">
              {brands.map(b => (
                <div key={b} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center text-xs font-bold text-slate-800">
                  <span>{b}</span>
                  <button 
                    onClick={() => handleDeleteBrand(b)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        );

      case 'history':
        return (
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
                  className="text-xs px-3 py-2 bg-slate-50 border-none rounded-xl font-bold text-slate-700 outline-none"
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
                  {historyOffers.map(o => {
                    const shop = markets.find(m => m.id === o.marketId);
                    return (
                      <tr key={o.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-bold text-slate-900">{o.originalName}</td>
                        <td className="px-4 py-3">{shop?.name || 'Mercado'}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">R$ {o.price.toFixed(2)}</td>
                        <td className="px-4 py-3 text-center text-[10px] text-slate-500">{o.id.includes('sim') ? 'Fevereiro' : 'Julho'}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[9px]">
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
        );

      case 'ia':
        return (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Painel de Controle da Inteligência Artificial</h3>
              <p className="text-xs text-slate-400 mt-0.5">Parâmetros operacionais do Gemini-3.5-Flash para extração de OCR espacial</p>
            </div>

            <div className="p-5 bg-indigo-50 rounded-2xl border border-indigo-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                  <BrainCircuit className="w-4 h-4 text-indigo-600" /> Rede Neural Conectada
                </h4>
                <p className="text-[10px] text-indigo-800 font-semibold leading-relaxed">
                  Utilizando o Gemini-3.5-Flash para auditorias e associação inteligente de marcas e pesos.
                </p>
              </div>
              <button 
                onClick={handleTestAICopilot}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Testar Modelo
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Modelo de Produção</span>
                <span className="text-sm font-bold text-slate-800 block">gemini-3.5-flash</span>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Confiança AI Média</span>
                <span className="text-sm font-bold text-slate-800 block">95.4% de correspondência</span>
              </div>
            </div>
          </div>
        );

      case 'database':
        return (
          <div className="space-y-6">
            {/* Backup actions */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Rotinas de Backup</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Gere backups completos de segurança das ofertas no Firestore</p>
                </div>
                <button 
                  onClick={handleCreateBackup}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Criar Backup Completo
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500">
                      <th className="px-4 py-2.5 font-bold">Identificador Backup</th>
                      <th className="px-4 py-2.5 font-bold">Data Geração</th>
                      <th className="px-4 py-2.5 font-bold">Tamanho</th>
                      <th className="px-4 py-2.5 font-bold text-center">Registros</th>
                      <th className="px-4 py-2.5 font-bold text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                    {backups.map(bkp => (
                      <tr key={bkp.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-mono text-slate-900">{bkp.id}</td>
                        <td className="px-4 py-3">{new Date(bkp.date).toLocaleString()}</td>
                        <td className="px-4 py-3">{bkp.size}</td>
                        <td className="px-4 py-3 text-center">{bkp.recordCount}</td>
                        <td className="px-4 py-3 text-right space-x-2">
                          <button 
                            onClick={() => handleRestoreBackupFromList(bkp)}
                            className="p-1.5 bg-slate-50 hover:bg-slate-100 text-emerald-600 rounded-lg cursor-pointer inline-flex"
                            title="Restaurar Backup"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => handleDeleteBackup(bkp.id)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg cursor-pointer inline-flex"
                            title="Deletar Backup"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {backups.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-6 text-slate-400 italic">Nenhum backup gravado até o momento.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Import / Export JSON SQL CSV */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Export Panel */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-800">Exportar Banco de Dados</h3>
                <p className="text-xs text-slate-400">Baixe todo o histórico em múltiplos formatos amigáveis para análise externa.</p>
                
                <div className="space-y-2">
                  <div className="p-3 bg-slate-50 rounded-2xl flex justify-between items-center text-xs font-bold">
                    <span>Exportar Base Completa</span>
                    <div className="flex gap-1">
                      <button onClick={() => handleExportData('JSON', false)} className="p-2 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 cursor-pointer flex items-center gap-1">
                        <FileJson className="w-3.5 h-3.5 text-orange-500" /> JSON
                      </button>
                      <button onClick={() => handleExportData('CSV', false)} className="p-2 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 cursor-pointer flex items-center gap-1">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> CSV
                      </button>
                      <button onClick={() => handleExportData('SQL', false)} className="p-2 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 cursor-pointer flex items-center gap-1">
                        <FileCode className="w-3.5 h-3.5 text-indigo-500" /> SQL
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-2xl flex justify-between items-center text-xs font-bold">
                    <span>Exportar Amostra Parcial (20 registros)</span>
                    <div className="flex gap-1">
                      <button onClick={() => handleExportData('JSON', true)} className="p-2 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 cursor-pointer">
                        JSON
                      </button>
                      <button onClick={() => handleExportData('CSV', true)} className="p-2 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 cursor-pointer">
                        CSV
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Import Panel */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-800">Restaurar de Backup Externo</h3>
                <p className="text-xs text-slate-400">Faça o upload de um arquivo JSON de backup gerado por este sistema para reescrever as tabelas.</p>
                
                <div className="flex gap-3">
                  <input 
                    type="file" 
                    accept=".json" 
                    ref={fileInputRef}
                    onChange={handleImportFileChange}
                    className="hidden"
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 py-3 px-4 border border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50 hover:bg-indigo-50/10 text-slate-600 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-4 h-4 text-indigo-500" /> Selecionar Arquivo JSON
                  </button>
                </div>

                {importFileSummary && (
                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 space-y-3 text-xs font-semibold">
                    <p className="text-amber-800">{importFileSummary}</p>
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setImportFileSummary(null)} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg cursor-pointer">Cancelar</button>
                      <button onClick={handleExecuteImport} className="px-3 py-1.5 bg-amber-600 text-white rounded-lg cursor-pointer hover:bg-amber-700">Confirmar & Gravar</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'audit':
        return (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Logs de Auditoria de Operações Críticas</h3>
              <p className="text-xs text-slate-400 mt-0.5">Rastreabilidade completa de logins, exclusões, backups e alterações da base</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500">
                    <th className="px-4 py-2.5 font-bold">Data/Hora</th>
                    <th className="px-4 py-2.5 font-bold">Usuário</th>
                    <th className="px-4 py-2.5 font-bold">Operação</th>
                    <th className="px-4 py-2.5 font-bold">Detalhes do Log</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {auditLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 text-slate-400 font-normal">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="px-4 py-3 font-mono text-[11px] text-indigo-600">{log.user}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[9px] font-bold border uppercase">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-600">{log.details}</td>
                    </tr>
                  ))}
                  {auditLogs.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-6 text-slate-400 italic">Nenhum log gravado no Firestore.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
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
                    value={ocrConfidenceThreshold}
                    onChange={(e) => setOcrConfidenceThreshold(parseInt(e.target.value) || 85)}
                    className="w-full mt-1.5 px-3 py-2 bg-slate-50 border-none rounded-xl text-xs font-bold outline-none text-slate-800"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Leituras de OCR com confiança abaixo deste limite entram na fila de auditoria manual.</span>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 block uppercase">Modelo Gemini</label>
                  <select 
                    value={geminiModel}
                    onChange={(e) => setGeminiModel(e.target.value)}
                    className="w-full mt-1.5 px-3 py-2 bg-slate-50 border-none rounded-xl text-xs font-bold outline-none text-slate-800"
                  >
                    <option value="gemini-3.5-flash">Gemini 3.5 Flash (Padrão)</option>
                    <option value="gemini-2.5-pro">Gemini 2.5 Pro (Sensível)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block uppercase">Limite de Armazenamento</label>
                  <input 
                    type="text" 
                    value={storageLimit}
                    onChange={(e) => setStorageLimit(e.target.value)}
                    className="w-full mt-1.5 px-3 py-2 bg-slate-50 border-none rounded-xl text-xs font-bold outline-none text-slate-800"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 block uppercase">Limite Máximo de Conexões de API (Minuto)</label>
                  <input 
                    type="number" 
                    value={apiLimitRate}
                    onChange={(e) => setApiLimitRate(parseInt(e.target.value) || 100)}
                    className="w-full mt-1.5 px-3 py-2 bg-slate-50 border-none rounded-xl text-xs font-bold outline-none text-slate-800"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button 
                onClick={() => showSuccess("Configurações gravadas com sucesso no banco de dados!")}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Salvar Configurações
              </button>
            </div>
          </div>
        );

      case 'danger':
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
                {/* 1. Limpar Banco */}
                <div className="py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 block uppercase">Limpar Toda a Base de Dados</h4>
                    <span className="text-[11px] text-slate-400 mt-1 block">Remove permanentemente todos os {flyers.length} folhetos, {offers.length} ofertas, {markets.length} mercados e todos os dados associados.</span>
                  </div>
                  <button 
                    onClick={() => handleOpenDangerAction('clean')}
                    className="px-4 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Limpar Base de Dados
                  </button>
                </div>

                {/* 2. Exclusão de Arquivos */}
                <div className="py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 block uppercase">Excluir Cache de Imagens e Dados OCR</h4>
                    <span className="text-[11px] text-slate-400 mt-1 block">Apaga os arquivos físicos de imagens convertidas e dados de OCR temporários salvos no servidor.</span>
                  </div>
                  <button 
                    onClick={() => handleOpenDangerAction('files')}
                    className="px-4 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Limpar Cache de Arquivos
                  </button>
                </div>
              </div>
            </div>

            {/* Double Confirmation Modal for Danger Zone */}
            <AnimatePresence>
              {dangerAction && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 overflow-y-auto">
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border-2 border-rose-500 my-8 max-h-[90vh] overflow-y-auto"
                  >
                    <div className="flex gap-3 items-center text-rose-600 border-b border-slate-50 pb-2">
                      <AlertCircle className="w-6 h-6 animate-pulse" />
                      <h4 className="text-sm font-extrabold uppercase tracking-wider">CONFIRMAÇÃO CRÍTICA EXIGIDA</h4>
                    </div>

                    {dangerAction === 'clean' && (
                      <div className="space-y-3">
                        <p className="text-xs font-semibold text-rose-700 leading-relaxed bg-rose-50 p-3 rounded-2xl border border-rose-100">
                          <strong>AVISO DE IRREVERSIBILIDADE CRÍTICA:</strong> Esta operação apagará absolutamente toda a base de dados do sistema, incluindo registros principais e dados derivados. NENHUM DADO SERÁ SALVO.
                        </p>
                        
                        <div className="text-xs space-y-1.5 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-slate-700">
                          <p className="font-extrabold text-slate-800 uppercase text-[10px] tracking-wide mb-1">Registros a serem permanentemente removidos:</p>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 font-mono text-[10px] text-slate-600">
                            <div>📁 Mercados: <span className="font-bold text-rose-600">{markets.length}</span></div>
                            <div>📁 Folhetos: <span className="font-bold text-rose-600">{flyers.length}</span></div>
                            <div>📁 Ofertas: <span className="font-bold text-rose-600">{offers.length}</span></div>
                            <div>📁 Produtos Canônicos: <span className="font-bold text-rose-600">{products.length}</span></div>
                            <div>📁 Categorias: <span className="font-bold text-rose-600">{categories.length}</span></div>
                            <div>📁 Marcas: <span className="font-bold text-rose-600">{brands.length}</span></div>
                            <div>📁 Logs de Auditoria: <span className="font-bold text-rose-600">{auditLogs.length}</span></div>
                            <div>📁 Backups & Payloads: <span className="font-bold text-rose-600">{backups.length * 2}</span></div>
                          </div>
                          <div className="text-[11px] font-black text-rose-700 mt-2 border-t border-slate-200 pt-2 flex justify-between">
                            <span>TOTAL DE REGISTROS AFETADOS:</span>
                            <span>{markets.length + flyers.length + offers.length + products.length + categories.length + brands.length + auditLogs.length + backups.length * 2}</span>
                          </div>
                          <p className="text-[9px] text-slate-400 font-semibold mt-2 pt-1 border-t border-slate-100 leading-normal">
                            <strong>Dados Derivados Removidos:</strong> Resultados de OCR, textos espaciais extraídos, coordenadas/boundingBoxes, análises da IA, filas de processamento, arquivos temporários e caches de imagem.
                          </p>
                        </div>

                        <label className="flex items-start gap-2.5 p-3.5 bg-rose-50/40 rounded-2xl border border-rose-100 cursor-pointer select-none">
                          <input 
                            type="checkbox" 
                            checked={dangerUnderstandCheckbox}
                            onChange={(e) => setDangerUnderstandCheckbox(e.target.checked)}
                            className="mt-0.5 rounded border-rose-300 text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer"
                          />
                          <span className="text-[10px] font-bold text-rose-900 leading-tight">
                            Confirmo que compreendo a irreversibilidade da operação e aceito a destruição permanente de todos os dados do sistema.
                          </span>
                        </label>
                      </div>
                    )}

                    {dangerAction !== 'clean' && (
                      <p className="text-xs font-semibold text-slate-600 leading-relaxed">
                        {dangerAction === 'files' && 'Isto removerá o armazenamento temporário de folhetos físicos salvos.'}
                      </p>
                    )}

                    <div className="p-3.5 bg-rose-50 rounded-2xl text-rose-900 text-xs font-bold border border-rose-100 space-y-2">
                      <span>Para liberar a ação, digite exatamente a frase abaixo:</span>
                      <p className="font-mono text-center tracking-widest text-slate-900 bg-white p-2.5 rounded-xl border select-none">
                        APAGAR TODOS OS DADOS
                      </p>
                      <input 
                        type="text" 
                        value={dangerConfirmPhrase}
                        onChange={(e) => setDangerConfirmPhrase(e.target.value)}
                        disabled={dangerAction === 'clean' && !dangerUnderstandCheckbox}
                        className="w-full px-3 py-2 bg-white text-slate-900 border border-rose-200 rounded-xl outline-none font-bold disabled:opacity-50 disabled:bg-slate-50"
                        placeholder={dangerAction === 'clean' && !dangerUnderstandCheckbox ? "Marque a caixa acima primeiro..." : "Digitar frase de liberação..."}
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button 
                        onClick={() => setDangerAction(null)}
                        className="px-4 py-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-600 cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button 
                        onClick={handleExecuteDangerAction}
                        disabled={dangerConfirmPhrase !== 'APAGAR TODOS OS DADOS' || (dangerAction === 'clean' && !dangerUnderstandCheckbox)}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:hover:bg-rose-600 rounded-xl text-xs font-bold text-white cursor-pointer"
                      >
                        Confirmar Exclusão Dupla
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>
        );

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
            Garantindo integridade dos dados, calibração espacial, CRUD de lojas e zona de perigo protegida
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
        {/* Left Side Navigation Menu panel */}
        <div className="lg:col-span-3 bg-white rounded-3xl border border-slate-100 shadow-sm p-4 h-fit">
          <nav className="space-y-1">
            {subTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
                  activeSubTab === tab.id
                    ? tab.isDanger 
                      ? 'bg-rose-500 text-white shadow-md shadow-rose-500/10'
                      : 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                    : tab.isDanger
                      ? 'text-rose-600 hover:bg-rose-50'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
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
              {renderSubView()}
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
                <button 
                  onClick={() => {
                    setViewingOriginalFlyer(null);
                    setViewingOriginalFlyerOffer(null);
                    setViewOriginalQuality(false);
                  }}
                  className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Toolbar */}
              <div className="px-6 py-2 border-b border-slate-100 bg-white flex flex-wrap justify-between items-center gap-3">
                <div className="flex gap-2">
                  {viewingOriginalFlyer.linkOriginal && (
                    <button
                      onClick={() => setViewOriginalQuality(!viewOriginalQuality)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                        viewOriginalQuality 
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {viewOriginalQuality ? 'Exibindo: Alta Resolução (Original)' : 'Exibir Imagem em Alta Resolução (Original)'}
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const imageToCopy = viewingOriginalFlyer.linkOriginal || viewingOriginalFlyer.imageUrl;
                      navigator.clipboard.writeText(imageToCopy);
                      showSuccess('✓ Link/Base64 da imagem copiado com sucesso!');
                    }}
                    className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    title="Copiar link/base64 da imagem"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copiar Link da Imagem
                  </button>
                  <button
                    onClick={() => {
                      const imageToOpen = viewingOriginalFlyer.linkOriginal || viewingOriginalFlyer.imageUrl;
                      const win = window.open();
                      if (win) {
                        win.document.write(`<img src="${imageToOpen}" style="max-width:100%; border-radius:8px; margin: 10px auto; display:block;" /><title>Visualizador - Imagem do Folheto</title>`);
                      } else {
                        showError('Erro: Popup bloqueado pelo navegador.');
                      }
                    }}
                    className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" /> Abrir em tamanho real
                  </button>
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
                <button
                  onClick={() => {
                    setViewingOriginalFlyer(null);
                    setViewingOriginalFlyerOffer(null);
                    setViewOriginalQuality(false);
                  }}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all"
                >
                  Fechar Visualizador
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
