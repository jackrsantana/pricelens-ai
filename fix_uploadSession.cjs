const fs = require('fs');
let code = fs.readFileSync('src/components/DashboardAdmin.tsx', 'utf8');

code = code.replace(/useTrackedState<any>\(\(\(\) => \{/g, "useTrackedState<any>(() => {");
code = code.replace(/\}\)\(\), 'DashboardAdmin', 'uploadSession'\);/g, "}, 'DashboardAdmin', 'uploadSession');");

fs.writeFileSync('src/components/DashboardAdmin.tsx', code);
