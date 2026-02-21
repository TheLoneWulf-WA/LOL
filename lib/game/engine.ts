import { Board, Match, Move, Position, Tile, TileType, TurnResult } from "./types";
import { BOARD_SIZE, TILE_TYPES, POINTS_PER_TILE, CASCADE_MULTIPLIER } from "./constants";
import { createPRNG, randomInt } from "./prng";

let tileIdCounter = 0;
export function resetTileIdCounter() {
  tileIdCounter = 0;
}

function makeTile(type: TileType): Tile {
  return { type, id: `tile-${tileIdCounter++}` };
}

/**
 * Generate an initial board with no pre-existing matches.
 */
export function generateBoard(seed: number): Board {
  const rng = createPRNG(seed);
  const board: Board = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null)
  );

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      let type: TileType;
      do {
        type = randomInt(rng, TILE_TYPES) as TileType;
      } while (wouldCreateMatch(board, row, col, type));
      board[row][col] = makeTile(type);
    }
  }

  return board;
}

function wouldCreateMatch(board: Board, row: number, col: number, type: TileType): boolean {
  // Check horizontal (left 2)
  if (
    col >= 2 &&
    board[row][col - 1]?.type === type &&
    board[row][col - 2]?.type === type
  ) {
    return true;
  }
  // Check vertical (up 2)
  if (
    row >= 2 &&
    board[row - 1]?.[col]?.type === type &&
    board[row - 2]?.[col]?.type === type
  ) {
    return true;
  }
  return false;
}

/**
 * Find all matches of 3+ on the board.
 */
export function findMatches(board: Board): Match[] {
  const matched = new Set<string>();
  const matches: Match[] = [];

  // Horizontal matches
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col <= BOARD_SIZE - 3; col++) {
      const tile = board[row][col];
      if (!tile) continue;

      let len = 1;
      while (col + len < BOARD_SIZE && board[row][col + len]?.type === tile.type) {
        len++;
      }
      if (len >= 3) {
        const positions: Position[] = [];
        for (let i = 0; i < len; i++) {
          const key = `${row},${col + i}`;
          matched.add(key);
          positions.push({ row, col: col + i });
        }
        matches.push({ positions, type: tile.type });
        col += len - 1; // skip ahead
      }
    }
  }

  // Vertical matches
  for (let col = 0; col < BOARD_SIZE; col++) {
    for (let row = 0; row <= BOARD_SIZE - 3; row++) {
      const tile = board[row][col];
      if (!tile) continue;

      let len = 1;
      while (row + len < BOARD_SIZE && board[row + len]?.[col]?.type === tile.type) {
        len++;
      }
      if (len >= 3) {
        const positions: Position[] = [];
        for (let i = 0; i < len; i++) {
          const key = `${row + i},${col}`;
          if (!matched.has(key)) {
            matched.add(key);
          }
          positions.push({ row: row + i, col });
        }
        matches.push({ positions, type: tile.type });
        row += len - 1;
      }
    }
  }

  return matches;
}

/**
 * Remove matched tiles from the board (set to null).
 */
export function removeMatches(board: Board, matches: Match[]): Board {
  const newBoard = board.map((row) => [...row]);
  for (const match of matches) {
    for (const pos of match.positions) {
      newBoard[pos.row][pos.col] = null;
    }
  }
  return newBoard;
}

/**
 * Apply gravity — tiles fall down to fill gaps.
 */
export function applyGravity(board: Board): Board {
  const newBoard = board.map((row) => [...row]);

  for (let col = 0; col < BOARD_SIZE; col++) {
    let writeRow = BOARD_SIZE - 1;
    for (let row = BOARD_SIZE - 1; row >= 0; row--) {
      if (newBoard[row][col] !== null) {
        newBoard[writeRow][col] = newBoard[row][col];
        if (writeRow !== row) {
          newBoard[row][col] = null;
        }
        writeRow--;
      }
    }
    // Fill remaining top rows with null
    for (let row = writeRow; row >= 0; row--) {
      newBoard[row][col] = null;
    }
  }

  return newBoard;
}

/**
 * Fill empty (null) cells with new random tiles.
 * Uses a separate RNG seeded from the fill-step to keep determinism.
 */
export function fillBoard(board: Board, fillSeed: number): Board {
  const rng = createPRNG(fillSeed);
  const newBoard = board.map((row) => [...row]);

  for (let col = 0; col < BOARD_SIZE; col++) {
    for (let row = 0; row < BOARD_SIZE; row++) {
      if (newBoard[row][col] === null) {
        const type = randomInt(rng, TILE_TYPES) as TileType;
        newBoard[row][col] = makeTile(type);
      }
    }
  }

  return newBoard;
}

/**
 * Check if two adjacent positions form a valid swap.
 */
export function isValidSwap(from: Position, to: Position): boolean {
  const dr = Math.abs(from.row - to.row);
  const dc = Math.abs(from.col - to.col);
  return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
}

/**
 * Swap two tiles on the board.
 */
export function swapTiles(board: Board, from: Position, to: Position): Board {
  const newBoard = board.map((row) => [...row]);
  const temp = newBoard[from.row][from.col];
  newBoard[from.row][from.col] = newBoard[to.row][to.col];
  newBoard[to.row][to.col] = temp;
  return newBoard;
}

/**
 * Calculate score for a set of matches with cascade multiplier.
 */
export function calculateScore(matches: Match[], cascadeLevel: number): number {
  let totalTiles = 0;
  for (const match of matches) {
    totalTiles += match.positions.length;
  }
  const multiplier = Math.pow(CASCADE_MULTIPLIER, cascadeLevel);
  return Math.floor(totalTiles * POINTS_PER_TILE * multiplier);
}

/**
 * Process a complete turn: swap → match → remove → gravity → fill → repeat cascades.
 * Returns the final board state and total score gained.
 */
export function processTurn(
  board: Board,
  move: Move,
  turnIndex: number,
  baseSeed: number
): TurnResult | null {
  // Validate adjacency
  if (!isValidSwap(move.from, move.to)) return null;

  // Perform swap
  let currentBoard = swapTiles(board, move.from, move.to);

  // Check if swap produces any matches
  const initialMatches = findMatches(currentBoard);
  if (initialMatches.length === 0) {
    // Invalid move — no matches produced
    return null;
  }

  let totalScore = 0;
  let cascadeCount = 0;
  let allMatches: Match[] = [];

  // Cascade loop
  let matches = initialMatches;
  while (matches.length > 0) {
    allMatches = allMatches.concat(matches);
    totalScore += calculateScore(matches, cascadeCount);

    currentBoard = removeMatches(currentBoard, matches);
    currentBoard = applyGravity(currentBoard);

    // Deterministic fill seed based on base seed, turn, and cascade level
    const fillSeed = baseSeed + turnIndex * 1000 + cascadeCount;
    currentBoard = fillBoard(currentBoard, fillSeed);

    cascadeCount++;
    matches = findMatches(currentBoard);
  }

  return {
    board: currentBoard,
    matches: allMatches,
    scoreGained: totalScore,
    cascadeCount,
  };
}

/**
 * Check if any valid swap exists on the board that would produce at least one match.
 * Used for "game over" detection — if no valid moves remain, the game is over.
 */
export function hasValidMoves(board: Board): boolean {
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      // Try swap right
      if (col < BOARD_SIZE - 1) {
        const swapped = swapTiles(board, { row, col }, { row, col: col + 1 });
        if (findMatches(swapped).length > 0) return true;
      }
      // Try swap down
      if (row < BOARD_SIZE - 1) {
        const swapped = swapTiles(board, { row, col }, { row: row + 1, col });
        if (findMatches(swapped).length > 0) return true;
      }
    }
  }
  return false;
}

/**
 * Count the number of non-null tiles remaining on the board.
 */
export function countRemainingTiles(board: Board): number {
  let count = 0;
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board[row][col] !== null) {
        count++;
      }
    }
  }
  return count;
}
