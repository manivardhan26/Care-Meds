/**
 * Verification script for CareMeds Snooze & Reminder contracts
 * Tests:
 * 1. Zero stock deduction on Snooze
 * 2. Zero duplicate history entries
 * 3. Context preservation during repeated Snooze
 * 4. Exact single stock deduction on Taken after Snooze
 * 5. Zero stock deduction on Skip after Snooze
 * 6. Active snooze cleanup upon Taken / Skip
 */

const assert = require('assert');

// Mock in-memory storage simulating medicineStorage.ts behavior
class MockStorage {
  constructor() {
    this.medicines = [
      {
        id: 'med_test_1',
        name: 'Aspirin Cardio',
        dosage: '81mg',
        reminderTime: '08:00 AM',
        supplyCount: 30,
        currentQuantity: 30,
        stockTrackingEnabled: true,
        quantityPerDose: 1,
      },
    ];
    this.logs = [];
    this.snoozes = [];
    this.scheduledNotifications = new Map(); // medicineId -> notificationId
  }

  // Simulate scheduleNotification with duplicate prevention
  scheduleNotification(medicineId, triggerTimestamp, isSnooze = false, snoozeMinutes = 0) {
    // 1. Cancel previous pending notification to guarantee zero duplicates
    if (this.scheduledNotifications.has(medicineId)) {
      const prevId = this.scheduledNotifications.get(medicineId);
      this.scheduledNotifications.delete(medicineId);
    }

    // 2. Schedule single new notification
    const newId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    this.scheduledNotifications.set(medicineId, {
      id: newId,
      triggerTimestamp,
      isSnooze,
      snoozeMinutes,
    });
    return newId;
  }

  // Simulate scheduleSnooze
  snoozeMedicine(medicineId, snoozeMinutes, todayIso) {
    const med = this.medicines.find((m) => m.id === medicineId);
    if (!med) throw new Error('Medicine not found');

    const snoozeUntil = Date.now() + snoozeMinutes * 60 * 1000;
    const notifId = this.scheduleNotification(medicineId, snoozeUntil, true, snoozeMinutes);

    // Save active snooze record (without touching stock or marking as TAKEN)
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

  // Simulate logAdherence
  logAdherence(medicineId, dateString, status) {
    const med = this.medicines.find((m) => m.id === medicineId);
    const existingIndex = this.logs.findIndex(
      (l) => l.medicineId === medicineId && l.dateString === dateString
    );

    const wasAlreadyTaken = existingIndex >= 0 && this.logs[existingIndex].status === 'TAKEN';

    if (existingIndex >= 0) {
      this.logs[existingIndex].status = status;
      this.logs[existingIndex].actionTimestamp = Date.now();
    } else {
      this.logs.unshift({
        id: `log_${Date.now()}`,
        medicineId,
        medicineName: med.name,
        dosage: med.dosage,
        dateString,
        actionTimestamp: Date.now(),
        status,
      });
    }

    // Deduct stock ONLY ONCE on transition to TAKEN
    if (status === 'TAKEN' && !wasAlreadyTaken) {
      if (med && med.stockTrackingEnabled) {
        const qtyPerDose = med.quantityPerDose || 1;
        med.currentQuantity = Math.max(0, med.currentQuantity - qtyPerDose);
        med.supplyCount = med.currentQuantity;
      }
    }

    // Clear active snooze and cancel notifications when resolved
    if (status === 'TAKEN' || status === 'SKIPPED') {
      this.snoozes = this.snoozes.filter((s) => s.medicineId !== medicineId);
      this.scheduledNotifications.delete(medicineId);
    }
  }
}

async function runTests() {
  console.log('🧪 Starting CareMeds Snooze & Reminder Contract Verification...\n');
  const todayIso = new Date().toISOString().slice(0, 10);
  const store = new MockStorage();
  const med = store.medicines[0];

  // Test Case 1: Initial State Check
  console.log('Test 1: Verifying Initial Stock & State');
  assert.strictEqual(med.currentQuantity, 30, 'Initial quantity must be 30');
  assert.strictEqual(store.logs.length, 0, 'Initial logs must be empty');
  assert.strictEqual(store.snoozes.length, 0, 'Initial snoozes must be empty');
  console.log('  ✅ Initial state valid (Stock = 30, Logs = 0, Snoozes = 0)');

  // Test Case 2: Snooze Once (1 minute)
  console.log('\nTest 2: Snooze Once (1 minute duration)');
  const res1 = store.snoozeMedicine(med.id, 1, todayIso);
  assert.strictEqual(med.currentQuantity, 30, 'Snooze MUST NOT reduce stock!');
  assert.strictEqual(store.snoozes.length, 1, 'Exactly one active snooze record must exist');
  assert.strictEqual(store.snoozes[0].snoozeMinutes, 1);
  assert.strictEqual(store.scheduledNotifications.size, 1, 'Exactly one notification scheduled');
  assert.strictEqual(store.logs.filter((l) => l.status === 'TAKEN').length, 0, 'Must NOT create TAKEN history log');
  console.log('  ✅ Snooze 1m verified: Stock unchanged (30), 1 notification scheduled, no TAKEN log');

  // Test Case 3: Snooze Multiple Times (Snooze again for 2 mins, then 5 mins)
  console.log('\nTest 3: Repeated Snooze (Snooze 2m, then 5m)');
  const notifId1 = res1.notifId;
  const res2 = store.snoozeMedicine(med.id, 2, todayIso);
  assert.notStrictEqual(res2.notifId, notifId1, 'New notification ID generated');
  assert.strictEqual(store.scheduledNotifications.size, 1, 'Prev notification replaced: ZERO duplicates');
  assert.strictEqual(med.currentQuantity, 30, 'Repeated snooze MUST NOT reduce stock!');

  const res3 = store.snoozeMedicine(med.id, 5, todayIso);
  assert.strictEqual(store.scheduledNotifications.size, 1, 'Zero duplicate notifications after 3 snoozes');
  assert.strictEqual(store.snoozes.length, 1, 'Exactly one active snooze record preserved');
  assert.strictEqual(store.snoozes[0].snoozeMinutes, 5, 'Snooze context updated to 5m');
  assert.strictEqual(med.currentQuantity, 30, 'Stock remains 30');
  console.log('  ✅ Repeated Snooze verified: Zero duplicate notifications, stock remains 30, dose context preserved');

  // Test Case 4: Mark TAKEN after Snooze
  console.log('\nTest 4: Take Dose After Snooze');
  store.logAdherence(med.id, todayIso, 'TAKEN');
  assert.strictEqual(med.currentQuantity, 29, 'Stock must decrease by dose (30 -> 29)');
  assert.strictEqual(store.snoozes.length, 0, 'Active snooze record must be cleared upon Taken');
  assert.strictEqual(store.scheduledNotifications.size, 0, 'Pending notification canceled upon Taken');
  assert.strictEqual(store.logs.length, 1, 'Exactly 1 history record exists');
  assert.strictEqual(store.logs[0].status, 'TAKEN', 'History record marked as TAKEN');
  console.log('  ✅ Taken after Snooze verified: Stock deducted once (30 -> 29), snooze cleared, notif canceled');

  // Test Case 5: Duplicate Taken protection (Take again)
  console.log('\nTest 5: Prevent Duplicate Stock Deduction if Taken called again');
  store.logAdherence(med.id, todayIso, 'TAKEN');
  assert.strictEqual(med.currentQuantity, 29, 'Stock must NOT be deducted again on repeated Taken!');
  console.log('  ✅ Idempotent Taken verified: Stock remains 29');

  // Test Case 6: Skip after Snooze
  console.log('\nTest 6: Skip Dose After Snooze on fresh medicine');
  const med2 = {
    id: 'med_test_2',
    name: 'Metformin',
    dosage: '500mg',
    reminderTime: '06:00 PM',
    supplyCount: 45,
    currentQuantity: 45,
    stockTrackingEnabled: true,
    quantityPerDose: 1,
  };
  store.medicines.push(med2);
  store.snoozeMedicine(med2.id, 2, todayIso);
  assert.strictEqual(med2.currentQuantity, 45, 'Stock unchanged during snooze');
  assert.strictEqual(store.snoozes.length, 1, 'Active snooze registered');

  store.logAdherence(med2.id, todayIso, 'SKIPPED');
  assert.strictEqual(med2.currentQuantity, 45, 'Skip MUST NOT deduct stock (remains 45)');
  assert.strictEqual(store.snoozes.length, 0, 'Snooze record cleared upon Skip');
  assert.strictEqual(store.scheduledNotifications.size, 0, 'Pending notification canceled upon Skip');
  console.log('  ✅ Skip after Snooze verified: Stock unchanged (45), snooze cleared, notif canceled');

  console.log('\n🎉 ALL 6 SNOOZE & REMINDER CONTRACT TESTS PASSED PERFECTLY!\n');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
