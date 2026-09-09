import { Medicine } from '../types';

export interface StockInfo {
  enabled: boolean;
  currentQuantity: number;
  unitType: string;
  quantityPerDose: number;
  lowStockThreshold: number;
  isLowStock: boolean;
  isOutOfStock: boolean;
  statusText: string;
  warningText?: string;
  needsRefill: boolean;
  refillMessage: string;
}

export const COMMON_UNITS = [
  'tablets',
  'capsules',
  'doses',
  'pills',
  'drops',
  'puffs',
  'sachets',
];

/**
 * Normalizes stock metadata for any medicine entity.
 * Provides safe defaults for existing medicines created prior to the stock tracker feature.
 */
export function getMedicineStockInfo(medicine?: Partial<Medicine> | null): StockInfo {
  if (!medicine) {
    return {
      enabled: false,
      currentQuantity: 0,
      unitType: 'tablets',
      quantityPerDose: 1,
      lowStockThreshold: 3,
      isLowStock: false,
      isOutOfStock: false,
      statusText: '',
      warningText: undefined,
      needsRefill: false,
      refillMessage: '',
    };
  }

  // Determine if stock tracking is enabled with safe backward-compatibility fallback
  const hasExplicitFlag = typeof medicine.stockTrackingEnabled === 'boolean';
  const enabled = hasExplicitFlag
    ? (medicine.stockTrackingEnabled as boolean)
    : (typeof medicine.currentQuantity === 'number' || (typeof medicine.supplyCount === 'number' && medicine.supplyCount >= 0));

  // Determine current quantity with fallback to legacy supplyCount
  const rawQuantity = typeof medicine.currentQuantity === 'number'
    ? medicine.currentQuantity
    : (typeof medicine.supplyCount === 'number' ? medicine.supplyCount : 0);
  const currentQuantity = Math.max(0, Math.round(rawQuantity));

  // Determine unit type (default: 'tablets')
  const unitType = medicine.unitType && medicine.unitType.trim()
    ? medicine.unitType.trim().toLowerCase()
    : 'tablets';

  // Determine quantity per dose (default: 1)
  const rawQtyPerDose = typeof medicine.quantityPerDose === 'number' ? medicine.quantityPerDose : 1;
  const quantityPerDose = Math.max(1, Math.round(rawQtyPerDose));

  // Determine low stock threshold (default: 3)
  const rawThreshold = typeof medicine.lowStockThreshold === 'number' ? medicine.lowStockThreshold : 3;
  const lowStockThreshold = Math.max(0, Math.round(rawThreshold));

  const isOutOfStock = enabled && currentQuantity <= 0;
  const isLowStock = enabled && !isOutOfStock && currentQuantity <= lowStockThreshold;

  let statusText = '';
  let warningText: string | undefined = undefined;

  if (enabled) {
    if (isOutOfStock) {
      statusText = 'No medicine remaining.';
      warningText = 'No medicine remaining.';
    } else if (isLowStock) {
      statusText = `${currentQuantity} ${unitType} remaining`;
      warningText = `Only ${currentQuantity} ${unitType} remaining.`;
    } else {
      statusText = `${currentQuantity} ${unitType} remaining`;
    }
  }

  const needsRefill = isOutOfStock || isLowStock;
  const refillMessage = isOutOfStock
    ? 'No medicine remaining. Consider refilling it.'
    : 'Your medicine is running low. Consider refilling it.';

  return {
    enabled,
    currentQuantity,
    unitType,
    quantityPerDose,
    lowStockThreshold,
    isLowStock,
    isOutOfStock,
    statusText,
    warningText,
    needsRefill,
    refillMessage,
  };
}

/**
 * Checks if a medicine requires a refill reminder.
 * Designed for future refill notifications without modifying core stock logic.
 */
export function checkNeedsRefill(medicine: Partial<Medicine>): boolean {
  return getMedicineStockInfo(medicine).needsRefill;
}
