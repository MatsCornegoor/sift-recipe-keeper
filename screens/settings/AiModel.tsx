import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Animated, Linking } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/hooks/useTheme';
import Header from '@/components/Header';
import CustomPopup from '@/components/CustomPopup';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

export default function AiModel() {
  const { colors } = useTheme();
  const [endpoint, setEndpoint] = useState('https://api.openai.com/v1/chat/completions');
  const [model, setModel] = useState('gpt-4o-mini');
  const [apiKey, setApiKey] = useState('');
  const [seed, setSeed] = useState('1997');
  const [temperature, setTemperature] = useState('0.1');
  const [supportsResponseFormat, setSupportsResponseFormat] = useState(true);
  const [advancedExpanded, setAdvancedExpanded] = useState(false);
  const chevronRotation = useRef(new Animated.Value(0)).current;
  const [isTesting, setIsTesting] = useState(false);
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
      const savedSeed = await AsyncStorage.getItem('ai_model_seed');
      const savedTemperature = await AsyncStorage.getItem('ai_model_temperature');
      const savedSupportsResponseFormat = await AsyncStorage.getItem('ai_model_supports_response_format');
      if (savedEndpoint) setEndpoint(savedEndpoint);
      if (savedModel) setModel(savedModel);
      if (savedApiKey) setApiKey(savedApiKey);
      if (savedSeed) setSeed(savedSeed);
      if (savedTemperature) setTemperature(savedTemperature);
      if (savedSupportsResponseFormat !== null) setSupportsResponseFormat(savedSupportsResponseFormat === 'true');
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
    setIsTesting(true);
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
        await AsyncStorage.setItem('ai_model_seed', seed);
        await AsyncStorage.setItem('ai_model_temperature', temperature);
        await AsyncStorage.setItem('ai_model_supports_response_format', String(supportsResponseFormat));
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
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <View style={styles.flexView}>
      <Header title="AI setup" />
      <ScrollView style={styles.container}>
        <View style={styles.infoSection}>
          <Text style={styles.infoText}>
            Sift uses a Bring Your Own Model (BYOM) approach. To enable recipe import from websites, please enter the details of your AI provider below.{' '}
            <Text style={styles.link} onPress={() => Linking.openURL('https://github.com/MatsCornegoor/sift-recipe-keeper')}>More info</Text>
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Model endpoint</Text>
          <Input
            value={endpoint}
            onChangeText={setEndpoint}
            placeholder="https://api.openai.com/v1/chat/completions"
            autoCapitalize="none"
            style={styles.input}
          />
          {endpoint.startsWith('http://') && (
            <Text style={styles.httpWarning}>
              Insecure endpoint (HTTP). Your API key will be transmitted unencrypted.
            </Text>
          )}

          <Text style={styles.label}>Model name</Text>
          <Input
            value={model}
            onChangeText={setModel}
            placeholder="gpt-4o-mini"
            autoCapitalize="none"
            style={styles.input}
          />

          <Text style={styles.label}>API key</Text>
          <Input
            value={apiKey}
            onChangeText={setApiKey}
            placeholder="sk-..."
            secureTextEntry
            autoCapitalize="none"
            style={styles.input}
          />
        </View>

        <TouchableOpacity
          style={styles.accordionHeader}
          onPress={() => {
            const toValue = advancedExpanded ? 0 : 1;
            Animated.timing(chevronRotation, {
              toValue,
              duration: 200,
              useNativeDriver: true,
            }).start();
            setAdvancedExpanded(v => !v);
          }}
        >
          <Text style={styles.accordionTitle}>Advanced options</Text>
          <Animated.View style={{
            transform: [{
              rotate: chevronRotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }),
            }],
          }}>
            <ChevronDown size={18} color={colors.text} style={{ opacity: 0.5 }} />
          </Animated.View>
        </TouchableOpacity>

        {advancedExpanded && (
          <View>
            <Text style={styles.label}>Temperature</Text>
            <Input
              value={temperature}
              onChangeText={setTemperature}
              placeholder="0.1"
              keyboardType="decimal-pad"
              autoCapitalize="none"
              style={styles.input}
            />

            <Text style={styles.label}>Seed</Text>
            <Input
              value={seed}
              onChangeText={setSeed}
              placeholder="1997"
              keyboardType="number-pad"
              autoCapitalize="none"
              style={styles.input}
            />

            <View style={styles.switchRow}>
              <Text style={styles.label}>Supports response format</Text>
              <Switch
                value={supportsResponseFormat}
                onValueChange={setSupportsResponseFormat}
                trackColor={{ false: colors.deleteButton, true: colors.tint }}
                thumbColor={colors.inputBackground}
              />
            </View>
          </View>
        )}

        <Button
          title={isTesting ? 'Testing model...' : 'Save & Test'}
          onPress={saveAndTest}
          disabled={isTesting}
          style={{ marginBottom: 32, marginTop: 30, opacity: isTesting ? 0.7 : 1 }}
        />
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
  link: {
    color: colors.tint,
    textDecorationLine: 'underline',
  },
  form: {
    marginBottom: 8,
  },
  label: {
    fontSize: 15,
    marginBottom: 10,
    opacity: 0.7,
    marginTop: 16,
    color: colors.text,
  },
  input: {
    height: 48,
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 12,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.inputBorder,
  },
  accordionTitle: {
    fontSize: 15,
    color: colors.text,
    opacity: 0.7,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  switchLabel: {
    flex: 1,
    fontSize: 16,
    marginRight: 16,
    color: colors.text,
  },
  httpWarning: {
    fontSize: 13,
    color: colors.text,
    marginTop: -10,
    marginBottom: 16,
    opacity: 0.7,
  },
});
