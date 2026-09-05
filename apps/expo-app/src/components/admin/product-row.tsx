import { StyleSheet, Text, View } from 'react-native';
import type { AdminProduct } from '@/lib/admin-data';

const TYPE_COLOR: Record<string, string> = {
  HARDWARE:     '#2563eb',
  SERVICE:      '#7c3aed',
  SUBSCRIPTION: '#16a34a',
};

export function ProductRow({ product }: { product: AdminProduct }) {
  const color = TYPE_COLOR[product.categoryType] ?? '#64748b';
  return (
    <View style={s.row}>
      <View style={[s.typeDot, { backgroundColor: color }]} />
      <View style={s.info}>
        <View style={s.topRow}>
          <Text style={s.name} numberOfLines={1}>{product.name}</Text>
          {product.isPromoted && <View style={s.promo}><Text style={s.promoText}>★</Text></View>}
        </View>
        <Text style={s.sku}>{product.sku} · {product.unit}</Text>
      </View>
      <Text style={s.price}>${product.basePrice.toLocaleString()}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0',
  },
  typeDot: { width: 8, height: 8, borderRadius: 4, marginTop: 2, flexShrink: 0 },
  info: { flex: 1 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 13, fontWeight: '700', color: '#0f172a', flex: 1 },
  promo: { backgroundColor: '#fff7ed', borderRadius: 100, paddingHorizontal: 5, paddingVertical: 1 },
  promoText: { fontSize: 10, color: '#ea580c' },
  sku: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  price: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
});
