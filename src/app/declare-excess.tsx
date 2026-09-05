import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ChevronRight, FolderKanban } from 'lucide-react-native';
import { PageHeader, Surface } from '@/components/inventory-ui';
import { EmptyState, Screen } from '@/components/ui';
import { BRAND, TYPE } from '@/constants/brand';
import { useEffect, useState } from 'react';
import { fetchInventoryProjects } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import type { InventoryProjectSummary } from '@/types/domain';

export default function ChooseExcessProjectScreen() { const { session } = useAuth(); const [projects, setProjects] = useState<InventoryProjectSummary[]>([]); useEffect(() => { if (session) void fetchInventoryProjects(session.token).then(({ data }) => setProjects(data)).catch(() => setProjects([])); }, [session]); const rows = projects.filter((project) => project.status.toLowerCase() === 'active'); return <Screen><PageHeader title="Declare Excess" /><Text style={styles.instruction}>1. Open the correct project</Text><Text style={styles.help}>Every item in one Excess Declaration must belong to the same project.</Text>{rows.map((project) => <Surface key={project.id} onPress={() => router.push({ pathname: '/projects/[id]/declare-excess', params: { id: String(project.id) } } as never)} style={styles.row}><View style={styles.icon}><FolderKanban size={22} color={BRAND.violet} /></View><View style={styles.main}><Text style={styles.name}>{project.name}</Text><Text style={styles.help}>{project.projectCode || `PROJECT-${project.id}`} · {project.client?.name || 'No client'}</Text></View><ChevronRight size={21} color={BRAND.muted} /></Surface>)}{!rows.length ? <EmptyState title="No active projects" message="Only an active project can declare excess." /> : null}</Screen>; }
const styles = StyleSheet.create({ instruction: { marginTop: 6, color: BRAND.ink, fontFamily: TYPE.body, fontSize: 19, fontWeight: '800' }, help: { marginTop: 4, marginBottom: 12, color: BRAND.muted, fontFamily: TYPE.body, fontSize: 11, lineHeight: 16 }, row: { minHeight: 72, marginBottom: 8, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10 }, icon: { width: 44, height: 44, borderRadius: 12, backgroundColor: BRAND.violetSoft, alignItems: 'center', justifyContent: 'center' }, main: { flex: 1 }, name: { color: BRAND.ink, fontFamily: TYPE.body, fontSize: 14, fontWeight: '700' } });
