import { create } from "zustand";

export interface NFTAsset {
  id: string;
  mint: string;
  name: string;
  image: string;
  collection?: string;
}

interface WalletStore {
  // Wallet state
  publicKey: string | null;
  solBalance: number;
  skrBalance: number;
  nfts: NFTAsset[];

  // Loading
  isLoadingNFTs: boolean;
  isLoadingBalances: boolean;

  // Actions
  setPublicKey: (key: string | null) => void;
  setSolBalance: (balance: number) => void;
  setSkrBalance: (balance: number) => void;
  setNFTs: (nfts: NFTAsset[]) => void;
  setLoadingNFTs: (loading: boolean) => void;
  setLoadingBalances: (loading: boolean) => void;
  reset: () => void;
}

export const useWalletStore = create<WalletStore>((set) => ({
  publicKey: null,
  solBalance: 0,
  skrBalance: 0,
  nfts: [],
  isLoadingNFTs: false,
  isLoadingBalances: false,

  setPublicKey: (key) => set({ publicKey: key }),
  setSolBalance: (balance) => set({ solBalance: balance }),
  setSkrBalance: (balance) => set({ skrBalance: balance }),
  setNFTs: (nfts) => set({ nfts }),
  setLoadingNFTs: (loading) => set({ isLoadingNFTs: loading }),
  setLoadingBalances: (loading) => set({ isLoadingBalances: loading }),

  reset: () =>
    set({
      publicKey: null,
      solBalance: 0,
      skrBalance: 0,
      nfts: [],
      isLoadingNFTs: false,
      isLoadingBalances: false,
    }),
}));
