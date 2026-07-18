const fs = require('fs');
let code = fs.readFileSync('src/components/DashboardDiagnostics.tsx', 'utf8');

code = code.replace(/const firestoreScore = .*/, 'const firestoreScore = Math.max(0, 100 - (Number(reads) / 10));');
code = code.replace(/const geminiScore = .*/, 'const geminiScore = Math.max(0, 100 - (Number(geminiCalls) * 5));');
code = code.replace(/count > 50/g, 'Number(count) > 50');
code = code.replace(/count <= 50/g, 'Number(count) <= 50');
code = code.replace(/Object\.entries\(renderCounts\)\.sort\(\(a: \[string, number\], b: \[string, number\]\) => b\[1\] - a\[1\]\)/g, "Object.entries(renderCounts).sort((a: any, b: any) => Number(b[1]) - Number(a[1]))");

fs.writeFileSync('src/components/DashboardDiagnostics.tsx', code);
console.log("Fixed diag math");
