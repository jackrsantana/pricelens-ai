const fs = require('fs');
let code = fs.readFileSync('src/components/DashboardAdmin.tsx', 'utf8');

code = code.replace(/setActiveSubTab\(tab\.id\);/g, `if (activeSubTab !== tab.id) {
                      setActiveSubTab(tab.id);
                    }`);

fs.writeFileSync('src/components/DashboardAdmin.tsx', code);
