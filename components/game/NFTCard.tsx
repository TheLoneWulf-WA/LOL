import React from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { NFTAsset } from "@/stores/walletStore";
import { GameColors } from "@/constants/Colors";

interface NFTCardProps {
  nft: NFTAsset;
  selected?: boolean;
  onPress?: () => void;
}

export default function NFTCard({ nft, selected, onPress }: NFTCardProps) {
  return (
    <TouchableOpacity
      style={[styles.card, selected && styles.cardSelected]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Image
        source={{ uri: nft.image }}
        style={styles.image}
        resizeMode="cover"
      />
      <Text style={styles.name} numberOfLines={1}>
        {nft.name}
      </Text>
    </TouchableOpacity>
  );
}

const CARD_SIZE = 96;

const styles = StyleSheet.create({
  card: {
    width: CARD_SIZE,
    backgroundColor: GameColors.cardBackground,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: GameColors.cardBorder,
    overflow: "hidden",
    alignItems: "center",
  },
  cardSelected: {
    borderColor: GameColors.accent,
  },
  image: {
    width: CARD_SIZE - 4, // account for border
    height: CARD_SIZE - 4,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  name: {
    color: GameColors.textPrimary,
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    paddingHorizontal: 6,
    paddingVertical: 6,
    textAlign: "center",
    width: "100%",
  },
});
