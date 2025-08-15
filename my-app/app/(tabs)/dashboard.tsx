import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, Alert, Platform } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useWashStore } from '@/state/WashContext';
import WaterBackground from '@/components/WaterBackground';

const colors = {
  backgroundDark: '#111827',
  backgroundLight: '#1F2937',
  backgroundCard: '#374151',
  textPrimary: '#F9FAFB',
  textSecondary: '#9CA3AF',
  accentBlue: '#3B82F6',
  accentGreen: '#22C55E',
  accentPurple: '#8B5CF6',
  accentOrange: '#F97316',
  border: '#4B5563',
};

export default function DashboardScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('30d');
  const { washes } = useWashStore();
  const isWeb = Platform.OS === 'web';
  const [isClient, setIsClient] = useState(false);
  const [HighchartsLib, setHighchartsLib] = useState<any>(null);
  const [HighchartsReactComp, setHighchartsReactComp] = useState<any>(null);

  // Mock data ticker (enabled for now)
  const useMock = true;
  const [areaData, setAreaData] = useState<number[]>([]);
  const [revenue, setRevenue] = useState<{ mpesa: number; card: number; cash: number }>({ mpesa: 12000, card: 4500, cash: 800 });

  useEffect(() => {
    setIsClient(true);
    if (isWeb) {
      // Dynamically import web-only chart libs to avoid SSR/window issues
      Promise.all([import('highcharts'), import('highcharts-react-official')])
        .then(([hc, hcReact]) => {
          setHighchartsLib((hc as any).default ?? hc);
          setHighchartsReactComp((hcReact as any).default ?? hcReact);
        })
        .catch(() => {
          setHighchartsLib(null);
          setHighchartsReactComp(null);
        });
    }
  }, [isWeb]);

  const makeCsv = () => {
    const header = ['Receipt ID','Plate','Model','Services','Amount','Method','Date','Time'];
    const rows = washes.map((w) => [
      w.id,
      w.plate,
      w.model,
      (w.services && w.services.length ? w.services.join('; ') : (w.service ?? '')),
      String(w.amount),
      w.method.toUpperCase(),
      new Date(w.timestamp).toLocaleDateString(),
      new Date(w.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    ]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    return csv;
  };

  // Initialize area data length on range change
  React.useEffect(() => {
    if (!useMock) return;
    const windowSize = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const baseline = range === '7d' ? 10 : range === '30d' ? 12 : 14;
    const next = Array.from({ length: windowSize }, (_, i) => Math.max(0, Math.round(baseline + Math.sin(i / 2) * 1.5 + Math.random() * 0.5)));
    setAreaData(next);
  }, [range, useMock]);

  // Ticking updates for mock charts
  React.useEffect(() => {
    if (!useMock) return;
    const id = setInterval(() => {
      setAreaData((prev) => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1];
        const nextVal = Math.max(0, Math.round(last + (Math.random() - 0.5) * 2));
        return [...prev.slice(1), nextVal];
      });
      setRevenue((r) => {
        const jitter = (v: number) => Math.max(0, Math.round(v + (Math.random() - 0.5) * 80));
        return { mpesa: jitter(r.mpesa), card: jitter(r.card), cash: jitter(r.cash) };
      });
    }, 5000);
    return () => clearInterval(id);
  }, [useMock]);

  const areaOptions = useMemo(() => {
    const categories = Array.from({ length: useMock ? areaData.length : range === '7d' ? 7 : range === '30d' ? 30 : 90 }, (_, i) => `${i + 1}`);
    let data: number[];
    if (useMock) {
      data = areaData;
    } else {
      const today = new Date();
      const serie = categories.map(() => 0);
      // Aggregate washes per day for the selected range
      washes.forEach((w) => {
        const d = new Date(w.timestamp);
        const diffDays = Math.floor((today.getTime() - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / 86400000);
        const windowSize = categories.length;
        if (diffDays >= 0 && diffDays < windowSize) {
          const idx = windowSize - diffDays - 1;
          if (idx >= 0 && idx < serie.length) serie[idx] += 1;
        }
      });
      data = serie;
    }
    return {
      chart: {
        type: 'areaspline',
        backgroundColor: colors.backgroundLight,
        height: 160,
        spacing: [8, 8, 8, 8],
        animation: true,
      },
      title: { text: '' },
      xAxis: {
        categories,
        tickInterval: Math.ceil(categories.length / 6),
        lineColor: colors.border,
        gridLineColor: colors.border,
        labels: { style: { color: colors.textSecondary } },
      },
      yAxis: {
        title: { text: undefined },
        gridLineColor: colors.border,
        labels: { style: { color: colors.textSecondary } },
      },
      legend: { enabled: false },
      credits: { enabled: false },
      tooltip: { shared: true },
      plotOptions: {
        series: { animation: { duration: 800 } },
        areaspline: {
          fillOpacity: 0.2,
          color: colors.accentBlue,
          marker: { enabled: false },
        },
      },
      series: [
        {
          name: 'Cars Washed',
          data,
        },
      ],
    } as const;
  }, [range, washes, useMock, areaData]);

  const pieOptions = useMemo(() => {
    const mpesa = useMock ? revenue.mpesa : washes.filter((w) => w.method === 'mpesa').reduce((s, w) => s + w.amount, 0);
    const card = useMock ? revenue.card : washes.filter((w) => w.method === 'card').reduce((s, w) => s + w.amount, 0);
    const cash = useMock ? revenue.cash : 0;
    return {
      chart: {
        type: 'pie',
        backgroundColor: colors.backgroundLight,
        height: 220,
        animation: true,
      },
      title: { text: '' },
      tooltip: {
        pointFormat: '<b>{point.percentage:.1f}%</b> ({point.y:,.0f} KES)',
      },
      accessibility: { enabled: false },
      credits: { enabled: false },
      plotOptions: {
        series: { animation: { duration: 800 } },
        pie: {
          innerSize: '60%',
          dataLabels: {
            enabled: true,
            format: '{point.name}: {point.percentage:.0f}%',
            style: { color: colors.textPrimary, textOutline: 'none' },
          },
        },
      },
      series: [
        {
          name: 'Revenue',
          data: [
            { name: 'M-Pesa', y: mpesa, color: colors.accentGreen },
            { name: 'Card', y: card, color: colors.accentBlue },
            { name: 'Cash', y: cash, color: colors.accentPurple },
          ],
        },
      ],
    } as const;
  }, [washes, useMock, revenue]);

  const onExportCsv = () => {
    const csv = makeCsv();
    if (isWeb) {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'car-wash-data.csv';
      a.click();
      URL.revokeObjectURL(url);
    } else {
      Alert.alert('Export CSV', 'CSV saved to memory (sharing coming next).');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundDark }}>
      <WaterBackground />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: tabBarHeight + 24 }}
      >
      <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Dashboard</Text>
        <TouchableOpacity style={styles.exportBtn} onPress={onExportCsv}>
          <MaterialIcons name="download" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.exportText}>Export CSV</Text>
        </TouchableOpacity>
      </View>

      <View style={{ marginBottom: 12 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <TouchableOpacity
            style={[styles.filterBtn, { backgroundColor: colors.accentBlue }]}
            onPress={() => setRange('30d')}
          >
            <MaterialIcons name="calendar-today" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={[styles.filterText, { color: '#FFFFFF' }]}>Last 30 Days</Text>
            <MaterialIcons name="expand-more" size={16} color="#FFFFFF" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterBtn}>
            <Text style={styles.filterText}>All Payments</Text>
            <MaterialIcons name="expand-more" size={16} color={colors.textSecondary} style={{ marginLeft: 4 }} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterBtn}>
            <Text style={styles.filterText}>All Services</Text>
            <MaterialIcons name="expand-more" size={16} color={colors.textSecondary} style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        </ScrollView>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitleSecondary}>Cars Washed</Text>
        <View style={styles.kpisRow}> 
          <View style={styles.kpiCell}>
            <Text style={styles.kpiNumber}>12</Text>
            <Text style={styles.kpiLabel}>Today</Text>
          </View>
          <View style={styles.kpiCell}>
            <Text style={styles.kpiNumber}>84</Text>
            <Text style={styles.kpiLabel}>This Week</Text>
          </View>
          <View style={styles.kpiCell}>
            <Text style={styles.kpiNumber}>360</Text>
            <Text style={styles.kpiLabel}>This Month</Text>
          </View>
        </View>
        <View style={styles.chartContainer}>
          {isWeb ? (
            isClient && HighchartsLib && HighchartsReactComp ? (
              <HighchartsReactComp highcharts={HighchartsLib} options={areaOptions as any} />
            ) : (
              <View style={{ height: 160 }} />
            )
          ) : (
            <WebView
              originWhitelist={["*"]}
              style={{ height: 160, backgroundColor: 'transparent' }}
              scrollEnabled={false}
              source={{
                html: `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <script src="https://code.highcharts.com/highcharts.js"></script>
    <style>html,body,#c{margin:0;padding:0;background:${colors.backgroundLight};}</style>
  </head>
  <body>
    <div id="c"></div>
    <script>
      document.addEventListener('DOMContentLoaded', function(){
        Highcharts.chart('c', Object.assign({}, ${JSON.stringify(areaOptions)}, { title: { text: '' }, plotOptions: { series: { animation: { duration: 800 } } } }));
      });
    </script>
  </body>
</html>`,
              }}
            />
          )}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitleSecondary}>Revenue Breakdown</Text>
        <View style={{ marginTop: 8, height: 220 }}>
          {isWeb ? (
            isClient && HighchartsLib && HighchartsReactComp ? (
              <HighchartsReactComp highcharts={HighchartsLib} options={pieOptions as any} />
            ) : (
              <View style={{ height: 220 }} />
            )
          ) : (
            <WebView
              originWhitelist={["*"]}
              style={{ height: 220, backgroundColor: 'transparent' }}
              scrollEnabled={false}
              source={{
                html: `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <script src="https://code.highcharts.com/highcharts.js"></script>
    <style>html,body,#p{margin:0;padding:0;background:${colors.backgroundLight};}</style>
  </head>
  <body>
    <div id="p"></div>
    <script>
      document.addEventListener('DOMContentLoaded', function(){
        Highcharts.chart('p', Object.assign({}, ${JSON.stringify(pieOptions)}, { title: { text: '' }, plotOptions: { series: { animation: { duration: 800 } } } }));
      });
    </script>
  </body>
</html>`,
              }}
            />
          )}
        </View>
      </View>

      <View style={styles.gridRow}>
        <View style={styles.gridCard}>
          <Text style={styles.smallTitle}>Most Popular Service</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
            <MaterialIcons name="local-car-wash" size={28} color={colors.accentOrange} style={{ marginRight: 8 }} />
            <View>
              <Text style={styles.gridBig}>Body Wash</Text>
              <Text style={styles.gridSub}>250 Washes</Text>
            </View>
          </View>
        </View>
        <View style={styles.gridCard}>
          <Text style={styles.smallTitle}>Repeat Customers</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
            <MaterialIcons name="autorenew" size={28} color={colors.accentGreen} style={{ marginRight: 8 }} />
            <View>
              <Text style={styles.gridBig}>65%</Text>
              <Text style={styles.gridSub}>234 Customers</Text>
            </View>
          </View>
        </View>
      </View>
      </View>
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
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentBlue,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  exportText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  filterText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  card: {
    backgroundColor: colors.backgroundLight,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardTitleSecondary: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  kpisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  kpiCell: {
    flex: 1,
    alignItems: 'center',
  },
  kpiNumber: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
  },
  kpiLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  chartContainer: {
    height: 160,
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  gridCard: {
    flexGrow: 1,
    backgroundColor: colors.backgroundLight,
    borderRadius: 16,
    padding: 16,
    minWidth: 260,
  },
  smallTitle: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  gridBig: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  gridSub: {
    color: colors.textSecondary,
    fontSize: 12,
  },
});


