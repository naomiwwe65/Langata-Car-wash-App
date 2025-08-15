import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Switch, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useWashStore } from '@/state/WashContext';
import WaterBackground from '@/components/WaterBackground';

const colors = {
  backgroundDark: '#111827',
  backgroundLight: '#1F2937',
  textPrimary: '#F9FAFB',
  textSecondary: '#9CA3AF',
  accentBlue: '#3B82F6',
  border: '#374151',
};

export default function SettingsScreen() {
  const { settings, updateSettings } = useWashStore();
  const [businessName, setBusinessName] = useState(settings.businessName);
  const [email, setEmail] = useState(settings.defaultReceiptEmail);
  const [autoEmail, setAutoEmail] = useState(settings.autoEmailReceipts);

  const onSave = () => {
    updateSettings({ businessName, defaultReceiptEmail: email, autoEmailReceipts: autoEmail });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundDark }}>
      <WaterBackground />
      <View style={styles.container}>
        <Text style={styles.title}>Settings</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Business Name</Text>
          <TextInput
            style={styles.input}
            placeholder="My Car Wash"
            placeholderTextColor={colors.textSecondary}
            value={businessName}
            onChangeText={setBusinessName}
          />

          <Text style={styles.label}>Default Receipt Email</Text>
          <TextInput
            style={styles.input}
            placeholder="owner@example.com"
            placeholderTextColor={colors.textSecondary}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.label}>Auto Email Receipts</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Send receipt to customer email after payment</Text>
            </View>
            <Switch value={autoEmail} onValueChange={setAutoEmail} />
          </View>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={onSave} activeOpacity={0.9}>
          <Text style={styles.saveText}>Save Settings</Text>
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
  title: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 12,
  },
  card: {
    backgroundColor: colors.backgroundLight,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 16,
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
    marginBottom: 10,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  saveBtn: {
    backgroundColor: colors.accentBlue,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});


