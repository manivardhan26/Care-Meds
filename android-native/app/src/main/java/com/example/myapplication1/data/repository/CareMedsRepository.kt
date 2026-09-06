package com.example.myapplication1.data.repository

import com.example.myapplication1.data.dao.AdherenceDao
import com.example.myapplication1.data.dao.MedicineDao
import com.example.myapplication1.data.entity.AdherenceLogEntity
import com.example.myapplication1.data.entity.MedicineEntity
import kotlinx.coroutines.flow.Flow

class CareMedsRepository(
    private val medicineDao: MedicineDao,
    private val adherenceDao: AdherenceDao
) {
    val allMedicines: Flow<List<MedicineEntity>> = medicineDao.getAllMedicines()
    val allAdherenceLogs: Flow<List<AdherenceLogEntity>> = adherenceDao.getAllLogs()

    suspend fun insertMedicine(medicine: MedicineEntity): Long {
        return medicineDao.insertMedicine(medicine)
    }

    suspend fun updateMedicine(medicine: MedicineEntity) {
        medicineDao.updateMedicine(medicine)
    }

    suspend fun deleteMedicine(medicine: MedicineEntity) {
        medicineDao.deleteMedicine(medicine)
        adherenceDao.deleteLogsForMedicine(medicine.id)
    }

    suspend fun deleteMedicineById(id: Long) {
        medicineDao.deleteMedicineById(id)
        adherenceDao.deleteLogsForMedicine(id)
    }

    suspend fun getMedicineById(id: Long): MedicineEntity? {
        return medicineDao.getMedicineById(id)
    }

    suspend fun decrementSupply(medicineId: Long) {
        medicineDao.decrementSupply(medicineId)
    }

    fun getLogsForDate(dateString: String): Flow<List<AdherenceLogEntity>> {
        return adherenceDao.getLogsForDate(dateString)
    }

    fun getLogsForMedicine(medicineId: Long): Flow<List<AdherenceLogEntity>> {
        return adherenceDao.getLogsForMedicine(medicineId)
    }

    suspend fun logAdherence(
        medicineId: Long,
        medicineName: String,
        dosage: String,
        scheduledTime: String,
        dateString: String,
        status: String,
        notes: String? = null
    ): Long {
        val existing = adherenceDao.getLogForMedicineAndDate(medicineId, dateString)
        val log = if (existing != null) {
            existing.copy(
                status = status,
                actionTimestamp = System.currentTimeMillis(),
                notes = notes ?: existing.notes
            )
        } else {
            AdherenceLogEntity(
                medicineId = medicineId,
                medicineName = medicineName,
                dosage = dosage,
                scheduledTime = scheduledTime,
                dateString = dateString,
                actionTimestamp = System.currentTimeMillis(),
                status = status,
                notes = notes
            )
        }
        val id = adherenceDao.insertLog(log)
        if (status == "TAKEN") {
            medicineDao.decrementSupply(medicineId)
        }
        return id
    }

    suspend fun deleteLogById(id: Long) {
        adherenceDao.deleteLogById(id)
    }
}
