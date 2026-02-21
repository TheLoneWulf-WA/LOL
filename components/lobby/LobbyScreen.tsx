import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { GameColors } from "@/constants/Colors";
import { useMatchStore } from "@/stores/matchStore";
import { useMatchDiscovery } from "@/hooks/useMatchDiscovery";
import WalletBadge from "./WalletBadge";
import MatchCard from "./MatchCard";
import Logo from "@/components/game/Logo";

export default function LobbyScreen() {
  const router = useRouter();
  const lobbyMatches = useMatchStore((s) => s.lobbyMatches);
  const myMatches = useMatchStore((s) => s.myMatches);
  const { isLoading, refresh } = useMatchDiscovery();
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  const navigateToMatch = (matchId: string) => {
    router.push({ pathname: "/match/[id]", params: { id: matchId } });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refresh}
            tintColor={GameColors.accent}
            colors={[GameColors.accent]}
          />
        }
      >
        {/* Decorative Header */}
        <View style={styles.headerArea}>
          <View style={styles.headerDecoration}>
            <View style={styles.headerGlowLeft} />
            <View style={styles.headerGlowRight} />
          </View>
          <View style={styles.headerTop}>
            <Logo size="small" animated />
            <WalletBadge />
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => router.push("/match/create")}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonIcon}>{"  "}</Text>
            <Text style={styles.createButtonText}>Create Match</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickPlayButton}
            onPress={() => navigateToMatch(String(Date.now()))}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonIcon}>{"  "}</Text>
            <Text style={styles.quickPlayButtonText}>
              Quick Play (Practice)
            </Text>
          </TouchableOpacity>

          <View style={styles.secondaryActions}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.push("/collection")}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonIcon}>{""}</Text>
              <Text style={styles.secondaryButtonText}>Collection</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.push("/profile")}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonIcon}>{""}</Text>
              <Text style={styles.secondaryButtonText}>Profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* How to Play */}
        <TouchableOpacity
          style={styles.howToPlayToggle}
          onPress={() => setShowHowToPlay(!showHowToPlay)}
          activeOpacity={0.7}
        >
          <Text style={styles.howToPlayToggleIcon}>{"?"}</Text>
          <Text style={styles.howToPlayToggleText}>How to Play</Text>
          <Text style={styles.howToPlayChevron}>
            {showHowToPlay ? "\u25B2" : "\u25BC"}
          </Text>
        </TouchableOpacity>

        {showHowToPlay && (
          <View style={styles.howToPlayCard}>
            <View style={styles.howToPlayStep}>
              <Text style={styles.stepNumber}>1</Text>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Swap Tiles</Text>
                <Text style={styles.stepDesc}>
                  Tap two adjacent tiles to swap them and match 3 or more of the
                  same element in a row or column.
                </Text>
              </View>
            </View>
            <View style={styles.howToPlayStep}>
              <Text style={styles.stepNumber}>2</Text>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Build Combos</Text>
                <Text style={styles.stepDesc}>
                  Chain matches together for combo multipliers. Cascading matches
                  score bonus points!
                </Text>
              </View>
            </View>
            <View style={styles.howToPlayStep}>
              <Text style={styles.stepNumber}>3</Text>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Beat Your Opponent</Text>
                <Text style={styles.stepDesc}>
                  Both players get the same board. Score higher in 20 moves to
                  win NFTs and SKR tokens!
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* My Matches */}
        {myMatches.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>My Matches</Text>
            <FlatList
              data={myMatches}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <MatchCard
                  match={item}
                  onPress={() => navigateToMatch(item.id)}
                />
              )}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              scrollEnabled={false}
            />
          </View>
        )}

        {/* Open Matches */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Open Matches</Text>
            {isLoading && (
              <ActivityIndicator size="small" color={GameColors.accent} />
            )}
          </View>
          {lobbyMatches.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>{"\u2694\uFE0F"}</Text>
              <Text style={styles.emptyTitle}>
                {isLoading ? "Searching for matches..." : "No Open Matches"}
              </Text>
              <Text style={styles.emptyText}>
                {isLoading
                  ? "Looking for opponents in the realm..."
                  : "Be the first to create a match and challenge an opponent!"}
              </Text>
              {!isLoading && (
                <TouchableOpacity
                  style={styles.emptyCreateButton}
                  onPress={() => router.push("/match/create")}
                  activeOpacity={0.8}
                >
                  <Text style={styles.emptyCreateButtonText}>
                    Create a Match
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <FlatList
              data={lobbyMatches}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <MatchCard
                  match={item}
                  onPress={() => navigateToMatch(item.id)}
                />
              )}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              scrollEnabled={false}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GameColors.screenBackground,
  },
  scrollContent: {
    paddingBottom: 32,
  },

  // Header
  headerArea: {
    position: "relative",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
    marginBottom: 4,
  },
  headerDecoration: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  headerGlowLeft: {
    position: "absolute",
    top: -40,
    left: -20,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: GameColors.glowPurple,
    opacity: 0.4,
  },
  headerGlowRight: {
    position: "absolute",
    top: -30,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: GameColors.glowAccent,
    opacity: 0.5,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  // Action Buttons
  actions: {
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  createButton: {
    backgroundColor: GameColors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: GameColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  createButtonText: {
    color: "#fff",
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  quickPlayButton: {
    backgroundColor: GameColors.secondary,
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: GameColors.accent,
  },
  quickPlayButtonText: {
    color: GameColors.accent,
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  buttonIcon: {
    fontSize: 18,
  },
  secondaryActions: {
    flexDirection: "row",
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: GameColors.cardBackground,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: GameColors.cardBorder,
    gap: 4,
  },
  secondaryButtonIcon: {
    fontSize: 20,
  },
  secondaryButtonText: {
    color: GameColors.textPrimary,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },

  // How to Play
  howToPlayToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: GameColors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GameColors.cardBorder,
    gap: 8,
  },
  howToPlayToggleIcon: {
    color: GameColors.brandPurple,
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    width: 24,
    height: 24,
    lineHeight: 24,
    textAlign: "center",
    backgroundColor: GameColors.glowPurple,
    borderRadius: 12,
    overflow: "hidden",
  },
  howToPlayToggleText: {
    color: GameColors.textPrimary,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  howToPlayChevron: {
    color: GameColors.textSecondary,
    fontSize: 10,
  },
  howToPlayCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: GameColors.cardBackground,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: GameColors.brandPurple + "40",
    padding: 16,
    gap: 16,
  },
  howToPlayStep: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  stepNumber: {
    color: GameColors.brandPurple,
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    width: 28,
    height: 28,
    lineHeight: 28,
    textAlign: "center",
    backgroundColor: GameColors.glowPurple,
    borderRadius: 14,
    overflow: "hidden",
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    color: GameColors.textPrimary,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 2,
  },
  stepDesc: {
    color: GameColors.textSecondary,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },

  // Sections
  section: {
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    color: GameColors.textSecondary,
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 12,
  },

  // Empty State
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 24,
    backgroundColor: GameColors.cardBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: GameColors.cardBorder,
    borderStyle: "dashed",
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 12,
  },
  emptyTitle: {
    color: GameColors.textPrimary,
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
    marginBottom: 6,
  },
  emptyText: {
    color: GameColors.textSecondary,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 260,
    marginBottom: 16,
  },
  emptyCreateButton: {
    backgroundColor: GameColors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  emptyCreateButtonText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});
