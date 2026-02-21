import { useEffect, useCallback, useRef, useState } from "react";

import { fetchOpenMatches, fetchMyMatches } from "@/lib/anchor/discovery";
import { useMatchStore } from "@/stores/matchStore";
import { useWalletStore } from "@/stores/walletStore";

const POLL_INTERVAL_MS = 10_000;

/**
 * Custom hook that discovers on-chain matches and keeps the matchStore
 * up to date by polling every 10 seconds.
 *
 * Returns `{ isLoading, refresh }` for manual refresh support.
 */
export function useMatchDiscovery() {
  const publicKey = useWalletStore((s) => s.publicKey);
  const setLobbyMatches = useMatchStore((s) => s.setLobbyMatches);
  const setMyMatches = useMatchStore((s) => s.setMyMatches);
  const setLoading = useMatchStore((s) => s.setLoading);

  const [isLoading, setIsLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMatches = useCallback(async () => {
    setIsLoading(true);
    setLoading(true);
    try {
      // Fetch open matches (for the lobby) always
      const open = await fetchOpenMatches();
      setLobbyMatches(open);

      // Fetch player-specific matches if wallet is connected
      if (publicKey) {
        const mine = await fetchMyMatches(publicKey);
        setMyMatches(mine);
      } else {
        setMyMatches([]);
      }
    } catch (err) {
      console.warn("Failed to fetch matches:", err);
    } finally {
      setIsLoading(false);
      setLoading(false);
    }
  }, [publicKey, setLobbyMatches, setMyMatches, setLoading]);

  // Fetch on mount and whenever the player pubkey changes
  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  // Poll every 10 seconds
  useEffect(() => {
    intervalRef.current = setInterval(fetchMatches, POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchMatches]);

  const refresh = useCallback(() => {
    return fetchMatches();
  }, [fetchMatches]);

  return { isLoading, refresh };
}
