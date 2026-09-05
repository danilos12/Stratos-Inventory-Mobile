import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Crypto from 'expo-crypto';
import { router, useLocalSearchParams } from 'expo-router';
import { CheckSquare, Square } from 'lucide-react-native';
import { PageHeader, RedButton, StatusChip, Surface } from '@/components/inventory-ui';
import { AdditionalFormFields, mergeAdditionalFieldsIntoNotes, type AdditionalFormField } from '@/components/additional-form-fields';
import { LoadingScreen, Screen } from '@/components/ui';
import { BRAND, TYPE } from '@/constants/brand';
import { fetchStorageContainer, removeContainerItems } from '@/lib/api';
import { getInstallationId } from '@/lib/storage';
import { useAuth } from '@/providers/auth-provider';
import type { StorageContainer } from '@/types/domain';

export default function RemoveContainerItemsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); const { session } = useAuth();
  const [data, setData] = useState<StorageContainer | null>(null); const [qtys, setQtys] = useState<Record<number, number>>({}); const [additionalFields, setAdditionalFields] = useState<AdditionalFormField[]>([]); const [busy, setBusy] = useState(false);
  useEffect(() => { if (session && id) void fetchStorageContainer(session.token, id).then(setData).catch((e) => Alert.alert('Unable to open', e.message)); }, [id, session]);
  if (!data) return <LoadingScreen label="Loading contents" />;
  const container = data; const selected = container.items.filter((row) => (qtys[row.id] || 0) > 0);
  async function submit() {
    if (!session || !selected.length) return; setBusy(true);
    try {
      await removeContainerItems(session.token, container.id, { shelfId: container.shelfId || undefined, idempotencyKey: Crypto.randomUUID(), deviceId: await getInstallationId(), lines: selected.map((row) => ({ clientLineId: String(row.id), itemId: row.inventoryItemId, qty: qtys[row.id], unit: row.item.unit, batchId: row.batch?.id, condition: row.condition, reservedQty: Math.min(row.reservedQty, qtys[row.id]), notes: mergeAdditionalFieldsIntoNotes('', additionalFields) || undefined } as any)) });
      Alert.alert('Items removed', 'The items remain in stock and are now recorded on the shelf.', [{ text: 'Done', onPress: () => router.replace({ pathname: '/container/[id]', params: { id: String(container.id) } } as never) }]);
    } catch (e) { Alert.alert('Not completed', e instanceof Error ? e.message : 'Try again.'); } finally { setBusy(false); }
  }
  return <Screen><PageHeader title="Remove item" /><Text style={styles.help}>Select only items you physically removed from {container.containerId}. This does not release stock.</Text><View style={styles.top}><Text style={styles.heading}>Contents</Text><StatusChip label={`${selected.length} selected`} accent="violet" /></View>{container.items.map((row) => { const active = (qtys[row.id] || 0) > 0; return <Surface key={row.id} style={styles.row}><Pressable onPress={() => setQtys((values) => ({ ...values, [row.id]: active ? 0 : row.qty }))}>{active ? <CheckSquare size={23} color={BRAND.red} /> : <Square size={23} color={BRAND.muted} />}</Pressable><View style={styles.main}><Text style={styles.name}>{row.item.name}</Text><Text style={styles.help}>In container: {row.qty} {row.item.unit}</Text></View><TextInput editable={active} value={active ? String(qtys[row.id]) : ''} onChangeText={(value) => setQtys((values) => ({ ...values, [row.id]: Math.min(row.qty, Math.max(0, Number(value) || 0)) }))} keyboardType="decimal-pad" placeholder="Qty" style={styles.qty} /></Surface>})}<AdditionalFormFields fields={additionalFields} onChange={setAdditionalFields} /><RedButton disabled={!selected.length || busy} onPress={submit}>{busy ? 'Removing…' : 'Remove Selected Items'}</RedButton></Screen>;
}
const styles = StyleSheet.create({ help: { color: BRAND.muted, fontFamily: TYPE.body, fontSize: 12, lineHeight: 17 }, top: { marginTop: 19, marginBottom: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, heading: { color: BRAND.ink, fontFamily: TYPE.body, fontSize: 18, fontWeight: '800' }, row: { minHeight: 69, marginBottom: 8, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 10 }, main: { flex: 1 }, name: { color: BRAND.ink, fontFamily: TYPE.body, fontSize: 14, fontWeight: '700' }, qty: { width: 62, height: 42, borderRadius: 10, borderWidth: 1, borderColor: BRAND.line, textAlign: 'center', color: BRAND.ink } });
