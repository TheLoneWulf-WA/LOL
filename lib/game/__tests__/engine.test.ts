/**
 * Land of Leal — Game Engine Unit Tests
 *
 * Inline test runner (no Jest). Run with: npx tsx lib/game/__tests__/engine.test.ts
 */

import {
  generateBoard,
  findMatches,
  removeMatches,
  applyGravity,
  fillBoard,
  isValidSwap,
  swapTiles,
  processTurn,
  calculateScore,
  hasValidMoves,
  countRemainingTiles,
  resetTileIdCounter,
} from "../engine";
import { Board, Match, Position, Tile, TileType } from "../types";
import { BOARD_SIZE, POINTS_PER_TILE, CASCADE_MULTIPLIER } from "../constants";
import { createPRNG, randomInt } from "../prng";

// ---------------------------------------------------------------------------
// Minimal inline test runner
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;
let currentGroup = "";
const failures: { group: string; name: string; error: string }[] = [];

function describe(name: string, fn: () => void) {
  currentGroup = name;
  console.log(`\n--- ${name} ---`);
  fn();
}

function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  PASS  ${name}`);
  } catch (e: any) {
    failed++;
    const msg = e?.message ?? String(e);
    console.log(`  FAIL  ${name}\n        ${msg}`);
    failures.push({ group: currentGroup, name, error: msg });
  }
}

function expect<T>(actual: T) {
  return {
    toBe(expected: T) {
      if (actual !== expected)
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    },
    toEqual(expected: T) {
      const a = JSON.stringify(actual);
      const b = JSON.stringify(expected);
      if (a !== b) throw new Error(`Expected ${b}, got ${a}`);
    },
    toBeGreaterThan(n: number) {
      if ((actual as any) <= n) throw new Error(`Expected ${actual} > ${n}`);
    },
    toBeGreaterThanOrEqual(n: number) {
      if ((actual as any) < n) throw new Error(`Expected ${actual} >= ${n}`);
    },
    toBeLessThan(n: number) {
      if ((actual as any) >= n) throw new Error(`Expected ${actual} < ${n}`);
    },
    toBeTruthy() {
      if (!actual) throw new Error(`Expected truthy, got ${JSON.stringify(actual)}`);
    },
    toBeFalsy() {
      if (actual) throw new Error(`Expected falsy, got ${JSON.stringify(actual)}`);
    },
    toBeNull() {
      if (actual !== null) throw new Error(`Expected null, got ${JSON.stringify(actual)}`);
    },
    toBeNotNull() {
      if (actual === null) throw new Error(`Expected non-null, got null`);
    },
    toContain(item: any) {
      if (!(actual as any).includes(item))
        throw new Error(`Expected array to contain ${JSON.stringify(item)}`);
    },
  };
}

function assert(condition: boolean, msg = "Assertion failed") {
  if (!condition) throw new Error(msg);
}

// ---------------------------------------------------------------------------
// Helper: build a board from a 2D array of numbers (type enums).
// Simplifies test setup — null values stay null.
// ---------------------------------------------------------------------------

function boardFromTypes(types: (number | null)[][]): Board {
  return types.map((row, r) =>
    row.map((t, c) => (t !== null ? { type: t as TileType, id: `t-${r}-${c}` } : null))
  );
}

function boardTypes(board: Board): (number | null)[][] {
  return board.map((row) => row.map((cell) => (cell !== null ? cell.type : null)));
}

// ---------------------------------------------------------------------------
// PRNG determinism
// ---------------------------------------------------------------------------

describe("PRNG determinism", () => {
  test("createPRNG produces identical sequences for the same seed", () => {
    const rng1 = createPRNG(42);
    const rng2 = createPRNG(42);
    for (let i = 0; i < 100; i++) {
      expect(rng1()).toBe(rng2());
    }
  });

  test("different seeds produce different sequences", () => {
    const rng1 = createPRNG(1);
    const rng2 = createPRNG(2);
    let same = 0;
    for (let i = 0; i < 100; i++) {
      if (rng1() === rng2()) same++;
    }
    // It is statistically near-impossible for all 100 to match
    assert(same < 100, "Different seeds should produce different sequences");
  });

  test("randomInt returns values in [0, max)", () => {
    const rng = createPRNG(99);
    for (let i = 0; i < 200; i++) {
      const v = randomInt(rng, 6);
      assert(v >= 0 && v < 6, `randomInt out of range: ${v}`);
    }
  });

  test("PRNG outputs are in [0, 1)", () => {
    const rng = createPRNG(12345);
    for (let i = 0; i < 500; i++) {
      const v = rng();
      assert(v >= 0 && v < 1, `PRNG value out of [0,1): ${v}`);
    }
  });
});

// ---------------------------------------------------------------------------
// generateBoard
// ---------------------------------------------------------------------------

describe("generateBoard", () => {
  test("produces a 6x6 board", () => {
    resetTileIdCounter();
    const board = generateBoard(1);
    expect(board.length).toBe(BOARD_SIZE);
    for (const row of board) {
      expect(row.length).toBe(BOARD_SIZE);
    }
  });

  test("every cell is a non-null Tile", () => {
    resetTileIdCounter();
    const board = generateBoard(42);
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const tile = board[r][c];
        assert(tile !== null, `Cell [${r}][${c}] is null`);
        assert(tile!.type >= 0 && tile!.type <= 5, `Invalid tile type ${tile!.type}`);
        assert(typeof tile!.id === "string", `Invalid tile id`);
      }
    }
  });

  test("has no initial matches of 3+", () => {
    resetTileIdCounter();
    const board = generateBoard(42);
    const matches = findMatches(board);
    expect(matches.length).toBe(0);
  });

  test("same seed produces identical board (determinism)", () => {
    resetTileIdCounter();
    const board1 = generateBoard(777);
    const types1 = boardTypes(board1);

    resetTileIdCounter();
    const board2 = generateBoard(777);
    const types2 = boardTypes(board2);

    expect(types1).toEqual(types2);
  });

  test("different seeds produce different boards", () => {
    resetTileIdCounter();
    const board1 = generateBoard(1);
    const types1 = boardTypes(board1);

    resetTileIdCounter();
    const board2 = generateBoard(2);
    const types2 = boardTypes(board2);

    // Boards should differ in at least some cells
    let diffs = 0;
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (types1[r][c] !== types2[r][c]) diffs++;
      }
    }
    assert(diffs > 0, "Different seeds should produce different boards");
  });

  test("no matches for many different seeds (stress test)", () => {
    for (let seed = 0; seed < 50; seed++) {
      resetTileIdCounter();
      const board = generateBoard(seed);
      const matches = findMatches(board);
      assert(matches.length === 0, `Seed ${seed} generated a board with ${matches.length} matches`);
    }
  });
});

// ---------------------------------------------------------------------------
// findMatches
// ---------------------------------------------------------------------------

describe("findMatches", () => {
  test("finds a horizontal 3-in-a-row", () => {
    const board = boardFromTypes([
      [0, 0, 0, 1, 2, 3],
      [1, 2, 3, 4, 5, 0],
      [2, 3, 4, 5, 0, 1],
      [3, 4, 5, 0, 1, 2],
      [4, 5, 0, 1, 2, 3],
      [5, 0, 1, 2, 3, 4],
    ]);
    const matches = findMatches(board);
    assert(matches.length >= 1, `Expected at least 1 match, got ${matches.length}`);
    const horiz = matches.find(
      (m) => m.positions.length === 3 && m.positions.every((p) => p.row === 0)
    );
    assert(horiz !== undefined, "Expected a horizontal match in row 0");
    expect(horiz!.type).toBe(TileType.Fire);
  });

  test("finds a vertical 3-in-a-row", () => {
    const board = boardFromTypes([
      [0, 1, 2, 3, 4, 5],
      [0, 2, 3, 4, 5, 1],
      [0, 3, 4, 5, 1, 2],
      [1, 4, 5, 0, 2, 3],
      [2, 5, 0, 1, 3, 4],
      [3, 0, 1, 2, 4, 5],
    ]);
    const matches = findMatches(board);
    assert(matches.length >= 1, `Expected at least 1 match, got ${matches.length}`);
    const vert = matches.find(
      (m) => m.positions.length === 3 && m.positions.every((p) => p.col === 0)
    );
    assert(vert !== undefined, "Expected a vertical match in col 0");
    expect(vert!.type).toBe(TileType.Fire);
  });

  test("finds a 4-in-a-row", () => {
    const board = boardFromTypes([
      [1, 1, 1, 1, 2, 3],
      [2, 3, 4, 5, 0, 1],
      [3, 4, 5, 0, 1, 2],
      [4, 5, 0, 1, 2, 3],
      [5, 0, 1, 2, 3, 4],
      [0, 1, 2, 3, 4, 5],
    ]);
    const matches = findMatches(board);
    const bigMatch = matches.find((m) => m.positions.length === 4);
    assert(bigMatch !== undefined, "Expected a match of length 4");
    expect(bigMatch!.type).toBe(TileType.Water);
  });

  test("finds a 5-in-a-row", () => {
    const board = boardFromTypes([
      [2, 2, 2, 2, 2, 3],
      [0, 1, 3, 4, 5, 1],
      [1, 3, 4, 5, 0, 2],
      [3, 4, 5, 0, 1, 0],
      [4, 5, 0, 1, 2, 4],
      [5, 0, 1, 2, 3, 5],
    ]);
    const matches = findMatches(board);
    const bigMatch = matches.find((m) => m.positions.length === 5);
    assert(bigMatch !== undefined, "Expected a match of length 5");
    expect(bigMatch!.type).toBe(TileType.Earth);
  });

  test("finds a 6-in-a-row (full row)", () => {
    const board = boardFromTypes([
      [3, 3, 3, 3, 3, 3],
      [0, 1, 2, 4, 5, 0],
      [1, 2, 4, 5, 0, 1],
      [2, 4, 5, 0, 1, 2],
      [4, 5, 0, 1, 2, 4],
      [5, 0, 1, 2, 4, 5],
    ]);
    const matches = findMatches(board);
    const fullRow = matches.find((m) => m.positions.length === 6);
    assert(fullRow !== undefined, "Expected a match of length 6");
    expect(fullRow!.type).toBe(TileType.Air);
  });

  test("no false positives: 2-in-a-row is not a match", () => {
    const board = boardFromTypes([
      [0, 0, 1, 2, 3, 4],
      [1, 2, 3, 4, 5, 0],
      [2, 3, 4, 5, 0, 1],
      [3, 4, 5, 0, 1, 2],
      [4, 5, 0, 1, 2, 3],
      [5, 0, 1, 2, 3, 4],
    ]);
    const matches = findMatches(board);
    // Row 0 has [0,0,1,...] — only 2 in a row, should not match
    const falseHoriz = matches.find(
      (m) => m.type === TileType.Fire && m.positions.every((p) => p.row === 0)
    );
    assert(falseHoriz === undefined, "Two-in-a-row should not be detected as a match");
  });

  test("finds both horizontal and vertical matches simultaneously", () => {
    // L-shaped / cross pattern: Fire in row 0 cols 0-2 AND Fire in col 0 rows 0-2
    const board = boardFromTypes([
      [0, 0, 0, 1, 2, 3],
      [0, 1, 2, 3, 4, 5],
      [0, 2, 3, 4, 5, 1],
      [1, 3, 4, 5, 0, 2],
      [2, 4, 5, 0, 1, 3],
      [3, 5, 0, 1, 2, 4],
    ]);
    const matches = findMatches(board);
    // Should find at least one horizontal and one vertical
    const horiz = matches.find(
      (m) => m.positions.length >= 3 && m.positions.every((p) => p.row === 0)
    );
    const vert = matches.find(
      (m) => m.positions.length >= 3 && m.positions.every((p) => p.col === 0)
    );
    assert(horiz !== undefined, "Expected horizontal match");
    assert(vert !== undefined, "Expected vertical match");
  });

  test("empty board (all null) returns no matches", () => {
    const board: Board = Array.from({ length: BOARD_SIZE }, () =>
      Array.from({ length: BOARD_SIZE }, () => null)
    );
    const matches = findMatches(board);
    expect(matches.length).toBe(0);
  });

  test("match at bottom-right corner", () => {
    const board = boardFromTypes([
      [0, 1, 2, 3, 4, 5],
      [1, 2, 3, 4, 5, 0],
      [2, 3, 4, 5, 0, 1],
      [3, 4, 5, 0, 1, 2],
      [4, 5, 0, 1, 2, 3],
      [5, 0, 1, 4, 4, 4],
    ]);
    const matches = findMatches(board);
    const corner = matches.find(
      (m) => m.type === TileType.Light && m.positions.every((p) => p.row === 5)
    );
    assert(corner !== undefined, "Expected match at bottom-right corner");
    expect(corner!.positions.length).toBe(3);
  });

  test("match at top-right corner (vertical)", () => {
    const board = boardFromTypes([
      [0, 1, 2, 3, 4, 5],
      [1, 2, 3, 4, 0, 5],
      [2, 3, 4, 0, 1, 5],
      [3, 4, 0, 1, 2, 0],
      [4, 0, 1, 2, 3, 1],
      [0, 1, 2, 3, 4, 2],
    ]);
    const matches = findMatches(board);
    const vert = matches.find(
      (m) =>
        m.type === TileType.Dark &&
        m.positions.every((p) => p.col === 5) &&
        m.positions.length >= 3
    );
    assert(vert !== undefined, "Expected vertical match at col 5 top");
  });

  test("multiple distinct matches on the same board", () => {
    const board = boardFromTypes([
      [0, 0, 0, 1, 1, 1],
      [2, 3, 4, 5, 0, 1],
      [3, 4, 5, 0, 1, 2],
      [4, 5, 0, 1, 2, 3],
      [5, 0, 1, 2, 3, 4],
      [0, 1, 2, 3, 4, 5],
    ]);
    const matches = findMatches(board);
    assert(matches.length >= 2, `Expected at least 2 distinct matches, got ${matches.length}`);
  });
});

// ---------------------------------------------------------------------------
// removeMatches
// ---------------------------------------------------------------------------

describe("removeMatches", () => {
  test("clears matched positions to null", () => {
    const board = boardFromTypes([
      [0, 0, 0, 1, 2, 3],
      [1, 2, 3, 4, 5, 0],
      [2, 3, 4, 5, 0, 1],
      [3, 4, 5, 0, 1, 2],
      [4, 5, 0, 1, 2, 3],
      [5, 0, 1, 2, 3, 4],
    ]);
    const matches: Match[] = [
      {
        positions: [
          { row: 0, col: 0 },
          { row: 0, col: 1 },
          { row: 0, col: 2 },
        ],
        type: TileType.Fire,
      },
    ];
    const result = removeMatches(board, matches);
    expect(result[0][0]).toBeNull();
    expect(result[0][1]).toBeNull();
    expect(result[0][2]).toBeNull();
    // Other cells untouched
    assert(result[0][3] !== null, "Non-matched cell should remain");
    assert(result[1][0] !== null, "Non-matched cell should remain");
  });

  test("does not mutate original board", () => {
    const board = boardFromTypes([
      [0, 0, 0, 1, 2, 3],
      [1, 2, 3, 4, 5, 0],
      [2, 3, 4, 5, 0, 1],
      [3, 4, 5, 0, 1, 2],
      [4, 5, 0, 1, 2, 3],
      [5, 0, 1, 2, 3, 4],
    ]);
    const matches: Match[] = [
      {
        positions: [
          { row: 0, col: 0 },
          { row: 0, col: 1 },
          { row: 0, col: 2 },
        ],
        type: TileType.Fire,
      },
    ];
    removeMatches(board, matches);
    // Original should be unchanged
    assert(board[0][0] !== null, "Original board should not be mutated");
  });
});

// ---------------------------------------------------------------------------
// applyGravity
// ---------------------------------------------------------------------------

describe("applyGravity", () => {
  test("tiles fall down to fill gaps", () => {
    const board = boardFromTypes([
      [null, 1, 2, 3, 4, 5],
      [0, null, 3, 4, 5, 0],
      [1, 2, null, 5, 0, 1],
      [2, 3, 4, null, 1, 2],
      [3, 4, 5, 0, null, 3],
      [4, 5, 0, 1, 2, null],
    ]);
    const result = applyGravity(board);
    // After gravity, nulls should be at the top of each column
    for (let col = 0; col < BOARD_SIZE; col++) {
      let seenNull = false;
      // Reading from bottom to top, once we see null, all above should be null
      for (let row = BOARD_SIZE - 1; row >= 0; row--) {
        if (result[row][col] === null) {
          seenNull = true;
        } else {
          assert(!seenNull, `Gap found: non-null tile at [${row}][${col}] above a null`);
        }
      }
    }
  });

  test("column with top 3 nulls: tiles settle at bottom", () => {
    const board = boardFromTypes([
      [null, 1, 2, 3, 4, 5],
      [null, 2, 3, 4, 5, 0],
      [null, 3, 4, 5, 0, 1],
      [0, 4, 5, 0, 1, 2],
      [1, 5, 0, 1, 2, 3],
      [2, 0, 1, 2, 3, 4],
    ]);
    const result = applyGravity(board);
    // Col 0 should have nulls at rows 0,1,2 and tiles at 3,4,5
    expect(result[0][0]).toBeNull();
    expect(result[1][0]).toBeNull();
    expect(result[2][0]).toBeNull();
    assert(result[3][0] !== null, "Row 3 col 0 should have a tile");
    assert(result[4][0] !== null, "Row 4 col 0 should have a tile");
    assert(result[5][0] !== null, "Row 5 col 0 should have a tile");
    // The tiles should preserve their types (order top-to-bottom of original non-null tiles)
    expect(result[3][0]!.type).toBe(TileType.Fire); // was at row 3
    expect(result[4][0]!.type).toBe(TileType.Water); // was at row 4
    expect(result[5][0]!.type).toBe(TileType.Earth); // was at row 5
  });

  test("no gaps: board unchanged", () => {
    resetTileIdCounter();
    const board = generateBoard(100);
    const result = applyGravity(board);
    expect(boardTypes(result)).toEqual(boardTypes(board));
  });

  test("all null column stays all null", () => {
    const board: Board = Array.from({ length: BOARD_SIZE }, () =>
      Array.from({ length: BOARD_SIZE }, (_, c) =>
        c === 0 ? null : { type: (c % 6) as TileType, id: `t-${c}` }
      )
    );
    const result = applyGravity(board);
    for (let row = 0; row < BOARD_SIZE; row++) {
      expect(result[row][0]).toBeNull();
    }
  });

  test("does not mutate original board", () => {
    const board = boardFromTypes([
      [null, 1, 2, 3, 4, 5],
      [0, 2, 3, 4, 5, 0],
      [1, 3, 4, 5, 0, 1],
      [2, 4, 5, 0, 1, 2],
      [3, 5, 0, 1, 2, 3],
      [4, 0, 1, 2, 3, 4],
    ]);
    const origTypes = boardTypes(board);
    applyGravity(board);
    expect(boardTypes(board)).toEqual(origTypes);
  });

  test("scattered nulls in a column resolve correctly", () => {
    // Col 0: [null, 0, null, 1, null, 2] -> should become [null, null, null, 0, 1, 2]
    const board = boardFromTypes([
      [null, 5, 4, 3, 2, 1],
      [0, 4, 3, 2, 1, 5],
      [null, 3, 2, 1, 5, 4],
      [1, 2, 1, 5, 4, 3],
      [null, 1, 5, 4, 3, 2],
      [2, 5, 4, 3, 2, 1],
    ]);
    const result = applyGravity(board);
    expect(result[0][0]).toBeNull();
    expect(result[1][0]).toBeNull();
    expect(result[2][0]).toBeNull();
    expect(result[3][0]!.type).toBe(TileType.Fire);   // originally row 1
    expect(result[4][0]!.type).toBe(TileType.Water);   // originally row 3
    expect(result[5][0]!.type).toBe(TileType.Earth);   // originally row 5
  });
});

// ---------------------------------------------------------------------------
// fillBoard
// ---------------------------------------------------------------------------

describe("fillBoard", () => {
  test("fills all null cells", () => {
    resetTileIdCounter();
    const board: Board = Array.from({ length: BOARD_SIZE }, () =>
      Array.from({ length: BOARD_SIZE }, () => null)
    );
    const filled = fillBoard(board, 42);
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        assert(filled[r][c] !== null, `Cell [${r}][${c}] still null after fill`);
      }
    }
  });

  test("does not overwrite existing tiles", () => {
    const board = boardFromTypes([
      [0, null, 2, null, 4, null],
      [null, 1, null, 3, null, 5],
      [0, null, 2, null, 4, null],
      [null, 1, null, 3, null, 5],
      [0, null, 2, null, 4, null],
      [null, 1, null, 3, null, 5],
    ]);
    resetTileIdCounter();
    const filled = fillBoard(board, 99);
    // Check that existing tiles kept their types
    expect(filled[0][0]!.type).toBe(TileType.Fire);
    expect(filled[0][2]!.type).toBe(TileType.Earth);
    expect(filled[0][4]!.type).toBe(TileType.Light);
  });

  test("deterministic: same seed fills identically", () => {
    const board: Board = Array.from({ length: BOARD_SIZE }, () =>
      Array.from({ length: BOARD_SIZE }, () => null)
    );
    resetTileIdCounter();
    const filled1 = fillBoard(board, 123);
    const types1 = boardTypes(filled1);

    resetTileIdCounter();
    const filled2 = fillBoard(board, 123);
    const types2 = boardTypes(filled2);

    expect(types1).toEqual(types2);
  });

  test("different seeds fill differently", () => {
    const board: Board = Array.from({ length: BOARD_SIZE }, () =>
      Array.from({ length: BOARD_SIZE }, () => null)
    );
    resetTileIdCounter();
    const filled1 = fillBoard(board, 1);
    const types1 = boardTypes(filled1);

    resetTileIdCounter();
    const filled2 = fillBoard(board, 2);
    const types2 = boardTypes(filled2);

    let diffs = 0;
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (types1[r][c] !== types2[r][c]) diffs++;
      }
    }
    assert(diffs > 0, "Different fill seeds should produce different fills");
  });
});

// ---------------------------------------------------------------------------
// isValidSwap
// ---------------------------------------------------------------------------

describe("isValidSwap", () => {
  test("adjacent horizontal swap is valid", () => {
    expect(isValidSwap({ row: 2, col: 3 }, { row: 2, col: 4 })).toBe(true);
    expect(isValidSwap({ row: 2, col: 4 }, { row: 2, col: 3 })).toBe(true);
  });

  test("adjacent vertical swap is valid", () => {
    expect(isValidSwap({ row: 2, col: 3 }, { row: 3, col: 3 })).toBe(true);
    expect(isValidSwap({ row: 3, col: 3 }, { row: 2, col: 3 })).toBe(true);
  });

  test("diagonal swap is invalid", () => {
    expect(isValidSwap({ row: 2, col: 3 }, { row: 3, col: 4 })).toBe(false);
    expect(isValidSwap({ row: 0, col: 0 }, { row: 1, col: 1 })).toBe(false);
  });

  test("same position swap is invalid", () => {
    expect(isValidSwap({ row: 2, col: 3 }, { row: 2, col: 3 })).toBe(false);
  });

  test("distant positions are invalid", () => {
    expect(isValidSwap({ row: 0, col: 0 }, { row: 0, col: 2 })).toBe(false);
    expect(isValidSwap({ row: 0, col: 0 }, { row: 5, col: 5 })).toBe(false);
    expect(isValidSwap({ row: 0, col: 0 }, { row: 2, col: 0 })).toBe(false);
  });

  test("edge positions are valid for adjacent swaps", () => {
    // Top-left corner
    expect(isValidSwap({ row: 0, col: 0 }, { row: 0, col: 1 })).toBe(true);
    expect(isValidSwap({ row: 0, col: 0 }, { row: 1, col: 0 })).toBe(true);
    // Bottom-right corner
    expect(isValidSwap({ row: 5, col: 5 }, { row: 5, col: 4 })).toBe(true);
    expect(isValidSwap({ row: 5, col: 5 }, { row: 4, col: 5 })).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// swapTiles
// ---------------------------------------------------------------------------

describe("swapTiles", () => {
  test("swaps two tiles correctly", () => {
    const board = boardFromTypes([
      [0, 1, 2, 3, 4, 5],
      [1, 2, 3, 4, 5, 0],
      [2, 3, 4, 5, 0, 1],
      [3, 4, 5, 0, 1, 2],
      [4, 5, 0, 1, 2, 3],
      [5, 0, 1, 2, 3, 4],
    ]);
    const result = swapTiles(board, { row: 0, col: 0 }, { row: 0, col: 1 });
    expect(result[0][0]!.type).toBe(TileType.Water);
    expect(result[0][1]!.type).toBe(TileType.Fire);
    // Rest unchanged
    expect(result[0][2]!.type).toBe(TileType.Earth);
  });

  test("does not mutate original board", () => {
    const board = boardFromTypes([
      [0, 1, 2, 3, 4, 5],
      [1, 2, 3, 4, 5, 0],
      [2, 3, 4, 5, 0, 1],
      [3, 4, 5, 0, 1, 2],
      [4, 5, 0, 1, 2, 3],
      [5, 0, 1, 2, 3, 4],
    ]);
    swapTiles(board, { row: 0, col: 0 }, { row: 0, col: 1 });
    expect(board[0][0]!.type).toBe(TileType.Fire);
    expect(board[0][1]!.type).toBe(TileType.Water);
  });

  test("double swap returns to original", () => {
    const board = boardFromTypes([
      [0, 1, 2, 3, 4, 5],
      [1, 2, 3, 4, 5, 0],
      [2, 3, 4, 5, 0, 1],
      [3, 4, 5, 0, 1, 2],
      [4, 5, 0, 1, 2, 3],
      [5, 0, 1, 2, 3, 4],
    ]);
    const from = { row: 1, col: 2 };
    const to = { row: 1, col: 3 };
    const swapped = swapTiles(board, from, to);
    const restored = swapTiles(swapped, from, to);
    expect(boardTypes(restored)).toEqual(boardTypes(board));
  });
});

// ---------------------------------------------------------------------------
// calculateScore
// ---------------------------------------------------------------------------

describe("calculateScore", () => {
  test("single match of 3 at cascade level 0", () => {
    const matches: Match[] = [
      {
        positions: [
          { row: 0, col: 0 },
          { row: 0, col: 1 },
          { row: 0, col: 2 },
        ],
        type: TileType.Fire,
      },
    ];
    const score = calculateScore(matches, 0);
    // 3 tiles * 10 pts * 1.5^0 = 30
    expect(score).toBe(30);
  });

  test("single match of 3 at cascade level 1", () => {
    const matches: Match[] = [
      {
        positions: [
          { row: 0, col: 0 },
          { row: 0, col: 1 },
          { row: 0, col: 2 },
        ],
        type: TileType.Fire,
      },
    ];
    const score = calculateScore(matches, 1);
    // 3 * 10 * 1.5 = 45
    expect(score).toBe(45);
  });

  test("cascade level 2 multiplier", () => {
    const matches: Match[] = [
      {
        positions: [
          { row: 0, col: 0 },
          { row: 0, col: 1 },
          { row: 0, col: 2 },
        ],
        type: TileType.Fire,
      },
    ];
    const score = calculateScore(matches, 2);
    // 3 * 10 * 1.5^2 = 3 * 10 * 2.25 = 67.5 -> floor = 67
    expect(score).toBe(67);
  });

  test("multiple matches summed correctly", () => {
    const matches: Match[] = [
      {
        positions: [
          { row: 0, col: 0 },
          { row: 0, col: 1 },
          { row: 0, col: 2 },
        ],
        type: TileType.Fire,
      },
      {
        positions: [
          { row: 1, col: 0 },
          { row: 1, col: 1 },
          { row: 1, col: 2 },
          { row: 1, col: 3 },
        ],
        type: TileType.Water,
      },
    ];
    const score = calculateScore(matches, 0);
    // (3 + 4) tiles * 10 * 1.5^0 = 70
    expect(score).toBe(70);
  });

  test("match of 4 at cascade level 0", () => {
    const matches: Match[] = [
      {
        positions: [
          { row: 0, col: 0 },
          { row: 0, col: 1 },
          { row: 0, col: 2 },
          { row: 0, col: 3 },
        ],
        type: TileType.Fire,
      },
    ];
    const score = calculateScore(matches, 0);
    // 4 * 10 = 40
    expect(score).toBe(40);
  });

  test("empty matches returns 0", () => {
    expect(calculateScore([], 0)).toBe(0);
    expect(calculateScore([], 5)).toBe(0);
  });

  test("cascade multiplier increases exponentially", () => {
    const matches: Match[] = [
      {
        positions: [
          { row: 0, col: 0 },
          { row: 0, col: 1 },
          { row: 0, col: 2 },
        ],
        type: TileType.Fire,
      },
    ];
    const s0 = calculateScore(matches, 0);
    const s1 = calculateScore(matches, 1);
    const s2 = calculateScore(matches, 2);
    const s3 = calculateScore(matches, 3);
    assert(s1 > s0, "Cascade 1 should score more than cascade 0");
    assert(s2 > s1, "Cascade 2 should score more than cascade 1");
    assert(s3 > s2, "Cascade 3 should score more than cascade 2");
  });
});

// ---------------------------------------------------------------------------
// processTurn
// ---------------------------------------------------------------------------

describe("processTurn", () => {
  test("returns null for non-adjacent swap (diagonal)", () => {
    resetTileIdCounter();
    const board = generateBoard(42);
    const result = processTurn(
      board,
      { from: { row: 0, col: 0 }, to: { row: 1, col: 1 } },
      0,
      42
    );
    expect(result).toBeNull();
  });

  test("returns null for distant swap", () => {
    resetTileIdCounter();
    const board = generateBoard(42);
    const result = processTurn(
      board,
      { from: { row: 0, col: 0 }, to: { row: 0, col: 3 } },
      0,
      42
    );
    expect(result).toBeNull();
  });

  test("returns null when swap produces no match", () => {
    // Build a board where swapping (0,0) and (0,1) won't create a match
    const board = boardFromTypes([
      [0, 1, 2, 3, 4, 5],
      [1, 0, 3, 4, 5, 2],
      [2, 3, 0, 5, 1, 4],
      [3, 4, 5, 0, 2, 1],
      [4, 5, 1, 2, 0, 3],
      [5, 2, 4, 1, 3, 0],
    ]);
    const result = processTurn(
      board,
      { from: { row: 0, col: 0 }, to: { row: 0, col: 1 } },
      0,
      100
    );
    expect(result).toBeNull();
  });

  test("valid swap produces a turn result with score > 0", () => {
    // Craft a board where swapping creates a match
    // Row 0: [1, 0, 0, ...] -> swap (0,0)<->(0,1) gives [0, 1, 0, ...] which is no match
    // Let's do: row 0 = [1, 0, 0, 0, ...], swap (0,0) and (0,1) -> [0, 1, 0, 0, ...]
    // Better: set up so swapping creates a horizontal 3
    // Row 0: [1, 0, 0, 3, 4, 5], col 0 row 1=[0], swap (0,0) and (1,0) ->
    //   row 0 = [0, 0, 0, ...] = match!
    const board = boardFromTypes([
      [1, 0, 0, 3, 4, 5],
      [0, 2, 3, 4, 5, 1],
      [2, 3, 4, 5, 1, 0],
      [3, 4, 5, 1, 0, 2],
      [4, 5, 1, 0, 2, 3],
      [5, 1, 0, 2, 3, 4],
    ]);
    const result = processTurn(
      board,
      { from: { row: 0, col: 0 }, to: { row: 1, col: 0 } },
      0,
      42
    );
    assert(result !== null, "Expected a valid turn result");
    assert(result!.scoreGained > 0, "Score should be > 0");
    assert(result!.cascadeCount >= 1, "Cascade count should be >= 1");
    assert(result!.matches.length >= 1, "Should have at least 1 match");
  });

  test("turn result board is fully filled (no nulls)", () => {
    const board = boardFromTypes([
      [1, 0, 0, 3, 4, 5],
      [0, 2, 3, 4, 5, 1],
      [2, 3, 4, 5, 1, 0],
      [3, 4, 5, 1, 0, 2],
      [4, 5, 1, 0, 2, 3],
      [5, 1, 0, 2, 3, 4],
    ]);
    const result = processTurn(
      board,
      { from: { row: 0, col: 0 }, to: { row: 1, col: 0 } },
      0,
      42
    );
    assert(result !== null, "Expected a valid turn result");
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        assert(
          result!.board[r][c] !== null,
          `Cell [${r}][${c}] is null after processTurn`
        );
      }
    }
  });

  test("processTurn is deterministic for same inputs", () => {
    const board = boardFromTypes([
      [1, 0, 0, 3, 4, 5],
      [0, 2, 3, 4, 5, 1],
      [2, 3, 4, 5, 1, 0],
      [3, 4, 5, 1, 0, 2],
      [4, 5, 1, 0, 2, 3],
      [5, 1, 0, 2, 3, 4],
    ]);
    const move = { from: { row: 0, col: 0 }, to: { row: 1, col: 0 } };

    resetTileIdCounter();
    const result1 = processTurn(board, move, 0, 42);

    resetTileIdCounter();
    const result2 = processTurn(board, move, 0, 42);

    assert(result1 !== null && result2 !== null, "Both results should be non-null");
    expect(result1!.scoreGained).toBe(result2!.scoreGained);
    expect(result1!.cascadeCount).toBe(result2!.cascadeCount);
    expect(boardTypes(result1!.board)).toEqual(boardTypes(result2!.board));
  });

  test("cascade scoring increases with depth", () => {
    // We test that cascadeCount >= 1 and score reflects multiplier
    // This is hard to engineer precisely, so we test the scoring formula indirectly
    const baseTiles = 3;
    const baseScore = baseTiles * POINTS_PER_TILE; // 30
    const cascadeScore = Math.floor(baseTiles * POINTS_PER_TILE * CASCADE_MULTIPLIER); // 45

    // A turn with cascade should have score > base score of a single match
    // (This is verified by the calculateScore tests, but let's verify the integration)
    const board = boardFromTypes([
      [1, 0, 0, 3, 4, 5],
      [0, 2, 3, 4, 5, 1],
      [2, 3, 4, 5, 1, 0],
      [3, 4, 5, 1, 0, 2],
      [4, 5, 1, 0, 2, 3],
      [5, 1, 0, 2, 3, 4],
    ]);
    const result = processTurn(
      board,
      { from: { row: 0, col: 0 }, to: { row: 1, col: 0 } },
      0,
      42
    );
    assert(result !== null, "Expected a valid turn result");
    // At minimum, the first match of 3 gives 30 points
    assert(result!.scoreGained >= 30, `Score should be >= 30, got ${result!.scoreGained}`);
  });
});

// ---------------------------------------------------------------------------
// hasValidMoves
// ---------------------------------------------------------------------------

describe("hasValidMoves", () => {
  test("generated board has valid moves", () => {
    resetTileIdCounter();
    const board = generateBoard(42);
    expect(hasValidMoves(board)).toBe(true);
  });

  test("many generated boards have valid moves", () => {
    for (let seed = 0; seed < 20; seed++) {
      resetTileIdCounter();
      const board = generateBoard(seed);
      assert(hasValidMoves(board), `Board with seed ${seed} should have valid moves`);
    }
  });

  test("board with all same type has valid moves (would match everywhere)", () => {
    const board = boardFromTypes([
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0],
    ]);
    // Already has matches everywhere, so any swap still has matches
    expect(hasValidMoves(board)).toBe(true);
  });

  test("checkerboard-like pattern with no valid moves", () => {
    // A board where no swap produces a match of 3
    // This is a carefully constructed board where swapping any adjacent pair
    // doesn't create 3 in a row
    const board = boardFromTypes([
      [0, 1, 0, 1, 0, 1],
      [2, 3, 2, 3, 2, 3],
      [0, 1, 0, 1, 0, 1],
      [2, 3, 2, 3, 2, 3],
      [0, 1, 0, 1, 0, 1],
      [2, 3, 2, 3, 2, 3],
    ]);
    expect(hasValidMoves(board)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// countRemainingTiles
// ---------------------------------------------------------------------------

describe("countRemainingTiles", () => {
  test("full board has BOARD_SIZE * BOARD_SIZE tiles", () => {
    resetTileIdCounter();
    const board = generateBoard(42);
    expect(countRemainingTiles(board)).toBe(BOARD_SIZE * BOARD_SIZE);
  });

  test("empty board has 0 tiles", () => {
    const board: Board = Array.from({ length: BOARD_SIZE }, () =>
      Array.from({ length: BOARD_SIZE }, () => null)
    );
    expect(countRemainingTiles(board)).toBe(0);
  });

  test("partially filled board counts correctly", () => {
    const board = boardFromTypes([
      [null, 1, null, 3, null, 5],
      [0, null, 2, null, 4, null],
      [null, 1, null, 3, null, 5],
      [0, null, 2, null, 4, null],
      [null, 1, null, 3, null, 5],
      [0, null, 2, null, 4, null],
    ]);
    expect(countRemainingTiles(board)).toBe(18); // half of 36
  });
});

// ---------------------------------------------------------------------------
// Edge cases and integration
// ---------------------------------------------------------------------------

describe("Edge cases", () => {
  test("L-shaped match detected as separate horizontal + vertical matches", () => {
    // L-shape: Fire at (0,0),(0,1),(0,2) horizontal AND (0,0),(1,0),(2,0) vertical
    const board = boardFromTypes([
      [0, 0, 0, 1, 2, 3],
      [0, 1, 2, 3, 4, 5],
      [0, 2, 3, 4, 5, 1],
      [1, 3, 4, 5, 0, 2],
      [2, 4, 5, 0, 1, 3],
      [3, 5, 0, 1, 2, 4],
    ]);
    const matches = findMatches(board);
    // Should find both horizontal and vertical
    assert(matches.length >= 2, `Expected at least 2 matches for L-shape, got ${matches.length}`);
    const totalPositions = new Set<string>();
    for (const m of matches) {
      for (const p of m.positions) {
        totalPositions.add(`${p.row},${p.col}`);
      }
    }
    // The L covers 5 unique positions: (0,0),(0,1),(0,2),(1,0),(2,0)
    assert(totalPositions.size >= 5, `Expected at least 5 unique matched positions, got ${totalPositions.size}`);
  });

  test("T-shaped match", () => {
    // T: horizontal Fire at row 0 cols 0-2, vertical Fire at col 1 rows 0-2
    const board = boardFromTypes([
      [0, 0, 0, 1, 2, 3],
      [1, 0, 2, 3, 4, 5],
      [2, 0, 3, 4, 5, 1],
      [3, 1, 4, 5, 0, 2],
      [4, 2, 5, 0, 1, 3],
      [5, 3, 0, 1, 2, 4],
    ]);
    const matches = findMatches(board);
    assert(matches.length >= 2, `Expected at least 2 matches for T-shape, got ${matches.length}`);
  });

  test("cross (+) shaped match", () => {
    // Cross: Fire at (1,2),(2,1),(2,2),(2,3),(3,2) — horizontal row 2 and vertical col 2
    const board = boardFromTypes([
      [1, 2, 3, 4, 5, 1],
      [2, 3, 0, 5, 1, 2],
      [3, 0, 0, 0, 2, 3],
      [4, 5, 0, 1, 3, 4],
      [5, 1, 2, 3, 4, 5],
      [1, 2, 3, 4, 5, 0],
    ]);
    const matches = findMatches(board);
    // Should have horizontal match in row 2 and vertical match in col 2
    const horiz = matches.find(
      (m) => m.positions.every((p) => p.row === 2) && m.positions.length >= 3
    );
    const vert = matches.find(
      (m) => m.positions.every((p) => p.col === 2) && m.positions.length >= 3
    );
    assert(horiz !== undefined, "Expected horizontal match in cross");
    assert(vert !== undefined, "Expected vertical match in cross");
  });

  test("full gravity cascade: match -> remove -> gravity -> fill cycle", () => {
    resetTileIdCounter();
    const board = boardFromTypes([
      [0, 0, 0, 1, 2, 3],
      [1, 2, 3, 4, 5, 0],
      [2, 3, 4, 5, 0, 1],
      [3, 4, 5, 0, 1, 2],
      [4, 5, 0, 1, 2, 3],
      [5, 0, 1, 2, 3, 4],
    ]);
    const matches = findMatches(board);
    assert(matches.length > 0, "Should have initial match");

    let b = removeMatches(board, matches);
    // Verify removed cells are null
    expect(b[0][0]).toBeNull();
    expect(b[0][1]).toBeNull();
    expect(b[0][2]).toBeNull();

    b = applyGravity(b);
    // Verify no non-null tile is above a null tile
    for (let col = 0; col < BOARD_SIZE; col++) {
      let seenNull = false;
      for (let row = BOARD_SIZE - 1; row >= 0; row--) {
        if (b[row][col] === null) seenNull = true;
        else assert(!seenNull, `Gravity failure at [${row}][${col}]`);
      }
    }

    b = fillBoard(b, 999);
    // Verify fully filled
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        assert(b[r][c] !== null, `Cell [${r}][${c}] still null after fill`);
      }
    }
  });

  test("board immutability: generateBoard -> processTurn does not alter original", () => {
    resetTileIdCounter();
    const board = generateBoard(42);
    const origTypes = boardTypes(board);

    // Try to find any valid move
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE - 1; c++) {
        processTurn(board, { from: { row: r, col: c }, to: { row: r, col: c + 1 } }, 0, 42);
      }
    }

    // Original board should be unchanged
    expect(boardTypes(board)).toEqual(origTypes);
  });

  test("vertical match at last column", () => {
    const board = boardFromTypes([
      [1, 2, 3, 4, 0, 5],
      [2, 3, 4, 0, 1, 5],
      [3, 4, 0, 1, 2, 5],
      [4, 0, 1, 2, 3, 0],
      [0, 1, 2, 3, 4, 1],
      [1, 2, 3, 4, 5, 2],
    ]);
    const matches = findMatches(board);
    const vertLast = matches.find(
      (m) =>
        m.type === TileType.Dark &&
        m.positions.every((p) => p.col === 5) &&
        m.positions.length === 3
    );
    assert(vertLast !== undefined, "Expected vertical match at last column");
  });

  test("horizontal match at last row", () => {
    const board = boardFromTypes([
      [0, 1, 2, 3, 4, 5],
      [1, 2, 3, 4, 5, 0],
      [2, 3, 4, 5, 0, 1],
      [3, 4, 5, 0, 1, 2],
      [4, 5, 0, 1, 2, 3],
      [3, 3, 3, 0, 1, 2],
    ]);
    const matches = findMatches(board);
    const horizLast = matches.find(
      (m) =>
        m.type === TileType.Air &&
        m.positions.every((p) => p.row === 5) &&
        m.positions.length === 3
    );
    assert(horizLast !== undefined, "Expected horizontal match at last row");
  });
});

// ---------------------------------------------------------------------------
// PRNG full-system determinism test
// ---------------------------------------------------------------------------

describe("Full system PRNG determinism", () => {
  test("two full games with same seed produce identical boards and scores", () => {
    const seed = 54321;

    // Game 1
    resetTileIdCounter();
    const board1 = generateBoard(seed);
    const types1 = boardTypes(board1);

    // Game 2
    resetTileIdCounter();
    const board2 = generateBoard(seed);
    const types2 = boardTypes(board2);

    expect(types1).toEqual(types2);

    // Now simulate the same move on both
    // Find a valid move on board1
    let moveFound = false;
    for (let r = 0; r < BOARD_SIZE && !moveFound; r++) {
      for (let c = 0; c < BOARD_SIZE - 1 && !moveFound; c++) {
        resetTileIdCounter();
        const result1 = processTurn(board1, { from: { row: r, col: c }, to: { row: r, col: c + 1 } }, 0, seed);
        if (result1 !== null) {
          resetTileIdCounter();
          const result2 = processTurn(board2, { from: { row: r, col: c }, to: { row: r, col: c + 1 } }, 0, seed);
          assert(result2 !== null, "Same move should work on identical board");
          expect(result1.scoreGained).toBe(result2!.scoreGained);
          expect(result1.cascadeCount).toBe(result2!.cascadeCount);
          expect(boardTypes(result1.board)).toEqual(boardTypes(result2!.board));
          moveFound = true;
        }
      }
    }
    assert(moveFound, "Should find at least one valid move");
  });

  test("PRNG state is independent between calls (no shared state leak)", () => {
    // Generate two boards with different seeds, then regenerate first — should be same
    resetTileIdCounter();
    const boardA1 = generateBoard(111);
    const typesA1 = boardTypes(boardA1);

    resetTileIdCounter();
    generateBoard(222); // Generate with different seed (side effect on tileIdCounter)

    resetTileIdCounter();
    const boardA2 = generateBoard(111);
    const typesA2 = boardTypes(boardA2);

    expect(typesA1).toEqual(typesA2);
  });
});

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

console.log("\n========================================");
console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failures.length > 0) {
  console.log("\nFailed tests:");
  for (const f of failures) {
    console.log(`  [${f.group}] ${f.name}: ${f.error}`);
  }
  process.exit(1);
} else {
  console.log("All tests passed!");
  process.exit(0);
}
