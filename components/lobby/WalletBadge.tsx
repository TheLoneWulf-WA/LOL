import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useWalletStore } from "@/stores/walletStore";
import { useWalletBalances } from "@/hooks/useWalletBalances";
import { GameColors } from "@/constants/Colors";

export default function WalletBadge() {
  const solBalance = useWalletStore((s) => s.solBalance);
  const skrBalance = useWalletStore((s) => s.skrBalance);
  const isLoadingBalances = useWalletStore((s) => s.isLoadingBalances);

  // Kick off balance + NFT fetching on mount
  useWalletBalances();

  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <Text style={styles.label}>SOL</Text>
        {isLoadingBalances ? (
          <ActivityIndicator size="small" color={GameColors.textSecondary} />
        ) : (
          <Text style={styles.value}>{solBalance.toFixed(2)}</Text>
        )}
      </View>
      <View style={styles.badge}>
        <Text style={styles.label}>SKR</Text>
        {isLoadingBalances ? (
          <ActivityIndicator size="small" color={GameColors.textSecondary} />
        ) : (
          <Text style={styles.value}>{skrBalance.toFixed(0)}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 8,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GameColors.cardBackground,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
    borderWidth: 1,
    borderColor: GameColors.cardBorder,
  },
  label: {
    color: GameColors.textSecondary,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  value: {
    color: GameColors.textPrimary,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});
