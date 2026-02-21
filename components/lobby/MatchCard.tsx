import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { OnChainMatch } from "@/lib/game/types";
import { GameColors } from "@/constants/Colors";

interface MatchCardProps {
  match: OnChainMatch;
  onPress: () => void;
}

export default function MatchCard({ match, onPress }: MatchCardProps) {
  const statusLabel = {
    waiting: "Waiting for opponent",
    playing: "In progress",
    submitted: "Awaiting results",
    settled: "Complete",
    cancelled: "Cancelled",
  }[match.status];

  const statusColor = {
    waiting: GameColors.warning,
    playing: GameColors.accent,
    submitted: GameColors.water,
    settled: GameColors.success,
    cancelled: GameColors.textSecondary,
  }[match.status];

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <Text style={styles.matchId}>Match #{match.id.slice(0, 8)}</Text>
        <Text style={[styles.status, { color: statusColor }]}>{statusLabel}</Text>
      </View>
      <View style={styles.details}>
        <Text style={styles.wager}>{match.skrWager} SKR</Text>
        {match.opponent && (
          <Text style={styles.opponent}>
            vs {match.opponent.slice(0, 4)}...{match.opponent.slice(-4)}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: GameColors.cardBackground,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: GameColors.cardBorder,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  matchId: {
    color: GameColors.textPrimary,
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  status: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  details: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  wager: {
    color: GameColors.accent,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  opponent: {
    color: GameColors.textSecondary,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
});
