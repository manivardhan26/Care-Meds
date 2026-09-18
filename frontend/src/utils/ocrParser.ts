export interface ParsedPackage {
  name: string;
  dosage: string;
  instructions: string;
  expiryDate: string;
  isExpiryDetected?: boolean;
  suggestedReminderTime?: string;
  supplyCount: number;
}


export function parseRawOcr(text: string): ParsedPackage {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let name = lines.length > 0 ? lines[0].substring(0, 30) : 'Prescription Medicine';
  let dosage = '100mg';
  let instructions = 'Take as directed by doctor';
  let expiryDate = '';
  let isExpiryDetected = false;
  let supplyCount = 30;

  const dosageMatch = text.match(/(\d+\s*(?:mg|ml|mcg|g|tablets|capsules|pills))/i);
  if (dosageMatch) {
    dosage = dosageMatch[0];
  }

  const expiryMatch = text.match(/(?:exp[:\s]*|expires[:\s]*)([0-9]{1,2}[/-][0-9]{2,4}|[0-9]{4}[/-][0-9]{1,2})/i);
  if (expiryMatch) {
    expiryDate = expiryMatch[1];
    isExpiryDetected = true;
  }

  let suggestedReminderTime = '08:00 AM';
  const upperText = text.toUpperCase();
  if (upperText.includes('NIGHT') || upperText.includes('BEDTIME')) {
    suggestedReminderTime = '09:00 PM';
  } else if (upperText.includes('EVENING')) {
    suggestedReminderTime = '06:00 PM';
  } else if (upperText.includes('NOON') || upperText.includes('LUNCH')) {
    suggestedReminderTime = '12:00 PM';
  } else if (upperText.includes('MORNING') || upperText.includes('BREAKFAST')) {
    suggestedReminderTime = '08:00 AM';
  }

  const instructionLines = lines.filter((line) => {
    const upper = line.toUpperCase();
    return (
      upper.includes('TAKE') ||
      upper.includes('DAILY') ||
      upper.includes('AFTER') ||
      upper.includes('BEFORE') ||
      upper.includes('WITH') ||
      upper.includes('MORNING') ||
      upper.includes('NIGHT') ||
      upper.includes('MEAL')
    );
  });

  if (instructionLines.length > 0) {
    instructions = instructionLines.join('. ');
  }

  return {
    name,
    dosage,
    instructions,
    expiryDate,
    isExpiryDetected,
    suggestedReminderTime,
    supplyCount,
  };
}
