import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { COLORS, FONTS, SPACING, globalStyles } from '../theme';
import { StreakBadge } from '../components/StreakBadge';
import { useStreak } from '../hooks/useStreak';
import type { RootStackParamList } from '../../App';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export function HomeScreen() {
  const navigation = useNavigation<NavProp>();
  const [taskName, setTaskName] = useState('');
  const streak = useStreak();

  const today = new Date().toLocaleDateString('ca-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const canStart = taskName.trim().length > 0;

  const handleStart = () => {
    if (!canStart) return;
    navigation.navigate('Focus', { taskName: taskName.trim() });
    setTaskName('');
  };

  const QUICK_TASKS = [
    'Deep Work',
    'Codi',
    'Lectura',
    'Disseny',
    'Planificació',
    'Escriptura',
  ];

  return (
    <SafeAreaView style={globalStyles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.logo}>fitxa</Text>
              <Text style={styles.date}>{today}</Text>
            </View>
            <StreakBadge
              currentStreak={streak.currentStreak}
              todayGoalMet={streak.todayGoalMet}
              todayProgress={streak.todayProgress}
            />
          </View>

          {/* Hero */}
          <View style={styles.hero}>
            <Text style={styles.heroTitle}>En què et vols{'\n'}enfocar avui?</Text>
            <Text style={styles.heroSub}>
              90 minuts de focus profund.{streak.currentStreak > 0 ? ` Ratxa: ${streak.currentStreak} dies 🔥` : ' Comença la teva ratxa.'}
            </Text>
          </View>

          {/* Task input */}
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={taskName}
              onChangeText={setTaskName}
              placeholder="Nom de la tasca..."
              placeholderTextColor={COLORS.textMuted}
              returnKeyType="go"
              onSubmitEditing={handleStart}
              maxLength={80}
              autoCorrect={false}
              accessibilityLabel="Nom de la tasca"
            />
          </View>

          {/* Quick task chips */}
          <View style={styles.chips}>
            {QUICK_TASKS.map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.chip, taskName === t && styles.chipActive]}
                onPress={() => setTaskName(t)}
                accessibilityRole="button"
                accessibilityLabel={`Tasca ràpida: ${t}`}
              >
                <Text style={[styles.chipText, taskName === t && styles.chipTextActive]}>
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Start button */}
          <TouchableOpacity
            style={[styles.startButton, !canStart && styles.startButtonDisabled]}
            onPress={handleStart}
            disabled={!canStart}
            accessibilityRole="button"
            accessibilityLabel="Inicia sessió de focus de 90 minuts"
          >
            <Text style={styles.startButtonText}>
              {canStart ? '▶  Inicia 90 min de Focus' : 'Escriu el nom de la tasca'}
            </Text>
          </TouchableOpacity>

          {/* Stats strip */}
          {(streak.longestStreak > 0 || streak.todayFocusSeconds > 0) && (
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{streak.currentStreak}</Text>
                <Text style={styles.statLabel}>Dies de ratxa</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statValue}>{streak.longestStreak}</Text>
                <Text style={styles.statLabel}>Millor ratxa</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statValue}>
                  {Math.round(streak.todayFocusSeconds / 60)}
                </Text>
                <Text style={styles.statLabel}>Min avui</Text>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xl,
    paddingTop: SPACING.sm,
  },
  logo: {
    fontSize: 28,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
    letterSpacing: -1,
  },
  date: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    textTransform: 'capitalize',
    marginTop: 2,
  },
  hero: {
    marginBottom: SPACING.xl,
  },
  heroTitle: {
    fontSize: 32,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    letterSpacing: -0.8,
    lineHeight: 38,
    marginBottom: 8,
  },
  heroSub: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    lineHeight: 20,
  },
  inputWrapper: {
    marginBottom: SPACING.md,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 17,
    fontFamily: FONTS.medium,
    color: COLORS.textPrimary,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: SPACING.xl,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: {
    backgroundColor: `${COLORS.primary}22`,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 13,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
  },
  chipTextActive: {
    color: COLORS.primary,
  },
  startButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: SPACING.xl,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  startButtonDisabled: {
    backgroundColor: COLORS.surface,
    shadowOpacity: 0,
    elevation: 0,
  },
  startButtonText: {
    fontSize: 17,
    fontFamily: FONTS.semiBold,
    color: COLORS.textPrimary,
    letterSpacing: 0.3,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: SPACING.md,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 22,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },
});
