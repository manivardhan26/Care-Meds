package com.example.myapplication1.data.util

data class ParsedMedicineInfo(
    val name: String,
    val dosage: String,
    val instructions: String,
    val expiryDate: String,
    val supplyCount: Int = 30
)

object OcrParser {
    val samplePackages = listOf(
        ParsedMedicineInfo(
            name = "Aspirin",
            dosage = "500mg",
            instructions = "Take 1 tablet daily after food",
            expiryDate = "12/2027",
            supplyCount = 30
        ),
        ParsedMedicineInfo(
            name = "Lisinopril",
            dosage = "10mg",
            instructions = "Take 1 tablet in the morning",
            expiryDate = "06/2026",
            supplyCount = 30
        ),
        ParsedMedicineInfo(
            name = "Metformin",
            dosage = "850mg",
            instructions = "Take 1 tablet twice daily with meals",
            expiryDate = "03/2028",
            supplyCount = 60
        ),
        ParsedMedicineInfo(
            name = "Atorvastatin",
            dosage = "20mg",
            instructions = "Take 1 tablet at bedtime",
            expiryDate = "09/2026",
            supplyCount = 30
        )
    )

    fun parseOcrText(rawText: String): ParsedMedicineInfo {
        val lines = rawText.lines().map { it.trim() }.filter { it.isNotBlank() }
        
        var name = "Prescription Medicine"
        var dosage = "100mg"
        var instructions = "Take as directed by doctor"
        var expiryDate = "12/2026"
        var supplyCount = 30

        if (lines.isNotEmpty()) {
            name = lines.first().take(30)
        }

        val dosageRegex = Regex("""(\d+\s*(?:MG|ML|MCG|G|TABLETS|CAPSULES|PILLS|DROPS|PUFFS))""", RegexOption.IGNORE_CASE)
        dosageRegex.find(rawText)?.let {
            dosage = it.value.trim()
        }

        val expiryRegex = Regex("""(?:EXP[:\s]*|EXPIRES[:\s]*)([0-9]{1,2}[/-][0-9]{2,4}|[0-9]{4}[/-][0-9]{1,2})""", RegexOption.IGNORE_CASE)
        expiryRegex.find(rawText)?.let {
            expiryDate = it.groupValues.getOrNull(1) ?: it.value
        }

        val instructionLines = lines.filter { line ->
            val upper = line.uppercase()
            upper.contains("TAKE") || upper.contains("DAILY") || upper.contains("AFTER") || 
            upper.contains("BEFORE") || upper.contains("WITH") || upper.contains("MORNING") || 
            upper.contains("NIGHT") || upper.contains("MEAL") || upper.contains("HOURS")
        }
        if (instructionLines.isNotEmpty()) {
            instructions = instructionLines.joinToString(". ")
        }

        return ParsedMedicineInfo(
            name = name.replaceFirstChar { it.uppercase() },
            dosage = dosage,
            instructions = instructions,
            expiryDate = expiryDate,
            supplyCount = supplyCount
        )
    }
}
