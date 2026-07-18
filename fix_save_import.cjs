const fs = require('fs');
let code = fs.readFileSync('src/components/DashboardAdmin.tsx', 'utf8');

if (!code.includes('Save,')) {
  code = code.replace(/Copy, Menu/g, "Copy, Menu, Save");
}
fs.writeFileSync('src/components/DashboardAdmin.tsx', code);
console.log("Added Save import!");
