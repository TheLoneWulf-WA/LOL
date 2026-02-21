import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePrivy } from "@privy-io/expo";
import * as Clipboard from "expo-clipboard";
import Constants from "expo-constants";

import { GameColors } from "@/constants/Colors";
import { useWalletStore } from "@/stores/walletStore";
import { useStatsStore } from "@/stores/statsStore";
import { useWalletBalances } from "@/hooks/useWalletBalances";

export default function ProfileScreen() {
  const router = useRouter();
  const { logout } = usePrivy();
  const { isLoading, refetch } = useWalletBalances();

  const publicKey = useWalletStore((s) => s.publicKey);
  const solBalance = useWalletStore((s) => s.solBalance);
  const skrBalance = useWalletStore((s) => s.skrBalance);
  const isLoadingBalances = useWalletStore((s) => s.isLoadingBalances);

  const gamesPlayed = useStatsStore((s) => s.gamesPlayed);
  const gamesWon = useStatsStore((s) => s.gamesWon);
  const totalScore = useStatsStore((s) => s.totalScore);
  const highScore = useStatsStore((s) => s.highScore);

  const [copied, setCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const winRate =
    gamesPlayed > 0 ? Math.round((gamesWon / gamesPlayed) * 100) : 0;

  const appVersion = Constants.expoConfig?.version ?? "1.0.0";

  const handleCopyAddress = useCallback(async () => {
    if (!publicKey) return;
    await Clipboard.setStringAsync(publicKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [publicKey]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  }, [refetch]);

  const handleLogout = useCallback(async () => {
    await logout();
    router.replace("/");
  }, [logout, router]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Wallet Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Wallet</Text>
          <View style={styles.card}>
            {/* Address */}
            <View style={styles.addressRow}>
              <Text style={styles.label}>Address</Text>
              {publicKey ? (
                <TouchableOpacity
                  onPress={handleCopyAddress}
                  activeOpacity={0.7}
                  style={styles.addressContainer}
                >
                  <Text style={styles.addressText} numberOfLines={1}>
                    {publicKey}
                  </Text>
                  <Text style={styles.copyIndicator}>
                    {copied ? "Copied!" : "Tap to copy"}
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.placeholderText}>No wallet connected</Text>
              )}
            </View>

            {/* Balances */}
            <View style={styles.balancesRow}>
              <View style={styles.balanceItem}>
                <Text style={styles.label}>SOL Balance</Text>
                {isLoadingBalances ? (
                  <ActivityIndicator
                    size="small"
                    color={GameColors.accent}
                    style={styles.balanceLoader}
                  />
                ) : (
                  <Text style={styles.balanceValue}>
                    {solBalance.toFixed(4)} SOL
                  </Text>
                )}
              </View>
              <View style={styles.balanceItem}>
                <Text style={styles.label}>SKR Balance</Text>
                {isLoadingBalances ? (
                  <ActivityIndicator
                    size="small"
                    color={GameColors.accent}
                    style={styles.balanceLoader}
                  />
                ) : (
                  <Text style={styles.balanceValue}>
                    {skrBalance.toFixed(2)} SKR
                  </Text>
                )}
              </View>
            </View>

            {/* Refresh */}
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={handleRefresh}
              disabled={isRefreshing || isLoading}
              activeOpacity={0.7}
            >
              {isRefreshing || isLoading ? (
                <ActivityIndicator size="small" color={GameColors.primary} />
              ) : (
                <Text style={styles.refreshText}>Refresh Balances</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stats</Text>
          <View style={styles.card}>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{gamesPlayed}</Text>
                <Text style={styles.statLabel}>Games Played</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{gamesWon}</Text>
                <Text style={styles.statLabel}>Games Won</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{winRate}%</Text>
                <Text style={styles.statLabel}>Win Rate</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{highScore}</Text>
                <Text style={styles.statLabel}>High Score</Text>
              </View>
            </View>
            <View style={styles.totalScoreRow}>
              <Text style={styles.label}>Total Score</Text>
              <Text style={styles.totalScoreValue}>
                {totalScore.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
              activeOpacity={0.8}
            >
              <Text style={styles.logoutText}>Log Out</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* App Version */}
        <Text style={styles.versionText}>
          Land of Leal v{appVersion}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GameColors.screenBackground,
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: GameColors.textSecondary,
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: GameColors.cardBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: GameColors.cardBorder,
    padding: 16,
  },
  label: {
    color: GameColors.textSecondary,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginBottom: 4,
  },
  addressRow: {
    marginBottom: 16,
  },
  addressContainer: {
    backgroundColor: GameColors.boardBackground,
    borderRadius: 8,
    padding: 12,
  },
  addressText: {
    color: GameColors.textPrimary,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  copyIndicator: {
    color: GameColors.accent,
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    marginTop: 4,
  },
  placeholderText: {
    color: GameColors.textSecondary,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
    marginTop: 4,
  },
  balancesRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  balanceItem: {
    flex: 1,
    backgroundColor: GameColors.boardBackground,
    borderRadius: 8,
    padding: 12,
  },
  balanceValue: {
    color: GameColors.textPrimary,
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
  },
  balanceLoader: {
    alignSelf: "flex-start",
    marginTop: 4,
  },
  refreshButton: {
    borderWidth: 1,
    borderColor: GameColors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  refreshText: {
    color: GameColors.primary,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    minWidth: "40%",
    backgroundColor: GameColors.boardBackground,
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  statValue: {
    color: GameColors.accent,
    fontSize: 24,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 4,
  },
  statLabel: {
    color: GameColors.textSecondary,
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
  totalScoreRow: {
    backgroundColor: GameColors.boardBackground,
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalScoreValue: {
    color: GameColors.textPrimary,
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
  },
  logoutButton: {
    backgroundColor: GameColors.danger,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  logoutText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  versionText: {
    color: GameColors.textSecondary,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 8,
    opacity: 0.6,
  },
});
