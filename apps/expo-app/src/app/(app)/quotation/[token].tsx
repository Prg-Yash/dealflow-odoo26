import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, ActivityIndicator, TextInput, Modal, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getQuotationDetails, postQuotationComment, postCounterProposal, signQuotation } from '@/lib/auth';

const ACCENT = '#ff5e3a';
const DARK = '#0f172a';
const SLATE = '#64748b';
const BG = '#f8fafc';
const BORDER = '#e2e8f0';

export default function QuotationDetailScreen() {
  const { token } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [quotation, setQuotation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [actionModal, setActionModal] = useState<'comment' | 'counter' | 'sign' | null>(null);
  const [inputText, setInputText] = useState('');
  const [signName, setSignName] = useState('');
  const [signTitle, setSignTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchDetails = () => {
    setLoading(true);
    getQuotationDetails(token as string)
      .then((res) => {
        if (res.data) setQuotation(res.data);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load quotation');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (token) fetchDetails();
  }, [token]);

  const handleSubmit = async () => {
    if (!actionModal) return;
    setIsSubmitting(true);
    try {
      if (actionModal === 'comment') {
        if (!inputText.trim()) throw new Error('Comment cannot be empty');
        await postQuotationComment(token as string, inputText.trim());
        Alert.alert('Success', 'Your comment has been added.');
      } else if (actionModal === 'counter') {
        if (!inputText.trim()) throw new Error('Reason cannot be empty');
        await postCounterProposal(token as string, {}, inputText.trim());
        Alert.alert('Success', 'Your counter-proposal has been sent to the sales team.');
      } else if (actionModal === 'sign') {
        if (!signName.trim()) throw new Error('Signature name is required');
        await signQuotation(token as string, signName.trim(), signTitle.trim());
        Alert.alert('Signed!', 'The quotation has been legally signed and confirmed.');
      }
      
      setActionModal(null);
      setInputText('');
      setSignName('');
      setSignTitle('');
      fetchDetails(); // refresh
    } catch (err: any) {
      Alert.alert('Error', err.message || 'An error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading && !quotation) {
    return (
      <View style={[styles.root, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  if (error || !quotation) {
    return (
      <View style={[styles.root, styles.center, { paddingTop: insets.top }]}>
        <Text style={{ color: '#ef4444', marginBottom: 16 }}>{error || 'Quotation not found'}</Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const isEditable = !['CONFIRMED', 'CANCELLED', 'EXPIRED'].includes(quotation.stage);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backArrowBtn}>
          <Text style={styles.backArrowText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Quotation {quotation.quoteNumber}</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 120 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Overview</Text>
          <Text style={styles.cardTitle}>{quotation.title || `Quote ${quotation.quoteNumber}`}</Text>
          
          <View style={styles.badgeRow}>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{quotation.stage?.replace(/_/g, ' ')}</Text>
            </View>
          </View>
          
          <View style={styles.divider} />
          
          <Text style={styles.infoLabel}>Sales Representative</Text>
          <Text style={styles.infoValue}>{quotation.salesRep?.user?.name || 'N/A'} ({quotation.salesRep?.user?.email || 'N/A'})</Text>
          
          <Text style={[styles.infoLabel, { marginTop: 12 }]}>Created At</Text>
          <Text style={styles.infoValue}>{new Date(quotation.createdAt).toLocaleDateString()}</Text>
        </View>

        <Text style={styles.sectionTitle}>Line Items</Text>
        <View style={styles.itemsCard}>
          {quotation.lines?.map((line: any, idx: number) => (
            <View key={line.id} style={[styles.itemRow, idx !== quotation.lines.length - 1 && styles.itemBorder]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{line.product?.name || line.description || 'Item'}</Text>
                <Text style={styles.itemDesc}>{line.quantity} × ${Number(line.unitPrice).toLocaleString()}</Text>
              </View>
              <Text style={styles.itemTotal}>${(line.quantity * Number(line.unitPrice)).toLocaleString()}</Text>
            </View>
          ))}
          {(!quotation.lines || quotation.lines.length === 0) && (
            <Text style={{ color: SLATE, padding: 16 }}>No items found.</Text>
          )}
        </View>

        <Text style={styles.sectionTitle}>Summary</Text>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>${Number(quotation.subtotal || 0).toLocaleString()}</Text>
          </View>
          {Number(quotation.discountTotal || 0) > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Discount</Text>
              <Text style={[styles.summaryValue, { color: '#ef4444' }]}>-${Number(quotation.discountTotal).toLocaleString()}</Text>
            </View>
          )}
          {Number(quotation.taxTotal || 0) > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tax</Text>
              <Text style={styles.summaryValue}>${Number(quotation.taxTotal).toLocaleString()}</Text>
            </View>
          )}
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.grandLabel}>Grand Total</Text>
            <Text style={styles.grandValue}>${Number(quotation.grandTotal || 0).toLocaleString()}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Floating Action Bar */}
      {isEditable && (
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <View style={styles.actionRow}>
            <Pressable style={styles.secondaryBtn} onPress={() => setActionModal('comment')}>
              <Text style={styles.secondaryBtnText}>Comment</Text>
            </Pressable>
            <Pressable style={styles.secondaryBtn} onPress={() => setActionModal('counter')}>
              <Text style={styles.secondaryBtnText}>Counter</Text>
            </Pressable>
          </View>
          <Pressable style={styles.primaryBtn} onPress={() => setActionModal('sign')}>
            <Text style={styles.primaryBtnText}>Accept & Sign</Text>
          </Pressable>
        </View>
      )}

      {/* Dynamic Modal */}
      <Modal visible={!!actionModal} transparent animationType="slide">
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {actionModal === 'comment' ? 'Add Comment' : actionModal === 'counter' ? 'Counter Proposal' : 'Sign Quotation'}
              </Text>
              <Pressable onPress={() => setActionModal(null)}>
                <Text style={styles.modalCloseText}>Cancel</Text>
              </Pressable>
            </View>

            {actionModal === 'sign' ? (
              <>
                <Text style={styles.modalDesc}>By signing, you agree to the terms and authorize billing.</Text>
                <Text style={styles.inputLabel}>Full Legal Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Jane Doe"
                  value={signName}
                  onChangeText={setSignName}
                />
                <Text style={styles.inputLabel}>Title (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. VP of Operations"
                  value={signTitle}
                  onChangeText={setSignTitle}
                />
              </>
            ) : (
              <>
                <Text style={styles.inputLabel}>
                  {actionModal === 'comment' ? 'Your Comment' : 'Reason / Proposed Changes'}
                </Text>
                <TextInput
                  style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                  placeholder={actionModal === 'comment' ? "Type your comment..." : "Describe the changes you want..."}
                  multiline
                  value={inputText}
                  onChangeText={setInputText}
                />
              </>
            )}

            <Pressable 
              style={[styles.primaryBtn, { marginTop: 24, opacity: isSubmitting ? 0.7 : 1 }]} 
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              <Text style={styles.primaryBtnText}>{isSubmitting ? 'Submitting...' : 'Submit'}</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  center: { justifyContent: 'center', alignItems: 'center', padding: 20 },
  
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: BORDER, backgroundColor: '#fff',
  },
  backArrowBtn: { paddingVertical: 6, paddingHorizontal: 0 },
  backArrowText: { fontSize: 15, fontWeight: '600', color: ACCENT },
  headerTitle: { fontSize: 16, fontWeight: '700', color: DARK },

  backBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, backgroundColor: BG, borderWidth: 1, borderColor: BORDER },
  backBtnText: { fontSize: 14, fontWeight: '600', color: SLATE },

  scroll: { padding: 20 },

  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: BORDER, marginBottom: 24,
    shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  cardLabel: { fontSize: 11, fontWeight: '700', color: SLATE, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 },
  cardTitle: { fontSize: 20, fontWeight: '800', color: DARK, marginBottom: 12 },
  divider: { height: 1, backgroundColor: BORDER, marginVertical: 12 },
  
  badgeRow: { flexDirection: 'row', marginBottom: 4 },
  statusBadge: { backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#bfdbfe' },
  statusText: { fontSize: 11, fontWeight: '700', color: '#2563eb', textTransform: 'uppercase' },

  infoLabel: { fontSize: 12, fontWeight: '600', color: SLATE, marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: '500', color: DARK },

  sectionTitle: { fontSize: 13, fontWeight: '700', color: SLATE, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 12 },

  itemsCard: {
    backgroundColor: '#fff', borderRadius: 16,
    borderWidth: 1, borderColor: BORDER, marginBottom: 24,
    overflow: 'hidden',
  },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: BORDER },
  itemName: { fontSize: 15, fontWeight: '700', color: DARK, marginBottom: 4 },
  itemDesc: { fontSize: 13, color: SLATE },
  itemTotal: { fontSize: 16, fontWeight: '700', color: DARK },

  summaryCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: BORDER, marginBottom: 32,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  summaryLabel: { fontSize: 14, color: SLATE, fontWeight: '500' },
  summaryValue: { fontSize: 14, fontWeight: '600', color: DARK },
  grandLabel: { fontSize: 16, fontWeight: '700', color: DARK },
  grandValue: { fontSize: 18, fontWeight: '800', color: ACCENT },

  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: BORDER,
    padding: 20, paddingTop: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 10,
  },
  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  secondaryBtn: {
    flex: 1, backgroundColor: BG, borderWidth: 1, borderColor: BORDER,
    paddingVertical: 12, borderRadius: 12, alignItems: 'center',
  },
  secondaryBtnText: { fontSize: 14, fontWeight: '700', color: SLATE },
  primaryBtn: {
    backgroundColor: ACCENT, paddingVertical: 16, borderRadius: 12, alignItems: 'center',
  },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 20,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: DARK },
  modalCloseText: { fontSize: 15, fontWeight: '600', color: SLATE },
  modalDesc: { fontSize: 14, color: SLATE, marginBottom: 20, lineHeight: 20 },
  
  inputLabel: { fontSize: 13, fontWeight: '700', color: SLATE, marginBottom: 8, marginTop: 12 },
  input: {
    backgroundColor: BG, borderWidth: 1, borderColor: BORDER,
    borderRadius: 12, padding: 16, fontSize: 15, color: DARK,
  },
});
