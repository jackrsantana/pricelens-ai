const fs = require('fs');
let code = fs.readFileSync('src/services/FirestoreRepository.ts', 'utf8');

function addOptions(methodName, collectionName) {
  let regex = new RegExp(`${methodName}: async \\(\\): Promise<${collectionName}\\[\\]> => \\{[\\s\\S]*?const snapshot = await getDocs\\(collection\\(db, '${collectionName.toLowerCase()}'\\)\\);`, 'g');
  let realCollection = collectionName.toLowerCase();
  if (methodName === 'getProducts') realCollection = 'canonical_products';
  if (methodName === 'getCategories') realCollection = 'categories';
  if (methodName === 'getMarkets') realCollection = 'markets';
  
  if (code.includes(`${methodName}: async (): Promise<`)) {
    code = code.replace(new RegExp(`${methodName}: async \\(\\): Promise<${collectionName === 'CanonicalProduct' ? 'CanonicalProduct' : collectionName}\\[\\]> => \\{[\\s\\S]*?const snapshot = await getDocs\\(collection\\(db, '${realCollection}'\\)\\);`), 
      `${methodName}: async (options?: { limit?: number }): Promise<${collectionName === 'CanonicalProduct' ? 'CanonicalProduct' : collectionName}[]> => {
    const start = performance.now();
    let qBase: any = collection(db, '${realCollection}');
    const q = options?.limit ? query(qBase, limit(options.limit)) : qBase;
    const snapshot = await getDocs(q);`);
  }
}

addOptions('getMarkets', 'Market');
addOptions('getProducts', 'CanonicalProduct');
addOptions('getCategories', 'Category');
// getBrands returns string[], let's do it manually
code = code.replace(/getBrands: async \(\): Promise<string\[\]> => \{[\s\S]*?const snapshot = await getDocs\(collection\(db, 'brands_list'\)\);/,
  `getBrands: async (options?: { limit?: number }): Promise<string[]> => {
    const start = performance.now();
    let qBase: any = collection(db, 'brands_list');
    const q = options?.limit ? query(qBase, limit(options.limit)) : qBase;
    const snapshot = await getDocs(q);`);

fs.writeFileSync('src/services/FirestoreRepository.ts', code);
console.log("Fixed all getters");
