const fs = require('fs');
let code = fs.readFileSync('src/components/DashboardAdmin.tsx', 'utf8');

code = code.replace(/if \(payloadDoc\.exists\(\)\) \{/g, "if (payloadDocData) {");
code = code.replace(/const payload = payloadDoc\.data\(\);/g, "const payload = JSON.parse(payloadDocData.payload);");

fs.writeFileSync('src/components/DashboardAdmin.tsx', code);
console.log("Fixed backup restore!");
