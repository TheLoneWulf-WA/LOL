export enum TileType {
  Fire = 0,
  Water = 1,
  Earth = 2,
  Air = 3,
  Light = 4,
  Dark = 5,
}

export interface Tile {
  type: TileType;
  id: string;
}

export type Board = (Tile | null)[][];

export interface Position {
  row: number;
  col: number;
}

export interface Move {
  from: Position;
  to: Position;
}

export interface Match {
  positions: Position[];
  type: TileType;
}

export interface TurnResult {
  board: Board;
  matches: Match[];
  scoreGained: number;
  cascadeCount: number;
}

export interface GameState {
  board: Board;
  score: number;
  movesRemaining: number;
  combo: number;
  isAnimating: boolean;
  seed: number;
}

export type MatchStatus = "waiting" | "playing" | "submitted" | "settled" | "cancelled";

export interface OnChainMatch {
  id: string;
  creator: string;
  opponent: string | null;
  creatorScore: number | null;
  opponentScore: number | null;
  skrWager: number;
  boardSeed: number;
  status: MatchStatus;
  creatorNftMint: string;
  opponentNftMint: string | null;
  winner: string | null;
}
