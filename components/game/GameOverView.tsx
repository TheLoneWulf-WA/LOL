import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useGameStore } from "@/stores/gameStore";
import { GameColors } from "@/constants/Colors";

export default function GameOverView() {
  const score = useGameStore((s) => s.score);
  const startGame = useGameStore((s) => s.startGame);
  const router = useRouter();

  const handlePlayAgain = () => {
    const newSeed = Date.now();
    startGame(newSeed);
  };

  const handleBackToLobby = () => {
    router.back();
  };

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <Text style={styles.gameOverTitle}>Game Over</Text>

        <View style={styles.scoreContainer}>
          <Text style={styles.scoreLabel}>Final Score</Text>
          <Text style={styles.scoreValue}>{score}</Text>
        </View>

        <View style={styles.buttons}>
          <TouchableOpacity
            style={styles.playAgainButton}
            onPress={handlePlayAgain}
            activeOpacity={0.8}
          >
            <Text style={styles.playAgainText}>Play Again</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.lobbyButton}
            onPress={handleBackToLobby}
            activeOpacity={0.8}
          >
            <Text style={styles.lobbyText}>Back to Lobby</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  card: {
    backgroundColor: GameColors.cardBackground,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: GameColors.cardBorder,
    padding: 32,
    alignItems: "center",
    width: "80%",
    maxWidth: 320,
  },
  gameOverTitle: {
    color: GameColors.textPrimary,
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    marginBottom: 24,
  },
  scoreContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  scoreLabel: {
    color: GameColors.textSecondary,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    marginBottom: 4,
  },
  scoreValue: {
    color: GameColors.accent,
    fontSize: 48,
    fontFamily: "Inter_700Bold",
  },
  buttons: {
    width: "100%",
    gap: 12,
  },
  playAgainButton: {
    backgroundColor: GameColors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  playAgainText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  lobbyButton: {
    backgroundColor: "transparent",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GameColors.textSecondary,
    alignItems: "center",
  },
  lobbyText: {
    color: GameColors.textSecondary,
    fontSize: 16,
    fontFamily: "Inter_500Medium",
  },
});
