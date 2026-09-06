import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Pagination } from '@/components/admin/pagination';
import { ProductRow } from '@/components/admin/product-row';
import { SectionHeader } from '@/components/admin/section-header';
import { MOCK_ADMIN_CATEGORIES, MOCK_ADMIN_PRODUCTS, type AdminCategoryType } from '@/lib/admin-data';

type Filter = 'ALL' | AdminCategoryType;
const PRODUCTS_PER_PAGE = 5;

const CAT_COLOR: Record<string, string> = {
  HARDWARE:     '#2563eb',
  SERVICE:      '#7c3aed',
  SUBSCRIPTION: '#16a34a',
};

export default function AdminCatalog() {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<Filter>('ALL');
  const [page, setPage] = useState(1);

  const filteredProducts = filter === 'ALL'
    ? MOCK_ADMIN_PRODUCTS
    : MOCK_ADMIN_PRODUCTS.filter((p) => p.categoryType === filter);

  const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);
  const products = filteredProducts.slice((page - 1) * PRODUCTS_PER_PAGE, page * PRODUCTS_PER_PAGE);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Category summary chips */}
      <SectionHeader title="Categories" />
      <View style={styles.catRow}>
        {MOCK_ADMIN_CATEGORIES.map((cat) => (
          <Pressable
            key={cat.id}
            onPress={() => {
              setFilter(filter === cat.type ? 'ALL' : cat.type);
              setPage(1);
            }}
            style={[styles.catChip, filter === cat.type && { borderColor: CAT_COLOR[cat.type], backgroundColor: CAT_COLOR[cat.type] + '14' }]}
          >
            <View style={[styles.catDot, { backgroundColor: CAT_COLOR[cat.type] }]} />
            <View>
              <Text style={styles.catName}>{cat.name}</Text>
              <Text style={styles.catMeta}>≤{cat.discountCeiling}% disc · {cat.productCount} products</Text>
            </View>
          </Pressable>
        ))}
      </View>

      {/* Product list */}
      <View style={styles.sectionGap} />
      <SectionHeader title={`Products · ${filteredProducts.length}`} />
      {products.map((p) => <ProductRow key={p.id} product={p} />)}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </ScrollView>
  );
}

const BORDER = '#e2e8f0';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { padding: 16, paddingTop: 20 },
  sectionGap: { height: 20 },

  catRow: { gap: 8 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 14, padding: 12,
    borderWidth: 1.5, borderColor: BORDER,
  },
  catDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  catName: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  catMeta: { fontSize: 11, color: '#64748b', marginTop: 1 },
});
