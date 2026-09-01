import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { ClipboardCheck, Download, RefreshCcw, SlidersHorizontal, Upload } from 'lucide-react-native';

import { IconBadge, Surface } from '@/components/inventory-ui';
import { EmptyState, Screen, Title } from '@/components/ui';
import { BRAND, TYPE } from '@/constants/brand';
import { fetchInventoryHistory } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { useSyncedData } from '@/providers/data-provider';
import type { InventoryHistoryEntry } from '@/types/domain';

type Filter = 'ALL' | InventoryHistoryEntry['type'];
const filters: Filter[] = ['ALL', 'STOCK_IN', 'RELEASE', 'RETURN', 'COUNT'];

function entryVisual(type: InventoryHistoryEntry['type']) {
  if (type === 'STOCK_IN') return { accent: 'green' as const, icon: <Download size={22} color={BRAND.green} /> };
  if (type === 'RELEASE') return { accent: 'red' as const, icon: <Upload size={22} color={BRAND.red} /> };
  if (type === 'RETURN') return { accent: 'blue' as const, icon: <RefreshCcw size={22} color={BRAND.blue} /> };
  if (type === 'COUNT') return { accent: 'violet' as const, icon: <ClipboardCheck size={22} color={BRAND.violet} /> };
  return { accent: 'amber' as const, icon: <SlidersHorizontal size={22} color={BRAND.amber} /> };
}

export default function HistoryScreen() {
  const { workspace, refreshing, refresh } = useSyncedData();
  const { session } = useAuth();
  const [filter, setFilter] = useState<Filter>('ALL');
  const [mine, setMine] = useState(false);
  const [history, setHistory] = useState(workspace.history);
  const [historyLoading, setHistoryLoading] = useState(false);
  const warehouseId = workspace.selectedWarehouseId;
  useEffect(() => {
    let active = true;
    const token = session?.token;
    const task = setTimeout(() => {
      if (!token || !warehouseId) { if (active) setHistory(workspace.history); return; }
      if (active) setHistoryLoading(true);
      void fetchInventoryHistory(token, warehouseId, mine)
        .then((response) => { if (active) setHistory(response.data); })
        .catch(() => { if (active) setHistory(workspace.history); })
        .finally(() => { if (active) setHistoryLoading(false); });
    }, 0);
    return () => { active = false; clearTimeout(task); };
  }, [mine, session?.token, warehouseId, workspace.history]);
  const rows = useMemo(() => history.filter((entry) => filter === 'ALL' || entry.type === filter), [filter, history]);
  async function refreshHistory() {
    await refresh();
    if (!session?.token || !warehouseId) return;
    setHistoryLoading(true);
    try { const response = await fetchInventoryHistory(session.token, warehouseId, mine); setHistory(response.data); }
    catch { setHistory(workspace.history); }
    finally { setHistoryLoading(false); }
  }

  return (
    <Screen refreshing={refreshing || historyLoading} onRefresh={refreshHistory} contentStyle={styles.screen}>
      <Title style={styles.title}>History</Title>
      <Text style={styles.subtitle}>Completed activity in {workspace.warehouses.find((room) => room.id === workspace.selectedWarehouseId)?.name || 'this stock room'}</Text>
      <View style={styles.mineRow}><View><Text style={styles.mineTitle}>My activity</Text><Text style={styles.mineHelp}>Only actions completed by you</Text></View><Switch value={mine} onValueChange={setMine} trackColor={{ false: BRAND.line, true: '#F29AB0' }} thumbColor={mine ? BRAND.red : BRAND.white} /></View>
      <View style={styles.filters}>{filters.map((value) => <Pressable key={value} onPress={() => setFilter(value)} style={[styles.filter, value === filter && styles.filterActive]}><Text style={[styles.filterText, value === filter && styles.filterTextActive]}>{value === 'ALL' ? 'All' : value.replace('_', ' ').toLowerCase()}</Text></Pressable>)}</View>
      {historyLoading && !rows.length ? <ActivityIndicator color={BRAND.red} style={styles.loader} /> : rows.length ? <Surface style={styles.list}>{rows.map((entry, index) => { const visual = entryVisual(entry.type); return <View key={entry.id} style={[styles.row, index < rows.length - 1 && styles.border]}><IconBadge accent={visual.accent} size={44}>{visual.icon}</IconBadge><View style={styles.main}><Text numberOfLines={1} style={styles.name}>{entry.title}</Text><Text numberOfLines={1} style={styles.meta}>{entry.subtitle || entry.status || entry.type.replace('_', ' ')}</Text><Text style={styles.date}>{new Date(entry.occurredAt).toLocaleString()}</Text></View>{entry.quantity != null ? <Text style={styles.qty}>{entry.type === 'RELEASE' ? '−' : '+'}{entry.quantity}</Text> : null}</View>; })}</Surface> : <EmptyState title="No activity yet" message={mine ? 'You have not completed any matching inventory work.' : 'Completed stock-room work will appear here.'} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingBottom: 110 }, title: { marginTop: 5 }, subtitle: { marginTop: 3, marginBottom: 16, color: BRAND.muted, fontFamily: TYPE.body, fontSize: 13 },
  mineRow: { minHeight: 68, borderRadius: 16, backgroundColor: BRAND.canvas, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mineTitle: { color: BRAND.ink, fontFamily: TYPE.body, fontSize: 14, fontWeight: '700' }, mineHelp: { marginTop: 2, color: BRAND.muted, fontFamily: TYPE.body, fontSize: 11 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginVertical: 14 }, filter: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 18, backgroundColor: BRAND.canvas }, filterActive: { backgroundColor: BRAND.ink }, filterText: { color: BRAND.inkSoft, fontFamily: TYPE.body, fontSize: 12, fontWeight: '600', textTransform: 'capitalize' }, filterTextActive: { color: BRAND.white },
  loader: { marginTop: 30 }, list: { overflow: 'hidden' }, row: { minHeight: 82, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }, border: { borderBottomWidth: 1, borderBottomColor: BRAND.line }, main: { flex: 1, minWidth: 0 }, name: { color: BRAND.ink, fontFamily: TYPE.body, fontSize: 14, fontWeight: '700' }, meta: { marginTop: 2, color: BRAND.inkSoft, fontFamily: TYPE.body, fontSize: 12 }, date: { marginTop: 3, color: BRAND.muted, fontFamily: TYPE.body, fontSize: 10 }, qty: { color: BRAND.ink, fontFamily: TYPE.body, fontSize: 15, fontWeight: '700' },
});
