const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/const \{ data: flyers = \[\], isLoading: loadingFlyers \} = useFlyers\(\{ enabled: true \}\); \/\/ Admin always needs flyers for now/, "const { data: flyers = [], isLoading: loadingFlyers } = useFlyers({ enabled: !isAdminView });");
code = code.replace(/const \{ data: offers = \[\], isLoading: loadingOffers \} = useOffers\(\{ enabled: true \}\); \/\/ Admin always needs offers for now/, "const { data: offers = [], isLoading: loadingOffers } = useOffers({ enabled: !isAdminView });");
code = code.replace(/<DashboardAdmin\s+flyers=\{flyers\}\s+offers=\{offers\}/, "<DashboardAdmin ");

fs.writeFileSync('src/App.tsx', code);
