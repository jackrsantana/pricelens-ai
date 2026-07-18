const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// move isAdminView before the hooks
const adminViewDeclaration = `  const [isAdminView, setIsAdminView] = useState<boolean>(
    window.location.pathname === '/admin' || window.location.hash === '#/admin'
  );`;

code = code.replace(adminViewDeclaration, '');
code = code.replace(/const queryClient = useQueryClient\(\);/, `const queryClient = useQueryClient();\n${adminViewDeclaration}\n`);

fs.writeFileSync('src/App.tsx', code);
