import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
} from 'react-native';

import { useTheme } from '@/hooks/useTheme';

interface CustomPopupProps {
  visible: boolean;
  title: string;
  message: string;
  buttons: Array<{
    text: string;
    onPress: () => void;
    style?: 'default' | 'cancel';
  }>;
  onClose: () => void;
}

export default function CustomPopup({
  visible,
  title,
  message,
  buttons,
  onClose,
}: CustomPopupProps) {

  const { colors } = useTheme();

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.popup, { backgroundColor: colors.background }]}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <View style={styles.messageContainer}>
            {message.split("\n").map((paragraph, index) => (
              <Text 
                key={index} 
                style={[
                  styles.message, 
                  { color: colors.text },
                  paragraph.trim() === '' && styles.emptyLine,
                  index > 0 && styles.lineSpacing
                ]}
              >
                {paragraph}
              </Text>
            ))}
          </View>
          <View style={styles.buttonContainer}>
            {buttons.map((button, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.button,
                  { backgroundColor: colors.tint },
                  index < buttons.length - 1 && styles.buttonMargin,
                ]}
                onPress={button.onPress}
              >
                <Text style={[styles.buttonText, { color: colors.background }]}>
                  {button.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  popup: {
    width: Dimensions.get('window').width * 0.85,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  messageContainer: {
    marginBottom: 20,
  },
  message: {
    fontSize: 16,
    lineHeight: 22,
  },
  lineSpacing: {
    marginTop: 4,
  },
  emptyLine: {
    marginTop: 8,
    height: 0,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  buttonMargin: {
    marginRight: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
}); 