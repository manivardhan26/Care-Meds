export const LightColors = {
  // Primary Healthcare Medical Teal
  primary: '#006874',
  primaryDark: '#004F58',
  primaryContainer: '#97F0FF',
  onPrimary: '#FFFFFF',
  onPrimaryContainer: '#001F24',
  accentTeal: '#008B99',

  // Secondary
  secondary: '#4A6267',
  secondaryContainer: '#CDE7EC',
  onSecondaryContainer: '#051F23',

  // Safety & Expiry Alert Colors
  alertRed: '#BA1A1A',
  alertRedContainer: '#FFDAD6',
  onAlertRedContainer: '#410002',

  warningAmber: '#8B5000',
  warningAmberContainer: '#FFDCC1',
  onWarningAmberContainer: '#2A1700',

  // Adherence Status Colors
  takenGreen: '#1B873F',
  takenGreenContainer: '#C8F2D5',
  onTakenGreen: '#FFFFFF',
  onTakenGreenContainer: '#00210A',

  snoozeOrange: '#D97706',
  skippedGray: '#5F6368',
  missedRed: '#BA1A1A',
  notSureAmber: '#D97706',
  notSureContainer: '#FEF3C7',
  notSureText: '#92400E',

  // Surfaces & Backgrounds
  background: '#FBF9F5',
  surface: '#FFFFFF',
  surfaceVariant: '#DAE4E5',
  surfaceCard: '#FFFFFF',
  surfaceWarm: '#F5F2EA',
  border: '#EAEFEF',

  // Text
  textPrimary: '#191C1D',
  textSecondary: '#3F484A',
  textMuted: '#6F797A',

  // Inputs & Cards
  cardBackground: '#FFFFFF',
  inputBackground: '#FFFFFF',
  buttonText: '#FFFFFF',
  cardShadow: '#000000',

  // Accent & Action Tiles (Reference Style)
  fabGold: '#E5A91A',
  onFabGold: '#FFFFFF',
  badgeUpcomingBg: '#E8F5E9',
  badgeUpcomingText: '#2E7D32',
  quickActionPurpleBg: '#EDE7F6',
  quickActionPurpleIcon: '#7E57C2',
  quickActionBlueBg: '#E3F2FD',
  quickActionBlueIcon: '#1E88E5',
  quickActionGreenBg: '#E8F5E9',
  quickActionGreenIcon: '#43A047',
  quickActionPinkBg: '#FCE4EC',
  quickActionPinkIcon: '#E91E63',

  // Legacy Dark Mode Palette aliases
  darkBackground: '#12181A',
  darkSurface: '#1B2224',
  darkSurfaceVariant: '#252E30',
  darkTextPrimary: '#F2F5F6',
  darkTextSecondary: '#B6C2C4',
  darkBorder: '#303C3F',
};

export const DarkColors: typeof LightColors = {
  // Primary Healthcare Medical Teal (High contrast on dark)
  primary: '#38C8DA',
  primaryDark: '#004F58',
  primaryContainer: '#004F58',
  onPrimary: '#001F24',
  onPrimaryContainer: '#97F0FF',
  accentTeal: '#4FD8EB',

  // Secondary
  secondary: '#A8C4CA',
  secondaryContainer: '#293B3E',
  onSecondaryContainer: '#CFE8EE',

  // Safety & Expiry Alert Colors (High visibility & contrast)
  alertRed: '#FF897D',
  alertRedContainer: '#5D1013',
  onAlertRedContainer: '#FFDAD6',

  warningAmber: '#FFBA72',
  warningAmberContainer: '#4F2600',
  onWarningAmberContainer: '#FFDCC1',

  // Adherence Status Colors
  takenGreen: '#3DD574',
  takenGreenContainer: '#0E3D1D',
  onTakenGreen: '#00210A',
  onTakenGreenContainer: '#B8F5CE',

  snoozeOrange: '#FBBF24',
  skippedGray: '#8F999A',
  missedRed: '#FF897D',
  notSureAmber: '#FBBF24',
  notSureContainer: '#451A03',
  notSureText: '#FDE68A',

  // Surfaces & Backgrounds (Accessible, calm healthcare dark slate)
  background: '#12181A',
  surface: '#1B2224',
  surfaceVariant: '#252E30',
  surfaceCard: '#1F2729',
  surfaceWarm: '#182022',
  border: '#303C3F',

  // Text (High contrast, optimized for elderly readability)
  textPrimary: '#F2F5F6',
  textSecondary: '#B6C2C4',
  textMuted: '#829193',

  // Inputs & Cards
  cardBackground: '#1F2729',
  inputBackground: '#161C1E',
  buttonText: '#FFFFFF',
  cardShadow: '#000000',

  // Accent & Action Tiles (Reference Style for Dark Mode)
  fabGold: '#F59E0B',
  onFabGold: '#12181A',
  badgeUpcomingBg: '#12381E',
  badgeUpcomingText: '#4ADE80',
  quickActionPurpleBg: '#2A203E',
  quickActionPurpleIcon: '#C4B5FD',
  quickActionBlueBg: '#182C44',
  quickActionBlueIcon: '#93C5FD',
  quickActionGreenBg: '#183824',
  quickActionGreenIcon: '#86EFAC',
  quickActionPinkBg: '#3E1D2A',
  quickActionPinkIcon: '#F472B6',

  // Legacy Dark Mode Palette aliases
  darkBackground: '#12181A',
  darkSurface: '#1B2224',
  darkSurfaceVariant: '#252E30',
  darkTextPrimary: '#F2F5F6',
  darkTextSecondary: '#B6C2C4',
  darkBorder: '#303C3F',
};

// Default static fallback for backwards compatibility
export const Colors = LightColors;
export type ThemeColors = typeof LightColors;
