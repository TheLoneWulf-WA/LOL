import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { GameColors } from "@/constants/Colors";
import { OnChainMatch } from "@/lib/game/types";
import { successNotification, errorNotification } from "@/lib/haptics";

interface ResultViewProps {
  match: OnChainMatch;
  currentPlayerPubkey: string;
}

export default function ResultView({ match, currentPlayerPubkey }: ResultViewProps) {
  const router = useRouter();
  const hapticFired = useRef(false);

  const isCreator = currentPlayerPubkey === match.creator;
  const isWinner = match.winner === currentPlayerPubkey;

  // Fire haptic on mount based on win/loss
  useEffect(() => {
    if (hapticFired.current) return;
    hapticFired.current = true;

    if (isWinner) {
      successNotification();
    } else {
      errorNotification();
    }
  }, [isWinner]);
  const isTie =
    match.creatorScore !== null &&
    match.opponentScore !== null &&
    match.creatorScore === match.opponentScore;

  const myScore = isCreator ? match.creatorScore : match.opponentScore;
  const opponentScore = isCreator ? match.opponentScore : match.creatorScore;

  const resultTitle = isTie
    ? "Tie -- Creator Wins!"
    : isWinner
      ? "You Won!"
      : "You Lost";

  const accentColor = isWinner || isTie
    ? (isCreator ? GameColors.success : GameColors.danger)
    : GameColors.danger;

  const resultBorderColor = isWinner || (isTie && isCreator)
    ? GameColors.success
    : GameColors.danger;

  const handleBackToLobby = () => {
    router.back();
  };

  const handlePlayAgain = () => {
    router.replace("/match/create");
  };

  const resultEmoji = isWinner || (isTie && isCreator)
    ? "\uD83C\uDFC6"
    : "\u2694\uFE0F";

  return (
    <View style={styles.overlay}>
      <View style={[styles.card, { borderColor: resultBorderColor }]}>
        <Text style={styles.resultEmoji}>{resultEmoji}</Text>
        <Text
          style={[
            styles.resultTitle,
            { color: isWinner || (isTie && isCreator) ? GameColors.success : GameColors.danger },
          ]}
        >
          {resultTitle}
        </Text>

        {/* Scores */}
        <View style={styles.scoresContainer}>
          <View style={styles.scoreColumn}>
            <Text style={styles.playerLabel}>
              {isCreator ? "You" : "Creator"}
            </Text>
            <Text
              style={[
                styles.scoreNumber,
                match.winner === match.creator && styles.winnerScore,
              ]}
            >
              {match.creatorScore ?? "--"}
            </Text>
          </View>

          <Text style={styles.vsText}>vs</Text>

          <View style={styles.scoreColumn}>
            <Text style={styles.playerLabel}>
              {isCreator ? "Opponent" : "You"}
            </Text>
            <Text
              style={[
                styles.scoreNumber,
                match.winner === match.opponent && styles.winnerScore,
              ]}
            >
              {match.opponentScore ?? "--"}
            </Text>
          </View>
        </View>

        {/* Prize info */}
        <View style={styles.prizeSection}>
          <Text style={styles.prizeTitle}>Prizes</Text>
          {match.skrWager > 0 && (
            <View style={styles.prizeRow}>
              <Text style={styles.prizeLabel}>SKR Wager ({match.skrWager * 2} SKR)</Text>
              <Text
                style={[
                  styles.prizeValue,
                  {
                    color:
                      match.winner === currentPlayerPubkey
                        ? GameColors.success
                        : GameColors.danger,
                  },
                ]}
              >
                {match.winner === currentPlayerPubkey ? "Won" : "Lost"}
              </Text>
            </View>
          )}
          <View style={styles.prizeRow}>
            <Text style={styles.prizeLabel}>NFTs</Text>
            <Text
              style={[
                styles.prizeValue,
                {
                  color:
                    match.winner === currentPlayerPubkey
                      ? GameColors.success
                      : GameColors.danger,
                },
              ]}
            >
              {match.winner === currentPlayerPubkey
                ? "Won both NFTs"
                : "Lost your NFT"}
            </Text>
          </View>
        </View>

        {/* Buttons */}
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
    backgroundColor: GameColors.overlay,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
    padding: 16,
  },
  card: {
    backgroundColor: GameColors.cardBackground,
    borderRadius: 20,
    borderWidth: 2,
    padding: 28,
    alignItems: "center",
    width: "100%",
    maxWidth: 340,
  },
  resultEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  resultTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    marginBottom: 20,
    textAlign: "center",
  },
  scoresContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    gap: 20,
  },
  scoreColumn: {
    alignItems: "center",
    minWidth: 80,
  },
  playerLabel: {
    color: GameColors.textSecondary,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    marginBottom: 4,
  },
  scoreNumber: {
    color: GameColors.textPrimary,
    fontSize: 40,
    fontFamily: "Inter_700Bold",
  },
  winnerScore: {
    color: GameColors.accent,
  },
  vsText: {
    color: GameColors.textSecondary,
    fontSize: 16,
    fontFamily: "Inter_500Medium",
  },
  prizeSection: {
    width: "100%",
    backgroundColor: GameColors.boardBackground,
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
  },
  prizeTitle: {
    color: GameColors.textSecondary,
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  prizeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  prizeLabel: {
    color: GameColors.textSecondary,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  prizeValue: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  buttons: {
    width: "100%",
    gap: 12,
  },
  playAgainButton: {
    backgroundColor: GameColors.primary,
    paddingVertical: 14,
    borderRadius: 14,
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
    borderRadius: 14,
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
