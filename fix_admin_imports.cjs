const fs = require('fs');
let code = fs.readFileSync('src/components/DashboardAdmin.tsx', 'utf8');
if (!code.includes('useQueryClient')) {
  code = `import { useQueryClient, useQuery } from '@tanstack/react-query';\n` + code;
} else if (!code.includes('useQuery ')) {
  code = code.replace(/useQueryClient/, 'useQueryClient, useQuery');
}

const lucideIcons = ['LayoutDashboard', 'Activity', 'ShieldCheck', 'Store', 'UploadCloud', 'ShieldAlert', 'Image as ImageIcon', 'Tag', 'FolderEdit', 'Bookmark', 'History', 'BrainCircuit', 'Database', 'ScrollText', 'Settings', 'Flame'];

let missingIcons = [];
for (let icon of lucideIcons) {
  let searchIcon = icon.includes(' as ') ? icon.split(' as ')[1] : icon;
  if (!code.includes(searchIcon)) missingIcons.push(icon);
}
if (missingIcons.length > 0) {
  code = code.replace(/import \{ (.*?) \} from 'lucide-react';/, `import { $1, LayoutDashboard, ShieldCheck, Store, UploadCloud, ShieldAlert, Image as ImageIcon, Tag, FolderEdit, Bookmark, History, ScrollText, Flame } from 'lucide-react';`);
}
fs.writeFileSync('src/components/DashboardAdmin.tsx', code);
