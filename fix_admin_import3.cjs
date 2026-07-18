const fs = require('fs');
let code = fs.readFileSync('src/components/DashboardAdmin.tsx', 'utf8');

code = code.replace(/import \{\n  useMarkets,/, "import {\n  useFlyers,\n  useOffers,\n  useMarkets,");

// Also let's fix useQueries.ts so tsc doesn't complain about QueryFunctionContext
let hooksCode = fs.readFileSync('src/hooks/useQueries.ts', 'utf8');
const queries = [
  'useFlyers', 'useOffers', 'useMarkets', 'useProducts', 'useCategories', 'useBrands'
];
for (const q of queries) {
  let modelName = q.replace('use', 'get');
  hooksCode = hooksCode.replace(new RegExp(`queryFn: FirestoreRepository\\.${modelName},`), `queryFn: () => FirestoreRepository.${modelName}(),`);
}
fs.writeFileSync('src/hooks/useQueries.ts', hooksCode);
fs.writeFileSync('src/components/DashboardAdmin.tsx', code);
