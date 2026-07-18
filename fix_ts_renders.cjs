const fs = require('fs');
let code = fs.readFileSync('src/components/DashboardDiagnostics.tsx', 'utf8');

code = code.replace(/const totalRenders = Object\.values\(renderCounts\)\.reduce\(\(acc, val\) => acc \+ \(val as number\), 0\);\n  const renderScore = Math\.max\(0, 100 - \(totalRenders \/ 100\)\);/, 
  "let totalRenders = 0;\n  for (const count of Object.values(renderCounts)) {\n    totalRenders += Number(count);\n  }\n  const renderScore = Math.max(0, 100 - (totalRenders / 100));");

fs.writeFileSync('src/components/DashboardDiagnostics.tsx', code);
console.log("Fixed ts error with loop");
