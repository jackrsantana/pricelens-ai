const fs = require('fs');

function memoizeComponent(filePath) {
  let code = fs.readFileSync(filePath, 'utf8');
  
  if (code.includes('export default React.memo(') || code.includes('export default memo(')) return;
  
  code = code.replace(/export default function ([a-zA-Z0-9_]+)/g, "function $1");
  if (!code.includes("import React")) {
    code = "import React, { memo } from 'react';\n" + code;
  } else if (!code.includes("{ memo }") && !code.includes(", memo")) {
    code = code.replace(/import React(.*?)(?:;|\n)/, "import React$1, { memo } from 'react';\n");
  } else if (code.includes("import React from 'react'")) {
    code = code.replace("import React from 'react'", "import React, { memo } from 'react'");
  }
  
  const funcMatch = code.match(/function ([a-zA-Z0-9_]+)/);
  if (funcMatch) {
    code += `\nexport default memo(${funcMatch[1]});\n`;
    fs.writeFileSync(filePath, code);
    console.log(`Memoized ${funcMatch[1]}`);
  }
}

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
  try {
    memoizeComponent(comp);
  } catch(e) {
    console.error(e.message);
  }
}
