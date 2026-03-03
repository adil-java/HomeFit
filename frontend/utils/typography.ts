/**
 * Typography configuration for consistent font styling across the app.
 * This ensures font weights and styles are identical in both light and dark modes.
 */

// Font weight to font family mapping for Inter font
export const FONT_FAMILIES = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extraBold: 'Inter_800ExtraBold',
} as const;

// Font weight values
export const FONT_WEIGHTS = {
  regular: '400' as const,
  medium: '500' as const,
  semiBold: '600' as const,
  bold: '700' as const,
  extraBold: '800' as const,
} as const;

// Pre-defined typography styles for consistency
export const typography = {
  // Headings
  h1: {
    fontSize: 32,
    fontWeight: FONT_WEIGHTS.extraBold,
    fontFamily: FONT_FAMILIES.extraBold,
    lineHeight: 40,
  },
  h2: {
    fontSize: 28,
    fontWeight: FONT_WEIGHTS.bold,
    fontFamily: FONT_FAMILIES.bold,
    lineHeight: 36,
  },
  h3: {
    fontSize: 24,
    fontWeight: FONT_WEIGHTS.bold,
    fontFamily: FONT_FAMILIES.bold,
    lineHeight: 32,
  },
  h4: {
    fontSize: 20,
    fontWeight: FONT_WEIGHTS.bold,
    fontFamily: FONT_FAMILIES.bold,
    lineHeight: 28,
  },
  h5: {
    fontSize: 18,
    fontWeight: FONT_WEIGHTS.semiBold,
    fontFamily: FONT_FAMILIES.semiBold,
    lineHeight: 26,
  },
  h6: {
    fontSize: 16,
    fontWeight: FONT_WEIGHTS.semiBold,
    fontFamily: FONT_FAMILIES.semiBold,
    lineHeight: 24,
  },
  
  // Body text
  bodyLarge: {
    fontSize: 18,
    fontWeight: FONT_WEIGHTS.regular,
    fontFamily: FONT_FAMILIES.regular,
    lineHeight: 28,
  },
  body: {
    fontSize: 16,
    fontWeight: FONT_WEIGHTS.regular,
    fontFamily: FONT_FAMILIES.regular,
    lineHeight: 24,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: FONT_WEIGHTS.regular,
    fontFamily: FONT_FAMILIES.regular,
    lineHeight: 20,
  },
  
  // Labels and buttons
  labelLarge: {
    fontSize: 16,
    fontWeight: FONT_WEIGHTS.semiBold,
    fontFamily: FONT_FAMILIES.semiBold,
    lineHeight: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: FONT_WEIGHTS.medium,
    fontFamily: FONT_FAMILIES.medium,
    lineHeight: 20,
  },
  labelSmall: {
    fontSize: 12,
    fontWeight: FONT_WEIGHTS.medium,
    fontFamily: FONT_FAMILIES.medium,
    lineHeight: 16,
  },
  
  // Button text
  buttonLarge: {
    fontSize: 18,
    fontWeight: FONT_WEIGHTS.bold,
    fontFamily: FONT_FAMILIES.bold,
  },
  button: {
    fontSize: 16,
    fontWeight: FONT_WEIGHTS.bold,
    fontFamily: FONT_FAMILIES.bold,
  },
  buttonSmall: {
    fontSize: 14,
    fontWeight: FONT_WEIGHTS.semiBold,
    fontFamily: FONT_FAMILIES.semiBold,
  },
  
  // Captions and small text
  caption: {
    fontSize: 12,
    fontWeight: FONT_WEIGHTS.regular,
    fontFamily: FONT_FAMILIES.regular,
    lineHeight: 16,
  },
  overline: {
    fontSize: 10,
    fontWeight: FONT_WEIGHTS.medium,
    fontFamily: FONT_FAMILIES.medium,
    lineHeight: 14,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
  
  // Prices and numbers
  price: {
    fontSize: 24,
    fontWeight: FONT_WEIGHTS.bold,
    fontFamily: FONT_FAMILIES.bold,
  },
  priceSmall: {
    fontSize: 16,
    fontWeight: FONT_WEIGHTS.semiBold,
    fontFamily: FONT_FAMILIES.semiBold,
  },
  
  // Section titles
  sectionTitle: {
    fontSize: 20,
    fontWeight: FONT_WEIGHTS.bold,
    fontFamily: FONT_FAMILIES.bold,
  },
  sectionSubtitle: {
    fontSize: 16,
    fontWeight: FONT_WEIGHTS.semiBold,
    fontFamily: FONT_FAMILIES.semiBold,
  },
} as const;

/**
 * Helper function to get font style with correct family for a given weight.
 * Use this when you need custom font sizes but want consistent font family mapping.
 */
export const getFontStyle = (
  weight: keyof typeof FONT_WEIGHTS = 'regular',
  fontSize: number = 16
) => ({
  fontSize,
  fontWeight: FONT_WEIGHTS[weight],
  fontFamily: FONT_FAMILIES[weight === 'regular' ? 'regular' : weight],
});

/**
 * Maps numeric font weight to the correct font family.
 * This is useful when you have existing styles with numeric weights.
 */
export const fontWeightToFamily = (weight: string | number): string => {
  const weightStr = String(weight);
  switch (weightStr) {
    case '400':
    case 'normal':
      return FONT_FAMILIES.regular;
    case '500':
      return FONT_FAMILIES.medium;
    case '600':
      return FONT_FAMILIES.semiBold;
    case '700':
    case 'bold':
      return FONT_FAMILIES.bold;
    case '800':
    case '900':
      return FONT_FAMILIES.extraBold;
    default:
      return FONT_FAMILIES.regular;
  }
};

export default typography;
