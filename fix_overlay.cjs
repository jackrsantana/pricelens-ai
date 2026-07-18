const fs = require('fs');
let code = fs.readFileSync('src/components/DiagnosticOverlay.tsx', 'utf8');

code = code.replace(/setRenderCount\(Object\.values\(MetricTracker\.renderCounts\)\.reduce\(\(a, b\) => a \+ b, 0\)\);/, 
  "setRenderCount(Object.values(MetricTracker.renderCounts).reduce((a: any, b: any) => Number(a) + Number(b), 0));");

fs.writeFileSync('src/components/DiagnosticOverlay.tsx', code);
console.log("Fixed overlay");
