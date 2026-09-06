import { Router, Request, Response } from 'express';
import { db } from '../database/db';
import { AdherenceStatus } from '../types';

export const adherenceRouter = Router();

// GET /api/adherence - List adherence logs with optional date & medicineId filters
adherenceRouter.get('/', (req: Request, res: Response) => {
  try {
    const { date, medicineId } = req.query;
    const logs = db.getAdherenceLogs(
      typeof date === 'string' ? date : undefined,
      typeof medicineId === 'string' ? medicineId : undefined
    );
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve adherence logs' });
  }
});

// POST /api/adherence - Log medication adherence action (TAKEN, SKIPPED, etc.)
adherenceRouter.post('/', (req: Request, res: Response) => {
  try {
    const { medicineId, medicineName, dosage, scheduledTime, dateString, status, notes } = req.body;
    if (!medicineId || !dateString || !status) {
      return res.status(400).json({ error: 'medicineId, dateString, and status are required' });
    }
    const record = db.logAdherence(
      medicineId,
      medicineName || 'Medicine',
      dosage || '',
      scheduledTime || '',
      dateString,
      status as AdherenceStatus,
      notes
    );
    res.status(201).json(record);
  } catch (error) {
    res.status(500).json({ error: 'Failed to log adherence' });
  }
});
