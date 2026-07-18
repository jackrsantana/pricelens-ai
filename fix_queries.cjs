const fs = require('fs');
let code = fs.readFileSync('src/hooks/useQueries.ts', 'utf8');

const queries = [
  'useFlyers', 'useOffers', 'useMarkets', 'useProducts', 'useCategories', 'useBrands', 'useAuditLogs', 'useBackups', 'useSystemSettings'
];

for (const q of queries) {
  const regex = new RegExp(`export const ${q} = \\(\\) => useQuery\\(\\{ (.*?) \\}\\);`);
  code = code.replace(regex, `export const ${q} = (options?: any) => useQuery({ $1, ...options });`);
}

fs.writeFileSync('src/hooks/useQueries.ts', code);
console.log("Fixed useQueries.ts");
