const fs = require('fs');
let code = fs.readFileSync('src/services/FirestoreRepository.ts', 'utf8');

code = code.replace(/MetricTracker\.logRead\('audit_logs', 'getDocs', snapshot\.size, performance\.now\(\) - start, \{ repository: 'FirestoreRepository', func: 'getAuditLogs' \}\);/g, 
  "MetricTracker.logRead('flyers', 'getDocs', snapshot.size, performance.now() - start, { repository: 'FirestoreRepository', func: 'getFlyers' });");

// wait, getBackups inside getAuditLogs
code = code.replace(/getAuditLogs: async \(\): Promise<AuditLog\[\]> => \{[\s\S]*?getBackups: async/g, `getAuditLogs: async (): Promise<AuditLog[]> => {
    const q = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(100));
    const start = performance.now();
    const snapshot = await getDocs(q);
    MetricTracker.logRead('audit_logs', 'getDocs', snapshot.size, performance.now() - start, { repository: 'FirestoreRepository', func: 'getAuditLogs' });
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditLog));
  },

  getBackups: async`);

code = code.replace(/getBackups: async \(\): Promise<Backup\[\]> => \{[\s\S]*?MetricTracker\.logRead\('flyers'[\s\S]*?return snapshot\.docs/g, `getBackups: async (): Promise<Backup[]> => {
    const q = query(collection(db, 'backups'), orderBy('date', 'desc'));
    const start = performance.now();
    const snapshot = await getDocs(q);
    MetricTracker.logRead('backups', 'getDocs', snapshot.size, performance.now() - start, { repository: 'FirestoreRepository', func: 'getBackups' });
    return snapshot.docs`);

fs.writeFileSync('src/services/FirestoreRepository.ts', code);
