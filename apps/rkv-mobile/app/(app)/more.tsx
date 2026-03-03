import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import Animated from 'react-native-reanimated';
import { useReducedMotion, useEntranceFromBelow, staggerDelay } from '../../lib/motion';
import { colors } from '../../theme';

const WEB_SECTIONS = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Portfolio / Properties', path: '/properties' },
  { label: 'Deals', path: '/deals' },
  { label: 'Market Intelligence', path: '/market-intelligence' },
  { label: 'Tenants', path: '/tenants' },
  { label: 'Vacancies', path: '/vacancies' },
  { label: 'Maintenance', path: '/maintenance' },
  { label: 'CRM', path: '/crm' },
  { label: 'Accounting', path: '/accounting' },
  { label: 'Documents', path: '/documents' },
  { label: 'AI Assistant', path: '/ai-assistant' },
  { label: 'Settings', path: '/settings' },
] as const;

export default function MoreScreen() {
  const reduced = useReducedMotion();
  const baseUrl = Constants.expoConfig?.extra?.webAppUrl ?? 'https://localhost:3000';

  function openWeb(path: string) {
    const url = `${baseUrl.replace(/\/$/, '')}${path}`;
    Linking.openURL(url);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Open in browser</Text>
      <Text style={styles.subheading}>Full experience — same account, same data.</Text>
      {WEB_SECTIONS.map((section, index) => {
        const style = useEntranceFromBelow(reduced, index * staggerDelay);
        return (
          <Animated.View key={section.path} style={style}>
            <Pressable style={({ pressed }) => [styles.row, pressed && styles.rowPressed]} onPress={() => openWeb(section.path)}>
              <Text style={styles.rowLabel}>{section.label}</Text>
              <Text style={styles.chevron}>→</Text>
            </Pressable>
          </Animated.View>
        );
      })}
      <Animated.View style={useEntranceFromBelow(reduced, WEB_SECTIONS.length * staggerDelay)}>
        <Pressable style={({ pressed }) => [styles.openAll, pressed && styles.rowPressed]} onPress={() => openWeb('/')}>
          <Text style={styles.openAllText}>Open full site</Text>
        </Pressable>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { padding: 20, paddingBottom: 40 },
  heading: { fontSize: 18, fontWeight: '600', color: colors.textPrimary, marginBottom: 4 },
  subheading: { fontSize: 13, color: colors.textMuted, marginBottom: 20 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 8,
  },
  rowPressed: { opacity: 0.8 },
  rowLabel: { fontSize: 15, color: colors.accent },
  chevron: { fontSize: 14, color: colors.textMuted },
  openAll: { marginTop: 16, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 12 },
  openAllText: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
});
