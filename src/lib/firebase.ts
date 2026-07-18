/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { 
  initializeFirestore, 
  collection as rawCollection, 
  getDocs as rawGetDocs, 
  limit as rawLimit, 
  query as rawQuery,
  FirestoreError,
  getDoc as rawGetDoc,
  getCountFromServer as rawGetCountFromServer,
  onSnapshot as rawOnSnapshot,
  setDoc as rawSetDoc,
  deleteDoc as rawDeleteDoc,
  addDoc as rawAddDoc,
  doc as rawDoc,
  orderBy as rawOrderBy,
  where as rawWhere,
  writeBatch as rawWriteBatch
} from 'firebase/firestore';
import { 
  getAuth, 
  signOut
} from 'firebase/auth';
import { Flyer, Offer } from '../types';
import { MetricTracker } from './instrumentation';

// Re-export basic helper functions and constraints directly
export const collection = rawCollection;
export const limit = rawLimit;
export const query = rawQuery;
export const doc = rawDoc;
export const orderBy = rawOrderBy;
export const where = rawWhere;

// Extract path/collection safely from Query, CollectionReference, or DocumentReference
export function getPathFromRef(ref: any): string {
  if (!ref) return 'unknown';
  if (typeof ref.path === 'string') return ref.path;
  if (ref._query && ref._query.path && typeof ref._query.path.canonicalString === 'function') {
    return ref._query.path.canonicalString();
  }
  if (ref.ref && typeof ref.ref.path === 'string') return ref.ref.path;
  for (const key of Object.keys(ref)) {
    if (ref[key] && typeof ref[key].path === 'string') {
      return ref[key].path;
    }
  }
  return 'unknown';
}

// Wrapper for writeBatch
export function writeBatch(firestore: any) {
  const batch = rawWriteBatch(firestore);
  const operations: { type: string; collection: string }[] = [];
  
  return {
    set(docRef: any, data: any, options?: any) {
      const collectionName = getPathFromRef(docRef);
      operations.push({ type: 'set', collection: collectionName });
      batch.set(docRef, data, options);
      return this;
    },
    update(docRef: any, data: any) {
      const collectionName = getPathFromRef(docRef);
      operations.push({ type: 'update', collection: collectionName });
      batch.update(docRef, data);
      return this;
    },
    delete(docRef: any) {
      const collectionName = getPathFromRef(docRef);
      operations.push({ type: 'delete', collection: collectionName });
      batch.delete(docRef);
      return this;
    },
    async commit() {
      const start = performance.now();
      try {
        await batch.commit();
        const duration = performance.now() - start;
        // Group by collection and count writes
        const counts: Record<string, number> = {};
        operations.forEach(op => {
          counts[op.collection] = (counts[op.collection] || 0) + 1;
        });
        Object.entries(counts).forEach(([collectionName, count]) => {
          MetricTracker.logWrite(collectionName, 'writeBatch.commit', count, duration / Math.max(1, Object.keys(counts).length), {
            service: 'Firestore',
            func: 'writeBatch'
          });
        });
      } catch (error) {
        const duration = performance.now() - start;
        MetricTracker.logError(`writeBatch.commit`, error, duration, {
          service: 'Firestore',
          func: 'writeBatch'
        });
        throw error;
      }
    }
  };
}

// Wrapper for getDocs
export async function getDocs(q: any) {
  const start = performance.now();
  const collectionName = getPathFromRef(q);
  try {
    const snapshot = await rawGetDocs(q);
    const duration = performance.now() - start;
    MetricTracker.logRead(collectionName, 'getDocs', snapshot.size, duration, {
      service: 'Firestore',
      func: 'getDocs'
    });
    return snapshot;
  } catch (error) {
    const duration = performance.now() - start;
    MetricTracker.logError(`getDocs(${collectionName})`, error, duration, {
      service: 'Firestore',
      func: 'getDocs'
    });
    throw error;
  }
}

// Wrapper for getDoc
export async function getDoc(docRef: any) {
  const start = performance.now();
  const collectionName = getPathFromRef(docRef);
  try {
    const docSnap = await rawGetDoc(docRef);
    const duration = performance.now() - start;
    MetricTracker.logRead(collectionName, 'getDoc', docSnap.exists() ? 1 : 0, duration, {
      service: 'Firestore',
      func: 'getDoc'
    });
    return docSnap;
  } catch (error) {
    const duration = performance.now() - start;
    MetricTracker.logError(`getDoc(${collectionName})`, error, duration, {
      service: 'Firestore',
      func: 'getDoc'
    });
    throw error;
  }
}

// Wrapper for getCountFromServer
export async function getCountFromServer(q: any) {
  const start = performance.now();
  const collectionName = getPathFromRef(q);
  try {
    const snapshot = await rawGetCountFromServer(q);
    const count = snapshot.data().count;
    const duration = performance.now() - start;
    MetricTracker.logRead(collectionName, 'getCountFromServer', count, duration, {
      service: 'Firestore',
      func: 'getCountFromServer'
    });
    return snapshot;
  } catch (error) {
    const duration = performance.now() - start;
    MetricTracker.logError(`getCountFromServer(${collectionName})`, error, duration, {
      service: 'Firestore',
      func: 'getCountFromServer'
    });
    throw error;
  }
}

// Wrapper for onSnapshot
export function onSnapshot(q: any, ...args: any[]) {
  const start = performance.now();
  const collectionName = getPathFromRef(q);
  MetricTracker.logRead(collectionName, 'onSnapshot_init', 0, 0, {
    service: 'Firestore',
    func: 'onSnapshot'
  });
  
  const userCallback = args[0];
  const userError = args[1];
  
  const wrappedCallback = (snapshot: any) => {
    const duration = performance.now() - start;
    MetricTracker.logRead(collectionName, 'onSnapshot_event', snapshot.size, duration, {
      service: 'Firestore',
      func: 'onSnapshot_callback'
    });
    if (typeof userCallback === 'function') {
      userCallback(snapshot);
    } else if (userCallback && typeof userCallback.next === 'function') {
      userCallback.next(snapshot);
    }
  };

  if (typeof userCallback === 'function') {
    return rawOnSnapshot(q, wrappedCallback, userError);
  } else {
    const observer = {
      ...userCallback,
      next: wrappedCallback
    };
    return rawOnSnapshot(q, observer);
  }
}

// Wrapper for setDoc
export async function setDoc(docRef: any, data: any, options?: any) {
  const start = performance.now();
  const collectionName = getPathFromRef(docRef);
  try {
    await rawSetDoc(docRef, data, options);
    const duration = performance.now() - start;
    MetricTracker.logWrite(collectionName, 'setDoc', 1, duration, {
      service: 'Firestore',
      func: 'setDoc'
    });
  } catch (error) {
    const duration = performance.now() - start;
    MetricTracker.logError(`setDoc(${collectionName})`, error, duration, {
      service: 'Firestore',
      func: 'setDoc'
    });
    throw error;
  }
}

// Wrapper for addDoc
export async function addDoc(collectionRef: any, data: any) {
  const start = performance.now();
  const collectionName = getPathFromRef(collectionRef);
  try {
    const docRef = await rawAddDoc(collectionRef, data);
    const duration = performance.now() - start;
    MetricTracker.logWrite(collectionName, 'addDoc', 1, duration, {
      service: 'Firestore',
      func: 'addDoc'
    });
    return docRef;
  } catch (error) {
    const duration = performance.now() - start;
    MetricTracker.logError(`addDoc(${collectionName})`, error, duration, {
      service: 'Firestore',
      func: 'addDoc'
    });
    throw error;
  }
}

// Wrapper for deleteDoc
export async function deleteDoc(docRef: any) {
  const start = performance.now();
  const collectionName = getPathFromRef(docRef);
  try {
    await rawDeleteDoc(docRef);
    const duration = performance.now() - start;
    MetricTracker.logWrite(collectionName, 'deleteDoc', 1, duration, {
      service: 'Firestore',
      func: 'deleteDoc'
    });
  } catch (error) {
    const duration = performance.now() - start;
    MetricTracker.logError(`deleteDoc(${collectionName})`, error, duration, {
      service: 'Firestore',
      func: 'deleteDoc'
    });
    throw error;
  }
}

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
