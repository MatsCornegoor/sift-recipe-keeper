import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share, Platform, PermissionsAndroid } from 'react-native';
import RNFS from 'react-native-fs';
import DocumentPicker from 'react-native-document-picker';
import { useNavigation } from '@react-navigation/native';
import RecipeStore from '../../store/RecipeStore';
import { useTheme } from '../../hooks/useTheme';
import Header from '../../components/Header';
import ContentWrapper from '../../components/ContentWrapper';
import CustomPopup from '../../components/CustomPopup';
import { Recipe } from '../../models/Recipe';
import { migrateRecipeToLatest } from '../../models/RecipeMigrations';
import { zip, unzip } from 'react-native-zip-archive';
import { AppNavigationProp, SettingsStackParamList } from '../../navigation/types';
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
        type: [DocumentPicker.types.zip],
      });

      const sourceUri = res[0]?.fileCopyUri ?? res[0]?.uri;

      if (sourceUri) {
        const tempDir = RNFS.TemporaryDirectoryPath + '/import/';
        if (await RNFS.exists(tempDir)) {
          await RNFS.unlink(tempDir);
        }
        await RNFS.mkdir(tempDir);

        let zipPath = sourceUri;
        const tempZipCopyPath = `${RNFS.TemporaryDirectoryPath}/import.zip`;

        if (Platform.OS === 'android' && zipPath.startsWith('content://')) {
          await RNFS.copyFile(zipPath, tempZipCopyPath);
          zipPath = tempZipCopyPath;
        }

        await unzip(zipPath, tempDir);

        const recipesJson = await RNFS.readFile(tempDir + '/recipes.json');
        const importedRecipes = JSON.parse(recipesJson);

        for (const recipeData of importedRecipes) {
          const migratedRecipeData = migrateRecipeToLatest(recipeData);
          migratedRecipeData.id = Date.now() + '-' + Math.random().toString(36).substring(2);
          
          if (migratedRecipeData.imageUri) {
            try {
              const timestamp = Date.now();
              const originalFileName = migratedRecipeData.imageUri.split('/').pop();
              const fileName = `${timestamp}-${originalFileName}`;
              const imageDir = RNFS.DocumentDirectoryPath + '/recipe-images/';
              if (!(await RNFS.exists(imageDir))) {
                await RNFS.mkdir(imageDir);
              }
              const newImagePath = `file://${imageDir}${fileName}`;

              const sourceImagePath = `${tempDir}/${migratedRecipeData.imageUri}`;
              await RNFS.copyFile(sourceImagePath, newImagePath);
              migratedRecipeData.imageUri = newImagePath;
            } catch (error) {
              console.error('Error importing image for recipe:', migratedRecipeData.title, error);
              migratedRecipeData.imageUri = '';
            }
          }

          const recipe = new Recipe(migratedRecipeData);
          await RecipeStore.addRecipe(recipe);
        }

        await RNFS.unlink(tempDir);
        if (zipPath === tempZipCopyPath) {
          await RNFS.unlink(tempZipCopyPath);
        }

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

  const renderActionButton = (label: string, onPress: () => void) => (
    <TouchableOpacity
      style={[styles.actionButton, { backgroundColor: colors.tint }]}
      onPress={onPress}
    >
      <Text style={[styles.actionLabel, { color: colors.background }]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Import/Export" />
      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <ContentWrapper>
          <View style={styles.container}>
            <Text style={[styles.description, { color: colors.text }]}>
              Import or export your Sift recipes to create a backup or to transfer them to other devices.
            </Text>
            
            <View style={styles.actionsContainer}>
              {renderActionButton('Export Recipes', handleExportPress)}
              {renderActionButton('Import Recipes', handleImport)}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: 'transparent',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  actionsContainer: {
    gap: 16,
  },
  actionButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
}); 