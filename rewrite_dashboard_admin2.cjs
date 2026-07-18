const fs = require('fs');

let content = fs.readFileSync('src/components/DashboardAdmin.tsx', 'utf8');

const startIndex = content.indexOf(`      case 'danger':`);
const endIndex = content.indexOf(`      default:`, startIndex);

if (startIndex !== -1 && endIndex !== -1) {
    const replacement = `      case 'danger':\n        return <DangerZoneManager logAction={logAction} showSuccess={showSuccess} showError={showError} />;\n`;
    content = content.substring(0, startIndex) + replacement + content.substring(endIndex);
}

fs.writeFileSync('src/components/DashboardAdmin.tsx', content);
