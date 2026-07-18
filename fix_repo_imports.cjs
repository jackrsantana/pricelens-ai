const fs = require('fs');
let code = fs.readFileSync('src/services/FirestoreRepository.ts', 'utf8');

if (!code.includes('where,')) {
  code = code.replace(/limit,/, "limit, where,");
}
fs.writeFileSync('src/services/FirestoreRepository.ts', code);
