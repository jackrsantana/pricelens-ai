const fs = require('fs');
let code = fs.readFileSync('src/components/DashboardAdmin.tsx', 'utf8');

code = code.replace(/Total de Folhetos: \{flyers\.length\}/g, "Total exibido: {flyers.length} / {technicalStats.flyersCount}");
code = code.replace(/Total de Ofertas: \{offers\.length\}/g, "Total exibido: {offers.length} / {technicalStats.offersCount}");

// There's also some delete all text: "Remove permanentemente todos os {flyers.length} folhetos..."
code = code.replace(/todos os \{flyers\.length\} folhetos, \{offers\.length\} ofertas, \{markets\.length\} mercados/g, 
  "todos os {technicalStats.flyersCount} folhetos, {technicalStats.offersCount} ofertas, {technicalStats.marketsCount} mercados");

code = code.replace(/<div>📁 Folhetos: <span className="font-bold text-rose-600">\{flyers\.length\}<\/span><\/div>/, 
  '<div>📁 Folhetos: <span className="font-bold text-rose-600">{technicalStats.flyersCount}</span></div>');

// There might be more in the database tab
code = code.replace(/<div>📦 Ofertas: <span className="font-bold text-rose-600">\{offers\.length\}<\/span><\/div>/, 
  '<div>📦 Ofertas: <span className="font-bold text-rose-600">{technicalStats.offersCount}</span></div>');
code = code.replace(/<div>🏪 Mercados: <span className="font-bold text-rose-600">\{markets\.length\}<\/span><\/div>/, 
  '<div>🏪 Mercados: <span className="font-bold text-rose-600">{technicalStats.marketsCount}</span></div>');
code = code.replace(/<div>🛒 Produtos Base: <span className="font-bold text-rose-600">\{products\.length\}<\/span><\/div>/, 
  '<div>🛒 Produtos Base: <span className="font-bold text-rose-600">{technicalStats.productsCount}</span></div>');

fs.writeFileSync('src/components/DashboardAdmin.tsx', code);
