#!/bin/bash
sed -i 's/await setDoc(doc(db, .flyers., targetId), cleanFlyer);/await setDoc(doc(db, '"'"'flyers'"'"', targetId), cleanFlyer, { merge: true });/' src/components/DashboardAdmin.tsx
