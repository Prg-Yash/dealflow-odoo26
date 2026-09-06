import { StyleSheet, Text, View } from 'react-native';
import type { AdminDiscountRule } from '@/lib/admin-data';

const ESC_COLOR: Record<string, { label: string; color: string; bg: string }> = {
  NONE:                       { label: 'Auto-Approved',   color: '#16a34a', bg: '#f0fdf4' },
  SALES_MANAGER:              { label: 'Manager Review',  color: '#d97706', bg: '#fffbeb' },
  SALES_MANAGER_AND_FINANCE:  { label: 'Dual Approval',   color: '#dc2626', bg: '#fef2f2' },
};

export function RuleCard({ rule }: { rule: AdminDiscountRule }) {
  const esc = ESC_COLOR[rule.escalationLevel] ?? ESC_COLOR.NONE;
  return (
    <View style={s.card}>
      <View style={s.header}>
        <Text style={s.name} numberOfLines={1}>{rule.name}</Text>
        <View style={[s.pill, { backgroundColor: esc.bg }]}>
          <Text style={[s.pillText, { color: esc.color }]}>{esc.label}</Text>
        </View>
      </View>
      <Text style={s.range}>
        {rule.minDiscountPercent}% – {rule.maxDiscountPercent === 100 ? '100%+' : `${rule.maxDiscountPercent}%`}
      </Text>
      <Text style={s.desc} numberOfLines={2}>{rule.description}</Text>
      <View style={s.footer}>
        <Text style={s.triggers}>{rule.dealTriggersCount} deals triggered</Text>
        <View style={[s.activeDot, { backgroundColor: rule.isActive ? '#16a34a' : '#94a3b8' }]} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0',
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 },
  name: { fontSize: 14, fontWeight: '700', color: '#0f172a', flex: 1 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100 },
  pillText: { fontSize: 10, fontWeight: '700' },
  range: { fontSize: 18, fontWeight: '800', color: '#ff5e3a', marginBottom: 6 },
  desc: { fontSize: 12, color: '#64748b', lineHeight: 17, marginBottom: 10 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  triggers: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
  activeDot: { width: 8, height: 8, borderRadius: 4 },
});
