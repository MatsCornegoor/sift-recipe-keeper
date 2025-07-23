import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import Header from '@/components/Header';

export default function About() {

  const { colors } = useTheme();


  return (
    <View style={{ flex: 1 }}>
      <Header title="About" />
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={styles.container}>
          <Text style={[styles.title, { color: colors.text }]}>
            Why Sift?
          </Text>
          <Text style={[styles.description, { color: colors.text }]}>
            Sift is the ultimate minimalist recipe app designed for busy individuals who want fast, no-frills access to recipes. Tired of wading through ads, pop-ups, and endless commentary? Sift cuts through the clutter, delivering just the essential recipe information you need—nothing more, nothing less.
          </Text>

          <Text style={[styles.title, { color: colors.text }]}>
            Features
          </Text>
          <Text style={[styles.description, { color: colors.text }]}>
            • No subscriptions, no hidden costs{'\n'}
            • Unlimited Recipes: Store as many recipes as you want{'\n'}
            • Import from Any Website: Extract recipes from any cooking website{'\n'}
            • Clean Interface: Distraction-free cooking experience{'\n'}
            • Local Storage: Your recipes stay on your device{'\n'}
            • Import/Export: Backup and restore your recipes
          </Text>

          <Text style={[styles.title, { color: colors.text }]}>
            Privacy 
          </Text>
          <Text style={[styles.description, { color: colors.text }]}>
            Sift is built with privacy in mind. We don't track your data, and we don't sell it to third parties. Your data is yours, stored locally on your device and you can delete it at any time. More about privacy can be found at siftrecipes.app/privacy
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
