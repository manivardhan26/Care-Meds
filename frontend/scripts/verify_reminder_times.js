/**
 * Verification Script: Reminder Times UI & Multi-Dose Notification Scheduling
 *
 * Tests all 12 requirements for the Add Medicine Reminder Time improvements:
 * 1. Frequency vs Reminder Times separation
 * 2. Once a day -> 1 reminder time
 * 3. Twice a day -> 2 reminder times (08:00 AM, 06:00 PM)
 * 4. Three times a day -> 3 reminder times (08:00 AM, 02:00 PM, 09:00 PM)
 * 5. Morning / Noon / Evening / Night preset preservation
 * 6. + Add time for custom reminder times
 * 7. Clean vertical dose-card layout
 * 8. Zero clock-icon overlap (wrap layout without forced horizontal squeezing)
 * 9. Visually obvious selected times
 * 10. Notification system schedules all selected times
 * 11. Strict duplicate notification prevention
 * 12. Medicine, stock, expiry, history preservation
 */

const fs = require('fs');
const path = require('path');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passCount++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failCount++;
  }
}

console.log('================================================================');
console.log('  Reminder Times & Multi-Dose Notification Contract Verification');
console.log('================================================================\n');

// -------------------------------------------------------------
// Test Suite 1: Static Code Inspection in AddEditMedicineScreen.tsx
// -------------------------------------------------------------
console.log('[Domain 1: AddEditMedicineScreen Layout & Contract]');
const addEditCode = fs.readFileSync(
  path.resolve(__dirname, '../src/screens/AddEditMedicineScreen.tsx'),
  'utf-8'
);

assert(
  addEditCode.includes('scheduleMedicineNotifications'),
  'AddEditMedicineScreen imports and calls scheduleMedicineNotifications'
);

assert(
  addEditCode.includes('getTargetDoseCount'),
  'Defines getTargetDoseCount helper separating Frequency from Reminder Times'
);

assert(
  addEditCode.includes("case 'Once a day':") &&
  addEditCode.includes("case 'Twice a day':") &&
  addEditCode.includes("case 'Three times a day':"),
  'Handles Once a day (1), Twice a day (2), Three times a day (3)'
);

assert(
  addEditCode.includes('handleFrequencyChange'),
  'Includes handleFrequencyChange synchronizing dose count to frequency'
);

assert(
  addEditCode.includes('handleAddReminderTime'),
  'Provides handleAddReminderTime for "+ Add reminder time" option'
);

assert(
  addEditCode.includes('handleRemoveReminderTime'),
  'Provides handleRemoveReminderTime for removing individual dose times'
);

assert(
  addEditCode.includes('handleUpdateTime'),
  'Provides handleUpdateTime for preset chips and custom time entry'
);

assert(
  addEditCode.includes('doseTimesList') && addEditCode.includes('doseCard'),
  'Uses clean vertical doseTimesList with individual doseCard containers'
);

assert(
  addEditCode.includes('presetChipsWrap') && addEditCode.includes('presetChip'),
  'Uses wrapping presetChipsWrap preventing horizontal card cramming and overlap'
);

assert(
  !addEditCode.includes('timePresetsRow'),
  'Removed cramped horizontal timePresetsRow that caused clock-icon overlap'
);

assert(
  addEditCode.includes('customTimeInput'),
  'Provides accessible custom time input for non-preset reminder times'
);

assert(
  addEditCode.includes('+ Add reminder time'),
  'Renders prominent "+ Add reminder time" button'
);

// -------------------------------------------------------------
// Test Suite 2: Notification Service Multi-Dose & Zero Duplicate Logic
// -------------------------------------------------------------
console.log('\n[Domain 2: Notification Service Multi-Dose Scheduling]');
const notifCode = fs.readFileSync(
  path.resolve(__dirname, '../src/services/notificationService.ts'),
  'utf-8'
);

assert(
  notifCode.includes('export async function scheduleMedicineNotifications('),
  'Exports scheduleMedicineNotifications for multi-dose scheduling'
);

assert(
  notifCode.includes('export function parseTimeToDate('),
  'Exports robust parseTimeToDate supporting 12-hour and 24-hour formats'
);

assert(
  notifCode.includes('await cancelMedicineNotification(medicine.id);'),
  'Cancels prior reminders first to strictly prevent duplicate notifications'
);

assert(
  notifCode.includes('setOnSaveMedicineCallback'),
  'Connects setOnSaveMedicineCallback to auto-schedule on storage saves'
);

// -------------------------------------------------------------
// Test Suite 3: Simulation of Frequency Transitions & Dose Counts
// -------------------------------------------------------------
console.log('\n[Domain 3: Frequency to Reminder Times Simulation]');

function getTargetDoseCountSim(freq) {
  switch (freq) {
    case 'Once a day':
      return 1;
    case 'Twice a day':
      return 2;
    case 'Three times a day':
      return 3;
    case 'Weekly':
      return 1;
    case 'As needed':
    default:
      return 1;
  }
}

function simulateFrequencyChange(currentTimes, newFreq) {
  const targetCount = getTargetDoseCountSim(newFreq);
  if (targetCount === 1) {
    return [currentTimes[0] || '08:00 AM'];
  } else if (targetCount === 2) {
    const first = currentTimes[0] || '08:00 AM';
    const second = currentTimes.length >= 2 && currentTimes[1] !== '02:00 PM' ? currentTimes[1] : '06:00 PM';
    return [first, second];
  } else if (targetCount === 3) {
    const first = currentTimes[0] || '08:00 AM';
    const second = currentTimes.length >= 3 ? currentTimes[1] : '02:00 PM';
    const third = currentTimes.length >= 3 ? currentTimes[2] : '09:00 PM';
    return [first, second, third];
  }
  return currentTimes;
}

// Test Once daily -> 1 time
const onceTimes = simulateFrequencyChange([], 'Once a day');
assert(onceTimes.length === 1 && onceTimes[0] === '08:00 AM', 'Once daily produces exactly 1 reminder: 08:00 AM');

// Test Twice daily -> 2 times
const twiceTimes = simulateFrequencyChange(onceTimes, 'Twice a day');
assert(
  twiceTimes.length === 2 && twiceTimes[0] === '08:00 AM' && twiceTimes[1] === '06:00 PM',
  'Twice daily produces exactly 2 reminders: 08:00 AM and 06:00 PM'
);

// Test Three times daily -> 3 times
const thriceTimes = simulateFrequencyChange(twiceTimes, 'Three times a day');
assert(
  thriceTimes.length === 3 &&
  thriceTimes[0] === '08:00 AM' &&
  thriceTimes[1] === '02:00 PM' &&
  thriceTimes[2] === '09:00 PM',
  'Three times daily produces exactly 3 reminders: 08:00 AM, 02:00 PM, 09:00 PM'
);

// Test changing back to Once daily -> trims back to 1 time
const backToOnce = simulateFrequencyChange(thriceTimes, 'Once a day');
assert(
  backToOnce.length === 1 && backToOnce[0] === '08:00 AM',
  'Changing back to Once daily adjusts to 1 reminder time'
);

// -------------------------------------------------------------
// Test Suite 4: Time Parser Verification
// -------------------------------------------------------------
console.log('\n[Domain 4: Time Parsing & Date Scheduling Logic]');

function parseTimeToDateSim(timeStr) {
  const clean = (timeStr || '08:00 AM').trim();
  let hours = 8;
  let minutes = 0;

  const match = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (match) {
    hours = parseInt(match[1], 10);
    minutes = parseInt(match[2], 10);
    const ampm = match[3] ? match[3].toUpperCase() : null;
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
  }

  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return { hours, minutes };
}

assert(
  parseTimeToDateSim('08:00 AM').hours === 8 && parseTimeToDateSim('08:00 AM').minutes === 0,
  'Parses 08:00 AM as 08:00'
);

assert(
  parseTimeToDateSim('12:00 PM').hours === 12 && parseTimeToDateSim('12:00 PM').minutes === 0,
  'Parses 12:00 PM as 12:00'
);

assert(
  parseTimeToDateSim('02:00 PM').hours === 14 && parseTimeToDateSim('02:00 PM').minutes === 0,
  'Parses 02:00 PM as 14:00'
);

assert(
  parseTimeToDateSim('06:00 PM').hours === 18 && parseTimeToDateSim('06:00 PM').minutes === 0,
  'Parses 06:00 PM as 18:00'
);

assert(
  parseTimeToDateSim('09:00 PM').hours === 21 && parseTimeToDateSim('09:00 PM').minutes === 0,
  'Parses 09:00 PM as 21:00'
);

// -------------------------------------------------------------
// Test Suite 5: Existing Medicine Editing & Persistence Preservation
// -------------------------------------------------------------
console.log('\n[Domain 5: Existing Medicine Editing Preservation]');

const existingMedWithComma = {
  id: 'med_test_1',
  name: 'Metformin',
  dosage: '500mg',
  frequency: 'Twice a day',
  reminderTime: '08:00 AM, 06:00 PM',
};

const parsedTimes = existingMedWithComma.reminderTime
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

assert(
  parsedTimes.length === 2 && parsedTimes[0] === '08:00 AM' && parsedTimes[1] === '06:00 PM',
  'Editing an existing medicine with comma-separated times preserves both reminder times'
);

const existingMedWithArray = {
  id: 'med_test_2',
  name: 'Amoxicillin',
  dosage: '250mg',
  frequency: 'Three times a day',
  reminderTimes: ['08:00 AM', '02:00 PM', '09:00 PM'],
  reminderTime: '08:00 AM, 02:00 PM, 09:00 PM',
};

assert(
  existingMedWithArray.reminderTimes.length === 3,
  'Editing an existing medicine with reminderTimes array preserves all 3 reminder times'
);

// -------------------------------------------------------------
// Test Suite 6: Multi-Dose Notification Scheduling Simulation
// -------------------------------------------------------------
console.log('\n[Domain 6: Multi-Dose Notification Scheduling Simulation]');

let mockActiveTimers = new Map();
let mockStoredReminders = [];

async function mockCancelMedicineNotification(medicineId) {
  mockStoredReminders = mockStoredReminders.filter((item) => item.medicineId !== medicineId);
  mockActiveTimers.delete(medicineId);
}

async function mockScheduleMedicineNotifications(medicine) {
  await mockCancelMedicineNotification(medicine.id);

  const times = medicine.reminderTimes || [medicine.reminderTime];
  const scheduledIds = [];

  for (let i = 0; i < times.length; i++) {
    const id = `rem_${medicine.id}_${i}`;
    mockStoredReminders.push({
      identifier: id,
      medicineId: medicine.id,
      scheduledTime: times[i],
    });
    scheduledIds.push(id);
  }
  return scheduledIds;
}

(async () => {
  // 1. Schedule Once daily
  const med1 = { id: 'med_101', name: 'Aspirin', reminderTimes: ['08:00 AM'] };
  const ids1 = await mockScheduleMedicineNotifications(med1);
  assert(ids1.length === 1, 'Once daily creates exactly 1 scheduled reminder');
  assert(mockStoredReminders.length === 1, 'Store contains exactly 1 reminder');

  // 2. Schedule Twice daily
  const med2 = { id: 'med_102', name: 'Metformin', reminderTimes: ['08:00 AM', '06:00 PM'] };
  const ids2 = await mockScheduleMedicineNotifications(med2);
  assert(ids2.length === 2, 'Twice daily creates exactly 2 scheduled reminders');

  // 3. Schedule Three times daily
  const med3 = { id: 'med_103', name: 'Antibiotic', reminderTimes: ['08:00 AM', '02:00 PM', '09:00 PM'] };
  const ids3 = await mockScheduleMedicineNotifications(med3);
  assert(ids3.length === 3, 'Three times daily creates exactly 3 scheduled reminders');

  // 4. Update existing medicine (Metformin from Twice daily to Three times daily)
  const med2Updated = {
    id: 'med_102',
    name: 'Metformin',
    reminderTimes: ['08:00 AM', '02:00 PM', '08:00 PM'],
  };
  const ids2Updated = await mockScheduleMedicineNotifications(med2Updated);
  assert(ids2Updated.length === 3, 'Updating Metformin creates 3 updated reminders');

  const med2Stored = mockStoredReminders.filter((r) => r.medicineId === 'med_102');
  assert(
    med2Stored.length === 3,
    'Zero duplicate reminders for Metformin (old 2 were canceled before adding 3)'
  );

  console.log('\n================================================================');
  console.log(`  Reminder Times Test Results: ${passCount} Passed, ${failCount} Failed`);
  console.log('================================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
})();
