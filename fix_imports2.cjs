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
  code = code.replace(/import React from 'react', \{ memo \} from 'react';/g, "import React, { memo } from 'react';");
  code = code.replace(/import React, (.*?), \{ memo \} from 'react';/g, "import React, { $1, memo } from 'react';");
  
  fs.writeFileSync(comp, code);
}
console.log("Fixed imports");
