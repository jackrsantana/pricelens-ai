const fs = require('fs');
let code = fs.readFileSync('src/components/DashboardDiagnostics.tsx', 'utf8');

code = code.replace(/Object\.values\(renderCounts\)\.reduce\(\(a, b\) => a \+ b, 0\)/g, "Object.values(renderCounts).reduce((a: number, b: number) => a + b, 0)");
code = code.replace(/Object\.entries\(renderCounts\)\.sort\(\(a, b\) => b\[1\] - a\[1\]\)/g, "Object.entries(renderCounts).sort((a: [string, number], b: [string, number]) => b[1] - a[1])");

fs.writeFileSync('src/components/DashboardDiagnostics.tsx', code);
console.log("Fixed ts errors in DashboardDiagnostics");
