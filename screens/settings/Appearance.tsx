import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch } from 'react-native';
import Header from '../../components/Header';
import KeepAwake from 'react-native-keep-awake';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../hooks/useTheme';

export default function Appearance() {
  const { isDarkMode, toggleTheme, colors } = useTheme();
  const [isScreenAwake, setIsScreenAwake] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const awakeValue = await AsyncStorage.getItem('keepScreenAwake');
      const isAwake = awakeValue === 'true';
      setIsScreenAwake(isAwake);
      
      if (isAwake) {
        KeepAwake.activate();
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const handleThemeToggle = async (value: boolean) => {
    await toggleTheme(value);
  };

  const toggleScreenAwake = async (value: boolean) => {
    try {
      setIsScreenAwake(value);
      await AsyncStorage.setItem('keepScreenAwake', value.toString());
      
      if (value) {
        KeepAwake.activate();
      } else {
        KeepAwake.deactivate();
      }
    } catch (error) {
      console.error('Error saving screen awake preference:', error);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <Header title="Appearance" />
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.section, { borderBottomColor: colors.inputBorder }]}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: colors.text }]}>
                Dark Mode
              </Text>
              <Text style={[styles.settingDescription, { color: colors.text }]}>
                Switch between light and dark theme
              </Text>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={handleThemeToggle}
              trackColor={{ false: colors.deleteButton, true: colors.tint }}
              thumbColor={isDarkMode ? colors.inputBackground : colors.inputBackground}
            />
          </View>
        </View>

        <View style={[styles.section, { borderBottomColor: colors.inputBorder }]}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: colors.text }]}>
                Keep screen awake
              </Text>
              <Text style={[styles.settingDescription, { color: colors.text }]}>
                Prevent screen from sleeping while viewing recipes
              </Text>
            </View>
            <Switch
              value={isScreenAwake}
              onValueChange={toggleScreenAwake}
              trackColor={{ false: colors.deleteButton, true: colors.tint }}
              thumbColor={isScreenAwake ? colors.inputBackground : colors.inputBackground}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    borderBottomWidth: 1,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    opacity: 0.7,
  },
});
