import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const HOLD_MS = 1400;  // how long the splash stays visible
const FADE_MS = 400;   // fade-out duration

/**
 * JS-side branded splash overlay.
 * Uses plain React Native Animated — no Reanimated, no worklets.
 * Covers the screen while the app boots, then fades out.
 */
export function DealFlowSplashOverlay() {
  const opacity = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(0.7)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // 1. Logo pops in
    Animated.spring(logoScale, {
      toValue: 1,
      tension: 120,
      friction: 8,
      useNativeDriver: true,
    }).start();

    // 2. Wordmark fades in slightly after
    Animated.timing(textOpacity, {
      toValue: 1,
      duration: 350,
      delay: 200,
      useNativeDriver: true,
    }).start();

    // 3. After hold, fade out the whole overlay
    const timeout = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: FADE_MS,
        useNativeDriver: true,
      }).start(() => setVisible(false));
    }, HOLD_MS);

    return () => clearTimeout(timeout);
  }, []);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlay, { opacity }]}>
      {/* Decorative circles */}
      <View style={styles.blob1} />
      <View style={styles.blob2} />

      {/* Logo mark */}
      <Animated.View style={[styles.logoMark, { transform: [{ scale: logoScale }] }]}>
        <Svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="#ff5e3a" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M4 4h9a5 5 0 0 1 5 5v0a5 5 0 0 1-5 5H4z" />
          <Path d="M4 14h6a4 4 0 0 1 4 4v0a4 4 0 0 1-4 4H4z" />
        </Svg>
      </Animated.View>

      {/* Wordmark + tagline */}
      <Animated.View style={{ opacity: textOpacity, alignItems: 'center' }}>
        <Text style={styles.wordmark}>
          DealFlow<Text style={styles.wordmarkDim}>360</Text>
        </Text>
        <Text style={styles.tagline}>Enterprise Sales Platform</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ff5e3a',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  blob1: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  blob2: {
    position: 'absolute',
    bottom: -80,
    left: -80,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(0,0,0,0.07)',
  },
  logoMark: {
    width: 88,
    height: 88,
    borderRadius: 26,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  wordmark: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  wordmarkDim: {
    color: 'rgba(255,255,255,0.6)',
  },
  tagline: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 0.4,
    fontWeight: '500',
  },
});
