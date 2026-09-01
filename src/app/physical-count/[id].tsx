import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Check, Minus, MoreVertical, Plus, ScanLine, Upload } from 'lucide-react-native';

import { IconBadge, OutlineButton, PageHeader, RedButton, StatusChip, Surface, WorkflowBottomBar } from '@/components/inventory-ui';
import { EmptyState, LoadingScreen, Screen } from '@/components/ui';
import { BRAND, TYPE } from '@/constants/brand';
import { fetchPhysicalCountSession, savePhysicalCountLine, submitPhysicalCount, verifyCountLocation } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { useSyncedData } from '@/providers/data-provider';
import type { PhysicalCountSession } from '@/types/domain';

export default function PhysicalCountScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); const countId = Number(id);
  const { session } = useAuth(); const { refresh } = useSyncedData();
  const [count, setCount] = useState<PhysicalCountSession | null>(null); const [loading, setLoading] = useState(true); const [submitting, setSubmitting] = useState(false); const [locationCode, setLocationCode] = useState('');
  const load = useCallback(async () => { if (!session || !countId) return; setLoading(true); try { setCount(await fetchPhysicalCountSession(session.token, countId)); } catch (error) { Alert.alert('Count unavailable', error instanceof Error ? error.message : 'Unable to load the count.'); } finally { setLoading(false); } }, [countId, session]);
  useEffect(() => { const task = setTimeout(load, 0); return () => clearTimeout(task); }, [load]);
  const completed = useMemo(() => count?.items.filter((item) => item.countedQty != null).length || 0, [count]); const total = count?.items.length || 0; const percent = total ? completed / total * 100 : 0;

  async function verify() { if (!session || !count || !locationCode.trim()) return; try { setCount(await verifyCountLocation(session.token, count.id, locationCode.trim())); } catch (error) { Alert.alert('Location not verified', error instanceof Error ? error.message : 'Scan the assigned location label.'); } }
  async function setQty(lineId: number, qty: number) { if (!session || !count || qty < 0) return; const optimistic = { ...count, items: count.items.map((line) => line.id === lineId ? { ...line, countedQty: qty } : line) }; setCount(optimistic); try { setCount(await savePhysicalCountLine(session.token, count.id, lineId, qty)); } catch (error) { setCount(count); Alert.alert('Count not saved', error instanceof Error ? error.message : 'Reconnect and retry.'); } }
  async function submit() { if (!session || !count) return; if (!count.locationVerified) { Alert.alert('Verify location first', 'Scan the assigned location label before counting.'); return; } if (completed !== total) { Alert.alert('Count incomplete', `${total - completed} items still need a physical quantity.`); return; } setSubmitting(true); try { await submitPhysicalCount(session.token, count.id); await refresh(); Alert.alert('Count submitted', 'System quantities and variances are now available to the web reviewer.', [{ text: 'Done', onPress: () => router.replace('/history' as never) }]); } catch (error) { Alert.alert('Count not submitted', error instanceof Error ? error.message : 'Please retry.'); } finally { setSubmitting(false); } }

  if (loading) return <LoadingScreen label="Loading physical count" />;
  if (!count) return <Screen><PageHeader title="Physical Count" /><EmptyState error title="Count unavailable" message="This count assignment could not be loaded." /></Screen>;
  return (
    <Screen contentStyle={styles.screen} footer={<WorkflowBottomBar active="tasks" />}>
      <PageHeader title="Physical Count" right={<MoreVertical size={28} color={BRAND.inkSoft} />} />
      <Surface style={styles.location}><Text style={styles.eyebrow}>COUNTING LOCATION</Text><Text style={styles.locationName}>{count.locationCode}</Text><View style={styles.verifyRow}><TextInput value={locationCode} onChangeText={setLocationCode} placeholder="Scan location code" placeholderTextColor={BRAND.muted} style={styles.locationInput} /><OutlineButton accent="violet" icon={<ScanLine size={20} color={BRAND.violet} />} onPress={verify}>Scan Location</OutlineButton>{count.locationVerified ? <StatusChip label="✓  Location Verified" accent="green" /> : null}</View></Surface>
      <Surface style={styles.progressCard}><View style={styles.progressTop}><Text style={styles.progressTitle}>{completed} of {total} items counted</Text><StatusChip label="Blind Count" accent="violet" /></View><View style={styles.track}><View style={[styles.fill, { width: `${percent}%` }]} /></View><Text style={styles.blindHelp}>System quantities are hidden until submission.</Text></Surface>
      <Surface style={styles.lines}>{count.items.map((line, index) => { const done = line.countedQty != null; return <View key={line.id} style={[styles.line, index < count.items.length - 1 && styles.border]}><IconBadge accent={done ? 'green' : 'violet'} size={48}>{done ? <Check size={25} color={BRAND.green} /> : <View style={styles.pendingCircle} />}</IconBadge><View style={styles.lineMain}><Text style={styles.name}>{line.item.name}</Text><Text style={styles.code}>{line.item.barcode || line.item.sku}</Text></View>{done ? <View style={styles.quantity}><Pressable onPress={() => setQty(line.id, Math.max(0, Number(line.countedQty) - 1))} style={styles.qtyButton}><Minus size={18} color={BRAND.blue} /></Pressable><TextInput value={String(line.countedQty)} onChangeText={(value) => { const qty = Number(value); if (Number.isFinite(qty)) void setQty(line.id, qty); }} keyboardType="decimal-pad" style={styles.qtyInput} /><Pressable onPress={() => setQty(line.id, Number(line.countedQty) + 1)} style={styles.qtyButton}><Plus size={18} color={BRAND.blue} /></Pressable></View> : <OutlineButton accent="violet" icon={<ScanLine size={18} color={BRAND.violet} />} onPress={() => setQty(line.id, 1)}>Scan to Count</OutlineButton>}</View>; })}</Surface>
      <OutlineButton style={styles.next} accent="violet" icon={<ScanLine size={22} color={BRAND.violet} />} onPress={() => { const next = count.items.find((line) => line.countedQty == null); if (next) void setQty(next.id, 1); }}>Scan Next Item</OutlineButton>
      <RedButton disabled={submitting || !count.locationVerified} icon={<Upload size={23} color={BRAND.white} />} onPress={submit}>{submitting ? 'Submitting…' : 'Submit Count for Review'}</RedButton>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: 16, paddingTop: 0, paddingBottom: 34 }, location: { padding: 17 }, eyebrow: { color: BRAND.inkSoft, fontFamily: TYPE.body, fontSize: 12, fontWeight: '700', letterSpacing: 0.7 }, locationName: { marginTop: 9, color: BRAND.ink, fontFamily: TYPE.body, fontSize: 23, fontWeight: '700' }, verifyRow: { marginTop: 15, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }, locationInput: { flex: 1, minWidth: 140, minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: BRAND.line, color: BRAND.ink, fontFamily: TYPE.mono, fontSize: 12, paddingHorizontal: 12 },
  progressCard: { marginTop: 12, padding: 17 }, progressTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, progressTitle: { flex: 1, color: BRAND.ink, fontFamily: TYPE.body, fontSize: 18, fontWeight: '700' }, track: { height: 7, marginTop: 15, backgroundColor: BRAND.line, borderRadius: 4, overflow: 'hidden' }, fill: { height: '100%', backgroundColor: BRAND.violet, borderRadius: 4 }, blindHelp: { marginTop: 10, color: BRAND.muted, fontFamily: TYPE.body, fontSize: 12 },
  lines: { marginTop: 12, overflow: 'hidden' }, line: { minHeight: 96, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }, border: { borderBottomWidth: 1, borderBottomColor: BRAND.line }, pendingCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: BRAND.violet }, lineMain: { flex: 1, minWidth: 0 }, name: { color: BRAND.ink, fontFamily: TYPE.body, fontSize: 15, fontWeight: '700' }, code: { marginTop: 4, color: BRAND.inkSoft, fontFamily: TYPE.mono, fontSize: 11 }, quantity: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: BRAND.line, flexDirection: 'row', alignItems: 'center' }, qtyButton: { width: 42, height: 46, alignItems: 'center', justifyContent: 'center' }, qtyInput: { width: 48, color: BRAND.ink, fontFamily: TYPE.body, fontSize: 16, fontWeight: '700', textAlign: 'center' }, next: { marginVertical: 12 },
});
