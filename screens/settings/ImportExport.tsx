import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import Button from '../../components/ui/Button';
import DocumentPicker from 'react-native-document-picker';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../hooks/useTheme';
import Header from '../../components/Header';
import ContentWrapper from '../../components/ContentWrapper';
import CustomPopup from '../../components/CustomPopup';
import { importSiftFile } from '../../utils/importSiftFile';
import { SettingsStackParamList } from '../../navigation/types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

export default function ImportExport() {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();
  const [showPopup, setShowPopup] = useState(false);
  const [popupConfig, setPopupConfig] = useState<{
    title: string;
    message: string;
    buttons: Array<{ text: string; onPress: () => void }>;
  }>({
    title: '',
    message: '',
    buttons: [],
  });

  const styles = useMemo(() => stylesFactory(colors), [colors]);

  const handleExportPress = () => {
    navigation.navigate('ExportRecipes');
  };

  const handleImport = async () => {
    if (Platform.OS === 'web') {
      setPopupConfig({
        title: 'Not Supported',
        message: 'Import is only available on mobile devices.',
        buttons: [{ text: 'OK', onPress: () => setShowPopup(false) }],
      });
      setShowPopup(true);
      return;
    }

    try {
      const res = await DocumentPicker.pick({
        type: [DocumentPicker.types.allFiles],
      });

      const sourceUri = res[0]?.fileCopyUri ?? res[0]?.uri;

      if (sourceUri) {
        await importSiftFile(sourceUri);

        setPopupConfig({
          title: 'Import Successful',
          message: 'Your recipes have been imported successfully!',
          buttons: [{
            text: 'OK',
            onPress: () => {
              setShowPopup(false);
              navigation.getParent()?.navigate('Recipes');
            }
          }],
        });
        setShowPopup(true);
      }
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) {
        console.error('Import error:', err);
        setPopupConfig({
          title: 'Import Failed',
          message: 'There was an error importing your recipes. Please make sure you selected a valid Sift export file.',
          buttons: [{ text: 'OK', onPress: () => setShowPopup(false) }],
        });
        setShowPopup(true);
      }
    }
  };

  return (
    <View style={styles.flexView}>
      <Header title="Import/Export" />
      <ScrollView
        style={styles.flexView}
        contentContainerStyle={styles.flexGrow}
      >
        <ContentWrapper>
          <View style={styles.container}>
            <Text style={styles.description}>
              Import or export your Sift recipes to create a backup or to transfer them to other devices.
            </Text>

            <View style={styles.actionsContainer}>
              <Button title="Export recipes" onPress={handleExportPress} />
              <Button title="Import recipes" onPress={handleImport} />
            </View>
          </View>
        </ContentWrapper>
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
  flexGrow: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: 'transparent',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
    color: colors.text,
  },
  actionsContainer: {
    gap: 16,
  },
});
 