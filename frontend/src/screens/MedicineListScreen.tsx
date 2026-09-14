import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { Medicine } from '../types';
import { getMedicines } from '../storage/medicineStorage';
import { evaluateExpiry } from '../utils/expirySafety';
import { getMedicineStockInfo } from '../utils/stockUtils';

type FilterTab = 'ALL' | 'ACTIVE' | 'EXPIRED';

export default function MedicineListScreen() {
  const navigation = useNavigation<any>();
  const { colors, isDarkMode } = useTheme();

  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [filterTab, setFilterTab] = useState<FilterTab>('ALL');
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const list = await getMedicines();
    setMedicines(list);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const filteredMedicines = useMemo(() => {
    if (filterTab === 'ACTIVE') {
      return medicines.filter((m) => evaluateExpiry(m.expiryDate).state !== 'EXPIRED');
    }
    if (filterTab === 'EXPIRED') {
      return medicines.filter((m) => evaluateExpiry(m.expiryDate).state === 'EXPIRED');
    }
    return medicines;
  }, [medicines, filterTab]);

  const activeCount = medicines.filter((m) => evaluateExpiry(m.expiryDate).state !== 'EXPIRED').length;
  const expiredCount = medicines.filter((m) => evaluateExpiry(m.expiryDate).state === 'EXPIRED').length;

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
        <Text style={styles.topBarTitle}>Medicine List</Text>
        <TouchableOpacity
          style={styles.bellButton}
          onPress={() => navigation.navigate('Reminders')}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="notifications-outline" size={24} color={colors.textPrimary} />
          {expiredCount > 0 && <View style={styles.bellBadge} />}
        </TouchableOpacity>
      </View>

      {/* Segmented Filter Pills */}
      <View style={styles.filterContainer}>
        {[
          { key: 'ALL', label: `All (${medicines.length})` },
          { key: 'ACTIVE', label: `Active (${activeCount})` },
          { key: 'EXPIRED', label: `Expired (${expiredCount})` },
        ].map((tab) => {
          const isActive = filterTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.filterPill, isActive && styles.filterPillActive]}
              onPress={() => setFilterTab(tab.key as FilterTab)}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Medicine List */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        {filteredMedicines.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="medical-outline" size={56} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No Medicines Found</Text>
            <Text style={styles.emptySubtitle}>
              {filterTab === 'EXPIRED'
                ? 'Great news! None of your medications are currently expired.'
                : 'Tap "Add Medicine" below to organize your first prescription.'}
            </Text>
            {filterTab !== 'EXPIRED' && (
              <TouchableOpacity
                style={styles.emptyAddBtn}
                onPress={() => navigation.navigate('AddMedicine')}
                activeOpacity={0.85}
              >
                <Ionicons name="add-circle" size={20} color="#FFFFFF" />
                <Text style={styles.emptyAddBtnText}>Add Medicine</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filteredMedicines.map((med) => {
            const expiry = evaluateExpiry(med.expiryDate);
            const isExpired = expiry.state === 'EXPIRED';
            const isExpiringSoon = expiry.state === 'EXPIRING_SOON';
            const stock = getMedicineStockInfo(med);

            return (
              <TouchableOpacity
                key={med.id}
                style={[styles.medCard, isExpired && styles.medCardExpired]}
                onPress={() => navigation.navigate('MedicineDetail', { medicineId: med.id })}
                activeOpacity={0.88}
              >
                <View style={styles.cardHeaderRow}>
                  {/* Thumbnail / Medical Avatar */}
                  <View style={styles.thumbnailContainer}>
                    {med.imageUri ? (
                      <Image source={{ uri: med.imageUri }} style={styles.thumbnailImage} resizeMode="cover" />
                    ) : (
                      <View style={[styles.thumbnailFallback, { backgroundColor: isDarkMode ? colors.surfaceWarm : colors.primaryContainer }]}>
                        <Ionicons name="medkit" size={24} color={isDarkMode ? colors.accentTeal : colors.primary} />
                      </View>
                    )}
                  </View>

                  {/* Title & Metadata */}
                  <View style={styles.infoCol}>
                    <View style={styles.nameRow}>
                      <Text style={styles.medName} numberOfLines={1}>
                        {med.name}
                      </Text>
                      <View
                        style={[
                          styles.statusBadge,
                          isExpired
                            ? styles.statusBadgeExpired
                            : isExpiringSoon
                            ? styles.statusBadgeWarning
                            : styles.statusBadgeActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            isExpired
                              ? styles.statusTextExpired
                              : isExpiringSoon
                              ? styles.statusTextWarning
                              : styles.statusTextActive,
                          ]}
                        >
                          {isExpired ? 'Expired' : isExpiringSoon ? 'Expiring' : 'Active'}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.specsText}>
                      {med.dosage} • {med.frequency}
                    </Text>

                    <View style={styles.tagsRow}>
                      <View style={styles.timeTag}>
                        <Ionicons name="time-outline" size={13} color={isDarkMode ? colors.accentTeal : colors.primary} />
                        <Text style={styles.timeTagText}>{med.reminderTime}</Text>
                      </View>

                      {stock.enabled && (
                        <View
                          style={[
                            styles.stockTag,
                            stock.isOutOfStock ? styles.stockTagOutOfStock : (stock.isLowStock && styles.stockTagLow),
                          ]}
                        >
                          <Ionicons
                            name={stock.isOutOfStock ? 'alert-circle' : 'cube-outline'}
                            size={13}
                            color={
                              stock.isOutOfStock
                                ? colors.alertRed
                                : stock.isLowStock
                                ? colors.warningAmber
                                : colors.textSecondary
                            }
                          />
                          <Text
                            style={[
                              styles.stockTagText,
                              stock.isOutOfStock ? styles.stockTagTextOutOfStock : (stock.isLowStock && styles.stockTagTextLow),
                            ]}
                          >
                            {stock.isOutOfStock
                              ? `Out of stock (0 ${stock.unitType})`
                              : `${stock.currentQuantity} ${stock.unitType}`}
                          </Text>
                        </View>
                      )}
                    </View>

                    {med.expiryDate ? (
                      <Text style={[styles.expirySubtitle, isExpired && styles.expirySubtitleExpired]}>
                        {isExpired
                          ? `Expired on ${med.expiryDate}`
                          : `Expires: ${med.expiryDate} (${expiry.daysRemaining ?? 0}d left)`}
                      </Text>
                    ) : null}
                  </View>

                  <Ionicons name="chevron-forward" size={20} color={colors.textMuted} style={styles.chevron} />
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Floating Add Medicine Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddMedicine')}
        activeOpacity={0.9}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
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
    bellButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    bellBadge: {
      position: 'absolute',
      top: 6,
      right: 8,
      width: 9,
      height: 9,
      borderRadius: 4.5,
      backgroundColor: colors.alertRed,
    },
    filterContainer: {
      flexDirection: 'row',
      paddingHorizontal: 18,
      paddingVertical: 12,
      backgroundColor: colors.surface,
      gap: 10,
    },
    filterPill: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: isDarkMode ? colors.surfaceCard : colors.surfaceWarm,
    },
    filterPillActive: {
      backgroundColor: colors.primary,
    },
    filterPillText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    filterPillTextActive: {
      color: '#FFFFFF',
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 90,
    },
    medCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 14,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.cardShadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.25 : 0.05,
      shadowRadius: 6,
      elevation: 2,
    },
    medCardExpired: {
      borderColor: colors.alertRedContainer,
    },
    cardHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    thumbnailContainer: {
      marginRight: 12,
    },
    thumbnailImage: {
      width: 58,
      height: 58,
      borderRadius: 12,
    },
    thumbnailFallback: {
      width: 58,
      height: 58,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    infoCol: {
      flex: 1,
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 3,
    },
    medName: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.textPrimary,
      flex: 1,
      marginRight: 8,
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 12,
    },
    statusBadgeActive: {
      backgroundColor: colors.badgeUpcomingBg,
    },
    statusBadgeWarning: {
      backgroundColor: colors.warningAmberContainer,
    },
    statusBadgeExpired: {
      backgroundColor: colors.alertRedContainer,
    },
    statusBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    statusTextActive: {
      color: colors.badgeUpcomingText,
    },
    statusTextWarning: {
      color: colors.warningAmber,
    },
    statusTextExpired: {
      color: colors.alertRed,
    },
    specsText: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 6,
    },
    tagsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 4,
    },
    timeTag: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDarkMode ? colors.surfaceWarm : '#EEF6F8',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
      gap: 4,
    },
    timeTagText: {
      fontSize: 12,
      fontWeight: '600',
      color: isDarkMode ? colors.accentTeal : colors.primary,
    },
    stockTag: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDarkMode ? colors.surfaceWarm : '#F0F4F4',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
      gap: 4,
    },
    stockTagLow: {
      backgroundColor: colors.warningAmberContainer,
    },
    stockTagOutOfStock: {
      backgroundColor: isDarkMode ? '#3B1D1D' : '#FDE8E8',
    },
    stockTagText: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    stockTagTextLow: {
      color: colors.warningAmber,
      fontWeight: '600',
    },
    stockTagTextOutOfStock: {
      color: colors.alertRed,
      fontWeight: '700',
    },
    expirySubtitle: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    expirySubtitleExpired: {
      color: colors.alertRed,
      fontWeight: '600',
    },
    chevron: {
      marginLeft: 6,
    },
    emptyContainer: {
      alignItems: 'center',
      paddingVertical: 60,
      paddingHorizontal: 24,
    },
    emptyTitle: {
      fontSize: 19,
      fontWeight: '700',
      color: colors.textPrimary,
      marginTop: 14,
      marginBottom: 6,
    },
    emptySubtitle: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 20,
    },
    emptyAddBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 24,
      gap: 8,
    },
    emptyAddBtnText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '700',
    },
    fab: {
      position: 'absolute',
      right: 20,
      bottom: 24,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 6,
    },
  });
}
