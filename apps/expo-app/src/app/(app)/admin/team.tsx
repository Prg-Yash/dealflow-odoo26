import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MemberRow } from '@/components/admin/member-row';
import { Pagination } from '@/components/admin/pagination';
import { RoleBadge } from '@/components/admin/role-badge';
import { SectionHeader } from '@/components/admin/section-header';
import { MOCK_ADMIN_INVITATIONS, MOCK_ADMIN_MEMBERS } from '@/lib/admin-data';

const MEMBERS_PER_PAGE = 4;

export default function AdminTeam() {
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(1);

  const pendingInvites = MOCK_ADMIN_INVITATIONS.filter((i) => i.status === 'PENDING');
  
  const totalPages = Math.ceil(MOCK_ADMIN_MEMBERS.length / MEMBERS_PER_PAGE);
  const members = MOCK_ADMIN_MEMBERS.slice((page - 1) * MEMBERS_PER_PAGE, page * MEMBERS_PER_PAGE);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Members */}
      <SectionHeader title={`Team · ${MOCK_ADMIN_MEMBERS.length} members`} />
      {members.map((m) => <MemberRow key={m.id} member={m} />)}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {/* Invitations */}
      <View style={styles.sectionGap} />
      <SectionHeader title={`Pending Invites · ${pendingInvites.length}`} />
      {pendingInvites.map((inv) => (
        <View key={inv.id} style={styles.invRow}>
          <View style={styles.invLeft}>
            <Text style={styles.invEmail}>{inv.email}</Text>
            <Text style={styles.invMeta}>{inv.department} · by {inv.invitedBy.split(' ')[0]}</Text>
            <Text style={styles.invExpiry}>Expires {new Date(inv.expiresAt).toLocaleDateString()}</Text>
          </View>
          <RoleBadge role={inv.role} />
        </View>
      ))}
    </ScrollView>
  );
}

const BORDER = '#e2e8f0';
const DARK = '#0f172a';
const SLATE = '#64748b';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { padding: 16, paddingTop: 20 },
  sectionGap: { height: 20 },

  invRow: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10,
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: BORDER,
  },
  invLeft: { flex: 1, gap: 3 },
  invEmail: { fontSize: 13, fontWeight: '700', color: DARK },
  invMeta: { fontSize: 11, color: SLATE },
  invExpiry: { fontSize: 11, color: '#f59e0b', fontWeight: '600' },
});
