import { create } from "zustand";
import { Board, GameState, Move, TurnResult, Match } from "@/lib/game/types";
import { generateBoard, processTurn, resetTileIdCounter } from "@/lib/game/engine";
import { INITIAL_MOVES } from "@/lib/game/constants";

interface GameStore extends GameState {
  turnIndex: number;

  // Actions
  startGame: (seed: number) => void;
  makeMove: (move: Move) => TurnResult | null;
  setAnimating: (animating: boolean) => void;
  reset: () => void;
}

const initialState: GameState & { turnIndex: number } = {
  board: [],
  score: 0,
  movesRemaining: INITIAL_MOVES,
  combo: 0,
  isAnimating: false,
  seed: 0,
  turnIndex: 0,
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState,

  startGame: (seed: number) => {
    resetTileIdCounter();
    const board = generateBoard(seed);
    set({
      board,
      score: 0,
      movesRemaining: INITIAL_MOVES,
      combo: 0,
      isAnimating: false,
      seed,
      turnIndex: 0,
    });
  },

  makeMove: (move: Move) => {
    const { board, movesRemaining, score, seed, turnIndex } = get();
    if (movesRemaining <= 0) return null;

    const result = processTurn(board, move, turnIndex, seed);
    if (!result) return null;

    set({
      board: result.board,
      score: score + result.scoreGained,
      movesRemaining: movesRemaining - 1,
      combo: result.cascadeCount,
      turnIndex: turnIndex + 1,
    });

    return result;
  },

  setAnimating: (animating: boolean) => {
    set({ isAnimating: animating });
  },

  reset: () => {
    set(initialState);
  },
}));
