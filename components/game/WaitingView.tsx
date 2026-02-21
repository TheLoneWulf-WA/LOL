import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { useEmbeddedSolanaWallet } from "@privy-io/expo";
import { PublicKey } from "@solana/web3.js";

import { GameColors } from "@/constants/Colors";
import { OnChainMatch } from "@/lib/game/types";
import { buildCancelMatchTransaction } from "@/lib/anchor/client";
import { getMatchPDA } from "@/lib/anchor/pda";
import { sendTransaction } from "@/lib/solana/wallet";
import { SKR_MINT } from "@/lib/solana/skr";

interface WaitingViewProps {
  match: OnChainMatch;
}

export default function WaitingView({ match }: WaitingViewProps) {
  const router = useRouter();
  const { wallets } = useEmbeddedSolanaWallet();
  const wallet = wallets?.[0];

  const [isCancelling, setIsCancelling] = useState(false);
  const [copied, setCopied] = useState(false);
  const [dots, setDots] = useState("");

  // Animated dots for "Waiting for opponent..."
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const handleCopyMatchId = async () => {
    await Clipboard.setStringAsync(match.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCancelMatch = async () => {
    if (!wallet?.getProvider) {
      Alert.alert("Error", "No wallet available");
      return;
    }

    Alert.alert("Cancel Match", "Are you sure you want to cancel this match?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, Cancel",
        style: "destructive",
        onPress: async () => {
          setIsCancelling(true);
          try {
            const provider = await wallet.getProvider();
            if (!provider) throw new Error("Failed to get provider");

            const creatorPubkey = new PublicKey(match.creator);
            const [matchPDA] = getMatchPDA(creatorPubkey, match.id);
            const nftMint = new PublicKey(match.creatorNftMint);

            const tx = buildCancelMatchTransaction(
              creatorPubkey,
              matchPDA,
              match.id,
              nftMint,
              SKR_MINT,
            );

            await sendTransaction(
              provider as unknown as Parameters<typeof sendTransaction>[0],
              tx,
              creatorPubkey,
            );

            Alert.alert("Match Cancelled", "Your assets have been returned.");
            router.back();
          } catch (err: any) {
            Alert.alert(
              "Cancel Failed",
              err?.message ?? String(err),
            );
          } finally {
            setIsCancelling(false);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Match Created</Text>

        {/* Match ID */}
        <View style={styles.matchIdContainer}>
          <Text style={styles.matchIdLabel}>Match ID</Text>
          <Text style={styles.matchIdValue}>{match.id}</Text>
          <TouchableOpacity
            style={styles.copyButton}
            onPress={handleCopyMatchId}
            activeOpacity={0.7}
          >
            <Text style={styles.copyButtonText}>
              {copied ? "Copied!" : "Copy ID"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Waiting indicator */}
        <View style={styles.waitingSection}>
          <ActivityIndicator size="large" color={GameColors.accent} />
          <Text style={styles.waitingText}>
            Waiting for opponent{dots}
          </Text>
          <Text style={styles.waitingSubtext}>
            Share your Match ID with an opponent
          </Text>
        </View>

        {/* Match details */}
        <View style={styles.detailsSection}>
          <Text style={styles.detailsTitle}>Match Details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>SKR Wager</Text>
            <Text style={styles.detailValue}>{match.skrWager} SKR</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>NFT Staked</Text>
            <Text style={styles.detailValue} numberOfLines={1}>
              {match.creatorNftMint.slice(0, 8)}...
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Board Seed</Text>
            <Text style={styles.detailValue}>{match.boardSeed}</Text>
          </View>
        </View>

        {/* Cancel button */}
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={handleCancelMatch}
          disabled={isCancelling}
          activeOpacity={0.8}
        >
          {isCancelling ? (
            <ActivityIndicator size="small" color={GameColors.danger} />
          ) : (
            <Text style={styles.cancelButtonText}>Cancel Match</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  card: {
    backgroundColor: GameColors.cardBackground,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: GameColors.cardBorder,
    padding: 24,
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
  },
  title: {
    color: GameColors.textPrimary,
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    marginBottom: 20,
  },
  matchIdContainer: {
    alignItems: "center",
    marginBottom: 24,
    width: "100%",
  },
  matchIdLabel: {
    color: GameColors.textSecondary,
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  matchIdValue: {
    color: GameColors.accent,
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
    marginBottom: 8,
  },
  copyButton: {
    backgroundColor: GameColors.secondary,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: GameColors.accent,
  },
  copyButtonText: {
    color: GameColors.accent,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  waitingSection: {
    alignItems: "center",
    marginBottom: 24,
    gap: 12,
  },
  waitingText: {
    color: GameColors.textPrimary,
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    minWidth: 240,
    textAlign: "center",
  },
  waitingSubtext: {
    color: GameColors.textSecondary,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  detailsSection: {
    width: "100%",
    backgroundColor: GameColors.boardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  detailsTitle: {
    color: GameColors.textSecondary,
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  detailLabel: {
    color: GameColors.textSecondary,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  detailValue: {
    color: GameColors.textPrimary,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    maxWidth: "50%",
  },
  cancelButton: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GameColors.danger,
    alignItems: "center",
  },
  cancelButtonText: {
    color: GameColors.danger,
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
});
