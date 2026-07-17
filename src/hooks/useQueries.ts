import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FirestoreRepository } from '../services/FirestoreRepository';
import { Market, CanonicalProduct, Category, Flyer, Offer, AuditLog, Backup } from '../types';

export const CACHE_KEYS = {
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

export const useFlyers = () => useQuery({ queryKey: CACHE_KEYS.FLYERS, queryFn: FirestoreRepository.getFlyers, staleTime: 1000 * 60 * 5 });
export const useOffers = () => useQuery({ queryKey: CACHE_KEYS.OFFERS, queryFn: FirestoreRepository.getOffers, staleTime: 1000 * 60 * 5 });
export const useMarkets = () => useQuery({ queryKey: CACHE_KEYS.MARKETS, queryFn: FirestoreRepository.getMarkets, staleTime: Infinity }); // Markets change rarely
export const useProducts = () => useQuery({ queryKey: CACHE_KEYS.PRODUCTS, queryFn: FirestoreRepository.getProducts, staleTime: Infinity }); // Canonical products change rarely
export const useCategories = () => useQuery({ queryKey: CACHE_KEYS.CATEGORIES, queryFn: FirestoreRepository.getCategories, staleTime: Infinity });
export const useBrands = () => useQuery({ queryKey: CACHE_KEYS.BRANDS, queryFn: FirestoreRepository.getBrands, staleTime: Infinity });
export const useAuditLogs = () => useQuery({ queryKey: CACHE_KEYS.AUDIT_LOGS, queryFn: FirestoreRepository.getAuditLogs, staleTime: 1000 * 60 * 1 });
export const useBackups = () => useQuery({ queryKey: CACHE_KEYS.BACKUPS, queryFn: FirestoreRepository.getBackups, staleTime: 1000 * 60 * 5 });
export const useSystemSettings = () => useQuery({ queryKey: CACHE_KEYS.SETTINGS, queryFn: FirestoreRepository.getSystemSettings, staleTime: Infinity });

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

export const useMutateCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Category }) => FirestoreRepository.saveCategory(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CACHE_KEYS.CATEGORIES }),
  });
};

export const useDeleteCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => FirestoreRepository.deleteCategory(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CACHE_KEYS.CATEGORIES }),
  });
};

export const useMutateBrand = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => FirestoreRepository.saveBrand(name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CACHE_KEYS.BRANDS }),
  });
};

export const useDeleteBrand = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => FirestoreRepository.deleteBrand(name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CACHE_KEYS.BRANDS }),
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
