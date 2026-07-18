const fs = require('fs');
let content = fs.readFileSync('src/components/DashboardAdmin.tsx', 'utf8');

content = content.replace(
  `  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);`,
  `  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);\n  const handleOpenMobileSidebar = useCallback(() => setIsMobileSidebarOpen(true), []);\n  const handleCloseMobileSidebar = useCallback(() => setIsMobileSidebarOpen(false), []);`
);

content = content.replace(
  `            onClick={() => setIsMobileSidebarOpen(true)}`,
  `            onClick={handleOpenMobileSidebar}`
);

content = content.replace(
  /onClick=\{\(\) => setIsMobileSidebarOpen\(false\)\}/g,
  `onClick={handleCloseMobileSidebar}`
);

fs.writeFileSync('src/components/DashboardAdmin.tsx', content);
