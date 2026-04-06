import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
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

export default function AddRecipeFile() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [dots, setDots] = useState('');
  const { colors } = useTheme();
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
      }, 400); // Change dots every 400ms
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
      setDots('');
    };
  }, [loading]);

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

      const recipe = await RecipeExtractorService.extractRecipeFromFile(filePath, fileName);
      await RecipeStore.addRecipe(recipe);
      navigation.goBack();
    } catch (error) {
      if (DocumentPicker.isCancel(error)) return;
      console.error('File import error:', error);
      setPopupConfig({
        title: 'Error',
        message: 'Failed to extract recipe from file. Please try again.',
        buttons: [{ text: 'OK', onPress: () => setShowPopup(false) }],
      });
      setShowPopup(true);
    } finally {
      setLoading(false);
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
            <Text style={styles.hint}>
              Usage example: Save a recipe page with your browser's "Save Page" feature, then import it here. Useful for paywalled or bot-protected pages.
            </Text>
            <TouchableOpacity
              style={styles.button}
              onPress={handleFileImport}
              disabled={loading}
            >
              {loading ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.buttonText}>
                    Adding
                  </Text>
                  <Text style={[styles.buttonText, styles.dotsContainer]}>
                    {dots}
                  </Text>
                </View>
              ) : (
                <Text style={styles.buttonText}>
                  Select file
                </Text>
              )}
            </TouchableOpacity>
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
  hint: {
    fontSize: 13,
    lineHeight: 19,
    opacity: 0.5,
    color: colors.text,
    marginBottom: 24,
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: colors.tint,
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
    width: 24, // Fixed width for 3 dots
  },
});
