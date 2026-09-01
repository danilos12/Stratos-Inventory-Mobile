import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { AlertTriangle, ClipboardCheck, Download, RotateCcw, Upload } from 'lucide-react-native';

import { IconBadge, StatusChip } from '@/components/inventory-ui';
import { EmptyState, Screen, SearchField, Title } from '@/components/ui';
import { BRAND, TYPE } from '@/constants/brand';
import { openOperationalTask, operationalTaskLabel } from '@/lib/inventory-navigation';
import { useSyncedData } from '@/providers/data-provider';
import type { OperationalTask, OperationalTaskKind } from '@/types/domain';

type Filter = 'ALL' | OperationalTaskKind;

const iconFor = (task: OperationalTask) => {
  if (task.kind === 'STOCK_IN') return <Download size={24} color={BRAND.green} />;
  if (task.kind === 'RELEASE') return <Upload size={24} color={BRAND.red} />;
  if (task.kind === 'RETURN') return <RotateCcw size={24} color={BRAND.blue} />;
  if (task.kind === 'COUNT') return <ClipboardCheck size={24} color={BRAND.violet} />;
  return <AlertTriangle size={24} color={BRAND.amber} />;
};

const accentFor = (kind: OperationalTaskKind) => kind === 'STOCK_IN' ? 'green' : kind === 'RELEASE' ? 'red' : kind === 'RETURN' ? 'blue' : kind === 'COUNT' ? 'violet' : 'amber';

export default function TasksScreen() {
  const params = useLocalSearchParams<{ kind?: string }>();
  const { workspace, refreshing, refresh } = useSyncedData();
  const initial = ['STOCK_IN', 'RELEASE', 'RETURN', 'COUNT', 'LOW_STOCK'].includes(String(params.kind)) ? params.kind as Filter : 'ALL';
  const [filter, setFilter] = useState<Filter>(initial);
  const [query, setQuery] = useState('');
  const filters: Filter[] = ['ALL', 'STOCK_IN', 'RELEASE', 'RETURN', 'COUNT'];
  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return workspace.tasks.filter((task) => (filter === 'ALL' || task.kind === filter) && (!needle || `${task.title} ${task.subtitle || ''}`.toLowerCase().includes(needle)));
  }, [filter, query, workspace.tasks]);

  return (
    <Screen scroll={false} contentStyle={styles.screen}>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={refresh}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.gap} />}
        ListHeaderComponent={<>
          <Title style={styles.title}>Tasks</Title>
          <Text style={styles.subtitle}>Operational work for {workspace.warehouses.find((room) => room.id === workspace.selectedWarehouseId)?.name || 'your stock room'}</Text>
          <SearchField value={query} onChangeText={setQuery} placeholder="Search tasks" />
          <View style={styles.filters}>{filters.map((value) => <Pressable key={value} onPress={() => setFilter(value)} style={[styles.filter, value === filter && styles.filterActive]}><Text style={[styles.filterText, value === filter && styles.filterTextActive]}>{value === 'ALL' ? 'All' : operationalTaskLabel(value)}</Text></Pressable>)}</View>
          <Text style={styles.count}>{rows.length} pending</Text>
        </>}
        ListEmptyComponent={<EmptyState title="No matching tasks" message="Pull to refresh or choose another task type." />}
        renderItem={({ item }) => (
          <Pressable onPress={() => openOperationalTask(item)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
            <IconBadge accent={accentFor(item.kind)} size={50}>{iconFor(item)}</IconBadge>
            <View style={styles.main}><Text numberOfLines={1} style={styles.name}>{item.title}</Text><Text numberOfLines={1} style={styles.meta}>{item.subtitle || operationalTaskLabel(item.kind)}{item.dueAt ? ` · ${new Date(item.dueAt).toLocaleDateString()}` : ''}</Text></View>
            <StatusChip label={item.priority[0] + item.priority.slice(1).toLowerCase()} accent={item.priority === 'HIGH' ? 'red' : item.priority === 'MEDIUM' ? 'amber' : 'green'} compact />
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingBottom: 92 }, list: { paddingBottom: 32 }, gap: { height: 10 },
  title: { marginTop: 5 }, subtitle: { marginTop: 3, marginBottom: 17, color: BRAND.muted, fontFamily: TYPE.body, fontSize: 13 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 13, marginBottom: 13 },
  filter: { minHeight: 34, borderRadius: 18, backgroundColor: BRAND.canvas, paddingHorizontal: 13, alignItems: 'center', justifyContent: 'center' },
  filterActive: { backgroundColor: BRAND.red },
  filterText: { color: BRAND.inkSoft, fontFamily: TYPE.body, fontSize: 12, fontWeight: '600' },
  filterTextActive: { color: BRAND.white },
  count: { marginBottom: 10, color: BRAND.muted, fontFamily: TYPE.body, fontSize: 12 },
  row: { minHeight: 82, borderRadius: 17, borderWidth: 1, borderColor: BRAND.line, backgroundColor: BRAND.white, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  pressed: { opacity: 0.72 }, main: { flex: 1, minWidth: 0 },
  name: { color: BRAND.ink, fontFamily: TYPE.body, fontSize: 15, fontWeight: '700' },
  meta: { marginTop: 4, color: BRAND.muted, fontFamily: TYPE.body, fontSize: 12 },
});
