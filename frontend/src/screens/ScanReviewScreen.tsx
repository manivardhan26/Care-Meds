import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { ThemeColors } from '../theme/colors';
import { saveMedicine } from '../storage/medicineStorage';

export default function ScanReviewScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const extracted = route.params?.extracted || {};

  const { colors, isDarkMode } = useTheme();

  const [name, setName] = useState(extracted.name || '');
  const [dosage, setDosage] = useState(extracted.dosage || '');
  const [instructions, setInstructions] = useState(extracted.instructions || '');
  const [expiryDate, setExpiryDate] = useState(extracted.expiryDate || '');
  const [supplyCountStr, setSupplyCountStr] = useState(extracted.supplyCount?.toString() || '30');
  const [imageUri] = useState<string | null>(extracted.imageUri || null);

  const handleConfirmSave = async () => {
    if (!name.trim()) {
      Alert.alert('Missing Field', 'Please enter a medicine name.');
      return;
    }

    const supply = parseInt(supplyCountStr, 10) || 30;

    await saveMedicine({
      name: name.trim(),
      dosage: dosage.trim() || '1 dose',
      instructions: instructions.trim(),
      notes: instructions.trim(),
      expiryDate: expiryDate.trim() || '2027-12-31',
      frequency: 'Once daily',
      reminderTime: '08:00 AM',
      timeOfDay: 'Morning',
      imageUri: imageUri || null,
      supplyCount: supply,
      stockTrackingEnabled: true,
      currentQuantity: supply,
      unitType: 'tablets',
      quantityPerDose: 1,
      lowStockThreshold: 3,
    });

    // Navigate to Home tab in root navigator
    navigation.navigate('MainTabs', { screen: 'Home' });
  };

  const styles = useMemo(() => createStyles(colors, isDarkMode), [colors, isDarkMode]);

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={26} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review & Confirm</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.reviewNotice}>
          Please verify the extracted details below. You can tap any field to correct it before saving.
        </Text>

        {imageUri ? (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="cover" />
          </View>
        ) : null}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Medicine Name</Text>
          <TextInput
            style={[styles.input, styles.inputBold]}
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Dosage (e.g. 500mg)</Text>
          <TextInput
            style={styles.input}
            placeholderTextColor={colors.textMuted}
            value={dosage}
            onChangeText={setDosage}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Instructions / Schedule</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholderTextColor={colors.textMuted}
            value={instructions}
            onChangeText={setInstructions}
            multiline
            numberOfLines={2}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Expiry Date (YYYY-MM-DD or MM/YYYY)</Text>
          <TextInput
            style={styles.input}
            placeholderTextColor={colors.textMuted}
            value={expiryDate}
            onChangeText={setExpiryDate}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Supply Count (Pills/Capsules)</Text>
          <TextInput
            style={styles.input}
            placeholderTextColor={colors.textMuted}
            value={supplyCountStr}
            onChangeText={setSupplyCountStr}
            keyboardType="numeric"
          />
        </View>

        {/* Confirm & Save Button */}
        <TouchableOpacity style={styles.confirmButton} onPress={handleConfirmSave}>
          <Ionicons name="checkmark-circle-outline" size={24} color={isDarkMode ? colors.onPrimary : '#FFF'} />
          <Text style={styles.confirmButtonText}>Confirm & Save to Meds</Text>
        </TouchableOpacity>

        {/* Retake Button */}
        <TouchableOpacity
          style={styles.retakeButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="refresh-outline" size={20} color={colors.textPrimary} />
          <Text style={styles.retakeButtonText}>Scan Again / Pick Another</Text>
        </TouchableOpacity>
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
    reviewNotice: {
      fontSize: 16,
      color: colors.textSecondary,
      lineHeight: 22,
      marginBottom: 20,
    },
    inputGroup: {
      marginBottom: 16,
    },
    label: {
      fontSize: 15,
      fontWeight: 'bold',
      color: colors.textPrimary,
      marginBottom: 6,
    },
    input: {
      backgroundColor: colors.inputBackground,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 14,
      height: 54,
      paddingHorizontal: 16,
      fontSize: 18,
      color: colors.textPrimary,
    },
    inputBold: {
      fontWeight: 'bold',
      fontSize: 20,
    },
    textArea: {
      height: 80,
      paddingTop: 12,
      textAlignVertical: 'top',
    },
    confirmButton: {
      backgroundColor: colors.primary,
      borderRadius: 16,
      height: 60,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      marginTop: 14,
      elevation: 3,
    },
    confirmButtonText: {
      color: isDarkMode ? colors.onPrimary : '#FFF',
      fontSize: 19,
      fontWeight: 'bold',
    },
    retakeButton: {
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 16,
      height: 52,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 12,
    },
    imagePreviewContainer: {
      borderRadius: 16,
      overflow: 'hidden',
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
      height: 160,
      backgroundColor: colors.surfaceCard,
    },
    imagePreview: {
      width: '100%',
      height: '100%',
    },
    retakeButtonText: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: '600',
    },
  });
