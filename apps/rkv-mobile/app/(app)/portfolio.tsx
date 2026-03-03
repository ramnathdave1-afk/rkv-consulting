import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { useReducedMotion, useEntranceFromBelow, staggerDelay } from '../../lib/motion';
import { colors } from '../../theme';

type Property = { id: string; address: string; current_value: number | null; monthly_rent: number | null };

export default function PortfolioScreen() {
  const { session } = useAuth();
  const [list, setList] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.id) return;
    supabase
      .from('properties')
      .select('id, address, current_value, monthly_rent')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setList((data as Property[]) || []);
        setLoading(false);
      });
  }, [session?.user?.id]);

  const reduced = useReducedMotion();

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (list.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.empty}>No properties. Add them on the web app.</Text>
      </View>
    );
  }

  function Row({ item, index }: { item: Property; index: number }) {
    const style = useEntranceFromBelow(reduced, index * staggerDelay);
    return (
      <Animated.View style={[styles.row, style]}>
        <Text style={styles.address} numberOfLines={1}>{item.address}</Text>
        <Text style={styles.meta}>
          {item.current_value != null ? `$${(item.current_value / 1000).toFixed(0)}K` : '—'} · {item.monthly_rent != null ? `$${item.monthly_rent}/mo` : '—'}
        </Text>
      </Animated.View>
    );
  }

  return (
    <FlatList
      data={list}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      renderItem={({ item, index }) => <Row item={item} index={index} />}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  list: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bgPrimary },
  empty: { fontSize: 15, color: colors.textMuted },
  row: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
  },
  address: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  meta: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
});
