const fs = require('fs');
let code = fs.readFileSync('src/components/DashboardDiagnostics.tsx', 'utf8');

code = code.replace(/const renderScore = Math\.max\(0, 100 - \(Object\.values\(renderCounts\)\.reduce\(\(a: number, b: number\) => a \+ b, 0\) \/ 100\)\);/, "const totalRenders = Object.values(renderCounts).reduce((acc, val) => acc + (val as number), 0);\n  const renderScore = Math.max(0, 100 - (totalRenders / 100));");

fs.writeFileSync('src/components/DashboardDiagnostics.tsx', code);
console.log("Fixed reduce error");
