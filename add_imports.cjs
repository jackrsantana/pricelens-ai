const fs = require('fs');
let code = fs.readFileSync('src/components/DashboardAdmin.tsx', 'utf8');

const importLines = `import { useQueryClient } from '@tanstack/react-query';
import { FirestoreRepository } from '../services/FirestoreRepository';
`;

code = code.replace(/import { APP_CONFIG } from '..\/config\/app';/, importLines + "import { APP_CONFIG } from '../config/app';");

// Add queryClient initialization
code = code.replace(/const { mutateAsync: addAuditLog } = useAddAuditLog\(\);/, "const { mutateAsync: addAuditLog } = useAddAuditLog();\n  const queryClient = useQueryClient();");

fs.writeFileSync('src/components/DashboardAdmin.tsx', code);
console.log("Added imports successfully!");
