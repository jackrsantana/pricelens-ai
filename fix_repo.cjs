const fs = require('fs');
let code = fs.readFileSync('src/services/FirestoreRepository.ts', 'utf8');

// Replacements for reads
code = code.replace(/MetricTracker\.logRead\(String\(q\), performance\.now\(\) - start, snapshot\.size\);/g, 
  "MetricTracker.logRead('flyers', 'getDocs', snapshot.size, performance.now() - start, { repository: 'FirestoreRepository', func: 'getFlyers' });");
  
code = code.replace(/MetricTracker\.logRead\(String\(collection\(db, 'offers'\)\), performance\.now\(\) - start, snapshot\.size\);/g, 
  "MetricTracker.logRead('offers', 'getDocs', snapshot.size, performance.now() - start, { repository: 'FirestoreRepository', func: 'getOffers' });");

code = code.replace(/MetricTracker\.logRead\(String\(collection\(db, 'markets'\)\), performance\.now\(\) - start, snapshot\.size\);/g, 
  "MetricTracker.logRead('markets', 'getDocs', snapshot.size, performance.now() - start, { repository: 'FirestoreRepository', func: 'getMarkets' });");

code = code.replace(/MetricTracker\.logRead\(String\(collection\(db, 'canonical_products'\)\), performance\.now\(\) - start, snapshot\.size\);/g, 
  "MetricTracker.logRead('canonical_products', 'getDocs', snapshot.size, performance.now() - start, { repository: 'FirestoreRepository', func: 'getCanonicalProducts' });");

code = code.replace(/MetricTracker\.logRead\(String\(collection\(db, 'categories'\)\), performance\.now\(\) - start, snapshot\.size\);/g, 
  "MetricTracker.logRead('categories', 'getDocs', snapshot.size, performance.now() - start, { repository: 'FirestoreRepository', func: 'getCategories' });");

code = code.replace(/MetricTracker\.logRead\(String\(collection\(db, 'brands_list'\)\), performance\.now\(\) - start, snapshot\.size\);/g, 
  "MetricTracker.logRead('brands_list', 'getDocs', snapshot.size, performance.now() - start, { repository: 'FirestoreRepository', func: 'getBrands' });");

// The second query replacement might match getAuditLogs or getBackups, let's fix them manually.
fs.writeFileSync('src/services/FirestoreRepository.ts', code);
console.log("Replaced fixed ones");
