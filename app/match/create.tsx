import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEmbeddedSolanaWallet } from "@privy-io/expo";
import { PublicKey } from "@solana/web3.js";

import { GameColors } from "@/constants/Colors";
import NFTPicker from "@/components/game/NFTPicker";
import SKRWagerInput from "@/components/game/SKRWagerInput";
import { useWalletBalances } from "@/hooks/useWalletBalances";
import { useWalletStore, NFTAsset } from "@/stores/walletStore";
import { useMatchStore } from "@/stores/matchStore";
import { buildCreateMatchTransaction } from "@/lib/anchor/client";
import { sendTransaction } from "@/lib/solana/wallet";
import { SKR_MINT } from "@/lib/solana/skr";
import { OnChainMatch } from "@/lib/game/types";

/** Generate a random 8-character alphanumeric match ID. */
function generateMatchId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default function CreateMatchScreen() {
  const router = useRouter();
  const { wallets } = useEmbeddedSolanaWallet();
  const wallet = wallets?.[0];

  // Load balances + NFTs on mount
  const { isLoading: isLoadingData } = useWalletBalances();

  // Wallet store state
  const nfts = useWalletStore((s) => s.nfts);
  const skrBalance = useWalletStore((s) => s.skrBalance);
  const isLoadingNFTs = useWalletStore((s) => s.isLoadingNFTs);

  // Match store actions
  const setCreating = useMatchStore((s) => s.setCreating);
  const setCurrentMatch = useMatchStore((s) => s.setCurrentMatch);
  const isCreating = useMatchStore((s) => s.isCreating);

  // Local state
  const [selectedNft, setSelectedNft] = useState<NFTAsset | null>(null);
  const [wagerAmount, setWagerAmount] = useState(0);

  const canCreate = selectedNft !== null && !isCreating;

  const handleCreateMatch = async () => {
    if (!selectedNft) return;

    if (!wallet?.getProvider) {
      Alert.alert("Error", "No Solana wallet available. Please connect a wallet first.");
      return;
    }

    setCreating(true);

    try {
      // Get wallet provider
      const provider = await wallet.getProvider();
      if (!provider) {
        throw new Error("Failed to get wallet provider");
      }

      const creatorPubkey = new PublicKey(wallet.publicKey);
      const nftMint = new PublicKey(selectedNft.mint);

      // Generate match ID and board seed
      const matchId = generateMatchId();
      const boardSeed = Math.floor(Math.random() * 2_000_000_000);

      // Build the transaction
      const transaction = buildCreateMatchTransaction(
        creatorPubkey,
        matchId,
        boardSeed,
        wagerAmount,
        nftMint,
        SKR_MINT,
      );

      // Send the transaction via the shared helper.
      // The Privy SDK provider uses overloaded method signatures while our
      // helper expects a simpler generic type, so we bridge with a cast.
      const signature = await sendTransaction(
        provider as unknown as Parameters<typeof sendTransaction>[0],
        transaction,
        creatorPubkey,
      );

      // Build the OnChainMatch object for the store
      const match: OnChainMatch = {
        id: matchId,
        creator: wallet.publicKey,
        opponent: null,
        creatorScore: null,
        opponentScore: null,
        skrWager: wagerAmount,
        boardSeed,
        status: "waiting",
        creatorNftMint: selectedNft.mint,
        opponentNftMint: null,
        winner: null,
      };

      setCurrentMatch(match);

      // Navigate to the match detail screen
      router.push({ pathname: "/match/[id]", params: { id: matchId } });
    } catch (err: any) {
      const message = err?.message ?? String(err);
      Alert.alert("Failed to Create Match", message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Create Match</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Scrollable Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* NFT Selection Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select NFT to Stake</Text>
          <NFTPicker
            nfts={nfts}
            selectedNft={selectedNft}
            onSelect={setSelectedNft}
            loading={isLoadingNFTs || isLoadingData}
          />
        </View>

        {/* SKR Wager Section */}
        <View style={styles.section}>
          <SKRWagerInput
            value={wagerAmount}
            onChange={setWagerAmount}
            maxBalance={skrBalance}
          />
        </View>

        {/* Match Summary */}
        {selectedNft && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Match Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>NFT</Text>
              <Text style={styles.summaryValue} numberOfLines={1}>
                {selectedNft.name}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>SKR Wager</Text>
              <Text style={styles.summaryValue}>{wagerAmount} SKR</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Sticky Bottom Button */}
      <View style={styles.bottomArea}>
        <TouchableOpacity
          style={[styles.createButton, !canCreate && styles.createButtonDisabled]}
          onPress={handleCreateMatch}
          disabled={!canCreate}
          activeOpacity={0.8}
        >
          {isCreating ? (
            <ActivityIndicator size="small" color={GameColors.screenBackground} />
          ) : (
            <Text
              style={[
                styles.createButtonText,
                !canCreate && styles.createButtonTextDisabled,
              ]}
            >
              Create Match
            </Text>
          )}
        </TouchableOpacity>
      </View>
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
    paddingVertical: 12,
    marginBottom: 8,
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
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: GameColors.textPrimary,
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 12,
  },
  summaryCard: {
    backgroundColor: GameColors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GameColors.cardBorder,
    padding: 16,
    marginBottom: 16,
  },
  summaryTitle: {
    color: GameColors.textPrimary,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  summaryLabel: {
    color: GameColors.textSecondary,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  summaryValue: {
    color: GameColors.textPrimary,
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    maxWidth: "60%",
    textAlign: "right",
  },
  bottomArea: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: GameColors.cardBorder,
    backgroundColor: GameColors.screenBackground,
  },
  createButton: {
    backgroundColor: GameColors.accent,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  createButtonDisabled: {
    backgroundColor: GameColors.cardBorder,
  },
  createButtonText: {
    color: GameColors.screenBackground,
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  createButtonTextDisabled: {
    color: GameColors.textSecondary,
  },
});
