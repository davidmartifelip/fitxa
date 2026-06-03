import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { COLORS, FONTS } from '../theme';
import { formatDuration } from '../utils/dateHelpers';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TimerDisplayProps {
  remaining: number;   // seconds
  progress: number;    // 0..1
  isCompleted: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SIZE = 240;
const STROKE_WIDTH = 8;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// ─── Animated SVG Circle ─────────────────────────────────────────────────────

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ─── Component ────────────────────────────────────────────────────────────────

export function TimerDisplay({ remaining, progress, isCompleted }: TimerDisplayProps) {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim    = useRef(new Animated.Value(1)).current;
  const completedAnim = useRef(new Animated.Value(0)).current;

  // Animate progress ring
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 500,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false, // SVG strokeDashoffset doesn't support native driver
    }).start();
  }, [progress, progressAnim]);

  // Pulse when active
  useEffect(() => {
    if (!isCompleted) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.03, duration: 2000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      Animated.spring(completedAnim, { toValue: 1, useNativeDriver: true }).start();
    }
  }, [isCompleted, pulseAnim, completedAnim]);

  const strokeDashoffset = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [CIRCUMFERENCE, 0],
  });

  const ringColor = isCompleted ? COLORS.streakGold : COLORS.primary;

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: pulseAnim }] }]}>
      {/* SVG Progress Ring */}
      <Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFill}>
        {/* Background track */}
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={STROKE_WIDTH}
          fill="none"
        />
        {/* Animated progress */}
        <AnimatedCircle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={ringColor}
          strokeWidth={STROKE_WIDTH}
          fill="none"
          strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${SIZE / 2}, ${SIZE / 2}`}
        />
      </Svg>

      {/* Inner content */}
      <View style={styles.innerContent}>
        {isCompleted ? (
          <>
            <Text style={styles.completedEmoji}>🎯</Text>
            <Text style={styles.completedText}>Focus complet!</Text>
          </>
        ) : (
          <>
            <Text style={styles.timeText}>{formatDuration(remaining)}</Text>
            <Text style={styles.label}>restants</Text>
          </>
        )}
      </View>
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  innerContent: {
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 52,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    letterSpacing: -2,
    lineHeight: 60,
  },
  label: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  completedEmoji: {
    fontSize: 48,
  },
  completedText: {
    fontSize: 18,
    fontFamily: FONTS.semiBold,
    color: COLORS.streakGold,
    marginTop: 4,
  },
});
