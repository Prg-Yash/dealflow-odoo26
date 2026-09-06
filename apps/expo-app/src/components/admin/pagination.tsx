import { Pressable, StyleSheet, Text, View } from 'react-native';

interface Props {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onPageChange }: Props) {
  if (totalPages <= 1) return null;

  return (
    <View style={s.container}>
      <Pressable 
        style={[s.btn, page === 1 && s.btnDisabled]} 
        onPress={() => onPageChange(page - 1)}
        disabled={page === 1}
      >
        <Text style={[s.btnText, page === 1 && s.textDisabled]}>Previous</Text>
      </Pressable>

      <Text style={s.pageText}>
        Page {page} of {totalPages}
      </Text>

      <Pressable 
        style={[s.btn, page === totalPages && s.btnDisabled]} 
        onPress={() => onPageChange(page + 1)}
        disabled={page === totalPages}
      >
        <Text style={[s.btnText, page === totalPages && s.textDisabled]}>Next</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, marginTop: 4,
  },
  btn: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 8, backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  btnDisabled: { backgroundColor: '#f8fafc', borderColor: '#f1f5f9' },
  btnText: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  textDisabled: { color: '#94a3b8' },
  pageText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
});
