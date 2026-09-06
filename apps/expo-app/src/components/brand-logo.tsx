import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

type Size = 'sm' | 'md' | 'lg';

interface BrandLogoProps {
  size?: Size;
  subtitle?: string;
}

const SIZE_MAP = {
  sm: { box: 28, icon: 14, font: 14 },
  md: { box: 36, icon: 18, font: 17 },
  lg: { box: 44, icon: 22, font: 21 },
};

/**
 * Exact React Native port of packages/ui/src/components/brand-logo.tsx
 * Same gradient box, same SVG icon, same DealFlow360 wordmark.
 */
export function BrandLogo({ size = 'md', subtitle }: BrandLogoProps) {
  const s = SIZE_MAP[size];

  return (
    <View style={styles.row}>
      {/* Gradient monogram box — approximated with a flat orange (RN has no CSS gradient by default) */}
      <View style={[styles.box, { width: s.box, height: s.box, borderRadius: s.box * 0.35 }]}>
        <Svg
          width={s.icon}
          height={s.icon}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Top bar: D-shape */}
          <Path d="M4 4h9a5 5 0 0 1 5 5v0a5 5 0 0 1-5 5H4z" />
          {/* Bottom bar: smaller rectangle */}
          <Path d="M4 14h6a4 4 0 0 1 4 4v0a4 4 0 0 1-4 4H4z" />
        </Svg>
      </View>

      {/* Wordmark */}
      <View style={styles.textCol}>
        <Text style={[styles.wordmark, { fontSize: s.font }]}>
          DealFlow<Text style={styles.accent}>360</Text>
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  box: {
    backgroundColor: '#ff5e3a',  // flat approximation of from-[#ff7a50] to-[#ea4e28]
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ff5e3a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  textCol: { flexDirection: 'column' },
  wordmark: {
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.4,
    lineHeight: undefined,
  },
  accent: { color: '#ff5e3a' },
  subtitle: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: -2,
  },
});
