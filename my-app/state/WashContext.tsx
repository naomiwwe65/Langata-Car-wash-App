import React, { createContext, useContext, useMemo, useRef, useSyncExternalStore } from 'react';

export type WashEntry = {
  id: string;
  plate: string;
  model: string;
  services: string[]; // selected services
  service?: string; // legacy single service
  amount: number;
  method: 'mpesa' | 'card';
  timestamp: number; // ms
  paid?: boolean;
  receiptNo?: string;
};

export type Settings = {
  businessName: string;
  defaultReceiptEmail: string;
  autoEmailReceipts: boolean;
};

type WashStoreState = {
  washes: WashEntry[];
  settings: Settings;
};

type WashStore = {
  get: () => WashStoreState;
  set: (updater: (prev: WashStoreState) => WashStoreState) => void;
  subscribe: (listener: () => void) => () => void;
};

function createWashStore(): WashStore {
  let state: WashStoreState = {
    washes: [],
    settings: {
      businessName: 'My Car Wash',
      defaultReceiptEmail: '',
      autoEmailReceipts: false,
    },
  };
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    set: (updater) => {
      state = updater(state);
      listeners.forEach((l) => l());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

const WashStoreContext = createContext<WashStore | null>(null);

export function WashProvider({ children }: { children: React.ReactNode }) {
  const storeRef = useRef<WashStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = createWashStore();
  }
  return <WashStoreContext.Provider value={storeRef.current}>{children}</WashStoreContext.Provider>;
}

export function useWashStore() {
  const store = useContext(WashStoreContext);
  if (!store) throw new Error('useWashStore must be used within WashProvider');
  const state = useSyncExternalStore(store.subscribe, store.get, store.get);

  const actions = useMemo(
    () => ({
      addWash: async (entry: Omit<WashEntry, 'id'>) => {
        const resp = await fetch(`${process.env.EXPO_PUBLIC_FUNCTIONS_URL ?? ''}/createWash`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry),
        });
        const json = await resp.json();
        if (!resp.ok || !json?.id) throw new Error(json?.error || 'Failed to create wash');
        const id = json.id as string;
        store.set((prev) => ({ ...prev, washes: [...prev.washes, { id, ...entry }] }));
        return id;
      },
      markPaid: async (id: string) => {
        const resp = await fetch(`${process.env.EXPO_PUBLIC_FUNCTIONS_URL ?? ''}/markPaid`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id }),
        });
        const json = await resp.json();
        if (!resp.ok || !json?.ok) throw new Error(json?.error || 'Failed to mark paid');
        const receiptNo: string | undefined = json?.receiptNo;
        store.set((prev) => ({
          ...prev,
          washes: prev.washes.map((w) => (w.id === id ? { ...w, paid: true, receiptNo: w.receiptNo ?? receiptNo } : w)),
        }));
      },
      updateSettings: (partial: Partial<Settings>) => {
        store.set((prev) => ({ ...prev, settings: { ...prev.settings, ...partial } }));
      },
      clearAll: () => {
        store.set((prev) => ({ ...prev, washes: [] }));
      },
    }),
    [store]
  );

  return { ...state, ...actions } as WashStoreState & typeof actions;
}


