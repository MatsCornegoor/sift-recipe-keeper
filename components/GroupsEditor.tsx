import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { NestableDraggableFlatList } from 'react-native-draggable-flatlist';
import { useTheme } from '../hooks/useTheme';

export interface GroupItemDraft {
  id: string;
  text: string;
  isHeader?: boolean;
}

export interface GroupDraft {
  id: string;
  title: string;
  items: GroupItemDraft[];
  collapsed?: boolean;
}

export interface GroupsEditorProps {
  title: string; // kept for compatibility
  groups: GroupDraft[];
  onChange: (next: GroupDraft[]) => void;
  placeholderNewGroup?: string; // kept for compatibility
  placeholderItem?: string;
  onAddItemRequest?: (groupId: string) => void;
  onEditItemRequest?: (groupId: string, itemId: string, currentText: string, isHeader?: boolean) => void;
  singleGroup?: boolean; // kept for compatibility
}

export default function GroupsEditor({
  // title is intentionally unused to keep UI minimal
  groups,
  onChange,
  placeholderItem = 'Add new item',
  onAddItemRequest,
  onEditItemRequest,
}: GroupsEditorProps) {
  const { colors } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          marginTop: 24,
        },
        itemRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          marginBottom: 8,
        },
        itemCard: {
          flex: 1,
          borderWidth: 1,
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 12,
          borderColor: colors.inputBorder,
          backgroundColor: colors.inputBackground,
        },
        itemCardText: {
          color: colors.text,
          fontSize: 16,
        },
        headerText: {
          color: colors.text,
          fontSize: 16,
          fontWeight: '700',
          opacity: 0.9,
        },
        addItemButton: {
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'flex-start',
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 8,
          backgroundColor: colors.tint,
          marginTop: 4,
        },
        addItemText: {
          color: colors.background,
          fontWeight: '600',
          marginLeft: 6,
        },
      }),
    [colors]
  );

  const group = groups[0];
  const items = group?.items ?? [];

  return (
    <View style={styles.container}>
      <NestableDraggableFlatList
        data={items}
        keyExtractor={(it) => it.id}
        onDragEnd={({ data }) => {
          if (!group) return;
          const next = [...groups];
          next[0] = { ...group, items: data };
          onChange(next);
        }}
        renderItem={({ item: it, drag: dragItem, isActive: isItemActive }) => (
          <View style={[styles.itemRow, { opacity: isItemActive ? 0.5 : 1 }] }>
            <TouchableOpacity
              style={styles.itemCard}
              onPress={() => group && onEditItemRequest?.(group.id, it.id, it.text, it.isHeader)}
              onLongPress={dragItem}
              delayLongPress={300}
            >
              <Text style={it.isHeader ? styles.headerText : styles.itemCardText}>{it.text || placeholderItem}</Text>
            </TouchableOpacity>
          </View>
        )}
      />
      <TouchableOpacity onPress={() => onAddItemRequest?.(group?.id ?? '')} style={styles.addItemButton}>
        <Ionicons name="add" size={18} color={colors.background} />
        <Text style={styles.addItemText}>Add</Text>
      </TouchableOpacity>
    </View>
  );
} 