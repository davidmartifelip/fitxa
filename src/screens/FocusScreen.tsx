import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Animated,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { COLORS, FONTS, SPACING, globalStyles } from '../theme';
import { TimerDisplay } from '../components/TimerDisplay';
import { useTimer } from '../hooks/useTimer';
import { useStreak } from '../hooks/useStreak';
import type { RootStackParamList } from '../../App';

type NavProp  = NativeStackNavigationProp<RootStackParamList, 'Focus'>;
type RouteType = RouteProp<RootStackParamList, 'Focus'>;

export function FocusScreen() {
  const navigation = useNavigation<NavProp>();
  const route      = useRoute<RouteType>();
  const { taskName } = route.params;

  const timer  = useTimer();
  const streak = useStreak();

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // Entrance animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, speed: 12 }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  // Auto-start timer
  useEffect(() => {
    timer.start(taskName);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh streak on completion
  useEffect(() => {
    if (timer.isCompleted) streak.refresh();
  }, [timer.isCompleted, streak]);

  const handleStop = () => {
    Alert.alert(
      'Atura la sessió?',
      "El temps d'aquesta sessió es guardarà, però no comptarà com a sessió completada.",
      [
        { text: 'Continua', style: 'cancel' },
        {
          text: 'Atura',
          style: 'destructive',
          onPress: async () => {
            await timer.stop();
            navigation.goBack();
          },
        },
      ]
    );
  };

  const handleDone = () => {
    timer.reset();
    navigation.goBack();
  };

  return (
    <SafeAreaView style={globalStyles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <Animated.View
        style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
      >
        {/* Back */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={timer.isCompleted ? handleDone : handleStop}
          accessibilityRole="button"
          accessibilityLabel="Enrere"
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>

        {/* Task name */}
        <View style={styles.taskHeader}>
          <Text style={styles.focusingLabel}>Enfocant en</Text>
          <Text style={styles.taskName} numberOfLines={2}>{taskName}</Text>
        </View>

        {/* Timer ring */}
        <View style={styles.timerSection}>
          <TimerDisplay
            remaining={timer.remaining}
            progress={timer.progress}
            isCompleted={timer.isCompleted}
          />
        </View>

        {/* Streak pill */}
        {!timer.isCompleted && (
          <View style={styles.streakPill}>
            <Text style={styles.streakEmoji}>🔥</Text>
            <Text style={styles.streakText}>
              {streak.currentStreak > 0
                ? `Ratxa de ${streak.currentStreak} dies`
                : 'Inicia la teva ratxa avui'}
            </Text>
          </View>
        )}

        {/* Completion card */}
        {timer.isCompleted && (
          <View style={styles.completionCard}>
            <Text style={styles.completionTitle}>Sessió completada! 🎯</Text>
            <Text style={styles.completionText}>
              90 minuts de focus profund completats.
              {streak.todayGoalMet ? '\nMeta diària assolida! 🔥' : ''}
            </Text>
            <TouchableOpacity
              style={[globalStyles.primaryButton, { width: '100%' }]}
              onPress={handleDone}
            >
              <Text style={globalStyles.primaryButtonText}>Finalitzar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Stop button */}
        {!timer.isCompleted && (
          <TouchableOpacity style={styles.stopButton} onPress={handleStop}>
            <Text style={styles.stopText}>Atura la sessió</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
  },
  backButton: {
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  backIcon: {
    fontSize: 22, color: COLORS.textSecondary, fontFamily: FONTS.regular,
  },
  taskHeader: {
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
    gap: 6,
  },
  focusingLabel: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  taskName: {
    fontSize: 22,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    textAlign: 'center',
    lineHeight: 28,
  },
  timerSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  streakEmoji: { fontSize: 16 },
  streakText: {
    fontSize: 14, fontFamily: FONTS.medium, color: COLORS.textMuted,
  },
  stopButton: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    marginBottom: SPACING.md,
  },
  stopText: {
    fontSize: 15, fontFamily: FONTS.medium, color: COLORS.error,
  },
  completionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: SPACING.lg,
    alignItems: 'center',
    gap: 10,
    marginVertical: SPACING.lg,
    borderWidth: 1,
    borderColor: `${COLORS.streakGold}30`,
  },
  completionTitle: {
    fontSize: 20, fontFamily: FONTS.bold, color: COLORS.textPrimary,
  },
  completionText: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
