import React, { useState, useCallback, useEffect, useRef } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { useGameStore } from "@/stores/gameStore";
import { GameColors } from "@/constants/Colors";
import { BOARD_SIZE } from "@/lib/game/constants";
import { Position } from "@/lib/game/types";
import { lightTap, mediumTap, heavyTap, errorNotification } from "@/lib/haptics";
import Tile from "./Tile";

const BOARD_PADDING = 6;
const SCREEN_PADDING = 16;
const TILE_GAP = 3;

/** Maximum number of simultaneous particle bursts. */
const MAX_PARTICLES = 12;

function getBoardWidth() {
  const screenWidth = Dimensions.get("window").width;
  return screenWidth - SCREEN_PADDING * 2;
}

function isAdjacent(a: Position, b: Position): boolean {
  const dr = Math.abs(a.row - b.row);
  const dc = Math.abs(a.col - b.col);
  return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
}

// ---------------------------------------------------------------------------
// Particle burst data
// ---------------------------------------------------------------------------

interface ParticleBurst {
  id: number;
  x: number;
  y: number;
  color: string;
}

// Map tile types to particle colors
const PARTICLE_COLORS: Record<number, string> = {
  0: "#FF4136",
  1: "#0074D9",
  2: "#2ECC40",
  3: "#AAAAAA",
  4: "#FFDC00",
  5: "#B10DC9",
};

// ---------------------------------------------------------------------------
// Board Component
// ---------------------------------------------------------------------------

export default function Board() {
  const board = useGameStore((s) => s.board);
  const isAnimating = useGameStore((s) => s.isAnimating);
  const movesRemaining = useGameStore((s) => s.movesRemaining);
  const combo = useGameStore((s) => s.combo);
  const lastMatchPositions = useGameStore((s) => s.lastMatchPositions);
  const makeMove = useGameStore((s) => s.makeMove);
  const setAnimating = useGameStore((s) => s.setAnimating);

  const [selected, setSelected] = useState<Position | null>(null);
  const [particles, setParticles] = useState<ParticleBurst[]>([]);
  const particleIdRef = useRef(0);

  const boardWidth = getBoardWidth();
  const totalGap = TILE_GAP * (BOARD_SIZE - 1);
  const tileSize = (boardWidth - BOARD_PADDING * 2 - totalGap) / BOARD_SIZE;

  // Screen shake shared values
  const shakeX = useSharedValue(0);
  const shakeY = useSharedValue(0);

  const shakeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }, { translateY: shakeY.value }],
  }));

  // Trigger screen shake on cascades (combo > 1)
  useEffect(() => {
    if (combo > 1) {
      const intensity = Math.min(combo * 2, 8);
      shakeX.value = withSequence(
        withTiming(intensity, { duration: 30 }),
        withTiming(-intensity, { duration: 30 }),
        withTiming(intensity * 0.6, { duration: 30 }),
        withTiming(-intensity * 0.6, { duration: 30 }),
        withTiming(intensity * 0.3, { duration: 30 }),
        withTiming(0, { duration: 30 })
      );
      shakeY.value = withSequence(
        withTiming(-intensity * 0.5, { duration: 30 }),
        withTiming(intensity * 0.5, { duration: 30 }),
        withTiming(-intensity * 0.3, { duration: 30 }),
        withTiming(0, { duration: 30 })
      );

      // Heavy haptic on cascades
      heavyTap();
    }
  }, [combo]);

  // Spawn particles at match positions
  useEffect(() => {
    if (lastMatchPositions.length === 0) return;

    // Deduplicate positions (same row/col can appear in overlapping matches)
    const seen = new Set<string>();
    const unique: Position[] = [];
    for (const pos of lastMatchPositions) {
      const key = `${pos.row},${pos.col}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(pos);
      }
    }

    // Create particle bursts for each unique matched position
    const newParticles: ParticleBurst[] = [];
    for (const pos of unique) {
      const tile = board[pos.row]?.[pos.col];
      const color = tile
        ? PARTICLE_COLORS[tile.type] ?? GameColors.accent
        : GameColors.accent;
      const id = ++particleIdRef.current;
      newParticles.push({
        id,
        x: pos.col * tileSize + tileSize / 2,
        y: pos.row * tileSize + tileSize / 2,
        color,
      });
    }

    // Cap number of particles for performance
    const limited = newParticles.slice(0, MAX_PARTICLES);
    setParticles((prev) => [...prev, ...limited]);

    // Clean up after animation
    const ids = limited.map((p) => p.id);
    const timer = setTimeout(() => {
      setParticles((prev) => prev.filter((p) => !ids.includes(p.id)));
    }, 700);

    return () => clearTimeout(timer);
  }, [lastMatchPositions]);

  const handleTilePress = useCallback(
    (row: number, col: number) => {
      if (isAnimating || movesRemaining <= 0) return;

      if (!selected) {
        // Nothing selected -- select this tile
        lightTap();
        setSelected({ row, col });
        return;
      }

      // Same tile tapped -- deselect
      if (selected.row === row && selected.col === col) {
        lightTap();
        setSelected(null);
        return;
      }

      const target: Position = { row, col };

      // Not adjacent -- select the new tile instead
      if (!isAdjacent(selected, target)) {
        lightTap();
        setSelected(target);
        return;
      }

      // Adjacent tile tapped -- attempt swap
      setAnimating(true);
      const result = makeMove({ from: selected, to: target });

      if (result) {
        mediumTap();
      } else {
        errorNotification();
      }

      setSelected(null);

      // Brief delay to let visuals settle, then re-enable input
      setTimeout(() => {
        setAnimating(false);
      }, 350);
    },
    [selected, isAnimating, movesRemaining, makeMove, setAnimating]
  );

  if (!board || board.length === 0) return null;

  return (
    <View style={styles.outerGlow}>
    <Animated.View
      style={[
        styles.boardContainer,
        {
          width: boardWidth,
          height: boardWidth,
          padding: BOARD_PADDING,
        },
        shakeAnimatedStyle,
      ]}
    >
      {board.map((rowData, row) => (
        <View key={row} style={[styles.row, { gap: TILE_GAP }]}>
          {rowData.map((tile, col) => {
            if (!tile) {
              return (
                <View
                  key={`empty-${row}-${col}`}
                  style={{ width: tileSize, height: tileSize }}
                />
              );
            }

            const isSelected =
              selected !== null &&
              selected.row === row &&
              selected.col === col;

            return (
              <View
                key={tile.id}
                style={{
                  width: tileSize,
                  height: tileSize,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Tile
                  tile={tile}
                  row={row}
                  col={col}
                  tileSize={tileSize}
                  onPress={() => handleTilePress(row, col)}
                  isSelected={isSelected}
                />
              </View>
            );
          })}
        </View>
      ))}

      {/* Particle effects layer */}
      {particles.map((p) => (
        <SparkleParticle key={p.id} x={p.x} y={p.y} color={p.color} />
      ))}
    </Animated.View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Sparkle Particle — a single burst of animated dots
// ---------------------------------------------------------------------------

const SPARKLE_COUNT = 6;

function SparkleParticle({
  x,
  y,
  color,
}: {
  x: number;
  y: number;
  color: string;
}) {
  // Generate fixed angles for each sparkle dot
  const anglesRef = useRef(
    Array.from({ length: SPARKLE_COUNT }, (_, i) => (i / SPARKLE_COUNT) * Math.PI * 2)
  );

  return (
    <View style={[styles.particleContainer, { left: x, top: y }]} pointerEvents="none">
      {anglesRef.current.map((angle, i) => (
        <SparkDot key={i} angle={angle} color={color} delay={i * 15} />
      ))}
    </View>
  );
}

function SparkDot({
  angle,
  color,
  delay,
}: {
  angle: number;
  color: string;
  delay: number;
}) {
  const progress = useSharedValue(0);
  const opacity = useSharedValue(1);

  const radius = 18;
  const dx = Math.cos(angle) * radius;
  const dy = Math.sin(angle) * radius;

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) })
    );
    opacity.value = withDelay(
      delay + 200,
      withTiming(0, { duration: 200, easing: Easing.in(Easing.ease) })
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: dx * progress.value },
      { translateY: dy * progress.value },
      { scale: 1 - progress.value * 0.6 },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.sparkDot,
        { backgroundColor: color },
        animStyle,
      ]}
    />
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  outerGlow: {
    alignSelf: "center",
    borderRadius: 18,
    padding: 2,
    backgroundColor: GameColors.boardGlow,
    shadowColor: GameColors.brandPurple,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  boardContainer: {
    backgroundColor: GameColors.boardBackground,
    borderWidth: 2,
    borderColor: GameColors.cellBorder,
    borderRadius: 16,
    alignSelf: "center",
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    flex: 1,
  },
  particleContainer: {
    position: "absolute",
    width: 0,
    height: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  sparkDot: {
    position: "absolute",
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
});
