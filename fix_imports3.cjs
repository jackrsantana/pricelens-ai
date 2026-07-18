const fs = require('fs');

const components = [
  'src/components/DashboardGeneral.tsx',
  'src/components/DashboardSmartOffers.tsx',
  'src/components/DashboardProducts.tsx',
  'src/components/DashboardMarkets.tsx',
  'src/components/DashboardCompare.tsx',
  'src/components/DashboardBasket.tsx',
  'src/components/DashboardCity.tsx',
  'src/components/DashboardUpload.tsx',
  'src/components/DashboardAI.tsx',
  'src/components/DashboardAdmin.tsx'
];

for (const comp of components) {
  let code = fs.readFileSync(comp, 'utf8');
  
  // Find all React imports and consolidate them
  const reactImportMatches = code.match(/import React.*?from 'react';/g);
  if (reactImportMatches) {
    let hooks = [];
    for (const match of reactImportMatches) {
      if (match.includes('{')) {
        const inside = match.match(/\{(.*?)\}/)[1];
        hooks.push(...inside.split(',').map(h => h.trim()).filter(Boolean));
      }
      code = code.replace(match + '\n', '');
      code = code.replace(match, '');
    }
    
    // add memo
    if (!hooks.includes('memo')) hooks.push('memo');
    
    const uniqueHooks = [...new Set(hooks)];
    
    const newImport = uniqueHooks.length > 0 
      ? `import React, { ${uniqueHooks.join(', ')} } from 'react';\n`
      : `import React from 'react';\n`;
      
    // find the first import and insert it there
    code = code.replace(/import /, newImport + "import ");
  }

  // Remove duplicate import React
  code = code.replace(/import React, \{ \{/g, 'import React, {');
  
  fs.writeFileSync(comp, code);
}
console.log("Fixed imports");
