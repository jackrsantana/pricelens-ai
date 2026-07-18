const fs = require('fs');

function fix(file, comp) {
  let code = fs.readFileSync(file, 'utf8');
  code = code.replace(`MetricTracker.logRender('${comp}');\n  `, '');
  code = code.replace("import { MetricTracker } from '../lib/instrumentation';", "import { MetricTracker } from '../lib/instrumentation';\nimport { useTrackedRender } from '../hooks/useDiagnostic';");
  
  const funcRegex = new RegExp(`export default function ${comp}\\(([^\\)]*)\\) \\{`);
  code = code.replace(funcRegex, `export default function ${comp}($1) {\n  useTrackedRender('${comp}', arguments[0] || {});`);
  
  fs.writeFileSync(file, code);
}

fix('src/components/DashboardUpload.tsx', 'DashboardUpload');
fix('src/components/DashboardAdmin.tsx', 'DashboardAdmin');
fix('src/components/DashboardAI.tsx', 'DashboardAI');

console.log("Fixed logRender calls");
