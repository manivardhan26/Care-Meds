import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Switch,
  Image,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../theme/ThemeContext';
import { getMedicines, saveMedicine } from '../storage/medicineStorage';
import { getMedicineStockInfo } from '../utils/stockUtils';
import { getLocalTodayIso } from '../utils/dateUtils';
import { evaluateExpiry } from '../utils/expirySafety';

const ROUTES = ['Oral', 'Topical', 'Inhalation', 'Drops', 'Injection'];
const FREQUENCIES = ['Once a day', 'Twice a day', 'Three times a day', 'As needed', 'Weekly'];
const UNIT_OPTIONS = ['tablets', 'capsules', 'ml', 'drops', 'puffs', 'units'];
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

  const { colors, isDarkMode } = useTheme();

  const [name, setName] = useState(initialValues?.name || '');
  const [dosage, setDosage] = useState(initialValues?.dosage || '');
  const [howToUse, setHowToUse] = useState('Oral');
  const [frequency, setFrequency] = useState('Once a day');
  const [reminderTime, setReminderTime] = useState('08:00 AM');
  const [timeOfDay, setTimeOfDay] = useState('Morning');
  const [startDate, setStartDate] = useState(getLocalTodayIso());
  const [expiryDate, setExpiryDate] = useState(initialValues?.expiryDate || '2027-12-31');
  const [instructions, setInstructions] = useState(initialValues?.instructions || '');
  const [imageUri, setImageUri] = useState<string | null>(initialValues?.imageUri || null);

  // Stock tracking state
  const [stockTrackingEnabled, setStockTrackingEnabled] = useState(
    initialValues?.stockTrackingEnabled !== undefined ? Boolean(initialValues.stockTrackingEnabled) : true
  );
  const [currentQuantityStr, setCurrentQuantityStr] = useState(
    initialValues?.currentQuantity?.toString() || initialValues?.supplyCount?.toString() || '30'
  );
  const [unitType, setUnitType] = useState(initialValues?.unitType || 'tablets');
  const [quantityPerDoseStr, setQuantityPerDoseStr] = useState(
    initialValues?.quantityPerDose?.toString() || '1'
  );
  const [lowStockThresholdStr, setLowStockThresholdStr] = useState(
    initialValues?.lowStockThreshold?.toString() || '3'
  );

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
          setImageUri(found.imageUri || null);
          const stock = getMedicineStockInfo(found);
          setStockTrackingEnabled(stock.enabled);
          setCurrentQuantityStr(stock.currentQuantity.toString());
          setUnitType(stock.unitType);
          setQuantityPerDoseStr(stock.quantityPerDose.toString());
          setLowStockThresholdStr(stock.lowStockThreshold.toString());
        }
      })();
    }
  }, [existingMedicineId]);

  const handleRemovePhoto = () => {
    setImageUri(null);
  };

  const handlePickPhoto = () => {
    const options: any[] = [
      {
        text: 'Take Photo with Camera',
        onPress: async () => {
          try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission Denied', 'Camera permission is required to take a medicine photo.');
              return;
            }
            const res = await ImagePicker.launchCameraAsync({
              mediaTypes: ['images'],
              allowsEditing: true,
              aspect: [4, 3],
              quality: 0.8,
            });
            if (!res.canceled && res.assets && res.assets.length > 0) {
              setImageUri(res.assets[0].uri);
            }
          } catch (e) {
            console.warn('Camera error:', e);
          }
        },
      },
      {
        text: 'Choose from Gallery',
        onPress: async () => {
          try {
            const res = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              allowsEditing: true,
              aspect: [4, 3],
              quality: 0.8,
            });
            if (!res.canceled && res.assets && res.assets.length > 0) {
              setImageUri(res.assets[0].uri);
            }
          } catch (e) {
            console.warn('Gallery picker error:', e);
          }
        },
      },
    ];

    if (imageUri) {
      options.push({
        text: 'Remove Photo',
        style: 'destructive',
        onPress: handleRemovePhoto,
      });
    }

    options.push({ text: 'Cancel', style: 'cancel' });

    Alert.alert('Medicine Photo', 'Choose how to add a photo of this medicine:', options);
  };

  const performSave = async () => {
    const parsedQty = parseInt(currentQuantityStr, 10);
    const quantity = isNaN(parsedQty) ? 0 : Math.max(0, parsedQty);
    const parsedThreshold = parseInt(lowStockThresholdStr, 10);
    const threshold = isNaN(parsedThreshold) ? 3 : Math.max(0, parsedThreshold);
    const parsedDose = parseInt(quantityPerDoseStr, 10);
    const dose = isNaN(parsedDose) ? 1 : Math.max(1, parsedDose);

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
        imageUri: imageUri || null,
        supplyCount: quantity,
        stockTrackingEnabled,
        currentQuantity: quantity,
        unitType: unitType.trim() || 'tablets',
        quantityPerDose: dose,
        lowStockThreshold: threshold,
      },
      existingMedicineId
    );

    navigation.goBack();
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Missing Field', 'Please enter a medicine name.');
      return;
    }

    if (expiryDate && expiryDate.trim()) {
      const expiryEval = evaluateExpiry(expiryDate.trim());
      if (expiryEval.state === 'EXPIRED') {
        Alert.alert(
          'Medicine Expired',
          'The specified expiry date is in the past. Do you still want to save this medicine?',
          [
            { text: 'Edit Date', style: 'cancel' },
            { text: 'Save Anyway', onPress: () => performSave() },
          ]
        );
        return;
      }
    }

    await performSave();
  };

  const styles = useMemo(() => createStyles(colors, isDarkMode), [colors, isDarkMode]);

  return (
    <View style={styles.container}>
      {/* Top App Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>
          {existingMedicineId ? 'Edit Medicine' : 'Add Medicine'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Add Photo Box (Reference Style) */}
        <TouchableOpacity style={styles.addPhotoBox} onPress={handlePickPhoto} activeOpacity={0.8}>
          {imageUri ? (
            <View style={styles.photoPreviewWrapper}>
              <Image source={{ uri: imageUri }} style={styles.photoPreview} resizeMode="cover" />
              <View style={styles.changePhotoBadge}>
                <Ionicons name="camera" size={16} color="#FFFFFF" />
                <Text style={styles.changePhotoText}>Change</Text>
              </View>
            </View>
          ) : (
            <View style={styles.photoPlaceholder}>
              <View style={styles.cameraIconCircle}>
                <Ionicons name="camera-outline" size={28} color={isDarkMode ? colors.accentTeal : colors.primary} />
              </View>
              <Text style={styles.addPhotoText}>Add Photo</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Medicine Name Field */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Medicine Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Cold Relief Pellets"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* How to Use / Route */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>How to Use / Route</Text>
          <View style={styles.chipRow}>
            {ROUTES.map((routeItem) => (
              <TouchableOpacity
                key={routeItem}
                style={[styles.smallChip, howToUse === routeItem && styles.smallChipActive]}
                onPress={() => setHowToUse(routeItem)}
              >
                <Text style={[styles.smallChipText, howToUse === routeItem && styles.smallChipTextActive]}>
                  {routeItem}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Dosage */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Dosage</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 1 tablet, 500mg, 5ml"
            placeholderTextColor={colors.textMuted}
            value={dosage}
            onChangeText={setDosage}
          />
        </View>

        {/* Frequency */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Frequency</Text>
          <View style={styles.chipRow}>
            {FREQUENCIES.map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.smallChip, frequency === f && styles.smallChipActive]}
                onPress={() => setFrequency(f)}
              >
                <Text style={[styles.smallChipText, frequency === f && styles.smallChipTextActive]}>
                  {f}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Reminder Time */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Reminder Time</Text>
          <View style={styles.timePresetsRow}>
            {TIME_PRESETS.map((preset) => (
              <TouchableOpacity
                key={preset.time}
                style={[styles.timeChip, reminderTime === preset.time && styles.smallChipActive]}
                onPress={() => {
                  setReminderTime(preset.time);
                  setTimeOfDay(preset.label);
                }}
              >
                <Ionicons name="time-outline" size={14} color={reminderTime === preset.time ? '#FFFFFF' : colors.textSecondary} />
                <Text style={[styles.timeChipText, reminderTime === preset.time && styles.smallChipTextActive]}>
                  {preset.label} ({preset.time})
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={[styles.input, { marginTop: 8 }]}
            placeholder="Custom Time (e.g. 08:30 AM)"
            placeholderTextColor={colors.textMuted}
            value={reminderTime}
            onChangeText={setReminderTime}
          />
        </View>

        {/* Dates Row: Start Date + Expiry Date */}
        <View style={styles.twoColRow}>
          <View style={styles.colHalf}>
            <Text style={styles.fieldLabel}>Start Date</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
              value={startDate}
              onChangeText={setStartDate}
            />
          </View>

          <View style={styles.colHalf}>
            <Text style={styles.fieldLabel}>Expiry Date</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
              value={expiryDate}
              onChangeText={setExpiryDate}
            />
          </View>
        </View>

        {/* Stock Management Card */}
        <View style={styles.stockCard}>
          <View style={styles.stockCardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.stockCardTitle}>Pill Stock Tracking</Text>
              <Text style={styles.stockCardSubtitle}>Automatically deduct doses upon intake</Text>
            </View>
            <Switch
              value={stockTrackingEnabled}
              onValueChange={setStockTrackingEnabled}
              trackColor={{ false: colors.border, true: colors.primaryContainer }}
              thumbColor={stockTrackingEnabled ? colors.primary : '#FFF'}
            />
          </View>

          {stockTrackingEnabled && (
            <View style={{ marginTop: 8 }}>
              <Text style={styles.fieldLabel}>Unit Type</Text>
              <View style={styles.chipRow}>
                {UNIT_OPTIONS.map((u) => (
                  <TouchableOpacity
                    key={u}
                    style={[styles.smallChip, unitType.toLowerCase() === u && styles.smallChipActive]}
                    onPress={() => setUnitType(u)}
                  >
                    <Text style={[styles.smallChipText, unitType.toLowerCase() === u && styles.smallChipTextActive]}>
                      {u}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={[styles.twoColRow, { marginTop: 10 }]}>
                <View style={styles.colHalf}>
                  <Text style={styles.fieldLabel}>Current Stock</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    placeholder="e.g. 30"
                    placeholderTextColor={colors.textMuted}
                    value={currentQuantityStr}
                    onChangeText={setCurrentQuantityStr}
                  />
                </View>

                <View style={styles.colHalf}>
                  <Text style={styles.fieldLabel}>Dose Qty (Per Intake)</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    placeholder="e.g. 1"
                    placeholderTextColor={colors.textMuted}
                    value={quantityPerDoseStr}
                    onChangeText={setQuantityPerDoseStr}
                  />
                </View>
              </View>

              <View style={{ marginTop: 8 }}>
                <Text style={styles.fieldLabel}>Low Stock Alert Threshold</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="e.g. 3"
                  placeholderTextColor={colors.textMuted}
                  value={lowStockThresholdStr}
                  onChangeText={setLowStockThresholdStr}
                />
              </View>
            </View>
          )}
        </View>

        {/* Instructions / Notes Field */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Instructions / Notes</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            placeholder="e.g. Take with warm water after meals"
            placeholderTextColor={colors.textMuted}
            value={instructions}
            onChangeText={setInstructions}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Keep Out of Reach of Children Warning Notice */}
        <View style={styles.warningNotice}>
          <Ionicons name="warning-outline" size={18} color={colors.warningAmber} />
          <Text style={styles.warningNoticeText}>Keep out of reach of children.</Text>
        </View>

        {/* Big Save Button (Reference Style) */}
        <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.88}>
          <Text style={styles.saveButtonText}>Save Medicine</Text>
        </TouchableOpacity>

        {/* Cancel Button */}
        <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function createStyles(colors: any, isDarkMode: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 18,
      paddingTop: 50,
      paddingBottom: 14,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    topBarTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    scrollContent: {
      padding: 18,
      paddingBottom: 50,
    },
    addPhotoBox: {
      height: 130,
      borderRadius: 16,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: colors.border,
      backgroundColor: isDarkMode ? colors.surfaceCard : colors.surfaceWarm,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
      overflow: 'hidden',
    },
    photoPlaceholder: {
      alignItems: 'center',
    },
    cameraIconCircle: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: isDarkMode ? colors.surface : '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    addPhotoText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    photoPreviewWrapper: {
      width: '100%',
      height: '100%',
      position: 'relative',
    },
    photoPreview: {
      width: '100%',
      height: '100%',
    },
    changePhotoBadge: {
      position: 'absolute',
      bottom: 8,
      right: 8,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.65)',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 12,
      gap: 4,
    },
    changePhotoText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '600',
    },
    fieldGroup: {
      marginBottom: 16,
    },
    fieldLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textSecondary,
      marginBottom: 6,
    },
    input: {
      backgroundColor: colors.inputBackground,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.textPrimary,
    },
    multilineInput: {
      minHeight: 70,
      textAlignVertical: 'top',
    },
    twoColRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 16,
    },
    colHalf: {
      flex: 1,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    smallChip: {
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: isDarkMode ? colors.surfaceCard : colors.surfaceWarm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    smallChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    smallChipText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    smallChipTextActive: {
      color: '#FFFFFF',
    },
    timePresetsRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 16,
    },
    timeChip: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: isDarkMode ? colors.surfaceCard : colors.surfaceWarm,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 4,
    },
    timeChipText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    stockCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 16,
    },
    stockCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    stockCardTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    stockCardSubtitle: {
      fontSize: 12,
      color: colors.textMuted,
    },
    warningNotice: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDarkMode ? colors.surfaceCard : colors.surfaceWarm,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 14,
      marginBottom: 20,
      gap: 6,
      borderWidth: 1,
      borderColor: colors.border,
    },
    warningNoticeText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    saveButton: {
      backgroundColor: colors.primary,
      paddingVertical: 16,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 4,
    },
    saveButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '800',
    },
    cancelButton: {
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: 'transparent',
    },
    cancelButtonText: {
      color: colors.textSecondary,
      fontSize: 15,
      fontWeight: '600',
    },
  });
}
