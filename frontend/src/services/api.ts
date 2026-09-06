import { Medicine, AdherenceLog, AppSettings, AdherenceStatus } from '../types';

// Default API URL: can be configured via .env (EXPO_PUBLIC_API_URL)
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

const FETCH_TIMEOUT_MS = 4000;

async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    return response;
  } finally {
    clearTimeout(id);
  }
}

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

export async function getMedicinesApi(): Promise<Medicine[] | null> {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/medicines`);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.warn('Backend API unavailable, using local storage for medicines');
    return null;
  }
}

export async function saveMedicineApi(
  medicine: Omit<Medicine, 'id' | 'createdAt'>,
  existingId?: string
): Promise<Medicine | null> {
  try {
    const url = existingId ? `${API_BASE_URL}/medicines/${existingId}` : `${API_BASE_URL}/medicines`;
    const method = existingId ? 'PUT' : 'POST';
    const res = await fetchWithTimeout(url, {
      method,
      body: JSON.stringify(medicine),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.warn('Backend API error on saveMedicine:', e);
    return null;
  }
}

export async function deleteMedicineApi(id: string): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/medicines/${id}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch (e) {
    console.warn('Backend API error on deleteMedicine:', e);
    return false;
  }
}

export async function updateSupplyApi(id: string, count: number): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/medicines/${id}/supply`, {
      method: 'PATCH',
      body: JSON.stringify({ count }),
    });
    return res.ok;
  } catch (e) {
    console.warn('Backend API error on updateSupply:', e);
    return false;
  }
}

export async function getAdherenceLogsApi(dateString?: string): Promise<AdherenceLog[] | null> {
  try {
    const url = dateString 
      ? `${API_BASE_URL}/adherence?date=${encodeURIComponent(dateString)}`
      : `${API_BASE_URL}/adherence`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.warn('Backend API unavailable, using local storage for adherence logs');
    return null;
  }
}

export async function logAdherenceApi(
  medicineId: string,
  medicineName: string,
  dosage: string,
  scheduledTime: string,
  dateString: string,
  status: AdherenceStatus,
  notes?: string
): Promise<AdherenceLog | null> {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/adherence`, {
      method: 'POST',
      body: JSON.stringify({
        medicineId,
        medicineName,
        dosage,
        scheduledTime,
        dateString,
        status,
        notes,
      }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.warn('Backend API error on logAdherence:', e);
    return null;
  }
}

export async function getSettingsApi(): Promise<AppSettings | null> {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/settings`);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

export async function saveSettingsApi(settings: Partial<AppSettings>): Promise<AppSettings | null> {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/settings`, {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}
