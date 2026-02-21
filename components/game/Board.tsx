import React, { useState, useCallback } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { useGameStore } from "@/stores/gameStore";
import { GameColors } from "@/constants/Colors";
import { BOARD_SIZE } from "@/lib/game/constants";
import { Position } from "@/lib/game/types";
import { lightTap, mediumTap, errorNotification } from "@/lib/haptics";
import Tile from "./Tile";

const BOARD_PADDING = 8;
const SCREEN_PADDING = 16;

function getBoardWidth() {
  const screenWidth = Dimensions.get("window").width;
  return screenWidth - SCREEN_PADDING * 2;
}

function isAdjacent(a: Position, b: Position): boolean {
  const dr = Math.abs(a.row - b.row);
  const dc = Math.abs(a.col - b.col);
  return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
}

export default function Board() {
  const board = useGameStore((s) => s.board);
  const isAnimating = useGameStore((s) => s.isAnimating);
  const movesRemaining = useGameStore((s) => s.movesRemaining);
  const makeMove = useGameStore((s) => s.makeMove);
  const setAnimating = useGameStore((s) => s.setAnimating);

  const [selected, setSelected] = useState<Position | null>(null);

  const boardWidth = getBoardWidth();
  const tileSize = (boardWidth - BOARD_PADDING * 2) / BOARD_SIZE;

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
      }, 300);
    },
    [selected, isAnimating, movesRemaining, makeMove, setAnimating]
  );

  if (!board || board.length === 0) return null;

  return (
    <View
      style={[
        styles.boardContainer,
        {
          width: boardWidth,
          height: boardWidth,
          borderRadius: 12,
          padding: BOARD_PADDING,
        },
      ]}
    >
      {board.map((rowData, row) => (
        <View key={row} style={styles.row}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  boardContainer: {
    backgroundColor: GameColors.boardBackground,
    borderWidth: 2,
    borderColor: GameColors.cellBorder,
    alignSelf: "center",
  },
  row: {
    flexDirection: "row",
    flex: 1,
  },
});
