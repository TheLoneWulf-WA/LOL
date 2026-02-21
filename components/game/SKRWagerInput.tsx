import React, { useState } from "react";
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
  const [inputText, setInputText] = useState(value > 0 ? String(value) : "");
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleTextChange = (text: string) => {
    setInputText(text);

    // Allow empty string so user can clear the input
    if (text === "") {
      onChange(0);
      setValidationError(null);
      return;
    }

    const parsed = parseFloat(text);
    if (isNaN(parsed)) {
      setValidationError("Enter a valid number");
      return;
    }

    if (parsed < 0) {
      setValidationError("Wager must be positive");
      return;
    }

    if (parsed > maxBalance) {
      setValidationError(
        `Insufficient balance (${maxBalance.toFixed(0)} SKR available)`
      );
      // Still update the value but show the error
      onChange(parsed);
      return;
    }

    setValidationError(null);
    onChange(parsed);
  };

  const handleQuickSelect = (amount: number) => {
    if (amount > maxBalance) {
      setValidationError(
        `Insufficient balance (${maxBalance.toFixed(0)} SKR available)`
      );
      const clamped = Math.min(amount, maxBalance);
      onChange(clamped);
      setInputText(String(clamped));
      return;
    }
    setValidationError(null);
    onChange(amount);
    setInputText(String(amount));
  };

  const handleMax = () => {
    setValidationError(null);
    onChange(maxBalance);
    setInputText(maxBalance > 0 ? String(maxBalance) : "0");
  };

  const isOverBalance = value > maxBalance;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>SKR Wager</Text>
        <Text style={styles.balance}>
          Available: {maxBalance.toFixed(0)} SKR
        </Text>
      </View>

      <View
        style={[
          styles.inputRow,
          isOverBalance && styles.inputRowError,
        ]}
      >
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={handleTextChange}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor={GameColors.textSecondary}
        />
        <Text style={styles.inputSuffix}>SKR</Text>
      </View>

      {/* Validation error */}
      {validationError && (
        <Text style={styles.errorText}>{validationError}</Text>
      )}

      <View style={styles.quickButtons}>
        {QUICK_AMOUNTS.map((amount) => {
          const disabled = amount > maxBalance;
          return (
            <TouchableOpacity
              key={amount}
              style={[
                styles.quickButton,
                value === amount && !disabled && styles.quickButtonActive,
                disabled && styles.quickButtonDisabled,
              ]}
              onPress={() => handleQuickSelect(amount)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.quickButtonText,
                  value === amount && !disabled && styles.quickButtonTextActive,
                  disabled && styles.quickButtonTextDisabled,
                ]}
              >
                {amount}
              </Text>
            </TouchableOpacity>
          );
        })}
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
    marginBottom: 4,
  },
  inputRowError: {
    borderColor: GameColors.danger,
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
  errorText: {
    color: GameColors.danger,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginBottom: 8,
    marginTop: 2,
  },
  quickButtons: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
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
  quickButtonDisabled: {
    opacity: 0.4,
  },
  quickButtonText: {
    color: GameColors.textSecondary,
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  quickButtonTextActive: {
    color: GameColors.accent,
  },
  quickButtonTextDisabled: {
    color: GameColors.textSecondary,
  },
});
