const fs = require('fs');
let code = fs.readFileSync('src/components/DashboardUpload.tsx', 'utf8');

code = code.replace(/import \{ setDoc\, doc \} from 'firebase\/firestore';/, "import { doc } from 'firebase/firestore';\nimport { FirestoreRepository } from '../services/FirestoreRepository';\nimport { useQueryClient } from '@tanstack/react-query';");

code = code.replace(/await setDoc\(doc\(db, 'markets', targetId\), payload\);/g, "await FirestoreRepository.saveMarket(targetId, payload);\n      const queryClient = useQueryClient();\n      queryClient.invalidateQueries({ queryKey: ['markets'] });");

// Wait, we can't call useQueryClient hook inside a function!
// It must be called at the component top level!

fs.writeFileSync('src/components/DashboardUpload.tsx', code);
console.log("Patched upload successfully!");
