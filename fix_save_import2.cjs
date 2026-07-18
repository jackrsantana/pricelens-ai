const fs = require('fs');
let code = fs.readFileSync('src/components/DashboardAdmin.tsx', 'utf8');

code = code.replace(/Copy, Menu\} from 'lucide-react';/g, "Copy, Menu, Save} from 'lucide-react';");

fs.writeFileSync('src/components/DashboardAdmin.tsx', code);
console.log("Added Save import!");
