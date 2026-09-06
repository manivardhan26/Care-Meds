package com.example.myapplication1.`data`.dao

import androidx.room.EntityDeleteOrUpdateAdapter
import androidx.room.EntityInsertAdapter
import androidx.room.RoomDatabase
import androidx.room.coroutines.createFlow
import androidx.room.util.getColumnIndexOrThrow
import androidx.room.util.performSuspending
import androidx.sqlite.SQLiteStatement
import com.example.myapplication1.`data`.entity.MedicineEntity
import javax.`annotation`.processing.Generated
import kotlin.Boolean
import kotlin.Int
import kotlin.Long
import kotlin.String
import kotlin.Suppress
import kotlin.Unit
import kotlin.collections.List
import kotlin.collections.MutableList
import kotlin.collections.mutableListOf
import kotlin.reflect.KClass
import kotlinx.coroutines.flow.Flow

@Generated(value = ["androidx.room.RoomProcessor"])
@Suppress(names = ["UNCHECKED_CAST", "DEPRECATION", "REDUNDANT_PROJECTION", "REMOVAL"])
public class MedicineDao_Impl(
  __db: RoomDatabase,
) : MedicineDao {
  private val __db: RoomDatabase

  private val __insertAdapterOfMedicineEntity: EntityInsertAdapter<MedicineEntity>

  private val __deleteAdapterOfMedicineEntity: EntityDeleteOrUpdateAdapter<MedicineEntity>

  private val __updateAdapterOfMedicineEntity: EntityDeleteOrUpdateAdapter<MedicineEntity>
  init {
    this.__db = __db
    this.__insertAdapterOfMedicineEntity = object : EntityInsertAdapter<MedicineEntity>() {
      protected override fun createQuery(): String =
          "INSERT OR REPLACE INTO `medicines` (`id`,`name`,`dosage`,`instructions`,`notes`,`expiryDate`,`frequency`,`timeOfDay`,`reminderTime`,`imageUri`,`supplyCount`,`isLowSupply`,`createdAt`) VALUES (nullif(?, 0),?,?,?,?,?,?,?,?,?,?,?,?)"

      protected override fun bind(statement: SQLiteStatement, entity: MedicineEntity) {
        statement.bindLong(1, entity.id)
        statement.bindText(2, entity.name)
        statement.bindText(3, entity.dosage)
        statement.bindText(4, entity.instructions)
        statement.bindText(5, entity.notes)
        statement.bindText(6, entity.expiryDate)
        statement.bindText(7, entity.frequency)
        statement.bindText(8, entity.timeOfDay)
        statement.bindText(9, entity.reminderTime)
        val _tmpImageUri: String? = entity.imageUri
        if (_tmpImageUri == null) {
          statement.bindNull(10)
        } else {
          statement.bindText(10, _tmpImageUri)
        }
        statement.bindLong(11, entity.supplyCount.toLong())
        val _tmp: Int = if (entity.isLowSupply) 1 else 0
        statement.bindLong(12, _tmp.toLong())
        statement.bindLong(13, entity.createdAt)
      }
    }
    this.__deleteAdapterOfMedicineEntity = object : EntityDeleteOrUpdateAdapter<MedicineEntity>() {
      protected override fun createQuery(): String = "DELETE FROM `medicines` WHERE `id` = ?"

      protected override fun bind(statement: SQLiteStatement, entity: MedicineEntity) {
        statement.bindLong(1, entity.id)
      }
    }
    this.__updateAdapterOfMedicineEntity = object : EntityDeleteOrUpdateAdapter<MedicineEntity>() {
      protected override fun createQuery(): String =
          "UPDATE OR ABORT `medicines` SET `id` = ?,`name` = ?,`dosage` = ?,`instructions` = ?,`notes` = ?,`expiryDate` = ?,`frequency` = ?,`timeOfDay` = ?,`reminderTime` = ?,`imageUri` = ?,`supplyCount` = ?,`isLowSupply` = ?,`createdAt` = ? WHERE `id` = ?"

      protected override fun bind(statement: SQLiteStatement, entity: MedicineEntity) {
        statement.bindLong(1, entity.id)
        statement.bindText(2, entity.name)
        statement.bindText(3, entity.dosage)
        statement.bindText(4, entity.instructions)
        statement.bindText(5, entity.notes)
        statement.bindText(6, entity.expiryDate)
        statement.bindText(7, entity.frequency)
        statement.bindText(8, entity.timeOfDay)
        statement.bindText(9, entity.reminderTime)
        val _tmpImageUri: String? = entity.imageUri
        if (_tmpImageUri == null) {
          statement.bindNull(10)
        } else {
          statement.bindText(10, _tmpImageUri)
        }
        statement.bindLong(11, entity.supplyCount.toLong())
        val _tmp: Int = if (entity.isLowSupply) 1 else 0
        statement.bindLong(12, _tmp.toLong())
        statement.bindLong(13, entity.createdAt)
        statement.bindLong(14, entity.id)
      }
    }
  }

  public override suspend fun insertMedicine(medicine: MedicineEntity): Long =
      performSuspending(__db, false, true) { _connection ->
    val _result: Long = __insertAdapterOfMedicineEntity.insertAndReturnId(_connection, medicine)
    _result
  }

  public override suspend fun deleteMedicine(medicine: MedicineEntity): Unit =
      performSuspending(__db, false, true) { _connection ->
    __deleteAdapterOfMedicineEntity.handle(_connection, medicine)
  }

  public override suspend fun updateMedicine(medicine: MedicineEntity): Unit =
      performSuspending(__db, false, true) { _connection ->
    __updateAdapterOfMedicineEntity.handle(_connection, medicine)
  }

  public override fun getAllMedicines(): Flow<List<MedicineEntity>> {
    val _sql: String = "SELECT * FROM medicines ORDER BY name ASC"
    return createFlow(__db, false, arrayOf("medicines")) { _connection ->
      val _stmt: SQLiteStatement = _connection.prepare(_sql)
      try {
        val _columnIndexOfId: Int = getColumnIndexOrThrow(_stmt, "id")
        val _columnIndexOfName: Int = getColumnIndexOrThrow(_stmt, "name")
        val _columnIndexOfDosage: Int = getColumnIndexOrThrow(_stmt, "dosage")
        val _columnIndexOfInstructions: Int = getColumnIndexOrThrow(_stmt, "instructions")
        val _columnIndexOfNotes: Int = getColumnIndexOrThrow(_stmt, "notes")
        val _columnIndexOfExpiryDate: Int = getColumnIndexOrThrow(_stmt, "expiryDate")
        val _columnIndexOfFrequency: Int = getColumnIndexOrThrow(_stmt, "frequency")
        val _columnIndexOfTimeOfDay: Int = getColumnIndexOrThrow(_stmt, "timeOfDay")
        val _columnIndexOfReminderTime: Int = getColumnIndexOrThrow(_stmt, "reminderTime")
        val _columnIndexOfImageUri: Int = getColumnIndexOrThrow(_stmt, "imageUri")
        val _columnIndexOfSupplyCount: Int = getColumnIndexOrThrow(_stmt, "supplyCount")
        val _columnIndexOfIsLowSupply: Int = getColumnIndexOrThrow(_stmt, "isLowSupply")
        val _columnIndexOfCreatedAt: Int = getColumnIndexOrThrow(_stmt, "createdAt")
        val _result: MutableList<MedicineEntity> = mutableListOf()
        while (_stmt.step()) {
          val _item: MedicineEntity
          val _tmpId: Long
          _tmpId = _stmt.getLong(_columnIndexOfId)
          val _tmpName: String
          _tmpName = _stmt.getText(_columnIndexOfName)
          val _tmpDosage: String
          _tmpDosage = _stmt.getText(_columnIndexOfDosage)
          val _tmpInstructions: String
          _tmpInstructions = _stmt.getText(_columnIndexOfInstructions)
          val _tmpNotes: String
          _tmpNotes = _stmt.getText(_columnIndexOfNotes)
          val _tmpExpiryDate: String
          _tmpExpiryDate = _stmt.getText(_columnIndexOfExpiryDate)
          val _tmpFrequency: String
          _tmpFrequency = _stmt.getText(_columnIndexOfFrequency)
          val _tmpTimeOfDay: String
          _tmpTimeOfDay = _stmt.getText(_columnIndexOfTimeOfDay)
          val _tmpReminderTime: String
          _tmpReminderTime = _stmt.getText(_columnIndexOfReminderTime)
          val _tmpImageUri: String?
          if (_stmt.isNull(_columnIndexOfImageUri)) {
            _tmpImageUri = null
          } else {
            _tmpImageUri = _stmt.getText(_columnIndexOfImageUri)
          }
          val _tmpSupplyCount: Int
          _tmpSupplyCount = _stmt.getLong(_columnIndexOfSupplyCount).toInt()
          val _tmpIsLowSupply: Boolean
          val _tmp: Int
          _tmp = _stmt.getLong(_columnIndexOfIsLowSupply).toInt()
          _tmpIsLowSupply = _tmp != 0
          val _tmpCreatedAt: Long
          _tmpCreatedAt = _stmt.getLong(_columnIndexOfCreatedAt)
          _item =
              MedicineEntity(_tmpId,_tmpName,_tmpDosage,_tmpInstructions,_tmpNotes,_tmpExpiryDate,_tmpFrequency,_tmpTimeOfDay,_tmpReminderTime,_tmpImageUri,_tmpSupplyCount,_tmpIsLowSupply,_tmpCreatedAt)
          _result.add(_item)
        }
        _result
      } finally {
        _stmt.close()
      }
    }
  }

  public override suspend fun getMedicineById(id: Long): MedicineEntity? {
    val _sql: String = "SELECT * FROM medicines WHERE id = ?"
    return performSuspending(__db, true, false) { _connection ->
      val _stmt: SQLiteStatement = _connection.prepare(_sql)
      try {
        var _argIndex: Int = 1
        _stmt.bindLong(_argIndex, id)
        val _columnIndexOfId: Int = getColumnIndexOrThrow(_stmt, "id")
        val _columnIndexOfName: Int = getColumnIndexOrThrow(_stmt, "name")
        val _columnIndexOfDosage: Int = getColumnIndexOrThrow(_stmt, "dosage")
        val _columnIndexOfInstructions: Int = getColumnIndexOrThrow(_stmt, "instructions")
        val _columnIndexOfNotes: Int = getColumnIndexOrThrow(_stmt, "notes")
        val _columnIndexOfExpiryDate: Int = getColumnIndexOrThrow(_stmt, "expiryDate")
        val _columnIndexOfFrequency: Int = getColumnIndexOrThrow(_stmt, "frequency")
        val _columnIndexOfTimeOfDay: Int = getColumnIndexOrThrow(_stmt, "timeOfDay")
        val _columnIndexOfReminderTime: Int = getColumnIndexOrThrow(_stmt, "reminderTime")
        val _columnIndexOfImageUri: Int = getColumnIndexOrThrow(_stmt, "imageUri")
        val _columnIndexOfSupplyCount: Int = getColumnIndexOrThrow(_stmt, "supplyCount")
        val _columnIndexOfIsLowSupply: Int = getColumnIndexOrThrow(_stmt, "isLowSupply")
        val _columnIndexOfCreatedAt: Int = getColumnIndexOrThrow(_stmt, "createdAt")
        val _result: MedicineEntity?
        if (_stmt.step()) {
          val _tmpId: Long
          _tmpId = _stmt.getLong(_columnIndexOfId)
          val _tmpName: String
          _tmpName = _stmt.getText(_columnIndexOfName)
          val _tmpDosage: String
          _tmpDosage = _stmt.getText(_columnIndexOfDosage)
          val _tmpInstructions: String
          _tmpInstructions = _stmt.getText(_columnIndexOfInstructions)
          val _tmpNotes: String
          _tmpNotes = _stmt.getText(_columnIndexOfNotes)
          val _tmpExpiryDate: String
          _tmpExpiryDate = _stmt.getText(_columnIndexOfExpiryDate)
          val _tmpFrequency: String
          _tmpFrequency = _stmt.getText(_columnIndexOfFrequency)
          val _tmpTimeOfDay: String
          _tmpTimeOfDay = _stmt.getText(_columnIndexOfTimeOfDay)
          val _tmpReminderTime: String
          _tmpReminderTime = _stmt.getText(_columnIndexOfReminderTime)
          val _tmpImageUri: String?
          if (_stmt.isNull(_columnIndexOfImageUri)) {
            _tmpImageUri = null
          } else {
            _tmpImageUri = _stmt.getText(_columnIndexOfImageUri)
          }
          val _tmpSupplyCount: Int
          _tmpSupplyCount = _stmt.getLong(_columnIndexOfSupplyCount).toInt()
          val _tmpIsLowSupply: Boolean
          val _tmp: Int
          _tmp = _stmt.getLong(_columnIndexOfIsLowSupply).toInt()
          _tmpIsLowSupply = _tmp != 0
          val _tmpCreatedAt: Long
          _tmpCreatedAt = _stmt.getLong(_columnIndexOfCreatedAt)
          _result =
              MedicineEntity(_tmpId,_tmpName,_tmpDosage,_tmpInstructions,_tmpNotes,_tmpExpiryDate,_tmpFrequency,_tmpTimeOfDay,_tmpReminderTime,_tmpImageUri,_tmpSupplyCount,_tmpIsLowSupply,_tmpCreatedAt)
        } else {
          _result = null
        }
        _result
      } finally {
        _stmt.close()
      }
    }
  }

  public override suspend fun deleteMedicineById(id: Long) {
    val _sql: String = "DELETE FROM medicines WHERE id = ?"
    return performSuspending(__db, false, true) { _connection ->
      val _stmt: SQLiteStatement = _connection.prepare(_sql)
      try {
        var _argIndex: Int = 1
        _stmt.bindLong(_argIndex, id)
        _stmt.step()
      } finally {
        _stmt.close()
      }
    }
  }

  public override suspend fun decrementSupply(id: Long) {
    val _sql: String =
        "UPDATE medicines SET supplyCount = CASE WHEN supplyCount > 0 THEN supplyCount - 1 ELSE 0 END WHERE id = ?"
    return performSuspending(__db, false, true) { _connection ->
      val _stmt: SQLiteStatement = _connection.prepare(_sql)
      try {
        var _argIndex: Int = 1
        _stmt.bindLong(_argIndex, id)
        _stmt.step()
      } finally {
        _stmt.close()
      }
    }
  }

  public companion object {
    public fun getRequiredConverters(): List<KClass<*>> = emptyList()
  }
}
