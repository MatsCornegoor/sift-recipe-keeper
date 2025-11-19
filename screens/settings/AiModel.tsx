import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/hooks/useTheme';
import Header from '@/components/Header';
import CustomPopup from '@/components/CustomPopup';

export default function AiModel() {
  const { colors } = useTheme();
  const [endpoint, setEndpoint] = useState('https://api.openai.com/v1/chat/completions');
  const [model, setModel] = useState('gpt-4o-mini');
  const [apiKey, setApiKey] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const [popupConfig, setPopupConfig] = useState<{
    title: string;
    message: string;
    buttons: Array<{ text: string; onPress: () => void; style?: 'default' | 'cancel' }>;
  }>({
    title: '',
    message: '',
    buttons: [],
  });

  const styles = useMemo(() => stylesFactory(colors), [colors]);

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
      setPopupConfig({
        title: 'Error',
        message: 'Please fill in at least the endpoint and model name.',
        buttons: [{ text: 'OK', onPress: () => setShowPopup(false) }],
      });
      setShowPopup(true);
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
        setPopupConfig({
          title: 'Success',
          message: 'Settings saved and connection is working.',
          buttons: [{ text: 'OK', onPress: () => setShowPopup(false) }],
        });
        setShowPopup(true);
      } else {
        const errorBody = await response.text();
        setPopupConfig({
          title: 'Connection Failed',
          message: `The endpoint returned an error (Status: ${response.status}). Settings were not saved.\n\n${errorBody}`,
          buttons: [{ text: 'OK', onPress: () => setShowPopup(false) }],
        });
        setShowPopup(true);
      }
    } catch (error: any) {
      setPopupConfig({
        title: 'Connection Error',
        message: `Failed to connect to the endpoint. Settings were not saved: ${error.message}`,
        buttons: [{ text: 'OK', onPress: () => setShowPopup(false) }],
      });
      setShowPopup(true);
    }
  };

  return (
    <View style={styles.flexView}>
      <Header title="AI setup" />
      <ScrollView style={styles.container}>
        <View style={styles.infoSection}>
          <Text style={styles.infoText}>
            Sift uses a Bring Your Own Model (BYOM) approach. To enable recipe import from websites, you need to connect to an AI service. Please enter the details of your AI provider below.
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Model endpoint</Text>
          <TextInput
            style={styles.input}
            value={endpoint}
            onChangeText={setEndpoint}
            placeholder="https://api.openai.com/v1/chat/completions"
            placeholderTextColor={colors.text}
            autoCapitalize="none"
          />

          <Text style={styles.label}>Model name</Text>
          <TextInput
            style={styles.input}
            value={model}
            onChangeText={setModel}
            placeholder="gpt-4o-mini"
            placeholderTextColor={colors.text}
            autoCapitalize="none"
          />

          <Text style={styles.label}>API key</Text>
          <TextInput
            style={styles.input}
            value={apiKey}
            onChangeText={setApiKey}
            placeholder="sk-..."
            placeholderTextColor={colors.text}
            secureTextEntry
            autoCapitalize="none"
          />
        </View>

        <TouchableOpacity style={[styles.button, { marginBottom: 32 }]} onPress={saveAndTest}>
          <Text style={styles.buttonText}>Save & Test</Text>
        </TouchableOpacity>
      </ScrollView>
      <CustomPopup
        visible={showPopup}
        title={popupConfig.title}
        message={popupConfig.message}
        buttons={popupConfig.buttons}
        onClose={() => setShowPopup(false)}
      />
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
  },
  infoSection: {
    marginBottom: 24,
  },
  infoText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
    color: colors.text,
  },
  form: {
    marginBottom: 16,
  },
  label: {
    fontSize: 15,
    marginBottom: 10,
    opacity: 0.7,
    marginTop: 16,
    color: colors.text,
  },
  input: {
    fontSize: 16,
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: colors.inputBackground,
    color: colors.text,
    borderColor: colors.inputBorder,
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: colors.tint,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background,
  },
});

