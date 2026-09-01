import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { EmptyState, Screen, SearchField, SyncBadge, Title } from '@/components/ui';
import { BRAND, TYPE } from '@/constants/brand';
import { useSyncedData } from '@/providers/data-provider';
import type { InventoryItem } from '@/types/domain';

type Filter = 'ALL' | 'AVAILABLE' | 'LOW' | 'DEFECTIVE';

export default function InventoryScreen() {
  const { inventory, refreshing, isOffline, refresh } = useSyncedData();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('ALL');
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return inventory.filter((item) => {
      const matchesText = !needle || [item.name, item.sku, item.barcode, item.productCode, item.category, item.location, item.serialNumber].some((value) => String(value || '').toLowerCase().includes(needle));
      const matchesFilter = filter === 'ALL'
        || (filter === 'AVAILABLE' && Number(item.totalAvailable) > 0)
        || (filter === 'LOW' && Number(item.minStock) > 0 && Number(item.totalAvailable) < Number(item.minStock))
        || (filter === 'DEFECTIVE' && item.conditionStatus === 'DEFECTIVE');
      return matchesText && matchesFilter;
    });
  }, [filter, inventory, query]);

  function openItem(item: InventoryItem) {
    router.push({ pathname: '/inventory/[id]', params: { id: String(item.id) } });
  }

  return (
    <Screen scroll={false} contentStyle={styles.screen}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={refresh}
        contentContainerStyle={styles.list}
        ListHeaderComponent={<>
          <View style={styles.topline}><Title>Inventory</Title><SyncBadge offline={isOffline} refreshing={refreshing} /></View>
          <SearchField value={query} onChangeText={setQuery} placeholder="Item, SKU or barcode" onScan={() => router.push('/scanner')} />
          <View style={styles.filters}>
            {(['ALL', 'AVAILABLE', 'LOW', 'DEFECTIVE'] as Filter[]).map((value) => (
              <Pressable key={value} onPress={() => setFilter(value)} style={[styles.filter, filter === value && styles.filterActive]}>
                <Text style={[styles.filterText, filter === value && styles.filterTextActive]}>{value === 'ALL' ? 'All' : value.toLowerCase()}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.resultCount}>{filtered.length.toLocaleString()} items</Text>
        </>}
        ListEmptyComponent={<EmptyState title="No items" message="Adjust the search or filter." />}
        renderItem={({ item }) => {
          const defective = item.conditionStatus === 'DEFECTIVE';
          const isLow = !defective && Number(item.minStock) > 0 && Number(item.totalAvailable) < Number(item.minStock);
          const statusColor = defective ? BRAND.red : isLow ? BRAND.amber : BRAND.green;
          const statusLabel = defective ? 'Defective' : isLow ? 'Low' : 'Ready';
          return (
            <Pressable onPress={() => openItem(item)} style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
              <View style={styles.itemMain}>
                <Text numberOfLines={1} style={styles.itemName}>{item.name}</Text>
                <Text numberOfLines={1} style={styles.itemMeta}>{item.sku || item.barcode}{item.location ? ` · ${item.location}` : ''}</Text>
              </View>
              <View style={styles.quantity}>
                <Text style={styles.quantityValue}>{Number(item.totalAvailable).toLocaleString()}</Text>
                <View style={styles.statusRow}>
                  <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                  <Text style={styles.statusLabel}>{statusLabel}</Text>
                </View>
              </View>
            </Pressable>
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingBottom: 78 },
  list: { paddingBottom: 30 },
  separator: { height: 8 },
  topline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, marginTop: 4 },
  filters: { flexDirection: 'row', gap: 6, marginTop: 12, marginBottom: 14 },
  filter: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: BRAND.canvas },
  filterActive: { backgroundColor: BRAND.ink },
  filterText: { color: BRAND.inkSoft, fontFamily: TYPE.body, fontSize: 13, fontWeight: '500' },
  filterTextActive: { color: BRAND.white },
  resultCount: { marginBottom: 10, color: BRAND.muted, fontFamily: TYPE.body, fontSize: 12 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1, borderColor: BRAND.line, backgroundColor: BRAND.white, padding: 13 },
  pressed: { opacity: 0.7 },
  itemMain: { flex: 1, minWidth: 0 },
  itemName: { color: BRAND.ink, fontFamily: TYPE.body, fontSize: 14, fontWeight: '600' },
  itemMeta: { marginTop: 3, color: BRAND.muted, fontFamily: TYPE.body, fontSize: 12 },
  quantity: { alignItems: 'flex-end', gap: 4 },
  quantityValue: { color: BRAND.ink, fontFamily: TYPE.body, fontSize: 18, fontWeight: '600' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusLabel: { color: BRAND.muted, fontFamily: TYPE.body, fontSize: 11 },
});
