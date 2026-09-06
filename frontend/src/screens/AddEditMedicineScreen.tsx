import React, { useState, useEffect } from 'react';
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
import { getMedicines, saveMedicine } from '../storage/medicineStorage';

const FREQUENCIES = ['Once daily', 'Twice daily', 'Three times daily', 'As needed', 'Weekly'];

const TIME_PRESETS = [
  { label: 'Morning', time: '08:00 AM' },
  { label: 'Noon', time: '12:00 PM' },
  { label: 'Evening', time: '06:00 PM' },
  { label: 'Night', time: '09:00 PM' },
];

export default function AddEditMedicineScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const existingMedicineId = route.params?.medicineId;
  const initialValues = route.params?.prefill;

  const [name, setName] = useState(initialValues?.name || '');
  const [dosage, setDosage] = useState(initialValues?.dosage || '');
  const [frequency, setFrequency] = useState('Once daily');
  const [reminderTime, setReminderTime] = useState('08:00 AM');
  const [timeOfDay, setTimeOfDay] = useState('Morning');
  const [expiryDate, setExpiryDate] = useState(initialValues?.expiryDate || '');
  const [instructions, setInstructions] = useState(initialValues?.instructions || '');
  const [supplyCountStr, setSupplyCountStr] = useState(initialValues?.supplyCount?.toString() || '30');

  useEffect(() => {
    if (existingMedicineId) {
      (async () => {
        const meds = await getMedicines();
        const found = meds.find((m) => m.id === existingMedicineId);
        if (found) {
          setName(found.name);
          setDosage(found.dosage);
          setFrequency(found.frequency);
          setReminderTime(found.reminderTime);
          setTimeOfDay(found.timeOfDay);
          setExpiryDate(found.expiryDate);
          setInstructions(found.instructions || found.notes);
          setSupplyCountStr(found.supplyCount.toString());
        }
      })();
    }
  }, [existingMedicineId]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Missing Field', 'Please enter a medicine name.');
      return;
    }

    const supply = parseInt(supplyCountStr, 10) || 30;

    await saveMedicine(
      {
        name: name.trim(),
        dosage: dosage.trim() || '1 dose',
        frequency,
        reminderTime,
        timeOfDay,
        expiryDate: expiryDate.trim() || '2027-12-31',
        instructions: instructions.trim(),
        notes: instructions.trim(),
        supplyCount: supply,
      },
      existingMedicineId
    );

    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      {/* Top Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={26} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {existingMedicineId ? 'Edit Medicine' : 'Add Medicine'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Shortcut to Scan Medicine Box */}
        {!existingMedicineId && (
          <TouchableOpacity
            style={styles.scanShortcutButton}
            onPress={() => navigation.navigate('Scan')}
          >
            <Ionicons name="camera-outline" size={24} color={Colors.primary} />
            <Text style={styles.scanShortcutText}>Scan Medicine Box with Camera</Text>
          </TouchableOpacity>
        )}

        {/* Medicine Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Medicine Name *</Text>
          <TextInput
            style={[styles.input, styles.inputBold]}
            placeholder="e.g. Aspirin, Lisinopril"
            placeholderTextColor={Colors.textMuted}
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* Dosage */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Dosage / Strength *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 500mg, 1 tablet"
            placeholderTextColor={Colors.textMuted}
            value={dosage}
            onChangeText={setDosage}
          />
        </View>

        {/* Reminder Time Presets */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Scheduled Reminder Time</Text>
          <View style={styles.presetRow}>
            {TIME_PRESETS.map((preset) => (
              <TouchableOpacity
                key={preset.label}
                style={[
                  styles.presetChip,
                  reminderTime === preset.time && styles.presetChipActive,
                ]}
                onPress={() => {
                  setReminderTime(preset.time);
                  setTimeOfDay(preset.label);
                }}
              >
                <Text
                  style={[
                    styles.presetChipText,
                    reminderTime === preset.time && styles.presetChipTextActive,
                  ]}
                >
                  {preset.label}
                </Text>
                <Text
                  style={[
                    styles.presetChipSubText,
                    reminderTime === preset.time && styles.presetChipTextActive,
                  ]}
                >
                  {preset.time}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Custom Time */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Custom Time (hh:mm AM/PM)</Text>
          <TextInput
            style={styles.input}
            placeholder="08:00 AM"
            placeholderTextColor={Colors.textMuted}
            value={reminderTime}
            onChangeText={setReminderTime}
          />
        </View>

        {/* Frequency */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>How often do you take this?</Text>
          <View style={styles.freqRow}>
            {FREQUENCIES.map((freq) => (
              <TouchableOpacity
                key={freq}
                style={[styles.freqChip, frequency === freq && styles.freqChipActive]}
                onPress={() => setFrequency(freq)}
              >
                <Text style={[styles.freqChipText, frequency === freq && styles.freqChipTextActive]}>
                  {freq}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Expiry Date */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Medicine Expiry Date (YYYY-MM-DD or MM/YYYY)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 2027-12-31"
            placeholderTextColor={Colors.textMuted}
            value={expiryDate}
            onChangeText={setExpiryDate}
          />
        </View>

        {/* Notes / Instructions */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Special Notes / Instructions</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="e.g. Take with plenty of water after meals"
            placeholderTextColor={Colors.textMuted}
            value={instructions}
            onChangeText={setInstructions}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Supply Count */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Pill / Dose Count in Cabinet</Text>
          <TextInput
            style={styles.input}
            placeholder="30"
            placeholderTextColor={Colors.textMuted}
            value={supplyCountStr}
            onChangeText={setSupplyCountStr}
            keyboardType="numeric"
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Ionicons name="save-outline" size={24} color="#FFF" />
          <Text style={styles.saveButtonText}>
            {existingMedicineId ? 'Update Medicine' : 'Save Medicine Reminder'}
          </Text>
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
  scanShortcutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.secondaryContainer,
    borderRadius: 16,
    height: 54,
    marginBottom: 20,
  },
  scanShortcutText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 14,
    height: 56,
    paddingHorizontal: 16,
    fontSize: 18,
    color: Colors.textPrimary,
  },
  inputBold: {
    fontWeight: 'bold',
    fontSize: 20,
  },
  textArea: {
    height: 90,
    paddingTop: 14,
    textAlignVertical: 'top',
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetChip: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  presetChipActive: {
    backgroundColor: Colors.primaryContainer,
    borderColor: Colors.primary,
  },
  presetChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  presetChipSubText: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  presetChipTextActive: {
    color: Colors.onPrimaryContainer,
    fontWeight: 'bold',
  },
  freqRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  freqChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  freqChipActive: {
    backgroundColor: Colors.primaryContainer,
    borderColor: Colors.primary,
  },
  freqChipText: {
    fontSize: 14,
    color: Colors.textPrimary,
  },
  freqChipTextActive: {
    color: Colors.onPrimaryContainer,
    fontWeight: 'bold',
  },
  saveButton: {
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
  saveButtonText: {
    color: '#FFF',
    fontSize: 19,
    fontWeight: 'bold',
  },
});
