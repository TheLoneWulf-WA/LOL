import React from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { NFTAsset } from "@/stores/walletStore";
import { GameColors } from "@/constants/Colors";
import NFTCard from "./NFTCard";

interface NFTPickerProps {
  nfts: NFTAsset[];
  selectedNft: NFTAsset | null;
  onSelect: (nft: NFTAsset) => void;
  loading?: boolean;
}

export default function NFTPicker({
  nfts,
  selectedNft,
  onSelect,
  loading,
}: NFTPickerProps) {
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="small" color={GameColors.accent} />
        <Text style={styles.emptyText}>Loading NFTs...</Text>
      </View>
    );
  }

  if (nfts.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>No NFTs found</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={nfts}
      horizontal
      keyExtractor={(item) => item.id}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <NFTCard
          nft={item}
          selected={selectedNft?.id === item.id}
          onPress={() => onSelect(item)}
        />
      )}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  separator: {
    width: 10,
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    gap: 8,
  },
  emptyText: {
    color: GameColors.textSecondary,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
});
