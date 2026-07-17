#!/bin/bash
sed -i -e '/const batch = writeBatch(db);/,/await batch.commit();/c\
        const associatedOffers = offers.filter(o => o.flyerId === flyerId);\
        // Chunk array into pieces of 499 (Firestore batch limit is 500)\
        const chunks = [];\
        let i = 0;\
        while (i < associatedOffers.length) {\
          chunks.push(associatedOffers.slice(i, i + 499));\
          i += 499;\
        }\
        \
        for (const chunk of chunks) {\
          const batch = writeBatch(db);\
          chunk.forEach(o => batch.delete(doc(db, '"'"'offers'"'"', o.id)));\
          await batch.commit();\
        }\
        \
        // Delete the flyer itself\
        const flyerBatch = writeBatch(db);\
        flyerBatch.delete(doc(db, '"'"'flyers'"'"', flyerId));\
        await flyerBatch.commit();' src/components/DashboardAdmin.tsx
