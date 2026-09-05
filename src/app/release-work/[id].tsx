import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import * as Crypto from 'expo-crypto';
import { router, useLocalSearchParams } from 'expo-router';
import { Check, ClipboardList, ScanLine, Signature as SignatureIcon, Upload, UserRound } from 'lucide-react-native';

import { IconBadge, OutlineButton, PageHeader, RedButton, StatusChip, Surface, WorkflowBottomBar } from '@/components/inventory-ui';
import { AdditionalFormFields, toAdditionalFieldSubmissions, type AdditionalFormField } from '@/components/additional-form-fields';
import { SignaturePad } from '@/components/signature-pad';
import { EmptyState, LoadingScreen, Screen } from '@/components/ui';
import { BRAND, TYPE } from '@/constants/brand';
import { absoluteAssetUrl, completeReleaseWorkOrder, fetchReleaseWorkOrder, saveReleaseScan } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { useSyncedData } from '@/providers/data-provider';
import { useScanFeedback } from '@/lib/scan-feedback';
import type { ReleaseWorkOrder } from '@/types/domain';

type Point = [number, number];

export default function ReleaseWorkScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); const workId = Number(id);
  const { session } = useAuth(); const { refresh } = useSyncedData();
  const { playScanError, playScanSuccess } = useScanFeedback();
  const [work, setWork] = useState<ReleaseWorkOrder | null>(null); const [loading, setLoading] = useState(true); const [submitting, setSubmitting] = useState(false);
  const [code, setCode] = useState(''); const [signature, setSignature] = useState<Point[][]>([]); const [acknowledged, setAcknowledged] = useState(false);
  const [additionalFields, setAdditionalFields] = useState<AdditionalFormField[]>([]);

  const load = useCallback(async () => { if (!session || !workId) return; setLoading(true); try { setWork(await fetchReleaseWorkOrder(session.token, workId)); } catch (error) { Alert.alert('Release unavailable', error instanceof Error ? error.message : 'Unable to load release.'); } finally { setLoading(false); } }, [session, workId]);
  useEffect(() => { const task = setTimeout(load, 0); return () => clearTimeout(task); }, [load]);
  const scanned = useMemo(() => work?.lines.filter((line) => line.scannedQty >= line.requiredQty).length || 0, [work]);
  const complete = Boolean(work && scanned === work.lines.length && work.lines.length);

  async function scanLine(lineId: number) {
    if (!session || !work || !code.trim()) { Alert.alert('Enter or scan a code', 'Use the item barcode, SKU, serial, or asset tag.'); return; }
    try { setWork(await saveReleaseScan(session.token, work.id, { lineId, code: code.trim() })); setCode(''); playScanSuccess(); } catch (error) { playScanError(); Alert.alert('Item not accepted', error instanceof Error ? error.message : 'This code does not match the pick line.'); }
  }

  async function submit() {
    if (!session || !work) return;
    if (!complete) { Alert.alert('Pick list incomplete', 'Scan the full required quantity for every item.'); return; }
    if (!signature.length) { Alert.alert('Recipient signature required', 'Capture the recipient’s signature before completing release.'); return; }
    if (!acknowledged) { Alert.alert('Condition check required', 'Confirm the items were checked and are in good condition.'); return; }
    setSubmitting(true);
    try { await completeReleaseWorkOrder(session.token, work.id, { signatureStrokes: signature, conditionAcknowledged: true, idempotencyKey: Crypto.randomUUID(), ...(additionalFields.length ? { additionalFields: toAdditionalFieldSubmissions(additionalFields) } : {}) }); await refresh(); Alert.alert('Release completed', 'The inventory movement was posted successfully.', [{ text: 'Done', onPress: () => router.replace('/history' as never) }]); }
    catch (error) { Alert.alert('Release not completed', error instanceof Error ? error.message : 'Please retry.'); } finally { setSubmitting(false); }
  }

  if (loading) return <LoadingScreen label="Loading release" />;
  if (!work) return <Screen><PageHeader title="Release / Issue" scan /><EmptyState error title="Release unavailable" message="This approved release could not be loaded." /></Screen>;
  const percent = work.lines.length ? Math.round(scanned / work.lines.length * 100) : 0;
  return (
    <Screen contentStyle={styles.screen} footer={<WorkflowBottomBar active="tasks" />}>
      <PageHeader title="Release / Issue" scan />
      <Surface style={styles.request}><StatusChip label={work.status.toUpperCase()} accent="green" /><View style={styles.requestMain}><IconBadge accent="violet" size={52}><ClipboardList size={28} color={BRAND.violet} /></IconBadge><View style={styles.requestCopy}><Text style={styles.requestTitle}>Request {work.requestNo}</Text><Text style={styles.requestMeta}>{work.projectName || 'Inventory release'}{work.projectCode ? ` · ${work.projectCode}` : ''}</Text></View></View></Surface>

      <Surface style={styles.pick}><Text style={styles.pickTitle}>Pick List</Text><Text style={styles.pickMeta}>{scanned} of {work.lines.length} items scanned</Text><View style={styles.progress}><View style={[styles.progressFill, { width: `${percent}%` }]} /></View>
        {work.lines.map((line) => { const done = line.scannedQty >= line.requiredQty; return <View key={line.id} style={styles.line}><View style={styles.imageWrap}>{line.item.imageUrl ? <Image source={{ uri: absoluteAssetUrl(line.item.imageUrl) || undefined }} contentFit="contain" style={styles.image} /> : <ClipboardList size={34} color={BRAND.muted} />}</View><View style={styles.lineMain}><Text style={styles.lineName}>{line.item.name}</Text><Text style={styles.qty}>Required {line.requiredQty} · <Text style={{ color: done ? BRAND.green : BRAND.red }}>Scanned {line.scannedQty}</Text></Text>{line.fifoBatch ? <StatusChip label={`FIFO: ${line.fifoBatch}`} accent="green" compact /> : null}</View>{done ? <View style={styles.done}><Check size={30} color={BRAND.white} /></View> : <View style={styles.scanColumn}><TextInput value={code} onChangeText={setCode} placeholder="Item code" placeholderTextColor={BRAND.muted} style={styles.scanInput} /><OutlineButton accent="red" icon={<ScanLine size={18} color={BRAND.red} />} onPress={() => scanLine(line.id)}>Scan</OutlineButton></View>}</View>; })}
      </Surface>

      <Surface style={styles.recipient}><IconBadge accent="violet" size={48}><UserRound size={25} color={BRAND.violet} /></IconBadge><View style={styles.recipientMain}><Text style={styles.recipientLabel}>Received By</Text><Text style={styles.recipientName}>{work.recipientName || 'Assigned recipient'}</Text><Text style={styles.recipientRole}>{work.recipientRole || 'Project representative'}</Text></View></Surface>
      <Surface style={styles.signature}><View style={styles.signatureTitle}><SignatureIcon size={21} color={BRAND.violet} /><Text style={styles.signatureText}>Capture Signature</Text></View><SignaturePad value={signature} onChange={setSignature} /></Surface>
      <AdditionalFormFields fields={additionalFields} onChange={setAdditionalFields} />
      <Pressable onPress={() => setAcknowledged((value) => !value)} style={styles.checkRow}><View style={[styles.checkbox, acknowledged && styles.checkboxActive]}>{acknowledged ? <Check size={18} color={BRAND.white} /> : null}</View><Text style={styles.checkLabel}>Items checked and in good condition</Text></Pressable>
      <RedButton disabled={submitting || !complete} icon={<Upload size={24} color={BRAND.white} />} onPress={submit}>{submitting ? 'Completing…' : 'Complete Release'}</RedButton>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: 16, paddingTop: 0, paddingBottom: 34 }, request: { padding: 15 }, requestMain: { marginTop: 13, flexDirection: 'row', alignItems: 'center', gap: 13 }, requestCopy: { flex: 1 }, requestTitle: { color: BRAND.ink, fontFamily: TYPE.body, fontSize: 20, fontWeight: '700' }, requestMeta: { marginTop: 4, color: BRAND.inkSoft, fontFamily: TYPE.body, fontSize: 13, lineHeight: 19 },
  pick: { marginTop: 12, padding: 15 }, pickTitle: { color: BRAND.ink, fontFamily: TYPE.body, fontSize: 21, fontWeight: '700' }, pickMeta: { marginTop: 4, color: BRAND.inkSoft, fontFamily: TYPE.body, fontSize: 13 }, progress: { height: 7, marginTop: 12, marginBottom: 10, borderRadius: 4, backgroundColor: BRAND.line, overflow: 'hidden' }, progressFill: { height: '100%', borderRadius: 4, backgroundColor: BRAND.red },
  line: { minHeight: 112, marginTop: 8, borderRadius: 15, borderWidth: 1, borderColor: BRAND.line, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 11 }, imageWrap: { width: 76, height: 76, borderRadius: 11, backgroundColor: BRAND.canvas, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, image: { width: '100%', height: '100%' }, lineMain: { flex: 1, minWidth: 0, alignItems: 'flex-start' }, lineName: { color: BRAND.ink, fontFamily: TYPE.body, fontSize: 16, fontWeight: '700' }, qty: { marginTop: 4, marginBottom: 6, color: BRAND.inkSoft, fontFamily: TYPE.body, fontSize: 12 }, done: { width: 52, height: 52, borderRadius: 26, backgroundColor: BRAND.green, alignItems: 'center', justifyContent: 'center' }, scanColumn: { width: 100, gap: 6 }, scanInput: { height: 40, borderRadius: 10, borderWidth: 1, borderColor: BRAND.line, color: BRAND.ink, fontFamily: TYPE.body, fontSize: 11, paddingHorizontal: 8 },
  recipient: { marginTop: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }, recipientMain: { flex: 1 }, recipientLabel: { color: BRAND.inkSoft, fontFamily: TYPE.body, fontSize: 12 }, recipientName: { marginTop: 2, color: BRAND.ink, fontFamily: TYPE.body, fontSize: 17, fontWeight: '700' }, recipientRole: { marginTop: 2, color: BRAND.inkSoft, fontFamily: TYPE.body, fontSize: 12 },
  signature: { marginTop: 12, padding: 14 }, signatureTitle: { marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }, signatureText: { color: BRAND.violet, fontFamily: TYPE.body, fontSize: 15, fontWeight: '700' }, checkRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 12 }, checkbox: { width: 28, height: 28, borderRadius: 6, borderWidth: 1.5, borderColor: BRAND.line, alignItems: 'center', justifyContent: 'center' }, checkboxActive: { backgroundColor: BRAND.red, borderColor: BRAND.red }, checkLabel: { flex: 1, color: BRAND.inkSoft, fontFamily: TYPE.body, fontSize: 14, fontWeight: '600' },
});
