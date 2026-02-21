import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useGameStore } from "@/stores/gameStore";
import { GameColors } from "@/constants/Colors";

interface GameOverViewProps {
  isPractice: boolean;
  onSubmitScore?: () => void;
  isSubmitting?: boolean;
}

export default function GameOverView({
  isPractice,
  onSubmitScore,
  isSubmitting,
}: GameOverViewProps) {
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
          {isPractice ? (
            <>
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
            </>
          ) : (
            <>
              {isSubmitting ? (
                <View style={styles.submittingContainer}>
                  <ActivityIndicator
                    size="large"
                    color={GameColors.accent}
                  />
                  <Text style={styles.submittingText}>
                    Submitting score on-chain...
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={onSubmitScore}
                  activeOpacity={0.8}
                >
                  <Text style={styles.submitButtonText}>
                    Submit Score to Blockchain
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.lobbyButton}
                onPress={handleBackToLobby}
                activeOpacity={0.8}
                disabled={isSubmitting}
              >
                <Text
                  style={[
                    styles.lobbyText,
                    isSubmitting && { opacity: 0.5 },
                  ]}
                >
                  Back to Lobby
                </Text>
              </TouchableOpacity>
            </>
          )}
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
  submitButton: {
    backgroundColor: GameColors.success,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  submittingContainer: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  submittingText: {
    color: GameColors.accent,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
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
