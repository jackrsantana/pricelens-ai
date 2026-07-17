#!/bin/bash
sed -i '/const handleReprocessFlyer/,/};/d' src/components/DashboardAdmin.tsx
sed -i '/handleReprocessFlyer/d' src/components/DashboardAdmin.tsx
sed -i '/title="Reprocessar OCR"/d' src/components/DashboardAdmin.tsx
sed -i '/<RefreshCw className="w-3.5 h-3.5" \/>/d' src/components/DashboardAdmin.tsx
