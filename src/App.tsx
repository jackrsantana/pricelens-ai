/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Flyer, Offer, Market, CanonicalProduct, Category } from './types';
import { useFirebase } from './components/FirebaseProvider';
import { db, reportFirestoreError, OperationType, sanitizeFlyer, sanitizeOffer, doc, setDoc, writeBatch } from './lib/firebase';
import { APP_CONFIG } from './config/app';
import { useFlyers, useOffers, useMarkets, useProducts, useCategories } from './hooks/useQueries';
import { useQueryClient } from '@tanstack/react-query';

// Import our modular dashboard components
import DashboardGeneral from './components/DashboardGeneral';
import DashboardSmartOffers from './components/DashboardSmartOffers';
import DashboardProducts from './components/DashboardProducts';
import DashboardMarkets from './components/DashboardMarkets';
import DashboardCompare from './components/DashboardCompare';
import DashboardBasket from './components/DashboardBasket';
import DashboardCity from './components/DashboardCity';
import DashboardAI from './components/DashboardAI';
import DashboardAdmin from './components/DashboardAdmin';

// Import icons
import { 
  LayoutDashboard, 
  Tag, 
  Store, 
  MapPin, 
  UploadCloud, 
  ShieldAlert, 
  MessageSquare, 
  Menu, 
  X, 
  Sparkles,
  TrendingUp,
  Loader2,
  Lock,
  CloudLightning,
  CloudCheck,
  Scale,
  ShoppingBasket,
  ArrowLeft
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('general');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  const { user, loading: firebaseLoading, loginWithEmailPassword, logout } = useFirebase();

  // Login form state
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  const [isAdminView, setIsAdminView] = useState<boolean>(window.location.pathname === "/admin" || window.location.hash === "#/admin");
  // Global pricing database state from React Query
  const { data: flyers = [], isLoading: loadingFlyers } = useFlyers({ enabled: !isAdminView });
  const { data: offers = [], isLoading: loadingOffers } = useOffers({ enabled: !isAdminView });
  const { data: markets = [], isLoading: loadingMarkets } = useMarkets({ enabled: !isAdminView });
  const { data: canonicalProducts = [], isLoading: loadingProducts } = useProducts({ enabled: !isAdminView });
  const { data: categories = [], isLoading: loadingCategories } = useCategories({ enabled: !isAdminView });
  
  const queryClient = useQueryClient();
  


  const isDataLoading = loadingFlyers || loadingOffers || loadingMarkets || loadingProducts || loadingCategories || firebaseLoading;
  const syncStatus = isDataLoading ? 'connecting' : 'synced';

  // SPA Routing for /admin


  useEffect(() => {
    document.title = `${APP_CONFIG.name} | ${APP_CONFIG.slogan}`;
  }, []);

  useEffect(() => {
    const handleLocationChange = () => {
      setIsAdminView(window.location.pathname === '/admin' || window.location.hash === '#/admin');
    };
    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  const navigateTo = (path: string) => {
    window.history.pushState(null, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const handleLocalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setLoginError('Por favor, preencha todos os campos.');
      return;
    }
    setLoginError(null);
    setIsLoggingIn(true);
    try {
      await loginWithEmailPassword(email, password);
    } catch (err: any) {
      setLoginError(err?.message || 'Falha ao realizar login.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Add newly uploaded flyer and offers to database dynamically (persisted to Firestore)
  const handleAddFlyerAndOffers = useCallback(async (newFlyer: Flyer, newOffers: Offer[]) => {
    if (!user) return;

    try {
      const batch = writeBatch(db);
      
      const cleanFlyer = sanitizeFlyer(newFlyer);
      const flyerRef = doc(db, 'flyers', newFlyer.id);
      batch.set(flyerRef, cleanFlyer);

      newOffers.forEach((offer) => {
        const cleanOffer = sanitizeOffer(offer);
        const offerRef = doc(db, 'offers', offer.id);
        batch.set(offerRef, cleanOffer);
      });

      await batch.commit();
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['flyers'] });
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      
      showSuccess("Folheto e ofertas salvos no Firestore!");
    } catch (err) {
      console.error("Erro ao salvar folheto e ofertas no Firestore:", err);
      reportFirestoreError(err, OperationType.WRITE, `flyers/${newFlyer.id}`);
    }
  }, [user, queryClient]);

  // Update audited offer from Review tab (persisted to Firestore)
  const handleUpdateOffer = useCallback(async (updatedOffer: Offer) => {
    if (!user) return;

    try {
      const cleanOffer = sanitizeOffer(updatedOffer);
      const offerRef = doc(db, 'offers', updatedOffer.id);
      await setDoc(offerRef, cleanOffer);
      
      queryClient.invalidateQueries({ queryKey: ['offers'] });
    } catch (err) {
      console.error("Erro ao salvar auditoria no Firestore:", err);
      reportFirestoreError(err, OperationType.UPDATE, `offers/${updatedOffer.id}`);
    }
  }, [user, queryClient]);

  const showSuccess = (msg: string) => {
    console.log("Success:", msg);
  };

  const menuItems = [
    { id: 'general', label: 'Painel Geral', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'offers', label: 'Ofertas Inteligentes', icon: <Sparkles className="w-5 h-5" /> },
    { id: 'products', label: 'Análise Produtos', icon: <Tag className="w-5 h-5" /> },
    { id: 'markets', label: 'Observatório Estabelecimentos', icon: <Store className="w-5 h-5" /> },
    { id: 'compare', label: 'Comparar Estabelecimentos', icon: <Scale className="w-5 h-5" /> },
    { id: 'basket', label: 'Cesta Inteligente', icon: <ShoppingBasket className="w-5 h-5" /> },
    { id: 'city', label: 'Indicadores Locais', icon: <MapPin className="w-5 h-5" /> },
    { id: 'chat', label: 'Assistente IA', icon: <MessageSquare className="w-5 h-5" /> },
  ];

  const renderActiveView = () => {
    switch (activeTab) {
      case 'general':
        return <DashboardGeneral flyers={flyers} offers={offers} markets={markets} canonicalProducts={canonicalProducts} onNavigate={(tab) => setActiveTab(tab)} isLoading={syncStatus === 'connecting'} />;
      case 'offers':
        return <DashboardSmartOffers flyers={flyers} offers={offers} canonicalProducts={canonicalProducts} categories={categories} markets={markets} isLoading={syncStatus === 'connecting'} />;
      case 'products':
        return <DashboardProducts flyers={flyers} offers={offers} canonicalProducts={canonicalProducts} markets={markets} isLoading={syncStatus === 'connecting'} />;
      case 'markets':
        return <DashboardMarkets flyers={flyers} offers={offers} markets={markets} canonicalProducts={canonicalProducts} categories={categories} isLoading={syncStatus === 'connecting'} />;
      case 'compare':
        return <DashboardCompare flyers={flyers} offers={offers} markets={markets} canonicalProducts={canonicalProducts} categories={categories} isLoading={syncStatus === 'connecting'} />;
      case 'basket':
        return <DashboardBasket flyers={flyers} offers={offers} canonicalProducts={canonicalProducts} markets={markets} isLoading={syncStatus === 'connecting'} />;
      case 'city':
        return <DashboardCity flyers={flyers} offers={offers} canonicalProducts={canonicalProducts} categories={categories} isLoading={syncStatus === 'connecting'} />;
      case 'chat':
        return <DashboardAI flyers={flyers} offers={offers} />;
      default:
        return <DashboardGeneral flyers={flyers} offers={offers} markets={markets} canonicalProducts={canonicalProducts} onNavigate={(tab) => setActiveTab(tab)} />;
    }
  };

  // Loading Screen for Auth & Database boot
  if (firebaseLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <div className="flex flex-col items-center text-center px-4">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full animate-pulse" />
            <div className="p-4 bg-slate-900 border border-slate-800 text-indigo-400 rounded-2xl relative shadow-2xl">
              <TrendingUp className="w-8 h-8 animate-pulse" />
            </div>
          </div>
          <h2 className="text-slate-100 font-bold font-sans text-sm tracking-tight">{APP_CONFIG.name}</h2>
          <div className="flex items-center gap-2 text-slate-500 text-xs font-mono mt-3 bg-slate-900 py-1.5 px-3.5 rounded-full border border-slate-850">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
            <span>Conectando ao sistema de inteligência de preços...</span>
          </div>
        </div>
      </div>
    );
  }

  // RENDER ADMIN /ADMIN PATHWAY
  if (isAdminView) {
    if (!user) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center space-y-6 relative">
            <div className="absolute inset-0 bg-indigo-500/5 blur-3xl rounded-full" />
            <div className="p-8 bg-slate-900 border border-slate-850 rounded-3xl shadow-2xl relative space-y-6 text-left">
              <div className="mx-auto p-4 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-2xl w-fit flex items-center justify-center">
                <Lock className="w-8 h-8" />
              </div>
              <div className="space-y-2 text-center">
                <h3 className="text-xl font-bold text-slate-100 font-sans tracking-tight">
                  Área Administrativa Restrita
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
                  Por favor, conecte-se com sua credencial administrativa registrada para gerenciar estabelecimentos, folhetos e controle técnico.
                </p>
              </div>

              {loginError && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs font-semibold text-rose-400 flex items-start gap-2 animate-pulse">
                  <span className="font-sans">{loginError}</span>
                </div>
              )}

              <form onSubmit={handleLocalLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="admin-login-email" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    E-mail Administrativo
                  </label>
                  <input
                    type="email"
                    id="admin-login-email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={`exemplo@${APP_CONFIG.adminEmailDomain}`}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs font-semibold outline-none focus:border-indigo-500 transition-all font-sans"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="admin-login-password" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Senha de Acesso
                  </label>
                  <input
                    type="password"
                    id="admin-login-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Sua senha secreta"
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs font-semibold outline-none focus:border-indigo-500 transition-all font-sans"
                  />
                </div>

                <button
                  type="submit"
                  id="admin-login-submit"
                  disabled={isLoggingIn}
                  className="w-full py-3 px-6 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:bg-indigo-600/50 text-white rounded-xl text-xs font-bold tracking-wide transition-all shadow-md shadow-indigo-600/10 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isLoggingIn ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verificando Credenciais...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Entrar no Painel</span>
                    </>
                  )}
                </button>
              </form>

              <div className="pt-1.5 border-t border-slate-850/60 flex flex-col gap-3">
                <button
                  onClick={() => navigateTo('/')}
                  id="admin-login-back"
                  className="w-full py-2.5 px-6 bg-slate-850 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Voltar para Área Pública</span>
                </button>

                <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-850/40 text-[10px] leading-relaxed text-slate-500 font-mono text-center">
                  <p className="font-bold text-slate-400 mb-0.5">💡 Credenciais de Teste</p>
                  <p>Email: <span className="text-indigo-400">{APP_CONFIG.fallbackAdminEmail}</span></p>
                  <p>Senha: <span className="text-indigo-400">admin123</span></p>
                  <p className="mt-1 text-[9px] text-slate-600">(Se a conta não existir, ela será criada automaticamente ao tentar logar)</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col antialiased font-sans">
        {/* Admin Header with Back Action */}
        <header className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-md flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-tight text-white leading-none">Painel do Administrador</h2>
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mt-1">
                Controle Técnico e Gestão da Base
              </span>
            </div>
          </div>

          <button 
            onClick={() => navigateTo('/')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-indigo-600/15"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar para Área Pública</span>
          </button>
        </header>

        {/* Central Dashboard render */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          <DashboardAdmin  
            loading={syncStatus === 'connecting'}
            onUpdateOffer={handleUpdateOffer} 
            onAddFlyerAndOffers={handleAddFlyerAndOffers} 
          />
        </main>
      </div>
    );
  }

  // RENDER PUBLIC AREA
  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col md:flex-row antialiased font-sans font-semibold">
      
      {/* Desktop Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 text-slate-400 p-5 hidden md:flex flex-col justify-between shrink-0 border-r border-slate-800">
        <div className="space-y-6">
          {/* Platform Brand Logo */}
          <div className="flex items-center gap-2.5 px-2">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-md shadow-indigo-500/25 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-black font-sans tracking-tight text-white leading-tight">
                  {APP_CONFIG.name}
                </h2>
                {syncStatus === 'synced' ? (
                  <CloudCheck className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Loader2 className="w-3 h-3 text-indigo-400 animate-spin" />
                )}
              </div>
              <span className="text-[10px] text-slate-500 font-bold tracking-wider uppercase block">
                {APP_CONFIG.defaultCity}
              </span>
            </div>
          </div>

          {/* Navigation Menu Links */}
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  id={`nav-item-${item.id}`}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all duration-150 cursor-pointer ${
                    isActive 
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' 
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User context footer */}
        <div className="border-t border-slate-800 pt-4 px-2 space-y-2">
          {user ? (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5">
                {user.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt={user.displayName || "Admin"} 
                    referrerPolicy="no-referrer"
                    className="w-8 h-8 rounded-full border border-slate-700" 
                  />
                ) : (
                  <div className="p-1.5 bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 rounded-lg">
                    <Sparkles className="w-4 h-4" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold text-slate-200 truncate">
                    {user.displayName || "Administrador"}
                  </p>
                  <button 
                    onClick={logout}
                    className="text-[9px] text-indigo-400 font-bold hover:text-indigo-300 transition-colors mt-0.5 uppercase cursor-pointer block"
                  >
                    Sair da Conta
                  </button>
                </div>
              </div>
              
              <button 
                onClick={() => navigateTo('/admin')}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Painel Admin</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <button 
                onClick={() => navigateTo('/admin')}
                className="w-full py-2.5 px-3 bg-slate-850 hover:bg-slate-800 active:bg-slate-850 text-slate-300 hover:text-slate-100 rounded-xl text-[10px] font-bold tracking-wider uppercase transition-all duration-150 border border-slate-800 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5 text-indigo-400" />
                <span>Acesso Admin</span>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Header / Navigation Bar */}
      <header className="bg-slate-900 text-white p-4 flex md:hidden items-center justify-between shrink-0 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-600 text-white rounded-lg">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-black tracking-tight">{APP_CONFIG.name}</h2>
            <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block">{APP_CONFIG.defaultCityShort}</span>
          </div>
        </div>
        
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Mobile Drawer Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden bg-slate-900 border-b border-slate-800 p-4 space-y-1.5 z-50 absolute top-[57px] left-0 w-full shadow-lg"
          >
            {menuItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-semibold tracking-wide ${
                    isActive 
                      ? 'bg-indigo-600 text-white' 
                      : 'text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                </button>
              );
            })}
            
            <button 
              onClick={() => {
                navigateTo('/admin');
                setMobileMenuOpen(false);
              }}
              className="w-full py-3 px-4 bg-indigo-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <Lock className="w-4 h-4" />
              <span>Painel Administrativo</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Render Stage */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="max-w-7xl mx-auto h-full"
          >
            {renderActiveView()}
          </motion.div>
        </AnimatePresence>
      </main>

    </div>
  );
}

