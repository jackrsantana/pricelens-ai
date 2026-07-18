const fs = require('fs');
let code = fs.readFileSync('src/services/FirestoreRepository.ts', 'utf8');

// Line 68 is inside getAuditLogs
code = code.replace(/MetricTracker\.logRead\('flyers', 'getDocs', snapshot\.size, performance\.now\(\) - start, \{ repository: 'FirestoreRepository', func: 'getFlyers' \}\);/, 
  "MetricTracker.logRead('audit_logs', 'getDocs', snapshot.size, performance.now() - start, { repository: 'FirestoreRepository', func: 'getAuditLogs' });");

// Line 76 is inside getBackups
code = code.replace(/MetricTracker\.logRead\('flyers', 'getDocs', snapshot\.size, performance\.now\(\) - start, \{ repository: 'FirestoreRepository', func: 'getFlyers' \}\);/, 
  "MetricTracker.logRead('backups', 'getDocs', snapshot.size, performance.now() - start, { repository: 'FirestoreRepository', func: 'getBackups' });");

code = code.replace(/MetricTracker\.logRead\(String\(doc\(db, 'system_config', 'settings'\)\), performance\.now\(\) - start, 1\);/, 
  "MetricTracker.logRead('system_config', 'getDoc', 1, performance.now() - start, { repository: 'FirestoreRepository', func: 'getSystemSettings' });");

code = code.replace(/MetricTracker\.logRead\(String\(doc\(db, 'backup_payloads', backupId\)\), performance\.now\(\) - start, 1\);/, 
  "MetricTracker.logRead('backup_payloads', 'getDoc', 1, performance.now() - start, { repository: 'FirestoreRepository', func: 'getBackupPayload' });");

code = code.replace(/MetricTracker\.logWrite\('BATCH', performance\.now\(\) - start\);/g, 
  "MetricTracker.logWrite('multiple', 'batch.commit', 1, performance.now() - start, { repository: 'FirestoreRepository', func: 'batchCommit' });");

fs.writeFileSync('src/services/FirestoreRepository.ts', code);
console.log("Fixed more repo calls");
