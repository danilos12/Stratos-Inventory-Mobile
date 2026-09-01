import { StyleSheet, Text, View } from 'react-native';

import { BRAND, TYPE } from '@/constants/brand';

export function BrandMark({ inverse = false, compact = false }: { inverse?: boolean; compact?: boolean }) {
  return (
    <View style={styles.row} accessibilityLabel="Stratos Alarm System">
      <View style={[styles.mark, compact && styles.markCompact]}>
        <View style={styles.barTop} />
        <View style={styles.barMid} />
        <View style={styles.barBottom} />
      </View>
      <Text style={[styles.word, compact && styles.wordCompact, inverse && styles.inverse]}>STRATOS</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  mark: { width: 24, height: 27, justifyContent: 'center' },
  markCompact: { width: 20, height: 23 },
  barTop: { height: 4, width: '70%', marginLeft: '30%', backgroundColor: BRAND.red, transform: [{ skewX: '-24deg' }] },
  barMid: { height: 4, width: '100%', marginTop: 3, backgroundColor: BRAND.red, transform: [{ skewX: '-24deg' }] },
  barBottom: { height: 4, width: '70%', marginTop: 3, backgroundColor: BRAND.red, transform: [{ skewX: '-24deg' }] },
  word: { color: BRAND.ink, fontFamily: TYPE.display, fontSize: 22, lineHeight: 24, fontWeight: '800', letterSpacing: 2.1 },
  wordCompact: { fontSize: 18, lineHeight: 20, letterSpacing: 1.6 },
  inverse: { color: BRAND.white },
});
