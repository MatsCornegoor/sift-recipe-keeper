import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, NativeSyntheticEvent, TextInputSelectionChangeEventData } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface TextInputPopupProps {
  visible: boolean;
  title?: string;
  initialValue?: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: (value: string, type: 'item' | 'header') => void;
  onCancel?: () => void;
  initialType?: 'item' | 'header';
}

export default function TextInputPopup({
  visible,
  title = 'Edit',
  initialValue = '',
  placeholder = 'Enter text',
  confirmText = 'Save',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  initialType = 'item',
}: TextInputPopupProps) {
  const { colors } = useTheme();
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<TextInput>(null);
  const [initialSelection, setInitialSelection] = useState<{ start: number; end: number } | undefined>(undefined);
  const [selectedType, setSelectedType] = useState<'item' | 'header'>(initialType);

  useEffect(() => {
    if (visible) {
      setValue(initialValue);
      setInitialSelection({ start: initialValue.length, end: initialValue.length });
      setSelectedType(initialType || 'item');
      const id = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(id);
    } else {
      setInitialSelection(undefined);
    }
  }, [visible, initialValue, initialType]);

  const handleConfirm = () => {
    onConfirm(value, selectedType);
  };

  const handleSelectionChange = (
    _e: NativeSyntheticEvent<TextInputSelectionChangeEventData>
  ) => {
    if (initialSelection) {
      // Stop controlling selection after the first real selection event
      setInitialSelection(undefined);
    }
  };

  const effectivePlaceholder = selectedType === 'header' ? 'Enter header title' : placeholder;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.kav}>
            <TouchableWithoutFeedback>
              <View style={[styles.sheet, { backgroundColor: colors.background }]}>
                {!!title && <Text style={[styles.title, { color: colors.text }]}>{title}</Text>}
                <View style={styles.tabsRow}>
                  <TouchableOpacity
                    onPress={() => setSelectedType('item')}
                    style={[styles.tab, { borderColor: colors.inputBorder, backgroundColor: selectedType === 'item' ? colors.tint : 'transparent' }]}
                  >
                    <Text style={[styles.tabText, { color: selectedType === 'item' ? colors.background : colors.text }]}>Item</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setSelectedType('header')}
                    style={[styles.tab, { borderColor: colors.inputBorder, backgroundColor: selectedType === 'header' ? colors.tint : 'transparent' }]}
                  >
                    <Text style={[styles.tabText, { color: selectedType === 'header' ? colors.background : colors.text }]}>Header</Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  ref={inputRef}
                  style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                  placeholder={effectivePlaceholder}
                  placeholderTextColor={colors.placeholderText}
                  value={value}
                  onChangeText={setValue}
                  returnKeyType="done"
                  onSubmitEditing={handleConfirm}
                  selection={initialSelection}
                  onSelectionChange={handleSelectionChange}
                />
                <View style={styles.buttonsRow}>
                  <TouchableOpacity style={[styles.button, styles.cancel]} onPress={onCancel}>
                    <Text style={[styles.buttonText, { color: colors.text }]}>{cancelText}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.button, { backgroundColor: colors.tint }]} onPress={handleConfirm}>
                    <Text style={[styles.buttonText, { color: colors.background }]}>{confirmText}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  kav: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    padding: 16,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 8,
  },
  button: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  cancel: {
    backgroundColor: 'transparent',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
}); 