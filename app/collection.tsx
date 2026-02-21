import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { GameColors } from "@/constants/Colors";
import { useWalletStore, NFTAsset } from "@/stores/walletStore";
import { useWalletBalances } from "@/hooks/useWalletBalances";
import NFTCard from "@/components/game/NFTCard";

const SCREEN_PADDING = 16;
const GRID_GAP = 12;
const NUM_COLUMNS = 2;
const CARD_WIDTH =
  (Dimensions.get("window").width - SCREEN_PADDING * 2 - GRID_GAP) /
  NUM_COLUMNS;

export default function CollectionScreen() {
  const router = useRouter();
  const { isLoading, refetch } = useWalletBalances();
  const nfts = useWalletStore((s) => s.nfts);
  const isLoadingNFTs = useWalletStore((s) => s.isLoadingNFTs);

  const handleRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const renderItem = useCallback(
    ({ item }: { item: NFTAsset }) => (
      <View style={styles.cardWrapper}>
        <NFTCard nft={item} />
      </View>
    ),
    [],
  );

  const keyExtractor = useCallback((item: NFTAsset) => item.id, []);

  const renderEmpty = () => {
    if (isLoadingNFTs || isLoading) {
      return null;
    }
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No NFTs Found</Text>
        <Text style={styles.emptyText}>
          Connect a wallet with NFTs to get started.
        </Text>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.countRow}>
      <Text style={styles.countText}>
        {nfts.length} {nfts.length === 1 ? "NFT" : "NFTs"}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>My Collection</Text>
        <View style={{ width: 40 }} />
      </View>

      {(isLoadingNFTs || isLoading) && nfts.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={GameColors.accent} />
          <Text style={styles.loadingText}>Loading collection...</Text>
        </View>
      ) : (
        <FlatList
          data={nfts}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          numColumns={NUM_COLUMNS}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
          refreshing={isLoadingNFTs}
          onRefresh={handleRefresh}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GameColors.screenBackground,
    padding: SCREEN_PADDING,
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
  countRow: {
    marginBottom: 16,
  },
  countText: {
    color: GameColors.textSecondary,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  listContent: {
    paddingBottom: 40,
    flexGrow: 1,
  },
  row: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
  cardWrapper: {
    width: CARD_WIDTH,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    color: GameColors.textSecondary,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 80,
  },
  emptyTitle: {
    color: GameColors.textPrimary,
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 8,
  },
  emptyText: {
    color: GameColors.textSecondary,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 32,
  },
});
