package com.example.myapplication1.data.util

import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

enum class ExpiryState {
    SAFE,
    EXPIRING_SOON,
    EXPIRED,
    UNKNOWN
}

data class ExpiryStatus(
    val state: ExpiryState,
    val message: String,
    val daysRemaining: Long? = null,
    val isAlert: Boolean = false
)

object ExpirySafetyEvaluator {

    private val supportedFormats = listOf(
        SimpleDateFormat("yyyy-MM-dd", Locale.US),
        SimpleDateFormat("MM/yyyy", Locale.US),
        SimpleDateFormat("MM-yyyy", Locale.US),
        SimpleDateFormat("dd/MM/yyyy", Locale.US),
        SimpleDateFormat("MM/dd/yyyy", Locale.US),
        SimpleDateFormat("yyyy/MM/dd", Locale.US),
        SimpleDateFormat("MMM yyyy", Locale.US),
        SimpleDateFormat("MM/yy", Locale.US)
    )

    fun evaluate(expiryDateString: String?): ExpiryStatus {
        if (expiryDateString.isNullOrBlank()) {
            return ExpiryStatus(
                state = ExpiryState.UNKNOWN,
                message = "Expiry date not set",
                isAlert = false
            )
        }

        val trimmed = expiryDateString.trim()
        val parsedDate = parseDate(trimmed)

        if (parsedDate == null) {
            return ExpiryStatus(
                state = ExpiryState.UNKNOWN,
                message = "Expires: $trimmed",
                isAlert = false
            )
        }

        // Set comparison to end of the month/day
        val expiryCal = Calendar.getInstance().apply {
            time = parsedDate
            set(Calendar.HOUR_OF_DAY, 23)
            set(Calendar.MINUTE, 59)
            set(Calendar.SECOND, 59)
            set(Calendar.MILLISECOND, 999)
        }

        val now = Calendar.getInstance()
        val diffMillis = expiryCal.timeInMillis - now.timeInMillis
        val daysRemaining = diffMillis / (1000 * 60 * 60 * 24)

        return when {
            diffMillis < 0 -> {
                ExpiryStatus(
                    state = ExpiryState.EXPIRED,
                    message = "This medicine has expired. Please do not consume it.",
                    daysRemaining = daysRemaining,
                    isAlert = true
                )
            }
            daysRemaining <= 30 -> {
                val dayStr = if (daysRemaining == 1L) "1 day" else "$daysRemaining days"
                ExpiryStatus(
                    state = ExpiryState.EXPIRING_SOON,
                    message = "Warning: Expires soon in $dayStr. Plan a refill.",
                    daysRemaining = daysRemaining,
                    isAlert = true
                )
            }
            else -> {
                ExpiryStatus(
                    state = ExpiryState.SAFE,
                    message = "Valid (Expires in $daysRemaining days)",
                    daysRemaining = daysRemaining,
                    isAlert = false
                )
            }
        }
    }

    private fun parseDate(dateStr: String): Date? {
        for (format in supportedFormats) {
            try {
                format.isLenient = false
                val parsed = format.parse(dateStr)
                if (parsed != null) {
                    // For MM/yyyy, make it the last day of that month
                    if (format.toPattern() == "MM/yyyy" || format.toPattern() == "MM-yyyy" || format.toPattern() == "MMM yyyy" || format.toPattern() == "MM/yy") {
                        val cal = Calendar.getInstance()
                        cal.time = parsed
                        cal.set(Calendar.DAY_OF_MONTH, cal.getActualMaximum(Calendar.DAY_OF_MONTH))
                        return cal.time
                    }
                    return parsed
                }
            } catch (_: Exception) {
                // Try next format
            }
        }
        return null
    }
}
