import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import * as Crypto from 'expo-crypto';
import { router, useLocalSearchParams } from 'expo-router';
import { AlertTriangle, Check, Folder, MapPin, MinusCircle, RefreshCcw, ScanLine, UserRound, Wrench } from 'lucide-react-native';

import { IconBadge, PageHeader, RedButton, StatusChip, Surface, WorkflowBottomBar } from '@/components/inventory-ui';
import { AdditionalFormFields, mergeAdditionalFieldsIntoNotes, toAdditionalFieldSubmissions, type AdditionalFormField } from '@/components/additional-form-fields';
import { PhotoEvidence, type LocalPhoto } from '@/components/photo-evidence';
import { Screen } from '@/components/ui';
import { BRAND, TYPE } from '@/constants/brand';
import { absoluteAssetUrl, resolveIssuedItem, submitInventoryReturn, uploadWorkflowPhoto } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { useSyncedData } from '@/providers/data-provider';
import type { IssuedItemWork } from '@/types/domain';

type Condition = 'GOOD' | 'DEFECTIVE' | 'FOR_REPAIR' | 'INCOMPLETE';
const conditions: { value: Condition; label: string; color: string; icon: React.ReactNode }[] = [
  { value: 'GOOD', label: 'Good', color: BRAND.green, icon: <Check size={24} color={BRAND.green} /> },
  { value: 'DEFECTIVE', label: 'Defective', color: BRAND.red, icon: <AlertTriangle size={24} color={BRAND.red} /> },
  { value: 'FOR_REPAIR', label: 'For Repair', color: BRAND.amber, icon: <Wrench size={24} color={BRAND.amber} /> },
  { value: 'INCOMPLETE', label: 'Incomplete', color: BRAND.violet, icon: <MinusCircle size={24} color={BRAND.violet} /> },
];

export default function ReturnItemScreen() {
  const params = useLocalSearchParams<{ code?: string; outId?: string }>(); const { session } = useAuth(); const { selectedWarehouseId, refresh } = useSyncedData();
  const [lookup, setLookup] = useState(params.code || params.outId || ''); const [work, setWork] = useState<IssuedItemWork | null>(null); const [loading, setLoading] = useState(false); const [submitting, setSubmitting] = useState(false);
  const [condition, setCondition] = useState<Condition>('GOOD'); const [quantity, setQuantity] = useState('1'); const [location, setLocation] = useState(''); const [remarks, setRemarks] = useState(''); const [photos, setPhotos] = useState<LocalPhoto[]>([]); const [inspected, setInspected] = useState(false);
  const [additionalFields, setAdditionalFields] = useState<AdditionalFormField[]>([]);

  const resolve = useCallback(async () => { if (!session || !selectedWarehouseId || !lookup.trim()) return; setLoading(true); try { const result = await resolveIssuedItem(session.token, lookup.trim(), selectedWarehouseId); setWork(result); setQuantity(String(Math.min(1, result.quantityReturnable))); } catch (error) { Alert.alert('Issued item not found', error instanceof Error ? error.message : 'No active issue matches this code.'); } finally { setLoading(false); } }, [lookup, selectedWarehouseId, session]);
  useEffect(() => { if (!params.code && !params.outId) return; const task = setTimeout(resolve, 0); return () => clearTimeout(task); }, [params.code, params.outId, resolve]);

  async function submit() {
    if (!session || !work || !selectedWarehouseId) return; const qty = Number(quantity); const needsPhotos = condition !== 'GOOD';
    if (!Number.isFinite(qty) || qty <= 0 || qty > work.quantityReturnable) { Alert.alert('Check quantity', `Enter a quantity up to ${work.quantityReturnable}.`); return; }
    if (!location.trim()) { Alert.alert('Return location required', 'Enter the rack, shelf, bin, or quarantine location.'); return; }
    if (needsPhotos && !photos.length) { Alert.alert('Photos required', 'Add item photos for a damaged, repair, or incomplete return.'); return; }
    if (!inspected) { Alert.alert('Inspection required', 'Confirm the item was inspected before returning it.'); return; }
    setSubmitting(true);
    try {
      const uploaded = await Promise.all(photos.map((photo) => uploadWorkflowPhoto(session.token, { ...photo, kind: 'RETURN_CONDITION' })));
      await submitInventoryReturn(session.token, { outId: work.outId, warehouseId: selectedWarehouseId, quantity: qty, condition, locationCode: location.trim(), remarks: mergeAdditionalFieldsIntoNotes(remarks, additionalFields), evidenceIds: uploaded.map((file) => file.id), inspected: true, idempotencyKey: Crypto.randomUUID(), ...(additionalFields.length ? { additionalFields: toAdditionalFieldSubmissions(additionalFields) } : {}) });
      await refresh(); Alert.alert('Return completed', condition === 'GOOD' ? 'The item is available in stock again.' : 'The item was routed for review.', [{ text: 'Done', onPress: () => router.replace('/history' as never) }]);
    } catch (error) { Alert.alert('Return not completed', error instanceof Error ? error.message : 'Please retry.'); } finally { setSubmitting(false); }
  }

  return (
    <Screen contentStyle={styles.screen} footer={<WorkflowBottomBar active="tasks" />}>
      <PageHeader title="Return Item" scan />
      {!work ? <Surface style={styles.lookupCard}><ScanLine size={36} color={BRAND.red} /><Text style={styles.lookupTitle}>Find issued item</Text><Text style={styles.lookupHelp}>Scan or enter its barcode, SKU, serial number, asset tag, or issue number.</Text><TextInput value={lookup} onChangeText={setLookup} autoCapitalize="characters" placeholder="Item or issue code" placeholderTextColor={BRAND.muted} style={styles.lookupInput} /><RedButton disabled={loading || !lookup.trim()} icon={<ScanLine size={22} color={BRAND.white} />} onPress={resolve}>{loading ? 'Looking up…' : 'Continue'}</RedButton></Surface> : <>
        <Surface style={styles.hero}><View style={styles.imageWrap}>{work.item.imageUrl ? <Image source={{ uri: absoluteAssetUrl(work.item.imageUrl) || undefined }} contentFit="contain" style={styles.image} /> : <RefreshCcw size={47} color={BRAND.muted} />}</View><View style={styles.heroMain}><Text style={styles.name}>{work.item.name}</Text><Text style={styles.code}>{work.item.serialNumber || work.item.sku}</Text><StatusChip label="✓  Issued" accent="green" /></View></Surface>
        <Surface style={styles.issueInfo}><IssueRow icon={<UserRound size={20} color={BRAND.violet} />} label="Issued To" value={work.issuedTo || 'Assigned recipient'} /><IssueRow icon={<Folder size={20} color={BRAND.violet} />} label="Project" value={work.projectName || 'General inventory issue'} /><IssueRow icon={<MapPin size={20} color={BRAND.violet} />} label="Issued Date" value={new Date(work.issuedAt).toLocaleDateString()} last /></Surface>
        <Surface style={styles.inspection}><Text style={styles.sectionTitle}>Return Inspection</Text><Text style={styles.fieldLabel}>Condition</Text><View style={styles.conditions}>{conditions.map((option) => { const active = condition === option.value; return <Pressable key={option.value} onPress={() => setCondition(option.value)} style={[styles.condition, active && { borderColor: option.color, backgroundColor: `${option.color}0D` }]}>{option.icon}<Text style={[styles.conditionLabel, active && { color: option.color }]}>{option.label}</Text></Pressable>; })}</View>
          <View style={styles.fields}><View style={styles.field}><Text style={styles.fieldLabel}>Quantity Returned</Text><TextInput value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" style={styles.input} /></View><View style={styles.field}><Text style={styles.fieldLabel}>Return Location</Text><TextInput value={location} onChangeText={setLocation} placeholder="Rack · Shelf · Bin" placeholderTextColor={BRAND.muted} style={styles.input} /></View></View>
          <PhotoEvidence label="Add Item Photos" hint={condition === 'GOOD' ? 'Optional for items in good condition' : 'Required for this condition'} photos={photos} onChange={setPhotos} multiple />
          <Text style={styles.fieldLabel}>Remarks</Text><TextInput value={remarks} onChangeText={setRemarks} multiline textAlignVertical="top" placeholder="Describe the returned condition" placeholderTextColor={BRAND.muted} style={[styles.input, styles.remarks]} />
          <Pressable onPress={() => setInspected((value) => !value)} style={styles.checkRow}><View style={[styles.checkbox, inspected && styles.checkboxActive]}>{inspected ? <Check size={18} color={BRAND.white} /> : null}</View><Text style={styles.checkText}>I inspected this item before returning it to stock</Text></Pressable>
        </Surface>
        <AdditionalFormFields fields={additionalFields} onChange={setAdditionalFields} />
        <RedButton disabled={submitting} icon={<RefreshCcw size={23} color={BRAND.white} />} onPress={submit}>{submitting ? 'Completing…' : 'Complete Return'}</RedButton>
      </>}
    </Screen>
  );
}

function IssueRow({ icon, label, value, last = false }: { icon: React.ReactNode; label: string; value: string; last?: boolean }) { return <View style={[styles.issueRow, !last && styles.issueBorder]}><IconBadge accent="violet" size={38}>{icon}</IconBadge><Text style={styles.issueLabel}>{label}</Text><Text numberOfLines={2} style={styles.issueValue}>{value}</Text></View>; }

const styles = StyleSheet.create({
  screen: { paddingHorizontal: 16, paddingTop: 0, paddingBottom: 34 }, lookupCard: { padding: 22, alignItems: 'center' }, lookupTitle: { marginTop: 12, color: BRAND.ink, fontFamily: TYPE.body, fontSize: 21, fontWeight: '700' }, lookupHelp: { maxWidth: 330, marginTop: 6, color: BRAND.muted, fontFamily: TYPE.body, fontSize: 13, lineHeight: 19, textAlign: 'center' }, lookupInput: { width: '100%', minHeight: 50, marginVertical: 16, borderRadius: 13, borderWidth: 1, borderColor: BRAND.line, color: BRAND.ink, fontFamily: TYPE.mono, fontSize: 14, paddingHorizontal: 14 },
  hero: { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 16 }, imageWrap: { width: 118, height: 118, borderRadius: 14, backgroundColor: BRAND.canvas, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, image: { width: '100%', height: '100%' }, heroMain: { flex: 1, alignItems: 'flex-start' }, name: { color: BRAND.ink, fontFamily: TYPE.body, fontSize: 21, fontWeight: '700' }, code: { marginTop: 4, marginBottom: 10, color: BRAND.inkSoft, fontFamily: TYPE.mono, fontSize: 14 },
  issueInfo: { marginTop: 12, paddingHorizontal: 12, overflow: 'hidden' }, issueRow: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 11 }, issueBorder: { borderBottomWidth: 1, borderBottomColor: BRAND.line }, issueLabel: { color: BRAND.inkSoft, fontFamily: TYPE.body, fontSize: 13 }, issueValue: { flex: 1, color: BRAND.ink, fontFamily: TYPE.body, fontSize: 14, fontWeight: '700', textAlign: 'right' },
  inspection: { marginTop: 12, padding: 15 }, sectionTitle: { color: BRAND.ink, fontFamily: TYPE.body, fontSize: 21, fontWeight: '700' }, fieldLabel: { marginTop: 14, marginBottom: 7, color: BRAND.inkSoft, fontFamily: TYPE.body, fontSize: 13, fontWeight: '600' }, conditions: { flexDirection: 'row', marginHorizontal: -3 }, condition: { flex: 1, minHeight: 86, marginHorizontal: 3, borderRadius: 12, borderWidth: 1, borderColor: BRAND.line, alignItems: 'center', justifyContent: 'center', gap: 7 }, conditionLabel: { color: BRAND.ink, fontFamily: TYPE.body, fontSize: 11, fontWeight: '600', textAlign: 'center' }, fields: { flexDirection: 'row', gap: 10 }, field: { flex: 1 }, input: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: BRAND.line, color: BRAND.ink, fontFamily: TYPE.body, fontSize: 13, paddingHorizontal: 12 }, remarks: { minHeight: 82, paddingTop: 12 }, checkRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 11 }, checkbox: { width: 28, height: 28, borderRadius: 6, borderWidth: 1.5, borderColor: BRAND.line, alignItems: 'center', justifyContent: 'center' }, checkboxActive: { backgroundColor: BRAND.red, borderColor: BRAND.red }, checkText: { flex: 1, color: BRAND.inkSoft, fontFamily: TYPE.body, fontSize: 13, fontWeight: '600' },
});
