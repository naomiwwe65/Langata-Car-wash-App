import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, TextInput, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useWashStore } from '@/state/WashContext';
import * as MailComposer from 'expo-mail-composer';

const colors = {
  backgroundDark: '#111827',
  backgroundLight: '#1F2937',
  textPrimary: '#F9FAFB',
  textSecondary: '#9CA3AF',
  accentBlue: '#3B82F6',
  accentGreen: '#22C55E',
  border: '#374151',
};

export default function PaymentScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { washes, markPaid, settings } = useWashStore();
  const [method, setMethod] = useState<'mpesa' | 'card' | 'ussd'>('mpesa');
  const [phone, setPhone] = useState('');
  const [card, setCard] = useState('');
  const [name, setName] = useState('');
  const [issuingBank, setIssuingBank] = useState('');
  const [customerEmail, setCustomerEmail] = useState(settings.defaultReceiptEmail || '');

  const item = useMemo(() => washes.find((w) => w.id === id), [washes, id]);
  const amount = item?.amount ?? 0;

  const sendReceiptEmail = async (to: string) => {
    if (!item || !to) return;
    const services = (item.services && item.services.length ? item.services.join(', ') : item.service) || '';
    const dateStr = new Date(item.timestamp).toLocaleDateString();
    const timeStr = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const subject = `${settings.businessName} Receipt ${item.receiptNo ?? ''}`.trim();
    const body = `Thank you for your payment.\n\n` +
      `Business: ${settings.businessName}\n` +
      `Receipt: ${item.receiptNo ?? item.id}\n` +
      `Plate: ${item.plate}\n` +
      `Model: ${item.model}\n` +
      `Services: ${services}\n` +
      `Amount: KES ${item.amount}\n` +
      `Method: ${item.method.toUpperCase()}\n` +
      `Date: ${dateStr} ${timeStr}`;

    if (Platform.OS === 'web') {
      const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = mailto;
      return;
    }

    const isAvailable = await MailComposer.isAvailableAsync().catch(() => false);
    if (isAvailable) {
      await MailComposer.composeAsync({ recipients: [to], subject, body });
    } else {
      Alert.alert('Email not available', 'Unable to open email composer on this device.');
    }
  };

  const onPay = async () => {
    if (!item) return;
    if (method === 'mpesa') {
      if (!/^\d{10,13}$/.test(phone)) {
        Alert.alert('Invalid phone', 'Enter a valid phone number');
        return;
      }
      Alert.alert('M-Pesa', `STK Push sent to ${phone} for KES ${amount}.`);
    } else if (method === 'card') {
      if (!card || !name) {
        Alert.alert('Missing info', 'Enter card number and name');
        return;
      }
      Alert.alert('Card', `Charging card ${card.slice(-4)} for KES ${amount}.`);
    } else if (method === 'ussd') {
      Alert.alert('USSD', `Dial *334# and follow prompts. Amount: KES ${amount}.`);
    }
    try {
      await markPaid(item.id);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to mark paid');
      return;
    }
    if (settings.autoEmailReceipts) {
      const to = customerEmail || settings.defaultReceiptEmail;
      if (to) {
        await sendReceiptEmail(to);
      }
    }
    router.replace(`/receipt/${item.id}`);
  };

  if (!item) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundDark, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.textSecondary }}>Payment not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundDark }}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconPill} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Process Payment</Text>
          <View style={{ width: 38 }} />
        </View>

        <View style={styles.card}>
          <Text style={styles.summaryTitle}>Summary</Text>
          <Text style={styles.summaryRow}>Plate: <Text style={styles.summaryValue}>{item.plate}</Text></Text>
          <Text style={styles.summaryRow}>Model: <Text style={styles.summaryValue}>{item.model}</Text></Text>
          <Text style={styles.summaryRow}>Services: <Text style={styles.summaryValue}>{(item.services && item.services.length ? item.services.join(', ') : item.service) || ''}</Text></Text>
          <Text style={styles.summaryRow}>Amount: <Text style={styles.summaryValue}>KES {amount}</Text></Text>
        </View>

        <View style={styles.methodsRow}>
          <TouchableOpacity style={[styles.methodBtn, method === 'mpesa' ? styles.methodActive : null]} onPress={() => setMethod('mpesa')}>
            <MaterialIcons name="phone-iphone" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.methodText}>M-Pesa</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.methodBtn, method === 'card' ? styles.methodActive : null]} onPress={() => setMethod('card')}>
            <MaterialIcons name="credit-card" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.methodText}>Card</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.methodBtn, method === 'ussd' ? styles.methodActive : null]} onPress={() => setMethod('ussd')}>
            <MaterialIcons name="dialer-sip" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.methodText}>USSD</Text>
          </TouchableOpacity>
        </View>

        {method === 'mpesa' && (
          <View style={styles.formCard}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput style={styles.input} placeholder="07XXXXXXXX" placeholderTextColor={colors.textSecondary} keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
            <Text style={styles.hint}>We will send an STK Push to this phone.</Text>
          </View>
        )}

        {method === 'card' && (
          <View style={styles.formCard}>
            <Text style={styles.label}>Card Number</Text>
            <TextInput style={styles.input} placeholder="1234 5678 9012 3456" placeholderTextColor={colors.textSecondary} keyboardType="number-pad" value={card} onChangeText={setCard} />
            <Text style={styles.label}>Cardholder Name</Text>
            <TextInput style={styles.input} placeholder="Full Name" placeholderTextColor={colors.textSecondary} value={name} onChangeText={setName} />
            <Text style={styles.label}>Issuing Bank</Text>
            <TextInput style={styles.input} placeholder="Bank Name" placeholderTextColor={colors.textSecondary} value={issuingBank} onChangeText={setIssuingBank} />
          </View>
        )}

        {method === 'ussd' && (
          <View style={styles.formCard}>
            <Text style={styles.label}>Instructions</Text>
            <Text style={styles.hint}>Dial *334# on your phone, select Lipa na M-Pesa, and follow prompts to pay KES {amount}.</Text>
          </View>
        )}

        <View style={styles.formCard}>
          <Text style={styles.label}>Customer Email (optional)</Text>
          <TextInput style={styles.input} placeholder="customer@example.com" placeholderTextColor={colors.textSecondary} keyboardType="email-address" autoCapitalize="none" value={customerEmail} onChangeText={setCustomerEmail} />
          <Text style={styles.hint}>If Auto Email Receipts is enabled in Settings, a receipt will be emailed here (or to default email).</Text>
        </View>

        <TouchableOpacity style={styles.payBtn} activeOpacity={0.9} onPress={onPay}>
          <Text style={styles.payText}>Pay KES {amount}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
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
  card: {
    backgroundColor: colors.backgroundLight,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 16,
  },
  summaryTitle: {
    color: colors.textSecondary,
    marginBottom: 8,
    fontWeight: '600',
  },
  summaryRow: {
    color: colors.textPrimary,
    marginBottom: 6,
  },
  summaryValue: {
    fontWeight: '800',
  },
  methodsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  methodBtn: {
    flex: 1,
    backgroundColor: '#374151',
    paddingVertical: 10,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodActive: {
    backgroundColor: colors.accentBlue,
  },
  methodText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  formCard: {
    backgroundColor: colors.backgroundLight,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#111827',
    color: colors.textPrimary,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  hint: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  payBtn: {
    backgroundColor: colors.accentGreen,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  payText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
});


