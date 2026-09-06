import fs from 'fs';
import path from 'path';
import { Medicine, AdherenceLog, AppSettings, AdherenceStatus } from '../types';

const DATA_DIR = path.resolve(__dirname, '../../data');
const DATA_FILE = process.env.DATA_FILE_PATH 
  ? path.resolve(process.cwd(), process.env.DATA_FILE_PATH)
  : path.join(DATA_DIR, 'caremeds.json');

const DEFAULT_SETTINGS: AppSettings = {
  voiceRemindersEnabled: true,
  soundAlertsEnabled: true,
  snoozeMinutes: 15,
  isDarkMode: false,
};

const SEED_MEDICINES: Medicine[] = [
  {
    id: 'med_1',
    name: 'Aspirin Cardio',
    dosage: '81mg',
    instructions: 'Take 1 tablet daily with breakfast',
    notes: 'Take 1 tablet daily with breakfast',
    expiryDate: '2027-12-31',
    frequency: 'Once daily',
    reminderTime: '08:00 AM',
    timeOfDay: 'Morning',
    supplyCount: 28,
    createdAt: Date.now() - 86400000 * 5,
  },
  {
    id: 'med_2',
    name: 'Lisinopril',
    dosage: '10mg',
    instructions: 'Take in the morning with water',
    notes: 'For blood pressure maintenance',
    expiryDate: '2026-11-30',
    frequency: 'Once daily',
    reminderTime: '09:00 AM',
    timeOfDay: 'Morning',
    supplyCount: 15,
    createdAt: Date.now() - 86400000 * 10,
  },
  {
    id: 'med_3',
    name: 'Metformin',
    dosage: '500mg',
    instructions: 'Take after evening meal',
    notes: 'Take after evening meal',
    expiryDate: '2028-04-15',
    frequency: 'Once daily',
    reminderTime: '06:00 PM',
    timeOfDay: 'Evening',
    supplyCount: 45,
    createdAt: Date.now() - 86400000 * 2,
  },
  {
    id: 'med_4',
    name: 'Atorvastatin (Expired Sample)',
    dosage: '20mg',
    instructions: 'Take 1 tablet at bedtime',
    notes: 'Check with pharmacy for replacement bottle',
    expiryDate: '2025-01-10',
    frequency: 'Once daily',
    reminderTime: '09:00 PM',
    timeOfDay: 'Night',
    supplyCount: 8,
    createdAt: Date.now() - 86400000 * 40,
  },
];

interface DatabaseSchema {
  medicines: Medicine[];
  adherenceLogs: AdherenceLog[];
  settings: AppSettings;
}

class Database {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.loadData();
  }

  private loadData(): DatabaseSchema {
    try {
      const dir = path.dirname(DATA_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Could not read existing database file, initializing with seeds:', e);
    }

    const initialData: DatabaseSchema = {
      medicines: SEED_MEDICINES,
      adherenceLogs: [],
      settings: DEFAULT_SETTINGS,
    };
    this.persist(initialData);
    return initialData;
  }

  private persist(dataToSave?: DatabaseSchema) {
    try {
      const dir = path.dirname(DATA_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(dataToSave || this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to write database file:', e);
    }
  }

  // Medicines
  public getAllMedicines(): Medicine[] {
    return this.data.medicines;
  }

  public getMedicineById(id: string): Medicine | undefined {
    return this.data.medicines.find((m) => m.id === id);
  }

  public saveMedicine(medicineData: Omit<Medicine, 'id' | 'createdAt'>, existingId?: string): Medicine {
    let saved: Medicine;

    if (existingId) {
      const index = this.data.medicines.findIndex((m) => m.id === existingId);
      saved = {
        ...medicineData,
        id: existingId,
        createdAt: index >= 0 ? this.data.medicines[index].createdAt : Date.now(),
      };
      if (index >= 0) {
        this.data.medicines[index] = saved;
      } else {
        this.data.medicines.push(saved);
      }
    } else {
      saved = {
        ...medicineData,
        id: `med_${Date.now()}`,
        createdAt: Date.now(),
      };
      this.data.medicines.push(saved);
    }

    this.persist();
    return saved;
  }

  public deleteMedicine(id: string): boolean {
    const initialLen = this.data.medicines.length;
    this.data.medicines = this.data.medicines.filter((m) => m.id !== id);
    this.data.adherenceLogs = this.data.adherenceLogs.filter((l) => l.medicineId !== id);
    this.persist();
    return this.data.medicines.length < initialLen;
  }

  public updateSupply(id: string, count: number): Medicine | null {
    const target = this.data.medicines.find((m) => m.id === id);
    if (!target) return null;
    target.supplyCount = Math.max(0, count);
    this.persist();
    return target;
  }

  // Adherence Logs
  public getAdherenceLogs(dateString?: string, medicineId?: string): AdherenceLog[] {
    let logs = this.data.adherenceLogs;
    if (dateString) {
      logs = logs.filter((l) => l.dateString === dateString);
    }
    if (medicineId) {
      logs = logs.filter((l) => l.medicineId === medicineId);
    }
    return logs;
  }

  public logAdherence(
    medicineId: string,
    medicineName: string,
    dosage: string,
    scheduledTime: string,
    dateString: string,
    status: AdherenceStatus,
    notes?: string
  ): AdherenceLog {
    const existingIndex = this.data.adherenceLogs.findIndex(
      (l) => l.medicineId === medicineId && l.dateString === dateString
    );

    let record: AdherenceLog;
    if (existingIndex >= 0) {
      record = {
        ...this.data.adherenceLogs[existingIndex],
        status,
        actionTimestamp: Date.now(),
        notes: notes || this.data.adherenceLogs[existingIndex].notes,
      };
      this.data.adherenceLogs[existingIndex] = record;
    } else {
      record = {
        id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        medicineId,
        medicineName,
        dosage,
        scheduledTime,
        dateString,
        actionTimestamp: Date.now(),
        status,
        notes,
      };
      this.data.adherenceLogs.unshift(record);
    }

    // If taken, decrement supply by 1
    if (status === 'TAKEN') {
      const med = this.data.medicines.find((m) => m.id === medicineId);
      if (med && med.supplyCount > 0) {
        med.supplyCount -= 1;
      }
    }

    this.persist();
    return record;
  }

  // Settings
  public getSettings(): AppSettings {
    return this.data.settings || DEFAULT_SETTINGS;
  }

  public updateSettings(partial: Partial<AppSettings>): AppSettings {
    this.data.settings = { ...this.getSettings(), ...partial };
    this.persist();
    return this.data.settings;
  }
}

export const db = new Database();
