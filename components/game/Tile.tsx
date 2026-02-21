import React, { useEffect, useRef } from "react";
import { StyleSheet, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";
import { Tile as TileData } from "@/lib/game/types";
import { TILE_COLORS } from "@/lib/game/constants";
import { GameColors } from "@/constants/Colors";
import TileIcon from "./TileIcon";

interface TileProps {
  tile: TileData;
  row: number;
  col: number;
  tileSize: number;
  onPress: () => void;
  isSelected: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function Tile({
  tile,
  row,
  col,
  tileSize,
  onPress,
  isSelected,
}: TileProps) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(1);
  const selectionScale = useSharedValue(1);
  const prevTileId = useRef(tile.id);

  // Entrance animation — new tile drops in with a "pop"
  useEffect(() => {
    if (tile.id !== prevTileId.current) {
      // New tile replacing an old one — pop entrance
      scale.value = 0;
      opacity.value = 0;
      scale.value = withDelay(
        50,
        withSequence(
          withTiming(1.15, { duration: 100, easing: Easing.out(Easing.back(2)) }),
          withSpring(1, { damping: 12, stiffness: 200 })
        )
      );
      opacity.value = withDelay(
        50,
        withTiming(1, { duration: 80 })
      );
      prevTileId.current = tile.id;
    } else if (scale.value === 0) {
      // Initial board generation
      scale.value = withSpring(1, {
        damping: 12,
        stiffness: 200,
      });
      opacity.value = 1;
    }
  }, [tile.id]);

  // Selection pulsing animation
  useEffect(() => {
    if (isSelected) {
      selectionScale.value = withRepeat(
        withSequence(
          withTiming(1.1, {
            duration: 400,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(0.95, {
            duration: 400,
            easing: Easing.inOut(Easing.ease),
          })
        ),
        -1, // infinite
        true
      );
    } else {
      cancelAnimation(selectionScale);
      selectionScale.value = withSpring(1, { damping: 15 });
    }
  }, [isSelected]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value * selectionScale.value }],
    opacity: opacity.value,
  }));

  const tileColor = TILE_COLORS[tile.type];
  const innerSize = tileSize - 2; // Slightly larger tiles with gaps handled by Board

  return (
    <AnimatedPressable
      onPress={onPress}
      style={[
        styles.tile,
        {
          width: innerSize,
          height: innerSize,
          borderRadius: innerSize * 0.22,
          backgroundColor: tileColor + "18",
          borderColor: isSelected ? "#FFFFFF" : tileColor + "55",
          borderWidth: isSelected ? 2 : 1.5,
          // Subtle inner glow from the tile color
          shadowColor: isSelected ? "#FFFFFF" : tileColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: isSelected ? 0.5 : 0.25,
          shadowRadius: isSelected ? 8 : 4,
          elevation: isSelected ? 8 : 3,
        },
        animatedStyle,
      ]}
    >
      <TileIcon type={tile.type} size={innerSize} />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
});
