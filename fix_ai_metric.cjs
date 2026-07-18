const fs = require('fs');
let code = fs.readFileSync('src/components/DashboardAI.tsx', 'utf8');

if (!code.includes("MetricTracker.logGeminiCall")) {
  code = code.replace(/import React/g, "import React from 'react';\nimport { MetricTracker } from '../lib/instrumentation';");
  
  code = code.replace(/const data = await response\.json\(\);/g, "const data = await response.json();\n        MetricTracker.logGeminiCall(activeModel, 800, { context: 'ai-chat' });");
}

fs.writeFileSync('src/components/DashboardAI.tsx', code);
console.log("Fixed DashboardAI metrics!");
