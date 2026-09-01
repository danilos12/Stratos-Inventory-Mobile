import { ReactNode } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PackageOpen, Search, X } from 'lucide-react-native';

import { BRAND, TYPE } from '@/constants/brand';

export function Screen({ children, scroll = true, refreshing, onRefresh, contentStyle, footer }: {
  children: ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: StyleProp<ViewStyle>;
  footer?: ReactNode;
}) {
  const content = <View style={[styles.screenContent, contentStyle]}>{children}</View>;
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={onRefresh ? <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={BRAND.inkSoft} /> : undefined}>
          {content}
        </ScrollView>
      ) : content}
      {footer}
    </SafeAreaView>
  );
}

export function Card({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  if (onPress) {
    return <Pressable onPress={onPress} style={({ pressed }) => [styles.card, style, pressed && styles.pressed]}>{children}</Pressable>;
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Eyebrow({ children, color = BRAND.muted, style }: { children: ReactNode; color?: string; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.eyebrow, { color }, style]}>{children}</Text>;
}

export function Title({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.title, style]}>{children}</Text>;
}

export function Body({ children, style, numberOfLines }: { children: ReactNode; style?: StyleProp<TextStyle>; numberOfLines?: number }) {
  return <Text numberOfLines={numberOfLines} style={[styles.body, style]}>{children}</Text>;
}

export function Pill({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'red' | 'green' | 'amber' | 'blue' }) {
  const palette = {
    neutral: [BRAND.canvas, BRAND.inkSoft],
    red: [BRAND.redSoft, BRAND.redDark],
    green: [BRAND.greenSoft, BRAND.green],
    amber: [BRAND.amberSoft, BRAND.amber],
    blue: [BRAND.blueSoft, BRAND.blue],
  }[tone];
  return <View style={[styles.pill, { backgroundColor: palette[0] }]}><Text style={[styles.pillText, { color: palette[1] }]}>{label}</Text></View>;
}

export function SearchField({ value, onChangeText, placeholder = 'Search', onScan }: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  onScan?: () => void;
}) {
  return (
    <View style={styles.searchField}>
      <Search size={16} color={BRAND.muted} strokeWidth={2} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={BRAND.muted}
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.searchInput}
      />
      {value ? (
        <Pressable onPress={() => onChangeText('')} hitSlop={10}><X size={16} color={BRAND.muted} /></Pressable>
      ) : onScan ? (
        <Pressable onPress={onScan} hitSlop={10}><Text style={styles.scanGlyph}>⌗</Text></Pressable>
      ) : null}
    </View>
  );
}

export function PrimaryButton({ label, onPress, loading, disabled, icon }: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
}) {
  return (
    <Pressable disabled={disabled || loading} onPress={onPress} style={({ pressed }) => [styles.primaryButton, (disabled || loading) && styles.disabled, pressed && styles.primaryPressed]}>
      {loading ? <ActivityIndicator color={BRAND.white} /> : <>{icon}<Text style={styles.primaryLabel}>{label}</Text></>}
    </Pressable>
  );
}

export function EmptyState({ title, message, error = false }: { title: string; message: string; error?: boolean }) {
  return (
    <View style={styles.empty}>
      <PackageOpen size={28} color={error ? BRAND.red : BRAND.muted} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyMessage}>{message}</Text>
    </View>
  );
}

export function SyncBadge({ offline, refreshing, label }: { offline: boolean; refreshing: boolean; label?: string }) {
  const color = offline ? BRAND.amber : BRAND.green;
  return (
    <View style={styles.sync}>
      <View style={[styles.syncDot, { backgroundColor: color }]} />
      <Text style={styles.syncText}>{offline ? 'Offline' : refreshing ? 'Syncing…' : label || 'Synced'}</Text>
    </View>
  );
}

export function LoadingScreen({ label = 'Loading' }: { label?: string }) {
  return (
    <SafeAreaView accessibilityLabel={label} accessibilityLiveRegion="polite" style={styles.loadingScreen}>
      <ActivityIndicator color={BRAND.ink} size="large" />
      <Text style={styles.loadingLabel}>{label}</Text>
    </SafeAreaView>
  );
}

export function OpeningScreen() {
  return (
    <SafeAreaView
      accessibilityLabel="Opening Stratos Inventory"
      accessibilityLiveRegion="polite"
      style={styles.openingScreen}>
      <Image
        accessibilityIgnoresInvertColors
        resizeMode="contain"
        source={require('../../assets/images/stratos-logo.png')}
        style={styles.openingLogo}
      />
      <ActivityIndicator color={BRAND.red} style={styles.openingProgress} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BRAND.paper },
  scroll: { flexGrow: 1 },
  screenContent: { flex: 1, width: '100%', maxWidth: 980, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 120 },
  card: { backgroundColor: BRAND.white, borderRadius: 16, borderWidth: 1, borderColor: BRAND.line },
  pressed: { opacity: 0.7 },
  eyebrow: { fontFamily: TYPE.body, fontSize: 13, lineHeight: 17, fontWeight: '500' },
  title: { color: BRAND.ink, fontFamily: TYPE.body, fontSize: 27, lineHeight: 32, fontWeight: '600', letterSpacing: -0.4 },
  body: { color: BRAND.muted, fontFamily: TYPE.body, fontSize: 13, lineHeight: 19 },
  pill: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  pillText: { fontFamily: TYPE.body, fontSize: 11, lineHeight: 14, fontWeight: '600' },
  searchField: { height: 46, flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 12, backgroundColor: BRAND.canvas, paddingHorizontal: 13 },
  searchInput: { flex: 1, color: BRAND.ink, fontFamily: TYPE.body, fontSize: 15, paddingVertical: 0 },
  scanGlyph: { color: BRAND.muted, fontSize: 16, lineHeight: 18 },
  primaryButton: { minHeight: 50, borderRadius: 14, backgroundColor: BRAND.ink, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 20 },
  primaryPressed: { opacity: 0.9 },
  primaryLabel: { color: BRAND.white, fontFamily: TYPE.body, fontSize: 14, fontWeight: '600' },
  disabled: { opacity: 0.45 },
  empty: { alignItems: 'center', paddingHorizontal: 32, paddingVertical: 48, gap: 10 },
  emptyTitle: { color: BRAND.ink, fontFamily: TYPE.body, fontWeight: '600', fontSize: 16, marginTop: 6 },
  emptyMessage: { maxWidth: 300, color: BRAND.muted, fontFamily: TYPE.body, fontSize: 13, lineHeight: 18, textAlign: 'center' },
  sync: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  syncDot: { width: 7, height: 7, borderRadius: 4 },
  syncText: { color: BRAND.muted, fontFamily: TYPE.body, fontSize: 12, fontWeight: '500' },
  loadingScreen: { flex: 1, backgroundColor: BRAND.paper, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  loadingLabel: { marginTop: 12, color: BRAND.muted, fontFamily: TYPE.body, fontSize: 13 },
  openingScreen: { flex: 1, backgroundColor: '#000000', alignItems: 'center', justifyContent: 'center' },
  openingLogo: { width: '76%', maxWidth: 320, aspectRatio: 1.5 },
  openingProgress: { marginTop: 14 },
});
