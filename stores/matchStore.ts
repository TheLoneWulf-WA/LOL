import { create } from "zustand";
import { OnChainMatch, MatchStatus } from "@/lib/game/types";

interface MatchStore {
  // Current match
  currentMatch: OnChainMatch | null;
  // Lobby matches (available to join)
  lobbyMatches: OnChainMatch[];
  // My matches (created or joined)
  myMatches: OnChainMatch[];
  // Loading states
  isLoading: boolean;
  isCreating: boolean;
  isJoining: boolean;
  isSubmitting: boolean;

  // Actions
  setCurrentMatch: (match: OnChainMatch | null) => void;
  setLobbyMatches: (matches: OnChainMatch[]) => void;
  setMyMatches: (matches: OnChainMatch[]) => void;
  setLoading: (loading: boolean) => void;
  setCreating: (creating: boolean) => void;
  setJoining: (joining: boolean) => void;
  setSubmitting: (submitting: boolean) => void;
  updateMatchStatus: (matchId: string, status: MatchStatus) => void;
  reset: () => void;
}

export const useMatchStore = create<MatchStore>((set, get) => ({
  currentMatch: null,
  lobbyMatches: [],
  myMatches: [],
  isLoading: false,
  isCreating: false,
  isJoining: false,
  isSubmitting: false,

  setCurrentMatch: (match) => set({ currentMatch: match }),
  setLobbyMatches: (matches) => set({ lobbyMatches: matches }),
  setMyMatches: (matches) => set({ myMatches: matches }),
  setLoading: (loading) => set({ isLoading: loading }),
  setCreating: (creating) => set({ isCreating: creating }),
  setJoining: (joining) => set({ isJoining: joining }),
  setSubmitting: (submitting) => set({ isSubmitting: submitting }),

  updateMatchStatus: (matchId, status) => {
    const { currentMatch } = get();
    if (currentMatch?.id === matchId) {
      set({ currentMatch: { ...currentMatch, status } });
    }
  },

  reset: () =>
    set({
      currentMatch: null,
      lobbyMatches: [],
      myMatches: [],
      isLoading: false,
      isCreating: false,
      isJoining: false,
      isSubmitting: false,
    }),
}));
