import { Tabs } from 'expo-router';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { AdminHeader } from '@/components/admin/admin-header';

// ── Inline SVG icons (no extra dep — react-native-svg already installed) ──────
function IconOverview({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Rect x="3" y="3" width="7" height="7" />
      <Rect x="14" y="3" width="7" height="7" />
      <Rect x="14" y="14" width="7" height="7" />
      <Rect x="3" y="14" width="7" height="7" />
    </Svg>
  );
}
function IconTeam({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <Circle cx="9" cy="7" r="4" />
      <Path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <Path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </Svg>
  );
}
function IconCatalog({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 4h9a5 5 0 0 1 5 5v0a5 5 0 0 1-5 5H4z" />
      <Path d="M4 14h6a4 4 0 0 1 4 4v0a4 4 0 0 1-4 4H4z" />
    </Svg>
  );
}
function IconRules({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 21v-7" /><Path d="M4 10V3" />
      <Path d="M12 21v-9" /><Path d="M12 8V3" />
      <Path d="M20 21v-5" /><Path d="M20 12V3" />
      <Path d="M1 14h6" /><Path d="M9 8h6" /><Path d="M17 16h6" />
    </Svg>
  );
}

const ACCENT = '#ff5e3a';
const INACTIVE = '#94a3b8';

export default function AdminLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        header: () => <AdminHeader />,
        tabBarActiveTintColor: ACCENT,
        tabBarInactiveTintColor: INACTIVE,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#e2e8f0',
          paddingBottom: 6,
          paddingTop: 6,
          height: 62,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', marginTop: 2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Overview', tabBarIcon: ({ color }) => <IconOverview color={color} /> }}
      />
      <Tabs.Screen
        name="team"
        options={{ title: 'Team', tabBarIcon: ({ color }) => <IconTeam color={color} /> }}
      />
      <Tabs.Screen
        name="catalog"
        options={{ title: 'Catalog', tabBarIcon: ({ color }) => <IconCatalog color={color} /> }}
      />
      <Tabs.Screen
        name="rules"
        options={{ title: 'Rules', tabBarIcon: ({ color }) => <IconRules color={color} /> }}
      />
    </Tabs>
  );
}
