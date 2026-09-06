import { StyleSheet, Text, View } from 'react-native';

interface Props {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
  bg?: string;
}

export function StatTile({ label, value, sub, accent = '#ff5e3a', bg = '#fff7f5' }: Props) {
  return (
    <View style={[s.tile, { backgroundColor: bg }]}>
      <Text style={s.label}>{label}</Text>
      <Text style={[s.value, { color: accent }]}>{value}</Text>
      {sub ? <Text style={s.sub}>{sub}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  tile: {
    flex: 1, borderRadius: 14, padding: 14, minWidth: 0,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  label: { fontSize: 10, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
  value: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  sub:   { fontSize: 11, color: '#64748b', marginTop: 2 },
});
