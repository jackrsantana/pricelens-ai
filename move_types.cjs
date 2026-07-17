const fs = require('fs');

let typesCode = fs.readFileSync('src/types.ts', 'utf8');
let adminCode = fs.readFileSync('src/components/DashboardAdmin.tsx', 'utf8');

const auditLogRegex = /interface AuditLog \{[\s\S]*?\}/;
const backupRegex = /interface Backup \{[\s\S]*?\}/;

const auditLogMatch = adminCode.match(auditLogRegex);
const backupMatch = adminCode.match(backupRegex);

if (auditLogMatch && !typesCode.includes("interface AuditLog")) {
  typesCode += '\nexport ' + auditLogMatch[0] + '\n';
  adminCode = adminCode.replace(auditLogRegex, '');
}

if (backupMatch && !typesCode.includes("interface Backup")) {
  typesCode += '\nexport ' + backupMatch[0] + '\n';
  adminCode = adminCode.replace(backupRegex, '');
}

fs.writeFileSync('src/types.ts', typesCode);
fs.writeFileSync('src/components/DashboardAdmin.tsx', adminCode);
console.log("Moved types to types.ts!");
