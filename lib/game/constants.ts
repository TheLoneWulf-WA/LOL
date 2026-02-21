export const BOARD_SIZE = 6;
export const TILE_TYPES = 6;
export const INITIAL_MOVES = 20;

export const POINTS_PER_TILE = 10;
export const CASCADE_MULTIPLIER = 1.5;

export const TILE_LABELS: Record<number, string> = {
  0: "Fire",
  1: "Water",
  2: "Earth",
  3: "Air",
  4: "Light",
  5: "Dark",
};

export const TILE_COLORS: Record<number, string> = {
  0: "#FF4136", // Fire - red
  1: "#0074D9", // Water - blue
  2: "#2ECC40", // Earth - green
  3: "#AAAAAA", // Air - silver
  4: "#FFDC00", // Light - gold
  5: "#B10DC9", // Dark - purple
};

export const ANIMATION_DURATION_MS = 200;
export const CASCADE_DELAY_MS = 150;
