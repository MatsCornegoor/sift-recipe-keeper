import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import DocumentPicker from 'react-native-document-picker';
import RNFS from 'react-native-fs';
import RecipeExtractorService from '../services/RecipeExtractorService';
import RecipeStore from '../store/RecipeStore';
import { useTheme } from '../hooks/useTheme';
import Header from '../components/Header';
import CustomPopup from '../components/CustomPopup';
import ContentWrapper from '../components/ContentWrapper';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

// helper function to check if a file is likely binary by reading a small sample and looking for null bytes
// this should prevent users from trying to import non-text files which would cause the extractor to fail
// at the same time we should avoid limiting by file extension
const isLikelyBinary = async (filePath: string): Promise<boolean> => {
  try {
    const sample = await RNFS.read(filePath, 512, 0, 'ascii');
    return sample.includes('\0');
  } catch {
    return false; // if unreadable, the main flow handles the error
  }
};

export default function AddRecipeText() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [loadingSource, setLoadingSource] = useState<'text' | 'file' | null>(null);
  const [dots, setDots] = useState('');
  const { colors } = useTheme();
  const [showPopup, setShowPopup] = useState(false);
  const [recipeText, setRecipeText] = useState('');
  const [popupConfig, setPopupConfig] = useState<{
    title: string;
    message: string;
    buttons: Array<{ text: string; onPress: () => void; style?: 'default' | 'cancel' }>;
  }>({
    title: '',
    message: '',
    buttons: [],
  });

  const styles = useMemo(() => stylesFactory(colors), [colors]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      interval = setInterval(() => {
        setDots(prev => {
          if (prev === '') return '.';
          if (prev === '.') return '..';
          if (prev === '..') return '...';
          return '';
        });
      }, 400);
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
      setDots('');
    };
  }, [loading]);

  const showError = (message: string) => {
    setPopupConfig({
      title: 'Error',
      message,
      buttons: [{ text: 'OK', onPress: () => setShowPopup(false) }],
    });
    setShowPopup(true);
  };

  const handleTextImport = async () => {
    if (!recipeText.trim()) return;
    setLoading(true);
    setLoadingSource('text');
    try {
      const recipe = await RecipeExtractorService.extractRecipeFromText(recipeText.trim());
      await RecipeStore.addRecipe(recipe);
      navigation.goBack();
    } catch (error) {
      console.error('Text import error:', error);
      showError('Failed to extract recipe from text. Please try again.');
    } finally {
      setLoading(false);
      setLoadingSource(null);
    }
  };

  const handleFileImport = async () => {
    try {
      const res = await DocumentPicker.pick({
        type: [DocumentPicker.types.allFiles],
      });

      const file = res[0];
      const fileName = file.name ?? '';

      // On Android the picker returns a content:// URI; copy to a temp path so RNFS can read it
      let filePath = file.fileCopyUri ?? file.uri;
      if (filePath.startsWith('content://')) {
        const tempPath = `${RNFS.TemporaryDirectoryPath}/sift_import_${Date.now()}.tmp`;
        await RNFS.copyFile(filePath, tempPath);
        filePath = tempPath;
      }

      if (await isLikelyBinary(filePath)) {
        setPopupConfig({
          title: 'Unsupported File',
          message: 'Please select a text-based file such as .txt, .html, or .md.',
          buttons: [{ text: 'OK', onPress: () => setShowPopup(false) }],
        });
        setShowPopup(true);
        return;
      }

      setLoading(true);
      setLoadingSource('file');

      const recipe = await RecipeExtractorService.extractRecipeFromFile(filePath, fileName);
      await RecipeStore.addRecipe(recipe);
      navigation.goBack();
    } catch (error) {
      if (DocumentPicker.isCancel(error)) return;
      console.error('File import error:', error);
      showError('Failed to extract recipe from file. Please try again.');
    } finally {
      setLoading(false);
      setLoadingSource(null);
    }
  };

  return (
    <View style={styles.flexView}>
      <Header title="Add recipe" />
      <ScrollView
        style={styles.flexView}
        contentContainerStyle={styles.flexGrow}
      >
        <ContentWrapper>
          <View style={styles.container}>
            {/* Text import section */}
            <Text style={styles.sectionTitle}>Paste recipe text</Text>
            <Text style={styles.hint}>
              Copy a recipe from anywhere and paste the text below.
            </Text>
            <Input
              style={styles.textArea}
              value={recipeText}
              onChangeText={setRecipeText}
              placeholder="Paste recipe text here..."
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              editable={!loading}
            />
            <Button
              onPress={handleTextImport}
              disabled={!recipeText.trim() || loading}
              style={styles.button}
            >
              {loading && loadingSource === 'text' ? (
                <View style={styles.loadingContainer}>
                  <Text style={[styles.buttonText, { color: colors.background }]}>Adding</Text>
                  <Text style={[styles.buttonText, styles.dotsContainer, { color: colors.background }]}>{dots}</Text>
                </View>
              ) : (
                <Text style={[styles.buttonText, { color: colors.background }]}>Add recipe</Text>
              )}
            </Button>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* File import section */}
            <Text style={styles.sectionTitle}>Import from file</Text>
            <Text style={styles.hint}>
              Select a text based file such as .txt, .html, or .md.
            </Text>
            <Button
              onPress={handleFileImport}
              disabled={loading}
              style={styles.button}
            >
              {loading && loadingSource === 'file' ? (
                <View style={styles.loadingContainer}>
                  <Text style={[styles.buttonText, { color: colors.background }]}>Adding</Text>
                  <Text style={[styles.buttonText, styles.dotsContainer, { color: colors.background }]}>{dots}</Text>
                </View>
              ) : (
                <Text style={[styles.buttonText, { color: colors.background }]}>Select file</Text>
              )}
            </Button>
          </View>
        </ContentWrapper>
      </ScrollView>
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
  flexGrow: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: 'transparent',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  hint: {
    color: colors.text,
    fontSize: 16,
    opacity: 0.7,
    marginBottom: 20,
    lineHeight: 22,
  },
  textArea: {
    minHeight: 120,
    padding: 16,
    marginBottom: 16,
    textAlignVertical: 'top',
  },
  button: {
    marginBottom: 4,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background,
  },
  loadingContainer: {
    flexDirection: 'row',
  },
  dotsContainer: {
    width: 24,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.text,
    opacity: 0.15,
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 14,
    color: colors.text,
    opacity: 0.4,
  },
});
