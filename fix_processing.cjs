const fs = require('fs');
let code = fs.readFileSync('src/components/DashboardAdmin.tsx', 'utf8');

code = code.replace(/const unnormalized = \(dashboardStats \|\| \{\}\)\.unnormalizedOffersCount \|\| 0;/g, "const unnormalized = offers.filter(o => !o.productCanonicalId).length;");
code = code.replace(/const normalized = \(dashboardStats \|\| \{\}\)\.normalizedOffersCount \|\| 0;/g, "const normalized = technicalStats.validCount;");
code = code.replace(/const manualReview = \(dashboardStats \|\| \{\}\)\.manualReviewOffersCount \|\| 0;/g, "const manualReview = technicalStats.pendingReviewCount;");

fs.writeFileSync('src/components/DashboardAdmin.tsx', code);
