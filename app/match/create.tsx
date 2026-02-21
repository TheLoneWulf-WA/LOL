import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
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
  const solBalance = useWalletStore((s) => s.solBalance);
  const isLoadingNFTs = useWalletStore((s) => s.isLoadingNFTs);
  const isLoadingBalances = useWalletStore((s) => s.isLoadingBalances);

  // Match store actions
  const setCreating = useMatchStore((s) => s.setCreating);
  const setCurrentMatch = useMatchStore((s) => s.setCurrentMatch);
  const isCreating = useMatchStore((s) => s.isCreating);

  // Local state
  const [selectedNft, setSelectedNft] = useState<NFTAsset | null>(null);
  const [wagerAmount, setWagerAmount] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);

  const wagerExceedsBalance = wagerAmount > skrBalance;
  const canCreate = selectedNft !== null && !isCreating && !wagerExceedsBalance;

  const handleCreatePress = () => {
    if (!canCreate) return;
    setShowConfirm(true);
  };

  const handleConfirmCreate = async () => {
    setShowConfirm(false);

    if (!selectedNft) return;

    if (!wallet?.getProvider) {
      Alert.alert("Error", "No Solana wallet available. Please connect a wallet first.");
      return;
    }

    // Final balance check before submitting
    if (wagerAmount > skrBalance) {
      Alert.alert(
        "Insufficient SKR",
        `You only have ${skrBalance.toFixed(0)} SKR but tried to wager ${wagerAmount} SKR.`
      );
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backArrow}>{"\u2190"}</Text>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Create Match</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Scrollable Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Prominent SKR Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceRow}>
            <View style={styles.balanceItem}>
              <Text style={styles.balanceCurrencyLabel}>SKR Balance</Text>
              <Text style={styles.balanceAmount}>
                {isLoadingBalances ? "..." : skrBalance.toFixed(0)}
              </Text>
              <Text style={styles.balanceSuffix}>SKR</Text>
            </View>
            <View style={styles.balanceDivider} />
            <View style={styles.balanceItem}>
              <Text style={styles.balanceCurrencyLabel}>SOL Balance</Text>
              <Text style={styles.balanceAmountSmall}>
                {isLoadingBalances ? "..." : solBalance.toFixed(4)}
              </Text>
              <Text style={styles.balanceSuffix}>SOL</Text>
            </View>
          </View>
        </View>

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
              <Text
                style={[
                  styles.summaryValue,
                  wagerExceedsBalance && styles.summaryValueError,
                ]}
              >
                {wagerAmount} SKR
              </Text>
            </View>
            {wagerExceedsBalance && (
              <Text style={styles.summaryWarning}>
                Wager exceeds your SKR balance
              </Text>
            )}
          </View>
        )}
      </ScrollView>

      {/* Sticky Bottom Button */}
      <View style={styles.bottomArea}>
        <TouchableOpacity
          style={[styles.createButton, !canCreate && styles.createButtonDisabled]}
          onPress={handleCreatePress}
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

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Confirm Match</Text>
            <Text style={styles.modalSubtitle}>
              You are about to create a match with the following stakes:
            </Text>

            <View style={styles.modalDetails}>
              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>NFT</Text>
                <Text style={styles.modalDetailValue} numberOfLines={1}>
                  {selectedNft?.name ?? "None"}
                </Text>
              </View>
              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>SKR Wager</Text>
                <Text style={styles.modalDetailValue}>{wagerAmount} SKR</Text>
              </View>
            </View>

            {wagerAmount > 0 && (
              <Text style={styles.modalWarning}>
                Your SKR tokens will be locked until the match is settled.
              </Text>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={handleConfirmCreate}
                activeOpacity={0.8}
              >
                <Text style={styles.modalConfirmText}>Confirm & Create</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowConfirm(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minWidth: 60,
  },
  backArrow: {
    color: GameColors.primary,
    fontSize: 18,
    fontFamily: "Inter_500Medium",
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

  // Balance card
  balanceCard: {
    backgroundColor: GameColors.cardBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: GameColors.accent + "30",
    padding: 20,
    marginBottom: 24,
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  balanceItem: {
    flex: 1,
    alignItems: "center",
  },
  balanceCurrencyLabel: {
    color: GameColors.textSecondary,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginBottom: 4,
  },
  balanceAmount: {
    color: GameColors.accent,
    fontSize: 32,
    fontFamily: "Inter_700Bold",
  },
  balanceAmountSmall: {
    color: GameColors.textPrimary,
    fontSize: 24,
    fontFamily: "Inter_700Bold",
  },
  balanceSuffix: {
    color: GameColors.textSecondary,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },
  balanceDivider: {
    width: 1,
    height: 48,
    backgroundColor: GameColors.cardBorder,
    marginHorizontal: 16,
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
  summaryValueError: {
    color: GameColors.danger,
  },
  summaryWarning: {
    color: GameColors.danger,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginTop: 4,
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

  // Confirmation modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: GameColors.cardBackground,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: GameColors.cardBorder,
    padding: 28,
    width: "100%",
    maxWidth: 360,
  },
  modalTitle: {
    color: GameColors.textPrimary,
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    marginBottom: 8,
  },
  modalSubtitle: {
    color: GameColors.textSecondary,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginBottom: 20,
  },
  modalDetails: {
    backgroundColor: GameColors.boardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  modalDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  modalDetailLabel: {
    color: GameColors.textSecondary,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  modalDetailValue: {
    color: GameColors.textPrimary,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    maxWidth: "55%",
    textAlign: "right",
  },
  modalWarning: {
    color: GameColors.warning,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    marginBottom: 16,
  },
  modalButtons: {
    gap: 12,
  },
  modalConfirmButton: {
    backgroundColor: GameColors.accent,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  modalConfirmText: {
    color: GameColors.screenBackground,
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  modalCancelButton: {
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GameColors.textSecondary,
    alignItems: "center",
  },
  modalCancelText: {
    color: GameColors.textSecondary,
    fontSize: 16,
    fontFamily: "Inter_500Medium",
  },
});
