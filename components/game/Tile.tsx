import React, { useEffect } from "react";
import { StyleSheet, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
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

  // Entrance animation
  useEffect(() => {
    scale.value = 0;
    opacity.value = 1;
    scale.value = withSpring(1, {
      damping: 12,
      stiffness: 200,
    });
  }, [tile.id]);

  // Selection pulsing animation
  useEffect(() => {
    if (isSelected) {
      selectionScale.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 400, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.95, { duration: 400, easing: Easing.inOut(Easing.ease) })
        ),
        -1, // infinite
        true
      );
    } else {
      selectionScale.value = withSpring(1, { damping: 15 });
    }
  }, [isSelected]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value * selectionScale.value }],
    opacity: opacity.value,
  }));

  const tileColor = TILE_COLORS[tile.type];
  const innerSize = tileSize - 4; // 2px gap on each side

  return (
    <AnimatedPressable
      onPress={onPress}
      style={[
        styles.tile,
        {
          width: innerSize,
          height: innerSize,
          borderRadius: innerSize * 0.2,
          backgroundColor: GameColors.cellBackground,
          borderColor: isSelected ? "#FFFFFF" : tileColor + "40",
          borderWidth: isSelected ? 2 : 1,
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
