const fs = require('fs');
let code = fs.readFileSync('src/components/DashboardAdmin.tsx', 'utf8');

code = code.replace(/case 'processing': \{[\s\S]*?const manualReview = offers.filter\(o => o.status === 'review_pending'\).length;/g, 
  `case 'processing': {
        const aguardando = technicalStats.processingQueue;
        const concluido = technicalStats.processedOCR;
        const erro = technicalStats.ocrFailures;
        const unnormalized = (dashboardStats || {}).unnormalizedOffersCount || 0;
        const normalized = (dashboardStats || {}).normalizedOffersCount || 0;
        const manualReview = (dashboardStats || {}).manualReviewOffersCount || 0;`);

fs.writeFileSync('src/components/DashboardAdmin.tsx', code);
