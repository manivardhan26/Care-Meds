import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { saveMedicine } from '../storage/medicineStorage';

export default function ScanReviewScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const extracted = route.params?.extracted || {};

  const [name, setName] = useState(extracted.name || '');
  const [dosage, setDosage] = useState(extracted.dosage || '');
  const [instructions, setInstructions] = useState(extracted.instructions || '');
  const [expiryDate, setExpiryDate] = useState(extracted.expiryDate || '');
  const [supplyCountStr, setSupplyCountStr] = useState(extracted.supplyCount?.toString() || '30');

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
      supplyCount: supply,
    });

    // Navigate to Home tab in root navigator
    navigation.navigate('MainTabs', { screen: 'Home' });
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={26} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review & Confirm</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.reviewNotice}>
          Please verify the extracted details below. You can tap any field to correct it before saving.
        </Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Medicine Name</Text>
          <TextInput
            style={[styles.input, styles.inputBold]}
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Dosage (e.g. 500mg)</Text>
          <TextInput
            style={styles.input}
            value={dosage}
            onChangeText={setDosage}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Instructions / Schedule</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
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
            value={expiryDate}
            onChangeText={setExpiryDate}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Supply Count (Pills/Capsules)</Text>
          <TextInput
            style={styles.input}
            value={supplyCountStr}
            onChangeText={setSupplyCountStr}
            keyboardType="numeric"
          />
        </View>

        {/* Confirm & Save Button */}
        <TouchableOpacity style={styles.confirmButton} onPress={handleConfirmSave}>
          <Ionicons name="checkmark-circle-outline" size={24} color="#FFF" />
          <Text style={styles.confirmButtonText}>Confirm & Save to Meds</Text>
        </TouchableOpacity>

        {/* Retake Button */}
        <TouchableOpacity
          style={styles.retakeButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="refresh-outline" size={20} color={Colors.textPrimary} />
          <Text style={styles.retakeButtonText}>Scan Again / Pick Another</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 54,
    paddingBottom: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 60,
  },
  reviewNotice: {
    fontSize: 16,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 14,
    height: 54,
    paddingHorizontal: 16,
    fontSize: 18,
    color: Colors.textPrimary,
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
    backgroundColor: Colors.primary,
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
    color: '#FFF',
    fontSize: 19,
    fontWeight: 'bold',
  },
  retakeButton: {
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 16,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  retakeButtonText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
});
