import React, { useEffect, useMemo, useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, TouchableWithoutFeedback } from 'react-native';
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
  onDelete?: () => void;
  deleteText?: string;
}

export default function TextInputPopup({
  visible,
  title = 'Edit',
  initialValue = '',
  placeholder = 'Enter text',
  confirmText = 'Save',
  onConfirm,
  onCancel,
  initialType = 'item',
  onDelete,
  deleteText = 'Delete',
}: TextInputPopupProps) {
  const { colors } = useTheme();
  const [value, setValue] = useState(initialValue);
  const [selectedType, setSelectedType] = useState<'item' | 'header'>('item');
  const [isFocused, setIsFocused] = useState(false);

  const styles = useMemo(() => stylesFactory(colors), [colors]);

  useEffect(() => {
    if (visible) {
      setValue(initialValue);
      setSelectedType(initialType || 'item');
      setIsFocused(false);
    }
  }, [visible, initialValue, initialType]);

  const handleConfirm = () => {
    onConfirm(value, selectedType);
  };

  const effectivePlaceholder = selectedType === 'header' ? 'Enter header title' : placeholder;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.kav}>
            <TouchableWithoutFeedback>
              <View style={styles.sheet}>

                <View style={styles.tabsRow}>
                  <TouchableOpacity
                    onPress={() => setSelectedType('item')}
                    style={[
                      styles.tab,
                      {
                        backgroundColor:
                          selectedType === 'item'
                            ? colors.background === '#FFFFFF'
                              ? colors.inputBackground
                              : `${colors.tint}33`
                            : colors.cardBackground,
                        opacity: selectedType === 'item' ? 1 : 0.5,
                      },
                    ]}
                  >
                    <Text style={styles.tabText}>Item</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setSelectedType('header')}
                    style={[
                      styles.tab,
                      {
                        backgroundColor:
                          selectedType === 'header'
                            ? colors.background === '#FFFFFF'
                              ? colors.inputBackground
                              : `${colors.tint}33`
                            : colors.cardBackground,
                        opacity: selectedType === 'header' ? 1 : 0.5,
                      },
                    ]}
                  >
                    <Text style={styles.tabText}>Header</Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  autoFocus
                  onFocus={() => setIsFocused(true)}
                  style={styles.input}
                  placeholder={effectivePlaceholder}
                  placeholderTextColor={colors.placeholderText}
                  value={value}
                  onChangeText={setValue}
                  returnKeyType="done"
                  onSubmitEditing={handleConfirm}
                  selection={isFocused ? undefined : { start: initialValue.length, end: initialValue.length }}
                />
                <View style={styles.buttonsRow}>
                  {onDelete ? (
                    <TouchableOpacity style={styles.button} onPress={onDelete}>
                      <Text style={styles.buttonText}>{deleteText}</Text>
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity style={[styles.button, styles.confirm]} onPress={handleConfirm}>
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

const stylesFactory = (colors: any) => StyleSheet.create({
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
    paddingTop: 32,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 10,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: colors.text,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    borderColor: colors.inputBorder,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    height: 48,
    borderColor: colors.inputBorder,
    color: colors.text,
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: 24,
    gap: 8,
  },
  button: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  confirm: {
    marginLeft: 'auto',
    backgroundColor: colors.tint,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
});
 