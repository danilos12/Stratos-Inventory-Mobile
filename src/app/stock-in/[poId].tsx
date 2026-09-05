import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import * as Crypto from 'expo-crypto';
import { useLocalSearchParams, router } from 'expo-router';
import { Box, CalendarDays, ClipboardList, Hash, MapPin, Shield, Truck, Upload } from 'lucide-react-native';

import { PageHeader, RedButton, Stepper, StatusChip, Surface, WorkflowBottomBar } from '@/components/inventory-ui';
import { AdditionalFormFields, mergeAdditionalFieldsIntoNotes, toAdditionalFieldSubmissions, type AdditionalFormField } from '@/components/additional-form-fields';
import { PhotoEvidence, type LocalPhoto } from '@/components/photo-evidence';
import { EmptyState, LoadingScreen, Screen } from '@/components/ui';
import { BRAND, TYPE } from '@/constants/brand';
import { absoluteAssetUrl, fetchPurchaseOrderWork, receivePurchaseOrder, uploadWorkflowPhoto } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { useSyncedData } from '@/providers/data-provider';
import type { PurchaseOrderWork } from '@/types/domain';

export default function StockInScreen() {
  const { poId: rawPoId, itemId: rawItemId } = useLocalSearchParams<{ poId: string; itemId?: string }>();
  const poId = Number(rawPoId); const preferredItemId = Number(rawItemId);
  const { session } = useAuth(); const { selectedWarehouseId, refresh } = useSyncedData();
  const [order, setOrder] = useState<PurchaseOrderWork | null>(null); const [loading, setLoading] = useState(true); const [submitting, setSubmitting] = useState(false);
  const [quantity, setQuantity] = useState(''); const [batch, setBatch] = useState(''); const [location, setLocation] = useState(''); const [notes, setNotes] = useState(''); const [photos, setPhotos] = useState<LocalPhoto[]>([]);
  const [additionalFields, setAdditionalFields] = useState<AdditionalFormField[]>([]);

  const load = useCallback(async () => { if (!session || !poId) return; setLoading(true); try { const result = await fetchPurchaseOrderWork(session.token, poId); setOrder(result); const resultLines = result.items || result.PurchaseOrderItem || []; const firstLine = resultLines.find((row) => row.itemId === preferredItemId) || resultLines.find((row) => Number(row.quantity) > Number(row.receivedQty)) || resultLines[0]; if (firstLine) setQuantity(String(Math.max(0, Number(firstLine.quantity) - Number(firstLine.receivedQty || 0)))); } catch (error) { Alert.alert('Purchase order unavailable', error instanceof Error ? error.message : 'Unable to load this receipt.'); } finally { setLoading(false); } }, [poId, preferredItemId, session]);
  useEffect(() => { const task = setTimeout(load, 0); return () => clearTimeout(task); }, [load]);
  const lines = useMemo(() => order?.items || order?.PurchaseOrderItem || [], [order]);
  const line = useMemo(() => lines.find((row) => row.itemId === preferredItemId) || lines.find((row) => Number(row.quantity) > Number(row.receivedQty)) || lines[0], [lines, preferredItemId]);
  const remaining = line ? Math.max(0, Number(line.quantity) - Number(line.receivedQty || 0)) : 0;

  async function submit() {
    const qty = Number(quantity);
    if (!session || !order || !line || !selectedWarehouseId) return;
    if (!Number.isFinite(qty) || qty <= 0 || qty > remaining) { Alert.alert('Check quantity', `Enter a quantity from 1 to ${remaining}.`); return; }
    if (!photos.length) { Alert.alert('Delivery photo required', 'Take or select a delivery receipt photo before confirming.'); return; }
    setSubmitting(true);
    try {
      const evidence = await uploadWorkflowPhoto(session.token, { ...photos[0], kind: 'DELIVERY_RECEIPT' });
      await receivePurchaseOrder(session.token, order.id, { warehouseId: selectedWarehouseId, items: [{ poItemId: line.id, receivedQty: qty }], drNumber: batch.trim() || null, remarks: mergeAdditionalFieldsIntoNotes([location.trim(), notes.trim()].filter(Boolean).join(' · '), additionalFields), receivedDate: new Date().toISOString(), idempotencyKey: Crypto.randomUUID(), evidenceId: evidence.id, ...(additionalFields.length ? { additionalFields: toAdditionalFieldSubmissions(additionalFields) } : {}) });
      await refresh(); Alert.alert('Stock received', `${qty} ${line.unit || 'units'} were posted to inventory.`, [{ text: 'Done', onPress: () => router.replace('/history' as never) }]);
    } catch (error) { Alert.alert('Stock not received', error instanceof Error ? error.message : 'Please retry.'); } finally { setSubmitting(false); }
  }

  if (loading) return <LoadingScreen label="Loading purchase order" />;
  if (!order || !line) return <Screen><PageHeader title="Stock In" scan /><EmptyState error title="No receivable item" message="This purchase order has no lines waiting to be received." /></Screen>;
  const item = line.item;
  return (
    <Screen contentStyle={styles.screen} footer={<WorkflowBottomBar active="tasks" />}>
      <PageHeader title="Stock In" scan />
      <Stepper current={2} labels={['Scan', 'Details', 'Confirm']} />
      <Surface style={styles.itemCard}><View style={styles.imageWrap}>{item?.imageUrl ? <Image source={{ uri: absoluteAssetUrl(item.imageUrl) || undefined }} contentFit="contain" style={styles.image} /> : <Box size={44} color={BRAND.muted} />}</View><View style={styles.itemMain}><Text style={styles.itemName}>{item?.name || line.description}</Text><Text style={styles.itemCode}>{item?.barcode || item?.sku || `Item ${line.itemId}`}</Text><StatusChip label="✓  Item Scanned" accent="green" /></View></Surface>

      <Surface style={styles.form}>
        <Info icon={<ClipboardList size={20} color={BRAND.violet} />} label="Purchase Order" value={order.poNo} />
        <Info icon={<Truck size={20} color={BRAND.green} />} label="Supplier" value={order.supplierName || 'Assigned supplier'} />
        <Field icon={<Hash size={21} color={BRAND.blue} />} label="Quantity Received" value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" />
        <Field icon={<CalendarDays size={20} color={BRAND.amber} />} label="DR / Batch Number" value={batch} onChangeText={setBatch} placeholder="Delivery reference" />
        <Info icon={<Shield size={20} color={BRAND.amber} />} label="Warranty" value={item?.warrantyPeriod || 'No Warranty'} />
        <Field icon={<MapPin size={20} color={BRAND.violet} />} label="Storage Location" value={location} onChangeText={setLocation} placeholder="Rack · Shelf · Bin" last />
      </Surface>

      <Surface style={styles.photoCard}><PhotoEvidence label="Delivery receipt photo" hint="Required proof for this stock receipt" photos={photos} onChange={setPhotos} /></Surface>
      <TextInput multiline textAlignVertical="top" value={notes} onChangeText={setNotes} placeholder="Receiving notes (optional)" placeholderTextColor={BRAND.muted} style={styles.notes} />
      <AdditionalFormFields fields={additionalFields} onChange={setAdditionalFields} />
      <RedButton disabled={submitting} icon={<Upload size={23} color={BRAND.white} />} onPress={submit}>{submitting ? 'Posting receipt…' : 'Continue to Confirm'}</RedButton>
    </Screen>
  );
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <View style={styles.row}><View style={styles.rowIcon}>{icon}</View><Text style={styles.rowLabel}>{label}</Text><Text numberOfLines={2} style={styles.rowValue}>{value}</Text></View>; }
function Field({ icon, label, value, onChangeText, placeholder, keyboardType, last = false }: { icon: React.ReactNode; label: string; value: string; onChangeText: (value: string) => void; placeholder?: string; keyboardType?: 'decimal-pad'; last?: boolean }) { return <View style={[styles.row, last && styles.last]}><View style={styles.rowIcon}>{icon}</View><Text style={styles.rowLabel}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={BRAND.muted} keyboardType={keyboardType} style={styles.rowInput} /></View>; }

const styles = StyleSheet.create({
  screen: { paddingHorizontal: 16, paddingTop: 0, paddingBottom: 32 }, itemCard: { padding: 12, flexDirection: 'row', alignItems: 'center', gap: 14 }, imageWrap: { width: 105, height: 105, borderRadius: 13, backgroundColor: BRAND.canvas, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, image: { width: '100%', height: '100%' }, itemMain: { flex: 1, alignItems: 'flex-start' }, itemName: { color: BRAND.ink, fontFamily: TYPE.body, fontSize: 20, fontWeight: '700' }, itemCode: { marginTop: 3, marginBottom: 8, color: BRAND.inkSoft, fontFamily: TYPE.mono, fontSize: 13 },
  form: { marginTop: 12, overflow: 'hidden' }, row: { minHeight: 68, borderBottomWidth: 1, borderBottomColor: BRAND.line, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }, last: { borderBottomWidth: 0 }, rowIcon: { width: 38, height: 38, borderRadius: 11, backgroundColor: BRAND.canvas, alignItems: 'center', justifyContent: 'center' }, rowLabel: { flex: 1, color: BRAND.ink, fontFamily: TYPE.body, fontSize: 14, fontWeight: '600' }, rowValue: { maxWidth: '45%', color: BRAND.ink, fontFamily: TYPE.body, fontSize: 14, fontWeight: '700', textAlign: 'right' }, rowInput: { width: '43%', minHeight: 44, color: BRAND.ink, fontFamily: TYPE.body, fontSize: 14, fontWeight: '700', textAlign: 'right', paddingHorizontal: 8 },
  photoCard: { marginTop: 12, padding: 14 }, notes: { minHeight: 92, marginVertical: 12, borderRadius: 15, borderWidth: 1, borderColor: BRAND.line, backgroundColor: BRAND.white, color: BRAND.ink, fontFamily: TYPE.body, fontSize: 14, padding: 14 },
});
