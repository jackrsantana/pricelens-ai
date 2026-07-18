const fs = require('fs');

let content = fs.readFileSync('src/components/DashboardAdmin.tsx', 'utf8');

// Remove the handlers
const handlersRegex = /  \/\/ ==========================================\n  const \[dangerAction[\s\S]*?  \}, \[dangerAction, dangerConfirmPhrase, dangerUnderstandCheckbox, logAction, deleteInBatches\]\);/;
content = content.replace(handlersRegex, '');

// Remove the modal
const modalRegex = /            \{\/\* Double Confirmation Modal for Danger Zone \*\/\}\n            <AnimatePresence>[\s\S]*?            <\/AnimatePresence>/;
content = content.replace(modalRegex, '');

// Save
fs.writeFileSync('src/components/DashboardAdmin.tsx', content);
