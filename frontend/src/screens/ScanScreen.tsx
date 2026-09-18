import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../theme/ThemeContext';
import { ThemeColors } from '../theme/colors';

export default function ScanScreen() {
  const navigation = useNavigation<any>();
  const { colors, isDarkMode } = useTheme();

  const processImageResult = (result: ImagePicker.ImagePickerResult) => {
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      navigation.navigate('ScanReview', {
        extracted: {
          name: '',
          dosage: '',
          instructions: '',
          expiryDate: '',
          isExpiryDetected: false,
          supplyCount: 30,
          imageUri: asset.uri,
        },
      });
    }
  };

  const handleLaunchCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Camera Permission Required',
          'Pill Me On Time needs camera permission to capture photos of medicine packages. Please grant camera permission to continue.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Try Again', onPress: handleLaunchCamera },
          ]
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      processImageResult(result);
    } catch (e) {
      console.warn('Camera launch error:', e);
      Alert.alert(
        'Camera Error',
        'Could not access the camera. Please ensure camera permissions are allowed on your device and try again.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry', onPress: handleLaunchCamera },
        ]
      );
    }
  };

  const handleLaunchGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      processImageResult(result);
    } catch (e) {
      console.warn('Image picker error:', e);
      Alert.alert('Gallery Error', 'Could not access the photo library. Please try again.');
    }
  };

  const styles = useMemo(() => createStyles(colors, isDarkMode), [colors, isDarkMode]);

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Back"
        >
          <Ionicons name="arrow-back" size={26} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan Medicine Box</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.introText}>
          Take a clear photo of your medicine box or prescription label. You can review the photo and
          fill in or verify details on the next screen.
        </Text>

        {/* Primary: Take Photo with Camera */}
        <TouchableOpacity
          style={styles.captureButton}
          onPress={handleLaunchCamera}
          activeOpacity={0.85}
        >
          <Ionicons name="camera" size={26} color={colors.onPrimary} />
          <Text style={styles.captureButtonText}>Take Photo with Camera</Text>
        </TouchableOpacity>

        {/* Secondary: Choose from Gallery */}
        <TouchableOpacity
          style={styles.galleryButton}
          onPress={handleLaunchGallery}
          activeOpacity={0.85}
        >
          <Ionicons name="images-outline" size={24} color={colors.primary} />
          <Text style={styles.galleryButtonText}>Choose from Gallery</Text>
        </TouchableOpacity>

        {/* Photography Tips Card */}
        <View style={styles.tipsCard}>
          <View style={styles.tipsHeaderRow}>
            <Ionicons name="information-circle-outline" size={22} color={colors.primary} />
            <Text style={styles.tipsTitle}>Tips for Best Results</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={16} color={colors.takenGreen} />
            <Text style={styles.tipText}>Place medicine box on a flat, well-lit surface.</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={16} color={colors.takenGreen} />
            <Text style={styles.tipText}>Make sure medicine name and dosage are clearly visible.</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={16} color={colors.takenGreen} />
            <Text style={styles.tipText}>Ensure the expiration date is in focus and not covered.</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors, isDarkMode: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    headerBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 54,
      paddingBottom: 16,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      width: 44,
      height: 44,
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: 'bold',
      color: colors.textPrimary,
    },
    scrollContent: {
      padding: 20,
      paddingBottom: 60,
    },
    introText: {
      fontSize: 16,
      color: colors.textSecondary,
      lineHeight: 24,
      marginBottom: 24,
    },
    captureButton: {
      backgroundColor: colors.primary,
      borderRadius: 16,
      height: 58,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      elevation: 3,
      marginBottom: 14,
    },
    captureButtonText: {
      color: colors.onPrimary,
      fontSize: 18,
      fontWeight: 'bold',
    },
    galleryButton: {
      backgroundColor: colors.surfaceCard,
      borderRadius: 16,
      height: 56,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      borderWidth: 1.5,
      borderColor: colors.primary,
      marginBottom: 28,
    },
    galleryButtonText: {
      color: colors.primary,
      fontSize: 17,
      fontWeight: '600',
    },
    tipsCard: {
      backgroundColor: colors.surfaceCard,
      borderRadius: 16,
      padding: 18,
      borderWidth: 1,
      borderColor: colors.border,
    },
    tipsHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 14,
    },
    tipsTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.textPrimary,
    },
    tipItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      marginBottom: 10,
    },
    tipText: {
      flex: 1,
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
    },
  });
