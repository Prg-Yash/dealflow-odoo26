import { StyleSheet, Text, View } from 'react-native';

const T: Record<string, { label: string; color: string; bg: string }> = {
  ADMIN:         { label: 'Admin',    color: '#7c3aed', bg: '#faf5ff' },
  SALES_MANAGER: { label: 'Manager', color: '#d97706', bg: '#fffbeb' },
  SALES_REP:     { label: 'Sales Rep',color: '#2563eb', bg: '#eff6ff' },
  FINANCE_OPS:   { label: 'Finance', color: '#16a34a', bg: '#f0fdf4' },
  CUSTOMER:      { label: 'Customer', color: '#0891b2', bg: '#ecfeff' },
};

export function RoleBadge({ role }: { role: string }) {
  const c = T[role] ?? { label: role, color: '#64748b', bg: '#f1f5f9' };
  return (
    <View style={[s.pill, { backgroundColor: c.bg }]}>
      <Text style={[s.text, { color: c.color }]}>{c.label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100, alignSelf: 'flex-start' },
  text: { fontSize: 11, fontWeight: '700' },
});
