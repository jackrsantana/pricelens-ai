const fs = require('fs');
let code = fs.readFileSync('src/components/DashboardAdmin.tsx', 'utf8');

const importStatement = "import DashboardDiagnostics from './DashboardDiagnostics';";
if (!code.includes(importStatement)) {
    code = code.replace(/import DashboardUpload from '\.\/DashboardUpload';/, "import DashboardUpload from './DashboardUpload';\n" + importStatement);
}

const diagCase = `
      case 'diagnostics':
        return (
          <DashboardDiagnostics />
        );
`;

code = code.replace(/case 'config':/, diagCase + "\n      case 'config':");

fs.writeFileSync('src/components/DashboardAdmin.tsx', code);
console.log("Fixed diagnostic tab");
