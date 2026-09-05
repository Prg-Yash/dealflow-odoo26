import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { BrandLogo } from '@/components/brand-logo';
import { signIn, inferRole } from '@/lib/auth';
import { PasswordInput } from '@/components/password-input';


// ─── Design tokens (mirrors web) ─────────────────────────────────────────────
const ACCENT = '#ff5e3a';
const DARK = '#0f172a';
const SLATE = '#64748b';
const BORDER = '#e2e8f0';
const INPUT_BG = '#f8fafc';
const ERROR = '#ef4444';

// ─── Helpers (mirrors web/lib/validation.ts) ─────────────────────────────────
const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const isValidPassword = (v: string) => v.length >= 8;

export default function LoginScreen() {
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailError = emailTouched && !isValidEmail(email) ? 'Please enter a valid email address.' : null;
  const passwordError = passwordTouched && !isValidPassword(password) ? 'Password must be at least 8 characters.' : null;
  const isFormValid = isValidEmail(email) && isValidPassword(password);

  async function handleSubmit() {
    setEmailTouched(true);
    setPasswordTouched(true);
    if (!isFormValid) return;

    setError(null);
    setLoading(true);
    try {
      await signIn(email, password);
      await AsyncStorage.setItem('auth_role', inferRole(email));
      router.replace('/(app)/dashboard');
    } catch (e: any) {
      setError(e.message ?? 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.logoArea}>
            <BrandLogo size="lg" />
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Welcome Back</Text>
            <Text style={styles.cardDesc}>
              Sign in to orchestrate deals, approvals & revenue
            </Text>

            {/* Tab row */}
            <View style={styles.tabRow}>
              <View style={[styles.tab, styles.tabActive]}>
                <Text style={[styles.tabText, styles.tabTextActive]}>Log In</Text>
              </View>
              <Pressable style={styles.tab} onPress={() => router.push('/(auth)/register')}>
                <Text style={styles.tabText}>Sign Up</Text>
              </Pressable>
            </View>

            {/* Error banner */}
            {error && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            )}

            {/* Email */}
            <View style={styles.field}>
              <Text style={styles.label}>
                Email Address <Text style={{ color: ACCENT }}>*</Text>
              </Text>
              <TextInput
                style={[
                  styles.input,
                  emailError ? styles.inputError : emailTouched && isValidEmail(email) ? styles.inputValid : null,
                ]}
                placeholder="name@company.com"
                placeholderTextColor="#94a3b8"
                value={email}
                onChangeText={(v) => { setEmail(v); setEmailTouched(true); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {emailError && <Text style={styles.fieldError}>{emailError}</Text>}
            </View>

            {/* Password */}
            <View style={styles.field}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>
                  Password <Text style={{ color: ACCENT }}>*</Text>
                </Text>
                <Pressable onPress={() => router.push('/(auth)/forgot-password')}>
                  <Text style={styles.forgotLink}>Forgot password?</Text>
                </Pressable>
              </View>
              <PasswordInput
                value={password}
                onChangeText={(v) => { setPassword(v); setPasswordTouched(true); }}
                hasError={!!passwordError}
                isValid={passwordTouched && isValidPassword(password)}
              />
              {passwordError && <Text style={styles.fieldError}>{passwordError}</Text>}
            </View>

            {/* Submit */}
            <Pressable
              style={[styles.btn, (!isFormValid || loading) && styles.btnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>Log In →</Text>
              }
            </Pressable>
          </View>

          {/* Footer link */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Don't have an account yet? </Text>
            <Pressable onPress={() => router.push('/(auth)/register')}>
              <Text style={[styles.footerText, { color: ACCENT, fontWeight: '600' }]}>Create an account</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: INPUT_BG },
  scroll: { paddingHorizontal: 20, paddingTop: 32 },

  // Logo
  logoArea: { alignItems: 'center', marginBottom: 28 },

  // Card
  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 22,
    borderWidth: 1, borderColor: '#f1f5f9',
    shadowColor: '#0f172a', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 16, elevation: 4,
    marginBottom: 20,
  },
  cardTitle: { fontSize: 22, fontWeight: '700', color: DARK, marginBottom: 4 },
  cardDesc: { fontSize: 13, color: SLATE, marginBottom: 18, lineHeight: 19 },

  // Tabs
  tabRow: { flexDirection: 'row', borderRadius: 10, backgroundColor: INPUT_BG, padding: 4, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 13, fontWeight: '600', color: SLATE },
  tabTextActive: { color: DARK },

  // Error banner
  errorBanner: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 10, padding: 10, marginBottom: 14 },
  errorBannerText: { fontSize: 12, color: '#b91c1c', fontWeight: '500' },

  // Fields
  field: { marginBottom: 14 },
  label: { fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  forgotLink: { fontSize: 11, color: SLATE, fontWeight: '500' },
  input: {
    height: 46, borderRadius: 12, borderWidth: 1.5, borderColor: BORDER,
    paddingHorizontal: 14, fontSize: 14, color: DARK, backgroundColor: INPUT_BG,
  },
  inputRow: {
    height: 46, borderRadius: 12, borderWidth: 1.5, borderColor: BORDER,
    flexDirection: 'row', alignItems: 'center', backgroundColor: INPUT_BG,
  },
  inputInner: { flex: 1, paddingHorizontal: 14, fontSize: 14, color: DARK },
  inputError: { borderColor: ERROR },
  inputValid: { borderColor: '#22c55e' },
  eyeBtn: { paddingHorizontal: 12 },
  eyeText: { fontSize: 15 },
  fieldError: { fontSize: 11, color: ERROR, fontWeight: '500', marginTop: 4 },

  // Button
  btn: {
    height: 50, borderRadius: 13, backgroundColor: ACCENT,
    alignItems: 'center', justifyContent: 'center', marginTop: 6,
    shadowColor: ACCENT, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
  },
  btnDisabled: { opacity: 0.5, shadowOpacity: 0 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Footer
  footerRow: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap' },
  footerText: { fontSize: 13, color: SLATE },
});
