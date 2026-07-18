const fs = require('fs');
let code = fs.readFileSync('src/components/DashboardAdmin.tsx', 'utf8');

code = code.replace(/useTrackedState<string>\('processing', 'DashboardAdmin', 'activeSubTab'\);/, "useTrackedState<string>('config', 'DashboardAdmin', 'activeSubTab');");

fs.writeFileSync('src/components/DashboardAdmin.tsx', code);
