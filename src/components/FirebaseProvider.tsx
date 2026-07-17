/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { auth, testFirestoreConnection } from '../lib/firebase';
import { Loader2, Database, ShieldAlert, WifiOff, Wifi } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FirebaseContextType {
  user: User | null;
  loading: boolean;
  isOnline: boolean;
  connectionSuccess: boolean | null;
  error: string | null;
  loginWithEmailPassword: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionSuccess, setConnectionSuccess] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initialize and check connection
  useEffect(() => {
    const initFirebase = async () => {
      try {
        const isConnected = await testFirestoreConnection();
        setConnectionSuccess(isConnected);

        if (!isConnected) {
          setError('Não foi possível conectar ao Firestore. Verifique as configurações e regras do projeto.');
        }
      } catch (err) {
        console.error("Firebase init failure:", err);
        setError('Erro na inicialização do Firebase.');
      } finally {
        setLoading(false);
      }
    };

    // Track auth states
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      // Run DB check once auth is ready
      if (loading) {
        initFirebase();
      }
    }, (authError) => {
      console.error("Auth state error:", authError);
      setError('Falha ao monitorar o estado de login.');
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
    };
  }, []);

  const loginWithEmailPassword = async (email: string, password: string) => {
    try {
      setError(null);
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      console.error("Email/Password Auth failed:", err);
      if (err?.code === 'auth/user-not-found' || err?.code === 'auth/invalid-credential') {
        // Autocreate to bypass friction for testing, or if credentials could be wrong
        try {
          await createUserWithEmailAndPassword(auth, email, password);
        } catch (createErr: any) {
          setError('Credenciais inválidas ou falha ao criar conta administrativa: ' + createErr.message);
        }
      } else if (err?.code === 'auth/wrong-password') {
        setError('Senha incorreta para este usuário.');
      } else if (err?.code === 'auth/invalid-email') {
        setError('E-mail em formato inválido.');
      } else {
        setError('Falha na autenticação: ' + err.message);
      }
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Logout failure:", err);
      setError('Falha ao desconectar.');
    }
  };

  const clearError = () => setError(null);

  return (
    <FirebaseContext.Provider
      value={{
        user,
        loading,
        isOnline,
        connectionSuccess,
        error,
        loginWithEmailPassword,
        logout,
        clearError
      }}
    >
      {/* Connection notifications */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {!isOnline && (
          <div className="flex items-center gap-2 bg-rose-500/90 text-white py-2.5 px-4 rounded-xl shadow-lg shadow-rose-950/20 backdrop-blur border border-rose-400/20 text-xs font-medium font-sans">
            <WifiOff className="w-4 h-4" />
            <span>Sem conexão com a internet. Modo offline ativo.</span>
          </div>
        )}
        {error && (
          <div className="flex items-center justify-between gap-3 bg-slate-900 text-slate-100 py-2.5 px-4 rounded-xl shadow-lg border border-rose-500/30 text-xs font-sans max-w-sm">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-500 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button 
              onClick={clearError}
              className="text-slate-400 hover:text-slate-200 text-[10px] font-bold uppercase tracking-wider font-mono px-1"
            >
              Fechar
            </button>
          </div>
        )}
      </div>

      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
};
