import React, { useMemo, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useRouter } from 'expo-router';
import WaterBackground from '@/components/WaterBackground';
import { useWashStore } from '@/state/WashContext';

const colors = {
  backgroundDark: '#111827',
  backgroundLight: '#1F2937',
  textPrimary: '#F9FAFB',
  textSecondary: '#9CA3AF',
  accentBlue: '#3B82F6',
  accentGreen: '#22C55E',
  border: '#374151',
};

const servicePrices: Record<string, number> = {
  'Body Wash': 400,
  'Interior Cleaning': 500,
  'Waxing': 800,
  'Tire Shine': 200,
  'Engine Wash': 200,
};

type ServiceType =
  | 'Body Wash'
  | 'Interior Cleaning'
  | 'Waxing'
  | 'Tire Shine'
  | 'Engine Wash';

export default function NewWashScreen() {
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight();
  const [plateNumber, setPlateNumber] = useState('');
  const [carModel, setCarModel] = useState('');
  const [selectedServices, setSelectedServices] = useState<ServiceType[]>(['Body Wash']);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'mpesa' | 'card'>('mpesa');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  // Lazy require to avoid web bundling issues
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const DateTimePicker = Platform.OS === 'web' ? null : require('@react-native-community/datetimepicker').default;

  const services = useMemo<ServiceType[]>(
    () => ['Body Wash', 'Interior Cleaning', 'Waxing', 'Tire Shine', 'Engine Wash'],
    []
  );
  const { addWash, washes } = useWashStore();

  const computedAmount = useMemo(
    () => selectedServices.reduce((sum, s) => sum + (servicePrices[s] ?? 0), 0),
    [selectedServices]
  );

  const toggleService = (service: ServiceType) => {
    setSelectedServices((prev) =>
      prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service]
    );
  };

  const onSubmit = async () => {
    if (!plateNumber || !carModel || selectedServices.length === 0) {
      Alert.alert('Missing info', 'Please fill in plate number, car model, and select services.');
      return;
    }
    try {
      const newId = await addWash({
        plate: plateNumber,
        model: carModel,
        services: selectedServices,
        service: selectedServices[0],
        amount: computedAmount,
        method: paymentMethod,
        timestamp: selectedDate.getTime(),
      });
      router.push(`/payment/${newId}`);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save');
    }
  };

  const isSameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const todayList = useMemo(() => {
    const today = new Date();
    return washes.filter((w) => isSameDay(new Date(w.timestamp), today)).slice(-3).reverse();
  }, [washes]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundDark }}>
      <WaterBackground />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: tabBarHeight + 24 }}
      >
      <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconPill} onPress={() => (router.canGoBack() ? router.back() : null)}>
          <MaterialIcons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Car Wash</Text>
        <TouchableOpacity style={[styles.iconPill, { position: 'relative' }]} onPress={() => router.push('/(tabs)/settings')}>
          <MaterialIcons name="notifications" size={22} color={colors.textPrimary} />
          <View style={styles.badge} />
        </TouchableOpacity>
      </View>

      <View style={{ gap: 16 }}>
        <View>
          <Text style={styles.label}>Number Plate</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., KDA 123B"
            placeholderTextColor={colors.textSecondary}
            value={plateNumber}
            onChangeText={setPlateNumber}
          />
        </View>

        <View>
          <Text style={styles.label}>Car Model</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Toyota Prado"
            placeholderTextColor={colors.textSecondary}
            value={carModel}
            onChangeText={setCarModel}
          />
        </View>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Date</Text>
            <TouchableOpacity
              style={styles.inputBtn}
              activeOpacity={0.8}
              onPress={() => {
                if (Platform.OS === 'web') {
                  Alert.alert('Not supported on web', 'Use a device to pick date.');
                } else {
                  setShowDatePicker(true);
                }
              }}
            >
              <Text style={styles.inputBtnText}>{selectedDate.toLocaleDateString()}</Text>
              <MaterialIcons name="event" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Time</Text>
            <TouchableOpacity
              style={styles.inputBtn}
              activeOpacity={0.8}
              onPress={() => {
                if (Platform.OS === 'web') {
                  Alert.alert('Not supported on web', 'Use a device to pick time.');
                } else {
                  setShowTimePicker(true);
                }
              }}
            >
              <Text style={styles.inputBtnText}>
                {selectedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
              <MaterialIcons name="schedule" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        <View>
          <Text style={styles.label}>Service Types</Text>
          <View style={styles.chipsRow}>
            {services.map((service) => {
              const isActive = selectedServices.includes(service);
              return (
                <TouchableOpacity
                  key={service}
                  onPress={() => toggleService(service)}
                  style={[styles.chip, isActive ? styles.chipActive : styles.chipInactive]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, isActive ? styles.chipTextActive : styles.chipTextInactive]}>
                    {service} · KES {servicePrices[service]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View>
          <Text style={styles.label}>Total Amount (KES)</Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            placeholderTextColor={colors.textSecondary}
            keyboardType="numeric"
            value={String(computedAmount)}
            editable={false}
          />
        </View>

        <View>
          <Text style={styles.label}>Payment Method</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity
              style={[
                styles.paymentBtn,
                { backgroundColor: paymentMethod === 'mpesa' ? colors.accentGreen : colors.backgroundLight, borderWidth: paymentMethod === 'mpesa' ? 0 : 1, borderColor: colors.border },
              ]}
              onPress={() => setPaymentMethod('mpesa')}
              activeOpacity={0.8}
            >
              <MaterialIcons name="phone-iphone" size={20} color={paymentMethod === 'mpesa' ? '#FFFFFF' : colors.textSecondary} style={{ marginRight: 8 }} />
              <Text style={[styles.paymentText, { color: paymentMethod === 'mpesa' ? '#FFFFFF' : colors.textSecondary }]}>M-Pesa</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.paymentBtn,
                { backgroundColor: paymentMethod === 'card' ? colors.accentBlue : colors.backgroundLight, borderWidth: paymentMethod === 'card' ? 0 : 1, borderColor: colors.border },
              ]}
              onPress={() => setPaymentMethod('card')}
              activeOpacity={0.8}
            >
              <MaterialIcons name="credit-card" size={20} color={paymentMethod === 'card' ? '#FFFFFF' : colors.textSecondary} style={{ marginRight: 8 }} />
              <Text style={[styles.paymentText, { color: paymentMethod === 'card' ? '#FFFFFF' : colors.textSecondary }]}>Card</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.submitBtn} activeOpacity={0.85} onPress={onSubmit}>
          <Text style={styles.submitText}>Submit & Process Payment</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.completedCard}>
        <View style={styles.completedHeader}>
          <Text style={styles.completedTitle}>Completed Today</Text>
          <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }} onPress={() => router.push('/(tabs)/history')}>
            <Text style={styles.viewAll}>View All</Text>
            <MaterialIcons name="arrow-forward-ios" size={14} color={colors.accentBlue} style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        </View>

        {todayList.map((w, idx) => (
          <View key={w.id} style={[styles.completedItem, idx === todayList.length - 1 ? { borderBottomWidth: 0 } : null]}>
            <View>
              <Text style={styles.completedItemTitle}>{w.plate} - {w.model}</Text>
              <Text style={styles.completedItemSubtitle}>{w.method.toUpperCase()} {w.receiptNo ? `| Receipt #${w.receiptNo}` : '| Unpaid'}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={styles.paidPill}>
                <Text style={styles.paidText}>{w.paid ? 'Paid' : 'Pending'}</Text>
              </View>
              <TouchableOpacity style={styles.roundBtn} onPress={() => router.push(`/receipt/${w.id}`)}>
                <MaterialIcons name="download" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {todayList.length === 0 && (
          <Text style={{ color: colors.textSecondary }}>No completed washes today.</Text>
        )}
      </View>
      </View>

      {DateTimePicker && showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={(event: any, date?: Date) => {
            setShowDatePicker(false);
            if (date) {
              setSelectedDate(new Date(
                date.getFullYear(),
                date.getMonth(),
                date.getDate(),
                selectedDate.getHours(),
                selectedDate.getMinutes()
              ));
            }
          }}
        />
      )}

      {DateTimePicker && showTimePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="time"
          display="default"
          onChange={(event: any, date?: Date) => {
            setShowTimePicker(false);
            if (date) {
              setSelectedDate(new Date(
                selectedDate.getFullYear(),
                selectedDate.getMonth(),
                selectedDate.getDate(),
                date.getHours(),
                date.getMinutes()
              ));
            }
          }}
        />
      )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  iconPill: {
    padding: 8,
    borderRadius: 999,
    backgroundColor: colors.backgroundLight,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    height: 8,
    width: 8,
    borderRadius: 999,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: colors.backgroundLight,
  },
  label: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    width: '100%',
    backgroundColor: colors.backgroundLight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    color: colors.textPrimary,
    fontSize: 16,
  },
  inputBtn: {
    width: '100%',
    backgroundColor: colors.backgroundLight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputBtnText: {
    color: colors.textPrimary,
    fontSize: 16,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
  },
  chipActive: {
    backgroundColor: colors.accentBlue,
  },
  chipInactive: {
    backgroundColor: colors.backgroundLight,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  chipTextInactive: {
    color: colors.textSecondary,
  },
  paymentBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  paymentText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  submitBtn: {
    width: '100%',
    backgroundColor: colors.accentBlue,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accentBlue,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  completedCard: {
    marginTop: 24,
    backgroundColor: colors.backgroundLight,
    borderRadius: 16,
    padding: 16,
  },
  completedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  completedTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  viewAll: {
    color: colors.accentBlue,
    fontSize: 13,
    fontWeight: '700',
  },
  completedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  completedItemTitle: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  completedItemSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  paidPill: {
    backgroundColor: 'rgba(5, 150, 105, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  paidText: {
    color: '#34D399',
    fontSize: 12,
    fontWeight: '700',
  },
  roundBtn: {
    padding: 8,
    borderRadius: 999,
  },
});
