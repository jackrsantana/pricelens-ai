const fs = require('fs');
let code = fs.readFileSync('src/services/FirestoreRepository.ts', 'utf8');

if (!code.includes('getCountFromServer')) {
  code = code.replace(/getDocs,/, "getDocs,\n  getCountFromServer,");
}

const statsFn = `  getDashboardStats: async () => {
    const start = performance.now();
    try {
      const [marketsSnap, flyersSnap, offersSnap] = await Promise.all([
        getCountFromServer(collection(db, 'markets')),
        getCountFromServer(collection(db, 'flyers')),
        getCountFromServer(collection(db, 'offers'))
      ]);
      MetricTracker.logRead('multiple', 'getCountFromServer', 3, performance.now() - start, { repository: 'FirestoreRepository', func: 'getDashboardStats' });
      return {
        marketsCount: marketsSnap.data().count,
        flyersCount: flyersSnap.data().count,
        offersCount: offersSnap.data().count,
      };
    } catch (e) {
      console.error('Error fetching stats:', e);
      return { marketsCount: 0, flyersCount: 0, offersCount: 0 };
    }
  },`;

if (!code.includes('getDashboardStats')) {
  code = code.replace(/getSystemSettings: async/, statsFn + '\n\n  getSystemSettings: async');
}

fs.writeFileSync('src/services/FirestoreRepository.ts', code);
