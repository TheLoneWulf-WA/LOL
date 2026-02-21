import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useGameStore } from "@/stores/gameStore";
import { GameColors } from "@/constants/Colors";

export default function ScoreBar() {
  const score = useGameStore((s) => s.score);
  const movesRemaining = useGameStore((s) => s.movesRemaining);
  const combo = useGameStore((s) => s.combo);

  const scoreScale = useSharedValue(1);
  const comboOpacity = useSharedValue(0);
  const comboScale = useSharedValue(0.5);

  // Animate score bump when score changes
  useEffect(() => {
    if (score > 0) {
      scoreScale.value = withSequence(
        withTiming(1.2, { duration: 100 }),
        withSpring(1, { damping: 10, stiffness: 200 })
      );
    }
  }, [score]);

  // Animate combo indicator
  useEffect(() => {
    if (combo > 1) {
      comboOpacity.value = withTiming(1, { duration: 150 });
      comboScale.value = withSequence(
        withTiming(1.3, { duration: 100 }),
        withSpring(1, { damping: 10 })
      );
    } else {
      comboOpacity.value = withTiming(0, { duration: 300 });
      comboScale.value = 0.5;
    }
  }, [combo]);

  const scoreAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scoreScale.value }],
  }));

  const comboAnimatedStyle = useAnimatedStyle(() => ({
    opacity: comboOpacity.value,
    transform: [{ scale: comboScale.value }],
  }));

  const movesColor =
    movesRemaining <= 3
      ? GameColors.danger
      : movesRemaining <= 7
        ? GameColors.warning
        : GameColors.textPrimary;

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.label}>Score</Text>
        <Animated.Text style={[styles.scoreValue, scoreAnimatedStyle]}>
          {score}
        </Animated.Text>
      </View>

      <Animated.View style={[styles.comboSection, comboAnimatedStyle]}>
        <Text style={styles.comboText}>Combo x{combo}!</Text>
      </Animated.View>

      <View style={styles.section}>
        <Text style={styles.label}>Moves</Text>
        <Text style={[styles.movesValue, { color: movesColor }]}>
          {movesRemaining}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: GameColors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GameColors.cardBorder,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  section: {
    alignItems: "center",
    minWidth: 70,
  },
  label: {
    color: GameColors.textSecondary,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginBottom: 2,
  },
  scoreValue: {
    color: GameColors.accent,
    fontSize: 28,
    fontFamily: "Inter_700Bold",
  },
  movesValue: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
  },
  comboSection: {
    alignItems: "center",
    justifyContent: "center",
  },
  comboText: {
    color: GameColors.primary,
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
});
