import { 
  collection, 
  doc, 
  getDocs,
  getCountFromServer, 
  getDoc,
  setDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  limit, where, 
  writeBatch,
  db
} from '../lib/firebase';
import { Flyer, Offer, Market, CanonicalProduct, AuditLog, Backup } from '../types';

import { MetricTracker } from '../lib/instrumentation';

export const FirestoreRepository = {
  // --- Queries (Reads) ---
  
  getFlyers: async (options?: { status?: string; marketId?: string }): Promise<Flyer[]> => {
    let qBase = collection(db, 'flyers');
    let queryConstraints: any[] = [orderBy('createdAt', 'desc')];
    if (options?.status) {
      queryConstraints.push(where('status', '==', options.status));
    }
    if (options?.marketId) {
      queryConstraints.push(where('marketId', '==', options.marketId));
    }
    queryConstraints.push(limit(50));
    const q = query(qBase, ...queryConstraints);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Flyer);
  },

  getOffers: async (options?: { marketId?: string }): Promise<Offer[]> => {
    let qBase = collection(db, 'offers');
    let queryConstraints: any[] = [orderBy('createdAt', 'desc')];
    if (options?.marketId) {
      queryConstraints.push(where('marketId', '==', options.marketId));
    }
    queryConstraints.push(limit(50));
    const q = query(qBase, ...queryConstraints);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Offer);
  },

  getMarkets: async (): Promise<Market[]> => {
    let qBase = collection(db, 'markets');
     
    const q = query(qBase, orderBy('createdAt', 'desc'), limit(50));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Market);
  },

  getProducts: async (): Promise<CanonicalProduct[]> => {
    let qBase = collection(db, 'canonical_products');
     
    const q = query(qBase, orderBy('createdAt', 'desc'), limit(50));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as CanonicalProduct);
  },


  getAuditLogs: async (): Promise<AuditLog[]> => {
    const q = query(collection(db, 'audit_logs'), orderBy('createdAt', 'desc'), limit(50));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as AuditLog));
  },

  getBackups: async (): Promise<Backup[]> => {
    const q = query(collection(db, 'backups'), orderBy('createdAt', 'desc'), limit(50));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Backup));
  },

  getDashboardStats: async () => {
    try {
      const [
        marketsSnap, flyersSnap, offersSnap,
        pendingOcrSnap, processedSnap, errorSnap,
        reviewSnap
      ] = await Promise.all([
        getCountFromServer(collection(db, 'markets')),
        getCountFromServer(collection(db, 'flyers')),
        getCountFromServer(collection(db, 'offers')),
        getCountFromServer(query(collection(db, 'flyers'), where('status', '==', 'pending_ocr'))),
        getCountFromServer(query(collection(db, 'flyers'), where('status', '==', 'processed'))),
        getCountFromServer(query(collection(db, 'flyers'), where('status', '==', 'error'))),
        getCountFromServer(query(collection(db, 'offers'), where('status', '==', 'review_pending')))
      ]);
      return {
        marketsCount: marketsSnap.data().count,
        flyersCount: flyersSnap.data().count,
        offersCount: offersSnap.data().count,
        pendingOcrCount: pendingOcrSnap.data().count,
        processedFlyersCount: processedSnap.data().count,
        errorFlyersCount: errorSnap.data().count,
        manualReviewOffersCount: reviewSnap.data().count,
        // Since we can't easily query != null in count, we'll estimate or just use 0 if we can't
        unnormalizedOffersCount: 0,
        normalizedOffersCount: offersSnap.data().count,
      };
    } catch (e) {
      console.error('Error fetching stats:', e);
      return { marketsCount: 0, flyersCount: 0, offersCount: 0, pendingOcrCount: 0, processedFlyersCount: 0, errorFlyersCount: 0, unnormalizedOffersCount: 0, normalizedOffersCount: 0, manualReviewOffersCount: 0 };
    }
  },

  getSystemSettings: async () => {
    const docSnap = await getDoc(doc(db, 'system_config', 'settings'));
    return docSnap.exists() ? docSnap.data() : null;
  },

  getBackupPayload: async (backupId: string) => {
    const docSnap = await getDoc(doc(db, 'backup_payloads', backupId));
    return docSnap.exists() ? docSnap.data() : null;
  },

  // --- Mutations (Writes) ---

  saveMarket: async (id: string, payload: Market) => {
    const start = performance.now();
    await setDoc(doc(db, 'markets', id), {
      ...payload,
      createdAt: payload.createdAt || new Date().toISOString()
    });
  },

  deleteMarket: async (id: string) => {
    const start = performance.now();
    await deleteDoc(doc(db, 'markets', id));
  },

  saveFlyer: async (id: string, payload: Partial<Flyer>) => {
    await setDoc(doc(db, 'flyers', id), {
      ...payload,
      createdAt: payload.createdAt || new Date().toISOString()
    }, { merge: true });
  },

  saveOffer: async (id: string, payload: Offer) => {
    await setDoc(doc(db, 'offers', id), {
      ...payload,
      createdAt: payload.createdAt || payload.processingTimestamp || new Date().toISOString()
    });
  },

  saveProduct: async (id: string, payload: CanonicalProduct) => {
    await setDoc(doc(db, 'canonical_products', id), {
      ...payload,
      createdAt: payload.createdAt || new Date().toISOString()
    });
  },

  deleteProduct: async (id: string) => {
    await deleteDoc(doc(db, 'canonical_products', id));
  },

  addAuditLog: async (log: Omit<AuditLog, 'id'>) => {
    // Audit logs are better written as distinct documents using auto IDs to avoid hotspots
    const newDocRef = doc(collection(db, 'audit_logs'));
    await setDoc(newDocRef, {
      ...log,
      createdAt: log.createdAt || log.timestamp || new Date().toISOString()
    });
  },

  createBackup: async (backupId: string, summaryData: any, payloadData: any) => {
    const batch = writeBatch(db);
    batch.set(doc(db, 'backups', backupId), {
      ...summaryData,
      createdAt: summaryData.createdAt || summaryData.date || new Date().toISOString()
    });
    batch.set(doc(db, 'backup_payloads', backupId), { payload: JSON.stringify(payloadData) });
    const start = performance.now();
    await batch.commit();
    MetricTracker.logWrite('multiple', 'batch.commit', 1, performance.now() - start, { repository: 'FirestoreRepository', func: 'batchCommit' });
  },

  deleteBackup: async (backupId: string) => {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'backups', backupId));
    batch.delete(doc(db, 'backup_payloads', backupId));
    const start = performance.now();
    await batch.commit();
    MetricTracker.logWrite('multiple', 'batch.commit', 1, performance.now() - start, { repository: 'FirestoreRepository', func: 'batchCommit' });
  }
};
