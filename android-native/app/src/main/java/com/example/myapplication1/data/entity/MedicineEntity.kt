package com.example.myapplication1.data.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "medicines")
data class MedicineEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0L,
    val name: String,
    val dosage: String,
    val instructions: String = "",
    val notes: String = "",
    val expiryDate: String,
    val frequency: String = "Once daily",
    val timeOfDay: String = "Morning",
    val reminderTime: String = "08:00 AM",
    val imageUri: String? = null,
    val supplyCount: Int = 30,
    val isLowSupply: Boolean = false,
    val createdAt: Long = System.currentTimeMillis()
)
