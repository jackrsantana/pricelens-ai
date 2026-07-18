const fs = require('fs');
let code = fs.readFileSync('src/components/DashboardAdmin.tsx', 'utf8');

if (!code.includes("useFlyers")) {
  code = code.replace(/import \{ useMarkets, useProducts, useCategories, useBrands, useAuditLogs, useBackups \} from '\.\.\/hooks\/useQueries';/, 
    "import { useFlyers, useOffers, useMarkets, useProducts, useCategories, useBrands, useAuditLogs, useBackups } from '../hooks/useQueries';");
}

code = code.replace(/function DashboardAdmin\(\{ flyers, offers, loading, onUpdateOffer, onAddFlyerAndOffers \}: Props\) \{[\s\S]*?const \[isMobileSidebarOpen/, 
  `function DashboardAdmin({ loading, onUpdateOffer, onAddFlyerAndOffers }: Omit<Props, 'flyers' | 'offers'>) {
  useTrackedRender('DashboardAdmin', arguments[0] || {});
  const [isMobileSidebarOpen`);

code = code.replace(/const \[activeSubTab, setActiveSubTab\] = useTrackedState<string>\('dashboard', 'DashboardAdmin', 'activeSubTab'\);/, 
  `const [activeSubTab, setActiveSubTab] = useTrackedState<string>('dashboard', 'DashboardAdmin', 'activeSubTab');
  
  const { data: flyers = [], isLoading: loadingFlyers } = useFlyers({ enabled: ['dashboard', 'flyers', 'database'].includes(activeSubTab) }) as any;
  const { data: offers = [], isLoading: loadingOffers } = useOffers({ enabled: ['dashboard', 'processing', 'quality', 'crops', 'database'].includes(activeSubTab) }) as any;
  `);

// Need to fix Props definition in DashboardAdmin if it requires flyers and offers
code = code.replace(/interface Props \{[\s\S]*?\}/, `interface Props {
  flyers?: Flyer[];
  offers?: Offer[];
  loading?: boolean;
  onUpdateOffer: (offer: Offer) => void;
  onAddFlyerAndOffers: (flyer: any, offers: any[]) => void;
}`);

fs.writeFileSync('src/components/DashboardAdmin.tsx', code);
