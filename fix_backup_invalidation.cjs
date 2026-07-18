const fs = require('fs');
let code = fs.readFileSync('src/components/DashboardAdmin.tsx', 'utf8');

code = code.replace(/await setDoc\(doc\(db, 'backup_payloads', backupId\), \{ payload: JSON\.stringify\(backupPayload\) \}\);(\s*)logAction\('BACKUP_CREATE'/g, "await setDoc(doc(db, 'backup_payloads', backupId), { payload: JSON.stringify(backupPayload) });$1queryClient.invalidateQueries({ queryKey: ['backups'] });$1logAction('BACKUP_CREATE'");

code = code.replace(/await deleteDoc\(doc\(db, 'backup_payloads', id\)\);(\s*)logAction\('BACKUP_DELETE'/g, "await deleteDoc(doc(db, 'backup_payloads', id));$1queryClient.invalidateQueries({ queryKey: ['backups'] });$1logAction('BACKUP_DELETE'");

fs.writeFileSync('src/components/DashboardAdmin.tsx', code);
console.log("Fixed backup invalidation!");
