import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');
const ACCENT = '#ff5e3a';
const DARK = '#0f172a';
const SLATE = '#64748b';

interface Slide {
  id: string;
  title: string;
  subtitle: string;
}

const SLIDES: Slide[] = [
  {
    id: '1',
    title: 'Your pipeline,\nalways in focus',
    subtitle: 'Track every deal, quota, and rep performance from a single intelligent dashboard.',
  },
  {
    id: '2',
    title: 'Approvals that\ndon\'t slow you down',
    subtitle: 'AI-powered routing sends discount requests to the right manager instantly.',
  },
  {
    id: '3',
    title: 'Finance and sales,\nin perfect sync',
    subtitle: 'Subscriptions, invoices, and exceptions — all in one clean workspace.',
  },
];

function SlideItem({
  item,
  index,
  scrollX,
}: {
  item: Slide;
  index: number;
  scrollX: Animated.SharedValue<number>;
}) {
  const animStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
    const opacity = interpolate(scrollX.value, inputRange, [0, 1, 0], 'clamp');
    const translateY = interpolate(scrollX.value, inputRange, [20, 0, 20], 'clamp');
    return { opacity, transform: [{ translateY }] };
  });

  return (
    <View style={styles.slide}>
      {/* SVG Illustration Placeholder */}
      <View style={styles.illustrationPlaceholder}>
        <View style={styles.placeholderInner}>
          {/* Placeholder grid lines for visual structure */}
          <View style={styles.placeholderLine} />
          <View style={[styles.placeholderLine, { width: '60%', marginTop: 12 }]} />
          <View style={[styles.placeholderLine, { width: '75%', marginTop: 12 }]} />
          <View style={styles.placeholderCircle} />
        </View>
        <Text style={styles.placeholderLabel}>Illustration {index + 1}</Text>
      </View>

      {/* Text block */}
      <Animated.View style={[styles.textBlock, animStyle]}>
        <Text style={styles.slideTitle}>{item.title}</Text>
        <Text style={styles.slideSubtitle}>{item.subtitle}</Text>
      </Animated.View>
    </View>
  );
}

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const flatRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollX = useSharedValue(0);

  const isLast = activeIndex === SLIDES.length - 1;

  async function finish() {
    await AsyncStorage.setItem('onboarded', '1');
    router.replace('/(auth)/login');
  }

  function handleNext() {
    if (isLast) {
      finish();
    } else {
      flatRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
    }
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom + 20 }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoMark}>
          <Text style={styles.logoMarkText}>D</Text>
        </View>
        {!isLast && (
          <Pressable onPress={finish} hitSlop={12}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        )}
      </View>

      {/* Slides */}
      <FlatList
        ref={flatRef}
        data={SLIDES}
        keyExtractor={(s) => s.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={(e) => {
          scrollX.value = e.nativeEvent.contentOffset.x;
        }}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setActiveIndex(index);
        }}
        renderItem={({ item, index }) => (
          <SlideItem item={item} index={index} scrollX={scrollX} />
        )}
      />

      {/* Bottom */}
      <View style={styles.bottom}>
        {/* Dots */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => {
            const dotStyle = useAnimatedStyle(() => {
              const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
              const w = interpolate(scrollX.value, inputRange, [8, 24, 8], 'clamp');
              const opacity = interpolate(scrollX.value, inputRange, [0.3, 1, 0.3], 'clamp');
              return { width: w, opacity };
            });
            return (
              <Animated.View key={i} style={[styles.dot, dotStyle]} />
            );
          })}
        </View>

        {/* CTA */}
        <Pressable style={styles.cta} onPress={handleNext}>
          <Text style={styles.ctaText}>{isLast ? 'Get started' : 'Continue'}</Text>
        </Pressable>

        {/* Sign in link */}
        <Pressable onPress={finish} style={styles.signInRow}>
          <Text style={styles.signInText}>Already have an account? </Text>
          <Text style={[styles.signInText, { color: ACCENT, fontWeight: '600' }]}>Sign in</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#ffffff',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  logoMark: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoMarkText: { fontSize: 20, fontWeight: '800', color: '#fff' },
  skipText: { fontSize: 14, fontWeight: '600', color: SLATE },

  // Slide
  slide: {
    width,
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
  },

  // Illustration placeholder
  illustrationPlaceholder: {
    width: '100%',
    height: height * 0.38,
    borderRadius: 24,
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  placeholderInner: {
    alignItems: 'center',
    marginBottom: 12,
  },
  placeholderLine: {
    width: '50%',
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e2e8f0',
  },
  placeholderCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e2e8f0',
    marginTop: 16,
  },
  placeholderLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
    letterSpacing: 0.3,
  },

  // Text block
  textBlock: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  slideTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: DARK,
    textAlign: 'center',
    lineHeight: 36,
    letterSpacing: -0.5,
    marginBottom: 14,
  },
  slideSubtitle: {
    fontSize: 15,
    color: SLATE,
    textAlign: 'center',
    lineHeight: 23,
    maxWidth: 300,
  },

  // Bottom
  bottom: {
    paddingHorizontal: 24,
    gap: 18,
    paddingTop: 8,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: ACCENT,
  },
  cta: {
    height: 56,
    borderRadius: 16,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  ctaText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  signInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInText: {
    fontSize: 13,
    color: SLATE,
  },
});
