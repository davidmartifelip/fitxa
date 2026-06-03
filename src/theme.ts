import { StyleSheet } from 'react-native';

// ─── Color Palette ────────────────────────────────────────────────────────────

export const COLORS = {
  // Backgrounds
  background: '#0A0A0F',
  surface: '#13131A',
  surfaceElevated: '#1A1A24',

  // Primary accent
  primary: '#6C63FF',
  primaryLight: '#8B85FF',
  primaryDark: '#4F46D4',

  // Streak gamification
  streakRed: '#FF5757',
  streakOrange: '#FF8C42',
  streakGold: '#FFD700',

  // Text
  textPrimary: '#F0F0F5',
  textSecondary: '#9090A8',
  textMuted: '#55556A',

  // Status
  success: '#34D399',
  error: '#FF5757',

  // Borders
  border: 'rgba(255,255,255,0.08)',
};

// ─── Typography ───────────────────────────────────────────────────────────────

export const FONTS = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
};

// ─── Spacing ──────────────────────────────────────────────────────────────────

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// ─── Common Styles ────────────────────────────────────────────────────────────

export const globalStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  heading1: {
    fontSize: 28,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  heading2: {
    fontSize: 20,
    fontFamily: FONTS.semiBold,
    color: COLORS.textPrimary,
  },
  bodyText: {
    fontSize: 15,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  mutedText: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
