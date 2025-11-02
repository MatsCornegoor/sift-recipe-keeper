import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/hooks/useTheme';
import Header from '@/components/Header';

export default function AiModel() {
  const { colors } = useTheme();
  const [endpoint, setEndpoint] = useState('https://api.openai.com/v1/chat/completions');
  const [model, setModel] = useState('gpt-4o-mini');
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedEndpoint = await AsyncStorage.getItem('ai_model_endpoint');
      const savedModel = await AsyncStorage.getItem('ai_model_name');
      const savedApiKey = await AsyncStorage.getItem('ai_model_api_key');
      if (savedEndpoint) setEndpoint(savedEndpoint);
      if (savedModel) setModel(savedModel);
      if (savedApiKey) setApiKey(savedApiKey);
    } catch (error) {
      console.error('Failed to load AI model settings', error);
    }
  };

  const saveAndTest = async () => {
    if (!endpoint || !model) {
      Alert.alert('Error', 'Please fill in at least the endpoint and model name.');
      return;
    }
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: 'test' }],
        }),
      });

      if (response.ok) {
        await AsyncStorage.setItem('ai_model_endpoint', endpoint);
        await AsyncStorage.setItem('ai_model_name', model);
        await AsyncStorage.setItem('ai_model_api_key', apiKey);
        Alert.alert('Success', 'Settings saved and connection is working.');
      } else {
        const errorBody = await response.text();
        Alert.alert(
          'Connection Failed',
          `The endpoint returned an error (Status: ${response.status}). Settings were not saved.\n\n${errorBody}`
        );
      }
    } catch (error: any) {
      Alert.alert('Connection Error', `Failed to connect to the endpoint. Settings were not saved: ${error.message}`);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="AI Model" />
      <ScrollView style={styles.container}>
        <View style={styles.infoSection}>
          <Text style={[styles.infoText, { color: colors.text }]}>
            Sift uses a Bring Your Own Model (BYOM) approach. To enable recipe import from websites, you need to connect to an AI service. Please enter the details of your AI provider below.
          </Text>

        </View>

        <View style={styles.form}>
          <Text style={[styles.label, { color: colors.text }]}>Model Endpoint</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.inputBorder }]}
            value={endpoint}
            onChangeText={setEndpoint}
            placeholder="https://api.openai.com/v1/chat/completions"
            placeholderTextColor={colors.text}
            autoCapitalize="none"
          />

          <Text style={[styles.label, { color: colors.text }]}>Model Name</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.inputBorder }]}
            value={model}
            onChangeText={setModel}
            placeholder="gpt-4o-mini"
            placeholderTextColor={colors.text}
            autoCapitalize="none"
          />

          <Text style={[styles.label, { color: colors.text }]}>API Key</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.inputBorder }]}
            value={apiKey}
            onChangeText={setApiKey}
            placeholder="sk-..."
            placeholderTextColor={colors.text}
            secureTextEntry
            autoCapitalize="none"
          />
        </View>

        <TouchableOpacity style={[styles.button, { backgroundColor: colors.tint, marginBottom: 32 }]} onPress={saveAndTest}>
          <Text style={[styles.buttonText, { color: colors.background }]}>Save & Test</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  infoSection: {
    marginBottom: 24,
  },
  infoText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  codeBlock: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: 12,
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  form: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    opacity: 0.9,
  },
  input: {
    fontSize: 16,
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 16,
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
