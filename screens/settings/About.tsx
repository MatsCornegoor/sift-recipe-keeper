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
            Sift is a simple recipe keeper. It uses AI to extract just the recipe from a website, leaving out ads and long stories. You get a clean, easy-to-read recipe.
          </Text>

          <Text style={styles.title}>
            Choosing an AI provider
          </Text>
          <Text style={[styles.description, { marginBottom: 16 }]}>
            To start, you need to connect Sift to an AI service. This "Bring Your Own Model" approach gives you control over your data and lets you experiment with different AI models.
          </Text>
          <Text style={[styles.description, { marginBottom: 16 }]}>
            Sift works with any provider that supports the OpenAI API format. Here are a few possible options:
          </Text>

          <View style={[styles.card, { marginTop: 16 }]}>
            <Text style={styles.cardTitle}>OpenRouter</Text>
            <Text style={[styles.description, { marginBottom: 0, opacity: 0.8 }]}>
              OpenRouter lets you access models from different providers, including some excellent free ones. It's a flexible way experiment and to find a model that fits your needs.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>OpenAI</Text>
            <Text style={[styles.description, { marginBottom: 0, opacity: 0.8 }]}>
              Gpt-4o-mini works great for extracting recipes accurately.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Google AI</Text>
            <Text style={[styles.description, { marginBottom: 0, opacity: 0.8 }]}>
              Gemini 2.0 Flash is a good model to start with.
            </Text>
          </View>

          <Text style={styles.title}>
            Free vs. paid models
          </Text>
          <Text style={[styles.description, { marginBottom: 16 }]}>
            Many providers offer free models that are perfect for casual use. However, for the best performance and highest accuracy, you may want to consider a paid model. Paid models are generally more powerful and make fewer mistakes when reading recipes.
          </Text>

          <Text style={styles.title}>
            Setting up your model
          </Text>
          <Text style={[styles.description, { marginBottom: 16 }]}>
            Once you've chosen a provider and have your API details, follow these steps:
          </Text>

          <View style={[styles.card, { flexDirection: 'row', alignItems: 'flex-start', marginTop: 16 }]}>
            <Text style={styles.stepNumber}>1</Text>
            <Text style={styles.stepText}>
              Go to Settings &gt; AI Model.
            </Text>
          </View>

          <View style={styles.card}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 }}>
              <Text style={styles.stepNumber}>2</Text>
              <Text style={styles.stepText}>
                Enter the API Endpoint, Model Name, and API Key from your provider.
              </Text>
            </View>
            <View style={styles.indentedContent}>
              <Text style={[styles.description, { opacity: 0.8 }]}>
                The API Endpoint is the URL for the AI service (e.g., <Text style={{ fontFamily: 'SpaceMono-Regular' }}>https://openrouter.ai/api/v1/chat/completions</Text>).
              </Text>
              <Text style={[styles.description, { opacity: 0.8 }]}>
                The Model Name is the specific model you want to use (e.g., <Text style={{ fontFamily: 'SpaceMono-Regular' }}>google/gemini-2.5-flash</Text>).
              </Text>
              <Text style={[styles.description, { marginBottom: 0, opacity: 0.8 }]}>
                The API Key is your secret key from the provider.
              </Text>
            </View>
          </View>

          <View style={[styles.card, { flexDirection: 'row', alignItems: 'flex-start' }]}>
            <Text style={styles.stepNumber}>3</Text>
            <Text style={styles.stepText}>
              Tap Save & Test to check the connection.
            </Text>
          </View>

          <Text style={styles.title}>
            Adding a recipe
          </Text>
          <Text style={[styles.description, { marginBottom: 0 }]}>
            With your AI model set up, just tap the '+' button on the home screen and paste a recipe URL to get started!
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

