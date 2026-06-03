import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { COLORS, FONTS } from '../theme';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StreakBadgeProps {
  currentStreak: number;
  todayGoalMet: boolean;
  todayProgress: number; // 0..1
}

// ─── Component ────────────────────────────────────────────────────────────────

export function StreakBadge({ currentStreak, todayGoalMet, todayProgress }: StreakBadgeProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim  = useRef(new Animated.Value(0)).current;

  // Pulse animation when streak is active
  useEffect(() => {
    if (currentStreak > 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [currentStreak, glowAnim]);

  // Pop animation on streak change
  useEffect(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.2, duration: 150, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }),
    ]).start();
  }, [currentStreak, scaleAnim]);

  const flameOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.7, 1],
  });

  const getStreakColor = () => {
    if (currentStreak >= 30) return COLORS.streakGold;
    if (currentStreak >= 7)  return COLORS.streakOrange;
    if (currentStreak >= 1)  return COLORS.streakRed;
    return COLORS.textMuted;
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.badgeWrapper, { transform: [{ scale: scaleAnim }] }]}>
        <Animated.Text style={[styles.flame, { opacity: flameOpacity, color: getStreakColor() }]}>
          🔥
        </Animated.Text>
        <Text style={[styles.count, { color: getStreakColor() }]}>
          {currentStreak}
        </Text>
      </Animated.View>

      {/* Daily progress bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.min(todayProgress * 100, 100)}%` as any,
                backgroundColor: todayGoalMet ? COLORS.streakGold : COLORS.primary,
              },
            ]}
          />
        </View>
        <Text style={styles.progressLabel}>
          {todayGoalMet ? '✓ Meta assolida' : `${Math.round(todayProgress * 100)}% avui`}
        </Text>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badgeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  flame: {
    fontSize: 20,
  },
  count: {
    fontSize: 20,
    fontFamily: FONTS.bold,
  },
  progressContainer: {
    flex: 1,
    gap: 4,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressLabel: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: 'rgba(255,255,255,0.5)',
  },
});
