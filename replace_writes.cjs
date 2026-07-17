const fs = require('fs');
let code = fs.readFileSync('src/components/DashboardAdmin.tsx', 'utf8');

// Replace setDoc for markets
code = code.replace(/await setDoc\(doc\(db, 'markets', (.*?)\), (.*?)\);/g, "await FirestoreRepository.saveMarket($1, $2);\n      queryClient.invalidateQueries({ queryKey: ['markets'] });");

// Replace deleteDoc for markets
code = code.replace(/await deleteDoc\(doc\(db, 'markets', (.*?)\)\);/g, "await FirestoreRepository.deleteMarket($1);\n        queryClient.invalidateQueries({ queryKey: ['markets'] });");

// Replace setDoc for flyers
code = code.replace(/await setDoc\(doc\(db, 'flyers', (.*?)\), (.*?), \{ merge: true \}\);/g, "await FirestoreRepository.saveFlyer($1, $2);\n      queryClient.invalidateQueries({ queryKey: ['flyers'] });");

// Replace setDoc for offers
code = code.replace(/await setDoc\(doc\(db, 'offers', (.*?)\), (.*?)\);/g, "await FirestoreRepository.saveOffer($1, $2);\n      queryClient.invalidateQueries({ queryKey: ['offers'] });");

// Replace setDoc for canonical_products
code = code.replace(/await setDoc\(doc\(db, 'canonical_products', (.*?)\), (.*?)\);/g, "await FirestoreRepository.saveProduct($1, $2);\n      queryClient.invalidateQueries({ queryKey: ['canonical_products'] });");

// Replace deleteDoc for canonical_products
code = code.replace(/await deleteDoc\(doc\(db, 'canonical_products', (.*?)\)\);/g, "await FirestoreRepository.deleteProduct($1);\n        queryClient.invalidateQueries({ queryKey: ['canonical_products'] });");

// Replace setDoc for categories
code = code.replace(/await setDoc\(doc\(db, 'categories', (.*?)\), (.*?)\);/g, "await FirestoreRepository.saveCategory($1, $2);\n      queryClient.invalidateQueries({ queryKey: ['categories'] });");

// Replace deleteDoc for categories
code = code.replace(/await deleteDoc\(doc\(db, 'categories', (.*?)\)\);/g, "await FirestoreRepository.deleteCategory($1);\n        queryClient.invalidateQueries({ queryKey: ['categories'] });");

// Replace setDoc for brands_list
code = code.replace(/await setDoc\(doc\(db, 'brands_list', (.*?)\), (.*?)\);/g, "await FirestoreRepository.saveBrand($1);\n      queryClient.invalidateQueries({ queryKey: ['brands'] });");

// Replace deleteDoc for brands_list
code = code.replace(/await deleteDoc\(doc\(db, 'brands_list', (.*?)\)\);/g, "await FirestoreRepository.deleteBrand($1);\n        queryClient.invalidateQueries({ queryKey: ['brands'] });");

fs.writeFileSync('src/components/DashboardAdmin.tsx', code);
console.log("Replaced writes successfully!");
