import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Bookmark, Box, CalendarDays, Check, ClipboardCheck, Copy, Download, MapPin,
  RefreshCcw, Shield, ShieldCheck, TrendingUp, Upload,
} from 'lucide-react-native';

import { DetailRow, OutlineButton, PageHeader, RedButton, SectionTitle, StatCard, StatusChip, Surface, WorkflowBottomBar } from '@/components/inventory-ui';
import { EmptyState, LoadingScreen, Screen } from '@/components/ui';
import { BRAND, TYPE } from '@/constants/brand';
import { absoluteAssetUrl, fetchInventoryItem } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { useSyncedData } from '@/providers/data-provider';
import type { InventoryItemDetails } from '@/types/domain';

export default function InventoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const itemId = Number(id);
  const { session } = useAuth();
  const { inventory, loading: catalogLoading } = useSyncedData();
  const [item, setItem] = useState<InventoryItemDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session || !Number.isInteger(itemId) || catalogLoading) return;
    const cached = inventory.find((row) => row.id === itemId);
    if (!cached) { setError('This item is not part of your organization inventory.'); setLoading(false); return; }
    setLoading(true); setError(null);
    try { setItem(await fetchInventoryItem(session.token, itemId)); }
    catch (requestError) { setItem(cached); setError(requestError instanceof Error ? requestError.message : 'Unable to refresh item.'); }
    finally { setLoading(false); }
  }, [catalogLoading, inventory, itemId, session]);

  useEffect(() => { const task = setTimeout(load, 0); return () => clearTimeout(task); }, [load]);
  const isAvailable = useMemo(() => Boolean(item && Number(item.totalAvailable) > 0 && item.conditionStatus !== 'DEFECTIVE'), [item]);

  if (loading && !item) return <LoadingScreen label="Loading item" />;
  if (!item) return <Screen><PageHeader title="Item Details" scan /><EmptyState error title="Item unavailable" message={error || 'The inventory record could not be found.'} /></Screen>;

  const code = item.barcode || item.productCode || item.sku;
  return (
    <Screen refreshing={loading} onRefresh={load} contentStyle={styles.screen} footer={<WorkflowBottomBar active="home" />}>
      <PageHeader title="Item Details" scan />
      <Surface style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.imageWrap}>
            {item.imageUrl ? <Image source={{ uri: absoluteAssetUrl(item.imageUrl) || undefined }} contentFit="contain" transition={160} style={styles.image} /> : <Box size={58} color={BRAND.muted} strokeWidth={1.3} />}
          </View>
          <View style={styles.heroMain}>
            <Text style={styles.name}>{item.name}</Text>
            <Text numberOfLines={2} style={styles.description}>{item.description || item.category || 'Inventory item'}</Text>
            <Pressable onPress={() => Alert.alert('Item code', code)} style={styles.codeRow}><Text numberOfLines={1} style={styles.code}>{code}</Text><Copy size={17} color={BRAND.inkSoft} /></Pressable>
            <StatusChip label={isAvailable ? '✓  Available' : item.conditionStatus === 'DEFECTIVE' ? 'Defective' : 'Unavailable'} accent={isAvailable ? 'green' : 'red'} />
          </View>
        </View>

        <View style={styles.stats}>
          <View style={styles.stat}><StatCard icon={<Box size={23} color={BRAND.green} />} label="On Hand" value={item.totalOnHand} accent="green" /></View>
          <View style={styles.stat}><StatCard icon={<Bookmark size={23} color={BRAND.blue} />} label="Reserved" value={item.totalReserved} accent="blue" /></View>
          <View style={styles.stat}><StatCard icon={<Check size={23} color={BRAND.green} />} label="Available" value={item.totalAvailable} accent="green" /></View>
        </View>

        <SectionTitle>Details</SectionTitle>
        <Surface style={styles.details}>
          <DetailRow icon={<MapPin size={18} color={BRAND.violet} />} accent="violet" label="Location" value={item.location || 'Not assigned'} />
          <DetailRow icon={<CalendarDays size={18} color={BRAND.amber} />} accent="amber" label="FIFO Oldest" value={item.fifoBatch?.batchNo || 'No active batch'} />
          <DetailRow icon={<TrendingUp size={18} color={BRAND.green} />} accent="green" label="Movement" value={item.logisticsStatus?.replace(/_/g, ' ') || 'Active'} />
          <DetailRow icon={<ShieldCheck size={18} color={BRAND.blue} />} accent="blue" label="Condition" value={item.conditionStatus || 'Good'} />
          <DetailRow icon={<ClipboardCheck size={18} color={BRAND.violet} />} accent="violet" label="Record State" value={item.lifecycleStatus?.replace(/_/g, ' ') || 'Active'} />
          <DetailRow icon={<Shield size={18} color={BRAND.amber} />} accent="amber" label="Warranty" value={item.hasActiveWarranty && item.warrantyEndAt ? `Until ${new Date(item.warrantyEndAt).toLocaleDateString()}` : item.warrantyPeriod || 'No Warranty'} last />
        </Surface>
      </Surface>

      {error ? <Text style={styles.cacheNote}>Showing the last synchronized record. {error}</Text> : null}
      <View style={styles.actions}>
        <RedButton disabled={!isAvailable} icon={<Upload size={24} color={BRAND.white} />} onPress={() => router.push({ pathname: '/release/[itemId]', params: { itemId: String(item.id) } })}>Release / Issue</RedButton>
        <View style={styles.secondary}>
          <OutlineButton style={styles.secondaryButton} accent="green" icon={<Download size={20} color={BRAND.green} />} onPress={() => router.push('/tasks?kind=STOCK_IN' as never)}>Stock In</OutlineButton>
          <OutlineButton style={styles.secondaryButton} accent="blue" icon={<RefreshCcw size={20} color={BRAND.blue} />} onPress={() => router.push({ pathname: '/return-item', params: { itemId: String(item.id), code } } as never)}>Return</OutlineButton>
          <OutlineButton style={styles.secondaryButton} accent="violet" icon={<ClipboardCheck size={20} color={BRAND.violet} />} onPress={() => router.push('/tasks?kind=COUNT' as never)}>Count</OutlineButton>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: 14, paddingTop: 0, paddingBottom: 40 },
  hero: { padding: 14 }, heroTop: { flexDirection: 'row', gap: 15 },
  imageWrap: { width: '34%', maxWidth: 250, aspectRatio: 1, borderRadius: 15, borderWidth: 1, borderColor: BRAND.line, backgroundColor: BRAND.canvas, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, image: { width: '100%', height: '100%' },
  heroMain: { flex: 1, minWidth: 0, justifyContent: 'center', alignItems: 'flex-start' }, name: { color: BRAND.ink, fontFamily: TYPE.body, fontSize: 22, lineHeight: 27, fontWeight: '700', letterSpacing: -0.35 }, description: { marginTop: 5, color: BRAND.muted, fontFamily: TYPE.body, fontSize: 14, lineHeight: 19 }, codeRow: { maxWidth: '100%', marginTop: 11, marginBottom: 9, flexDirection: 'row', alignItems: 'center', gap: 7 }, code: { flexShrink: 1, color: BRAND.inkSoft, fontFamily: TYPE.mono, fontSize: 14, fontWeight: '600' },
  stats: { marginTop: 18, marginHorizontal: -4, flexDirection: 'row' }, stat: { flex: 1, padding: 4 }, details: { overflow: 'hidden', shadowOpacity: 0 },
  cacheNote: { marginTop: 9, color: BRAND.amber, fontFamily: TYPE.body, fontSize: 11, lineHeight: 16 }, actions: { marginTop: 18, gap: 12 }, secondary: { flexDirection: 'row', marginHorizontal: -4 }, secondaryButton: { flex: 1, marginHorizontal: 4 },
});
