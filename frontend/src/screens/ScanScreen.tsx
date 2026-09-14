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
import { SAMPLE_PACKAGES } from '../utils/ocrParser';

export default function ScanScreen() {
  const navigation = useNavigation<any>();
  const { colors, isDarkMode } = useTheme();

  const processImageResult = (result: ImagePicker.ImagePickerResult) => {
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      navigation.navigate('ScanReview', {
        extracted: {
          name: 'Scanned Prescription',
          dosage: '10mg',
          instructions: 'Take 1 tablet daily in the morning',
          expiryDate: '2027-08-31',
          supplyCount: 30,
          imageUri: asset.uri,
        },
      });
    }
  };

  const handlePickImage = () => {
    Alert.alert(
      'Scan Medicine Package',
      'Choose how you want to add the medicine package photo:',
      [
        {
          text: 'Take Photo with Camera',
          onPress: async () => {
            try {
              const { status } = await ImagePicker.requestCameraPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Camera permission is required to take photos of medicine packages.');
                return;
              }
              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                quality: 0.8,
              });
              processImageResult(result);
            } catch (e) {
              console.warn('Camera error:', e);
            }
          },
        },
        {
          text: 'Choose from Gallery',
          onPress: async () => {
            try {
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                quality: 0.8,
              });
              processImageResult(result);
            } catch (e) {
              console.warn('Image picker error:', e);
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleSelectSample = (sample: any) => {
    navigation.navigate('ScanReview', { extracted: sample });
  };

  const styles = useMemo(() => createStyles(colors, isDarkMode), [colors, isDarkMode]);

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={26} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan Medicine Box</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.introText}>
          Position your medicine package in front of your camera or pick a photo from your gallery,
          or choose a sample package below to test auto-filling.
        </Text>

        <TouchableOpacity style={styles.captureButton} onPress={handlePickImage}>
          <Ionicons name="camera" size={28} color={isDarkMode ? colors.onPrimary : '#FFF'} />
          <Text style={styles.captureButtonText}>Capture / Pick Package Photo</Text>
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR CHOOSE SAMPLE</Text>
          <View style={styles.dividerLine} />
        </View>

        <Text style={styles.sampleSectionTitle}>Quick Demo Packages:</Text>

        {SAMPLE_PACKAGES.map((sample, idx) => (
          <TouchableOpacity
            key={idx}
            style={styles.sampleCard}
            onPress={() => handleSelectSample(sample)}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.sampleName}>
                {sample.name} ({sample.dosage})
              </Text>
              <Text style={styles.sampleInstructions}>{sample.instructions}</Text>
              <Text style={styles.sampleExpiry}>Expires: {sample.expiryDate}</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={colors.primary} />
          </TouchableOpacity>
        ))}
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
      marginBottom: 20,
    },
    captureButton: {
      backgroundColor: colors.primary,
      borderRadius: 16,
      height: 60,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      elevation: 3,
    },
    captureButtonText: {
      color: isDarkMode ? colors.onPrimary : '#FFF',
      fontSize: 18,
      fontWeight: 'bold',
    },
    dividerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 24,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: colors.border,
    },
    dividerText: {
      fontSize: 13,
      color: colors.textMuted,
      fontWeight: 'bold',
      marginHorizontal: 10,
    },
    sampleSectionTitle: {
      fontSize: 17,
      fontWeight: 'bold',
      color: colors.textPrimary,
      marginBottom: 12,
    },
    sampleCard: {
      backgroundColor: colors.surfaceCard,
      borderRadius: 14,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
      elevation: 1,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sampleName: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.primary,
    },
    sampleInstructions: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 3,
    },
    sampleExpiry: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 4,
    },
  });
