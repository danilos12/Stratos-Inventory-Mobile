import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import {
  AlertTriangle, Bell, Bookmark, Box, Boxes, Check, ChevronDown, ChevronRight, ClipboardCheck,
  Download, FolderKanban, PackageCheck, RotateCcw, ScanLine, ShieldCheck, Upload, WifiOff,
} from 'lucide-react-native';

import { ActionCard, IconBadge, SectionTitle, StatCard, StatusChip, Surface } from '@/components/inventory-ui';
import { Screen } from '@/components/ui';
import { BRAND, SHADOW, TYPE } from '@/constants/brand';
import { openOperationalTask } from '@/lib/inventory-navigation';
import { canApproveInventory, canManageStockRoom } from '@/lib/inventory-rules';
import { useAuth } from '@/providers/auth-provider';
import { useSyncedData } from '@/providers/data-provider';
import { useOfflineInventory } from '@/providers/offline-inventory-provider';
import type { OperationalTask, WarehouseAccess } from '@/types/domain';

const taskAccent = (task: OperationalTask) => task.kind === 'STOCK_IN' ? 'red' : task.kind === 'RELEASE' ? 'blue' : task.kind === 'COUNT' ? 'violet' : task.kind === 'RETURN' ? 'green' : 'amber';

export default function DashboardScreen() {
  const { width } = useWindowDimensions();
  const { session } = useAuth();
  const { workspace, refreshing, refresh, selectWarehouse } = useSyncedData();
  const { pendingCount, conflictCount } = useOfflineInventory();
  const [roomsOpen, setRoomsOpen] = useState(false);
  const selectedRoom = workspace.warehouses.find((room) => room.id === workspace.selectedWarehouseId) || workspace.warehouses[0];
  const columns = width >= 720 ? 4 : 2;
  const cellWidth = `${100 / columns}%` as const;
  const today = useMemo(() => workspace.tasks.filter((task) => task.status !== 'DONE').slice(0, 3), [workspace.tasks]);
  const role = session?.workspace.effectiveRole || session?.user.systemRole;
  const managesStockRoom = canManageStockRoom(role);
  const canApprove = canApproveInventory(role);

  return (
    <Screen refreshing={refreshing} onRefresh={refresh} contentStyle={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Inventory</Text>
        <Pressable onPress={() => setRoomsOpen(true)} style={styles.roomButton}>
          <View style={styles.roomDot} />
          <Text numberOfLines={1} style={styles.roomText}>{selectedRoom?.name || 'Stock Room'}</Text>
          <ChevronDown size={18} color={BRAND.violet} strokeWidth={2.2} />
        </Pressable>
        <Pressable accessibilityLabel="Notifications" onPress={() => router.push('/notifications' as never)} style={styles.bell}>
          <Bell size={29} color={BRAND.inkSoft} strokeWidth={1.9} />
          {workspace.summary.unreadNotifications > 0 ? <View style={styles.badge}><Text style={styles.badgeText}>{Math.min(99, workspace.summary.unreadNotifications)}</Text></View> : null}
        </Pressable>
      </View>

      <Pressable onPress={() => router.push('/scanner')} style={({ pressed }) => [styles.scanHero, pressed && styles.pressed]}>
        <ScanLine size={35} color={BRAND.red} strokeWidth={2.1} />
        <Text style={styles.scanHeroText}>Scan Item or Container</Text>
      </Pressable>

      <View style={styles.grid}>
        <View style={[styles.gridCell, { width: cellWidth }]}><StatCard icon={<Box size={26} color={BRAND.green} />} label="On Hand" value={workspace.summary.onHand} accent="green" onPress={() => router.push('/inventory?filter=ALL')} /></View>
        <View style={[styles.gridCell, { width: cellWidth }]}><StatCard icon={<PackageCheck size={26} color={BRAND.green} />} label="Available" value={workspace.summary.available ?? Math.max(0, workspace.summary.onHand - workspace.summary.reserved)} accent="green" onPress={() => router.push('/inventory?filter=AVAILABLE' as never)} /></View>
        <View style={[styles.gridCell, { width: cellWidth }]}><StatCard icon={<Bookmark size={26} color={BRAND.blue} />} label="Reserved" value={workspace.summary.reserved} accent="blue" onPress={() => router.push('/inventory?filter=RESERVED')} /></View>
        <View style={[styles.gridCell, { width: cellWidth }]}><StatCard icon={<Upload size={26} color={BRAND.violet} />} label="Released to Projects" value={workspace.summary.releasedToProjects || 0} accent="violet" onPress={() => router.push('/projects' as never)} /></View>
        <View style={[styles.gridCell, { width: cellWidth }]}><StatCard icon={<RotateCcw size={26} color={BRAND.blue} />} label="Excess Pending Return" value={workspace.summary.excessPendingReturn || 0} accent="blue" onPress={() => router.push('/receive-excess' as never)} /></View>
        <View style={[styles.gridCell, { width: cellWidth }]}><StatCard icon={<AlertTriangle size={27} color={BRAND.amber} />} label="Low Stock" value={workspace.summary.lowStock} accent="amber" onPress={() => router.push('/inventory?filter=LOW')} /></View>
      </View>

      <View style={[styles.grid, styles.actionGrid]}>
        {managesStockRoom ? <View style={[styles.gridCell, { width: cellWidth }]}><ActionCard icon={<Download size={29} color={BRAND.green} />} label="Stock In" accent="green" onPress={() => router.push('/stock-in' as never)} /></View> : null}
        {managesStockRoom ? <View style={[styles.gridCell, { width: cellWidth }]}><ActionCard icon={<Upload size={29} color={BRAND.red} />} label="Stock Out" accent="red" onPress={() => router.push('/stock-out' as never)} /></View> : null}
        <View style={[styles.gridCell, { width: cellWidth }]}><ActionCard icon={<FolderKanban size={30} color={BRAND.blue} />} label="Projects" accent="blue" onPress={() => router.push('/projects' as never)} /></View>
        <View style={[styles.gridCell, { width: cellWidth }]}><ActionCard icon={<RotateCcw size={30} color={BRAND.blue} />} label="Declare Excess" accent="blue" onPress={() => router.push('/declare-excess' as never)} /></View>
        {managesStockRoom ? <View style={[styles.gridCell, { width: cellWidth }]}><ActionCard icon={<Boxes size={30} color={BRAND.green} />} label="Receive Excess" accent="green" onPress={() => router.push('/receive-excess' as never)} /></View> : null}
        {managesStockRoom ? <View style={[styles.gridCell, { width: cellWidth }]}><ActionCard icon={<ClipboardCheck size={29} color={BRAND.violet} />} label="Physical Count" accent="violet" onPress={() => router.push('/tasks?kind=COUNT' as never)} /></View> : null}
        {canApprove ? <View style={[styles.gridCell, { width: cellWidth }]}><ActionCard icon={<ShieldCheck size={29} color={BRAND.amber} />} label="Pending Approvals" accent="amber" onPress={() => router.push('/tasks' as never)} /></View> : null}
        <View style={[styles.gridCell, { width: cellWidth }]}><ActionCard icon={<WifiOff size={29} color={conflictCount ? BRAND.red : BRAND.violet} />} label={`Pending Sync${pendingCount || conflictCount ? ` (${pendingCount + conflictCount})` : ''}`} accent={conflictCount ? 'red' : 'violet'} onPress={() => router.push('/pending-sync' as never)} /></View>
      </View>

      <SectionTitle action="View all" onAction={() => router.push('/tasks' as never)}>Today’s Tasks</SectionTitle>
      <Surface style={styles.taskList}>
        {today.length ? today.map((task, index) => {
          const accent = taskAccent(task);
          const color = accent === 'red' ? BRAND.red : accent === 'blue' ? BRAND.blue : accent === 'green' ? BRAND.green : accent === 'violet' ? BRAND.violet : BRAND.amber;
          return (
            <Pressable key={task.id} onPress={() => openOperationalTask(task)} style={({ pressed }) => [styles.taskRow, index < today.length - 1 && styles.taskBorder, pressed && styles.rowPressed]}>
              <IconBadge accent={accent} size={44}>{task.kind === 'STOCK_IN' ? <Download size={23} color={color} /> : task.kind === 'RELEASE' ? <Upload size={23} color={color} /> : task.kind === 'COUNT' ? <ClipboardCheck size={23} color={color} /> : task.kind === 'RETURN' ? <RotateCcw size={23} color={color} /> : <AlertTriangle size={23} color={color} />}</IconBadge>
              <View style={styles.taskMain}><Text numberOfLines={1} style={styles.taskTitle}>{task.title}</Text>{task.subtitle ? <Text numberOfLines={1} style={styles.taskSubtitle}>{task.subtitle}</Text> : null}</View>
              <StatusChip label={task.priority[0] + task.priority.slice(1).toLowerCase()} accent={task.priority === 'HIGH' ? 'red' : task.priority === 'MEDIUM' ? 'amber' : 'green'} compact />
              <ChevronRight size={21} color={BRAND.inkSoft} />
            </Pressable>
          );
        }) : <View style={styles.emptyTasks}><Check size={26} color={BRAND.green} /><Text style={styles.emptyTitle}>All caught up</Text><Text style={styles.emptyMessage}>No operational work is waiting in this stock room.</Text></View>}
      </Surface>

      <Modal transparent animationType="fade" visible={roomsOpen} onRequestClose={() => setRoomsOpen(false)}>
        <Pressable onPress={() => setRoomsOpen(false)} style={styles.modalBackdrop}>
          <Pressable onPress={(event) => event.stopPropagation()} style={styles.roomSheet}>
            <Text style={styles.roomSheetTitle}>Select stock room</Text>
            {workspace.warehouses.map((room: WarehouseAccess) => {
              const active = room.id === selectedRoom?.id;
              return <Pressable key={room.id} onPress={async () => { await selectWarehouse(room.id); setRoomsOpen(false); }} style={[styles.roomRow, active && styles.roomRowActive]}><View style={styles.roomRowMain}><Text style={styles.roomName}>{room.name}</Text><Text style={styles.roomCode}>{room.code}</Text></View>{active ? <Check size={22} color={BRAND.red} /> : null}</Pressable>;
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { maxWidth: 980, paddingHorizontal: 18, paddingTop: 12 },
  header: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { color: BRAND.ink, fontFamily: TYPE.body, fontSize: 31, lineHeight: 38, fontWeight: '700', letterSpacing: -0.8 },
  roomButton: { flex: 1, minWidth: 0, maxWidth: 310, height: 42, borderRadius: 24, backgroundColor: BRAND.violetSoft, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 14 },
  roomDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: BRAND.violet },
  roomText: { flexShrink: 1, color: BRAND.violet, fontFamily: TYPE.body, fontSize: 15, fontWeight: '700' },
  bell: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: 0, right: 0, minWidth: 22, height: 22, paddingHorizontal: 5, borderRadius: 11, backgroundColor: BRAND.red, borderWidth: 2, borderColor: BRAND.white, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: BRAND.white, fontFamily: TYPE.body, fontSize: 10, fontWeight: '700' },
  scanHero: { marginTop: 22, minHeight: 105, borderRadius: 17, borderWidth: 1.3, borderColor: '#FFA9BC', backgroundColor: '#FFF8FA', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 17, ...SHADOW },
  scanHeroText: { color: BRAND.red, fontFamily: TYPE.body, fontSize: 23, lineHeight: 29, fontWeight: '700' },
  pressed: { opacity: 0.8, transform: [{ scale: 0.995 }] },
  grid: { marginTop: 20, marginHorizontal: -5, flexDirection: 'row', flexWrap: 'wrap' },
  actionGrid: { marginTop: 12 },
  gridCell: { padding: 5 },
  taskList: { overflow: 'hidden', paddingHorizontal: 0 },
  taskRow: { minHeight: 80, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  taskBorder: { borderBottomWidth: 1, borderBottomColor: BRAND.line },
  rowPressed: { backgroundColor: BRAND.canvas },
  taskMain: { flex: 1, minWidth: 0 },
  taskTitle: { color: BRAND.ink, fontFamily: TYPE.body, fontSize: 15, lineHeight: 20, fontWeight: '700' },
  taskSubtitle: { marginTop: 2, color: BRAND.muted, fontFamily: TYPE.body, fontSize: 12 },
  emptyTasks: { minHeight: 150, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyTitle: { marginTop: 8, color: BRAND.ink, fontFamily: TYPE.body, fontSize: 16, fontWeight: '700' },
  emptyMessage: { marginTop: 4, color: BRAND.muted, fontFamily: TYPE.body, fontSize: 12, textAlign: 'center' },
  modalBackdrop: { flex: 1, backgroundColor: '#07112666', justifyContent: 'flex-end' },
  roomSheet: { maxHeight: '72%', borderTopLeftRadius: 26, borderTopRightRadius: 26, backgroundColor: BRAND.white, paddingHorizontal: 20, paddingTop: 22, paddingBottom: 36 },
  roomSheetTitle: { marginBottom: 14, color: BRAND.ink, fontFamily: TYPE.body, fontSize: 22, fontWeight: '700' },
  roomRow: { minHeight: 66, borderRadius: 14, borderWidth: 1, borderColor: BRAND.line, paddingHorizontal: 15, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  roomRowActive: { borderColor: '#F5A0B4', backgroundColor: BRAND.redSoft },
  roomRowMain: { flex: 1 },
  roomName: { color: BRAND.ink, fontFamily: TYPE.body, fontSize: 15, fontWeight: '700' },
  roomCode: { marginTop: 2, color: BRAND.muted, fontFamily: TYPE.body, fontSize: 11 },
});
