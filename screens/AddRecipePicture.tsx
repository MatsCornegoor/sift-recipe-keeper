import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import DocumentPicker from 'react-native-document-picker';
import RNFS from 'react-native-fs';
import { launchCamera } from 'react-native-image-picker';

import RecipeExtractorService from '../services/RecipeExtractorService';
import RecipeStore from '../store/RecipeStore';
import { useTheme } from '../hooks/useTheme';
import Header from '../components/Header';
import CustomPopup from '../components/CustomPopup';
import ContentWrapper from '../components/ContentWrapper';
import Button from '../components/ui/Button';

type SelectedImage = {
  uri: string;
  fileName: string;
};

export default function AddRecipeImage() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = useMemo(() => stylesFactory(colors), [colors]);

  const [loading, setLoading] = useState(false);
  const [loadingSource, setLoadingSource] = useState<'camera' | 'file' | 'import' | null>(null);
  const [dots, setDots] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);

  const [popupConfig, setPopupConfig] = useState<{
    title: string;
    message: string;
    buttons: Array<{ text: string; onPress: () => void; style?: 'default' | 'cancel' }>;
  }>({
    title: '',
    message: '',
    buttons: [],
  });

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

  const normalizePickedFilePath = async (uri: string, fileName: string) => {
    let filePath = uri;

    if (filePath.startsWith('content://')) {
      const extension = fileName.split('.').pop() || 'jpg';
      const tempPath = `${RNFS.TemporaryDirectoryPath}/sift_image_${Date.now()}.${extension}`;
      await RNFS.copyFile(filePath, tempPath);
      filePath = `file://${tempPath}`;
    } else if (filePath.startsWith('/') && !filePath.startsWith('file://')) {
      filePath = `file://${filePath}`;
    }

    return filePath;
  };

  const handleTakePhoto = async () => {
    try {
      const result = await launchCamera({
        mediaType: 'photo',
        cameraType: 'back',
        saveToPhotos: false,
        includeBase64: false,
        quality: 1,
      });

      if (result.didCancel) return;

      if (result.errorCode) {
        showError(result.errorMessage || 'Failed to open the camera.');
        return;
      }

      const asset = result.assets?.[0];
      if (!asset?.uri) {
        showError('No image was captured.');
        return;
      }

      setLoading(true);
      setLoadingSource('camera');

      const fileName = asset.fileName || `camera_${Date.now()}.jpg`;
      const filePath = await normalizePickedFilePath(asset.uri, fileName);

      setSelectedImage({
        uri: filePath,
        fileName,
      });
    } catch (error) {
      console.error('Camera import error:', error);
      showError('Failed to take a photo. Please try again.');
    } finally {
      setLoading(false);
      setLoadingSource(null);
    }
  };

  const handleSelectImage = async () => {
    try {
      const res = await DocumentPicker.pick({
        type: [DocumentPicker.types.images],
        copyTo: 'cachesDirectory',
      });

      const file = res[0];
      const fileName = file.name ?? `image_${Date.now()}.jpg`;
      const fileUri = file.fileCopyUri ?? file.uri;

      setLoading(true);
      setLoadingSource('file');

      const filePath = await normalizePickedFilePath(fileUri, fileName);

      setSelectedImage({
        uri: filePath,
        fileName,
      });
    } catch (error) {
      if (DocumentPicker.isCancel(error)) return;
      console.error('Image picker error:', error);
      showError('Failed to select an image. Please try again.');
    } finally {
      setLoading(false);
      setLoadingSource(null);
    }
  };

  const handleImageImport = async () => {
    if (!selectedImage) return;

    setLoading(true);
    setLoadingSource('import');

    try {
      const recipe = await RecipeExtractorService.extractRecipeFromImage(
        selectedImage.uri,
      );

      await RecipeStore.addRecipe(recipe);
      navigation.goBack();
    } catch (error) {
      console.error('Image import error:', error);
      showError('Failed to extract recipe from image. Please try again.');
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
            <Text style={styles.sectionTitle}>Take a photo</Text>
            <Text style={styles.hint}>
              Use your camera to capture a recipe from a cookbook, note, or screen.
            </Text>

            <Button
              onPress={handleTakePhoto}
              disabled={loading}
              style={styles.button}
            >
              {loading && loadingSource === 'camera' ? (
                <View style={styles.loadingContainer}>
                  <Text style={[styles.buttonText, { color: colors.background }]}>Opening camera</Text>
                  <Text style={[styles.buttonText, styles.dotsContainer, { color: colors.background }]}>{dots}</Text>
                </View>
              ) : (
                <Text style={[styles.buttonText, { color: colors.background }]}>Take photo</Text>
              )}
            </Button>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <Text style={styles.sectionTitle}>Import from image</Text>
            <Text style={styles.hint}>
              Select an image file from your device storage.
            </Text>

            <Button
              onPress={handleSelectImage}
              disabled={loading}
              style={styles.button}
            >
              {loading && loadingSource === 'file' ? (
                <View style={styles.loadingContainer}>
                  <Text style={[styles.buttonText, { color: colors.background }]}>Selecting image</Text>
                  <Text style={[styles.buttonText, styles.dotsContainer, { color: colors.background }]}>{dots}</Text>
                </View>
              ) : (
                <Text style={[styles.buttonText, { color: colors.background }]}>Select image</Text>
              )}
            </Button>

            {selectedImage && (
              <View style={styles.previewWrapper}>
                <Text style={styles.sectionTitle}>Selected image</Text>
                <Image
                  source={{ uri: selectedImage.uri }}
                  style={styles.previewImage}
                  resizeMode="cover"
                />
                <Text style={styles.fileName}>{selectedImage.fileName}</Text>

                <Button
                  onPress={handleImageImport}
                  disabled={loading}
                  style={styles.importButton}
                >
                  {loading && loadingSource === 'import' ? (
                    <View style={styles.loadingContainer}>
                      <Text style={[styles.buttonText, { color: colors.background }]}>Adding</Text>
                      <Text style={[styles.buttonText, styles.dotsContainer, { color: colors.background }]}>{dots}</Text>
                    </View>
                  ) : (
                    <Text style={[styles.buttonText, { color: colors.background }]}>Add recipe</Text>
                  )}
                </Button>
              </View>
            )}
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

const stylesFactory = (colors: any) =>
  StyleSheet.create({
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
    button: {
      marginBottom: 4,
    },
    importButton: {
      marginTop: 16,
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
    previewWrapper: {
      marginTop: 24,
    },
    previewImage: {
      width: '100%',
      height: 220,
      borderRadius: 12,
      backgroundColor: colors.card || '#ddd',
      marginTop: 8,
    },
    fileName: {
      marginTop: 10,
      color: colors.text,
      opacity: 0.7,
      fontSize: 14,
    },
  });