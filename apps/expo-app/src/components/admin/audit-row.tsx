import { StyleSheet, Text, View } from 'react-native';
import type { AdminAuditLog } from '@/lib/admin-data';
import { LevelBadge } from './level-badge';

export function AuditRow({ log }: { log: AdminAuditLog }) {
  return (
    <View style={s.row}>
      <View style={s.left}>
        <LevelBadge level={log.level} />
        <Text style={s.action}>{log.action.replace(/_/g, ' ')}</Text>
        <Text style={s.details} numberOfLines={2}>{log.details}</Text>
      </View>
      <View style={s.right}>
        <Text style={s.by}>{log.performedBy.split(' ')[0]}</Text>
        <Text style={s.time}>{log.timestamp}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row', gap: 10,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  left: { flex: 1, gap: 3 },
  action: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  details: { fontSize: 11, color: '#64748b', lineHeight: 15 },
  right: { alignItems: 'flex-end', gap: 2, minWidth: 56 },
  by: { fontSize: 11, fontWeight: '600', color: '#475569' },
  time: { fontSize: 10, color: '#94a3b8' },
});
