import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Bell, Check } from 'lucide-react-native';

import { IconBadge, PageHeader, StatusChip, Surface } from '@/components/inventory-ui';
import { EmptyState, LoadingScreen, Screen } from '@/components/ui';
import { BRAND, TYPE } from '@/constants/brand';
import { fetchNotifications, markNotificationRead } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import type { AppNotification } from '@/types/domain';

export default function NotificationsScreen() {
  const { session } = useAuth(); const [rows, setRows] = useState<AppNotification[]>([]); const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { if (!session) return; setLoading(true); try { setRows((await fetchNotifications(session.token)).data); } finally { setLoading(false); } }, [session]);
  useEffect(() => { const task = setTimeout(load, 0); return () => clearTimeout(task); }, [load]);
  async function read(item: AppNotification) { if (!session || item.isRead) return; setRows((current) => current.map((row) => row.id === item.id ? { ...row, isRead: true } : row)); await markNotificationRead(session.token, item.id); }
  if (loading) return <LoadingScreen label="Loading notifications" />;
  return <Screen refreshing={loading} onRefresh={load} contentStyle={styles.screen}><PageHeader title="Notifications" />{rows.length ? <Surface style={styles.list}>{rows.map((item, index) => <Pressable key={item.id} onPress={() => read(item)} style={[styles.row, index < rows.length - 1 && styles.border, !item.isRead && styles.unread]}><IconBadge accent={item.priority === 'HIGH' ? 'red' : 'violet'} size={44}>{item.isRead ? <Check size={21} color={BRAND.green} /> : <Bell size={21} color={item.priority === 'HIGH' ? BRAND.red : BRAND.violet} />}</IconBadge><View style={styles.main}><Text style={styles.title}>{item.title}</Text><Text style={styles.message}>{item.message}</Text><Text style={styles.date}>{new Date(item.createdAt).toLocaleString()}</Text></View>{!item.isRead ? <StatusChip label="New" accent="red" compact /> : null}</Pressable>)}</Surface> : <EmptyState title="No notifications" message="Inventory approvals and operational alerts will appear here." />}</Screen>;
}

const styles = StyleSheet.create({ screen: { paddingHorizontal: 16, paddingTop: 0 }, list: { overflow: 'hidden' }, row: { minHeight: 94, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }, border: { borderBottomWidth: 1, borderBottomColor: BRAND.line }, unread: { backgroundColor: '#FFF9FB' }, main: { flex: 1, minWidth: 0 }, title: { color: BRAND.ink, fontFamily: TYPE.body, fontSize: 14, fontWeight: '700' }, message: { marginTop: 3, color: BRAND.inkSoft, fontFamily: TYPE.body, fontSize: 12, lineHeight: 17 }, date: { marginTop: 4, color: BRAND.muted, fontFamily: TYPE.body, fontSize: 10 } });
