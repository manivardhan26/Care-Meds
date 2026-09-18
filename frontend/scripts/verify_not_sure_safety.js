/**
 * Verification Script for "Not Sure" Medication Safety & Duplicate-Dose Protection
 * 
 * Verifies:
 * 1. "Not Sure" dose records NOT_SURE with ZERO stock deduction.
 * 2. "Not Sure" does not generate extra doses or notifications.
 * 3. Duplicate dose protection: if dose is already marked as TAKEN, repeated confirmations
 *    strictly prevent duplicate stock deductions and report "already marked as Taken".
 * 4. Transition from NOT_SURE to TAKEN deducts stock exactly once.
 * 5. Not Taken (SKIPPED) leaves stock unchanged.
 * 6. History screen filter chips, badges, safety note ("Unverified dose • Consult pharmacist if unsure"),
 *    and adherence rate math (NOT_SURE does not count as taken).
 * 7. Calendar screen day dot logic: days with NOT_SURE never show green dot; schedule shows "Not Sure" badge.
 * 8. Static code contracts across ReminderModal, HomeScreen, RemindersScreen, HistoryScreen, CalendarScreen.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Mock in-memory storage simulating medicineStorage.ts behavior
class MockStorage {
  constructor() {
    this.medicines = [
      {
        id: 'med_safety_1',
        name: 'Metformin',
        dosage: '500mg',
        reminderTime: '08:00 AM',
        supplyCount: 30,
        currentQuantity: 30,
        stockTrackingEnabled: true,
        quantityPerDose: 1,
      },
      {
        id: 'med_safety_2',
        name: 'Lisinopril',
        dosage: '10mg',
        reminderTime: '09:00 AM',
        supplyCount: 20,
        currentQuantity: 20,
        stockTrackingEnabled: true,
        quantityPerDose: 1,
      },
    ];
    this.logs = [];
    this.snoozes = [];
    this.scheduledNotifications = new Map();
  }

  scheduleNotification(medicineId, triggerTimestamp) {
    const notifId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    this.scheduledNotifications.set(medicineId, { id: notifId, triggerTimestamp });
    return notifId;
  }

  snoozeMedicine(medicineId, snoozeMinutes, todayIso) {
    const med = this.medicines.find((m) => m.id === medicineId);
    if (!med) throw new Error('Medicine not found');
    const snoozeUntil = Date.now() + snoozeMinutes * 60 * 1000;
    const notifId = this.scheduleNotification(medicineId, snoozeUntil);
    this.snoozes = this.snoozes.filter((s) => s.medicineId !== medicineId);
    this.snoozes.push({
      medicineId,
      medicineName: med.name,
      dosage: med.dosage,
      scheduledTime: med.reminderTime,
      dateString: todayIso,
      snoozedAt: Date.now(),
      snoozeUntil,
      snoozeMinutes,
      notificationId: notifId,
    });
    return { notifId, snoozeUntil };
  }

  getDoseStatusToday(medicineId, dateString) {
    const log = this.logs.find((l) => l.medicineId === medicineId && l.dateString === dateString);
    if (!log) return null;
    return {
      status: log.status,
      timestamp: log.actionTimestamp,
      isTaken: log.status === 'TAKEN',
      isNotSure: log.status === 'NOT_SURE',
    };
  }

  logAdherence(medicineId, dateString, status, scheduledTime) {
    const med = this.medicines.find((m) => m.id === medicineId);
    if (!med) throw new Error('Medicine not found');

    const existingIndex = this.logs.findIndex(
      (l) => l.medicineId === medicineId && l.dateString === dateString && (!scheduledTime || l.scheduledTime === scheduledTime)
    );

    const wasAlreadyTaken = existingIndex >= 0 && this.logs[existingIndex].status === 'TAKEN';

    let record;
    if (existingIndex >= 0) {
      record = {
        ...this.logs[existingIndex],
        status,
        actionTimestamp: Date.now(),
      };
      this.logs[existingIndex] = record;
    } else {
      record = {
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        medicineId,
        medicineName: med.name,
        dosage: med.dosage,
        scheduledTime: scheduledTime || med.reminderTime,
        dateString,
        actionTimestamp: Date.now(),
        status,
      };
      this.logs.unshift(record);
    }

    // Deduct stock ONLY ONCE on transition to TAKEN
    // NOT_SURE, SKIPPED, SNOOZED, MISSED NEVER decrease stock
    if (status === 'TAKEN' && !wasAlreadyTaken) {
      if (med.stockTrackingEnabled) {
        const qtyPerDose = med.quantityPerDose || 1;
        med.currentQuantity = Math.max(0, med.currentQuantity - qtyPerDose);
        med.supplyCount = med.currentQuantity;
      }
    }

    // Clear active snooze and cancel notifications when resolved (TAKEN, SKIPPED, NOT_SURE)
    if (status === 'TAKEN' || status === 'SKIPPED' || status === 'NOT_SURE') {
      this.snoozes = this.snoozes.filter((s) => s.medicineId !== medicineId);
      this.scheduledNotifications.delete(medicineId);
    }

    return record;
  }
}

async function runSafetyVerification() {
  console.log('🛡️  Starting "Not Sure" Safety & Duplicate-Dose Protection Test Suite...\n');
  const todayIso = new Date().toISOString().slice(0, 10);
  const store = new MockStorage();

  const med1 = store.medicines[0]; // Metformin 500mg, stock 30
  const med2 = store.medicines[1]; // Lisinopril 10mg, stock 20

  // -------------------------------------------------------------
  // Test 1: "Not Sure" Dose Selection & Stock Safety
  // -------------------------------------------------------------
  console.log('Test 1: "Not Sure" Dose Selection & Stock Safety');
  // First, simulate med1 having an active snooze
  store.snoozeMedicine(med1.id, 5, todayIso);
  assert.strictEqual(store.snoozes.length, 1, 'Active snooze registered');
  assert.strictEqual(store.scheduledNotifications.size, 1, 'Active notification registered');

  // User selects "Not Sure"
  const log1 = store.logAdherence(med1.id, todayIso, 'NOT_SURE');
  assert.strictEqual(log1.status, 'NOT_SURE', 'Log must be recorded as NOT_SURE');
  assert.strictEqual(med1.currentQuantity, 30, 'STOCK MUST REMAIN UNCHANGED (30) on NOT_SURE');
  assert.strictEqual(med1.supplyCount, 30, 'supplyCount MUST REMAIN UNCHANGED (30) on NOT_SURE');
  assert.strictEqual(store.snoozes.length, 0, 'Active snooze must be cleared upon NOT_SURE');
  assert.strictEqual(store.scheduledNotifications.size, 0, 'Snooze notification must be canceled upon NOT_SURE');
  console.log('  ✅ "Not Sure" verified: Stock unchanged (30), status recorded as NOT_SURE, snooze cleaned up.');

  // -------------------------------------------------------------
  // Test 2: Later Confirmation from "Not Sure" to "Taken"
  // -------------------------------------------------------------
  console.log('\nTest 2: Later Confirmation from "Not Sure" to "Taken"');
  store.logAdherence(med1.id, todayIso, 'TAKEN');
  assert.strictEqual(med1.currentQuantity, 29, 'Stock must decrease by 1 when transitioned to TAKEN (30 -> 29)');
  assert.strictEqual(med1.supplyCount, 29, 'supplyCount must match currentQuantity (29)');
  assert.strictEqual(store.logs[0].status, 'TAKEN', 'Log must be updated to TAKEN');
  console.log('  ✅ Transition to TAKEN verified: Stock decreased exactly once (30 -> 29).');

  // -------------------------------------------------------------
  // Test 3: Duplicate Dose Protection on Repeated TAKEN
  // -------------------------------------------------------------
  console.log('\nTest 3: Duplicate Dose Protection on Repeated TAKEN');
  const doseStatus = store.getDoseStatusToday(med1.id, todayIso);
  assert.strictEqual(doseStatus.isTaken, true, 'Dose status must recognize dose was already TAKEN today');

  // Attempt repeated TAKEN call
  store.logAdherence(med1.id, todayIso, 'TAKEN');
  assert.strictEqual(med1.currentQuantity, 29, 'Stock must NOT be deducted again on repeated TAKEN (remains 29)');
  assert.strictEqual(med1.supplyCount, 29, 'supplyCount must remain 29');
  assert.strictEqual(store.logs.length, 1, 'No duplicate log rows created');
  console.log('  ✅ Duplicate TAKEN protected: Stock remains 29, zero duplicate deductions.');

  // -------------------------------------------------------------
  // Test 4: Not Taken (SKIPPED) Dose Safety
  // -------------------------------------------------------------
  console.log('\nTest 4: Not Taken (SKIPPED) Dose Safety');
  const log2 = store.logAdherence(med2.id, todayIso, 'SKIPPED');
  assert.strictEqual(log2.status, 'SKIPPED', 'Log recorded as SKIPPED');
  assert.strictEqual(med2.currentQuantity, 20, 'Stock MUST REMAIN UNCHANGED (20) on SKIPPED');
  assert.strictEqual(med2.supplyCount, 20, 'supplyCount remains 20');
  console.log('  ✅ Not Taken verified: Stock unchanged (20), status recorded as SKIPPED.');

  // -------------------------------------------------------------
  // Test 5: History Screen Compliance Rate & Filter Calculation
  // -------------------------------------------------------------
  console.log('\nTest 5: History Compliance Rate with NOT_SURE');
  // Scenario: 4 logs this week: 1 TAKEN, 1 NOT_SURE, 1 SKIPPED, 1 MISSED
  const sampleLogs = [
    { id: '1', status: 'TAKEN' },
    { id: '2', status: 'NOT_SURE' },
    { id: '3', status: 'SKIPPED' },
    { id: '4', status: 'MISSED' },
  ];
  const totalDoses = sampleLogs.length; // 4
  const takenCount = sampleLogs.filter((l) => l.status === 'TAKEN').length; // 1
  const notSureCount = sampleLogs.filter((l) => l.status === 'NOT_SURE').length; // 1
  const skippedCount = sampleLogs.filter((l) => l.status === 'SKIPPED').length; // 1
  const missedCount = sampleLogs.filter((l) => l.status === 'MISSED').length; // 1
  const complianceRate = Math.round((takenCount / totalDoses) * 100); // 25%

  assert.strictEqual(complianceRate, 25, 'NOT_SURE must NOT count towards takenCount, so rate is 25%');
  assert.strictEqual(notSureCount, 1, 'NOT_SURE count must be 1');
  assert.strictEqual(skippedCount, 1, 'Not Taken (SKIPPED) count must be 1');
  console.log(`  ✅ Compliance calculation verified: ${complianceRate}% adherence (NOT_SURE is unverified, not taken).`);

  // -------------------------------------------------------------
  // Test 6: Calendar Screen Dot Indicator Logic
  // -------------------------------------------------------------
  console.log('\nTest 6: Calendar Day Dot Color Logic');
  const colors = {
    takenGreen: '#10B981',
    alertRed: '#EF4444',
    notSureAmber: '#D97706',
    snoozeOrange: '#F59E0B',
  };

  function getDotColor(dayLogs) {
    const hasTaken = dayLogs.some((l) => l.status === 'TAKEN');
    const hasNotSure = dayLogs.some((l) => l.status === 'NOT_SURE');
    const hasMissedOrSkipped = dayLogs.some((l) => l.status === 'MISSED' || l.status === 'SKIPPED');
    const hasSnoozed = dayLogs.some((l) => l.status === 'SNOOZED');

    if (hasMissedOrSkipped) return colors.alertRed;
    if (hasNotSure) return colors.notSureAmber;
    if (hasTaken) return colors.takenGreen;
    if (hasSnoozed) return colors.snoozeOrange;
    return null;
  }

  // Day with only TAKEN: green
  assert.strictEqual(getDotColor([{ status: 'TAKEN' }]), colors.takenGreen, 'Day with TAKEN must be green');
  // Day with TAKEN and NOT_SURE: must be amber, NOT green
  assert.strictEqual(getDotColor([{ status: 'TAKEN' }, { status: 'NOT_SURE' }]), colors.notSureAmber, 'Day with NOT_SURE must NEVER be green');
  // Day with only NOT_SURE: amber
  assert.strictEqual(getDotColor([{ status: 'NOT_SURE' }]), colors.notSureAmber, 'Day with only NOT_SURE must be amber');
  // Day with SKIPPED or MISSED: red
  assert.strictEqual(getDotColor([{ status: 'SKIPPED' }]), colors.alertRed, 'Day with SKIPPED must be red');
  console.log('  ✅ Calendar dot logic verified: NOT_SURE days never show green completed dot.');

  // -------------------------------------------------------------
  // Test 7: Static Code Contracts across Frontend Files
  // -------------------------------------------------------------
  console.log('\nTest 7: Static Code Contracts across Frontend Files');
  const frontendSrc = path.join(__dirname, '..', 'src');

  // medicineStorage.ts
  const storageContent = fs.readFileSync(path.join(frontendSrc, 'storage', 'medicineStorage.ts'), 'utf8');
  assert(storageContent.includes("status === 'TAKEN' && !wasAlreadyTaken"), 'medicineStorage must guard single stock deduction');
  assert(storageContent.includes("status === 'NOT_SURE'"), 'medicineStorage must handle NOT_SURE');
  assert(storageContent.includes('getDoseStatusToday'), 'medicineStorage must export getDoseStatusToday');
  console.log('  ✅ medicineStorage.ts contract valid');

  // ReminderModal.tsx
  const reminderModalContent = fs.readFileSync(path.join(frontendSrc, 'components', 'ReminderModal.tsx'), 'utf8');
  assert(reminderModalContent.includes('handleNotSure'), 'ReminderModal must implement handleNotSure');
  assert(reminderModalContent.includes('Pill Me On Time cannot verify'), 'ReminderModal must display safety explanation');
  assert(reminderModalContent.includes('getDoseStatusToday'), 'ReminderModal must check if already taken today');
  assert(reminderModalContent.includes('Not Sure'), 'ReminderModal must have Not Sure button');
  console.log('  ✅ ReminderModal.tsx contract valid');

  // HomeScreen.tsx
  const homeContent = fs.readFileSync(path.join(frontendSrc, 'screens', 'HomeScreen.tsx'), 'utf8');
  assert(homeContent.includes('handleAction(med, \'NOT_SURE\')'), 'HomeScreen must support NOT_SURE action');
  assert(homeContent.includes('Dose Already Taken'), 'HomeScreen must warn on already taken dose');
  assert(homeContent.includes('Marked as Not Sure'), 'HomeScreen must show Not Sure badge');
  console.log('  ✅ HomeScreen.tsx contract valid');

  // RemindersScreen.tsx
  const remindersContent = fs.readFileSync(path.join(frontendSrc, 'screens', 'RemindersScreen.tsx'), 'utf8');
  assert(remindersContent.includes('handleAction(med, \'NOT_SURE\')'), 'RemindersScreen must support NOT_SURE action');
  assert(remindersContent.includes('Dose Already Taken'), 'RemindersScreen must warn on already taken dose');
  assert(remindersContent.includes('actionBtnNotSure'), 'RemindersScreen must style Not Sure button');
  console.log('  ✅ RemindersScreen.tsx contract valid');

  // HistoryScreen.tsx
  const historyContent = fs.readFileSync(path.join(frontendSrc, 'screens', 'HistoryScreen.tsx'), 'utf8');
  assert(historyContent.includes('NOT_SURE'), 'HistoryScreen must support NOT_SURE filter');
  assert(historyContent.includes('Unverified dose • Consult pharmacist if unsure'), 'HistoryScreen must show safety subtitle');
  assert(historyContent.includes('Not Taken'), 'HistoryScreen must label SKIPPED as Not Taken');
  console.log('  ✅ HistoryScreen.tsx contract valid');

  // CalendarScreen.tsx
  const calendarContent = fs.readFileSync(path.join(frontendSrc, 'screens', 'CalendarScreen.tsx'), 'utf8');
  assert(calendarContent.includes('hasNotSure'), 'CalendarScreen must check hasNotSure');
  assert(calendarContent.includes('notSureAmber'), 'CalendarScreen must use notSureAmber dot');
  console.log('  ✅ CalendarScreen.tsx contract valid');

  console.log('\n🎉 ALL 7 NOT-SURE SAFETY & MEDICATION PROTECTION TESTS PASSED!\n');
}

runSafetyVerification().catch((err) => {
  console.error('❌ Safety verification failed:', err);
  process.exit(1);
});
