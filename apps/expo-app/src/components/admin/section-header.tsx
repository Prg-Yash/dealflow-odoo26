import { StyleSheet, Text, View } from 'react-native';

interface Props {
  title: string;
  action?: React.ReactNode;
}

export function SectionHeader({ title, action }: Props) {
  return (
    <View style={s.row}>
      <Text style={s.title}>{title}</Text>
      {action}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  title: { fontSize: 11, fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8 },
});
