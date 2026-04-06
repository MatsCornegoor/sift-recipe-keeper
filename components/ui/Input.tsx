import React from 'react';
import { TextInput, TextInputProps, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

export default function Input({ style, ...props }: TextInputProps) {
  const { colors } = useTheme();

  return (
    <TextInput
      placeholderTextColor={colors.placeholderText}
      {...props}
      style={[
        styles.base,
        { borderColor: colors.inputBorder, color: colors.text },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    borderRadius: 8,
    fontSize: 16,
    paddingHorizontal: 12,
    textAlignVertical: 'center',
    lineHeight: 20,
  },
});
