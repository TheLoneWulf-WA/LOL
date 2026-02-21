import { useEffect, useCallback, useState } from "react";
import { useEmbeddedSolanaWallet } from "@privy-io/expo";
import { PublicKey } from "@solana/web3.js";
import { connection } from "@/lib/solana/connection";
import { getSKRBalance } from "@/lib/solana/skr";
import { fetchNFTs } from "@/lib/nft/helius";
import { useWalletStore } from "@/stores/walletStore";

/**
 * Custom hook that fetches SOL + SKR balances and NFTs for the
 * embedded Solana wallet. Updates walletStore and returns loading /
 * refetch helpers.
 */
export function useWalletBalances() {
  const { wallets } = useEmbeddedSolanaWallet();
  const wallet = wallets?.[0];
  const publicKeyStr = wallet?.publicKey ?? null;

  const setPublicKey = useWalletStore((s) => s.setPublicKey);
  const setSolBalance = useWalletStore((s) => s.setSolBalance);
  const setSkrBalance = useWalletStore((s) => s.setSkrBalance);
  const setNFTs = useWalletStore((s) => s.setNFTs);
  const setLoadingBalances = useWalletStore((s) => s.setLoadingBalances);
  const setLoadingNFTs = useWalletStore((s) => s.setLoadingNFTs);

  const [isLoading, setIsLoading] = useState(false);

  const fetchBalances = useCallback(
    async (address: string) => {
      setLoadingBalances(true);
      try {
        const pubkey = new PublicKey(address);
        const [lamports, skr] = await Promise.all([
          connection.getBalance(pubkey),
          getSKRBalance(pubkey),
        ]);
        setSolBalance(lamports / 1e9);
        setSkrBalance(skr);
      } catch (err) {
        console.warn("Failed to fetch balances:", err);
      } finally {
        setLoadingBalances(false);
      }
    },
    [setSolBalance, setSkrBalance, setLoadingBalances],
  );

  const fetchNFTAssets = useCallback(
    async (address: string) => {
      setLoadingNFTs(true);
      try {
        const nfts = await fetchNFTs(address);
        setNFTs(nfts);
      } catch (err) {
        console.warn("Failed to fetch NFTs:", err);
      } finally {
        setLoadingNFTs(false);
      }
    },
    [setNFTs, setLoadingNFTs],
  );

  const fetchAll = useCallback(
    async (address: string) => {
      setIsLoading(true);
      await Promise.all([fetchBalances(address), fetchNFTAssets(address)]);
      setIsLoading(false);
    },
    [fetchBalances, fetchNFTAssets],
  );

  // Sync public key and fetch data when wallet becomes available
  useEffect(() => {
    setPublicKey(publicKeyStr);
    if (publicKeyStr) {
      fetchAll(publicKeyStr);
    }
  }, [publicKeyStr, setPublicKey, fetchAll]);

  const refetch = useCallback(() => {
    if (publicKeyStr) {
      return fetchAll(publicKeyStr);
    }
    return Promise.resolve();
  }, [publicKeyStr, fetchAll]);

  return { isLoading, refetch };
}
