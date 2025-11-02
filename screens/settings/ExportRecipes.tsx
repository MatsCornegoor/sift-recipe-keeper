import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Platform, Share } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import RNFS from 'react-native-fs';
import { zip } from 'react-native-zip-archive';
import RecipeStore from '../../store/RecipeStore';
import { useTheme } from '../../hooks/useTheme';
import Header from '../../components/Header';
import ContentWrapper from '../../components/ContentWrapper';
import CustomPopup from '../../components/CustomPopup';
import { Recipe } from '../../models/Recipe';

const SELECT_ALL_ID = 'select-all';

export default function ExportRecipes() {
  const { colors } = useTheme();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipes, setSelectedRecipes] = useState<string[]>([]);
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

  useEffect(() => {
    setRecipes(RecipeStore.getAllRecipes());
  }, []);

  const handleToggleRecipe = (recipeId: string) => {
    if (recipeId === SELECT_ALL_ID) {
      if (selectedRecipes.length === recipes.length) {
        setSelectedRecipes([]);
      } else {
        setSelectedRecipes(recipes.map(r => r.id));
      }
      return;
    }

    setSelectedRecipes(prevSelected =>
      prevSelected.includes(recipeId)
        ? prevSelected.filter(id => id !== recipeId)
        : [...prevSelected, recipeId]
    );
  };

  const handleExport = async () => {
    if (Platform.OS === 'web') {
      setPopupConfig({
        title: 'Not Supported',
        message: 'Export is only available on mobile devices.',
        buttons: [{ text: 'OK', onPress: () => setShowPopup(false) }],
      });
      setShowPopup(true);
      return;
    }

    try {
      const tempDir = RNFS.TemporaryDirectoryPath + '/sift-export';
      const tempImagesDir = tempDir + '/images';
      const zipPath = RNFS.TemporaryDirectoryPath + '/recipes-export.zip';
      
      if (await RNFS.exists(tempDir)) {
        await RNFS.unlink(tempDir);
      }
      await RNFS.mkdir(tempDir);
      await RNFS.mkdir(tempImagesDir);

      const recipesToExport = recipes.filter(r => selectedRecipes.includes(r.id));
      
      const exportRecipes = await Promise.all(recipesToExport.map(async (recipe: Recipe) => {
        const recipeData = { ...recipe };
        
        if (recipe.imageUri && await RNFS.exists(recipe.imageUri)) {
          const fileName = recipe.imageUri.split('/').pop() || '';
          const newImagePath = tempImagesDir + '/' + fileName;
          
          try {
            await RNFS.copyFile(recipe.imageUri, newImagePath);
            recipeData.imageUri = 'images/' + fileName;
          } catch (error) {
            console.error('Error copying image:', error);
            recipeData.imageUri = '';
          }
        } else if (recipe.imageUri) {
          recipeData.imageUri = '';
        }
        
        return recipeData;
      }));

      const jsonPath = tempDir + '/recipes.json';
      await RNFS.writeFile(
        jsonPath,
        JSON.stringify(exportRecipes, null, 2)
      );

      await zip(tempDir, zipPath);

      if (Platform.OS === 'android') {
        try {
          const downloadPath = `${RNFS.DownloadDirectoryPath}/sift-recipes-${Date.now()}.zip`;
          await RNFS.moveFile(zipPath, downloadPath);
          setPopupConfig({
            title: 'Export Successful',
            message: 'Your recipes have been saved to the Downloads folder.',
            buttons: [{ text: 'OK', onPress: () => setShowPopup(false) }],
          });
        } catch (err) {
          console.warn(err);
          throw err;
        }
      } else {
        await Share.share({ url: `file://${zipPath}` });
      }

      await RNFS.unlink(tempDir);

    } catch (error) {
      console.error('Export error:', error);
      setPopupConfig({
        title: 'Export Failed',
        message: 'There was an error exporting your recipes. Please try again.',
        buttons: [{ text: 'OK', onPress: () => setShowPopup(false) }],
      });
    }
    setShowPopup(true);
  };

  const renderItem = ({ item }: { item: Recipe | {id: string, name: string} }) => {
    const isAllSelected = selectedRecipes.length === recipes.length && recipes.length > 0;
    const isSelected = item.id === SELECT_ALL_ID ? isAllSelected : selectedRecipes.includes(item.id);
    const isSelectAllItem = item.id === SELECT_ALL_ID;

    return (
      <TouchableOpacity
        style={styles.recipeItem}
        onPress={() => handleToggleRecipe(item.id)}
      >
        <Ionicons 
          name={isSelected ? 'checkbox' : 'square-outline'} 
          size={25} 
          color={isSelected ? colors.tint : colors.text} 
        />
        <Text style={[styles.recipeTitle, { color: colors.text }]}>{item.name}</Text>
      </TouchableOpacity>
    );
  };

  const listData = useMemo(() => {
    return [
      { id: SELECT_ALL_ID, name: 'Select All' },
      ...recipes,
    ];
  }, [recipes]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Export Recipes" />
      <ContentWrapper>
        <FlatList
          data={listData}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          ListFooterComponent={
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.tint, opacity: selectedRecipes.length > 0 ? 1 : 0.5 }]}
              onPress={handleExport}
              disabled={selectedRecipes.length === 0}
            >
              <Text style={[styles.actionLabel, { color: colors.background }]}>
                Export Selected Recipes
              </Text>
            </TouchableOpacity>
          }
        />
      </ContentWrapper>
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
  headerContainer: {
    paddingHorizontal: 16,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  recipeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 16,
    paddingVertical: 16,
  },
  recipeTitle: {
    fontSize: 16,
    marginLeft: 16,
    marginRight: 16,
  },
  actionButton: {
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
}); 