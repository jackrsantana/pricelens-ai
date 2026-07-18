const fs = require('fs');
let code = fs.readFileSync('src/services/FirestoreRepository.ts', 'utf8');

// Add options to getFlyers and getOffers
code = code.replace(/getFlyers: async \(\): Promise<Flyer\[\]> => \{/, `getFlyers: async (options?: { limit?: number; status?: string; marketId?: string }): Promise<Flyer[]> => {`);
code = code.replace(/const q = query\(collection\(db, 'flyers'\), orderBy\('uploadDate', 'desc'\)\);/, `
    let qBase: any = collection(db, 'flyers');
    let queryConstraints: any[] = [];
    if (options?.status) queryConstraints.push(where('status', '==', options.status));
    if (options?.marketId) queryConstraints.push(where('marketId', '==', options.marketId));
    queryConstraints.push(orderBy('uploadDate', 'desc'));
    if (options?.limit) queryConstraints.push(limit(options.limit));
    const q = query(qBase, ...queryConstraints);
`);

code = code.replace(/getOffers: async \(\): Promise<Offer\[\]> => \{/, `getOffers: async (options?: { limit?: number; marketId?: string }): Promise<Offer[]> => {`);
code = code.replace(/const snapshot = await getDocs\(collection\(db, 'offers'\)\);/, `
    let qBase: any = collection(db, 'offers');
    let queryConstraints: any[] = [];
    if (options?.marketId) queryConstraints.push(where('marketId', '==', options.marketId));
    if (options?.limit) queryConstraints.push(limit(options.limit));
    const q = queryConstraints.length > 0 ? query(qBase, ...queryConstraints) : qBase;
    const snapshot = await getDocs(q);
`);

fs.writeFileSync('src/services/FirestoreRepository.ts', code);
