import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandLogo } from '@/components/brand-logo';

export function AdminHeader() {
  const insets = useSafeAreaInsets();
  const [userName, setUserName] = useState('Admin');

  useEffect(() => {
    AsyncStorage.getItem('auth_user').then((raw) => {
      if (raw) {
        const u = JSON.parse(raw);
        if (u?.name) setUserName(u.name.split(' ')[0]);
      }
    });
  }, []);

  async function handleSignOut() {
    await AsyncStorage.removeItem('auth_token');
    await AsyncStorage.removeItem('auth_role');
    router.replace('/(auth)/login');
  }

  return (
    <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
      <BrandLogo size="sm" />
      <View style={styles.headerMid}>
        <Text style={styles.headerLabel}>Admin Console</Text>
        <Text style={styles.headerName}>Welcome, {userName}</Text>
      </View>
      <Pressable onPress={handleSignOut} style={styles.signOutBtn}>
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const BORDER = '#e2e8f0';
const BG = '#f8fafc';
const DARK = '#0f172a';
const SLATE = '#64748b';

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: BORDER, gap: 10,
  },
  headerMid: { flex: 1 },
  headerLabel: { fontSize: 10, fontWeight: '700', color: '#ff5e3a', textTransform: 'uppercase', letterSpacing: 0.6 },
  headerName: { fontSize: 14, fontWeight: '700', color: DARK },
  signOutBtn: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: BG, borderWidth: 1, borderColor: BORDER },
  signOutText: { fontSize: 12, fontWeight: '600', color: SLATE },
});
