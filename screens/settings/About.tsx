import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import Header from '@/components/Header';

export default function About() {

  const { colors } = useTheme();


  return (
    <View style={{ flex: 1 }}>
      <Header title="How Sift Works" />
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={styles.container}>
          {/* <Text style={[styles.title, { color: colors.text }]}>
            Why Sift
          </Text> */}
          <Text style={[styles.description, { color: colors.text }]}>
            This app is a minimalist recipe keeper that can be used to extract only the essential information from a recipe website, cutting out the ads, stories, and other clutter. This gives you a clean, easy-to-read recipe card.
          </Text>

          <Text style={[styles.title, { color: colors.text }]}>
            Setting up a model
          </Text>
          <Text style={[styles.description, { color: colors.text }]}>
          Sift uses a Bring Your Own Model (BYOM) approach. This allows you to test new models and stay in control over your own data. Before you can import recipes, you need to connect Sift to an AI service.
{`

`}1.  Go to Settings &gt; AI Setup.
{`
`}2.  Fill in the required details from your chosen AI provider (We support any service that uses the OpenAI API format).
{`
`}
          </Text>


          <Text style={[styles.description, { color: colors.text, marginTop: 16,  }]}>
            API Endpoint:
          </Text>
          <Text style={[styles.description, { color: colors.text }]}>
            This is a URL provided by your AI service (e.g., OpenAI). It usually ends with `/v1/chat/completions`.
          </Text>
          <Text style={[styles.description, { color: colors.text, marginTop: 16,  }]}>
            Model Name:
          </Text>
          <Text style={[styles.description, { color: colors.text }]}>
            The name of the specific AI model you want to use (e.g., `gpt-4o`).
          </Text>
          <Text style={[styles.description, { color: colors.text, marginTop: 16, }]}>
            API Key:
          </Text>
          <Text style={[styles.description, { color: colors.text }]}>
            A secret key provided by your AI service to authenticate your requests.
          </Text>

          <Text style={[styles.description, { color: colors.text }]}>
          3.  Tap "Save & Test" to make sure everything is working correctly.
          </Text>

<Text style={[styles.title, { color: colors.text }]}>
            Adding a Recipe
          </Text>
          <Text style={[styles.description, { color: colors.text }]}>
            When the AI model is set up, you can add a recipe from a website by tapping the add button on the home screen.
          </Text>



        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  proContainer: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    alignItems: 'center',
  },
  proIcon: {
    marginBottom: 8,
  },
  proText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  proDescription: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    opacity: 0.7,
    marginBottom: 8,
    marginTop: 32,
  },
  version: {
    fontSize: 16,
    marginBottom: 24,
    opacity: 0.7,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'left',
    marginBottom: 32,
  },
  websiteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  websiteIcon: {
    marginRight: 8,
  },
  websiteButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
