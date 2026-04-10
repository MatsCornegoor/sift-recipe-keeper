import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Platform, Share } from 'react-native';
import Button from '../../components/ui/Button';
import Ionicons from 'react-native-vector-icons/Ionicons';
import RNFS from 'react-native-fs';
import { zip } from 'react-native-zip-archive';
import RecipeStore from '../../store/RecipeStore';
import { useTheme } from '../../hooks/useTheme';
import Header from '../../components/Header';
import ContentWrapper from '../../components/ContentWrapper';
import CustomPopup from '../../components/CustomPopup';
import { Recipe } from '../../models/Recipe';
import { buildRecipeZip } from '../../services/RecipeExportUtils';

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

  const styles = useMemo(() => stylesFactory(colors), [colors]);

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
      const recipesToExport = recipes.filter(r => selectedRecipes.includes(r.id));
      const zipPath = await buildRecipeZip(recipesToExport);

      if (Platform.OS === 'android') {
          const downloadPath = `${RNFS.DownloadDirectoryPath}/sift-recipes-${Date.now()}.zip`;
          await RNFS.moveFile(zipPath, downloadPath);
      } else {
        await Share.share({ url: `file://${zipPath}` });
        RNFS.unlink(zipPath).catch(() => {});
      }

      setPopupConfig({
        title: 'Export Successful',
        message: Platform.OS === 'android'
          ? 'Your recipes have been saved to the Downloads folder.'
          : 'Your recipes have been shared successfully.',
        buttons: [{ text: 'OK', onPress: () => setShowPopup(false) }],
      });
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
        <Text style={styles.recipeTitle}>{item.name}</Text>
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
    <View style={styles.flexView}>
      <Header title="Export Recipes" />
      <ContentWrapper>
        <FlatList
          data={listData}
          renderItem={renderItem}
          keyExtractor={item => item.id}
        />
      </ContentWrapper>
      <View style={styles.stickyFooter}>
        <Button
          title="Export Selected Recipes"
          onPress={handleExport}
          disabled={selectedRecipes.length === 0}
          style={[styles.exportButton, { opacity: selectedRecipes.length > 0 ? 1 : 0.5 }]}
        />
      </View>
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
    color: colors.text,
  },
  stickyFooter: {
    backgroundColor: colors.background,
    paddingBottom: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.text + '20',
  },
  exportButton: {
    margin: 16,
    marginBottom: 0,
  },
});
 