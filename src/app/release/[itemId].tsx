import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Check } from 'lucide-react-native';

import { Body, Card, EmptyState, PrimaryButton, Screen, Title } from '@/components/ui';
import { AdditionalFormFields, mergeAdditionalFieldsIntoNotes, toAdditionalFieldSubmissions, type AdditionalFormField } from '@/components/additional-form-fields';
import { BRAND, TYPE } from '@/constants/brand';
import { requestProjectRelease } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { useSyncedData } from '@/providers/data-provider';

export default function ReleaseRequestScreen() {
  const { itemId: rawItemId } = useLocalSearchParams<{ itemId: string }>();
  const itemId = Number(rawItemId);
  const { session } = useAuth();
  const { inventory, projects, refresh } = useSyncedData();
  const item = inventory.find((row) => row.id === itemId);
  const activeProjects = useMemo(() => projects.filter((project) => project.status.toLowerCase() === 'active'), [projects]);
  const [projectId, setProjectId] = useState<number | null>(activeProjects[0]?.id || null);
  const [qty, setQty] = useState('1');
  const [note, setNote] = useState('');
  const [additionalFields, setAdditionalFields] = useState<AdditionalFormField[]>([]);
  const [submitting, setSubmitting] = useState(false);

  if (!item) return <Screen><EmptyState error title="Item not in catalog" message="Sync inventory before requesting stock-out." /></Screen>;

  async function submit() {
    const amount = Number(qty);
    if (!projectId) { Alert.alert('Choose a project', 'Stock-out needs an active project.'); return; }
    if (!Number.isFinite(amount) || amount <= 0 || amount > Number(item!.totalAvailable)) { Alert.alert('Check quantity', `Enter 1 to ${item!.totalAvailable}.`); return; }
    if (!session) return;
    setSubmitting(true);
    try {
      const response = await requestProjectRelease(session.token, itemId, { projectId, qty: amount, note: mergeAdditionalFieldsIntoNotes(note, additionalFields) || undefined, ...(additionalFields.length ? { additionalFields: toAdditionalFieldSubmissions(additionalFields) } : {}) });
      await refresh();
      Alert.alert('Request submitted', response.message, [{ text: 'Done', onPress: () => router.back() }]);
    } catch (error) { Alert.alert('Request not submitted', error instanceof Error ? error.message : 'Try again.'); }
    finally { setSubmitting(false); }
  }

  return (
    <Screen>
      <Title style={styles.title}>Request stock-out</Title>
      <Card style={styles.summary}>
        <View style={styles.summaryMain}>
          <Text numberOfLines={1} style={styles.summaryName}>{item.name}</Text>
          <Text style={styles.summaryCode}>{item.sku} · {item.totalAvailable} available</Text>
        </View>
      </Card>

      <Text style={styles.label}>Project</Text>
      <View style={styles.projects}>
        {activeProjects.map((project) => {
          const selected = projectId === project.id;
          return (
            <Pressable key={project.id} onPress={() => setProjectId(project.id)} style={[styles.project, selected && styles.projectSelected]}>
              <View style={[styles.projectCheck, selected && styles.projectCheckSelected]}>{selected ? <Check size={14} color={BRAND.white} /> : null}</View>
              <View style={styles.projectMain}>
                <Text numberOfLines={1} style={styles.projectName}>{project.name}</Text>
                <Text style={styles.projectCode}>{project.projectCode || `STRATOS-${project.id}`}</Text>
              </View>
            </Pressable>
          );
        })}
        {!activeProjects.length ? <Body style={styles.noProjects}>No active projects available.</Body> : null}
      </View>

      <Text style={styles.label}>Quantity</Text>
      <TextInput value={qty} onChangeText={setQty} keyboardType="decimal-pad" style={styles.input} placeholder="1" placeholderTextColor={BRAND.muted} />
      <Text style={styles.label}>Note <Text style={styles.optional}>(optional)</Text></Text>
      <TextInput value={note} onChangeText={setNote} style={[styles.input, styles.note]} placeholder="Purpose or area" placeholderTextColor={BRAND.muted} multiline textAlignVertical="top" />
      <AdditionalFormFields fields={additionalFields} onChange={setAdditionalFields} />
      <View style={styles.submit}><PrimaryButton label="Submit" loading={submitting} disabled={!activeProjects.length} onPress={submit} /></View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: 16 },
  summary: { padding: 14 },
  summaryMain: { flex: 1 },
  summaryName: { color: BRAND.ink, fontFamily: TYPE.body, fontSize: 15, fontWeight: '600' },
  summaryCode: { marginTop: 3, color: BRAND.muted, fontFamily: TYPE.body, fontSize: 12 },
  label: { marginTop: 16, marginBottom: 8, color: BRAND.inkSoft, fontFamily: TYPE.body, fontSize: 13, fontWeight: '600' },
  optional: { color: BRAND.muted, fontWeight: '400' },
  projects: { gap: 8 },
  project: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: 14, borderWidth: 1, borderColor: BRAND.line, backgroundColor: BRAND.white, padding: 12 },
  projectSelected: { borderColor: BRAND.ink },
  projectCheck: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: BRAND.line, alignItems: 'center', justifyContent: 'center' },
  projectCheckSelected: { backgroundColor: BRAND.ink, borderColor: BRAND.ink },
  projectMain: { flex: 1, minWidth: 0 },
  projectName: { color: BRAND.ink, fontFamily: TYPE.body, fontSize: 14, fontWeight: '500' },
  projectCode: { marginTop: 2, color: BRAND.muted, fontFamily: TYPE.body, fontSize: 11 },
  noProjects: { paddingVertical: 14, textAlign: 'center' },
  input: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: BRAND.line, backgroundColor: BRAND.white, color: BRAND.ink, fontFamily: TYPE.body, fontSize: 14, paddingHorizontal: 14 },
  note: { minHeight: 84, paddingTop: 13 },
  submit: { marginTop: 20 },
});
