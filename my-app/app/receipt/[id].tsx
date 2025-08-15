import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, Share } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useWashStore } from '@/state/WashContext';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const colors = {
  backgroundDark: '#111827',
  backgroundLight: '#1F2937',
  textPrimary: '#F9FAFB',
  textSecondary: '#9CA3AF',
  accentBlue: '#3B82F6',
  border: '#374151',
};

export default function ReceiptScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { washes } = useWashStore();

  const receipt = useMemo(() => washes.find((w) => w.id === id), [washes, id]);

  const dateStr = receipt ? new Date(receipt.timestamp).toLocaleDateString() : '';
  const timeStr = receipt ? new Date(receipt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

  const buildHtml = () => {
    if (!receipt) return '';
    const services = (receipt.services && receipt.services.length ? receipt.services.join(', ') : receipt.service) || '';
    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
      .title { font-size: 20px; font-weight: 800; margin-bottom: 12px; }
      .row { display: flex; justify-content: space-between; margin: 8px 0; }
      .key { color: #6B7280; }
      .value { color: #111827; font-weight: 700; }
      .footer { margin-top: 24px; font-size: 12px; color: #6B7280; }
    </style>
  </head>
  <body>
    <div class="title">Receipt ${receipt.receiptNo ?? receipt.id}</div>
    <div class="row"><div class="key">Plate</div><div class="value">${receipt.plate}</div></div>
    <div class="row"><div class="key">Model</div><div class="value">${receipt.model}</div></div>
    <div class="row"><div class="key">Services</div><div class="value">${services}</div></div>
    <div class="row"><div class="key">Amount</div><div class="value">KES ${receipt.amount}</div></div>
    <div class="row"><div class="key">Method</div><div class="value">${receipt.method.toUpperCase()}</div></div>
    <div class="row"><div class="key">Date</div><div class="value">${dateStr} ${timeStr}</div></div>
    <div class="footer">Thank you for your business.</div>
  </body>
</html>`;
  };

  const onDownload = async () => {
    if (!receipt) return;
    const html = buildHtml();
    if (Platform.OS === 'web') {
      const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${receipt.id}.html`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }
    try {
      const { uri } = await Print.printToFileAsync({ html });
      const available = await Sharing.isAvailableAsync();
      if (available) {
        await Sharing.shareAsync(uri, { dialogTitle: 'Share Receipt PDF' });
      } else {
        Alert.alert('Saved', `Receipt saved to file: ${uri}`);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to generate receipt.');
    }
  };

  if (!receipt) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundDark, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.textSecondary }}>Receipt not found.</Text>
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
          <Text style={styles.headerTitle}>Receipt</Text>
          <TouchableOpacity style={styles.iconPill} onPress={onDownload}>
            <MaterialIcons name="download" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Receipt #{receipt.id.slice(-6).toUpperCase()}</Text>
          <View style={styles.row}><Text style={styles.key}>Plate</Text><Text style={styles.value}>{receipt.plate}</Text></View>
          <View style={styles.row}><Text style={styles.key}>Model</Text><Text style={styles.value}>{receipt.model}</Text></View>
          <View style={styles.row}><Text style={styles.key}>Services</Text><Text style={styles.value}>{(receipt.services && receipt.services.length ? receipt.services.join(', ') : receipt.service) || ''}</Text></View>
          <View style={styles.row}><Text style={styles.key}>Amount</Text><Text style={styles.value}>KES {receipt.amount}</Text></View>
          <View style={styles.row}><Text style={styles.key}>Method</Text><Text style={styles.value}>{receipt.method.toUpperCase()}</Text></View>
          <View style={styles.row}><Text style={styles.key}>Date</Text><Text style={styles.value}>{dateStr}</Text></View>
          <View style={styles.row}><Text style={styles.key}>Time</Text><Text style={styles.value}>{timeStr}</Text></View>
        </View>

        <TouchableOpacity style={styles.downloadBtn} onPress={onDownload} activeOpacity={0.85}>
          <MaterialIcons name="picture-as-pdf" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.downloadText}>Download PDF</Text>
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
  title: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  key: {
    color: colors.textSecondary,
  },
  value: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  downloadBtn: {
    backgroundColor: colors.accentBlue,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  downloadText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});


