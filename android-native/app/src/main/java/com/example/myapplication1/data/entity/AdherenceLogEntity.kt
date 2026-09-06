package com.example.myapplication1.data.entity

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "adherence_logs",
    indices = [
        Index(value = ["medicineId"]),
        Index(value = ["dateString"]),
        Index(value = ["actionTimestamp"])
    ]
)
data class AdherenceLogEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0L,
    val medicineId: Long,
    val medicineName: String,
    val dosage: String,
    val scheduledTime: String,
    val dateString: String, // e.g. "2026-09-06"
    val actionTimestamp: Long = System.currentTimeMillis(),
    val status: String, // "TAKEN", "MISSED", "SKIPPED", "SNOOZED"
    val notes: String? = null
)
