import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Plus, XCircle } from 'lucide-react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import GroupsEditor, { GroupDraft } from './GroupsEditor';
import CustomPopup from './CustomPopup';
import TextInputPopup from './TextInputPopup';
import Button from './ui/Button';
import Input from './ui/Input';
import { Recipe, Ingredient, IngredientGroup, InstructionGroup } from '../models/Recipe';
import { CURRENT_SCHEMA_VERSION } from '../models/RecipeMigrations';

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export interface RecipeFormProps {
  mode: 'add' | 'edit';
  initialRecipe?: Recipe;
  onSave: (recipe: Recipe) => void;
  onCancel?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}

export interface RecipeFormHandle {
  submit: () => void;
}

const RecipeForm = forwardRef<RecipeFormHandle, RecipeFormProps>(function RecipeForm(
  { mode, initialRecipe, onSave, onCancel, onDirtyChange },
  ref,
) {
  const { colors } = useTheme();

  const [name, setName] = useState(initialRecipe?.name ?? '');
  const [imageUri, setImageUri] = useState<string | null>(initialRecipe?.imageUri ?? null);

  const [ingredientGroups, setIngredientGroups] = useState<GroupDraft[]>(() => {
    if (initialRecipe) {
      // Use v2+ grouped structure only; flatten to single list with optional in-list headers
      if (Array.isArray(initialRecipe.ingredientsGroups) && initialRecipe.ingredientsGroups.length > 0) {
        const combined: GroupDraft = { id: generateId(), title: '', items: [] };
        initialRecipe.ingredientsGroups.forEach((g) => {
          const title = (g.title || '').trim();
          if (title) combined.items.push({ id: generateId(), text: title, isHeader: true });
          (g.items || []).forEach((ing) => combined.items.push({ id: generateId(), text: ing.name }));
        });
        if (combined.items.length > 0) return [combined];
      }
      // If no groups present, start with an empty list
      return [{ id: generateId(), title: '', items: [] }];
    }
    return [{ id: generateId(), title: '', items: [] }];
  });

  const [instructionGroups, setInstructionGroups] = useState<GroupDraft[]>(() => {
    if (initialRecipe) {
      if (Array.isArray(initialRecipe.instructionGroups) && initialRecipe.instructionGroups.length > 0) {
        const combined: GroupDraft = { id: generateId(), title: '', items: [] };
        initialRecipe.instructionGroups.forEach((g) => {
          const title = (g.title || '').trim();
          if (title) combined.items.push({ id: generateId(), text: title, isHeader: true });
          (g.items || []).forEach((txt) => combined.items.push({ id: generateId(), text: txt }));
        });
        if (combined.items.length > 0) return [combined];
      }
      // If no groups present, start with an empty list
      return [{ id: generateId(), title: '', items: [] }];
    }
    return [{ id: generateId(), title: '', items: [] }];
  });

  const [cookingTime, setCookingTime] = useState(initialRecipe?.cookingTime || '');
  const [calories, setCalories] = useState(initialRecipe?.calories || '');
  const [servings, setServings] = useState(initialRecipe?.servings || '');
  const [sourceUrl, setSourceUrl] = useState(initialRecipe?.sourceUrl || '');
  const [newTag, setNewTag] = useState('');
  const [tags, setTags] = useState<string[]>(initialRecipe?.tags || []);

  const [showPopup, setShowPopup] = useState(false);
  const [popupConfig, setPopupConfig] = useState({
    title: '',
    message: '',
    buttons: [] as Array<{ text: string; onPress: () => void }>,
  });

  type SectionKey = 'ingredients' | 'instructions';
  const [itemEditor, setItemEditor] = useState<{
    visible: boolean;
    mode: 'add' | 'edit';
    section: SectionKey;
    groupId: string | null;
    itemId?: string;
    initialText: string;
    isHeader?: boolean;
  }>({ visible: false, mode: 'add', section: 'ingredients', groupId: null, initialText: '' });

  const findGroupsBySection = (section: SectionKey) => (section === 'ingredients' ? ingredientGroups : instructionGroups);
  const setGroupsBySection = (section: SectionKey, next: GroupDraft[]) => {
    if (section === 'ingredients') setIngredientGroups(next);
    else setInstructionGroups(next);
  };

  const handleOpenAddItem = (section: SectionKey, groupId?: string) => {
    const groups = findGroupsBySection(section);
    const targetGroupId = groupId || groups[0]?.id || null;
    if (!targetGroupId) return;
    setItemEditor({ visible: true, mode: 'add', section, groupId: targetGroupId, initialText: '', isHeader: false });
  };

  const handleOpenEditItem = (section: SectionKey, groupId: string, itemId: string, currentText: string, isHeader?: boolean) => {
    setItemEditor({ visible: true, mode: 'edit', section, groupId, itemId, initialText: currentText, isHeader: !!isHeader });
  };

  const handleConfirmItemEditor = (text: string, type: 'item' | 'header') => {
    const { section, groupId, mode: editMode, itemId } = itemEditor;
    const groups = findGroupsBySection(section);
    const idx = groups.findIndex((g) => g.id === groupId);
    if (idx === -1) {
      setItemEditor((prev) => ({ ...prev, visible: false }));
      return;
    }
    const group = groups[idx];

    const items = [...group.items];
    if (editMode === 'add') {
      items.push({ id: generateId(), text: text.trim(), isHeader: type === 'header' });
    } else if (editMode === 'edit' && itemId) {
      const i = items.findIndex((it) => it.id === itemId);
      if (i !== -1) items[i] = { ...items[i], text: text, isHeader: type === 'header' } as any;
    }
    const next = [...groups];
    next[idx] = { ...group, items };
    setGroupsBySection(section, next);
    setItemEditor((prev) => ({ ...prev, visible: false }));
  };

  const toIngredientGroups = (drafts: GroupDraft[]): IngredientGroup[] => {
    const output: IngredientGroup[] = [];

    const flushGroup = (title: string | undefined, items: Ingredient[]) => {
      const cleanTitle = (title || '').trim() || undefined;
      const cleanItems = items.filter((i) => (i?.name || '').trim());
      if (cleanTitle || cleanItems.length > 0) {
        output.push(
          new IngredientGroup({
            title: cleanTitle,
            items: cleanItems,
          })
        );
      }
    };

    drafts.forEach((g) => {
      let currentTitle: string | undefined = (g.title || '').trim() || undefined;
      let currentItems: Ingredient[] = [];

      (g.items || []).forEach((it) => {
        const text = (it.text || '').trim();
        if (!text) return;
        if (it.isHeader) {
          // Close previous group
          flushGroup(currentTitle, currentItems);
          // Start new group titled by this header
          currentTitle = text;
          currentItems = [];
        } else {
          currentItems.push(new Ingredient(text));
        }
      });

      // Flush trailing group
      flushGroup(currentTitle, currentItems);
    });

    return output;
  };

  const toInstructionGroups = (drafts: GroupDraft[]): InstructionGroup[] => {
    const output: InstructionGroup[] = [];

    const flushGroup = (title: string | undefined, items: string[]) => {
      const cleanTitle = (title || '').trim() || undefined;
      const cleanItems = items.map((t) => (t || '').trim()).filter(Boolean);
      if (cleanTitle || cleanItems.length > 0) {
        output.push(
          new InstructionGroup({
            title: cleanTitle,
            items: cleanItems,
          })
        );
      }
    };

    drafts.forEach((g) => {
      let currentTitle: string | undefined = (g.title || '').trim() || undefined;
      let currentItems: string[] = [];

      (g.items || []).forEach((it) => {
        const text = (it.text || '').trim();
        if (!text) return;
        if (it.isHeader) {
          // Close previous group
          flushGroup(currentTitle, currentItems);
          // Start new group titled by this header
          currentTitle = text;
          currentItems = [];
        } else {
          currentItems.push(text);
        }
      });

      // Flush trailing group
      flushGroup(currentTitle, currentItems);
    });

    return output;
  };

  const mountedRef = useRef(false);
  useEffect(() => {
    if (mountedRef.current) {
      onDirtyChange?.(true);
    } else {
      mountedRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, imageUri, ingredientGroups, instructionGroups, cookingTime, calories, servings, sourceUrl, tags]);

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

    const ingredientsGroupsOut = toIngredientGroups(ingredientGroups);
    const instructionGroupsOut = toInstructionGroups(instructionGroups);

    const recipe = new Recipe({
      id: mode === 'edit' && initialRecipe ? initialRecipe.id : undefined,
      name: name.trim(),
      imageUri,
      ingredients: [],
      instructions: [],
      sourceUrl: sourceUrl.trim() || undefined,
      cookingTime: cookingTime.trim() || undefined,
      calories: calories.trim() || undefined,
      servings: servings.trim() || undefined,
      tags,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      ingredientsGroups: ingredientsGroupsOut,
      instructionGroups: instructionGroupsOut,
    });

    onSave(recipe);
  };

  const handleSaveRef = useRef(handleSave);
  handleSaveRef.current = handleSave;
  useImperativeHandle(ref, () => ({ submit: () => handleSaveRef.current() }), []);

  const handleAddImage = async () => {
    const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
    if (!result.didCancel && result.assets && result.assets[0].uri) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleAddTag = () => {
    if (newTag.trim()) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleDeleteTag = (tagToDelete: string) => {
    setTags(tags.filter((tag) => tag !== tagToDelete));
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        form: { padding: 16, backgroundColor: colors.background },
        sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, marginTop: 40, opacity: 0.7, color: colors.text },
        imagePreview: { width: '100%', height: 200, marginBottom: 16, borderRadius: 8, overflow: 'hidden', backgroundColor: colors.placeholderBackground },
        previewImage: { width: '100%', height: '100%', resizeMode: 'cover' },
        detailsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, gap: 8 },
        detailInput: { flex: 1 },
        detailLabel: { fontSize: 15, marginBottom: 8, marginTop: 12, opacity: 0.7, color: colors.text },
        ingredientInput: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
        addButton: { backgroundColor: colors.tint, width: 48, height: 48, borderRadius: 8, marginLeft: 8, justifyContent: 'center', alignItems: 'center' },
        tagsScrollContainer: { overflow: 'visible', marginHorizontal: -16 },
        tagsContainer: { flexDirection: 'row', gap: 8, overflow: 'visible', paddingHorizontal: 16 },
        tagContainer: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingLeft: 12, paddingRight: 4, borderRadius: 16, height: 32, marginBottom: 16, backgroundColor: colors.cardBackground, borderWidth: 1, borderColor: colors.inputBorder },
        tagText: { fontSize: 14, marginRight: 4, fontWeight: '500', color: colors.text },
        tagDeleteButton: { height: 32, width: 32, justifyContent: 'center', alignItems: 'center' },
        tagDeleteIcon: { opacity: 0.8 },
      }),
    [colors]
  );

  return (
    <View style={styles.form}>
        <Text style={styles.sectionTitle}>Name</Text>
        <Input
          placeholder="e.g. Spaghetti Carbonara"
          value={name}
          onChangeText={setName}
          style={{ height: 48, marginBottom: 16 }}
        />

        <Text style={styles.sectionTitle}>Image</Text>
        {imageUri ? (
          <View style={styles.imagePreview}>
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
          </View>
        ) : null}
        <Button title={imageUri ? 'Change Image' : 'Select Image'} onPress={handleAddImage} style={{ marginBottom: 24 }} />

        <Text style={styles.sectionTitle}>Ingredients</Text>
        <GroupsEditor
          title="Ingredients"
          groups={ingredientGroups}
          onChange={setIngredientGroups}
          placeholderNewGroup="e.g. Sauce"
          placeholderItem="e.g. 200g tomatoes"
          onEditItemRequest={(groupId, itemId, currentText, isHeader) => handleOpenEditItem('ingredients', groupId, itemId, currentText, isHeader)}
          onAddItemRequest={(groupId) => handleOpenAddItem('ingredients', groupId)}
          singleGroup
        />

        <Text style={styles.sectionTitle}>Instructions</Text>
        <GroupsEditor
          title="Instructions"
          groups={instructionGroups}
          onChange={setInstructionGroups}
          placeholderNewGroup="e.g. Sauce"
          placeholderItem="e.g. Sauté onions until soft"
          onEditItemRequest={(groupId, itemId, currentText, isHeader) => handleOpenEditItem('instructions', groupId, itemId, currentText, isHeader)}
          onAddItemRequest={(groupId) => handleOpenAddItem('instructions', groupId)}
          singleGroup
        />

        <Text style={styles.sectionTitle}>Details</Text>
        <View style={styles.detailsRow}>
          <View style={styles.detailInput}>
            <Text style={styles.detailLabel}>Cooking time</Text>
            <Input
              placeholder="e.g. 30 min"
              value={cookingTime}
              onChangeText={setCookingTime}
              style={{ height: 48 }}
            />
          </View>
          <View style={styles.detailInput}>
            <Text style={styles.detailLabel}>Calories</Text>
            <Input
              placeholder="e.g. 250 kcal"
              value={calories}
              onChangeText={setCalories}
              style={{ height: 48 }}
            />
          </View>
          <View style={styles.detailInput}>
            <Text style={styles.detailLabel}>Servings</Text>
            <Input
              placeholder="e.g. 4"
              value={servings}
              onChangeText={setServings}
              style={{ height: 48 }}
              keyboardType="numeric"
            />
          </View>
        </View>

        <Text style={styles.detailLabel}>Tags</Text>
        <View style={styles.ingredientInput}>
          <Input
            placeholder="e.g. vegetarian"
            value={newTag}
            onChangeText={setNewTag}
            onSubmitEditing={handleAddTag}
            style={{ height: 48, flex: 1 }}
          />
          <TouchableOpacity style={styles.addButton} onPress={handleAddTag}>
            <Plus size={24} color={colors.background} />
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagsScrollContainer} contentContainerStyle={styles.tagsContainer}>
          {tags.map((tag) => (
            <View key={tag} style={styles.tagContainer}> 
              <Text style={styles.tagText}>{tag}</Text>
              <TouchableOpacity style={styles.tagDeleteButton} onPress={() => handleDeleteTag(tag)}>
                <XCircle size={24} color={colors.deleteButton} style={styles.tagDeleteIcon} />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>

        <Text style={styles.detailLabel}>Source URL</Text>
        <Input
          placeholder="www.cookingwebite.com"
          value={sourceUrl}
          onChangeText={setSourceUrl}
          autoCapitalize="none"
          autoCorrect={false}
          style={{ height: 48, marginBottom: 16 }}
        />

        {onCancel && (
          <Button variant="secondary" title="Cancel" onPress={onCancel} style={{ marginTop: 24 }} />
        )}
        <Button title={mode === 'add' ? 'Save Recipe' : 'Save Changes'} onPress={handleSave} style={{ marginTop: 12 }} />

      <CustomPopup visible={showPopup} title={popupConfig.title} message={popupConfig.message} buttons={popupConfig.buttons} onClose={() => setShowPopup(false)} />
      <TextInputPopup
        visible={itemEditor.visible}
        title={itemEditor.mode === 'add' ? 'Add item' : 'Edit item'}
        initialValue={itemEditor.initialText}
        placeholder={itemEditor.section === 'ingredients' ? 'e.g. 200g tomatoes' : 'e.g. Sauté onions until soft'}
        confirmText={itemEditor.mode === 'add' ? 'Add' : 'Save'}
        onConfirm={handleConfirmItemEditor}
        onCancel={() => setItemEditor((prev) => ({ ...prev, visible: false }))}
        initialType={itemEditor.isHeader ? 'header' : 'item'}
        onDelete={
          itemEditor.mode === 'edit' && itemEditor.itemId
            ? () => {
                const { section, groupId, itemId } = itemEditor;
                const groups = findGroupsBySection(section);
                const idx = groups.findIndex((g) => g.id === groupId);
                if (idx === -1) {
                  setItemEditor((prev) => ({ ...prev, visible: false }));
                  return;
                }
                const group = groups[idx];
                const nextItems = group.items.filter((it) => it.id !== itemId);
                const next = [...groups];
                next[idx] = { ...group, items: nextItems };
                setGroupsBySection(section, next);
                setItemEditor((prev) => ({ ...prev, visible: false }));
              }
            : undefined
        }
        deleteText={'Delete'}
      />
    </View>
  );
});

export default RecipeForm;
