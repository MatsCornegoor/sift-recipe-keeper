import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, BackHandler, Keyboard } from 'react-native';
import { Portal } from '@gorhom/portal';
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
  const inputRef = useRef<TextInput>(null);
  const [value, setValue] = useState(initialValue);
  const [selectedType, setSelectedType] = useState<'item' | 'header'>(initialType || 'item');
  const [inputHeight, setInputHeight] = useState(48);

  const LINE_HEIGHT = 22;
  const BASE_HEIGHT = 48;
  const MAX_LINES = 6;
  const MAX_HEIGHT = BASE_HEIGHT + (MAX_LINES - 1) * LINE_HEIGHT;

  const styles = useMemo(() => stylesFactory(colors), [colors]);

  useEffect(() => {
    if (visible) {
      setValue(initialValue);
      setSelectedType(initialType || 'item');
      setInputHeight(BASE_HEIGHT);
      const tryFocus = (n: number = 100) => {
        if (!inputRef.current) return;
        inputRef.current.focus();
        if (inputRef.current.isFocused()) {
          inputRef.current.setSelection(initialValue.length, initialValue.length);
        } else if (n > 0) {
          requestAnimationFrame(() => tryFocus(n - 1));
        }
      };
      requestAnimationFrame(() => tryFocus());
    } else {
      Keyboard.dismiss();
    }
  }, [visible, initialValue, initialType]);

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onCancel?.();
      return true;
    });
    return () => sub.remove();
  }, [visible, onCancel]);

  const handleConfirm = () => {
    onConfirm(value, selectedType);
  };

  const effectivePlaceholder = selectedType === 'header' ? 'Enter header title' : placeholder;

  if (!visible) return null;

  return (
    <Portal>
      <View style={StyleSheet.absoluteFill}>
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
                    ref={inputRef}
                    style={[styles.input, { height: inputHeight }]}
                    placeholder={effectivePlaceholder}
                    placeholderTextColor={colors.placeholderText}
                    defaultValue={initialValue}
                    onChangeText={setValue}
                    multiline
                    textAlignVertical="top"
                    scrollEnabled
                    onContentSizeChange={(e) => {
                      const raw = e.nativeEvent.contentSize.height;
                      const lines = Math.max(1, Math.ceil((raw - (BASE_HEIGHT - LINE_HEIGHT)) / LINE_HEIGHT));
                      const snapped = Math.min(MAX_HEIGHT, BASE_HEIGHT + (lines - 1) * LINE_HEIGHT);
                      if (snapped !== inputHeight) setInputHeight(snapped);
                    }}
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
      </View>
    </Portal>
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
    paddingVertical: 13,
    fontSize: 16,
    lineHeight: 22,
    borderColor: colors.inputBorder,
    color: colors.text,
    includeFontPadding: false,
    textAlignVertical: 'top',
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
