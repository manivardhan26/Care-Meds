package com.example.myapplication1.data.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.example.myapplication1.data.entity.AdherenceLogEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface AdherenceDao {
    @Query("SELECT * FROM adherence_logs ORDER BY actionTimestamp DESC")
    fun getAllLogs(): Flow<List<AdherenceLogEntity>>

    @Query("SELECT * FROM adherence_logs WHERE dateString = :dateString ORDER BY scheduledTime ASC")
    fun getLogsForDate(dateString: String): Flow<List<AdherenceLogEntity>>

    @Query("SELECT * FROM adherence_logs WHERE medicineId = :medicineId ORDER BY actionTimestamp DESC")
    fun getLogsForMedicine(medicineId: Long): Flow<List<AdherenceLogEntity>>

    @Query("SELECT * FROM adherence_logs WHERE medicineId = :medicineId AND dateString = :dateString LIMIT 1")
    suspend fun getLogForMedicineAndDate(medicineId: Long, dateString: String): AdherenceLogEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertLog(log: AdherenceLogEntity): Long

    @Update
    suspend fun updateLog(log: AdherenceLogEntity)

    @Query("DELETE FROM adherence_logs WHERE id = :id")
    suspend fun deleteLogById(id: Long)

    @Query("DELETE FROM adherence_logs WHERE medicineId = :medicineId")
    suspend fun deleteLogsForMedicine(medicineId: Long)
}
