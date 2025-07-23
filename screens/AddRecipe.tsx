import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { Recipe, Ingredient } from '../models/Recipe';
import RecipeStore from '../store/RecipeStore';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../hooks/useTheme';
import Colors from '../constants/Colors';
import Header from '../components/Header';
import CustomPopup from '../components/CustomPopup';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NestableScrollContainer } from 'react-native-draggable-flatlist/src/components/NestableScrollContainer';
import { NestableDraggableFlatList } from 'react-native-draggable-flatlist/src/components/NestableDraggableFlatList';
import ContentWrapper from '../components/ContentWrapper';

export default function AddRecipe() {
  const router = useNavigation();
  const [name, setName] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([new Ingredient('')]);
  const [instructions, setInstructions] = useState<Ingredient[]>([new Ingredient('')]);
  const [sourceUrl, setSourceUrl] = useState('');
  const [cookingTime, setCookingTime] = useState('');
  const [calories, setCalories] = useState('');
  const [newTag, setNewTag] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [showPopup, setShowPopup] = useState(false);
  const [popupConfig, setPopupConfig] = useState({
    title: '',
    message: '',
    buttons: [] as Array<{ text: string; onPress: () => void }>,
  });
  const [isScrollEnabled, setIsScrollEnabled] = useState(true);

  // const colorScheme = useColorScheme() ?? 'light';
  // const colors = Colors[colorScheme];
  const { colors, colorScheme } = useTheme();

  const handleAddImage = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
    });

    if (!result.didCancel && result.assets && result.assets[0].uri) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleIngredientChange = (text: string, index: number) => {
    const updatedIngredients = [...ingredients];
    
    if (index < ingredients.length) {
      updatedIngredients[index] = {
        ...updatedIngredients[index],
        name: text
      };
    }

    const lastIngredient = updatedIngredients[updatedIngredients.length - 1];
    if (lastIngredient.name.trim() !== '') {
      updatedIngredients.push(new Ingredient(''));
    }

    setIngredients(updatedIngredients);
  };

  const handleInstructionChange = (text: string, index: number) => {
    const updatedInstructions = [...instructions];
    
    if (index < instructions.length) {
      updatedInstructions[index] = {
        ...updatedInstructions[index],
        name: text
      };
    }

    const lastInstruction = updatedInstructions[updatedInstructions.length - 1];
    if (lastInstruction.name.trim() !== '') {
      updatedInstructions.push(new Ingredient(''));
    }

    setInstructions(updatedInstructions);
  };

  const handleAddTag = () => {
    if (newTag.trim()) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleDeleteTag = (tagToDelete: string) => {
    setTags(tags.filter(tag => tag !== tagToDelete));
  };

  const handleSave = () => {
    if (!name.trim()) {
      setPopupConfig({
        title: 'Missing Information',
        message: 'Please enter a recipe name',
        buttons: [
          {
            text: 'OK',
            onPress: () => setShowPopup(false),
          },
        ],
      });
      setShowPopup(true);
      return;
    }


    const recipe = new Recipe({
      name: name.trim(),
      imageUri,
      ingredients,
      instructions: instructions.map(instruction => instruction.name).filter(instruction => instruction.trim()),
      sourceUrl: sourceUrl.trim() || undefined,
      cookingTime: cookingTime.trim() || undefined,
      calories: calories.trim() || undefined,
      tags,
    });

    RecipeStore.addRecipe(recipe);
    router.goBack();
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <Header title="Add recipe" />
        <NestableScrollContainer style={{ flex: 1 }}>
          <ContentWrapper>
            <View style={[styles.container, { backgroundColor: colors.background }]}>
              <View style={styles.form}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Name</Text>
                <TextInput
                  style={[styles.input, {
                    backgroundColor: colors.inputBackground,
                    borderColor: colors.inputBorder,
                    color: colors.text,
                  }]}
                  placeholder="e.g. Spaghetti Carbonara"
                  placeholderTextColor={colors.placeholderText}
                  value={name}
                  onChangeText={setName}
                />

                <Text style={[styles.sectionTitle, { color: colors.text }]}>Image</Text>

                {imageUri ? (
                  <View style={[styles.imagePreview, { backgroundColor: colors.placeholderBackground }]}>
                    <Image source={{ uri: imageUri }} style={styles.previewImage} />
                  </View>
                ) : null}

                <TouchableOpacity
                  style={[styles.imageButton, { backgroundColor: colors.tint }]}
                  onPress={handleAddImage}
                >
                  <Text style={[styles.imageButtonText, { color: colors.background }]}>
                    {imageUri ? 'Change Image' : 'Select Image'}
                  </Text>
                </TouchableOpacity>

                <Text style={[styles.sectionTitle, { color: colors.text }]}>Ingredients</Text>
                <NestableDraggableFlatList
                  data={ingredients}
                  keyExtractor={(item) => item.id}
                  activationDistance={20}
                  autoscrollThreshold={0}
                  containerStyle={{ height: 'auto' }}
                  dragHitSlop={{ top: 0, bottom: 0, left: 0, right: 0 }}
                  scrollEnabled={false}
                  onDragBegin={() => setIsScrollEnabled(false)}
                  onDragEnd={({ data }) => {
                    setIngredients(data);
                    setIsScrollEnabled(true);
                  }}
                  dragItemOverflow={false}
                  renderItem={({ item: ingredient, drag, isActive, getIndex }) => {
                    const index = getIndex() ?? 0;
                    return (
                      <View style={[
                        styles.ingredientRow,
                        { 
                          backgroundColor: colors.background,
                          opacity: isActive ? 0.5 : 1
                        }
                      ]}>
                        <TextInput
                          style={[
                            styles.input,
                            {
                              flex: 1,
                              backgroundColor: colors.inputBackground,
                              borderColor: colors.inputBorder,
                              color: colors.text,
                              marginBottom: 8,
                              marginRight: index === ingredients.length - 1 ? 0 : 8,
                              height: 'auto',
                              minHeight: 48,
                              textAlignVertical: 'center',
                              padding: 12,
                              lineHeight: 20,
                            },
                          ]}
                          placeholder={index === ingredients.length - 1 ? "Add new ingredient" : ""}
                          placeholderTextColor={colors.placeholderText}
                          value={ingredient.name}
                          onChangeText={(text) => handleIngredientChange(text, index)}
                          multiline={true}
                        />
                        {index !== ingredients.length - 1 && (
                          <TouchableOpacity
                            onPressIn={drag}
                            disabled={isActive}
                            style={[
                              styles.dragHandle, 
                              { 
                                backgroundColor: colors.tint,
                                minHeight: 48,
                                alignSelf: 'stretch',
                                marginBottom: 8,
                              }
                            ]}
                          >
                            <Ionicons 
                              name="apps"
                              size={20}
                              color={colors.background}
                            />
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  }}
                />

                <Text style={[styles.sectionTitle, { color: colors.text }]}>Instructions</Text>
                <NestableDraggableFlatList
                  data={instructions}
                  keyExtractor={(item) => item.id}
                  activationDistance={20}
                  autoscrollThreshold={0}
                  containerStyle={{ height: 'auto' }}
                  dragHitSlop={{ top: 0, bottom: 0, left: 0, right: 0 }}
                  scrollEnabled={false}
                  onDragBegin={() => setIsScrollEnabled(false)}
                  onDragEnd={({ data }) => {
                    setInstructions(data);
                    setIsScrollEnabled(true);
                  }}
                  dragItemOverflow={false}
                  renderItem={({ item: instruction, drag, isActive, getIndex }) => {
                    const index = getIndex() ?? 0;
                    return (
                      <View style={[
                        styles.ingredientRow,
                        { 
                          backgroundColor: colors.background,
                          opacity: isActive ? 0.5 : 1
                        }
                      ]}>
                        <TextInput
                          style={[
                            styles.input,
                            {
                              flex: 1,
                              backgroundColor: colors.inputBackground,
                              borderColor: colors.inputBorder,
                              color: colors.text,
                              marginBottom: 8,
                              marginRight: index === instructions.length - 1 ? 0 : 8,
                              height: 'auto',
                              minHeight: 48,
                              textAlignVertical: 'center',
                              padding: 12,
                              lineHeight: 20,
                            },
                          ]}
                          placeholder={index === instructions.length - 1 ? "Add new instruction" : ""}
                          placeholderTextColor={colors.placeholderText}
                          value={instruction.name}
                          onChangeText={(text) => handleInstructionChange(text, index)}
                          multiline={true}
                        />
                        {index !== instructions.length - 1 && (
                          <TouchableOpacity
                            onPressIn={drag}
                            disabled={isActive}
                            style={[
                              styles.dragHandle, 
                              { 
                                backgroundColor: colors.tint,
                                minHeight: 48,
                                alignSelf: 'stretch',
                                marginBottom: 8,
                              }
                            ]}
                          >
                            <Ionicons 
                              name="apps"
                              size={20}
                              color={colors.background}
                            />
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  }}
                />

                <Text style={[styles.sectionTitle, { color: colors.text }]}>Details</Text>
                <View style={styles.detailsRow}>
                  <View style={styles.detailInput}>
                    <Text style={[styles.detailLabel, { color: colors.text }]}>Cooking Time</Text>
                    <TextInput
                      style={[styles.input, {
                        backgroundColor: colors.inputBackground,
                        borderColor: colors.inputBorder,
                        color: colors.text,
                        marginBottom: 0,
                      }]}
                      placeholder="e.g. 30 min"
                      placeholderTextColor={colors.placeholderText}
                      value={cookingTime}
                      onChangeText={setCookingTime}
                    />
                  </View>
                  <View style={styles.detailInput}>
                    <Text style={[styles.detailLabel, { color: colors.text }]}>Calories</Text>
                    <TextInput
                      style={[styles.input, {
                        backgroundColor: colors.inputBackground,
                        borderColor: colors.inputBorder,
                        color: colors.text,
                        marginBottom: 0,
                      }]}
                      placeholder="e.g. 250 kcal"
                      placeholderTextColor={colors.placeholderText}
                      value={calories}
                      onChangeText={setCalories}
                      // keyboardType="numeric"
                    />
                  </View>
                </View>

                <Text style={[styles.detailLabel, { color: colors.text }]}>Tags</Text>
                <View style={styles.ingredientInput}>
                  <TextInput
                    style={[styles.input, { 
                      flex: 1, 
                      marginBottom: 0,
                      backgroundColor: colors.inputBackground,
                      borderColor: colors.inputBorder,
                      color: colors.text,
                      height: 48,  // Fixed height to match EditRecipe
                    }]}
                    placeholder="e.g. vegetarian"
                    placeholderTextColor={colors.placeholderText}
                    value={newTag}
                    onChangeText={setNewTag}
                    onSubmitEditing={handleAddTag}
                  />
                  <TouchableOpacity
                    style={[styles.addButton, { backgroundColor: colors.tint }]}
                    onPress={handleAddTag}
                  >
                    <Ionicons name="add" size={28} color={colors.background} />
                  </TouchableOpacity>
                </View>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.tagsScrollContainer}
                  contentContainerStyle={styles.tagsContainer}
                >
                  {tags.map((tag) => (
                    <View key={tag} style={[styles.tagContainer, { backgroundColor: colors.tint }]}>
                      <Text style={[styles.tagText, { color: colors.background }]}>{tag}</Text>
                      <TouchableOpacity 
                        style={styles.tagDeleteButton} 
                        onPress={() => handleDeleteTag(tag)}
                      >
                        <Ionicons 
                          name="close-circle" 
                          size={24} 
                          color={colors.background} 
                          style={styles.tagDeleteIcon} 
                        />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>

                <Text style={[styles.detailLabel, { color: colors.text }]}>Source URL</Text>
                <TextInput
                  style={[styles.input, {
                    backgroundColor: colors.inputBackground,
                    borderColor: colors.inputBorder,
                    color: colors.text,
                  }]}
                  placeholder="www.cookingwebite.com"
                  placeholderTextColor={colors.placeholderText}
                  value={sourceUrl}
                  onChangeText={setSourceUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <TouchableOpacity
                  style={[styles.saveButton, { backgroundColor: colors.tint }]}
                  onPress={handleSave}
                >
                  <Text style={[styles.saveButtonText, { color: colors.background }]}>Save Recipe</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ContentWrapper>
        </NestableScrollContainer>
      </View>
      <CustomPopup
        visible={showPopup}
        title={popupConfig.title}
        message={popupConfig.message}
        buttons={popupConfig.buttons}
        onClose={() => setShowPopup(false)}
      />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  form: {
    padding: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 16,
    minHeight: 48,
    padding: 12,
    textAlignVertical: 'center',
    lineHeight: 20,
  },
  imageButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 24,
  },
  imageButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    marginTop: 40,
    opacity: 0.7,
  },
  ingredient: {
    fontSize: 16,
    flex: 1,
  },
  ingredientInput: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  addButton: {
    backgroundColor: '#007AFF',
    width: 46,
    height: 48,  // Match TextInput height
    borderRadius: 8,
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionsInput: {
    height: 300,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#34C759',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  deleteButton: {
    backgroundColor: '#8e8e93',
    width: 46,
    aspectRatio: 1,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  detailInput: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 15,
    marginBottom: 8,
    marginTop: 12,
    opacity: 0.7,
  },
  tagsScrollContainer: {
    overflow: 'visible',
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
    paddingLeft: 12,
    paddingRight: 4,
    borderRadius: 16,
    height: 32,
    marginBottom: 16,
  },
  tagText: {
    fontSize: 14,
    marginRight: 4,
    fontWeight: '500',
  },
  tagDeleteButton: {
    height: 32,
    width: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagDeleteIcon: {
    opacity: 0.8,
  },
  dragHandle: {
    width: 46,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 