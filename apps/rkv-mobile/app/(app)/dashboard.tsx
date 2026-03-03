import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { useReducedMotion, useEntranceFromBelow, staggerDelay } from '../../lib/motion';
import { colors } from '../../theme';

export default function DashboardScreen() {
  const { session, signOut } = useAuth();
  const [properties, setProperties] = useState<{ id: string; address: string; current_value: number; monthly_rent: number }[]>([]);
  const [deals, setDeals] = useState<{ id: string; address: string; status: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const reduced = useReducedMotion();
  const card1 = useEntranceFromBelow(reduced, 0);
  const card2 = useEntranceFromBelow(reduced, staggerDelay);
  const card3 = useEntranceFromBelow(reduced, staggerDelay * 2);
  const card4 = useEntranceFromBelow(reduced, staggerDelay * 3);

  useEffect(() => {
    if (!session?.user?.id) return;
    (async () => {
      const [pRes, dRes] = await Promise.all([
        supabase.from('properties').select('id, address, current_value, monthly_rent').eq('user_id', session.user.id).order('created_at', { ascending: false }),
        supabase.from('deals').select('id, address, status').eq('user_id', session.user.id).order('updated_at', { ascending: false }).limit(10),
      ]);
      setProperties((pRes.data as typeof properties) || []);
      setDeals((dRes.data as typeof deals) || []);
      setLoading(false);
    })();
  }, [session?.user?.id]);

  const portfolioValue = properties.reduce((s, p) => s + (p.current_value || 0), 0);
  const monthlyRent = properties.reduce((s, p) => s + (p.monthly_rent || 0), 0);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.grid}>
        <Animated.View style={[styles.card, card1]}>
          <Text style={styles.cardLabel}>Portfolio Value</Text>
          <Text style={styles.cardValue}>${(portfolioValue / 1000).toFixed(0)}K</Text>
        </Animated.View>
        <Animated.View style={[styles.card, card2]}>
          <Text style={styles.cardLabel}>Monthly Rent</Text>
          <Text style={styles.cardValue}>${monthlyRent.toLocaleString()}</Text>
        </Animated.View>
        <Animated.View style={[styles.card, card3]}>
          <Text style={styles.cardLabel}>Properties</Text>
          <Text style={styles.cardValue}>{properties.length}</Text>
        </Animated.View>
        <Animated.View style={[styles.card, card4]}>
          <Text style={styles.cardLabel}>Deals</Text>
          <Text style={styles.cardValue}>{deals.length}</Text>
        </Animated.View>
      </View>
      <View style={styles.liveRow}>
        <View style={styles.livePill}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>Live — same data as web</Text>
        </View>
      </View>
      <Pressable style={styles.outlineButton} onPress={() => signOut()}>
        <Text style={styles.outlineButtonText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bgPrimary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    width: '47%',
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  cardLabel: { fontSize: 11, color: colors.accentMuted, marginBottom: 4 },
  cardValue: { fontSize: 22, fontWeight: '600', color: colors.textPrimary },
  liveRow: { marginTop: 24 },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.green },
  liveText: { fontSize: 12, color: colors.textMuted },
  outlineButton: { marginTop: 24, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 12 },
  outlineButtonText: { fontSize: 14, color: colors.textSecondary },
});
