import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { Body, Card, EmptyState, LoadingScreen, Pill, PrimaryButton, Screen } from '@/components/ui';
import { BRAND, PROJECT_STAGES, STAGE_LABELS, TYPE, stageIndex } from '@/constants/brand';
import { advanceProjectStage, fetchProject, updateMaterialConsumption } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { useSyncedData } from '@/providers/data-provider';
import type { ProjectDetails, ProjectMaterial } from '@/types/domain';

export default function ProjectDetailScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const projectId = Number(rawId);
  const { session } = useAuth();
  const { projects, loading: catalogLoading, refresh } = useSyncedData();
  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session || !Number.isInteger(projectId) || catalogLoading) return;
    setLoading(true); setError(null);
    const scopedProject = projects.find((row) => row.id === projectId);
    if (!scopedProject) {
      setProject(null);
      setError('This project is not part of the synchronized workspace.');
      setLoading(false);
      return;
    }
    try { setProject(await fetchProject(session.token, projectId)); }
    catch (requestError) {
      setProject({ ...scopedProject, materials: [], photos: [], stageHistory: [], warranty: null });
      setError(requestError instanceof Error ? requestError.message : 'Project unavailable.');
    } finally { setLoading(false); }
  }, [catalogLoading, projectId, projects, session]);

  useEffect(() => {
    const task = setTimeout(load, 0);
    return () => clearTimeout(task);
  }, [load]);
  if (loading && !project) return <LoadingScreen label="Loading project" />;
  if (!project) return <Screen><EmptyState error title="Project unavailable" message={error || 'This project could not be found.'} /></Screen>;

  const currentIndex = stageIndex(project.currentStage);
  const nextStage = PROJECT_STAGES[currentIndex + 1];
  const progress = ((currentIndex + 1) / PROJECT_STAGES.length) * 100;
  const accountRole = String(session?.user.systemRole || session?.workspace.effectiveRole || '').toUpperCase();
  const privileged = ['SUPERADMIN', 'SUPER_ADMIN', 'ADMIN', 'MANAGER', 'GENERAL_MANAGER'].includes(accountRole);
  const canAdvance = privileged || ['PROJECT_MANAGER', 'TECHNICIAN'].includes(accountRole);
  const canEditMaterials = privileged || accountRole === 'PROJECT_MANAGER';

  function confirmAdvance() {
    if (!nextStage) return;
    Alert.alert('Advance stage?', `${project!.name} will move to ${STAGE_LABELS[nextStage]}. This cannot be reversed.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Advance', onPress: advance },
    ]);
  }

  async function advance() {
    if (!session || !nextStage) return;
    setAdvancing(true);
    try { await advanceProjectStage(session.token, projectId, nextStage); await Promise.all([load(), refresh()]); }
    catch (requestError) { Alert.alert('Stage not updated', requestError instanceof Error ? requestError.message : 'Try again.'); }
    finally { setAdvancing(false); }
  }

  async function updateMaterial(materialId: number, amount: number) {
    if (!session) return;
    await updateMaterialConsumption(session.token, materialId, amount);
    await load();
  }

  return (
    <Screen refreshing={loading} onRefresh={load}>
      <View style={styles.header}>
        <Pill label={project.status} tone={project.status.toLowerCase() === 'completed' ? 'green' : 'red'} />
        <Text style={styles.title}>{project.name}</Text>
        <Text style={styles.client}>{project.client?.name || 'Direct project'}{project.projectType ? ` · ${project.projectType}` : ''}</Text>
        <View style={styles.progressHeader}>
          <Text style={styles.stage}>{STAGE_LABELS[project.currentStage] || project.currentStage}</Text>
          <Text style={styles.percent}>{Math.round(progress)}%</Text>
        </View>
        <View style={styles.progressTrack}><View style={[styles.progressBar, { width: `${progress}%` }]} /></View>
      </View>

      {nextStage && canAdvance ? <View style={styles.advance}><PrimaryButton label={`Advance to ${STAGE_LABELS[nextStage]}`} loading={advancing} onPress={confirmAdvance} /></View> : null}
      {error ? <Body style={styles.cacheNote}>Showing cached summary.</Body> : null}

      <Card style={styles.factsCard}>
        <Fact label="Manager" value={project.assignedPm?.username || 'Unassigned'} />
        <Fact label="Crew" value={`${project.technicians.length || 'No'} assigned`} />
        <Fact label="Target" value={project.targetCompletion ? new Date(project.targetCompletion).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not set'} />
        <Fact label="Materials" value={`${project.materials.length || project.counts.materials || 0} lines`} last />
      </Card>

      <Text style={styles.sectionTitle}>Materials</Text>
      <View style={styles.materialList}>
        {project.materials.length ? project.materials.map((material) => <MaterialRow key={material.id} material={material} editable={canEditMaterials} onSave={updateMaterial} />) : <Body style={styles.emptySection}>No material lines.</Body>}
      </View>

      <Text style={styles.sectionTitle}>Stage history</Text>
      <Card style={styles.historyCard}>
        {project.stageHistory.length ? project.stageHistory.slice(0, 12).map((entry, index) => (
          <View key={entry.id} style={[styles.historyRow, index < Math.min(project.stageHistory.length, 12) - 1 && styles.historyBorder]}>
            <View style={styles.historyMain}>
              <Text style={styles.historyTitle}>{STAGE_LABELS[entry.toStage] || entry.toStage}</Text>
              <Text style={styles.historyMeta}>{entry.user?.username || 'Team'} · {new Date(entry.changedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
              {entry.notes ? <Text style={styles.historyNote}>{entry.notes}</Text> : null}
            </View>
          </View>
        )) : <Body style={styles.historyEmpty}>No stage changes.</Body>}
      </Card>
    </Screen>
  );
}

function Fact({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.fact, !last && styles.factBorder]}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text numberOfLines={1} style={styles.factValue}>{value}</Text>
    </View>
  );
}

function MaterialRow({ material, editable, onSave }: { material: ProjectMaterial; editable: boolean; onSave: (id: number, amount: number) => Promise<void> }) {
  const [value, setValue] = useState(String(material.consumedQty));
  const [saving, setSaving] = useState(false);
  const variance = Number(value || 0) - Number(material.quotedQty || 0);
  async function save() {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount < 0) { Alert.alert('Invalid quantity', 'Consumption must be zero or more.'); return; }
    setSaving(true);
    try { await onSave(material.id, amount); }
    catch (error) { Alert.alert('Consumption not updated', error instanceof Error ? error.message : 'Try again.'); }
    finally { setSaving(false); }
  }
  return (
    <Card style={styles.material}>
      <View style={styles.materialTop}>
        <View style={styles.materialMain}>
          <Text numberOfLines={1} style={styles.materialName}>{material.item?.name || `Item #${material.inventoryItemId}`}</Text>
          <Text style={styles.materialSku}>Quoted {material.quotedQty} {material.unit || material.item?.unit || 'units'}</Text>
        </View>
        <Pill label={`${variance > 0 ? '+' : ''}${variance}`} tone={variance > 0 ? 'red' : variance < 0 ? 'green' : 'neutral'} />
      </View>
      <View style={styles.consumeRow}>
        <TextInput value={value} onChangeText={setValue} editable={editable} keyboardType="decimal-pad" style={[styles.consumeInput, !editable && styles.consumeReadOnly]} />
        {editable ? <Pressable disabled={saving} onPress={save} style={[styles.save, saving && styles.saveDisabled]}><Text style={styles.saveText}>{saving ? '…' : 'Save'}</Text></Pressable> : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: 4 },
  title: { marginTop: 8, color: BRAND.ink, fontFamily: TYPE.body, fontSize: 24, lineHeight: 28, fontWeight: '600', letterSpacing: -0.3 },
  client: { marginTop: 4, color: BRAND.muted, fontFamily: TYPE.body, fontSize: 13 },
  progressHeader: { marginTop: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stage: { color: BRAND.ink, fontFamily: TYPE.body, fontSize: 13, fontWeight: '600' },
  percent: { color: BRAND.muted, fontFamily: TYPE.body, fontSize: 12 },
  progressTrack: { marginTop: 8, height: 4, borderRadius: 999, backgroundColor: BRAND.canvas, overflow: 'hidden' },
  progressBar: { height: '100%', borderRadius: 999, backgroundColor: BRAND.ink },
  advance: { marginTop: 12 },
  cacheNote: { marginTop: 8, fontSize: 12 },
  factsCard: { marginTop: 16, paddingHorizontal: 15 },
  fact: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  factBorder: { borderBottomWidth: 1, borderBottomColor: BRAND.line },
  factLabel: { color: BRAND.muted, fontFamily: TYPE.body, fontSize: 13 },
  factValue: { flex: 1, textAlign: 'right', color: BRAND.ink, fontFamily: TYPE.body, fontSize: 13, fontWeight: '500' },
  sectionTitle: { marginTop: 22, marginBottom: 10, color: BRAND.ink, fontFamily: TYPE.body, fontSize: 17, fontWeight: '600' },
  materialList: { gap: 8 },
  material: { padding: 13 },
  materialTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  materialMain: { flex: 1, minWidth: 0 },
  materialName: { color: BRAND.ink, fontFamily: TYPE.body, fontSize: 13, fontWeight: '600' },
  materialSku: { marginTop: 2, color: BRAND.muted, fontFamily: TYPE.body, fontSize: 12 },
  consumeRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 9 },
  consumeInput: { flex: 1, height: 40, borderRadius: 10, borderWidth: 1, borderColor: BRAND.line, backgroundColor: BRAND.canvas, color: BRAND.ink, fontFamily: TYPE.body, fontSize: 13, paddingHorizontal: 12 },
  consumeReadOnly: { color: BRAND.muted },
  save: { height: 40, minWidth: 64, borderRadius: 10, backgroundColor: BRAND.ink, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  saveDisabled: { opacity: 0.5 },
  saveText: { color: BRAND.white, fontFamily: TYPE.body, fontSize: 13, fontWeight: '600' },
  emptySection: { paddingVertical: 14, textAlign: 'center' },
  historyCard: { paddingHorizontal: 15 },
  historyRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center' },
  historyBorder: { borderBottomWidth: 1, borderBottomColor: BRAND.line },
  historyMain: { flex: 1 },
  historyTitle: { color: BRAND.ink, fontFamily: TYPE.body, fontSize: 13, fontWeight: '600' },
  historyMeta: { marginTop: 2, color: BRAND.muted, fontFamily: TYPE.body, fontSize: 12 },
  historyNote: { marginTop: 3, color: BRAND.inkSoft, fontFamily: TYPE.body, fontSize: 12 },
  historyEmpty: { padding: 20, textAlign: 'center' },
});
