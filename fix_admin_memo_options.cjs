const fs = require('fs');
let code = fs.readFileSync('src/components/DashboardAdmin.tsx', 'utf8');

// Replace inline { limit: 100 } with a memoized constant or just remove them if not needed,
// but wait, since limit: 100 is static, we can just define it outside the component!

code = code.replace(/repoOptions: \{ limit: 100 \}/g, "repoOptions: ADMIN_REPO_OPTIONS");

// add const ADMIN_REPO_OPTIONS = { limit: 100 }; outside the component
if (!code.includes('const ADMIN_REPO_OPTIONS')) {
  code = code.replace(/function DashboardAdmin/, "const ADMIN_REPO_OPTIONS = { limit: 100 };\n\nfunction DashboardAdmin");
}

fs.writeFileSync('src/components/DashboardAdmin.tsx', code);
