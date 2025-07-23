import React from 'react';
import { View, Text, FlatList, Pressable, Image, StyleSheet, Dimensions, Platform, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Recipe } from '../models/Recipe';
import { useTheme } from '../hooks/useTheme';

interface RecipeGridProps {
    recipes: Recipe[];
    numColumns: number;
    cardWidth: number;
    gap: number;
    padding: number;
}

export default function RecipeGrid({ recipes, numColumns, cardWidth, gap, padding }: RecipeGridProps) {
    const navigation = useNavigation<any>();
    const { colors } = useTheme();

    const styles = StyleSheet.create({
        gridContainer: {
            padding,
        },
        columnWrapper: {
            justifyContent: 'space-between',
            marginBottom: gap,
        },
        container: {
            width: cardWidth,
        },
        image: {
            width: '100%',
            aspectRatio: 1,
            borderRadius: 8,
        },
        placeholderImage: {
            backgroundColor: colors.placeholderBackground,
            justifyContent: 'center',
            alignItems: 'center',
        },
        placeholderText: {
            color: colors.text,
            opacity: 0.5,
        },
        title: {
            fontSize: 16,
            marginTop: 4,
            textAlign: 'left',
            fontWeight: 'bold',
            color: colors.text,
            opacity: 0.8,
        },
    });

    return (
        <FlatList
            key={`grid-${numColumns}`}
            data={recipes}
            numColumns={numColumns}
            columnWrapperStyle={[styles.columnWrapper, { gap }]}
            contentContainerStyle={{
                paddingBottom: padding + 80,
                paddingHorizontal: padding,
            }}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
                <TouchableOpacity
                    style={{ width: cardWidth }}
                    onPress={() => navigation.navigate('RecipeDetail', { id: item.id })}
                >
                    {item.imageUri ? (
                        <Image source={{ uri: item.imageUri }} style={styles.image} />
                    ) : (
                        <View style={[styles.image, styles.placeholderImage]}>
                            <Text style={styles.placeholderText}>No Image</Text>
                        </View>
                    )}
                    <Text style={styles.title} numberOfLines={2}>{item.name}</Text>
                </TouchableOpacity>
            )}
            ListHeaderComponent={() => <View style={{ height: padding }} />}
            showsVerticalScrollIndicator={false}
        />
    );
} 