import { Router, Request, Response } from 'express';
import { db } from '../database/db';

export const medicinesRouter = Router();

// GET /api/medicines - List all medicines
medicinesRouter.get('/', (req: Request, res: Response) => {
  try {
    const medicines = db.getAllMedicines();
    res.json(medicines);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve medicines' });
  }
});

// GET /api/medicines/:id - Get medicine by ID
medicinesRouter.get('/:id', (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const medicine = db.getMedicineById(id);
    if (!medicine) {
      return res.status(404).json({ error: 'Medicine not found' });
    }
    res.json(medicine);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve medicine' });
  }
});

// POST /api/medicines - Create new medicine
medicinesRouter.post('/', (req: Request, res: Response) => {
  try {
    const {
      name,
      dosage,
      instructions,
      notes,
      expiryDate,
      frequency,
      reminderTime,
      timeOfDay,
      supplyCount,
      stockTrackingEnabled,
      currentQuantity,
      unitType,
      quantityPerDose,
      lowStockThreshold,
    } = req.body;

    if (!name || !dosage) {
      return res.status(400).json({ error: 'Name and dosage are required' });
    }

    const resolvedQuantity = typeof currentQuantity === 'number'
      ? Math.max(0, currentQuantity)
      : (typeof supplyCount === 'number' ? Math.max(0, supplyCount) : 30);

    const created = db.saveMedicine({
      name,
      dosage,
      instructions: instructions || '',
      notes: notes || '',
      expiryDate: expiryDate || '',
      frequency: frequency || 'Once daily',
      reminderTime: reminderTime || '08:00 AM',
      timeOfDay: timeOfDay || 'Morning',
      supplyCount: resolvedQuantity,
      stockTrackingEnabled: typeof stockTrackingEnabled === 'boolean' ? stockTrackingEnabled : true,
      currentQuantity: resolvedQuantity,
      unitType: unitType || 'tablets',
      quantityPerDose: typeof quantityPerDose === 'number' && quantityPerDose > 0 ? quantityPerDose : 1,
      lowStockThreshold: typeof lowStockThreshold === 'number' && lowStockThreshold >= 0 ? lowStockThreshold : 3,
    });
    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create medicine' });
  }
});

// PUT /api/medicines/:id - Update existing medicine
medicinesRouter.put('/:id', (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const existing = db.getMedicineById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Medicine not found' });
    }
    const {
      name,
      dosage,
      instructions,
      notes,
      expiryDate,
      frequency,
      reminderTime,
      timeOfDay,
      supplyCount,
      stockTrackingEnabled,
      currentQuantity,
      unitType,
      quantityPerDose,
      lowStockThreshold,
    } = req.body;

    const resolvedQuantity = typeof currentQuantity === 'number'
      ? Math.max(0, currentQuantity)
      : (typeof supplyCount === 'number' ? Math.max(0, supplyCount) : (existing.currentQuantity ?? existing.supplyCount));

    const updated = db.saveMedicine(
      {
        name: name !== undefined ? name : existing.name,
        dosage: dosage !== undefined ? dosage : existing.dosage,
        instructions: instructions !== undefined ? instructions : existing.instructions,
        notes: notes !== undefined ? notes : existing.notes,
        expiryDate: expiryDate !== undefined ? expiryDate : existing.expiryDate,
        frequency: frequency !== undefined ? frequency : existing.frequency,
        reminderTime: reminderTime !== undefined ? reminderTime : existing.reminderTime,
        timeOfDay: timeOfDay !== undefined ? timeOfDay : existing.timeOfDay,
        supplyCount: resolvedQuantity,
        stockTrackingEnabled: stockTrackingEnabled !== undefined ? stockTrackingEnabled : existing.stockTrackingEnabled,
        currentQuantity: resolvedQuantity,
        unitType: unitType !== undefined ? unitType : existing.unitType,
        quantityPerDose: quantityPerDose !== undefined ? quantityPerDose : existing.quantityPerDose,
        lowStockThreshold: lowStockThreshold !== undefined ? lowStockThreshold : existing.lowStockThreshold,
      },
      id
    );
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update medicine' });
  }
});

// DELETE /api/medicines/:id - Delete medicine
medicinesRouter.delete('/:id', (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const deleted = db.deleteMedicine(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Medicine not found' });
    }
    res.json({ success: true, message: 'Medicine deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete medicine' });
  }
});

// PATCH /api/medicines/:id/supply - Update supply count
medicinesRouter.patch('/:id/supply', (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { count } = req.body;
    if (typeof count !== 'number') {
      return res.status(400).json({ error: 'Count must be a number' });
    }
    const updated = db.updateSupply(id, count);
    if (!updated) {
      return res.status(404).json({ error: 'Medicine not found' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update supply' });
  }
});
