import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/hooks/useTheme';
import Header from '@/components/Header';
import Ionicons from 'react-native-vector-icons/Ionicons';
import ContentWrapper from '@/components/ContentWrapper';
import { AppNavigationProp } from '@/navigation/types';

export default function Settings() {
  const navigation = useNavigation<AppNavigationProp>();
  const { colors } = useTheme();

  const styles = useMemo(() => stylesFactory(colors), [colors]);

  const renderSettingsItem = (
    icon: string,
    label: string,
    onPress: () => void,
    showArrow = true
  ) => (
    <TouchableOpacity
      style={styles.settingsItem}
      onPress={onPress}
    >
      <View style={styles.settingsItemContent}>
        <Ionicons name={icon as any} size={22} color={colors.text} style={styles.settingsIcon} />
        <Text style={styles.settingsLabel}>{label}</Text>
      </View>
      {showArrow && <Ionicons name="chevron-forward" size={22} color={colors.text} />}
    </TouchableOpacity>
  );

  return (
    <View style={styles.flexView}>
      <Header title="Settings" />
      <ScrollView
        style={styles.flexView}
        contentContainerStyle={styles.flexGrow}
      >
        <ContentWrapper>
          <View style={styles.container}>
            {renderSettingsItem('information-circle-outline', 'How Sift works', () =>
              navigation.navigate('About')
            )}
             {renderSettingsItem('cog-outline', 'AI setup', () =>
              navigation.navigate('AiModel')
            )}
            {renderSettingsItem('color-palette-outline', 'Appearance', () =>
              navigation.navigate('Appearance')
            )}
            {renderSettingsItem('swap-horizontal-outline', 'Import/Export', () =>
              navigation.navigate('ImportExport')
            )}
          </View>
        </ContentWrapper>
      </ScrollView>
    </View>
  );
}

const stylesFactory = (colors: any) => StyleSheet.create({
  flexView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flexGrow: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: 10,
    overflow: 'hidden',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.inputBorder,
  },
  settingsItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsIcon: {
    marginRight: 12,
  },
  settingsLabel: {
    fontSize: 17,
    color: colors.text,
  },
});
 