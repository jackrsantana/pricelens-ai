import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FirestoreRepository } from '../services/FirestoreRepository';
import { Market, CanonicalProduct, Category, Flyer, Offer, AuditLog, Backup, STATIC_CATEGORIES } from '../types';

export const CACHE_KEYS = {
  STATS: ['dashboard_stats'],
  FLYERS: ['flyers'],
  OFFERS: ['offers'],
  MARKETS: ['markets'],
  PRODUCTS: ['canonical_products'],
  CATEGORIES: ['categories'],
  BRANDS: ['brands'],
  AUDIT_LOGS: ['audit_logs'],
  BACKUPS: ['backups'],
  SETTINGS: ['system_settings']
};

// --- READS (Queries) ---

export const useFlyers = (options?: any) => useQuery<Flyer[]>({ 
  queryKey: [...CACHE_KEYS.FLYERS, { ...options?.repoOptions }], 
  queryFn: () => FirestoreRepository.getFlyers({ ...options?.repoOptions }), 
  staleTime: 1000 * 60 * 15, // 15 minutes
  gcTime: 1000 * 60 * 30,    // 30 minutes
  refetchOnMount: false,     // Avoid refetching when switching tabs
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  ...options 
});

export const useOffers = (options?: any) => useQuery<Offer[]>({ 
  queryKey: [...CACHE_KEYS.OFFERS, { ...options?.repoOptions }], 
  queryFn: () => FirestoreRepository.getOffers({ ...options?.repoOptions }), 
  staleTime: 1000 * 60 * 15, // 15 minutes
  gcTime: 1000 * 60 * 30,    // 30 minutes
  refetchOnMount: false,     // Avoid refetching when switching tabs
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  ...options 
});

export const useMarkets = (options?: any) => useQuery<Market[]>({ 
  queryKey: [...CACHE_KEYS.MARKETS, { ...options?.repoOptions }], 
  queryFn: () => FirestoreRepository.getMarkets(), 
  staleTime: Infinity,       // Markets change rarely
  gcTime: 1000 * 60 * 60,    // 1 hour
  refetchOnMount: false,     // Avoid refetching when switching tabs
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  ...options 
});

export const useProducts = (options?: any) => useQuery<CanonicalProduct[]>({ 
  queryKey: [...CACHE_KEYS.PRODUCTS, { ...options?.repoOptions }], 
  queryFn: () => FirestoreRepository.getProducts(), 
  staleTime: Infinity,       // Canonical products change rarely
  gcTime: 1000 * 60 * 60,    // 1 hour
  refetchOnMount: false,     // Avoid refetching when switching tabs
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  ...options 
});

export const useCategories = (options?: any) => useQuery<Category[]>({ 
  queryKey: [...CACHE_KEYS.CATEGORIES], 
  queryFn: async () => STATIC_CATEGORIES, 
  staleTime: Infinity, 
  gcTime: Infinity,
  refetchOnMount: false,
  ...options 
});

export const useBrands = (options?: any) => useQuery<string[]>({ 
  queryKey: [...CACHE_KEYS.BRANDS], 
  queryFn: async () => [], 
  staleTime: Infinity, 
  gcTime: Infinity,
  refetchOnMount: false,
  ...options 
});

export const useAuditLogs = (options?: any) => useQuery<AuditLog[]>({ 
  queryKey: CACHE_KEYS.AUDIT_LOGS, 
  queryFn: FirestoreRepository.getAuditLogs, 
  staleTime: 1000 * 60 * 10, // 10 minutes
  gcTime: 1000 * 60 * 20,    // 20 minutes
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  ...options 
});

export const useBackups = (options?: any) => useQuery<Backup[]>({ 
  queryKey: [...CACHE_KEYS.BACKUPS, options?.repoOptions], 
  queryFn: FirestoreRepository.getBackups, 
  staleTime: 1000 * 60 * 15, // 15 minutes
  gcTime: 1000 * 60 * 30,    // 30 minutes
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  ...options 
});

export const useDashboardStats = (options?: any) => useQuery<any>({ 
  queryKey: CACHE_KEYS.STATS, 
  queryFn: () => FirestoreRepository.getDashboardStats(), 
  staleTime: 1000 * 60 * 15, // 15 minutes
  gcTime: 1000 * 60 * 30,    // 30 minutes
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  ...options 
});

export const useSystemSettings = (options?: any) => useQuery<any>({ 
  queryKey: CACHE_KEYS.SETTINGS, 
  queryFn: FirestoreRepository.getSystemSettings, 
  staleTime: Infinity, 
  gcTime: 1000 * 60 * 60,
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  ...options 
});

// --- WRITES (Mutations) ---

export const useMutateMarket = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Market }) => FirestoreRepository.saveMarket(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CACHE_KEYS.MARKETS }),
  });
};

export const useDeleteMarket = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => FirestoreRepository.deleteMarket(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CACHE_KEYS.MARKETS }),
  });
};

export const useMutateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CanonicalProduct }) => FirestoreRepository.saveProduct(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CACHE_KEYS.PRODUCTS }),
  });
};

export const useDeleteProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => FirestoreRepository.deleteProduct(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CACHE_KEYS.PRODUCTS }),
  });
};

export const useMutateFlyer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Flyer> }) => FirestoreRepository.saveFlyer(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CACHE_KEYS.FLYERS }),
  });
};

export const useMutateOffer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Offer }) => FirestoreRepository.saveOffer(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CACHE_KEYS.OFFERS }),
  });
};

export const useAddAuditLog = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Omit<AuditLog, 'id'>) => FirestoreRepository.addAuditLog(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CACHE_KEYS.AUDIT_LOGS }),
  });
};

export const useCreateBackup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ backupId, summary, payload }: { backupId: string; summary: any; payload: any }) => 
      FirestoreRepository.createBackup(backupId, summary, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CACHE_KEYS.BACKUPS }),
  });
};

export const useDeleteBackup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => FirestoreRepository.deleteBackup(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CACHE_KEYS.BACKUPS }),
  });
};
