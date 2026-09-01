import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { ChevronLeft, ChevronRight, ClipboardList, Clock3, House, ScanLine, UserRound } from 'lucide-react-native';
import { router } from 'expo-router';

import { BRAND, SHADOW, TYPE } from '@/constants/brand';

export type Accent = 'red' | 'green' | 'blue' | 'amber' | 'violet' | 'neutral';

const PALETTES: Record<Accent, { color: string; soft: string }> = {
  red: { color: BRAND.red, soft: BRAND.redSoft },
  green: { color: BRAND.green, soft: BRAND.greenSoft },
  blue: { color: BRAND.blue, soft: BRAND.blueSoft },
  amber: { color: BRAND.amber, soft: BRAND.amberSoft },
  violet: { color: BRAND.violet, soft: BRAND.violetSoft },
  neutral: { color: BRAND.inkSoft, soft: BRAND.canvas },
};

export function IconBadge({ children, accent = 'neutral', size = 48 }: { children: ReactNode; accent?: Accent; size?: number }) {
  const palette = PALETTES[accent];
  return (
    <View style={[styles.iconBadge, { width: size, height: size, borderRadius: size * 0.28, backgroundColor: palette.soft }]}>
      {children}
    </View>
  );
}

export function PageHeader({ title, scan = false, right, onBack }: { title: string; scan?: boolean; right?: ReactNode; onBack?: () => void }) {
  return (
    <View style={styles.pageHeader}>
      <Pressable accessibilityRole="button" accessibilityLabel="Go back" hitSlop={12} onPress={onBack || (() => router.back())} style={styles.headerSide}>
        <ChevronLeft size={34} color={BRAND.inkSoft} strokeWidth={1.9} />
      </Pressable>
      <Text numberOfLines={1} style={styles.pageTitle}>{title}</Text>
      <View style={[styles.headerSide, styles.headerRight]}>
        {right || (scan ? <Pressable accessibilityRole="button" accessibilityLabel="Scan" hitSlop={12} onPress={() => router.push('/scanner')}><ScanLine size={30} color={BRAND.red} strokeWidth={2.1} /></Pressable> : null)}
      </View>
    </View>
  );
}

export function Surface({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  if (onPress) return <Pressable onPress={onPress} style={({ pressed }) => [styles.surface, style, pressed && styles.pressed]}>{children}</Pressable>;
  return <View style={[styles.surface, style]}>{children}</View>;
}

export function StatCard({ icon, label, value, accent = 'neutral', onPress }: { icon: ReactNode; label: string; value: string | number; accent?: Accent; onPress?: () => void }) {
  return (
    <Surface onPress={onPress} style={styles.statCard}>
      <IconBadge accent={accent} size={48}>{icon}</IconBadge>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{typeof value === 'number' ? value.toLocaleString() : value}</Text>
    </Surface>
  );
}

export function ActionCard({ icon, label, accent = 'neutral', onPress }: { icon: ReactNode; label: string; accent?: Accent; onPress: () => void }) {
  return (
    <Surface onPress={onPress} style={styles.actionCard}>
      <IconBadge accent={accent} size={58}>{icon}</IconBadge>
      <View style={styles.actionFooter}>
        <Text numberOfLines={2} style={styles.actionLabel}>{label}</Text>
        <ChevronRight size={20} color={BRAND.ink} strokeWidth={2} />
      </View>
    </Surface>
  );
}

export function SectionTitle({ children, action, onAction }: { children: ReactNode; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={styles.sectionTitle}>{children}</Text>
      {action ? <Pressable onPress={onAction}><Text style={styles.sectionAction}>{action}</Text></Pressable> : null}
    </View>
  );
}

export function StatusChip({ label, accent = 'neutral', compact = false }: { label: string; accent?: Accent; compact?: boolean }) {
  const palette = PALETTES[accent];
  return (
    <View style={[styles.statusChip, compact && styles.statusChipCompact, { backgroundColor: palette.soft, borderColor: `${palette.color}35` }]}>
      <Text style={[styles.statusText, compact && styles.statusTextCompact, { color: palette.color }]}>{label}</Text>
    </View>
  );
}

export function DetailRow({ icon, label, value, accent = 'neutral', last = false }: { icon?: ReactNode; label: string; value: ReactNode; accent?: Accent; last?: boolean }) {
  return (
    <View style={[styles.detailRow, !last && styles.detailBorder]}>
      {icon ? <IconBadge accent={accent} size={34}>{icon}</IconBadge> : null}
      <Text style={styles.detailLabel}>{label}</Text>
      <View style={styles.detailValueWrap}>{typeof value === 'string' || typeof value === 'number' ? <Text numberOfLines={2} style={styles.detailValue}>{value}</Text> : value}</View>
    </View>
  );
}

export function RedButton({ children, icon, onPress, disabled = false }: { children: ReactNode; icon?: ReactNode; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.redButton, disabled && styles.disabled, pressed && styles.redPressed]}>
      {icon}
      <Text style={styles.redButtonText}>{children}</Text>
    </Pressable>
  );
}

export function OutlineButton({ children, icon, accent = 'neutral', onPress, disabled = false, style }: { children: ReactNode; icon?: ReactNode; accent?: Accent; onPress: () => void; disabled?: boolean; style?: StyleProp<ViewStyle> }) {
  const palette = PALETTES[accent];
  return (
    <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.outlineButton, { borderColor: accent === 'neutral' ? BRAND.line : palette.color }, style, disabled && styles.disabled, pressed && styles.pressed]}>
      {icon}
      <Text style={[styles.outlineButtonText, { color: palette.color }]}>{children}</Text>
    </Pressable>
  );
}

export function Stepper({ current, labels }: { current: number; labels: string[] }) {
  return (
    <View style={styles.stepper}>
      {labels.map((label, index) => {
        const step = index + 1;
        const active = step === current;
        const done = step < current;
        return (
          <View key={label} style={styles.stepItem}>
            <View style={styles.stepTop}>
              {index > 0 ? <View style={[styles.stepLine, (active || done) && styles.stepLineActive]} /> : <View style={styles.stepLineSpacer} />}
              <View style={[styles.stepCircle, (active || done) && styles.stepCircleActive]}><Text style={[styles.stepNumber, (active || done) && styles.stepNumberActive]}>{step}</Text></View>
              {index < labels.length - 1 ? <View style={[styles.stepLine, done && styles.stepLineActive]} /> : <View style={styles.stepLineSpacer} />}
            </View>
            <Text style={[styles.stepLabel, active && styles.stepLabelActive]}>{label}</Text>
          </View>
        );
      })}
    </View>
  );
}

export function WorkflowBottomBar({ active = 'tasks' }: { active?: 'home' | 'tasks' | 'scan' | 'history' | 'account' }) {
  const items = [
    { key: 'home', label: 'Home', icon: House, href: '/dashboard' },
    { key: 'tasks', label: 'Tasks', icon: ClipboardList, href: '/tasks' },
    { key: 'scan', label: 'Scan', icon: ScanLine, href: '/scanner' },
    { key: 'history', label: 'History', icon: Clock3, href: '/history' },
    { key: 'account', label: 'Account', icon: UserRound, href: '/account' },
  ] as const;
  return (
    <View style={styles.workflowBar}>
      {items.map((item) => {
        const selected = active === item.key;
        const Icon = item.icon;
        if (item.key === 'scan') return <Pressable key={item.key} onPress={() => router.navigate(item.href as never)} style={styles.workflowScanWrap}><View style={styles.workflowScan}><Icon size={28} color={BRAND.white} strokeWidth={2.1} /></View><Text style={styles.workflowLabel}>Scan</Text></Pressable>;
        return <Pressable key={item.key} onPress={() => router.navigate(item.href as never)} style={styles.workflowItem}><Icon size={25} color={selected ? BRAND.red : BRAND.inkSoft} strokeWidth={selected ? 2.3 : 1.8} /><Text style={[styles.workflowLabel, selected && styles.workflowLabelActive]}>{item.label}</Text></Pressable>;
      })}
    </View>
  );
}

export function formatQuantity(value: number) {
  return Number.isInteger(value) ? value.toLocaleString() : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

const styles = StyleSheet.create({
  iconBadge: { alignItems: 'center', justifyContent: 'center' },
  pageHeader: { minHeight: 62, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  headerSide: { width: 48, minHeight: 48, alignItems: 'flex-start', justifyContent: 'center' },
  headerRight: { alignItems: 'flex-end' },
  pageTitle: { flex: 1, color: BRAND.ink, fontFamily: TYPE.body, fontSize: 25, lineHeight: 31, fontWeight: '700', letterSpacing: -0.55, textAlign: 'center' },
  surface: { backgroundColor: BRAND.white, borderRadius: 18, borderWidth: 1, borderColor: BRAND.line, ...SHADOW },
  pressed: { opacity: 0.76, transform: [{ scale: 0.99 }] },
  statCard: { minHeight: 158, paddingHorizontal: 14, paddingVertical: 18, alignItems: 'center', justifyContent: 'center' },
  statLabel: { marginTop: 12, color: BRAND.inkSoft, fontFamily: TYPE.body, fontSize: 14, lineHeight: 18, fontWeight: '500', textAlign: 'center' },
  statValue: { marginTop: 5, color: BRAND.ink, fontFamily: TYPE.body, fontSize: 27, lineHeight: 32, fontWeight: '700', letterSpacing: -0.5 },
  actionCard: { minHeight: 172, padding: 16, justifyContent: 'space-between' },
  actionFooter: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionLabel: { flex: 1, color: BRAND.ink, fontFamily: TYPE.body, fontSize: 15, lineHeight: 20, fontWeight: '700' },
  sectionTitleRow: { marginTop: 26, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: BRAND.ink, fontFamily: TYPE.body, fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: -0.35 },
  sectionAction: { color: BRAND.red, fontFamily: TYPE.body, fontSize: 13, fontWeight: '700' },
  statusChip: { alignSelf: 'flex-start', borderRadius: 9, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 7 },
  statusChipCompact: { borderRadius: 7, paddingHorizontal: 8, paddingVertical: 4 },
  statusText: { fontFamily: TYPE.body, fontSize: 13, lineHeight: 17, fontWeight: '700' },
  statusTextCompact: { fontSize: 11, lineHeight: 14 },
  detailRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 14 },
  detailBorder: { borderBottomWidth: 1, borderBottomColor: BRAND.line },
  detailLabel: { color: BRAND.inkSoft, fontFamily: TYPE.body, fontSize: 14, lineHeight: 19 },
  detailValueWrap: { flex: 1, alignItems: 'flex-end' },
  detailValue: { color: BRAND.ink, fontFamily: TYPE.body, fontSize: 14, lineHeight: 19, fontWeight: '600', textAlign: 'right' },
  redButton: { minHeight: 56, borderRadius: 14, backgroundColor: BRAND.red, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 18, ...SHADOW },
  redPressed: { backgroundColor: BRAND.redDark, transform: [{ scale: 0.995 }] },
  redButtonText: { color: BRAND.white, fontFamily: TYPE.body, fontSize: 17, lineHeight: 22, fontWeight: '700' },
  outlineButton: { minHeight: 50, borderRadius: 13, borderWidth: 1.2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 14, backgroundColor: BRAND.white },
  outlineButtonText: { fontFamily: TYPE.body, fontSize: 14, lineHeight: 18, fontWeight: '700' },
  disabled: { opacity: 0.42 },
  stepper: { flexDirection: 'row', marginBottom: 14 },
  stepItem: { flex: 1, alignItems: 'center' },
  stepTop: { width: '100%', flexDirection: 'row', alignItems: 'center' },
  stepCircle: { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, borderColor: BRAND.line, backgroundColor: BRAND.white, alignItems: 'center', justifyContent: 'center' },
  stepCircleActive: { borderColor: BRAND.red, backgroundColor: BRAND.red },
  stepNumber: { color: BRAND.inkSoft, fontFamily: TYPE.body, fontSize: 14, fontWeight: '700' },
  stepNumberActive: { color: BRAND.white },
  stepLine: { flex: 1, height: 1.5, backgroundColor: BRAND.line },
  stepLineActive: { backgroundColor: BRAND.red },
  stepLineSpacer: { flex: 1 },
  stepLabel: { marginTop: 6, color: BRAND.inkSoft, fontFamily: TYPE.body, fontSize: 12, fontWeight: '500' },
  stepLabelActive: { color: BRAND.red, fontWeight: '700' },
  workflowBar: { minHeight: 82, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: BRAND.line, backgroundColor: BRAND.white, paddingBottom: 8 },
  workflowItem: { flex: 1, minHeight: 66, alignItems: 'center', justifyContent: 'center', gap: 5 },
  workflowScanWrap: { flex: 1, minHeight: 76, alignItems: 'center', justifyContent: 'flex-start' },
  workflowScan: { width: 64, height: 64, marginTop: -27, marginBottom: 2, borderRadius: 32, borderWidth: 5, borderColor: BRAND.white, backgroundColor: BRAND.red, alignItems: 'center', justifyContent: 'center', ...SHADOW },
  workflowLabel: { color: BRAND.inkSoft, fontFamily: TYPE.body, fontSize: 10, fontWeight: '600' },
  workflowLabelActive: { color: BRAND.red },
});
