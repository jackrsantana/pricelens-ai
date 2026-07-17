/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { 
  initializeFirestore, 
  collection, 
  getDocs, 
  limit, 
  query,
  FirestoreError
} from 'firebase/firestore';
import { 
  getAuth, 
  signOut
} from 'firebase/auth';
import { Flyer, Offer } from '../types';

// Configuration from firebase-applet-config.json
const firebaseConfig = {
  apiKey: "AIzaSyDOJlAxy2rrnQI8Quo7NPj9cdkFJmH-Fm4",
  authDomain: "gen-lang-client-0245950207.firebaseapp.com",
  projectId: "gen-lang-client-0245950207",
  storageBucket: "gen-lang-client-0245950207.firebasestorage.app",
  messagingSenderId: "129909415789",
  appId: "1:129909415789:web:8783315dbd5d5d68958464"
};

// Initialize Firebase with ignoreUndefinedProperties set to true to prevent undefined validation issues
const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true
}, "ai-studio-flyerintelai-5b9f3058-c058-47ae-852a-b019eef8667e");
export const auth = getAuth(app);

// Explicit sanitization helpers to ensure compliance with strict Firestore schema rules
export function sanitizeFlyer(flyer: Flyer): any {
  const allowedKeys = [
    'id', 'marketId', 'cityName', 'startDate', 'endDate', 'imageUrl', 
    'numPages', 'observations', 'status', 'createdAt', 'modelUsed', 
    'processingTimestamp', 'originalAiResponse', 'linkOriginal'
  ];
  const sanitized: any = {};
  allowedKeys.forEach(key => {
    const val = (flyer as any)[key];
    if (val !== undefined && val !== null) {
      sanitized[key] = val;
    }
  });
  return sanitized;
}

export function sanitizeOffer(offer: Offer): any {
  const allowedKeys = [
    'id', 'flyerId', 'pageNum', 'marketId', 'originalName', 'price', 
    'unit', 'confidence', 'boundingBox', 'productCanonicalId', 
    'promotionType', 'rules', 'status', 'previousPrice', 'modelUsed', 
    'processingTimestamp', 'originalAiResponse', 'croppedImageUrl'
  ];
  const sanitized: any = {};
  allowedKeys.forEach(key => {
    const val = (offer as any)[key];
    if (val !== undefined && val !== null) {
      sanitized[key] = val;
    }
  });
  return sanitized;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function reportFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

// Custom UI Friendly Error Handler
export function handleFirestoreError(error: unknown, fallbackMessage: string): string {
  console.error("Firestore Error Detailed log:", error);
  if (error && typeof error === 'object' && 'code' in error) {
    const ferr = error as FirestoreError;
    switch (ferr.code) {
      case 'permission-denied':
        return 'Permissão negada. Certifique-se de estar autenticado com uma conta de administrador autorizada.';
      case 'unauthenticated':
        return 'Sessão expirada. Por favor, realize o login novamente.';
      case 'unavailable':
        return 'O serviço de banco de dados está temporariamente indisponível. Verifique sua conexão de rede.';
      case 'resource-exhausted':
        return 'Limite de requisições excedido. Por favor, aguarde alguns instantes.';
      default:
        return `${fallbackMessage} (Código: ${ferr.code})`;
    }
  }
  return fallbackMessage;
}

// Test Connection Routine
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    const q = query(collection(db, 'flyers'), limit(1));
    await getDocs(q);
    return true;
  } catch (error) {
    console.error("Connection validation failed:", error);
    return false;
  }
}
