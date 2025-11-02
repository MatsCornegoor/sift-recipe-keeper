import { View, TouchableOpacity, StyleSheet, Text, Modal, TextInput, useWindowDimensions, Pressable } from 'react-native';
import { useEffect, useState } from 'react';
import RecipeGrid from '../components/RecipeGrid';
import RecipeStore from '../store/RecipeStore';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Recipe } from '../models/Recipe';
import { useTheme } from '../hooks/useTheme';
import Header from '../components/Header';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as KeepAwake from 'react-native-keep-awake';
import CustomPopup from '../components/CustomPopup';

export default function RecipeList({ navigation }: { navigation: any }) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAiPopup, setShowAiPopup] = useState(false);

  const { width } = useWindowDimensions();
  const numColumns = width > 600 ? 3 : width > 300 ? 2 : 1;
  const gap = 16;
  const padding = 16;
  const availableWidth = width - (padding * 2) - (gap * (numColumns - 1));
  const cardWidth = availableWidth / numColumns;

  const { colors, colorScheme } = useTheme();

  useEffect(() => {
    RecipeStore.loadRecipes();
    RecipeStore.addListener(setRecipes);
    checkScreenAwake();
    checkAiSettings();
    return () => RecipeStore.removeListener(setRecipes);
  }, []);

  const checkAiSettings = async () => {
    try {
      const endpoint = await AsyncStorage.getItem('ai_model_endpoint');
      if (!endpoint) {
        setShowAiPopup(true);
      }
    } catch (e) {
      console.error("Failed to check AI settings", e);
    }
  };

  const checkScreenAwake = async () => {
    try {
      const awakeValue = await AsyncStorage.getItem('keepScreenAwake');
      if (awakeValue === 'true') {
        await KeepAwake.activateKeepAwake();
      }
    } catch (error) {
      console.error('Error checking screen awake status:', error);
    }
  };

  const handleAddWithUrl = () => {
    setIsMenuVisible(false);
    navigation.navigate('AddRecipeUrl');
  };

  const handleAddManually = () => {
    setIsMenuVisible(false);
    navigation.navigate('AddRecipe');
  };

  const handleOpenSettings = () => {
    navigation.navigate('Settings');
  };

  const filteredRecipes = recipes
    .filter(recipe => {
      const searchLower = searchQuery.toLowerCase();
      
      return recipe.name.toLowerCase().includes(searchLower) ||
             recipe.ingredients.some(ingredient => 
               ingredient.name.toLowerCase().includes(searchLower)
             ) ||
             recipe.tags.some(tag =>
               tag.toLowerCase().includes(searchLower)
             );
    })
    .sort((a, b) => {
      const searchLower = searchQuery.toLowerCase();
      const aNameMatch = a.name.toLowerCase().includes(searchLower);
      const bNameMatch = b.name.toLowerCase().includes(searchLower);
      
      if (aNameMatch && !bNameMatch) return -1;
      if (!aNameMatch && bNameMatch) return 1;
      return 0;
    });

  return (
    <View style={{ flex: 1 }}>
      <Header 
        title="Sift" 
        showBack={false}
        showLogo={true}
        rightElement={
          <Pressable
            onPress={handleOpenSettings}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="menu" style={{ marginTop: 10, marginRight: -4 }} size={32} color={colors.tint} />
          </Pressable>
        }
      />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.searchContainer, { borderBottomColor: colors.inputBorder }]}>
          <Ionicons name="search" size={20} color={colors.deleteButton} style={styles.searchIcon} />
                    <TextInput
             style={[styles.searchInput, { 
               color: colors.text,
             }]}
             placeholder="Search recipes..."
             placeholderTextColor={colors.deleteButton}
             value={searchQuery}
             onChangeText={setSearchQuery}
             clearButtonMode="while-editing"
           />
        </View>

        <RecipeGrid 
          recipes={filteredRecipes} 
          numColumns={numColumns}
          cardWidth={cardWidth}
          gap={gap}
          padding={padding}
        />
        
        <TouchableOpacity 
          style={[styles.fab, { backgroundColor: colors.tint }]}
          onPress={() => setIsMenuVisible(true)}
        >
          <Ionicons name="add" size={24} color={colors.background} />
        </TouchableOpacity>

        {recipes.length === 0 && (
          <View style={[styles.tooltip, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.tooltipContent}>
              <Text style={[styles.tooltipText, { color: colors.text }]}>
                Add your first recipe
              </Text>
              <Ionicons 
                name="arrow-forward" 
                size={14} 
                color={colors.text} 
                style={{ marginLeft: 8 }}
              />
            </View>
          </View>
        )}

        <Modal
          transparent
          visible={isMenuVisible}
          onRequestClose={() => setIsMenuVisible(false)}
          animationType="fade"
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setIsMenuVisible(false)}
          >
            <View style={[styles.menuContainer, { 
              backgroundColor: colors.cardBackground,
              bottom: 90,
              right: 20 
            }]}>
              <TouchableOpacity style={styles.menuItem} onPress={handleAddWithUrl}>
                <Text style={[styles.menuText, { color: colors.text }]}>Add recipe from website</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={handleAddManually}>
                <Text style={[styles.menuText, { color: colors.text }]}>Add recipe manually</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
        <CustomPopup
          visible={showAiPopup}
          title="AI Model Required"
          message="To import recipes from websites, you must configure an AI model in the settings. Please add your API endpoint to enable this feature."
          buttons={[
            { text: 'Go to Settings', onPress: () => {
                setShowAiPopup(false);
                navigation.navigate('Settings', { screen: 'AiModel' });
            }},
            { text: 'Later', onPress: () => setShowAiPopup(false) }
          ]}
          onClose={() => setShowAiPopup(false)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: '#000',
    paddingLeft: 10,
    paddingRight: 10,
    borderRadius: 8,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: '#007AFF',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  menuContainer: {
    position: 'absolute',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  menuItem: {
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  menuText: {
    fontSize: 17,
  },
  tooltip: {
    position: 'absolute',
    right: 90,
    bottom: 28,
    padding: 12,
    borderRadius: 8,
  },
  tooltipText: {
    fontSize: 14,
  },
  tooltipContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
}); 