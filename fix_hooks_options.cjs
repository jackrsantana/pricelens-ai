const fs = require('fs');
let code = fs.readFileSync('src/hooks/useQueries.ts', 'utf8');

code = code.replace(/queryFn: \(\) => FirestoreRepository\.getFlyers\(\)/g, "queryFn: () => FirestoreRepository.getFlyers(options?.repoOptions)");
code = code.replace(/queryFn: \(\) => FirestoreRepository\.getOffers\(\)/g, "queryFn: () => FirestoreRepository.getOffers(options?.repoOptions)");
code = code.replace(/queryFn: \(\) => FirestoreRepository\.getMarkets\(\)/g, "queryFn: () => FirestoreRepository.getMarkets(options?.repoOptions)");
code = code.replace(/queryFn: \(\) => FirestoreRepository\.getProducts\(\)/g, "queryFn: () => FirestoreRepository.getProducts(options?.repoOptions)");
code = code.replace(/queryFn: \(\) => FirestoreRepository\.getCategories\(\)/g, "queryFn: () => FirestoreRepository.getCategories(options?.repoOptions)");
code = code.replace(/queryFn: \(\) => FirestoreRepository\.getBrands\(\)/g, "queryFn: () => FirestoreRepository.getBrands(options?.repoOptions)");
code = code.replace(/queryFn: \(\) => FirestoreRepository\.getAuditLogs\(\)/g, "queryFn: () => FirestoreRepository.getAuditLogs(options?.repoOptions)");
code = code.replace(/queryFn: \(\) => FirestoreRepository\.getBackups\(\)/g, "queryFn: () => FirestoreRepository.getBackups(options?.repoOptions)");

// Also cache keys should include repoOptions so they are distinct
const queries = ['useFlyers', 'useOffers', 'useMarkets', 'useProducts', 'useCategories', 'useBrands', 'useAuditLogs', 'useBackups'];
for (const q of queries) {
  let keyName = q.replace('use', '').toUpperCase();
  if (keyName === 'PRODUCTS') keyName = 'PRODUCTS';
  // Wait, some CACHE_KEYS are different, CACHE_KEYS.FLYERS
  code = code.replace(new RegExp(`queryKey: CACHE_KEYS\\.${keyName}`), `queryKey: [CACHE_KEYS.${keyName}, options?.repoOptions]`);
}

fs.writeFileSync('src/hooks/useQueries.ts', code);
