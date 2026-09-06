import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Pagination } from '@/components/admin/pagination';
import { RuleCard } from '@/components/admin/rule-card';
import { SectionHeader } from '@/components/admin/section-header';
import { MOCK_ADMIN_RULES } from '@/lib/admin-data';

const RULES_PER_PAGE = 2;

export default function AdminRules() {
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(1);
  const totalTriggers = MOCK_ADMIN_RULES.reduce((a, r) => a + r.dealTriggersCount, 0);

  const totalPages = Math.ceil(MOCK_ADMIN_RULES.length / RULES_PER_PAGE);
  const rules = MOCK_ADMIN_RULES.slice((page - 1) * RULES_PER_PAGE, page * RULES_PER_PAGE);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Summary bar */}
      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryVal}>{MOCK_ADMIN_RULES.length}</Text>
          <Text style={styles.summaryLabel}>Active Tiers</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryVal}>{totalTriggers}</Text>
          <Text style={styles.summaryLabel}>Deals Governed</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryVal}>100%</Text>
          <Text style={styles.summaryLabel}>Coverage</Text>
        </View>
      </View>

      <View style={styles.sectionGap} />
      <SectionHeader title="Discount Approval Rules" />
      {rules.map((r) => <RuleCard key={r.id} rule={r} />)}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {/* Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Escalation Logic</Text>
        {[
          { label: 'Auto-Approved', color: '#16a34a', desc: '0 – 5% discount, low risk' },
          { label: 'Manager Review', color: '#d97706', desc: '5.1 – 15%, moderate risk' },
          { label: 'Dual Approval', color: '#dc2626', desc: '>15%, or high risk score' },
        ].map((item) => (
          <View key={item.label} style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
            <Text style={styles.legendLabel}>{item.label}</Text>
            <Text style={styles.legendDesc}>{item.desc}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const BORDER = '#e2e8f0';
const SLATE = '#64748b';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { padding: 16, paddingTop: 20 },
  sectionGap: { height: 20 },

  summary: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderRadius: 16, padding: 16, borderWidth: 1, borderColor: BORDER,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryVal: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  summaryLabel: { fontSize: 10, fontWeight: '700', color: SLATE, textTransform: 'uppercase', marginTop: 2 },
  divider: { width: 1, backgroundColor: BORDER, marginHorizontal: 4 },

  legend: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: BORDER, marginTop: 16, gap: 10,
  },
  legendTitle: { fontSize: 11, fontWeight: '800', color: SLATE, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 12, fontWeight: '700', color: '#0f172a', width: 100 },
  legendDesc: { fontSize: 11, color: SLATE, flex: 1 },
});
