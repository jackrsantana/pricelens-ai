const fs = require('fs');
let code = fs.readFileSync('src/components/DashboardDiagnostics.tsx', 'utf8');

code = code.replace(/score={Object\.values\(renderCounts\)\.reduce\(\(a: any, b: any\) => Number\(a\) \+ Number\(b\), 0\)}/, 
  "score={Number(Object.values(renderCounts).reduce((a: any, b: any) => Number(a) + Number(b), 0))}");

fs.writeFileSync('src/components/DashboardDiagnostics.tsx', code);
console.log("Fixed score");
