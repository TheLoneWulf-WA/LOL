import { create } from "zustand";

interface StatsStore {
  gamesPlayed: number;
  gamesWon: number;
  totalScore: number;
  highScore: number;

  incrementGamesPlayed: () => void;
  incrementGamesWon: () => void;
  updateHighScore: (score: number) => void;
  addScore: (score: number) => void;
}

export const useStatsStore = create<StatsStore>((set) => ({
  gamesPlayed: 0,
  gamesWon: 0,
  totalScore: 0,
  highScore: 0,

  incrementGamesPlayed: () =>
    set((state) => ({ gamesPlayed: state.gamesPlayed + 1 })),

  incrementGamesWon: () =>
    set((state) => ({ gamesWon: state.gamesWon + 1 })),

  updateHighScore: (score: number) =>
    set((state) => ({
      highScore: score > state.highScore ? score : state.highScore,
    })),

  addScore: (score: number) =>
    set((state) => ({ totalScore: state.totalScore + score })),
}));
