package com.example.myapplication1.`data`.dao

import androidx.room.EntityDeleteOrUpdateAdapter
import androidx.room.EntityInsertAdapter
import androidx.room.RoomDatabase
import androidx.room.coroutines.createFlow
import androidx.room.util.getColumnIndexOrThrow
import androidx.room.util.performSuspending
import androidx.sqlite.SQLiteStatement
import com.example.myapplication1.`data`.entity.AdherenceLogEntity
import javax.`annotation`.processing.Generated
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
public class AdherenceDao_Impl(
  __db: RoomDatabase,
) : AdherenceDao {
  private val __db: RoomDatabase

  private val __insertAdapterOfAdherenceLogEntity: EntityInsertAdapter<AdherenceLogEntity>

  private val __updateAdapterOfAdherenceLogEntity: EntityDeleteOrUpdateAdapter<AdherenceLogEntity>
  init {
    this.__db = __db
    this.__insertAdapterOfAdherenceLogEntity = object : EntityInsertAdapter<AdherenceLogEntity>() {
      protected override fun createQuery(): String =
          "INSERT OR REPLACE INTO `adherence_logs` (`id`,`medicineId`,`medicineName`,`dosage`,`scheduledTime`,`dateString`,`actionTimestamp`,`status`,`notes`) VALUES (nullif(?, 0),?,?,?,?,?,?,?,?)"

      protected override fun bind(statement: SQLiteStatement, entity: AdherenceLogEntity) {
        statement.bindLong(1, entity.id)
        statement.bindLong(2, entity.medicineId)
        statement.bindText(3, entity.medicineName)
        statement.bindText(4, entity.dosage)
        statement.bindText(5, entity.scheduledTime)
        statement.bindText(6, entity.dateString)
        statement.bindLong(7, entity.actionTimestamp)
        statement.bindText(8, entity.status)
        val _tmpNotes: String? = entity.notes
        if (_tmpNotes == null) {
          statement.bindNull(9)
        } else {
          statement.bindText(9, _tmpNotes)
        }
      }
    }
    this.__updateAdapterOfAdherenceLogEntity = object :
        EntityDeleteOrUpdateAdapter<AdherenceLogEntity>() {
      protected override fun createQuery(): String =
          "UPDATE OR ABORT `adherence_logs` SET `id` = ?,`medicineId` = ?,`medicineName` = ?,`dosage` = ?,`scheduledTime` = ?,`dateString` = ?,`actionTimestamp` = ?,`status` = ?,`notes` = ? WHERE `id` = ?"

      protected override fun bind(statement: SQLiteStatement, entity: AdherenceLogEntity) {
        statement.bindLong(1, entity.id)
        statement.bindLong(2, entity.medicineId)
        statement.bindText(3, entity.medicineName)
        statement.bindText(4, entity.dosage)
        statement.bindText(5, entity.scheduledTime)
        statement.bindText(6, entity.dateString)
        statement.bindLong(7, entity.actionTimestamp)
        statement.bindText(8, entity.status)
        val _tmpNotes: String? = entity.notes
        if (_tmpNotes == null) {
          statement.bindNull(9)
        } else {
          statement.bindText(9, _tmpNotes)
        }
        statement.bindLong(10, entity.id)
      }
    }
  }

  public override suspend fun insertLog(log: AdherenceLogEntity): Long = performSuspending(__db,
      false, true) { _connection ->
    val _result: Long = __insertAdapterOfAdherenceLogEntity.insertAndReturnId(_connection, log)
    _result
  }

  public override suspend fun updateLog(log: AdherenceLogEntity): Unit = performSuspending(__db,
      false, true) { _connection ->
    __updateAdapterOfAdherenceLogEntity.handle(_connection, log)
  }

  public override fun getAllLogs(): Flow<List<AdherenceLogEntity>> {
    val _sql: String = "SELECT * FROM adherence_logs ORDER BY actionTimestamp DESC"
    return createFlow(__db, false, arrayOf("adherence_logs")) { _connection ->
      val _stmt: SQLiteStatement = _connection.prepare(_sql)
      try {
        val _columnIndexOfId: Int = getColumnIndexOrThrow(_stmt, "id")
        val _columnIndexOfMedicineId: Int = getColumnIndexOrThrow(_stmt, "medicineId")
        val _columnIndexOfMedicineName: Int = getColumnIndexOrThrow(_stmt, "medicineName")
        val _columnIndexOfDosage: Int = getColumnIndexOrThrow(_stmt, "dosage")
        val _columnIndexOfScheduledTime: Int = getColumnIndexOrThrow(_stmt, "scheduledTime")
        val _columnIndexOfDateString: Int = getColumnIndexOrThrow(_stmt, "dateString")
        val _columnIndexOfActionTimestamp: Int = getColumnIndexOrThrow(_stmt, "actionTimestamp")
        val _columnIndexOfStatus: Int = getColumnIndexOrThrow(_stmt, "status")
        val _columnIndexOfNotes: Int = getColumnIndexOrThrow(_stmt, "notes")
        val _result: MutableList<AdherenceLogEntity> = mutableListOf()
        while (_stmt.step()) {
          val _item: AdherenceLogEntity
          val _tmpId: Long
          _tmpId = _stmt.getLong(_columnIndexOfId)
          val _tmpMedicineId: Long
          _tmpMedicineId = _stmt.getLong(_columnIndexOfMedicineId)
          val _tmpMedicineName: String
          _tmpMedicineName = _stmt.getText(_columnIndexOfMedicineName)
          val _tmpDosage: String
          _tmpDosage = _stmt.getText(_columnIndexOfDosage)
          val _tmpScheduledTime: String
          _tmpScheduledTime = _stmt.getText(_columnIndexOfScheduledTime)
          val _tmpDateString: String
          _tmpDateString = _stmt.getText(_columnIndexOfDateString)
          val _tmpActionTimestamp: Long
          _tmpActionTimestamp = _stmt.getLong(_columnIndexOfActionTimestamp)
          val _tmpStatus: String
          _tmpStatus = _stmt.getText(_columnIndexOfStatus)
          val _tmpNotes: String?
          if (_stmt.isNull(_columnIndexOfNotes)) {
            _tmpNotes = null
          } else {
            _tmpNotes = _stmt.getText(_columnIndexOfNotes)
          }
          _item =
              AdherenceLogEntity(_tmpId,_tmpMedicineId,_tmpMedicineName,_tmpDosage,_tmpScheduledTime,_tmpDateString,_tmpActionTimestamp,_tmpStatus,_tmpNotes)
          _result.add(_item)
        }
        _result
      } finally {
        _stmt.close()
      }
    }
  }

  public override fun getLogsForDate(dateString: String): Flow<List<AdherenceLogEntity>> {
    val _sql: String =
        "SELECT * FROM adherence_logs WHERE dateString = ? ORDER BY scheduledTime ASC"
    return createFlow(__db, false, arrayOf("adherence_logs")) { _connection ->
      val _stmt: SQLiteStatement = _connection.prepare(_sql)
      try {
        var _argIndex: Int = 1
        _stmt.bindText(_argIndex, dateString)
        val _columnIndexOfId: Int = getColumnIndexOrThrow(_stmt, "id")
        val _columnIndexOfMedicineId: Int = getColumnIndexOrThrow(_stmt, "medicineId")
        val _columnIndexOfMedicineName: Int = getColumnIndexOrThrow(_stmt, "medicineName")
        val _columnIndexOfDosage: Int = getColumnIndexOrThrow(_stmt, "dosage")
        val _columnIndexOfScheduledTime: Int = getColumnIndexOrThrow(_stmt, "scheduledTime")
        val _columnIndexOfDateString: Int = getColumnIndexOrThrow(_stmt, "dateString")
        val _columnIndexOfActionTimestamp: Int = getColumnIndexOrThrow(_stmt, "actionTimestamp")
        val _columnIndexOfStatus: Int = getColumnIndexOrThrow(_stmt, "status")
        val _columnIndexOfNotes: Int = getColumnIndexOrThrow(_stmt, "notes")
        val _result: MutableList<AdherenceLogEntity> = mutableListOf()
        while (_stmt.step()) {
          val _item: AdherenceLogEntity
          val _tmpId: Long
          _tmpId = _stmt.getLong(_columnIndexOfId)
          val _tmpMedicineId: Long
          _tmpMedicineId = _stmt.getLong(_columnIndexOfMedicineId)
          val _tmpMedicineName: String
          _tmpMedicineName = _stmt.getText(_columnIndexOfMedicineName)
          val _tmpDosage: String
          _tmpDosage = _stmt.getText(_columnIndexOfDosage)
          val _tmpScheduledTime: String
          _tmpScheduledTime = _stmt.getText(_columnIndexOfScheduledTime)
          val _tmpDateString: String
          _tmpDateString = _stmt.getText(_columnIndexOfDateString)
          val _tmpActionTimestamp: Long
          _tmpActionTimestamp = _stmt.getLong(_columnIndexOfActionTimestamp)
          val _tmpStatus: String
          _tmpStatus = _stmt.getText(_columnIndexOfStatus)
          val _tmpNotes: String?
          if (_stmt.isNull(_columnIndexOfNotes)) {
            _tmpNotes = null
          } else {
            _tmpNotes = _stmt.getText(_columnIndexOfNotes)
          }
          _item =
              AdherenceLogEntity(_tmpId,_tmpMedicineId,_tmpMedicineName,_tmpDosage,_tmpScheduledTime,_tmpDateString,_tmpActionTimestamp,_tmpStatus,_tmpNotes)
          _result.add(_item)
        }
        _result
      } finally {
        _stmt.close()
      }
    }
  }

  public override fun getLogsForMedicine(medicineId: Long): Flow<List<AdherenceLogEntity>> {
    val _sql: String =
        "SELECT * FROM adherence_logs WHERE medicineId = ? ORDER BY actionTimestamp DESC"
    return createFlow(__db, false, arrayOf("adherence_logs")) { _connection ->
      val _stmt: SQLiteStatement = _connection.prepare(_sql)
      try {
        var _argIndex: Int = 1
        _stmt.bindLong(_argIndex, medicineId)
        val _columnIndexOfId: Int = getColumnIndexOrThrow(_stmt, "id")
        val _columnIndexOfMedicineId: Int = getColumnIndexOrThrow(_stmt, "medicineId")
        val _columnIndexOfMedicineName: Int = getColumnIndexOrThrow(_stmt, "medicineName")
        val _columnIndexOfDosage: Int = getColumnIndexOrThrow(_stmt, "dosage")
        val _columnIndexOfScheduledTime: Int = getColumnIndexOrThrow(_stmt, "scheduledTime")
        val _columnIndexOfDateString: Int = getColumnIndexOrThrow(_stmt, "dateString")
        val _columnIndexOfActionTimestamp: Int = getColumnIndexOrThrow(_stmt, "actionTimestamp")
        val _columnIndexOfStatus: Int = getColumnIndexOrThrow(_stmt, "status")
        val _columnIndexOfNotes: Int = getColumnIndexOrThrow(_stmt, "notes")
        val _result: MutableList<AdherenceLogEntity> = mutableListOf()
        while (_stmt.step()) {
          val _item: AdherenceLogEntity
          val _tmpId: Long
          _tmpId = _stmt.getLong(_columnIndexOfId)
          val _tmpMedicineId: Long
          _tmpMedicineId = _stmt.getLong(_columnIndexOfMedicineId)
          val _tmpMedicineName: String
          _tmpMedicineName = _stmt.getText(_columnIndexOfMedicineName)
          val _tmpDosage: String
          _tmpDosage = _stmt.getText(_columnIndexOfDosage)
          val _tmpScheduledTime: String
          _tmpScheduledTime = _stmt.getText(_columnIndexOfScheduledTime)
          val _tmpDateString: String
          _tmpDateString = _stmt.getText(_columnIndexOfDateString)
          val _tmpActionTimestamp: Long
          _tmpActionTimestamp = _stmt.getLong(_columnIndexOfActionTimestamp)
          val _tmpStatus: String
          _tmpStatus = _stmt.getText(_columnIndexOfStatus)
          val _tmpNotes: String?
          if (_stmt.isNull(_columnIndexOfNotes)) {
            _tmpNotes = null
          } else {
            _tmpNotes = _stmt.getText(_columnIndexOfNotes)
          }
          _item =
              AdherenceLogEntity(_tmpId,_tmpMedicineId,_tmpMedicineName,_tmpDosage,_tmpScheduledTime,_tmpDateString,_tmpActionTimestamp,_tmpStatus,_tmpNotes)
          _result.add(_item)
        }
        _result
      } finally {
        _stmt.close()
      }
    }
  }

  public override suspend fun getLogForMedicineAndDate(medicineId: Long, dateString: String):
      AdherenceLogEntity? {
    val _sql: String =
        "SELECT * FROM adherence_logs WHERE medicineId = ? AND dateString = ? LIMIT 1"
    return performSuspending(__db, true, false) { _connection ->
      val _stmt: SQLiteStatement = _connection.prepare(_sql)
      try {
        var _argIndex: Int = 1
        _stmt.bindLong(_argIndex, medicineId)
        _argIndex = 2
        _stmt.bindText(_argIndex, dateString)
        val _columnIndexOfId: Int = getColumnIndexOrThrow(_stmt, "id")
        val _columnIndexOfMedicineId: Int = getColumnIndexOrThrow(_stmt, "medicineId")
        val _columnIndexOfMedicineName: Int = getColumnIndexOrThrow(_stmt, "medicineName")
        val _columnIndexOfDosage: Int = getColumnIndexOrThrow(_stmt, "dosage")
        val _columnIndexOfScheduledTime: Int = getColumnIndexOrThrow(_stmt, "scheduledTime")
        val _columnIndexOfDateString: Int = getColumnIndexOrThrow(_stmt, "dateString")
        val _columnIndexOfActionTimestamp: Int = getColumnIndexOrThrow(_stmt, "actionTimestamp")
        val _columnIndexOfStatus: Int = getColumnIndexOrThrow(_stmt, "status")
        val _columnIndexOfNotes: Int = getColumnIndexOrThrow(_stmt, "notes")
        val _result: AdherenceLogEntity?
        if (_stmt.step()) {
          val _tmpId: Long
          _tmpId = _stmt.getLong(_columnIndexOfId)
          val _tmpMedicineId: Long
          _tmpMedicineId = _stmt.getLong(_columnIndexOfMedicineId)
          val _tmpMedicineName: String
          _tmpMedicineName = _stmt.getText(_columnIndexOfMedicineName)
          val _tmpDosage: String
          _tmpDosage = _stmt.getText(_columnIndexOfDosage)
          val _tmpScheduledTime: String
          _tmpScheduledTime = _stmt.getText(_columnIndexOfScheduledTime)
          val _tmpDateString: String
          _tmpDateString = _stmt.getText(_columnIndexOfDateString)
          val _tmpActionTimestamp: Long
          _tmpActionTimestamp = _stmt.getLong(_columnIndexOfActionTimestamp)
          val _tmpStatus: String
          _tmpStatus = _stmt.getText(_columnIndexOfStatus)
          val _tmpNotes: String?
          if (_stmt.isNull(_columnIndexOfNotes)) {
            _tmpNotes = null
          } else {
            _tmpNotes = _stmt.getText(_columnIndexOfNotes)
          }
          _result =
              AdherenceLogEntity(_tmpId,_tmpMedicineId,_tmpMedicineName,_tmpDosage,_tmpScheduledTime,_tmpDateString,_tmpActionTimestamp,_tmpStatus,_tmpNotes)
        } else {
          _result = null
        }
        _result
      } finally {
        _stmt.close()
      }
    }
  }

  public override suspend fun deleteLogById(id: Long) {
    val _sql: String = "DELETE FROM adherence_logs WHERE id = ?"
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

  public override suspend fun deleteLogsForMedicine(medicineId: Long) {
    val _sql: String = "DELETE FROM adherence_logs WHERE medicineId = ?"
    return performSuspending(__db, false, true) { _connection ->
      val _stmt: SQLiteStatement = _connection.prepare(_sql)
      try {
        var _argIndex: Int = 1
        _stmt.bindLong(_argIndex, medicineId)
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
