import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { useGameStore } from "@/stores/gameStore";
import { GameColors } from "@/constants/Colors";
import { INITIAL_MOVES } from "@/lib/game/constants";

/** Maximum number of floating score items visible at once. */
const MAX_FLOATERS = 5;

interface FloatingScore {
  id: number;
  points: number;
}

export default function ScoreBar() {
  const score = useGameStore((s) => s.score);
  const movesRemaining = useGameStore((s) => s.movesRemaining);
  const combo = useGameStore((s) => s.combo);
  const lastScoreGain = useGameStore((s) => s.lastScoreGain);

  const scoreScale = useSharedValue(1);
  const comboOpacity = useSharedValue(0);
  const comboScale = useSharedValue(0.5);

  // Floating score text
  const floaterIdRef = useRef(0);
  const [floaters, setFloaters] = React.useState<FloatingScore[]>([]);

  // Animate score bump when score changes
  useEffect(() => {
    if (score > 0) {
      scoreScale.value = withSequence(
        withTiming(1.3, { duration: 80 }),
        withSpring(1, { damping: 8, stiffness: 250 })
      );
    }
  }, [score]);

  // Animate combo indicator
  useEffect(() => {
    if (combo > 1) {
      comboOpacity.value = withTiming(1, { duration: 100 });
      comboScale.value = withSequence(
        withTiming(1.5, { duration: 80 }),
        withSpring(1, { damping: 6, stiffness: 200 })
      );
    } else {
      comboOpacity.value = withTiming(0, { duration: 300 });
      comboScale.value = 0.5;
    }
  }, [combo]);

  // Spawn floating score text when points are gained
  useEffect(() => {
    if (lastScoreGain > 0) {
      const id = ++floaterIdRef.current;
      setFloaters((prev) => {
        const next = [...prev, { id, points: lastScoreGain }];
        // Limit visible floaters
        if (next.length > MAX_FLOATERS) return next.slice(-MAX_FLOATERS);
        return next;
      });
      // Remove after animation
      setTimeout(() => {
        setFloaters((prev) => prev.filter((f) => f.id !== id));
      }, 900);
    }
  }, [lastScoreGain, score]); // score included to trigger on each distinct gain

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

  const movesFraction = Math.max(0, movesRemaining / INITIAL_MOVES);

  return (
    <View style={styles.container}>
      {/* Score section with floating text */}
      <View style={styles.section}>
        <Text style={styles.label}>Score</Text>
        <View style={styles.scoreWrapper}>
          <Animated.Text style={[styles.scoreValue, scoreAnimatedStyle]}>
            {score}
          </Animated.Text>
          {/* Floating "+points" */}
          {floaters.map((f) => (
            <FloatingPointsText key={f.id} points={f.points} />
          ))}
        </View>
      </View>

      {/* Combo multiplier section */}
      <Animated.View style={[styles.comboSection, comboAnimatedStyle]}>
        <Text style={styles.comboLabel}>COMBO</Text>
        <Text style={styles.comboText}>x{combo}</Text>
      </Animated.View>

      {/* Moves section with progress bar */}
      <View style={styles.section}>
        <Text style={styles.label}>Moves</Text>
        <Text style={[styles.movesValue, { color: movesColor }]}>
          {movesRemaining}
        </Text>
        <View style={styles.movesBarOuter}>
          <View
            style={[
              styles.movesBarInner,
              {
                width: `${movesFraction * 100}%`,
                backgroundColor:
                  movesRemaining <= 3
                    ? GameColors.danger
                    : movesRemaining <= 7
                      ? GameColors.warning
                      : GameColors.success,
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Floating "+N" text component
// ---------------------------------------------------------------------------

function FloatingPointsText({ points }: { points: number }) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(0.5);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 10, stiffness: 300 });
    translateY.value = withTiming(-50, {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });
    opacity.value = withDelay(
      400,
      withTiming(0, { duration: 400, easing: Easing.in(Easing.ease) })
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.Text style={[styles.floatingPoints, animStyle]}>
      +{points}
    </Animated.Text>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

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
  scoreWrapper: {
    position: "relative",
    alignItems: "center",
  },
  scoreValue: {
    color: GameColors.accent,
    fontSize: 28,
    fontFamily: "Inter_700Bold",
  },
  floatingPoints: {
    position: "absolute",
    top: -4,
    color: GameColors.success,
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  movesValue: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
  },
  movesBarOuter: {
    width: 60,
    height: 4,
    borderRadius: 2,
    backgroundColor: GameColors.cardBorder,
    marginTop: 4,
    overflow: "hidden",
  },
  movesBarInner: {
    height: "100%",
    borderRadius: 2,
  },
  comboSection: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(233, 69, 96, 0.15)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: GameColors.primary + "40",
  },
  comboLabel: {
    color: GameColors.primary,
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
  },
  comboText: {
    color: GameColors.primary,
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
});
