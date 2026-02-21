import { create } from "zustand";
import { Board, GameState, Move, TurnResult, Match, Position } from "@/lib/game/types";
import { generateBoard, processTurn, resetTileIdCounter } from "@/lib/game/engine";
import { INITIAL_MOVES } from "@/lib/game/constants";

interface GameStore extends GameState {
  turnIndex: number;

  /** Points gained in the most recent move (for floating score text). */
  lastScoreGain: number;

  /** Positions of tiles matched in the most recent move (for particle effects). */
  lastMatchPositions: Position[];

  // Actions
  startGame: (seed: number) => void;
  makeMove: (move: Move) => TurnResult | null;
  setAnimating: (animating: boolean) => void;
  reset: () => void;
}

const initialState: GameState & {
  turnIndex: number;
  lastScoreGain: number;
  lastMatchPositions: Position[];
} = {
  board: [],
  score: 0,
  movesRemaining: INITIAL_MOVES,
  combo: 0,
  isAnimating: false,
  seed: 0,
  turnIndex: 0,
  lastScoreGain: 0,
  lastMatchPositions: [],
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
      lastScoreGain: 0,
      lastMatchPositions: [],
    });
  },

  makeMove: (move: Move) => {
    const { board, movesRemaining, score, seed, turnIndex } = get();
    if (movesRemaining <= 0) return null;

    const result = processTurn(board, move, turnIndex, seed);
    if (!result) return null;

    // Collect all matched positions for particle effects
    const matchPositions: Position[] = [];
    for (const m of result.matches) {
      for (const p of m.positions) {
        matchPositions.push(p);
      }
    }

    set({
      board: result.board,
      score: score + result.scoreGained,
      movesRemaining: movesRemaining - 1,
      combo: result.cascadeCount,
      turnIndex: turnIndex + 1,
      lastScoreGain: result.scoreGained,
      lastMatchPositions: matchPositions,
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
