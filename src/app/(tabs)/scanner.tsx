import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Camera, Flashlight, RotateCcw, ScanLine } from 'lucide-react-native';

import { Body, Card, LoadingScreen, Pill, PrimaryButton, Screen, Title } from '@/components/ui';
import { BRAND, TYPE } from '@/constants/brand';
import { ApiError, resolveInventoryScan, resolveStorageScan } from '@/lib/api';
import { useScanFeedback } from '@/lib/scan-feedback';
import { useAuth } from '@/providers/auth-provider';
import { useSyncedData } from '@/providers/data-provider';
import type { ScanResolution } from '@/types/domain';

export default function ScannerScreen() {
  const { session } = useAuth();
  const { selectedWarehouseId } = useSyncedData();
  const { playScanError, playScanSuccess } = useScanFeedback();
  const [permission, requestPermission] = useCameraPermissions();
  const [active, setActive] = useState(true);
  const [scanned, setScanned] = useState(false);
  const [torch, setTorch] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResolution | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    setActive(true);
    return () => setActive(false);
  }, []));

  async function handleCode(data: string) {
    if (scanned || !session) return;
    setScanned(true); setLoading(true); setMessage(null);
    try {
      let resolved: ScanResolution | null = null;
      if (selectedWarehouseId) {
        try { resolved = await resolveStorageScan(session.token, selectedWarehouseId, data); }
        catch (error) { if (!(error instanceof ApiError) || error.status !== 404) throw error; }
      }
      if (!resolved) resolved = await resolveInventoryScan(session.token, data, selectedWarehouseId);
      setResult(resolved);
      if (resolved) playScanSuccess();
      else { playScanError(); setMessage('No match for this code.'); }
    } catch (error) {
      playScanError();
      setMessage(error instanceof Error ? error.message : 'Lookup failed.');
    } finally { setLoading(false); }
  }

  function reset() { setScanned(false); setResult(null); setMessage(null); }

  function openResult() {
    if (!result) return;
    if (result.type === 'CONTAINER') router.push({ pathname: '/container/[id]', params: { id: String(result.id) } } as never);
    else if (result.type === 'SHELF') router.push({ pathname: '/shelf/[id]', params: { id: String(result.id) } } as never);
    else if (result.type === 'ITEM') router.push({ pathname: '/inventory/[id]', params: { id: String(result.id) } });
    else if (result.type === 'RELEASE') router.push({ pathname: '/release-work/[id]', params: { id: String(result.id) } } as never);
    else if (result.type === 'RETURN') router.push({ pathname: '/return-item', params: { outId: String(result.id), code: result.code } } as never);
    else if (result.type === 'COUNT') router.push({ pathname: '/physical-count/[id]', params: { id: String(result.id) } } as never);
    else if (result.type === 'PURCHASE_ORDER') router.push({ pathname: '/stock-in/[poId]', params: { poId: String(result.id) } } as never);
    else { setMessage(`Location ${result.code} verified. Open an assigned count task to continue.`); setResult(null); }
  }

  if (!permission) return <LoadingScreen label="Checking camera" />;
  if (!permission.granted) {
    return <Screen><View style={styles.permission}><Camera size={32} color={BRAND.ink} /><Title style={styles.permissionTitle}>Camera access</Title><Body style={styles.permissionBody}>Needed to read barcodes and QR labels.</Body><PrimaryButton label="Allow camera" onPress={requestPermission} /></View></Screen>;
  }

  return (
    <Screen>
      <Title style={styles.title}>Scan</Title>
      <View style={styles.cameraShell}>
        {active ? <CameraView style={StyleSheet.absoluteFill} facing="back" enableTorch={torch} barcodeScannerSettings={{ barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'code39', 'upc_a', 'upc_e'] }} onBarcodeScanned={scanned ? undefined : ({ data }) => handleCode(data)} /> : null}
        <View style={styles.target} pointerEvents="none"><ScanLine size={28} color={BRAND.white} /></View>
        <Pressable onPress={() => setTorch((value) => !value)} style={[styles.torch, torch && styles.torchOn]}><Flashlight size={16} color={torch ? BRAND.ink : BRAND.white} /></Pressable>
        <View style={styles.cameraCaption}><Text style={styles.cameraCaptionText}>{scanned ? 'Captured' : 'Align code in frame'}</Text></View>
      </View>
      {loading ? <Card style={styles.resultCard}><Body>Looking up…</Body></Card> : result ? (
        <Card style={styles.resultCard}>
          <View style={styles.resultTop}><View style={styles.resultMain}><Text style={styles.resultName}>{result.item?.name || result.title || result.type.replace('_', ' ')}</Text><Text style={styles.resultCode}>{result.item?.sku || result.code}</Text></View><Pill label={result.item ? `${result.item.totalAvailable} available` : result.type.replace('_', ' ')} tone={result.item && result.item.totalAvailable <= 0 ? 'red' : 'green'} /></View>
          <PrimaryButton label={`Open ${result.type.toLowerCase().replace('_', ' ')}`} onPress={openResult} />
        </Card>
      ) : message ? <Card style={styles.resultCard}><Body style={styles.error}>{message}</Body></Card> : null}
      {scanned ? <Pressable onPress={reset} style={styles.scanAgain}><RotateCcw size={14} color={BRAND.inkSoft} /><Text style={styles.scanAgainText}>Scan again</Text></Pressable> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: 14 },
  cameraShell: { height: 340, borderRadius: 20, overflow: 'hidden', backgroundColor: BRAND.ink },
  target: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
  torch: { position: 'absolute', right: 14, top: 14, width: 36, height: 36, borderRadius: 18, backgroundColor: '#101A1FAA', alignItems: 'center', justifyContent: 'center' },
  torchOn: { backgroundColor: BRAND.white },
  cameraCaption: { position: 'absolute', bottom: 14, alignSelf: 'center', backgroundColor: '#101A1FCC', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  cameraCaptionText: { color: BRAND.white, fontFamily: TYPE.body, fontSize: 11, fontWeight: '500' },
  resultCard: { marginTop: 12, padding: 14, gap: 12 },
  resultTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  resultMain: { flex: 1, minWidth: 0 },
  resultName: { color: BRAND.ink, fontFamily: TYPE.body, fontSize: 14, fontWeight: '600' },
  resultCode: { marginTop: 2, color: BRAND.muted, fontFamily: TYPE.body, fontSize: 12 },
  scanAgain: { marginTop: 8, height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  scanAgainText: { color: BRAND.inkSoft, fontFamily: TYPE.body, fontSize: 13, fontWeight: '500' },
  error: { color: BRAND.redDark },
  permission: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  permissionTitle: { marginTop: 14 },
  permissionBody: { textAlign: 'center', marginTop: 4, marginBottom: 20, maxWidth: 280 },
});
