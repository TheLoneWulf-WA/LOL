import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEmbeddedSolanaWallet } from "@privy-io/expo";
import { PublicKey } from "@solana/web3.js";

import { GameColors } from "@/constants/Colors";
import { useGameStore } from "@/stores/gameStore";
import { useMatchStore } from "@/stores/matchStore";
import { useWalletStore, NFTAsset } from "@/stores/walletStore";
import Board from "@/components/game/Board";
import ScoreBar from "@/components/game/ScoreBar";
import GameOverView from "@/components/game/GameOverView";
import WaitingView from "@/components/game/WaitingView";
import ResultView from "@/components/game/ResultView";
import { fetchMatchAccount } from "@/lib/anchor/client";
import {
  buildJoinMatchTransaction,
  buildSubmitResultTransaction,
} from "@/lib/anchor/client";
import { getMatchPDA } from "@/lib/anchor/pda";
import { sendTransaction } from "@/lib/solana/wallet";
import { SKR_MINT } from "@/lib/solana/skr";
import type { OnChainMatch } from "@/lib/game/types";

// ---------------------------------------------------------------------------
// Phase type for the match lifecycle
// ---------------------------------------------------------------------------
type MatchPhase =
  | "loading"
  | "waiting"
  | "join_prompt"
  | "joining"
  | "playing"
  | "submitted"
  | "settled"
  | "error";

/**
 * Return true if the match ID looks like a Quick Play (practice) ID.
 * Quick Play IDs are purely numeric timestamps from Date.now().
 */
function isPracticeId(id: string): boolean {
  return /^\d+$/.test(id);
}

export default function MatchScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { wallets } = useEmbeddedSolanaWallet();
  const wallet = wallets?.[0];

  // Game store
  const board = useGameStore((s) => s.board);
  const movesRemaining = useGameStore((s) => s.movesRemaining);
  const score = useGameStore((s) => s.score);
  const startGame = useGameStore((s) => s.startGame);

  // Match store
  const currentMatch = useMatchStore((s) => s.currentMatch);
  const setCurrentMatch = useMatchStore((s) => s.setCurrentMatch);
  const isSubmitting = useMatchStore((s) => s.isSubmitting);
  const setSubmitting = useMatchStore((s) => s.setSubmitting);
  const isJoining = useMatchStore((s) => s.isJoining);
  const setJoining = useMatchStore((s) => s.setJoining);

  // Wallet store
  const nfts = useWalletStore((s) => s.nfts);

  // Local state
  const [phase, setPhase] = useState<MatchPhase>("loading");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [scoreSubmitted, setScoreSubmitted] = useState(false);

  const hasStartedGame = useRef(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Determine if this is a practice match
  const isPractice = id ? isPracticeId(id) : false;
  const myPubkey = wallet?.publicKey ?? null;

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /** Fetch the on-chain match and update currentMatch + phase. */
  const refreshMatch = useCallback(async (): Promise<OnChainMatch | null> => {
    if (!currentMatch || !id) return null;

    try {
      const creatorPubkey = new PublicKey(currentMatch.creator);
      const [matchPDA] = getMatchPDA(creatorPubkey, currentMatch.id);
      const onChain = await fetchMatchAccount(matchPDA);

      if (onChain) {
        setCurrentMatch(onChain);
      }
      return onChain;
    } catch (err) {
      console.warn("Failed to refresh match:", err);
      return null;
    }
  }, [currentMatch, id, setCurrentMatch]);

  // ---------------------------------------------------------------------------
  // Phase 0: Initial load — determine the phase
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!id) return;

    // Practice match — skip all on-chain logic
    if (isPractice) {
      setPhase("playing");
      return;
    }

    // On-chain match — check if we already have it in the store
    // (e.g., just created or navigated from lobby)
    if (currentMatch && currentMatch.id === id) {
      determinePhase(currentMatch);
      return;
    }

    // If we navigated here with a match ID but no store data,
    // try to find the match on-chain by scanning all matches for this ID.
    // (We need the creator pubkey to derive the PDA, which we don't have yet.)
    // For now, set an error — the lobby/create flow should always set currentMatch.
    setPhase("error");
    setErrorMsg(
      "Match data not found. Please navigate from the lobby or create screen.",
    );
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Map an OnChainMatch status to a MatchPhase based on current player role. */
  const determinePhase = useCallback(
    (match: OnChainMatch) => {
      switch (match.status) {
        case "waiting":
          if (myPubkey && match.creator === myPubkey) {
            // I'm the creator — wait for opponent
            setPhase("waiting");
          } else {
            // I'm the opponent — show join prompt
            setPhase("join_prompt");
          }
          break;

        case "playing":
          setPhase("playing");
          break;

        case "settled":
          setPhase("settled");
          break;

        case "cancelled":
          setPhase("error");
          setErrorMsg("This match has been cancelled.");
          break;

        default:
          // "submitted" is not an on-chain status; it's our local tracking.
          // If Active on-chain and we already submitted, show submitted phase.
          if (scoreSubmitted) {
            setPhase("submitted");
          } else {
            setPhase("playing");
          }
          break;
      }
    },
    [myPubkey, scoreSubmitted],
  );

  // Re-determine phase when currentMatch changes (from polling)
  useEffect(() => {
    if (isPractice || !currentMatch || currentMatch.id !== id) return;
    determinePhase(currentMatch);
  }, [currentMatch, isPractice, id, determinePhase]);

  // ---------------------------------------------------------------------------
  // Start the game when entering playing phase
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (phase !== "playing") return;
    if (hasStartedGame.current) return;
    hasStartedGame.current = true;

    if (isPractice) {
      const seed = id && !isNaN(Number(id)) ? Number(id) : Date.now();
      startGame(seed);
    } else if (currentMatch) {
      startGame(currentMatch.boardSeed);
    }
  }, [phase, isPractice, id, currentMatch, startGame]);

  // ---------------------------------------------------------------------------
  // Polling
  // ---------------------------------------------------------------------------
  useEffect(() => {
    // Only poll during waiting and submitted phases
    if (phase !== "waiting" && phase !== "submitted") {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    pollRef.current = setInterval(async () => {
      const updated = await refreshMatch();
      if (!updated) return;

      if (phase === "waiting" && updated.status === "playing") {
        // Opponent joined — transition to playing
        setPhase("playing");
      }

      if (phase === "submitted" && updated.status === "settled") {
        // Both scores in — show results
        setPhase("settled");
      }
    }, 5000);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [phase, refreshMatch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Join match flow
  // ---------------------------------------------------------------------------
  const handleJoinMatch = async () => {
    if (!currentMatch || !wallet?.getProvider || !myPubkey) {
      Alert.alert("Error", "No wallet available.");
      return;
    }

    // For MVP, pick the first available NFT
    const nftToStake: NFTAsset | undefined = nfts[0];
    if (!nftToStake) {
      Alert.alert("No NFT", "You need an NFT to join this match.");
      return;
    }

    setJoining(true);
    setPhase("joining");

    try {
      const provider = await wallet.getProvider();
      if (!provider) throw new Error("Failed to get wallet provider");

      const opponentPubkey = new PublicKey(myPubkey);
      const creatorPubkey = new PublicKey(currentMatch.creator);
      const [matchPDA] = getMatchPDA(creatorPubkey, currentMatch.id);
      const nftMint = new PublicKey(nftToStake.mint);

      const tx = buildJoinMatchTransaction(
        opponentPubkey,
        matchPDA,
        creatorPubkey,
        currentMatch.id,
        nftMint,
        SKR_MINT,
        currentMatch.skrWager,
      );

      await sendTransaction(
        provider as unknown as Parameters<typeof sendTransaction>[0],
        tx,
        opponentPubkey,
      );

      // Refresh match to get updated state
      const updated = await refreshMatch();
      if (updated) {
        setPhase("playing");
      }
    } catch (err: any) {
      Alert.alert("Join Failed", err?.message ?? String(err));
      setPhase("join_prompt");
    } finally {
      setJoining(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Score submission
  // ---------------------------------------------------------------------------
  const handleSubmitScore = async () => {
    if (!currentMatch || !wallet?.getProvider || !myPubkey) {
      Alert.alert("Error", "No wallet available.");
      return;
    }

    if (!currentMatch.opponent || !currentMatch.opponentNftMint) {
      Alert.alert("Error", "Match data incomplete — no opponent found.");
      return;
    }

    setSubmitting(true);

    try {
      const provider = await wallet.getProvider();
      if (!provider) throw new Error("Failed to get wallet provider");

      const playerPubkey = new PublicKey(myPubkey);
      const creatorPubkey = new PublicKey(currentMatch.creator);
      const opponentPubkey = new PublicKey(currentMatch.opponent);
      const [matchPDA] = getMatchPDA(creatorPubkey, currentMatch.id);
      const creatorNftMint = new PublicKey(currentMatch.creatorNftMint);
      const opponentNftMint = new PublicKey(currentMatch.opponentNftMint);

      const tx = buildSubmitResultTransaction(
        playerPubkey,
        matchPDA,
        score,
        creatorPubkey,
        opponentPubkey,
        creatorNftMint,
        opponentNftMint,
        SKR_MINT,
      );

      await sendTransaction(
        provider as unknown as Parameters<typeof sendTransaction>[0],
        tx,
        playerPubkey,
      );

      setScoreSubmitted(true);

      // Check if both scores are now in (we might be the second submitter)
      const updated = await refreshMatch();
      if (updated?.status === "settled") {
        setPhase("settled");
      } else {
        setPhase("submitted");
      }
    } catch (err: any) {
      Alert.alert("Submit Failed", err?.message ?? String(err));
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------
  const isGameOver = board.length > 0 && movesRemaining <= 0;

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Land of Leal</Text>
      <View style={{ width: 40 }} />
    </View>
  );

  // Loading phase
  if (phase === "loading") {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={GameColors.accent} />
          <Text style={styles.loadingText}>Loading match...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error phase
  if (phase === "error") {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>{errorMsg}</Text>
          <TouchableOpacity
            style={styles.lobbyButton}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Text style={styles.lobbyButtonText}>Back to Lobby</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Waiting phase (creator waiting for opponent)
  if (phase === "waiting" && currentMatch) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <WaitingView match={currentMatch} />
      </SafeAreaView>
    );
  }

  // Join prompt phase (opponent viewing a waiting match)
  if (phase === "join_prompt" && currentMatch) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <View style={styles.centerContent}>
          <View style={styles.joinCard}>
            <Text style={styles.joinTitle}>Join Match?</Text>
            <Text style={styles.joinSubtitle}>
              Match #{currentMatch.id}
            </Text>

            <View style={styles.joinDetails}>
              <View style={styles.joinDetailRow}>
                <Text style={styles.joinDetailLabel}>SKR Wager</Text>
                <Text style={styles.joinDetailValue}>
                  {currentMatch.skrWager} SKR
                </Text>
              </View>
              <View style={styles.joinDetailRow}>
                <Text style={styles.joinDetailLabel}>NFT Required</Text>
                <Text style={styles.joinDetailValue}>
                  {nfts.length > 0 ? nfts[0].name : "None available"}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.joinButton,
                nfts.length === 0 && styles.joinButtonDisabled,
              ]}
              onPress={handleJoinMatch}
              disabled={nfts.length === 0}
              activeOpacity={0.8}
            >
              <Text style={styles.joinButtonText}>Join Match</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelJoinButton}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelJoinText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Joining phase (transaction processing)
  if (phase === "joining") {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={GameColors.accent} />
          <Text style={styles.loadingText}>Joining match...</Text>
          <Text style={styles.loadingSubtext}>
            Processing transaction on Solana
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Submitted phase (waiting for opponent's score)
  if (phase === "submitted" && currentMatch) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <View style={styles.centerContent}>
          <View style={styles.submittedCard}>
            <Text style={styles.submittedTitle}>Score Submitted!</Text>
            <Text style={styles.submittedScore}>{score}</Text>
            <ActivityIndicator
              size="large"
              color={GameColors.accent}
              style={{ marginVertical: 16 }}
            />
            <Text style={styles.submittedWaiting}>
              Waiting for opponent to submit their score...
            </Text>
            <Text style={styles.submittedHint}>
              This screen will update automatically
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Settled phase (show results)
  if (phase === "settled" && currentMatch && myPubkey) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <ResultView match={currentMatch} currentPlayerPubkey={myPubkey} />
      </SafeAreaView>
    );
  }

  // Playing phase — render the game board
  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}

      <ScoreBar />

      <View style={styles.boardArea}>
        <Board />
      </View>

      {isGameOver && (
        <GameOverView
          isPractice={isPractice}
          onSubmitScore={handleSubmitScore}
          isSubmitting={isSubmitting}
        />
      )}
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
    paddingTop: 8,
    marginBottom: 16,
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
  boardArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  loadingText: {
    color: GameColors.textPrimary,
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    marginTop: 16,
  },
  loadingSubtext: {
    color: GameColors.textSecondary,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginTop: 8,
  },
  errorText: {
    color: GameColors.danger,
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    marginBottom: 24,
  },
  lobbyButton: {
    backgroundColor: GameColors.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: "center",
  },
  lobbyButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },

  // Join prompt styles
  joinCard: {
    backgroundColor: GameColors.cardBackground,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: GameColors.cardBorder,
    padding: 28,
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
  },
  joinTitle: {
    color: GameColors.textPrimary,
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  joinSubtitle: {
    color: GameColors.textSecondary,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    marginBottom: 20,
  },
  joinDetails: {
    width: "100%",
    backgroundColor: GameColors.boardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  joinDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  joinDetailLabel: {
    color: GameColors.textSecondary,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  joinDetailValue: {
    color: GameColors.textPrimary,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    maxWidth: "50%",
    textAlign: "right",
  },
  joinButton: {
    width: "100%",
    backgroundColor: GameColors.success,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 12,
  },
  joinButtonDisabled: {
    backgroundColor: GameColors.cardBorder,
  },
  joinButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  cancelJoinButton: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GameColors.textSecondary,
    alignItems: "center",
  },
  cancelJoinText: {
    color: GameColors.textSecondary,
    fontSize: 16,
    fontFamily: "Inter_500Medium",
  },

  // Submitted waiting styles
  submittedCard: {
    backgroundColor: GameColors.cardBackground,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: GameColors.success,
    padding: 28,
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
  },
  submittedTitle: {
    color: GameColors.success,
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    marginBottom: 8,
  },
  submittedScore: {
    color: GameColors.accent,
    fontSize: 48,
    fontFamily: "Inter_700Bold",
    marginBottom: 8,
  },
  submittedWaiting: {
    color: GameColors.textPrimary,
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    marginBottom: 8,
  },
  submittedHint: {
    color: GameColors.textSecondary,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
});
