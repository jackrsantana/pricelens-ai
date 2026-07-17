#!/bin/bash
sed -i -e '/const deleteInBatches = async (refs: any\[\]) => {/,/    }/c\
  const deleteInBatches = async (refs: any[]) => {\
    const chunks = [];\
    for (let i = 0; i < refs.length; i += 400) {\
      chunks.push(refs.slice(i, i + 400));\
    }\
    for (const chunk of chunks) {\
      const batch = writeBatch(db);\
      chunk.forEach(ref => batch.delete(ref));\
      await batch.commit();\
    }\
  };' src/components/DashboardAdmin.tsx
