import { StyleSheet, Text, View } from 'react-native';
import type { AuditLevel } from '@/lib/admin-data';

const T: Record<AuditLevel, { color: string; bg: string }> = {
  INFO:     { color: '#2563eb', bg: '#eff6ff' },
  WARN:     { color: '#d97706', bg: '#fffbeb' },
  CRITICAL: { color: '#dc2626', bg: '#fef2f2' },
};

export function LevelBadge({ level }: { level: AuditLevel }) {
  const c = T[level];
  return (
    <View style={[s.pill, { backgroundColor: c.bg }]}>
      <Text style={[s.text, { color: c.color }]}>{level}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  pill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start' },
  text: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
});
