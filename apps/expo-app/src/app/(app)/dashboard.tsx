import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandLogo } from '@/components/brand-logo';
import { signOut } from '@/lib/auth';

const ACCENT = '#ff5e3a';
const DARK = '#0f172a';
const SLATE = '#64748b';
const BG = '#f8fafc';
const BORDER = '#e2e8f0';

// Role → display config — mirrors web/lib/roles.ts
const ROLE_CONFIG: Record<string, { label: string; title: string; color: string; bg: string }> = {
  sales_rep: { label: 'Sales Rep',    title: 'Account Executive',        color: '#2563eb', bg: '#eff6ff' },
  manager:   { label: 'Manager',      title: 'Regional Sales Director',  color: '#d97706', bg: '#fffbeb' },
  finance:   { label: 'Finance',      title: 'Billing & Revenue Ops',    color: '#16a34a', bg: '#f0fdf4' },
  admin:     { label: 'System Admin', title: 'Platform Administrator',   color: '#7c3aed', bg: '#faf5ff' },
  customer:  { label: 'Customer',     title: 'Buyer Portal',             color: '#0891b2', bg: '#ecfeff' },
};

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<{ name?: string; email?: string } | null>(null);
  const [role, setRole] = useState('sales_rep');

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem('auth_user'),
      AsyncStorage.getItem('auth_role'),
    ]).then(([rawUser, storedRole]) => {
      if (rawUser) setUser(JSON.parse(rawUser));
      if (storedRole) setRole(storedRole);
    });
  }, []);

  async function handleSignOut() {
    await signOut();
    router.replace('/(auth)/login');
  }

  const cfg = ROLE_CONFIG[role] ?? ROLE_CONFIG.sales_rep;
  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <BrandLogo size="sm" />
        <Pressable onPress={handleSignOut} style={styles.signOutBtn}>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
        {/* Role badge */}
        <View style={[styles.roleBadge, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.roleLabel, { color: cfg.color }]}>{cfg.label}</Text>
        </View>

        {/* User greeting */}
        <View style={styles.greetRow}>
          <View style={[styles.avatar, { backgroundColor: cfg.bg, borderColor: cfg.color }]}>
            <Text style={[styles.avatarText, { color: cfg.color }]}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>
              Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
            </Text>
            <Text style={styles.greetSub}>{user?.email ?? ''}</Text>
          </View>
        </View>

        {/* Role info card */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Your workspace</Text>
          <Text style={styles.cardTitle}>{cfg.title}</Text>
          <View style={[styles.divider]} />
          <Text style={styles.cardNote}>
            This is your DealFlow360 mobile dashboard. Full module views coming soon.
          </Text>
        </View>

        {/* Quick links — ponytail: static list, no nav infra needed yet */}
        <Text style={styles.sectionTitle}>Quick access</Text>
        {[
          { label: 'Pipeline', icon: '📊', desc: 'View active deals' },
          { label: 'Approvals', icon: '✅', desc: 'Pending discount requests' },
          { label: 'Invoices', icon: '🧾', desc: 'Billing & revenue ops' },
        ].map((item) => (
          <View key={item.label} style={styles.quickRow}>
            <Text style={styles.quickIcon}>{item.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.quickLabel}>{item.label}</Text>
              <Text style={styles.quickDesc}>{item.desc}</Text>
            </View>
            <Text style={styles.quickArrow}>›</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: BORDER, backgroundColor: '#fff',
  },
  signOutBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: BG, borderWidth: 1, borderColor: BORDER },
  signOutText: { fontSize: 13, fontWeight: '600', color: SLATE },

  scroll: { padding: 20 },

  roleBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 100, marginBottom: 16 },
  roleLabel: { fontSize: 12, fontWeight: '700' },

  greetRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
  avatar: {
    width: 48, height: 48, borderRadius: 14, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '800' },
  greeting: { fontSize: 18, fontWeight: '700', color: DARK },
  greetSub: { fontSize: 13, color: SLATE, marginTop: 2 },

  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: BORDER, marginBottom: 24,
    shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  cardLabel: { fontSize: 11, fontWeight: '700', color: SLATE, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: DARK, marginBottom: 12 },
  divider: { height: 1, backgroundColor: BORDER, marginBottom: 12 },
  cardNote: { fontSize: 13, color: SLATE, lineHeight: 19 },

  sectionTitle: { fontSize: 13, fontWeight: '700', color: SLATE, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 12 },

  quickRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: BORDER,
  },
  quickIcon: { fontSize: 22 },
  quickLabel: { fontSize: 14, fontWeight: '600', color: DARK },
  quickDesc: { fontSize: 12, color: SLATE, marginTop: 2 },
  quickArrow: { fontSize: 20, color: '#cbd5e1' },
});
