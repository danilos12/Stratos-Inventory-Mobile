import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Camera, ImagePlus, X } from 'lucide-react-native';

import { BRAND, TYPE } from '@/constants/brand';

export type LocalPhoto = { uri: string; fileName?: string | null; mimeType?: string | null };

export function PhotoEvidence({ label, hint, photos, onChange, multiple = false }: { label: string; hint?: string; photos: LocalPhoto[]; onChange: (photos: LocalPhoto[]) => void; multiple?: boolean }) {
  async function launch(camera: boolean) {
    if (camera) {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) { Alert.alert('Camera permission needed', 'Allow camera access to attach inventory evidence.'); return; }
    }
    const result = camera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.75 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.75, allowsMultipleSelection: multiple });
    if (result.canceled) return;
    const picked = result.assets.map((asset) => ({ uri: asset.uri, fileName: asset.fileName, mimeType: asset.mimeType }));
    onChange(multiple ? [...photos, ...picked].slice(0, 5) : picked.slice(0, 1));
  }

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      {photos.length ? <View style={styles.previews}>{photos.map((photo, index) => <View key={`${photo.uri}-${index}`} style={styles.preview}><Image source={{ uri: photo.uri }} contentFit="cover" style={styles.image} /><Pressable onPress={() => onChange(photos.filter((_, photoIndex) => photoIndex !== index))} style={styles.remove}><X size={14} color={BRAND.white} /></Pressable></View>)}</View> : null}
      <View style={styles.buttons}>
        <Pressable onPress={() => launch(true)} style={styles.button}><Camera size={20} color={BRAND.red} /><Text style={styles.buttonText}>Take photo</Text></Pressable>
        <Pressable onPress={() => launch(false)} style={styles.button}><ImagePlus size={20} color={BRAND.violet} /><Text style={[styles.buttonText, styles.libraryText]}>Photo library</Text></Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { color: BRAND.ink, fontFamily: TYPE.body, fontSize: 14, fontWeight: '700' }, hint: { marginTop: 2, color: BRAND.muted, fontFamily: TYPE.body, fontSize: 11, lineHeight: 16 },
  previews: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, preview: { width: 82, height: 82, borderRadius: 12, overflow: 'hidden', backgroundColor: BRAND.canvas }, image: { width: '100%', height: '100%' }, remove: { position: 'absolute', top: 5, right: 5, width: 24, height: 24, borderRadius: 12, backgroundColor: '#071126AA', alignItems: 'center', justifyContent: 'center' },
  buttons: { marginTop: 10, flexDirection: 'row', gap: 8 }, button: { flex: 1, minHeight: 48, borderRadius: 13, borderWidth: 1.2, borderStyle: 'dashed', borderColor: BRAND.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: BRAND.white }, buttonText: { color: BRAND.red, fontFamily: TYPE.body, fontSize: 12, fontWeight: '700' }, libraryText: { color: BRAND.violet },
});
