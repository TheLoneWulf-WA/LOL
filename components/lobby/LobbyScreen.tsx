import { View, Text, StyleSheet, TouchableOpacity, FlatList } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { GameColors } from "@/constants/Colors";
import { useMatchStore } from "@/stores/matchStore";
import WalletBadge from "./WalletBadge";
import MatchCard from "./MatchCard";

export default function LobbyScreen() {
  const router = useRouter();
  const lobbyMatches = useMatchStore((s) => s.lobbyMatches);
  const myMatches = useMatchStore((s) => s.myMatches);

  const navigateToMatch = (matchId: string) => {
    router.push({ pathname: "/match/[id]", params: { id: matchId } });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Land of Leal</Text>
        <WalletBadge />
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => router.push("/match/create")}
          activeOpacity={0.8}
        >
          <Text style={styles.createButtonText}>Create Match</Text>
        </TouchableOpacity>

        <View style={styles.secondaryActions}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push("/collection")}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>Collection</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push("/profile")}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>Profile</Text>
          </TouchableOpacity>
        </View>
      </View>

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

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Open Matches</Text>
        {lobbyMatches.length === 0 ? (
          <Text style={styles.emptyText}>No open matches. Create one!</Text>
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
  title: {
    color: GameColors.textPrimary,
    fontSize: 24,
    fontFamily: "Inter_600SemiBold",
  },
  actions: {
    marginBottom: 24,
    gap: 12,
  },
  createButton: {
    backgroundColor: GameColors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  createButtonText: {
    color: "#fff",
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
  },
  secondaryActions: {
    flexDirection: "row",
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: GameColors.cardBackground,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: GameColors.cardBorder,
  },
  secondaryButtonText: {
    color: GameColors.textPrimary,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: GameColors.textSecondary,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  emptyText: {
    color: GameColors.textSecondary,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingVertical: 24,
  },
});
