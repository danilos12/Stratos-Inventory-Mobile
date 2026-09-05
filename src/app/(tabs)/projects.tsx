import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { EmptyState, Pill, Screen, SearchField, Title } from '@/components/ui';
import { BRAND, TYPE } from '@/constants/brand';
import { useSyncedData } from '@/providers/data-provider';
import { useAuth } from '@/providers/auth-provider';
import { fetchInventoryProjects } from '@/lib/api';
import type { InventoryProjectSummary } from '@/types/domain';

type ProjectFilter = 'ACTIVE' | 'COMPLETED' | 'ALL';

export default function ProjectsScreen() {
  const { session } = useAuth();
  const { refreshing, refresh } = useSyncedData();
  const [summaries, setSummaries] = useState<InventoryProjectSummary[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ProjectFilter>('ACTIVE');
  useEffect(() => { if (session) void fetchInventoryProjects(session.token).then((result) => setSummaries(result.data)).catch(() => undefined); }, [session]);
  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return summaries.filter((project) => {
      const status = project.status.toLowerCase();
      const statusMatch = filter === 'ALL' || (filter === 'ACTIVE' && status === 'active') || (filter === 'COMPLETED' && status === 'completed');
      const searchMatch = !needle || [project.name, project.projectCode, project.client?.name].some((value) => String(value || '').toLowerCase().includes(needle));
      return statusMatch && searchMatch;
    });
  }, [filter, summaries, query]);

  return (
    <Screen scroll={false} contentStyle={styles.screen}>
      <FlatList
        data={rows}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={async () => { await refresh(); if (session) await fetchInventoryProjects(session.token).then((result) => setSummaries(result.data)).catch(() => undefined); }}
        ItemSeparatorComponent={() => <View style={styles.gap} />}
        ListHeaderComponent={<>
          <Title style={styles.title}>Projects</Title>
          <SearchField value={query} onChangeText={setQuery} placeholder="Name, code or client" />
          <View style={styles.filters}>{(['ACTIVE', 'COMPLETED', 'ALL'] as ProjectFilter[]).map((value) => (
            <Pressable key={value} onPress={() => setFilter(value)} style={[styles.filter, filter === value && styles.filterActive]}><Text style={[styles.filterText, filter === value && styles.filterTextActive]}>{value.toLowerCase()}</Text></Pressable>
          ))}</View>
          <Text style={styles.count}>{rows.length} shown</Text>
        </>}
        ListEmptyComponent={<EmptyState title="No projects" message="Change the filter or pull to sync." />}
        renderItem={({ item }) => {
          const completed = item.status.toLowerCase() === 'completed';
          return (
            <Pressable onPress={() => router.push({ pathname: '/projects/[id]', params: { id: String(item.id) } })} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
              <View style={styles.cardTop}>
                <View style={styles.projectMain}>
                  <Text numberOfLines={1} style={styles.name}>{item.name}</Text>
                  <Text numberOfLines={1} style={styles.code}>{item.projectCode || `STRATOS-${item.id}`}{item.client?.name ? ` · ${item.client.name}` : ''}</Text>
                </View>
                <Pill label={item.status.replaceAll('_', ' ')} tone={completed ? 'green' : 'blue'} />
              </View>
              <View style={styles.inventorySummary}><Text style={styles.inventoryMetric}>{item.reservedItemTypes || 0} reserved types</Text><Text style={styles.inventoryMetric}>{item.releasedItemTypes || 0} released types</Text><Text style={styles.inventoryMetric}>{item.excessItemsPendingReturn || 0} excess pending</Text></View>
              <Text style={styles.activity}>{item.latestInventoryActivity ? `Latest: ${item.latestInventoryActivity.transactionType.replaceAll('_', ' ')} · ${new Date(item.latestInventoryActivity.createdAt).toLocaleDateString()}` : 'No inventory activity yet'}</Text>
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingBottom: 78 }, list: { paddingBottom: 30 }, gap: { height: 8 },
  title: { marginBottom: 16 },
  filters: { flexDirection: 'row', gap: 6, marginTop: 12, marginBottom: 14 },
  filter: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: BRAND.canvas },
  filterActive: { backgroundColor: BRAND.ink },
  filterText: { color: BRAND.inkSoft, fontFamily: TYPE.body, fontSize: 13, fontWeight: '500' },
  filterTextActive: { color: BRAND.white },
  count: { marginBottom: 10, color: BRAND.muted, fontFamily: TYPE.body, fontSize: 12 },
  card: { borderRadius: 14, borderWidth: 1, borderColor: BRAND.line, backgroundColor: BRAND.white, padding: 14 },
  pressed: { opacity: 0.7 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  projectMain: { flex: 1, minWidth: 0 },
  name: { color: BRAND.ink, fontFamily: TYPE.body, fontSize: 14, fontWeight: '600' },
  code: { marginTop: 3, color: BRAND.muted, fontFamily: TYPE.body, fontSize: 12 },
  progressTrack: { height: 4, marginTop: 12, backgroundColor: BRAND.canvas, borderRadius: 999, overflow: 'hidden' },
  progressBar: { height: '100%', backgroundColor: BRAND.ink, borderRadius: 999 },
  inventorySummary: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  inventoryMetric: { borderRadius: 7, backgroundColor: BRAND.canvas, paddingHorizontal: 7, paddingVertical: 5, color: BRAND.inkSoft, fontFamily: TYPE.body, fontSize: 9, fontWeight: '600' },
  activity: { marginTop: 7, color: BRAND.muted, fontFamily: TYPE.body, fontSize: 9 },
});
