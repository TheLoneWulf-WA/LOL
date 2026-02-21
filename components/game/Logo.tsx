import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  interpolateColor,
} from "react-native-reanimated";
import { GameColors } from "@/constants/Colors";

interface LogoProps {
  /** Size variant: "large" for splash/lobby header, "small" for inline */
  size?: "large" | "small";
  /** Whether to animate the shimmer effect */
  animated?: boolean;
}

export default function Logo({ size = "large", animated = true }: LogoProps) {
  const shimmer = useSharedValue(0);
  const glow = useSharedValue(0);

  useEffect(() => {
    if (!animated) return;

    // Continuous shimmer cycling
    shimmer.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );

    // Subtle glow pulse
    glow.value = withRepeat(
      withSequence(
        withDelay(
          500,
          withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) })
        ),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, [animated]);

  const titleStyle = useAnimatedStyle(() => {
    const color = interpolateColor(
      shimmer.value,
      [0, 0.5, 1],
      [GameColors.brandPurple, GameColors.accent, GameColors.brandPurpleLight]
    );
    return { color };
  });

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.3 + glow.value * 0.4,
    transform: [{ scale: 1 + glow.value * 0.05 }],
  }));

  const isLarge = size === "large";

  return (
    <View style={styles.container}>
      {/* Glow backdrop */}
      {animated && (
        <Animated.View
          style={[
            styles.glowBackdrop,
            isLarge ? styles.glowLarge : styles.glowSmall,
            glowStyle,
          ]}
        />
      )}

      {/* Main title */}
      <Animated.Text
        style={[
          isLarge ? styles.titleLarge : styles.titleSmall,
          animated ? titleStyle : { color: GameColors.brandPurple },
        ]}
      >
        Land of Leal
      </Animated.Text>

      {/* Subtitle tagline (large only) */}
      {isLarge && (
        <Text style={styles.subtitle}>Match. Battle. Conquer.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  glowBackdrop: {
    position: "absolute",
    borderRadius: 100,
    backgroundColor: GameColors.glowPurple,
  },
  glowLarge: {
    width: 260,
    height: 80,
  },
  glowSmall: {
    width: 160,
    height: 40,
  },
  titleLarge: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
    textAlign: "center",
  },
  titleSmall: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  subtitle: {
    color: GameColors.textSecondary,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginTop: 6,
  },
});
