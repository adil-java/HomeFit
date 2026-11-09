import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

/**
 * Screen-size helpers shared by all screens, so every layout uses the same
 * breakpoints. Re-computes on rotation, split-screen and foldables (unlike
 * `Dimensions.get` at file level, which is read once and never updates).
 *
 * Breakpoints (window width in dp):
 *   small   < 360   compact phones (iPhone SE, Galaxy A0x)
 *   phone   360–599 most phones
 *   tablet  >= 600  large foldables / tablets
 */
export function useResponsive() {
  const { width, height, fontScale } = useWindowDimensions();

  return useMemo(() => {
    const isSmall = width < 360;
    const isTablet = width >= 600;
    const isLargeTablet = width >= 900;

    // Horizontal page padding
    const gutter = isSmall ? 12 : isTablet ? 24 : 16;

    // Product grid columns
    const gridColumns = isLargeTablet ? 4 : isTablet ? 3 : 2;

    // Readable max width for forms / detail content on tablets
    const contentMaxWidth = isTablet ? 720 : width;

    /** Exact width of one item in a grid with `columns` and `gap`, inside `padding` on each side. */
    const gridItemWidth = (columns: number, gap: number, padding: number = gutter) =>
      Math.floor((width - padding * 2 - gap * (columns - 1)) / columns);

    return {
      width,
      height,
      fontScale,
      isSmall,
      isTablet,
      isLargeTablet,
      isShort: height < 700,
      gutter,
      gridColumns,
      contentMaxWidth,
      gridItemWidth,
    };
  }, [width, height, fontScale]);
}
