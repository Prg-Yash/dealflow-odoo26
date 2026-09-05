import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuditRow } from '@/components/admin/audit-row';
import { Pagination } from '@/components/admin/pagination';
import { SectionHeader } from '@/components/admin/section-header';
import { StatTile } from '@/components/admin/stat-tile';
import {
  MOCK_ADMIN_AUDIT_LOGS,
  MOCK_ADMIN_INVITATIONS,
  MOCK_ADMIN_MEMBERS,
  MOCK_ADMIN_ORG,
  MOCK_ADMIN_PRODUCTS,
  MOCK_ADMIN_RULES,
  MOCK_ADMIN_WAREHOUSES,
} from '@/lib/admin-data';

type AuditFilter = 'ALL' | 'INFO' | 'WARN' | 'CRITICAL';
const LOGS_PER_PAGE = 3;

export default function AdminOverview() {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<AuditFilter>('ALL');
  const [page, setPage] = useState(1);

  const pendingInvites = MOCK_ADMIN_INVITATIONS.filter((i) => i.status === 'PENDING').length;
  const filteredLogs = filter === 'ALL' ? MOCK_ADMIN_AUDIT_LOGS : MOCK_ADMIN_AUDIT_LOGS.filter((l) => l.level === filter);
  
  const totalPages = Math.ceil(filteredLogs.length / LOGS_PER_PAGE);
  const logs = filteredLogs.slice((page - 1) * LOGS_PER_PAGE, page * LOGS_PER_PAGE);

  const FILTERS: AuditFilter[] = ['ALL', 'INFO', 'WARN', 'CRITICAL'];

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Org card */}
        <View style={styles.orgCard}>
          <Text style={styles.orgName}>{MOCK_ADMIN_ORG.name}</Text>
          <View style={styles.orgMeta}>
            <View style={styles.orgTag}><Text style={styles.orgTagText}>slug: {MOCK_ADMIN_ORG.slug}</Text></View>
            <View style={styles.orgTagGreen}><Text style={styles.orgTagGreenText}>Primary Tenant</Text></View>
          </View>
          <Text style={styles.orgSub}>
            Currency: {MOCK_ADMIN_ORG.currency} · Since {new Date(MOCK_ADMIN_ORG.createdAt).toLocaleDateString()}
          </Text>
        </View>

        {/* Stat grid */}
        <View style={styles.statGrid}>
          <StatTile label="Products" value={MOCK_ADMIN_PRODUCTS.length} sub="All active" accent="#ff5e3a" bg="#fff7f5" />
          <StatTile label="Team" value={MOCK_ADMIN_MEMBERS.length} sub={`+${pendingInvites} pending`} accent="#2563eb" bg="#eff6ff" />
        </View>
        <View style={[styles.statGrid, { marginTop: 8 }]}>
          <StatTile label="Rules" value={MOCK_ADMIN_RULES.length} sub="Discount tiers" accent="#7c3aed" bg="#faf5ff" />
          <StatTile label="Warehouses" value={MOCK_ADMIN_WAREHOUSES.length} sub="Locations" accent="#0891b2" bg="#ecfeff" />
        </View>

        {/* Audit log */}
        <View style={styles.section}>
          <SectionHeader title="Audit Log" />

          {/* Filter chips */}
          <View style={styles.filterRow}>
            {FILTERS.map((f) => (
              <Pressable
                key={f}
                onPress={() => {
                  setFilter(f);
                  setPage(1);
                }}
                style={[styles.chip, filter === f && styles.chipActive]}
              >
                <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>{f}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.card}>
            {logs.map((log) => <AuditRow key={log.id} log={log} />)}
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const BORDER = '#e2e8f0';
const BG = '#f8fafc';
const DARK = '#0f172a';
const SLATE = '#64748b';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  scroll: { padding: 16, gap: 16 },

  orgCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: BORDER,
  },
  orgName: { fontSize: 16, fontWeight: '800', color: DARK, marginBottom: 6 },
  orgMeta: { flexDirection: 'row', gap: 6, marginBottom: 6, flexWrap: 'wrap' },
  orgTag: { backgroundColor: '#f1f5f9', borderRadius: 100, paddingHorizontal: 8, paddingVertical: 3 },
  orgTagText: { fontSize: 11, color: '#475569', fontFamily: 'monospace' },
  orgTagGreen: { backgroundColor: '#f0fdf4', borderRadius: 100, paddingHorizontal: 8, paddingVertical: 3 },
  orgTagGreenText: { fontSize: 11, fontWeight: '700', color: '#16a34a' },
  orgSub: { fontSize: 12, color: SLATE },

  statGrid: { flexDirection: 'row', gap: 8 },

  section: { gap: 2 },

  filterRow: { flexDirection: 'row', gap: 6, marginBottom: 10, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 100, backgroundColor: '#fff', borderWidth: 1, borderColor: BORDER },
  chipActive: { backgroundColor: DARK, borderColor: DARK },
  chipText: { fontSize: 11, fontWeight: '700', color: SLATE },
  chipTextActive: { color: '#fff' },

  card: {
    backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 14, paddingTop: 4,
    borderWidth: 1, borderColor: BORDER,
  },
});
