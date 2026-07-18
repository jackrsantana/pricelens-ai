const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/const \{ data: flyers = \[\], isLoading: loadingFlyers \} = useFlyers\(\);/, "const { data: flyers = [], isLoading: loadingFlyers } = useFlyers({ enabled: true }); // Admin always needs flyers for now");
code = code.replace(/const \{ data: offers = \[\], isLoading: loadingOffers \} = useOffers\(\);/, "const { data: offers = [], isLoading: loadingOffers } = useOffers({ enabled: true }); // Admin always needs offers for now");
code = code.replace(/const \{ data: markets = \[\], isLoading: loadingMarkets \} = useMarkets\(\);/, "const { data: markets = [], isLoading: loadingMarkets } = useMarkets({ enabled: !isAdminView });");
code = code.replace(/const \{ data: products = \[\], isLoading: loadingProducts \} = useProducts\(\);/, "const { data: products = [], isLoading: loadingProducts } = useProducts({ enabled: !isAdminView });");
code = code.replace(/const \{ data: categories = \[\], isLoading: loadingCategories \} = useCategories\(\);/, "const { data: categories = [], isLoading: loadingCategories } = useCategories({ enabled: !isAdminView });");

fs.writeFileSync('src/App.tsx', code);
