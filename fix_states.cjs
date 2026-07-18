const fs = require('fs');
let code = fs.readFileSync('src/components/DashboardAdmin.tsx', 'utf8');

if (!code.includes("useTrackedState")) {
  code = code.replace("import { useTrackedRender } from '../hooks/useDiagnostic';", "import { useTrackedRender, useTrackedState } from '../hooks/useDiagnostic';");
  code = code.replace(/useState<string>\('dashboard'\);/, "useTrackedState<string>('dashboard', 'DashboardAdmin', 'activeSubTab');");
  code = code.replace(/useState<any>\(\(\) => \{/, "useTrackedState<any>(() => {"); // wait, useTrackedState might not support lazy init nicely. Let's not do that.
}

fs.writeFileSync('src/components/DashboardAdmin.tsx', code);
console.log("Fixed states");
