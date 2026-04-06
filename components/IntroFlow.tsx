import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';

const FORCE_SHOW_INTRO = false; // Set to true to always show the intro during development

interface IntroFlowProps {
  visible: boolean;
  onSkip: () => void;
  onSetupModel: () => void;
}

const STEPS = [
  {
    title: 'Welcome to Sift',
    body: 'Sift is a minimalist recipe keeper. It uses AI to extract just the recipe from a website, leaving out ads and long stories. You get a clean, easy-to-read recipe.',
  },
  {
    title: 'Bring Your Own AI',
    body: 'Sift works with any provider that supports the OpenAI API format. You stay in control of your data and can switch models at any time.',
  },
  {
    title: 'Set Up Your Model',
    body: 'To import recipes from websites, you need to connect a model. It only takes a few minutes.',
  },
];

export default function IntroFlow({ visible, onSkip, onSetupModel }: IntroFlowProps) {
  const [step, setStep] = useState(0);
  const { colors } = useTheme();
  const styles = useMemo(() => stylesFactory(colors), [colors]);

  const isLast = step === STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      onSetupModel();
    } else {
      setStep(s => s + 1);
    }
  };

  const handleSkip = () => {
    setStep(0);
    onSkip();
  };

  const handleSetupModel = () => {
    setStep(0);
    onSetupModel();
  };

  const handleDotPress = (index: number) => {
    if (index <= step) {
      setStep(index);
    }
  };

  return (
    <Modal
      transparent
      visible={visible || FORCE_SHOW_INTRO}
      animationType="fade"
      onRequestClose={handleSkip}
    >
      <View style={styles.overlay}>
        <View style={styles.popup}>

          <View style={styles.dots}>
            {STEPS.map((_, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => handleDotPress(i)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <View style={[styles.dot, i === step && styles.dotActive]} />
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.title}>{STEPS[step].title}</Text>

          <View style={styles.body}>
            {STEPS[step].body.split('\n').map((paragraph, i) => (
              <Text
                key={i}
                style={[
                  styles.bodyText,
                  paragraph.trim() === '' && styles.emptyLine,
                  i > 0 && styles.lineSpacing,
                ]}
              >
                {paragraph}
              </Text>
            ))}
          </View>

          {isLast ? (
            <View style={styles.lastStepButtons}>
              <TouchableOpacity style={styles.buttonOutlined} onPress={handleSkip}>
                <Text style={styles.buttonTextOutlined}>Skip for now</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.buttonPrimary]} onPress={handleSetupModel}>
                <Text style={styles.buttonText}>Setup Model</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={[styles.button, styles.buttonPrimary]} onPress={handleNext}>
              <Text style={styles.buttonText}>Next</Text>
            </TouchableOpacity>
          )}

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
    height: 350,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    backgroundColor: colors.background,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 25,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.inputBorder,
  },
  dotActive: {
    backgroundColor: colors.tint,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    color: colors.text,
    textAlign: 'center',
  },
  body: {
    flex: 1,
  },
  bodyText: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.text,
    textAlign: 'center',
  },
  emptyLine: {
    height: 0,
  },
  lineSpacing: {
    marginTop: 4,
  },
  button: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: colors.tint,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background,
  },
  lastStepButtons: {
    gap: 10,
  },
  buttonOutlined: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  buttonTextOutlined: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.deleteButton,
  },
});
