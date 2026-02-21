import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { GameColors } from "@/constants/Colors";
import { useGameStore } from "@/stores/gameStore";
import Board from "@/components/game/Board";
import ScoreBar from "@/components/game/ScoreBar";
import GameOverView from "@/components/game/GameOverView";

export default function MatchScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const movesRemaining = useGameStore((s) => s.movesRemaining);
  const board = useGameStore((s) => s.board);
  const startGame = useGameStore((s) => s.startGame);
  const hasStarted = useRef(false);

  // Start the game once on mount
  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    // Use the match id as seed if numeric, otherwise generate a random seed
    const seed = id && !isNaN(Number(id)) ? Number(id) : Date.now();
    startGame(seed);
  }, [id, startGame]);

  const isGameOver = board.length > 0 && movesRemaining <= 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Land of Leal</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScoreBar />

      <View style={styles.boardArea}>
        <Board />
      </View>

      {isGameOver && <GameOverView />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GameColors.screenBackground,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    marginBottom: 16,
  },
  backText: {
    color: GameColors.primary,
    fontSize: 16,
    fontFamily: "Inter_500Medium",
  },
  title: {
    color: GameColors.textPrimary,
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
  },
  boardArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
