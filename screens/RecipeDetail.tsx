import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  Modal,
  Pressable,
  Linking,
  Clipboard,
  ToastAndroid,
  useWindowDimensions,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import RecipeStore from '../store/RecipeStore';
import { Recipe, RecipeStep, IngredientGroup, InstructionGroup } from '../models/Recipe';
import { useTheme } from '../hooks/useTheme';
import Header from '../components/Header';
import CustomPopup from '../components/CustomPopup';
import ContentWrapper from '../components/ContentWrapper';

export default function RecipeDetail() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { id } = route.params;

  const [recipe, setRecipe] = useState(() => {
    const foundRecipe = RecipeStore.getRecipeById(Array.isArray(id) ? id[0] : id);
    if (!foundRecipe) {
      navigation.goBack();
      return null;
    }
    return foundRecipe;
  });
  const [isMenuVisible, setIsMenuVisible] = useState(false);

  const { colors, colorScheme } = useTheme();

  const { width: windowWidth } = useWindowDimensions();

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

  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(new Set());

  if (!recipe) return null;

  useEffect(() => {
    const recipeId = recipe.id;
    const listener = (recipes: Recipe[]) => {
      const updatedRecipe = recipes.find(r => r.id === recipeId);
      if (updatedRecipe) {
        setRecipe(updatedRecipe);
      }
    };
    
    RecipeStore.addListener(listener);
    return () => RecipeStore.removeListener(listener);
  }, [recipe.id]);

  const handleDelete = () => {
    setIsMenuVisible(false);
    setPopupConfig({
      title: 'Delete Recipe',
      message: 'Are you sure you want to delete this recipe?',
      buttons: [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => setShowPopup(false),
        },
        {
          text: 'Delete',
          style: 'default',
          onPress: () => {
            RecipeStore.deleteRecipe(recipe.id);
            setShowPopup(false);
            navigation.goBack();
          },
        },
      ],
    });
    setShowPopup(true);
  };

  const handleEdit = () => {
    setIsMenuVisible(false);
    navigation.navigate('EditRecipe', { id: recipe.id });
  };

  const handleIngredientCheck = (ingredientId: string) => {
    setCheckedIngredients(prev => {
      const next = new Set(prev);
      if (next.has(ingredientId)) {
        next.delete(ingredientId);
      } else {
        next.add(ingredientId);
      }
      return next;
    });
  };

  const MenuButton = () => (
    <Pressable 
      onPress={() => setIsMenuVisible(true)}
      style={({ pressed }) => ({ 
        padding: 8,
        opacity: pressed ? 0.7 : 1,
      })}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Ionicons name="ellipsis-vertical" size={24} color={colors.tint} />
    </Pressable>
  );

  const imageStyle = [
    styles.image,
    windowWidth > 900 ? {
      padding: 16,
      borderRadius: 12,
      overflow: 'hidden' as const,
    } : {
      borderBottomLeftRadius: 12,
      borderBottomRightRadius: 12,
      overflow: 'hidden' as const,
    }
  ];

  const hasGroups = (Array.isArray(recipe.ingredientsGroups) && recipe.ingredientsGroups.length > 0) ||
                    (Array.isArray(recipe.instructionGroups) && recipe.instructionGroups.length > 0);
  const hasSteps = Array.isArray(recipe.steps) && recipe.steps.length > 0;

  const renderStepSection = (step: RecipeStep, stepIndex: number) => {
    return (
      <View key={step.id}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {step.title ? step.title : `Step ${stepIndex + 1}`}
          </Text>
        </View>

        {step.ingredients.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.subSectionTitle, { color: colors.text }]}>Ingredients</Text>
            {step.ingredients.map((ingredient) => {
              const isChecked = checkedIngredients.has(ingredient.id);
              return (
                <View key={ingredient.id} style={styles.ingredientRow}>
                  <TouchableOpacity 
                    onPress={() => handleIngredientCheck(ingredient.id)}
                    style={styles.checkboxContainer}
                  >
                    <Ionicons 
                      name={isChecked ? 'checkbox' : 'square-outline'} 
                      size={25} 
                      color={isChecked ? colors.tint : colors.text} 
                    />
                  </TouchableOpacity>
                  <Text style={[
                    styles.ingredient, 
                    { color: colors.text },
                    isChecked && { opacity: 0.3 }
                  ]}>
                    {ingredient.name}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {step.instructions.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.subSectionTitle, { color: colors.text }]}>Instructions</Text>
            {step.instructions.map((instruction, idx) => (
              <View 
                key={`${step.id}-${idx}`} 
                style={[
                  styles.instructionCard, 
                  { backgroundColor: colors.cardBackground }
                ]}
              >
                <Text style={[styles.instructionNumber, { color: colors.tint }]}>
                  {idx + 1}
                </Text>
                <Text style={[styles.instruction, { color: colors.text }]}>
                  {instruction}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderGroups = () => {
    return (
      <View>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Ingredients</Text>
          {(recipe.ingredientsGroups || []).map((group, gi) => (
            <View key={group.id || `${gi}`} style={{ marginBottom: 8 }}>
              {group.title ? (
                <Text style={[styles.groupTitle, { color: colors.text }]}>{group.title}</Text>
              ) : null}
              {group.items.map((ingredient) => {
                const isChecked = checkedIngredients.has(ingredient.id);
                return (
                  <View key={ingredient.id} style={styles.ingredientRow}>
                    <TouchableOpacity 
                      onPress={() => handleIngredientCheck(ingredient.id)}
                      style={styles.checkboxContainer}
                    >
                      <Ionicons 
                        name={isChecked ? 'checkbox' : 'square-outline'} 
                        size={25} 
                        color={isChecked ? colors.tint : colors.text} 
                      />
                    </TouchableOpacity>
                    <Text style={[styles.ingredient, { color: colors.text }, isChecked && { opacity: 0.3 }]}>
                      {ingredient.name}
                    </Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Instructions</Text>
          {(recipe.instructionGroups || []).map((group, gi) => (
            <View key={group.id || `${gi}`} style={{ marginBottom: 8 }}>
              {group.title ? (
                <Text style={[styles.groupTitle, { color: colors.text }]}>{group.title}</Text>
              ) : null}
              {group.items.map((instruction, idx) => (
                <View 
                  key={`${group.id || gi}-${idx}`} 
                  style={[styles.instructionCard, { backgroundColor: colors.cardBackground }]}
                >
                  <Text style={[styles.instructionNumber, { color: colors.tint }]}>
                    {idx + 1}
                  </Text>
                  <Text style={[styles.instruction, { color: colors.text }]}>
                    {instruction}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header 
        title={recipe.name}
        rightElement={<MenuButton />}
      />
      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={[
          { flexGrow: 1 },
          Platform.select({ web: { minHeight: '100%' } }) as any,
        ]}
      >
        <ContentWrapper>
          <View style={[styles.container, { backgroundColor: colors.background }]}> 
            {recipe.imageUri ? (
              <Image source={{ uri: recipe.imageUri }} style={imageStyle} />
            ) : (
              <View style={[styles.image, styles.placeholderImage, { backgroundColor: colors.placeholderBackground }]}>
                <Text style={[styles.placeholderText, { color: colors.deleteButton }]}>No Image</Text>
              </View>
            )}

            <View style={styles.content}>
              <View style={styles.detailsContainer}>
                {recipe.cookingTime && (
                  <View style={styles.detailItem}>
                    <Ionicons name="time-outline" size={16} color={colors.text} style={styles.detailIcon} />
                    <Text style={[styles.detailText, { color: colors.text }]}>{recipe.cookingTime}</Text>
                  </View>
                )}
                {recipe.calories && (
                  <View style={styles.detailItem}>
                    <Ionicons name="flame-outline" size={16} color={colors.text} style={styles.detailIcon} />
                    <Text style={[styles.detailText, { color: colors.text }]}>{recipe.calories}</Text>
                  </View>
                )}
                {recipe.sourceUrl && (
                  <View style={styles.detailItem}>
                    <Ionicons name="link-outline" size={16} color={colors.tint} style={styles.detailIcon} />
                    <TouchableOpacity 
                      onPress={async () => {
                        await Clipboard.setString(recipe.sourceUrl!);
                        if (Platform.OS === 'android') {
                          ToastAndroid.show('Link copied to clipboard', ToastAndroid.SHORT);
                        } else {
                          Alert.alert('Copied', 'Link copied to clipboard');
                        }
                        Linking.openURL(recipe.sourceUrl!);
                      }}
                      activeOpacity={0.6}
                    >
                      <Text style={[styles.detailText, { color: colors.tint }]}>source</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {recipe.tags && recipe.tags.length > 0 && (
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.tagsScrollContainer}
                  contentContainerStyle={styles.tagsContainer}
                >
                  {recipe.tags.map((tag) => (
                    <View key={tag} style={[styles.tagContainer, { backgroundColor: colors.tint }]}> 
                      <Text style={[styles.tagText, { color: colors.background }]}>{tag}</Text>
                    </View>
                  ))}
                </ScrollView>
              )}

              {hasGroups ? (
                renderGroups()
              ) : hasSteps ? (
                <View>
                  {recipe.steps!.map((step, idx) => renderStepSection(step, idx))}
                </View>
              ) : (
                <>
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Ingredients</Text>
                    {recipe.ingredients.map((ingredient) => {
                      const isChecked = checkedIngredients.has(ingredient.id);
                      return (
                        <View key={ingredient.id} style={styles.ingredientRow}>
                          <TouchableOpacity 
                            onPress={() => handleIngredientCheck(ingredient.id)}
                            style={styles.checkboxContainer}
                          >
                            <Ionicons 
                              name={isChecked ? 'checkbox' : 'square-outline'} 
                              size={25} 
                              color={isChecked ? colors.tint : colors.text} 
                            />
                          </TouchableOpacity>
                          <Text style={[styles.ingredient, { color: colors.text }, isChecked && { opacity: 0.3 }]}>
                            {ingredient.name}
                          </Text>
                        </View>
                      );
                    })}
                  </View>

                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Instructions</Text>
                    {recipe.instructions.map((instruction, index) => (
                      <View key={index} style={[styles.instructionCard, { backgroundColor: colors.cardBackground }]}>
                        <Text style={[styles.instructionNumber, { color: colors.tint }]}>
                          {index + 1}
                        </Text>
                        <Text style={[styles.instruction, { color: colors.text }]}>
                          {instruction}
                        </Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </View>
          </View>
        </ContentWrapper>
      </ScrollView>
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
            bottom: Platform.select({
              ios: 'auto',
              android: 'auto',
              default: 'auto'
            }),
            right: 20,
            top: 80,
          }]}> 
            <TouchableOpacity style={styles.menuItem} onPress={handleEdit}>
              <Text style={[styles.menuText, { color: colors.text }]}>Edit Recipe</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={handleDelete}>
              <Text style={[styles.menuText, { color: '#ff3b30' }]}>Delete Recipe</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

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
    backgroundColor: '#fff',
  },
  image: {
    width: '100%',
    height: 270,
  },
  placeholderImage: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 16,
    color: '#666',
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    marginTop: 40,
    opacity: 0.7,
  },
  subSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    opacity: 0.7,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    opacity: 0.75,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkboxContainer: {
    marginRight: 12,
  },
  ingredient: {
    fontSize: 16,
    flex: 1,
  },
  instructionCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  instructionNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 12,
    minWidth: 24,
  },
  instruction: {
    fontSize: 16,
    lineHeight: 24,
    flex: 1,
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
    minWidth: 150,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  menuItem: {
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  menuText: {
    fontSize: 17,
  },
  detailsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
    minHeight: 24,
  },
  detailIcon: {
    marginRight: 4,
    opacity: 0.6,
  },
  detailText: {
    fontSize: 14,
    opacity: 0.6,
    paddingVertical: 4,
  },
  tagsScrollContainer: {
    overflow: 'visible',
    marginBottom: 24,
    marginHorizontal: -16,
  },
  tagsContainer: {
    flexDirection: 'row',
    gap: 8,
    overflow: 'visible',
    paddingHorizontal: 16,
  },
  tagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 16,
    height: 32,
  },
  tagText: {
    fontSize: 14,
    fontWeight: '500',
  },
}); 