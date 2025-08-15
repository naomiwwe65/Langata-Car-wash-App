import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useWashStore } from '@/state/WashContext';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import WaterBackground from '@/components/WaterBackground';

const colors = {
  backgroundDark: '#111827',
  backgroundLight: '#1F2937',
  textPrimary: '#F9FAFB',
  textSecondary: '#9CA3AF',
  accentBlue: '#3B82F6',
  border: '#374151',
};

export default function HistoryScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const { washes } = useWashStore();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return washes;
    return washes.filter(
      (w) => w.plate.toLowerCase().includes(q) || w.model.toLowerCase().includes(q) || w.service.toLowerCase().includes(q)
    );
  }, [washes, query]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundDark }}>
      <WaterBackground />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: tabBarHeight + 24 }}>
        <View style={{ maxWidth: 480, alignSelf: 'center', width: '100%' }}>
          <Text style={styles.title}>History</Text>
          <View style={styles.searchRow}>
            <MaterialIcons name="search" size={20} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by plate, model, or service"
              placeholderTextColor={colors.textSecondary}
              value={query}
              onChangeText={setQuery}
            />
          </View>

          {filtered.map((w) => (
            <TouchableOpacity key={w.id} style={styles.item} activeOpacity={0.8} onPress={() => router.push(`/receipt/${w.id}`)}>
              <View>
                <Text style={styles.itemTitle}>{w.plate} - {w.model}</Text>
                <Text style={styles.itemSub}>{w.method.toUpperCase()} | {(w.services && w.services.length > 0 ? w.services.join(', ') : w.service) || ''}</Text>
                <Text style={styles.itemSubSm}>{new Date(w.timestamp).toLocaleDateString()} {new Date(w.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.amount}>KES {w.amount}</Text>
                <TouchableOpacity style={styles.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} onPress={() => router.push(`/receipt/${w.id}`)}>
                  <MaterialIcons name="download" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}

          {filtered.length === 0 && (
            <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 24 }}>No results</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 12,
  },
  searchRow: {
    backgroundColor: colors.backgroundLight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  searchInput: {
    color: colors.textPrimary,
    flex: 1,
  },
  item: {
    backgroundColor: colors.backgroundLight,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemTitle: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  itemSub: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  itemSubSm: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  amount: {
    color: colors.textPrimary,
    fontWeight: '800',
  },
  iconBtn: {
    padding: 0,
    borderRadius: 999,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});


