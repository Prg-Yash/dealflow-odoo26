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
import { signUp } from '@/lib/auth';
import { PasswordInput } from '@/components/password-input';

// ─── Design tokens ────────────────────────────────────────────────────────────
const ACCENT = '#ff5e3a';
const DARK = '#0f172a';
const SLATE = '#64748b';
const BORDER = '#e2e8f0';
const INPUT_BG = '#f8fafc';
const ERROR = '#ef4444';

// ─── Validation helpers ───────────────────────────────────────────────────────
const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const isValidPassword = (v: string) => v.length >= 8;
const isValidName = (v: string) => v.trim().length >= 2;

// ─── Role config (mirrors web/lib/roles.ts) ───────────────────────────────────
type UserRole = 'sales_rep' | 'manager' | 'finance' | 'admin';

const ROLES: { id: UserRole; label: string; title: string }[] = [
  { id: 'sales_rep', label: 'Sales Rep', title: 'Account Executive / Sales Rep' },
  { id: 'manager', label: 'Sales Manager', title: 'Regional Sales Director' },
  { id: 'finance', label: 'Finance', title: 'Billing & Revenue Operations' },
  { id: 'admin', label: 'System Admin', title: 'Platform Administrator' },
];

// ─── Register Screen ──────────────────────────────────────────────────────────
export default function RegisterScreen() {
  const insets = useSafeAreaInsets();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [nameTouched, setNameTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [companyTouched, setCompanyTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameError = nameTouched && !isValidName(fullName) ? 'Name must be at least 2 characters.' : null;
  const emailError = emailTouched && !isValidEmail(email) ? 'Please enter a valid work email address.' : null;
  const companyError = companyTouched && !isValidName(company) ? 'Company name must be at least 2 characters.' : null;
  const passwordError = passwordTouched && !isValidPassword(password) ? 'Password must be at least 8 characters.' : null;
  const isFormValid = isValidName(fullName) && isValidEmail(email) && isValidName(company) && isValidPassword(password);

  async function handleSubmit() {
    setNameTouched(true);
    setEmailTouched(true);
    setCompanyTouched(true);
    setPasswordTouched(true);
    if (!isFormValid) return;

    setError(null);
    setLoading(true);
    try {
      await signUp(email, password, fullName);
      await AsyncStorage.setItem('auth_role', 'customer');
      router.replace('/(app)/dashboard');
    } catch (e: any) {
      setError(e.message ?? 'Could not create account. Please try again.');
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
            <Text style={styles.cardTitle}>Create Account</Text>
            <Text style={styles.cardDesc}>
              Join DealFlow360 to collaborate on deals and quotations
            </Text>

            {/* Tab row */}
            <View style={styles.tabRow}>
              <Pressable style={styles.tab} onPress={() => router.push('/(auth)/login')}>
                <Text style={styles.tabText}>Log In</Text>
              </Pressable>
              <View style={[styles.tab, styles.tabActive]}>
                <Text style={[styles.tabText, styles.tabTextActive]}>Sign Up</Text>
              </View>
            </View>

            {/* Error banner */}
            {error && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            )}

            {/* Full Name */}
            <View style={styles.field}>
              <Text style={styles.label}>Full Name <Text style={{ color: ACCENT }}>*</Text></Text>
              <TextInput
                style={[styles.input, nameError ? styles.inputError : nameTouched && isValidName(fullName) ? styles.inputValid : null]}
                placeholder="Sarah Jenkins"
                placeholderTextColor="#94a3b8"
                value={fullName}
                onChangeText={(v) => { setFullName(v); setNameTouched(true); }}
                autoCapitalize="words"
              />
              {nameError && <Text style={styles.fieldError}>{nameError}</Text>}
            </View>

            {/* Work Email */}
            <View style={styles.field}>
              <Text style={styles.label}>Work Email <Text style={{ color: ACCENT }}>*</Text></Text>
              <TextInput
                style={[styles.input, emailError ? styles.inputError : emailTouched && isValidEmail(email) ? styles.inputValid : null]}
                placeholder="s.jenkins@acmetechnologies.com"
                placeholderTextColor="#94a3b8"
                value={email}
                onChangeText={(v) => { setEmail(v); setEmailTouched(true); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {emailError && <Text style={styles.fieldError}>{emailError}</Text>}
            </View>

            {/* Company */}
            <View style={styles.field}>
              <Text style={styles.label}>Company Name <Text style={{ color: ACCENT }}>*</Text></Text>
              <TextInput
                style={[styles.input, companyError ? styles.inputError : companyTouched && isValidName(company) ? styles.inputValid : null]}
                placeholder="Acme Technologies, Inc."
                placeholderTextColor="#94a3b8"
                value={company}
                onChangeText={(v) => { setCompany(v); setCompanyTouched(true); }}
                autoCapitalize="words"
              />
              {companyError && <Text style={styles.fieldError}>{companyError}</Text>}
            </View>

            {/* Password */}
            <View style={styles.field}>
              <Text style={styles.label}>Create Password <Text style={{ color: ACCENT }}>*</Text></Text>
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
                : <Text style={styles.btnText}>Create Account →</Text>
              }
            </Pressable>
          </View>

          {/* Footer links */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Pressable onPress={() => router.push('/(auth)/login')}>
              <Text style={[styles.footerText, { color: ACCENT, fontWeight: '600' }]}>Log In</Text>
            </Pressable>
          </View>

          {/* Org signup separator */}
          <View style={styles.orgSeparator}>
            <View style={styles.orgSeparatorLine} />
            <Text style={styles.orgSeparatorText}>for businesses</Text>
            <View style={styles.orgSeparatorLine} />
          </View>

          {/* Org signup CTA */}
          <Pressable style={styles.orgSignupBtn} onPress={() => router.push('/(auth)/org-signup')}>
            <View>
              <Text style={styles.orgSignupTitle}>Registering an organization?</Text>
              <Text style={styles.orgSignupDesc}>Set up your team workspace as an admin</Text>
            </View>
            <Text style={styles.orgSignupArrow}>→</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: INPUT_BG },
  scroll: { paddingHorizontal: 20, paddingTop: 32 },

  logoArea: { alignItems: 'center', marginBottom: 28 },
  logoMark: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center',
    marginBottom: 10,
    shadowColor: ACCENT, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
  },
  logoMarkText: { fontSize: 28, fontWeight: '800', color: '#fff' },
  logoLabel: { fontSize: 20, fontWeight: '700', color: DARK },

  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 22,
    borderWidth: 1, borderColor: '#f1f5f9',
    shadowColor: '#0f172a', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 16, elevation: 4,
    marginBottom: 20,
  },
  cardTitle: { fontSize: 22, fontWeight: '700', color: DARK, marginBottom: 4 },
  cardDesc: { fontSize: 13, color: SLATE, marginBottom: 18, lineHeight: 19 },

  tabRow: { flexDirection: 'row', borderRadius: 10, backgroundColor: INPUT_BG, padding: 4, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 13, fontWeight: '600', color: SLATE },
  tabTextActive: { color: DARK },

  errorBanner: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 10, padding: 10, marginBottom: 14 },
  errorBannerText: { fontSize: 12, color: '#b91c1c', fontWeight: '500' },

  field: { marginBottom: 14 },
  label: { fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
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

  btn: {
    height: 50, borderRadius: 13, backgroundColor: ACCENT,
    alignItems: 'center', justifyContent: 'center', marginTop: 6,
    shadowColor: ACCENT, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
  },
  btnDisabled: { opacity: 0.5, shadowOpacity: 0 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  footerRow: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', marginBottom: 20 },
  footerText: { fontSize: 13, color: SLATE },

  // Org signup
  orgSeparator: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  orgSeparatorLine: { flex: 1, height: 1, backgroundColor: BORDER },
  orgSeparatorText: { fontSize: 11, color: '#94a3b8', fontWeight: '500' },
  orgSignupBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderRadius: 14, borderWidth: 1.5, borderColor: BORDER,
    backgroundColor: '#fff',
  },
  orgSignupTitle: { fontSize: 14, fontWeight: '700', color: DARK, marginBottom: 2 },
  orgSignupDesc: { fontSize: 12, color: SLATE },
  orgSignupArrow: { fontSize: 18, color: SLATE },
});
