import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { useReducedMotion, useEntranceFromBelow, staggerDelay } from '../../lib/motion';
import { colors } from '../../theme';

type Deal = { id: string; address: string; status: string };

function DealRow({ item, index, reduced }: { item: Deal; index: number; reduced: boolean }) {
  const style = useEntranceFromBelow(reduced, index * staggerDelay);
  return (
    <Animated.View style={[styles.row, style]}>
      <Text style={styles.address} numberOfLines={1}>{item.address}</Text>
      <Text style={styles.status}>{item.status || '—'}</Text>
    </Animated.View>
  );
}

export default function DealsScreen() {
  const { session } = useAuth();
  const [list, setList] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!session?.user?.id) return;
    supabase
      .from('deals')
      .select('id, address, status')
      .eq('user_id', session.user.id)
      .order('updated_at', { ascending: false })
      .then(({ data }) => {
        setList((data as Deal[]) || []);
        setLoading(false);
      });
  }, [session?.user?.id]);

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
        <Text style={styles.empty}>No deals. Create them on the web app.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={list}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      renderItem={({ item, index }) => <DealRow item={item} index={index} reduced={reduced} />}
    />
  );
}

const styles = StyleSheet.create({
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
  status: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
});
