import React, { useMemo } from 'react';
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
  type?: 'default' | 'info';
}

export default function CustomPopup({
  visible,
  title,
  message,
  buttons,
  onClose,
  type = 'default',
}: CustomPopupProps) {

  const { colors } = useTheme();

  const styles = useMemo(() => stylesFactory(colors), [colors]);

  const isInfo = type === 'info';

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.popup}>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.messageContainer}>
            {message.split('\n').map((paragraph, index) => (
              <Text 
                key={index} 
                style={[
                  styles.message, 
                  paragraph.trim() === '' && styles.emptyLine,
                  index > 0 && styles.lineSpacing
                ]}
              >
                {paragraph}
              </Text>
            ))}
          </View>
          <View style={[styles.buttonContainer, isInfo && styles.buttonContainerInfo]}>
            {buttons.map((button, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.button,
                  isInfo && styles.buttonInfo,
                  isInfo && button.style === 'cancel' && styles.buttonOutlined,
                  !isInfo && index < buttons.length - 1 && styles.buttonMargin,
                  isInfo && index > 0 && styles.buttonMarginInfo,
                ]}
                onPress={button.onPress}
              >
                <Text style={[styles.buttonText, isInfo && button.style === 'cancel' && styles.buttonTextOutlined]}>
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

const stylesFactory = (colors: any) => StyleSheet.create({
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
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    color: colors.text,
  },
  messageContainer: {
    marginBottom: 20,
  },
  message: {
    fontSize: 16,
    lineHeight: 22,
    color: colors.text,
  },
  lineSpacing: {
    marginTop: 4,
  },
  emptyLine: {
    marginTop: 8,
    height: 0,
  },
  // Default button styles
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.tint,
  },
  buttonMargin: {
    marginRight: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background,
  },
  // Info popup styles
  buttonContainerInfo: {
    flexDirection: 'column',
    marginTop: 10,
  },
  buttonInfo: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonOutlined: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  buttonMarginInfo: {
    marginTop: 10,
  },
  buttonTextOutlined: {
    color: colors.deleteButton,
  },
});