import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { Recipe, Ingredient, RecipeStep } from '../models/Recipe';
import RecipeStore from '../store/RecipeStore';
import { useNavigation, useRoute } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../hooks/useTheme';
import Header from '../components/Header';
import CustomPopup from '../components/CustomPopup';
import TextInputPopup from '../components/TextInputPopup';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NestableScrollContainer } from 'react-native-draggable-flatlist';
import ContentWrapper from '../components/ContentWrapper';
import { CURRENT_SCHEMA_VERSION } from '../models/RecipeMigrations';
import GroupsEditor, { GroupDraft } from '../components/GroupsEditor';

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export default function EditRecipe() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { id } = route.params;
  const originalRecipe = RecipeStore.getRecipeById(Array.isArray(id) ? id[0] : id);
  
  if (!originalRecipe) {
    navigation.goBack();
    return null;
  }

  const [name, setName] = useState(originalRecipe.name);
  const [imageUri, setImageUri] = useState<string | null>(originalRecipe.imageUri);
  const [ingredientGroups, setIngredientGroups] = useState<GroupDraft[]>(() => {
    const steps = Array.isArray(originalRecipe.steps) && originalRecipe.steps.length > 0
      ? originalRecipe.steps
      : [new RecipeStep({ title: '', ingredients: originalRecipe.ingredients, instructions: originalRecipe.instructions })];
    return steps.map((s) => ({
      id: generateId(),
      title: s.title || '',
      items: (s.ingredients || []).map((ing) => ({ id: generateId(), text: ing.name })),
    }));
  });
  const [instructionGroups, setInstructionGroups] = useState<GroupDraft[]>(() => {
    const steps = Array.isArray(originalRecipe.steps) && originalRecipe.steps.length > 0
      ? originalRecipe.steps
      : [new RecipeStep({ title: '', ingredients: originalRecipe.ingredients, instructions: originalRecipe.instructions })];
    return steps.map((s) => ({
      id: generateId(),
      title: s.title || '',
      items: (s.instructions || []).map((txt) => ({ id: generateId(), text: txt })),
    }));
  });
  const [cookingTime, setCookingTime] = useState(originalRecipe.cookingTime || '');
  const [calories, setCalories] = useState(originalRecipe.calories || '');
  const [sourceUrl, setSourceUrl] = useState(originalRecipe.sourceUrl || '');
  const [newTag, setNewTag] = useState('');
  const [tags, setTags] = useState<string[]>(originalRecipe.tags || []);
  const [showPopup, setShowPopup] = useState(false);
  const [popupConfig, setPopupConfig] = useState({
    title: '',
    message: '',
    buttons: [] as Array<{ text: string; onPress: () => void }>,
  });
  const [isScrollEnabled, setIsScrollEnabled] = useState(true);
  const { colors, colorScheme } = useTheme();

  type SectionKey = 'ingredients' | 'instructions';
  const [itemEditor, setItemEditor] = useState<{
    visible: boolean;
    mode: 'add' | 'edit';
    section: SectionKey;
    groupId: string | null;
    itemId?: string;
    initialText: string;
  }>({ visible: false, mode: 'add', section: 'ingredients', groupId: null, initialText: '' });

  const findGroupsBySection = (section: SectionKey) => section === 'ingredients' ? ingredientGroups : instructionGroups;
  const setGroupsBySection = (section: SectionKey, next: GroupDraft[]) => {
    if (section === 'ingredients') setIngredientGroups(next); else setInstructionGroups(next);
  };

  const handleOpenAddItem = (section: SectionKey, groupId?: string) => {
    const groups = findGroupsBySection(section);
    let targetGroupId = groupId || (groups[groups.length - 1]?.id ?? null);
    if (!targetGroupId) {
      const newGroup: GroupDraft = { id: generateId(), title: '', items: [] };
      setGroupsBySection(section, [...groups, newGroup]);
      targetGroupId = newGroup.id;
    }
    setItemEditor({ visible: true, mode: 'add', section, groupId: targetGroupId, initialText: '' });
  };

  const handleOpenEditItem = (section: SectionKey, groupId: string, itemId: string, currentText: string) => {
    setItemEditor({ visible: true, mode: 'edit', section, groupId, itemId, initialText: currentText });
  };

  const handleConfirmItemEditor = (text: string) => {
    const { section, groupId, mode, itemId } = itemEditor;
    const groups = findGroupsBySection(section);
    const idx = groups.findIndex(g => g.id === groupId);
    if (idx === -1) { setItemEditor(prev => ({ ...prev, visible: false })); return; }
    const group = groups[idx];
    const items = [...group.items];
    if (mode === 'add') {
      items.push({ id: generateId(), text: text.trim() });
    } else if (mode === 'edit' && itemId) {
      const i = items.findIndex(it => it.id === itemId);
      if (i !== -1) items[i] = { ...items[i], text: text };
    }
    const next = [...groups];
    next[idx] = { ...group, items };
    setGroupsBySection(section, next);
    setItemEditor(prev => ({ ...prev, visible: false }));
  };

  const handleAddImage = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
      includeBase64: false,
    });

    if (!result.didCancel && result.assets && result.assets[0].uri) {
      setImageUri(result.assets[0].uri);
    }
  };

  const buildStepsFromGroups = (): RecipeStep[] => {
    type Acc = { ingredients: string[]; instructions: string[] };
    const acc = new Map<string, Acc>();

    const norm = (t: string) => (t || '').trim();

    for (const g of ingredientGroups) {
      const key = norm(g.title);
      if (!acc.has(key)) acc.set(key, { ingredients: [], instructions: [] });
      acc.get(key)!.ingredients.push(...g.items.map(i => i.text.trim()).filter(Boolean));
    }
    for (const g of instructionGroups) {
      const key = norm(g.title);
      if (!acc.has(key)) acc.set(key, { ingredients: [], instructions: [] });
      acc.get(key)!.instructions.push(...g.items.map(i => i.text.trim()).filter(Boolean));
    }

    return Array.from(acc.entries()).map(([title, val]) => new RecipeStep({
      title: title || undefined,
      ingredients: val.ingredients.map(txt => new Ingredient(txt)),
      instructions: val.instructions,
    }));
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

    const steps = buildStepsFromGroups();
    const updatedRecipe = new Recipe({
      id: originalRecipe.id,
      name: name.trim(),
      imageUri,
      ingredients: [],
      instructions: [],
      sourceUrl: sourceUrl.trim() || undefined,
      cookingTime: cookingTime.trim() || undefined,
      calories: calories.trim() || undefined,
      tags,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      steps,
    });

    RecipeStore.updateRecipe(updatedRecipe);
    navigation.goBack();
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <Header title="Edit recipe" />
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
                    height: 'auto',
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
                <GroupsEditor
                  title="Ingredients"
                  groups={ingredientGroups}
                  onChange={setIngredientGroups}
                  placeholderNewGroup="e.g. Sauce"
                  placeholderItem="e.g. 200g tomatoes"
                  onEditItemRequest={(groupId, itemId, currentText) => handleOpenEditItem('ingredients', groupId, itemId, currentText)}
                  onAddItemRequest={(groupId) => handleOpenAddItem('ingredients', groupId)}
                  singleGroup
                />

                <Text style={[styles.sectionTitle, { color: colors.text }]}>Instructions</Text>
                <GroupsEditor
                  title="Instructions"
                  groups={instructionGroups}
                  onChange={setInstructionGroups}
                  placeholderNewGroup="e.g. Sauce"
                  placeholderItem="e.g. Sauté onions until soft"
                  onEditItemRequest={(groupId, itemId, currentText) => handleOpenEditItem('instructions', groupId, itemId, currentText)}
                  onAddItemRequest={(groupId) => handleOpenAddItem('instructions', groupId)}
                  singleGroup
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
                        height: 'auto',
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
                        height: 'auto',
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
                      height: 48,
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
                    <Ionicons name="add" size={24} color={colors.background} />
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
                    height: 'auto',
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
                  <Text style={[styles.saveButtonText, { color: colors.background }]}>Save Changes</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ContentWrapper>
        </NestableScrollContainer>
        <CustomPopup
          visible={showPopup}
          title={popupConfig.title}
          message={popupConfig.message}
          buttons={popupConfig.buttons}
          onClose={() => setShowPopup(false)}
        />
        <TextInputPopup
          visible={itemEditor.visible}
          title={itemEditor.mode === 'add' ? 'Add item' : 'Edit item'}
          initialValue={itemEditor.initialText}
          placeholder={itemEditor.section === 'ingredients' ? 'e.g. 200g tomatoes' : 'e.g. Sauté onions until soft'}
          confirmText={itemEditor.mode === 'add' ? 'Add' : 'Save'}
          onConfirm={handleConfirmItemEditor}
          onCancel={() => setItemEditor(prev => ({ ...prev, visible: false }))}
        />
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
  ingredientInput: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  addButton: {
    backgroundColor: '#007AFF',
    width: 46,
    height: 48,
    borderRadius: 8,
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dragHandle: {
    width: 46,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 