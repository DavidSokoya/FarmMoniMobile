import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

// Firebase
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
// @ts-ignore
import { auth, db } from '../../services/firebaseConfig';

export default function HistoryScreen() {
  const [activeTab, setActiveTab] = useState<'portfolio' | 'transactions'>('portfolio');
  const [loading, setLoading] = useState(true);
  const [investments, setInvestments] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);

  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;

    // 1. Fetch Investments (Portfolio)
    const qInvest = query(
        collection(db, "investments"), 
        where("userId", "==", user.uid),
        orderBy("startDate", "desc")
    );

    const unsubInvest = onSnapshot(qInvest, (snapshot) => {
        setInvestments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 2. Fetch Transactions (Cash Flow)
    // Note: If you get an index error in console, you might need to create an index in Firebase
    // For now, we can remove 'orderBy' if it crashes, but usually simple queries are fine.
    const qTrans = query(
        collection(db, "transactions"), 
        where("userId", "==", user.uid)
        // orderBy("date", "desc") // <--- Uncomment this if you create an index
    );

    const unsubTrans = onSnapshot(qTrans, (snapshot) => {
        // Manual sort in JS to avoid index issues for MVP
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // @ts-ignore
        list.sort((a, b) => new Date(b.date) - new Date(a.date));
        setTransactions(list);
        setLoading(false);
    });

    return () => { unsubInvest(); unsubTrans(); };
  }, []);

  if (loading) {
    return (
      <View style={tw`flex-1 bg-white items-center justify-center`}>
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  // --- RENDER HELPERS ---

  const renderPortfolioItem = ({ item }: any) => {
    const maturity = new Date(item.maturityDate);
    const now = new Date();
    // Simple Progress Calculation
    // @ts-ignore
    const totalTime = maturity - item.startDate.toDate();
    // @ts-ignore
    const elapsedTime = now - item.startDate.toDate();
    const progress = Math.min(Math.max(elapsedTime / totalTime, 0), 1) * 100;

    return (
      <View style={tw`bg-white p-4 rounded-xl border border-gray-100 shadow-sm mb-4`}>
        <View style={tw`flex-row justify-between items-start mb-2`}>
            <View style={tw`flex-row items-center gap-3`}>
                <View style={tw`bg-emerald-100 p-2 rounded-lg`}>
                    <Ionicons name="leaf" size={20} color="#047857" />
                </View>
                <View>
                    <Text style={tw`font-bold text-slate-900`}>{item.farmName}</Text>
                    <Text style={tw`text-gray-400 text-xs`}>{item.slots} Slots</Text>
                </View>
            </View>
            <View style={tw`bg-green-50 px-2 py-1 rounded`}>
                <Text style={tw`text-green-700 text-xs font-bold`}>{item.expectedRoi}% ROI</Text>
            </View>
        </View>

        <View style={tw`flex-row justify-between mt-2 mb-3`}>
            <Text style={tw`text-gray-500 text-xs`}>Invested: <Text style={tw`font-bold text-slate-800`}>₦{item.amountInvested.toLocaleString()}</Text></Text>
            <Text style={tw`text-gray-500 text-xs`}>Maturity: <Text style={tw`font-bold text-slate-800`}>{maturity.toLocaleDateString()}</Text></Text>
        </View>

        {/* Progress Bar */}
        <View style={tw`h-2 bg-gray-100 rounded-full overflow-hidden`}>
            <View style={{ width: `${progress}%`, height: '100%', backgroundColor: '#10b981' }} />
        </View>
        <Text style={tw`text-right text-[10px] text-gray-400 mt-1`}>{progress.toFixed(0)}% Mature</Text>
      </View>
    );
  };

  const renderTransactionItem = ({ item }: any) => {
    const isCredit = item.type === 'deposit' || item.type === 'payout';
    return (
      <View style={tw`flex-row items-center justify-between py-4 border-b border-gray-50`}>
        <View style={tw`flex-row items-center gap-3`}>
            <View style={tw`w-10 h-10 rounded-full items-center justify-center ${isCredit ? 'bg-green-50' : 'bg-red-50'}`}>
                <Ionicons 
                    name={isCredit ? "arrow-down" : "arrow-up"} 
                    size={18} 
                    color={isCredit ? "#16a34a" : "#dc2626"} 
                />
            </View>
            <View>
                <Text style={tw`font-bold text-slate-800 capitalize`}>{item.type}</Text>
                <Text style={tw`text-gray-400 text-xs`}>{new Date(item.date).toDateString()}</Text>
            </View>
        </View>
        <Text style={tw`font-bold ${isCredit ? 'text-green-600' : 'text-slate-900'}`}>
            {isCredit ? '+' : '-'}₦{item.amount.toLocaleString()}
        </Text>
      </View>
    );
  };

  return (
    <View style={tw`flex-1 bg-white`}>
      {/* HEADER */}
      <View style={tw`pt-14 px-6 pb-2 border-b border-gray-100`}>
        <Text style={tw`text-2xl font-bold text-slate-900 mb-4`}>History</Text>
        
        {/* TAB SWITCHER */}
        <View style={tw`flex-row bg-gray-100 p-1 rounded-xl mb-2`}>
            <TouchableOpacity 
                onPress={() => setActiveTab('portfolio')}
                style={tw`flex-1 py-2 rounded-lg items-center ${activeTab === 'portfolio' ? 'bg-white shadow-sm' : ''}`}
            >
                <Text style={tw`font-bold ${activeTab === 'portfolio' ? 'text-slate-900' : 'text-gray-400'}`}>Portfolio</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
                onPress={() => setActiveTab('transactions')}
                style={tw`flex-1 py-2 rounded-lg items-center ${activeTab === 'transactions' ? 'bg-white shadow-sm' : ''}`}
            >
                <Text style={tw`font-bold ${activeTab === 'transactions' ? 'text-slate-900' : 'text-gray-400'}`}>Transactions</Text>
            </TouchableOpacity>
        </View>
      </View>

      {/* CONTENT */}
      <View style={tw`flex-1 px-6`}>
        {activeTab === 'portfolio' ? (
            investments.length > 0 ? (
                <FlatList 
                    data={investments} 
                    renderItem={renderPortfolioItem} 
                    keyExtractor={item => item.id}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={tw`pt-6 pb-24`}
                />
            ) : (
                <View style={tw`flex-1 items-center justify-center`}>
                    <Ionicons name="leaf-outline" size={48} color="#cbd5e1" />
                    <Text style={tw`text-gray-400 mt-2`}>No active investments.</Text>
                </View>
            )
        ) : (
            transactions.length > 0 ? (
                <FlatList 
                    data={transactions} 
                    renderItem={renderTransactionItem} 
                    keyExtractor={item => item.id}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={tw`pt-2 pb-24`}
                />
            ) : (
                <View style={tw`flex-1 items-center justify-center`}>
                    <Ionicons name="receipt-outline" size={48} color="#cbd5e1" />
                    <Text style={tw`text-gray-400 mt-2`}>No transactions yet.</Text>
                </View>
            )
        )}
      </View>
    </View>
  );
}