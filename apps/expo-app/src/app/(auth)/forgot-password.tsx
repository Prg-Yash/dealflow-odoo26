'use client';

import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ACCENT = '#ff5e3a';
const DARK = '#0f172a';
const SLATE = '#64748b';
const BORDER = '#e2e8f0';
const BG = '#f8fafc';

type Step = 'email' | 'sent';

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<Step>('email');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);

  async function handleSend() {
    if (!email) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    setLoading(false);
    setStep('sent');
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.blob1} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back button */}
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backIcon}>←</Text>
            <Text style={styles.backText}>Back to sign in</Text>
          </Pressable>

          {/* Card */}
          <View style={styles.card}>
            {step === 'email' ? (
              <>
                {/* Icon */}
                <View style={styles.iconCircle}>
                  <Text style={styles.iconEmoji}>🔑</Text>
                </View>

                <Text style={styles.title}>Reset password</Text>
                <Text style={styles.subtitle}>
                  Enter your work email and we'll send you a secure reset link.
                </Text>

                <View style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>Work email</Text>
                  <TextInput
                    style={[styles.input, focused && styles.inputFocused]}
                    placeholder="you@company.com"
                    placeholderTextColor="#94a3b8"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                  />
                </View>

                <Pressable
                  style={[styles.btn, !email && styles.btnDisabled]}
                  onPress={handleSend}
                  disabled={loading || !email}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.btnText}>Send reset link</Text>
                  )}
                </Pressable>

                {/* Help text */}
                <View style={styles.helpBox}>
                  <Text style={styles.helpText}>
                    If you don't receive an email within a few minutes, check your spam folder or contact your IT admin.
                  </Text>
                </View>
              </>
            ) : (
              /* Success state */
              <>
                <View style={styles.successCircle}>
                  <Text style={styles.successIcon}>✉️</Text>
                </View>
                <Text style={styles.title}>Check your inbox</Text>
                <Text style={styles.subtitle}>
                  We sent a password reset link to
                </Text>
                <Text style={styles.emailHighlight}>{email}</Text>

                <View style={styles.stepList}>
                  {['Open the email from DealFlow360', 'Click the secure reset link', 'Create your new password'].map((s, i) => (
                    <View key={i} style={styles.stepRow}>
                      <View style={styles.stepNum}>
                        <Text style={styles.stepNumText}>{i + 1}</Text>
                      </View>
                      <Text style={styles.stepText}>{s}</Text>
                    </View>
                  ))}
                </View>

                <Pressable style={styles.btn} onPress={() => router.replace('/(auth)/login')}>
                  <Text style={styles.btnText}>Back to sign in</Text>
                </Pressable>

                <Pressable style={styles.resendBtn} onPress={() => setStep('email')}>
                  <Text style={styles.resendText}>Didn't get it? Try again</Text>
                </Pressable>
              </>
            )}
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              © 2025 DealFlow360 · Enterprise Sales Platform
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  flex: { flex: 1 },
  blob1: {
    position: 'absolute',
    top: -60,
    left: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#ff5e3a12',
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
    justifyContent: 'center',
  },

  // Back
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 28 },
  backIcon: { fontSize: 18, color: DARK },
  backText: { fontSize: 14, fontWeight: '600', color: DARK },

  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 28,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 20,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    alignItems: 'center',
  },

  // Email step icons
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#fff7f5',
    borderWidth: 1.5,
    borderColor: '#fecdc5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  iconEmoji: { fontSize: 28 },

  title: {
    fontSize: 22,
    fontWeight: '700',
    color: DARK,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: { fontSize: 14, color: SLATE, textAlign: 'center', lineHeight: 20, marginBottom: 24 },

  fieldWrap: { gap: 6, marginBottom: 20, width: '100%' },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: DARK },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: BORDER,
    paddingHorizontal: 14,
    fontSize: 15,
    color: DARK,
    backgroundColor: '#fff',
  },
  inputFocused: { borderColor: ACCENT },

  btn: {
    width: '100%',
    height: 52,
    borderRadius: 14,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.5, shadowOpacity: 0 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  helpBox: {
    marginTop: 20,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
    width: '100%',
  },
  helpText: { fontSize: 12, color: SLATE, lineHeight: 18, textAlign: 'center' },

  // Success state
  successCircle: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: '#f0fdf4',
    borderWidth: 1.5,
    borderColor: '#bbf7d0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  successIcon: { fontSize: 32 },
  emailHighlight: {
    fontSize: 14,
    fontWeight: '700',
    color: ACCENT,
    marginBottom: 24,
    textAlign: 'center',
  },

  stepList: { width: '100%', gap: 12, marginBottom: 24 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#fff7f5',
    borderWidth: 1.5,
    borderColor: '#fecdc5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: { fontSize: 13, fontWeight: '700', color: ACCENT },
  stepText: { fontSize: 13, color: DARK, fontWeight: '500' },

  resendBtn: { marginTop: 14, padding: 8 },
  resendText: { fontSize: 13, color: ACCENT, fontWeight: '600' },

  footer: { alignItems: 'center', marginTop: 24 },
  footerText: { fontSize: 11, color: '#94a3b8', textAlign: 'center' },
});
