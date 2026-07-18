const fs = require('fs');
let content = fs.readFileSync('src/components/admin/DangerZoneManager.tsx', 'utf8');

content = content.replace(
  `import { db, FirestoreRepository } from '../../lib/firebase';`,
  `import { db } from '../../lib/firebase';\nimport { FirestoreRepository } from '../../services/FirestoreRepository';`
);

content = content.replace(
  `import { APP_CONFIG } from '../../data';`,
  `import { APP_CONFIG } from '../../config/app';`
);

fs.writeFileSync('src/components/admin/DangerZoneManager.tsx', content);
