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

const ACCENT = '#ff5e3a';
const DARK = '#0f172a';
const SLATE = '#64748b';
const BORDER = '#e2e8f0';
const INPUT_BG = '#f8fafc';
const ERROR = '#ef4444';

const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const isValidPassword = (v: string) => v.length >= 8;
const isValidName = (v: string) => v.trim().length >= 2;

export default function OrgSignupScreen() {
  const insets = useSafeAreaInsets();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [orgName, setOrgName] = useState('');
  const [orgSize, setOrgSize] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [nameTouched, setNameTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [orgTouched, setOrgTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameError = nameTouched && !isValidName(fullName) ? 'Name must be at least 2 characters.' : null;
  const emailError = emailTouched && !isValidEmail(email) ? 'Please enter a valid email address.' : null;
  const orgError = orgTouched && !isValidName(orgName) ? 'Organization name must be at least 2 characters.' : null;
  const passwordError = passwordTouched && !isValidPassword(password) ? 'Password must be at least 8 characters.' : null;
  const isFormValid = isValidName(fullName) && isValidEmail(email) && isValidName(orgName) && isValidPassword(password);

  const ORG_SIZES = ['1–10', '11–50', '51–200', '201–1000', '1000+'];

  async function handleSubmit() {
    setNameTouched(true);
    setEmailTouched(true);
    setOrgTouched(true);
    setPasswordTouched(true);
    if (!isFormValid) return;

    setError(null);
    setLoading(true);
    try {
      await signUp(email, password, fullName);
      await AsyncStorage.setItem('auth_role', 'admin');
      await AsyncStorage.setItem('auth_org', orgName);
      router.replace('/(app)/dashboard');
    } catch (e: any) {
      setError(e.message ?? 'Could not register organization. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back button */}
          <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={12}>
            <Text style={styles.backArrow}>←</Text>
            <Text style={styles.backText}>Back</Text>
          </Pressable>

          {/* Header */}
          <View style={styles.headerArea}>
            <BrandLogo size="lg" />
            <Text style={styles.heading}>Register Organization</Text>
            <Text style={styles.subheading}>
              Set up your team workspace on DealFlow360. You'll be the admin.
            </Text>
          </View>


          {/* Card */}
          <View style={styles.card}>
            {error && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            )}

            {/* Full Name */}
            <View style={styles.field}>
              <Text style={styles.label}>Your Full Name <Text style={{ color: ACCENT }}>*</Text></Text>
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

            {/* Organization Name */}
            <View style={styles.field}>
              <Text style={styles.label}>Organization Name <Text style={{ color: ACCENT }}>*</Text></Text>
              <TextInput
                style={[styles.input, orgError ? styles.inputError : orgTouched && isValidName(orgName) ? styles.inputValid : null]}
                placeholder="Acme Technologies, Inc."
                placeholderTextColor="#94a3b8"
                value={orgName}
                onChangeText={(v) => { setOrgName(v); setOrgTouched(true); }}
                autoCapitalize="words"
              />
              {orgError && <Text style={styles.fieldError}>{orgError}</Text>}
            </View>

            {/* Org Size */}
            <View style={styles.field}>
              <Text style={styles.label}>Team Size <Text style={styles.optional}>(optional)</Text></Text>
              <View style={styles.sizeRow}>
                {ORG_SIZES.map((s) => (
                  <Pressable
                    key={s}
                    style={[styles.sizeChip, orgSize === s && styles.sizeChipActive]}
                    onPress={() => setOrgSize(orgSize === s ? null : s)}
                  >
                    <Text style={[styles.sizeChipText, orgSize === s && styles.sizeChipTextActive]}>{s}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Password */}
            <View style={styles.field}>
              <Text style={styles.label}>Create Password <Text style={{ color: ACCENT }}>*</Text></Text>
              <PasswordInput
                value={password}
                placeholder="Min. 8 characters"
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
                : <Text style={styles.btnText}>Register Organization →</Text>
              }
            </Pressable>
          </View>

          {/* Footer */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Individual signup? </Text>
            <Pressable onPress={() => router.push('/(auth)/register')}>
              <Text style={[styles.footerText, { color: ACCENT, fontWeight: '600' }]}>Sign up here</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: INPUT_BG },
  scroll: { paddingHorizontal: 20, paddingTop: 16 },

  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 24 },
  backArrow: { fontSize: 18, color: DARK },
  backText: { fontSize: 14, fontWeight: '600', color: DARK },

  headerArea: { alignItems: 'center', marginBottom: 16 },
  orgIconWrap: {
    width: 64, height: 64, borderRadius: 18,
    backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center',
    marginBottom: 14, borderWidth: 1.5, borderColor: BORDER,
  },
  orgIcon: { fontSize: 30 },
  heading: { fontSize: 22, fontWeight: '700', color: DARK, marginBottom: 6, textAlign: 'center' },
  subheading: { fontSize: 13, color: SLATE, textAlign: 'center', lineHeight: 19, maxWidth: 280 },


  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 22,
    borderWidth: 1, borderColor: '#f1f5f9',
    shadowColor: '#0f172a', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 16, elevation: 4,
    marginBottom: 20,
  },

  errorBanner: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 10, padding: 10, marginBottom: 14 },
  errorBannerText: { fontSize: 12, color: '#b91c1c', fontWeight: '500' },

  field: { marginBottom: 14 },
  label: { fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
  optional: { fontSize: 10, color: '#94a3b8', textTransform: 'none', fontWeight: '500' },
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

  sizeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sizeChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1.5, borderColor: BORDER,
    backgroundColor: INPUT_BG,
  },
  sizeChipActive: { borderColor: ACCENT, backgroundColor: '#fff7f5' },
  sizeChipText: { fontSize: 13, fontWeight: '600', color: SLATE },
  sizeChipTextActive: { color: ACCENT },

  btn: {
    height: 50, borderRadius: 13, backgroundColor: ACCENT,
    alignItems: 'center', justifyContent: 'center', marginTop: 6,
    shadowColor: ACCENT, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
  },
  btnDisabled: { opacity: 0.5, shadowOpacity: 0 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  footerRow: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap' },
  footerText: { fontSize: 13, color: SLATE },
});
