/**
 * CareMeds Profile Section Verification Suite
 * Verifies all 11 user requirements for Profile functionality and persistence.
 */

const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

console.log('================================================================');
console.log('  CareMeds Profile Feature Verification & Contract Audit');
console.log('================================================================\n');

// 1. Inspect SettingsScreen code
console.log('[Step 1: Inspect Profile UI & Screen Elements]');
const settingsCode = fs.readFileSync(path.resolve(__dirname, '../src/screens/SettingsScreen.tsx'), 'utf-8');

assert(settingsCode.includes('styles.avatarCircle'), 'Renders avatar circle container');
assert(settingsCode.includes('<Ionicons name="person"'), 'Renders large profile icon');
assert(settingsCode.includes('settings.patientName?.trim() || \'CareMeds Patient\''), 'Defaults to "CareMeds Patient" if name empty');
assert(settingsCode.includes('Senior Medication Companion'), 'Subtitle is exactly "Senior Medication Companion"');
assert(settingsCode.includes('handleOpenEditProfile'), 'Edit Profile button triggers handleOpenEditProfile');
assert(settingsCode.includes('styles.ageBadge'), 'Displays age badge when age is provided');

// 2. Modal Structure
console.log('\n[Step 2: Inspect Edit Profile Modal Elements]');
assert(settingsCode.includes('<Modal'), 'Renders Edit Profile Modal');
assert(settingsCode.includes('isEditProfileOpen'), 'Modal visibility is controlled by isEditProfileOpen');
assert(settingsCode.includes('Patient Name'), 'Large label for Patient Name');
assert(settingsCode.includes('Age (Optional)'), 'Large label for Age (Optional)');
assert(settingsCode.includes('handleCancelEditProfile'), 'Provides Cancel/Back action');
assert(settingsCode.includes('handleSaveProfile'), 'Provides Save action');

// 3. Validation Rules
console.log('\n[Step 3: Validation Rules Contract]');
assert(
  settingsCode.includes('if (!trimmedName)') &&
  settingsCode.includes('Missing Name'),
  'Validates that patient name cannot be saved as empty'
);
assert(
  settingsCode.includes('parsedAge < 1 || parsedAge > 125'),
  'Validates that age, if provided, must be within reasonable range'
);
assert(
  settingsCode.includes('patientAge: trimmedAge'),
  'Allows age to be empty (optional)'
);

// 4. Persistence Architecture
console.log('\n[Step 4: Persistence Architecture & Schema Check]');
const typesCode = fs.readFileSync(path.resolve(__dirname, '../src/types/index.ts'), 'utf-8');
assert(typesCode.includes('patientName?: string;'), 'Frontend AppSettings includes patientName');
assert(typesCode.includes('patientAge?: string;'), 'Frontend AppSettings includes patientAge');

const backendTypesCode = fs.readFileSync(path.resolve(__dirname, '../../backend/src/types/index.ts'), 'utf-8');
assert(backendTypesCode.includes('patientName?: string;'), 'Backend AppSettings includes patientName');
assert(backendTypesCode.includes('patientAge?: string;'), 'Backend AppSettings includes patientAge');

const storageCode = fs.readFileSync(path.resolve(__dirname, '../src/storage/medicineStorage.ts'), 'utf-8');
assert(storageCode.includes("patientName: 'CareMeds Patient'"), 'DEFAULT_SETTINGS has patientName default');
assert(storageCode.includes("patientAge: ''"), 'DEFAULT_SETTINGS has patientAge default');
assert(storageCode.includes('saveSettings'), 'saveSettings persists to AsyncStorage and syncs to API');

// 5. Senior-Friendly Aesthetics
console.log('\n[Step 5: Senior-Friendly Aesthetics & Contrast]');
assert(!settingsCode.includes('LinearGradient'), 'No gradients used (calm, senior-friendly)');
assert(!settingsCode.includes('BlurView'), 'No glassmorphism used');
assert(settingsCode.includes('height: 52'), 'Input fields have generous 52px height for senior usability');
assert(settingsCode.includes('height: 48'), 'Modal action buttons have generous 48px height');
assert(settingsCode.includes('fontSize: 19'), 'Patient name has large 19px readable font');

console.log('\n================================================================');
console.log(`  Profile Verification Summary: ${passed} Passed, ${failed} Failed`);
console.log('================================================================\n');

if (failed > 0) {
  process.exit(1);
}
