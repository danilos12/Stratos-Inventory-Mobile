import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Box, MapPin, Package, ScanLine } from 'lucide-react-native';

import { PageHeader, RedButton, StatusChip, Surface } from '@/components/inventory-ui';
import { EmptyState, LoadingScreen, Screen } from '@/components/ui';
import { BRAND, TYPE } from '@/constants/brand';
import { fetchStockRoomShelf } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import type { StockRoomShelfDetails } from '@/types/domain';

export default function ShelfScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); const { session } = useAuth();
  const [data, setData] = useState<StockRoomShelfDetails | null>(null); const [error, setError] = useState('');
  useEffect(() => { if (session && id) void fetchStockRoomShelf(session.token, id).then(setData).catch((reason) => setError(reason instanceof Error ? reason.message : 'Shelf unavailable')); }, [id, session]);
  if (!data && !error) return <LoadingScreen label="Opening shelf" />;
  return <Screen><PageHeader title={data?.name || 'Shelf'} scan />{error ? <EmptyState error title="Shelf unavailable" message={error} /> : data ? <>
    <Surface style={styles.hero}><View style={styles.icon}><MapPin size={25} color={BRAND.violet} /></View><View style={styles.main}><Text style={styles.title}>{data.rack.name} → {data.name}</Text><Text style={styles.code}>{data.barcode}</Text></View><StatusChip label={data.storageMethod.replaceAll('_', ' ')} accent="violet" compact /></Surface>
    <Text style={styles.heading}>Containers</Text>{data.containers.length ? data.containers.map((container) => <Surface key={container.id} onPress={() => router.push({ pathname: '/container/[id]', params: { id: String(container.id) } } as never)} style={styles.row}><Box size={22} color={container.type === 'MOVABLE_PROJECT' ? BRAND.violet : BRAND.red} /><View style={styles.main}><Text style={styles.name}>{container.name}</Text><Text style={styles.code}>{container.containerId} · {container.type === 'MOVABLE_PROJECT' ? 'Movable project container' : 'Fixed bin'}</Text></View></Surface>) : <EmptyState title="No containers" message="This shelf may be intended for bulky shelf-only items." />}
    <Text style={styles.heading}>Shelf-only items</Text>{data.shelfOnlyItems.length ? data.shelfOnlyItems.map((row) => <Surface key={row.item.id} style={styles.row}><Package size={22} color={BRAND.green} /><View style={styles.main}><Text style={styles.name}>{row.item.name}</Text><Text style={styles.code}>{row.item.barcode || row.item.sku}</Text></View><Text style={styles.qty}>{row.qty} {row.item.unit}</Text></Surface>) : <Text style={styles.emptyText}>No shelf-only quantity is recorded here.</Text>}
    <RedButton icon={<ScanLine size={21} color={BRAND.white} />} onPress={() => router.push('/scanner' as never)}>Scan another label</RedButton>
  </> : null}</Screen>;
}

const styles = StyleSheet.create({ hero: { padding: 16, flexDirection: 'row', alignItems: 'center', gap: 11 }, icon: { width: 48, height: 48, borderRadius: 14, backgroundColor: BRAND.violetSoft, alignItems: 'center', justifyContent: 'center' }, main: { flex: 1, minWidth: 0 }, title: { color: BRAND.ink, fontFamily: TYPE.body, fontSize: 17, fontWeight: '800' }, heading: { marginTop: 22, marginBottom: 10, color: BRAND.ink, fontFamily: TYPE.body, fontSize: 19, fontWeight: '800' }, row: { minHeight: 68, marginBottom: 8, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 11 }, name: { color: BRAND.ink, fontFamily: TYPE.body, fontSize: 14, fontWeight: '700' }, code: { marginTop: 3, color: BRAND.muted, fontFamily: TYPE.body, fontSize: 11 }, qty: { color: BRAND.red, fontFamily: TYPE.body, fontWeight: '800' }, emptyText: { marginBottom: 20, color: BRAND.muted, fontFamily: TYPE.body, fontSize: 13 } });
