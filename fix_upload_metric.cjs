const fs = require('fs');
let code = fs.readFileSync('src/components/DashboardUpload.tsx', 'utf8');

if (!code.includes("MetricTracker.logGeminiCall")) {
  code = code.replace(/import \{ \w+/g, "import { MetricTracker } from '../lib/instrumentation';\n$&");
  
  code = code.replace(/const stats = data\.stats \|\|/g, "if (data.debug?.geminiDuration) { MetricTracker.logGeminiCall(activeModel, data.debug.geminiDuration, { tokens: data.debug?.tokens }); }\n      const stats = data.stats ||");
}

fs.writeFileSync('src/components/DashboardUpload.tsx', code);
console.log("Fixed DashboardUpload metrics!");
