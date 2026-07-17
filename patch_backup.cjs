const fs = require('fs');
let code = fs.readFileSync('src/components/DashboardAdmin.tsx', 'utf8');

code = code.replace(/const payloadDoc = await getDoc\(doc\(db, 'backup_payloads', bkp\.id\)\);/g, "const payloadDocData = await FirestoreRepository.getBackupPayload(bkp.id);");
code = code.replace(/if \(\!payloadDoc\.exists\(\)\) \{/g, "if (!payloadDocData) {");
code = code.replace(/const payloadData = payloadDoc\.data\(\);/g, "const payloadData = payloadDocData;");

fs.writeFileSync('src/components/DashboardAdmin.tsx', code);
console.log("Patched backup restore successfully!");
