package com.example.myapplication1.`data`.database

import androidx.room.InvalidationTracker
import androidx.room.RoomOpenDelegate
import androidx.room.migration.AutoMigrationSpec
import androidx.room.migration.Migration
import androidx.room.util.TableInfo
import androidx.room.util.TableInfo.Companion.read
import androidx.room.util.dropFtsSyncTriggers
import androidx.sqlite.SQLiteConnection
import androidx.sqlite.execSQL
import com.example.myapplication1.`data`.dao.AdherenceDao
import com.example.myapplication1.`data`.dao.AdherenceDao_Impl
import com.example.myapplication1.`data`.dao.MedicineDao
import com.example.myapplication1.`data`.dao.MedicineDao_Impl
import javax.`annotation`.processing.Generated
import kotlin.Lazy
import kotlin.String
import kotlin.Suppress
import kotlin.collections.List
import kotlin.collections.Map
import kotlin.collections.MutableList
import kotlin.collections.MutableMap
import kotlin.collections.MutableSet
import kotlin.collections.Set
import kotlin.collections.mutableListOf
import kotlin.collections.mutableMapOf
import kotlin.collections.mutableSetOf
import kotlin.reflect.KClass

@Generated(value = ["androidx.room.RoomProcessor"])
@Suppress(names = ["UNCHECKED_CAST", "DEPRECATION", "REDUNDANT_PROJECTION", "REMOVAL"])
public class CareMedsDatabase_Impl : CareMedsDatabase() {
  private val _medicineDao: Lazy<MedicineDao> = lazy {
    MedicineDao_Impl(this)
  }

  private val _adherenceDao: Lazy<AdherenceDao> = lazy {
    AdherenceDao_Impl(this)
  }

  protected override fun createOpenDelegate(): RoomOpenDelegate {
    val _openDelegate: RoomOpenDelegate = object : RoomOpenDelegate(2,
        "53741fd6a5880a5649f35869c7aa82ef", "26ed1129ac1a91df6fdfba0d9f46cbd0") {
      public override fun createAllTables(connection: SQLiteConnection) {
        connection.execSQL("CREATE TABLE IF NOT EXISTS `medicines` (`id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, `name` TEXT NOT NULL, `dosage` TEXT NOT NULL, `instructions` TEXT NOT NULL, `notes` TEXT NOT NULL, `expiryDate` TEXT NOT NULL, `frequency` TEXT NOT NULL, `timeOfDay` TEXT NOT NULL, `reminderTime` TEXT NOT NULL, `imageUri` TEXT, `supplyCount` INTEGER NOT NULL, `isLowSupply` INTEGER NOT NULL, `createdAt` INTEGER NOT NULL)")
        connection.execSQL("CREATE TABLE IF NOT EXISTS `adherence_logs` (`id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, `medicineId` INTEGER NOT NULL, `medicineName` TEXT NOT NULL, `dosage` TEXT NOT NULL, `scheduledTime` TEXT NOT NULL, `dateString` TEXT NOT NULL, `actionTimestamp` INTEGER NOT NULL, `status` TEXT NOT NULL, `notes` TEXT)")
        connection.execSQL("CREATE INDEX IF NOT EXISTS `index_adherence_logs_medicineId` ON `adherence_logs` (`medicineId`)")
        connection.execSQL("CREATE INDEX IF NOT EXISTS `index_adherence_logs_dateString` ON `adherence_logs` (`dateString`)")
        connection.execSQL("CREATE INDEX IF NOT EXISTS `index_adherence_logs_actionTimestamp` ON `adherence_logs` (`actionTimestamp`)")
        connection.execSQL("CREATE TABLE IF NOT EXISTS room_master_table (id INTEGER PRIMARY KEY,identity_hash TEXT)")
        connection.execSQL("INSERT OR REPLACE INTO room_master_table (id,identity_hash) VALUES(42, '53741fd6a5880a5649f35869c7aa82ef')")
      }

      public override fun dropAllTables(connection: SQLiteConnection) {
        connection.execSQL("DROP TABLE IF EXISTS `medicines`")
        connection.execSQL("DROP TABLE IF EXISTS `adherence_logs`")
      }

      public override fun onCreate(connection: SQLiteConnection) {
      }

      public override fun onOpen(connection: SQLiteConnection) {
        internalInitInvalidationTracker(connection)
      }

      public override fun onPreMigrate(connection: SQLiteConnection) {
        dropFtsSyncTriggers(connection)
      }

      public override fun onPostMigrate(connection: SQLiteConnection) {
      }

      public override fun onValidateSchema(connection: SQLiteConnection):
          RoomOpenDelegate.ValidationResult {
        val _columnsMedicines: MutableMap<String, TableInfo.Column> = mutableMapOf()
        _columnsMedicines.put("id", TableInfo.Column("id", "INTEGER", true, 1, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsMedicines.put("name", TableInfo.Column("name", "TEXT", true, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsMedicines.put("dosage", TableInfo.Column("dosage", "TEXT", true, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsMedicines.put("instructions", TableInfo.Column("instructions", "TEXT", true, 0,
            null, TableInfo.CREATED_FROM_ENTITY))
        _columnsMedicines.put("notes", TableInfo.Column("notes", "TEXT", true, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsMedicines.put("expiryDate", TableInfo.Column("expiryDate", "TEXT", true, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsMedicines.put("frequency", TableInfo.Column("frequency", "TEXT", true, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsMedicines.put("timeOfDay", TableInfo.Column("timeOfDay", "TEXT", true, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsMedicines.put("reminderTime", TableInfo.Column("reminderTime", "TEXT", true, 0,
            null, TableInfo.CREATED_FROM_ENTITY))
        _columnsMedicines.put("imageUri", TableInfo.Column("imageUri", "TEXT", false, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsMedicines.put("supplyCount", TableInfo.Column("supplyCount", "INTEGER", true, 0,
            null, TableInfo.CREATED_FROM_ENTITY))
        _columnsMedicines.put("isLowSupply", TableInfo.Column("isLowSupply", "INTEGER", true, 0,
            null, TableInfo.CREATED_FROM_ENTITY))
        _columnsMedicines.put("createdAt", TableInfo.Column("createdAt", "INTEGER", true, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        val _foreignKeysMedicines: MutableSet<TableInfo.ForeignKey> = mutableSetOf()
        val _indicesMedicines: MutableSet<TableInfo.Index> = mutableSetOf()
        val _infoMedicines: TableInfo = TableInfo("medicines", _columnsMedicines,
            _foreignKeysMedicines, _indicesMedicines)
        val _existingMedicines: TableInfo = read(connection, "medicines")
        if (!_infoMedicines.equals(_existingMedicines)) {
          return RoomOpenDelegate.ValidationResult(false, """
              |medicines(com.example.myapplication1.data.entity.MedicineEntity).
              | Expected:
              |""".trimMargin() + _infoMedicines + """
              |
              | Found:
              |""".trimMargin() + _existingMedicines)
        }
        val _columnsAdherenceLogs: MutableMap<String, TableInfo.Column> = mutableMapOf()
        _columnsAdherenceLogs.put("id", TableInfo.Column("id", "INTEGER", true, 1, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsAdherenceLogs.put("medicineId", TableInfo.Column("medicineId", "INTEGER", true, 0,
            null, TableInfo.CREATED_FROM_ENTITY))
        _columnsAdherenceLogs.put("medicineName", TableInfo.Column("medicineName", "TEXT", true, 0,
            null, TableInfo.CREATED_FROM_ENTITY))
        _columnsAdherenceLogs.put("dosage", TableInfo.Column("dosage", "TEXT", true, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsAdherenceLogs.put("scheduledTime", TableInfo.Column("scheduledTime", "TEXT", true,
            0, null, TableInfo.CREATED_FROM_ENTITY))
        _columnsAdherenceLogs.put("dateString", TableInfo.Column("dateString", "TEXT", true, 0,
            null, TableInfo.CREATED_FROM_ENTITY))
        _columnsAdherenceLogs.put("actionTimestamp", TableInfo.Column("actionTimestamp", "INTEGER",
            true, 0, null, TableInfo.CREATED_FROM_ENTITY))
        _columnsAdherenceLogs.put("status", TableInfo.Column("status", "TEXT", true, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        _columnsAdherenceLogs.put("notes", TableInfo.Column("notes", "TEXT", false, 0, null,
            TableInfo.CREATED_FROM_ENTITY))
        val _foreignKeysAdherenceLogs: MutableSet<TableInfo.ForeignKey> = mutableSetOf()
        val _indicesAdherenceLogs: MutableSet<TableInfo.Index> = mutableSetOf()
        _indicesAdherenceLogs.add(TableInfo.Index("index_adherence_logs_medicineId", false,
            listOf("medicineId"), listOf("ASC")))
        _indicesAdherenceLogs.add(TableInfo.Index("index_adherence_logs_dateString", false,
            listOf("dateString"), listOf("ASC")))
        _indicesAdherenceLogs.add(TableInfo.Index("index_adherence_logs_actionTimestamp", false,
            listOf("actionTimestamp"), listOf("ASC")))
        val _infoAdherenceLogs: TableInfo = TableInfo("adherence_logs", _columnsAdherenceLogs,
            _foreignKeysAdherenceLogs, _indicesAdherenceLogs)
        val _existingAdherenceLogs: TableInfo = read(connection, "adherence_logs")
        if (!_infoAdherenceLogs.equals(_existingAdherenceLogs)) {
          return RoomOpenDelegate.ValidationResult(false, """
              |adherence_logs(com.example.myapplication1.data.entity.AdherenceLogEntity).
              | Expected:
              |""".trimMargin() + _infoAdherenceLogs + """
              |
              | Found:
              |""".trimMargin() + _existingAdherenceLogs)
        }
        return RoomOpenDelegate.ValidationResult(true, null)
      }
    }
    return _openDelegate
  }

  protected override fun createInvalidationTracker(): InvalidationTracker {
    val _shadowTablesMap: MutableMap<String, String> = mutableMapOf()
    val _viewTables: MutableMap<String, Set<String>> = mutableMapOf()
    return InvalidationTracker(this, _shadowTablesMap, _viewTables, "medicines", "adherence_logs")
  }

  public override fun clearAllTables() {
    super.performClear(false, "medicines", "adherence_logs")
  }

  protected override fun getRequiredTypeConverterClasses(): Map<KClass<*>, List<KClass<*>>> {
    val _typeConvertersMap: MutableMap<KClass<*>, List<KClass<*>>> = mutableMapOf()
    _typeConvertersMap.put(MedicineDao::class, MedicineDao_Impl.getRequiredConverters())
    _typeConvertersMap.put(AdherenceDao::class, AdherenceDao_Impl.getRequiredConverters())
    return _typeConvertersMap
  }

  public override fun getRequiredAutoMigrationSpecClasses(): Set<KClass<out AutoMigrationSpec>> {
    val _autoMigrationSpecsSet: MutableSet<KClass<out AutoMigrationSpec>> = mutableSetOf()
    return _autoMigrationSpecsSet
  }

  public override
      fun createAutoMigrations(autoMigrationSpecs: Map<KClass<out AutoMigrationSpec>, AutoMigrationSpec>):
      List<Migration> {
    val _autoMigrations: MutableList<Migration> = mutableListOf()
    return _autoMigrations
  }

  public override fun medicineDao(): MedicineDao = _medicineDao.value

  public override fun adherenceDao(): AdherenceDao = _adherenceDao.value
}
