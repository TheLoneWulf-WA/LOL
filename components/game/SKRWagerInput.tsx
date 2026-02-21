import React from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { GameColors } from "@/constants/Colors";

interface SKRWagerInputProps {
  value: number;
  onChange: (value: number) => void;
  maxBalance: number;
}

const QUICK_AMOUNTS = [10, 50, 100] as const;

export default function SKRWagerInput({
  value,
  onChange,
  maxBalance,
}: SKRWagerInputProps) {
  const handleTextChange = (text: string) => {
    // Allow empty string so user can clear the input
    if (text === "") {
      onChange(0);
      return;
    }
    const parsed = parseFloat(text);
    if (isNaN(parsed)) return;
    const clamped = Math.min(Math.max(parsed, 0), maxBalance);
    onChange(clamped);
  };

  const handleQuickSelect = (amount: number) => {
    const clamped = Math.min(amount, maxBalance);
    onChange(clamped);
  };

  const handleMax = () => {
    onChange(maxBalance);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>SKR Wager</Text>
        <Text style={styles.balance}>
          Available: {maxBalance.toFixed(0)} SKR
        </Text>
      </View>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={value > 0 ? String(value) : ""}
          onChangeText={handleTextChange}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor={GameColors.textSecondary}
        />
        <Text style={styles.inputSuffix}>SKR</Text>
      </View>

      <View style={styles.quickButtons}>
        {QUICK_AMOUNTS.map((amount) => (
          <TouchableOpacity
            key={amount}
            style={[
              styles.quickButton,
              value === amount && styles.quickButtonActive,
            ]}
            onPress={() => handleQuickSelect(amount)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.quickButtonText,
                value === amount && styles.quickButtonTextActive,
              ]}
            >
              {amount}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[
            styles.quickButton,
            value === maxBalance && maxBalance > 0 && styles.quickButtonActive,
          ]}
          onPress={handleMax}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.quickButtonText,
              value === maxBalance &&
                maxBalance > 0 &&
                styles.quickButtonTextActive,
            ]}
          >
            MAX
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: GameColors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GameColors.cardBorder,
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  label: {
    color: GameColors.textPrimary,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  balance: {
    color: GameColors.textSecondary,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GameColors.screenBackground,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: GameColors.cardBorder,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    color: GameColors.textPrimary,
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
    paddingVertical: 12,
  },
  inputSuffix: {
    color: GameColors.textSecondary,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    marginLeft: 8,
  },
  quickButtons: {
    flexDirection: "row",
    gap: 8,
  },
  quickButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: GameColors.cardBorder,
    alignItems: "center",
  },
  quickButtonActive: {
    borderColor: GameColors.accent,
    backgroundColor: "rgba(255, 220, 0, 0.1)",
  },
  quickButtonText: {
    color: GameColors.textSecondary,
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  quickButtonTextActive: {
    color: GameColors.accent,
  },
});
