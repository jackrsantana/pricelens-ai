const fs = require('fs');
let code = fs.readFileSync('src/services/FirestoreRepository.ts', 'utf8');

code = code.replace(/export const FirestoreRepository = \{/, "import { MetricTracker } from '../lib/instrumentation';\n\nexport const FirestoreRepository = {");

const readMatch = /const snapshot = await getDocs\((.*?)\);\n    return snapshot.docs.map/g;
code = code.replace(readMatch, (match, queryStr) => {
  return `const start = performance.now();\n    const snapshot = await getDocs(${queryStr});\n    MetricTracker.logRead(String(${queryStr}), performance.now() - start, snapshot.size);\n    return snapshot.docs.map`;
});

const getDocMatch = /const docSnap = await getDoc\((.*?)\);\n    return docSnap/g;
code = code.replace(getDocMatch, (match, docStr) => {
  return `const start = performance.now();\n    const docSnap = await getDoc(${docStr});\n    MetricTracker.logRead(String(${docStr}), performance.now() - start, 1);\n    return docSnap`;
});

const writeMatch = /await setDoc\((.*?)\);/g;
code = code.replace(writeMatch, (match, docStr) => {
  return `const start = performance.now();\n    await setDoc(${docStr});\n    MetricTracker.logWrite(String(${docStr}), performance.now() - start);`;
});

const deleteMatch = /await deleteDoc\((.*?)\);/g;
code = code.replace(deleteMatch, (match, docStr) => {
  return `const start = performance.now();\n    await deleteDoc(${docStr});\n    MetricTracker.logWrite(String(${docStr}), performance.now() - start);`;
});

// Update batch commit
const batchMatch = /await batch\.commit\(\);/g;
code = code.replace(batchMatch, `const start = performance.now();\n    await batch.commit();\n    MetricTracker.logWrite('BATCH', performance.now() - start);`);

fs.writeFileSync('src/services/FirestoreRepository.ts', code);
console.log("Patched repository successfully!");
