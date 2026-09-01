import { useMemo, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { RotateCcw, Signature } from 'lucide-react-native';

import { BRAND, TYPE } from '@/constants/brand';

type Point = [number, number];

export function SignaturePad({ value, onChange }: { value: Point[][]; onChange: (strokes: Point[][]) => void }) {
  const [current, setCurrent] = useState<Point[]>([]);
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (event) => {
      const point: Point = [event.nativeEvent.locationX, event.nativeEvent.locationY];
      setCurrent([point]);
    },
    onPanResponderMove: (event) => {
      const point: Point = [event.nativeEvent.locationX, event.nativeEvent.locationY];
      setCurrent((stroke) => [...stroke, point]);
    },
    onPanResponderRelease: () => {
      setCurrent((stroke) => {
        if (stroke.length > 1) onChange([...value, stroke]);
        return [];
      });
    },
  }), [onChange, value]);

  const path = (points: Point[]) => points.map(([x, y], index) => `${index ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  return (
    <View>
      <View style={styles.pad} {...responder.panHandlers}>
        {!value.length && !current.length ? <View pointerEvents="none" style={styles.placeholder}><Signature size={26} color={BRAND.muted} /><Text style={styles.placeholderText}>Sign inside this box</Text></View> : null}
        <Svg width="100%" height="100%">{[...value, current].filter((stroke) => stroke.length > 1).map((stroke, index) => <Path key={index} d={path(stroke)} fill="none" stroke={BRAND.ink} strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round" />)}</Svg>
      </View>
      {value.length ? <Pressable onPress={() => onChange([])} style={styles.clear}><RotateCcw size={14} color={BRAND.red} /><Text style={styles.clearText}>Clear signature</Text></Pressable> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { height: 150, borderRadius: 14, borderWidth: 1.3, borderStyle: 'dashed', borderColor: BRAND.violet, backgroundColor: BRAND.white, overflow: 'hidden' },
  placeholder: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center', gap: 7 },
  placeholderText: { color: BRAND.muted, fontFamily: TYPE.body, fontSize: 12 },
  clear: { alignSelf: 'flex-end', minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 4 },
  clearText: { color: BRAND.red, fontFamily: TYPE.body, fontSize: 12, fontWeight: '700' },
});
