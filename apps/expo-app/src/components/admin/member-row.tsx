import { StyleSheet, Text, View } from 'react-native';
import type { AdminMember } from '@/lib/admin-data';
import { RoleBadge } from './role-badge';

export function MemberRow({ member }: { member: AdminMember }) {
  const statusColor = member.status === 'ACTIVE' ? '#16a34a' : member.status === 'SUSPENDED' ? '#dc2626' : '#d97706';

  return (
    <View style={s.row}>
      <View style={s.avatar}>
        <Text style={s.initials}>{member.avatarInitials}</Text>
      </View>
      <View style={s.info}>
        <View style={s.nameRow}>
          <Text style={s.name} numberOfLines={1}>{member.name}</Text>
          <View style={[s.dot, { backgroundColor: statusColor }]} />
        </View>
        <Text style={s.email} numberOfLines={1}>{member.email}</Text>
        <Text style={s.dept} numberOfLines={1}>{member.department}</Text>
      </View>
      <RoleBadge role={member.role} />
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0',
  },
  avatar: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center',
  },
  initials: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  info: { flex: 1, gap: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 14, fontWeight: '700', color: '#0f172a', flex: 1 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  email: { fontSize: 12, color: '#64748b' },
  dept:  { fontSize: 11, color: '#94a3b8' },
});
