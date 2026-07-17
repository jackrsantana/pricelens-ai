const fs = require('fs');
let code = fs.readFileSync('src/main.tsx', 'utf8');

const importLine = `import { MetricTracker } from './lib/instrumentation';\n`;
code = importLine + code;

const initLine = `\nif (process.env.NODE_ENV === 'development') {\n  (window as any).__FirestoreMetrics__ = MetricTracker;\n}\n`;
code = code + initLine;

fs.writeFileSync('src/main.tsx', code);
console.log("Patched main.tsx!");
