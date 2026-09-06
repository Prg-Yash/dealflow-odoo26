import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

interface Props {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  hasError?: boolean;
  isValid?: boolean;
}

const BORDER = '#e2e8f0';
const ACCENT = '#ff5e3a';
const ERROR = '#ef4444';
const DARK = '#0f172a';
const INPUT_BG = '#f8fafc';

function EyeOpen({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <Circle cx="12" cy="12" r="3" />
    </Svg>
  );
}

function EyeOff({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <Path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <Line x1="1" y1="1" x2="23" y2="23" />
    </Svg>
  );
}

export function PasswordInput({ value, onChangeText, placeholder = '••••••••••••', hasError, isValid }: Props) {
  const [show, setShow] = useState(false);

  const borderColor = hasError ? ERROR : isValid ? '#22c55e' : BORDER;

  return (
    <View style={[styles.wrapper, { borderColor }]}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        secureTextEntry={!show}
        autoCapitalize="none"
        autoCorrect={false}
        // Kills the native Android underline that causes the double-border
        underlineColorAndroid="transparent"
      />
      <Pressable onPress={() => setShow((v) => !v)} hitSlop={12} style={styles.eyeBtn}>
        {show ? <EyeOff /> : <EyeOpen />}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    backgroundColor: INPUT_BG,
    // No overflow clip needed — children stay within bounds
  },
  input: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 14,
    fontSize: 14,
    color: DARK,
    // Prevent React Native from adding its own border/shadow on focus
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  eyeBtn: {
    paddingHorizontal: 12,
    height: '100%',
    justifyContent: 'center',
  },
});
