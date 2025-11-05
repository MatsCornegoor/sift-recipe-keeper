import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import Header from '@/components/Header';

export default function About() {

  const { colors } = useTheme();

  const styles = useMemo(() => stylesFactory(colors), [colors]);

  return (
    <View style={styles.flexView}>
      <Header title="How Sift Works" />
      <ScrollView style={styles.flexView}>
        <View style={styles.container}>
          <Text style={styles.description}>
            This app is a minimalist recipe keeper that can be used to extract only the essential information from a recipe website, cutting out the ads, stories, and other clutter. This gives you a clean, easy-to-read recipe card.
          </Text>

          <Text style={styles.title}>
            Setting up a model
          </Text>
          <Text style={[styles.description, { marginBottom: 16 }]}>
            Sift uses a Bring Your Own Model (BYOM) approach. This allows you to test new models and stay in control over your own data. Before you can import recipes, you need to connect Sift to an AI service.
          </Text>

          <View style={[styles.card, { flexDirection: 'row', alignItems: 'flex-start' , marginTop: 16 }]}>
            <Text style={styles.stepNumber}>1</Text>
            <Text style={styles.stepText}>
              Go to Settings &gt; AI Setup.
            </Text>
          </View>

          <View style={styles.card}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 }}>
              <Text style={styles.stepNumber}>2</Text>
              <Text style={styles.stepText}>
                Fill in the required details from your chosen AI provider. We support any service that uses the OpenAI API format.
              </Text>
            </View>
            <View style={styles.indentedContent}>
              <Text style={styles.cardTitle}>API Endpoint:</Text>
              <Text style={[styles.description, { marginBottom: 16 }]}>
                This is a URL provided by your AI service. For example the OpenAI url is: https://api.openai.com/v1/chat/completions.
              </Text>
              <Text style={styles.cardTitle}>Model Name:</Text>
              <Text style={[styles.description, { marginBottom: 16 }]}>
                The name of the specific AI model you want to use. We recommend using: gpt-4o-mini.
              </Text>
              <Text style={styles.cardTitle}>API Key:</Text>
              <Text style={[styles.description, { marginBottom: 0 }]}>
                A secret key provided by your AI service to authenticate your requests.
              </Text>
            </View>
          </View>

          <View style={[styles.card, { flexDirection: 'row', alignItems: 'flex-start' }]}>
            <Text style={styles.stepNumber}>3</Text>
            <Text style={styles.stepText}>
              Tap "Save & Test" to make sure everything is working correctly.
            </Text>
          </View>

          <Text style={styles.title}>
            Adding a Recipe
          </Text>
          <Text style={[styles.description, { marginBottom: 0 }]}>
            When the AI model is set up, you can add a recipe from a website by tapping the add button on the home screen.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const stylesFactory = (colors: any) => StyleSheet.create({
  flexView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    padding: 16,
    paddingBottom: 80,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    opacity: 0.7,
    marginBottom: 8,
    marginTop: 32,
    color: colors.text,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'left',
    marginBottom: 16,
    color: colors.text,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: colors.cardBackground,
  },
  cardTitle: {
    fontSize: 16,
    marginTop: 20,
    // fontWeight: 'bold',
    opacity: 0.9,
    marginBottom: 8,
    color: colors.text,
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 12,
    minWidth: 24,
    color: colors.tint,
  },
  stepText: {
    fontSize: 16,
    lineHeight: 24,
    flex: 1,
    color: colors.text,
  },
  indentedContent: {
    marginLeft: 36,
  },
});

