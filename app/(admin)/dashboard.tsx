import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

// Firebase
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
// @ts-ignore
import { db } from '../../services/firebaseConfig';

export default function AdminOverview() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Dashboard Data State
  const [metrics, setMetrics] = useState({
    totalLiquidity: 0,
    totalUsers: 0,
    activeInvestments: 0,
    moneyIn: 0,
    moneyOut: 0
  });
  
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    try {
      // 1. Calculate Liquidity & Users (Total Investors & Money Invested)
      const usersSnap = await getDocs(collection(db, "users"));
      const totalCash = usersSnap.docs.reduce((acc, doc) => acc + (doc.data().walletBalance || 0), 0);
      
      // 2. Count Active Investment Contracts
      // Note: Ensure you have an 'investments' collection created when users buy farms
      const investSnap = await getDocs(query(collection(db, "investments"), where("status", "==", "active")));

      // 3. Analyze Transactions (For Chart & Recent Activities)
      const txQuery = query(collection(db, "transactions"), orderBy("createdAt", "desc"), limit(20));
      const txSnap = await getDocs(txQuery);
      
      let depositSum = 0;
      let withdrawSum = 0;
      const feed: any[] = [];

      txSnap.docs.forEach((doc, index) => {
          const data = doc.data();
          // Sum for Chart
          if (data.type === 'deposit' && data.status === 'success') depositSum += (data.amount || 0);
          if (data.type === 'withdrawal' && data.status === 'success') withdrawSum += (data.amount || 0);

          // Take top 5 for feed
          if (index < 5) feed.push({ id: doc.id, ...data });
      });

      setMetrics({
        totalLiquidity: totalCash,
        totalUsers: usersSnap.size,
        activeInvestments: investSnap.size,
        moneyIn: depositSum,
        moneyOut: withdrawSum
      });
      setRecentActivity(feed);

    } catch (error) {
      console.error("Dashboard Fetch Error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) return <View style={tw`flex-1 bg-slate-950 items-center justify-center`}><ActivityIndicator color="#10b981" /></View>;

  return (
    <View style={tw`flex-1 bg-slate-950`}>
      {/* HEADER */}
      <View style={tw`pt-16 px-6 pb-6 bg-slate-900 border-b border-slate-800`}>
        <View style={tw`flex-row justify-between items-center`}>
            <View>
                <Text style={tw`text-emerald-500 text-xs font-bold uppercase tracking-widest`}>Command Center</Text>
                <Text style={tw`text-white text-3xl font-bold`}>Overview</Text>
            </View>
            <TouchableOpacity onPress={() => router.replace('/(user)/' as any)} style={tw`bg-slate-800 p-3 rounded-full border border-slate-700`}>
                <Ionicons name="log-out-outline" size={24} color="#94a3b8" />
            </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={tw`p-6 pb-20`} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />}
      >
        
        {/* --- SECTION 1: METRIC CARDS --- */}
        {/* Main Card: Total Money Invested (Liquidity) */}
        <View style={tw`bg-emerald-900/20 p-6 rounded-3xl border border-emerald-500/20 mb-6 relative overflow-hidden`}>
            <Ionicons name="wallet" size={120} color="#064e3b" style={tw`absolute -right-4 -bottom-4 opacity-50`} />
            <Text style={tw`text-emerald-400 text-xs font-bold uppercase mb-2`}>Total Money Invested</Text>
            <Text style={tw`text-white text-4xl font-bold tracking-tight`}>₦{metrics.totalLiquidity.toLocaleString()}</Text>
            <Text style={tw`text-emerald-600 text-[10px] mt-2`}>* Current liquidity across all users</Text>
        </View>

        {/* Sub Cards: Investors & Active Investments */}
        <View style={tw`flex-row gap-4 mb-8`}>
            <StatBox 
                label="Total Investors" 
                value={metrics.totalUsers} 
                icon="people" 
                color="text-blue-400" 
                bg="bg-blue-500/10" 
                borderColor="border-blue-500/20"
            />
            <StatBox 
                label="Active Inv." 
                value={metrics.activeInvestments} 
                icon="layers" 
                color="text-yellow-400" 
                bg="bg-yellow-500/10" 
                borderColor="border-yellow-500/20"
            />
        </View>

        {/* --- SECTION 2: CHART (Volume Analysis) --- */}
        <View style={tw`mb-8`}>
            <Text style={tw`text-slate-400 text-xs font-bold uppercase mb-4`}>Volume Chart (In vs Out)</Text>
            
            {/* Money In Bar */}
            <View style={tw`mb-3`}>
                <View style={tw`flex-row justify-between mb-1`}>
                    <Text style={tw`text-white text-xs font-bold`}>Inflow (Deposits)</Text>
                    <Text style={tw`text-emerald-400 text-xs font-bold`}>₦{metrics.moneyIn.toLocaleString()}</Text>
                </View>
                <View style={tw`h-3 bg-slate-800 rounded-full overflow-hidden`}>
                    <View style={{ width: `${calculatePercent(metrics.moneyIn, metrics.moneyOut)}%`, height: '100%', backgroundColor: '#10b981', borderRadius: 99 }} />
                </View>
            </View>

            {/* Money Out Bar */}
            <View>
                <View style={tw`flex-row justify-between mb-1`}>
                    <Text style={tw`text-white text-xs font-bold`}>Outflow (Withdrawals)</Text>
                    <Text style={tw`text-red-400 text-xs font-bold`}>₦{metrics.moneyOut.toLocaleString()}</Text>
                </View>
                <View style={tw`h-3 bg-slate-800 rounded-full overflow-hidden`}>
                    <View style={{ width: `${calculatePercent(metrics.moneyOut, metrics.moneyIn)}%`, height: '100%', backgroundColor: '#ef4444', borderRadius: 99 }} />
                </View>
            </View>
        </View>

        {/* --- SECTION 3: RECENT ACTIVITIES --- */}
        <Text style={tw`text-slate-400 text-xs font-bold uppercase mb-4`}>Recent Activities</Text>
        {recentActivity.length === 0 ? (
            <Text style={tw`text-slate-600 italic`}>No recent activity recorded.</Text>
        ) : (
            recentActivity.map((item) => (
                <View key={item.id} style={tw`flex-row items-center mb-4 border-b border-slate-800 pb-4`}>
                    <View style={tw`w-10 h-10 rounded-full items-center justify-center mr-3 ${getIconBg(item.type)}`}>
                        <Ionicons name={getIconName(item.type)} size={18} color="white" />
                    </View>
                    <View style={tw`flex-1`}>
                        <Text style={tw`text-white font-bold capitalize`}>{item.type}</Text>
                        <Text style={tw`text-slate-500 text-xs`}>{item.userEmail}</Text>
                    </View>
                    <View style={tw`items-end`}>
                        <Text style={tw`text-white font-bold`}>
                             {item.type === 'withdrawal' ? '-' : '+'}₦{item.amount?.toLocaleString()}
                        </Text>
                        <Text style={tw`text-slate-600 text-[10px]`}>{new Date(item.createdAt?.toDate()).toLocaleTimeString()}</Text>
                    </View>
                </View>
            ))
        )}

      </ScrollView>
    </View>
  );
}

// --- HELPERS ---

function StatBox({ label, value, icon, color, bg, borderColor }: any) {
    return (
        <View style={tw`flex-1 ${bg} p-5 rounded-2xl border ${borderColor}`}>
            <Ionicons name={icon} size={24} style={tw`${color} mb-2`} />
            <Text style={tw`text-white text-2xl font-bold`}>{value}</Text>
            <Text style={tw`text-slate-400 text-[10px] font-bold uppercase`}>{label}</Text>
        </View>
    );
}

function calculatePercent(val: number, other: number) {
    const total = val + other;
    if (total === 0) return 0;
    // Simple percentage calculation for the bar width
    return Math.round((val / total) * 100) || 5; // Min 5% width for visibility
}

function getIconName(type: string) {
    if (type === 'deposit') return 'arrow-down';
    if (type === 'withdrawal') return 'arrow-up';
    return 'leaf'; // investment
}

function getIconBg(type: string) {
    if (type === 'deposit') return 'bg-emerald-600';
    if (type === 'withdrawal') return 'bg-red-600';
    return 'bg-yellow-600'; // investment
}