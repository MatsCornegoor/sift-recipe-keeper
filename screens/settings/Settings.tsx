import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/hooks/useTheme';
import Header from '@/components/Header';
import { Info, Settings2, Palette, ArrowLeftRight, ChevronRight } from 'lucide-react-native';
import ContentWrapper from '@/components/ContentWrapper';
import { AppNavigationProp } from '@/navigation/types';

export default function Settings() {
  const navigation = useNavigation<AppNavigationProp>();
  const { colors } = useTheme();

  const styles = useMemo(() => stylesFactory(colors), [colors]);

  const renderSettingsItem = (
    icon: React.ReactNode,
    label: string,
    onPress: () => void,
    showArrow = true
  ) => (
    <TouchableOpacity
      style={styles.settingsItem}
      onPress={onPress}
    >
      <View style={styles.settingsItemContent}>
        <View style={styles.settingsIcon}>{icon}</View>
        <Text style={styles.settingsLabel}>{label}</Text>
      </View>
      {showArrow && <ChevronRight size={22} color={colors.text} />}
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
            {renderSettingsItem(<Info size={22} color={colors.text} />, 'How Sift works', () =>
              navigation.navigate('About')
            )}
            {renderSettingsItem(<Settings2 size={22} color={colors.text} />, 'AI setup', () =>
              navigation.navigate('AiModel')
            )}
            {renderSettingsItem(<Palette size={22} color={colors.text} />, 'Appearance', () =>
              navigation.navigate('Appearance')
            )}
            {renderSettingsItem(<ArrowLeftRight size={22} color={colors.text} />, 'Import/Export', () =>
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
 