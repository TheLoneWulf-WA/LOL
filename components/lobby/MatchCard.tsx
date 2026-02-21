import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { OnChainMatch } from "@/lib/game/types";
import { GameColors } from "@/constants/Colors";

interface MatchCardProps {
  match: OnChainMatch;
  onPress: () => void;
}

/** Truncate a base58 address to "Xxxx...Yyyy" form. */
function truncateAddress(address: string): string {
  if (address.length <= 8) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export default function MatchCard({ match, onPress }: MatchCardProps) {
  const router = useRouter();

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

  const isJoinable = match.status === "waiting" && match.opponent === null;

  const handleJoin = () => {
    router.push({ pathname: "/match/[id]", params: { id: match.id } });
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <Text style={styles.matchId}>Match #{match.id.slice(0, 8)}</Text>
        <Text style={[styles.status, { color: statusColor }]}>
          {statusLabel}
        </Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Creator</Text>
        <Text style={styles.infoValue}>
          {truncateAddress(match.creator)}
        </Text>
      </View>

      <View style={styles.details}>
        <Text style={styles.wager}>{match.skrWager} SKR</Text>
        <Text style={styles.seed}>Seed: {match.boardSeed}</Text>
      </View>

      {match.opponent && (
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Opponent</Text>
          <Text style={styles.infoValue}>
            {truncateAddress(match.opponent)}
          </Text>
        </View>
      )}

      {isJoinable && (
        <TouchableOpacity
          style={styles.joinButton}
          onPress={handleJoin}
          activeOpacity={0.8}
        >
          <Text style={styles.joinButtonText}>Join Match</Text>
        </TouchableOpacity>
      )}
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
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  infoLabel: {
    color: GameColors.textSecondary,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  infoValue: {
    color: GameColors.textPrimary,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  details: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
    marginBottom: 4,
  },
  wager: {
    color: GameColors.accent,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  seed: {
    color: GameColors.textSecondary,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  joinButton: {
    backgroundColor: GameColors.success,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 8,
  },
  joinButtonText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});
