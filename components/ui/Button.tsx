import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface ButtonProps {
  title?: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export default function Button({ title, onPress, variant = 'primary', disabled, style, children }: ButtonProps) {
  const { colors } = useTheme();

  const variantStyle = variant === 'primary'
    ? { backgroundColor: colors.tint }
    : { backgroundColor: colors.cardBackground, borderWidth: 1, borderColor: colors.inputBorder };

  const textColor = variant === 'primary' ? colors.background : colors.text;

  return (
    <TouchableOpacity
      style={[styles.base, variantStyle, style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      {children ?? <Text style={[styles.text, { color: textColor }]}>{title}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
});
