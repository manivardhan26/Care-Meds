package com.example.myapplication1

import com.example.myapplication1.data.entity.AdherenceLogEntity
import com.example.myapplication1.data.entity.MedicineEntity
import com.example.myapplication1.data.util.ExpirySafetyEvaluator
import com.example.myapplication1.data.util.ExpiryState
import com.example.myapplication1.data.util.OcrParser
import org.junit.Assert.*
import org.junit.Test
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

class CareMedsUnitTest {

    @Test
    fun testExpirySafetyEvaluator_expiredMedicine() {
        // Date well in the past
        val result = ExpirySafetyEvaluator.evaluate("2020-01-01")
        assertEquals(ExpiryState.EXPIRED, result.state)
        assertEquals("This medicine has expired. Please do not consume it.", result.message)
        assertTrue(result.isAlert)
    }

    @Test
    fun testExpirySafetyEvaluator_safeMedicine() {
        // Date well in the future
        val cal = Calendar.getInstance()
        cal.add(Calendar.YEAR, 2)
        val futureStr = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(cal.time)

        val result = ExpirySafetyEvaluator.evaluate(futureStr)
        assertEquals(ExpiryState.SAFE, result.state)
        assertFalse(result.isAlert)
        assertTrue(result.daysRemaining != null && result.daysRemaining!! > 30)
    }

    @Test
    fun testExpirySafetyEvaluator_expiringSoonMedicine() {
        // Date 10 days in future
        val cal = Calendar.getInstance()
        cal.add(Calendar.DAY_OF_YEAR, 10)
        val soonStr = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(cal.time)

        val result = ExpirySafetyEvaluator.evaluate(soonStr)
        assertEquals(ExpiryState.EXPIRING_SOON, result.state)
        assertTrue(result.isAlert)
    }

    @Test
    fun testExpirySafetyEvaluator_monthYearFormat() {
        val resultPast = ExpirySafetyEvaluator.evaluate("01/2020")
        assertEquals(ExpiryState.EXPIRED, resultPast.state)
        assertEquals("This medicine has expired. Please do not consume it.", resultPast.message)
    }

    @Test
    fun testOcrParser_extractsDetails() {
        val sampleText = """
            Rx METFORMIN HYDROCHLORIDE
            500MG TABLETS
            Take 1 tablet daily with morning meal
            EXP: 12/2028
        """.trimIndent()

        val parsed = OcrParser.parseOcrText(sampleText)
        assertTrue(parsed.name.contains("Metformin", ignoreCase = true))
        assertTrue(parsed.dosage.contains("500", ignoreCase = true))
        assertTrue(parsed.instructions.isNotBlank())
        assertEquals("12/2028", parsed.expiryDate)
    }

    @Test
    fun testMedicineEntity_defaultValues() {
        val med = MedicineEntity(
            name = "Aspirin",
            dosage = "81mg",
            expiryDate = "2027-05-01"
        )
        assertEquals("08:00 AM", med.reminderTime)
        assertEquals("Once daily", med.frequency)
        assertEquals("Morning", med.timeOfDay)
        assertEquals(30, med.supplyCount)
    }

    @Test
    fun testAdherenceLogEntity_creation() {
        val log = AdherenceLogEntity(
            medicineId = 1L,
            medicineName = "Aspirin",
            dosage = "81mg",
            scheduledTime = "08:00 AM",
            dateString = "2026-09-06",
            status = "TAKEN"
        )
        assertEquals("TAKEN", log.status)
        assertEquals("Aspirin", log.medicineName)
        assertEquals("2026-09-06", log.dateString)
    }
}
