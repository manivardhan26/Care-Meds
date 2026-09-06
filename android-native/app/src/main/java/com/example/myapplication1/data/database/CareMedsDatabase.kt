package com.example.myapplication1.data.database

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import com.example.myapplication1.data.dao.AdherenceDao
import com.example.myapplication1.data.dao.MedicineDao
import com.example.myapplication1.data.entity.AdherenceLogEntity
import com.example.myapplication1.data.entity.MedicineEntity

@Database(
    entities = [MedicineEntity::class, AdherenceLogEntity::class],
    version = 2,
    exportSchema = false
)
abstract class CareMedsDatabase : RoomDatabase() {
    abstract fun medicineDao(): MedicineDao
    abstract fun adherenceDao(): AdherenceDao

    companion object {
        @Volatile
        private var INSTANCE: CareMedsDatabase? = null

        fun getDatabase(context: Context): CareMedsDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    CareMedsDatabase::class.java,
                    "caremeds_database"
                )
                    .fallbackToDestructiveMigration(dropAllTables = true)
                    .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
