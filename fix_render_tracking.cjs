const fs = require('fs');

function addRenderTracking(file, componentName) {
  let code = fs.readFileSync(file, 'utf8');
  if (!code.includes("MetricTracker.logRender")) {
    if (!code.includes("MetricTracker")) {
      code = "import { MetricTracker } from '../lib/instrumentation';\n" + code;
    }
    code = code.replace(new RegExp(`function ${componentName}\\([^)]*\\) {\\s*`), `function ${componentName}(...args: any[]) {\n  MetricTracker.logRender('${componentName}');\n  `);
    // Or arrow function format
    code = code.replace(new RegExp(`const ${componentName} = \\([^)]*\\) => {\\s*`), `const ${componentName} = (...args: any[]) => {\n  MetricTracker.logRender('${componentName}');\n  `);
    fs.writeFileSync(file, code);
  }
}

addRenderTracking('src/components/DashboardAdmin.tsx', 'DashboardAdmin');
addRenderTracking('src/components/DashboardUpload.tsx', 'DashboardUpload');
addRenderTracking('src/components/DashboardAI.tsx', 'DashboardAI');

console.log("Added render tracking");
