const fs = require('fs');
let code = fs.readFileSync('src/services/FirestoreRepository.ts', 'utf8');

const newStatsFn = `  getDashboardStats: async () => {
    const start = performance.now();
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
      MetricTracker.logRead('multiple', 'getCountFromServer', 7, performance.now() - start, { repository: 'FirestoreRepository', func: 'getDashboardStats' });
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
  },`;

code = code.replace(/getDashboardStats: async \(\) => \{[\s\S]*?return \{ marketsCount: 0, flyersCount: 0, offersCount: 0.*?\};\n    \}\n  \},/, newStatsFn);

fs.writeFileSync('src/services/FirestoreRepository.ts', code);
