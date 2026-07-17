import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  setDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  limit, 
  writeBatch 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Flyer, Offer, Market, CanonicalProduct, Category, AuditLog, Backup } from '../types';

import { MetricTracker } from '../lib/instrumentation';

export const FirestoreRepository = {
  // --- Queries (Reads) ---
  
  getFlyers: async (): Promise<Flyer[]> => {
    const q = query(collection(db, 'flyers'), orderBy('startDate', 'desc'));
    const start = performance.now();
    const snapshot = await getDocs(q);
    MetricTracker.logRead(String(q), performance.now() - start, snapshot.size);
    return snapshot.docs.map(doc => doc.data() as Flyer);
  },

  getOffers: async (): Promise<Offer[]> => {
    const start = performance.now();
    const snapshot = await getDocs(collection(db, 'offers'));
    MetricTracker.logRead(String(collection(db, 'offers')), performance.now() - start, snapshot.size);
    return snapshot.docs.map(doc => doc.data() as Offer);
  },

  getMarkets: async (): Promise<Market[]> => {
    const start = performance.now();
    const snapshot = await getDocs(collection(db, 'markets'));
    MetricTracker.logRead(String(collection(db, 'markets')), performance.now() - start, snapshot.size);
    return snapshot.docs.map(doc => doc.data() as Market);
  },

  getProducts: async (): Promise<CanonicalProduct[]> => {
    const start = performance.now();
    const snapshot = await getDocs(collection(db, 'canonical_products'));
    MetricTracker.logRead(String(collection(db, 'canonical_products')), performance.now() - start, snapshot.size);
    return snapshot.docs.map(doc => doc.data() as CanonicalProduct);
  },

  getCategories: async (): Promise<Category[]> => {
    const start = performance.now();
    const snapshot = await getDocs(collection(db, 'categories'));
    MetricTracker.logRead(String(collection(db, 'categories')), performance.now() - start, snapshot.size);
    return snapshot.docs.map(doc => doc.data() as Category);
  },

  getBrands: async (): Promise<string[]> => {
    const start = performance.now();
    const snapshot = await getDocs(collection(db, 'brands_list'));
    MetricTracker.logRead(String(collection(db, 'brands_list')), performance.now() - start, snapshot.size);
    return snapshot.docs.map(doc => doc.id);
  },

  getAuditLogs: async (): Promise<AuditLog[]> => {
    const q = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(100));
    const start = performance.now();
    const snapshot = await getDocs(q);
    MetricTracker.logRead(String(q), performance.now() - start, snapshot.size);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditLog));
  },

  getBackups: async (): Promise<Backup[]> => {
    const q = query(collection(db, 'backups'), orderBy('date', 'desc'));
    const start = performance.now();
    const snapshot = await getDocs(q);
    MetricTracker.logRead(String(q), performance.now() - start, snapshot.size);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Backup));
  },

  getSystemSettings: async () => {
    const start = performance.now();
    const docSnap = await getDoc(doc(db, 'system_config', 'settings'));
    MetricTracker.logRead(String(doc(db, 'system_config', 'settings')), performance.now() - start, 1);
    return docSnap.exists() ? docSnap.data() : null;
  },

  getBackupPayload: async (backupId: string) => {
    const start = performance.now();
    const docSnap = await getDoc(doc(db, 'backup_payloads', backupId));
    MetricTracker.logRead(String(doc(db, 'backup_payloads', backupId)), performance.now() - start, 1);
    return docSnap.exists() ? docSnap.data() : null;
  },

  // --- Mutations (Writes) ---

  saveMarket: async (id: string, payload: Market) => {
    const start = performance.now();
    await setDoc(doc(db, 'markets', id), payload);
    
  },

  deleteMarket: async (id: string) => {
    const start = performance.now();
    await deleteDoc(doc(db, 'markets', id));
    
  },

  saveFlyer: async (id: string, payload: Partial<Flyer>) => {
    const start = performance.now();
    await setDoc(doc(db, 'flyers', id), payload, { merge: true });
    
  },

  saveOffer: async (id: string, payload: Offer) => {
    const start = performance.now();
    await setDoc(doc(db, 'offers', id), payload);
    
  },

  saveProduct: async (id: string, payload: CanonicalProduct) => {
    const start = performance.now();
    await setDoc(doc(db, 'canonical_products', id), payload);
    
  },

  deleteProduct: async (id: string) => {
    const start = performance.now();
    await deleteDoc(doc(db, 'canonical_products', id));
    
  },

  saveCategory: async (id: string, payload: Category) => {
    const start = performance.now();
    await setDoc(doc(db, 'categories', id), payload);
    
  },

  deleteCategory: async (id: string) => {
    const start = performance.now();
    await deleteDoc(doc(db, 'categories', id));
    
  },

  saveBrand: async (name: string) => {
    const start = performance.now();
    await setDoc(doc(db, 'brands_list', name), { name });
    
  },

  deleteBrand: async (name: string) => {
    const start = performance.now();
    await deleteDoc(doc(db, 'brands_list', name));
    
  },

  addAuditLog: async (log: Omit<AuditLog, 'id'>) => {
    // Audit logs are better written as distinct documents using auto IDs to avoid hotspots
    const newDocRef = doc(collection(db, 'audit_logs'));
    const start = performance.now();
    await setDoc(newDocRef, log);
    
  },

  createBackup: async (backupId: string, summaryData: any, payloadData: any) => {
    const batch = writeBatch(db);
    batch.set(doc(db, 'backups', backupId), summaryData);
    batch.set(doc(db, 'backup_payloads', backupId), { payload: JSON.stringify(payloadData) });
    const start = performance.now();
    await batch.commit();
    MetricTracker.logWrite('BATCH', performance.now() - start);
  },

  deleteBackup: async (backupId: string) => {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'backups', backupId));
    batch.delete(doc(db, 'backup_payloads', backupId));
    const start = performance.now();
    await batch.commit();
    MetricTracker.logWrite('BATCH', performance.now() - start);
  }
};
