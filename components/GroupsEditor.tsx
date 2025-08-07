import React, { useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { NestableDraggableFlatList, NestableScrollContainer } from 'react-native-draggable-flatlist';
import { useTheme } from '../hooks/useTheme';

export interface GroupItemDraft {
  id: string;
  text: string;
}

export interface GroupDraft {
  id: string;
  title: string;
  items: GroupItemDraft[];
  collapsed?: boolean;
}

export interface GroupsEditorProps {
  title: string;
  groups: GroupDraft[];
  onChange: (next: GroupDraft[]) => void;
  placeholderNewGroup?: string;
  placeholderItem?: string;
}

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export default function GroupsEditor({ title, groups, onChange, placeholderNewGroup = 'New section', placeholderItem = 'Add new item' }: GroupsEditorProps) {
  const { colors } = useTheme();

  const styles = useMemo(() => StyleSheet.create({
    container: {
      marginTop: 24,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      opacity: 0.7,
      color: colors.text,
    },
    addGroupButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: colors.tint,
    },
    addGroupText: {
      color: colors.background,
      fontWeight: '600',
      marginLeft: 6,
    },
    groupCard: {
      borderRadius: 12,
      padding: 12,
      marginBottom: 12,
      backgroundColor: colors.cardBackground,
    },
    groupHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
      gap: 8,
    },
    groupTitleInput: {
      flex: 1,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 10,
      borderColor: colors.inputBorder,
      backgroundColor: colors.inputBackground,
      color: colors.text,
    },
    iconButton: {
      width: 38,
      height: 38,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.tint,
    },
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    itemInput: {
      flex: 1,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 10,
      borderColor: colors.inputBorder,
      backgroundColor: colors.inputBackground,
      color: colors.text,
      minHeight: 44,
    },
    dragHandle: {
      width: 38,
      height: 44,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.tint,
    },
    subsectionTitle: {
      fontSize: 15,
      fontWeight: '600',
      opacity: 0.7,
      color: colors.text,
      marginBottom: 8,
      marginTop: 4,
    },
  }), [colors]);

  const ensureTrailingEmptyItem = (items: GroupItemDraft[]): GroupItemDraft[] => {
    const cloned = [...items];
    if (cloned.length === 0 || cloned[cloned.length - 1].text.trim() !== '') {
      cloned.push({ id: generateId(), text: '' });
    }
    return cloned;
  };

  const handleAddGroup = () => {
    const next = [
      ...groups,
      { id: generateId(), title: '', items: [{ id: generateId(), text: '' }], collapsed: false },
    ];
    onChange(next);
  };

  const handleDeleteGroup = (groupId: string) => {
    onChange(groups.filter(g => g.id !== groupId));
  };

  const toggleCollapse = (groupId: string) => {
    onChange(groups.map(g => g.id === groupId ? { ...g, collapsed: !g.collapsed } : g));
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <TouchableOpacity onPress={handleAddGroup} style={styles.addGroupButton}>
          <Ionicons name="add" size={20} color={colors.background} />
          <Text style={styles.addGroupText}>Add section</Text>
        </TouchableOpacity>
      </View>

      <NestableDraggableFlatList
        data={groups}
        keyExtractor={(g) => g.id}
        onDragEnd={({ data }) => onChange(data)}
        renderItem={({ item: group, drag, isActive, getIndex }) => {
          const groupIndex = getIndex() ?? 0;
          const items = ensureTrailingEmptyItem(group.items);
          return (
            <View style={[styles.groupCard, { opacity: isActive ? 0.5 : 1 }] }>
              <View style={styles.groupHeader}>
                <TouchableOpacity onPressIn={drag} disabled={isActive} style={styles.iconButton}>
                  <Ionicons name="reorder-three" size={22} color={colors.background} />
                </TouchableOpacity>
                <TextInput
                  style={styles.groupTitleInput}
                  placeholder={placeholderNewGroup}
                  placeholderTextColor={colors.placeholderText}
                  value={group.title}
                  onChangeText={(txt) => {
                    const next = [...groups];
                    next[groupIndex] = { ...group, title: txt };
                    onChange(next);
                  }}
                />
                <TouchableOpacity onPress={() => toggleCollapse(group.id)} style={styles.iconButton}>
                  <Ionicons name={group.collapsed ? 'chevron-down' : 'chevron-up'} size={22} color={colors.background} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteGroup(group.id)} style={[styles.iconButton, { backgroundColor: colors.deleteButton }]}>
                  <Ionicons name="trash" size={20} color={colors.background} />
                </TouchableOpacity>
              </View>

              {!group.collapsed && (
                <View>
                  <Text style={styles.subsectionTitle}>Items</Text>
                  <NestableDraggableFlatList
                    data={items}
                    keyExtractor={(it) => it.id}
                    onDragEnd={({ data }) => {
                      const sanitized = data.filter((d, idx) => d.text.trim() !== '' || idx === data.length - 1);
                      const next = [...groups];
                      next[groupIndex] = { ...group, items: sanitized };
                      onChange(next);
                    }}
                    renderItem={({ item: it, drag: dragItem, isActive: isItemActive, getIndex: getItemIndex }) => {
                      const itemIndex = getItemIndex() ?? 0;
                      return (
                        <View style={[styles.itemRow, { opacity: isItemActive ? 0.5 : 1 }] }>
                          <TextInput
                            style={styles.itemInput}
                            placeholder={placeholderItem}
                            placeholderTextColor={colors.placeholderText}
                            value={it.text}
                            onChangeText={(txt) => {
                              const next = [...groups];
                              const groupItems = [...items];
                              groupItems[itemIndex] = { ...it, text: txt };
                              next[groupIndex] = { ...group, items: groupItems };
                              onChange(next);
                            }}
                            multiline
                          />
                          {itemIndex !== items.length - 1 && (
                            <TouchableOpacity onPressIn={dragItem} disabled={isItemActive} style={styles.dragHandle}>
                              <Ionicons name="apps" size={18} color={colors.background} />
                            </TouchableOpacity>
                          )}
                        </View>
                      );
                    }}
                  />
                </View>
              )}
            </View>
          );
        }}
      />
    </View>
  );
} 