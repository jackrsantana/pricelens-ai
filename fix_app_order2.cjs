const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /const \[isAdminView, setIsAdminView\] = useState<boolean>\(\s*window\.location\.pathname === '\/admin' \|\| window\.location\.hash === '#\/admin'\s*\);/;

code = code.replace(regex, '');
code = code.replace(/const queryClient = useQueryClient\(\);/, `const queryClient = useQueryClient();\n  const [isAdminView, setIsAdminView] = useState<boolean>(window.location.pathname === '/admin' || window.location.hash === '#/admin');`);

fs.writeFileSync('src/App.tsx', code);
