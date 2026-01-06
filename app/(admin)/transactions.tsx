import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';

// Firebase
import { collection, onSnapshot, query, orderBy, doc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
// @ts-ignore
import { db } from '../../services/firebaseConfig';

type FilterType = 'all' | 'pending' | 'success' | 'failed';

export default function AdminTransactions() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    // 1. Fetch Transacation Log (Newest First)
    const q = query(collection(db, "transactions"), orderBy("createdAt", "desc"));
    
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTransactions(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // --- ACTIONS ---

  const handleWithdrawalAction = async (tx: any, action: 'approve' | 'reject') => {
    setProcessingId(tx.id);
    try {
        const txRef = doc(db, "transactions", tx.id);
        const userRef = doc(db, "users", tx.userId);

        if (action === 'approve') {
            // A. Approve: Just mark as success (Admin has sent money externally)
            await updateDoc(txRef, { 
                status: 'success', 
                processedAt: serverTimestamp() 
            });
            Alert.alert("Approved", "Withdrawal marked as sent.");
        } else {
            // B. Reject: REFUND the user
            await updateDoc(txRef, { 
                status: 'failed', 
                processedAt: serverTimestamp(),
                note: 'Rejected by Admin'
            });
            // Refund logic: Add money back to wallet
            await updateDoc(userRef, {
                walletBalance: increment(tx.amount)
            });
            Alert.alert("Rejected", "Funds returned to user wallet.");
        }
    } catch (error) {
        Alert.alert("Error", "Could not process request.");
        console.error(error);
    } finally {
        setProcessingId(null);
    }
  };

  // --- FILTER LOGIC ---
  const filteredData = transactions.filter(t => {
      if (filter === 'all') return true;
      return t.status === filter;
  });

  if (loading) return <View style={tw`flex-1 bg-slate-950 items-center justify-center`}><ActivityIndicator color="#10b981" /></View>;

  return (
    <View style={tw`flex-1 bg-slate-950`}>
      {/* HEADER */}
      <View style={tw`pt-16 px-6 pb-4 bg-slate-900 border-b border-slate-800`}>
        <Text style={tw`text-white text-3xl font-bold`}>Audit Log</Text>
        <Text style={tw`text-slate-400 text-xs`}>Monitor deposits & approvals</Text>
      </View>

      {/* FILTER TABS */}
      <View style={tw`flex-row px-6 py-4 gap-2`}>
          {['all', 'pending', 'success', 'failed'].map((f) => (
              <TouchableOpacity 
                key={f} 
                onPress={() => setFilter(f as FilterType)}
                style={tw`px-4 py-2 rounded-full border ${filter === f ? 'bg-emerald-500 border-emerald-500' : 'bg-slate-900 border-slate-700'}`}
              >
                  <Text style={tw`capitalize text-xs font-bold ${filter === f ? 'text-white' : 'text-slate-400'}`}>{f}</Text>
              </TouchableOpacity>
          ))}
      </View>

      {/* LIST */}
      <FlatList 
        data={filteredData}
        keyExtractor={item => item.id}
        contentContainerStyle={tw`px-6 pb-32`}
        ListEmptyComponent={<Text style={tw`text-slate-500 text-center mt-10`}>No records found.</Text>}
        renderItem={({ item }) => (
          <View style={tw`bg-slate-900 p-4 rounded-2xl border border-slate-800 mb-3`}>
            
            {/* Top Row: Icon + Type + Amount */}
            <View style={tw`flex-row justify-between items-start mb-2`}>
                <View style={tw`flex-row gap-3 items-center`}>
                    <View style={tw`w-10 h-10 rounded-full items-center justify-center ${getStatusColor(item.type, item.status)}`}>
                        <Ionicons 
                            name={item.type === 'deposit' ? "arrow-down" : "arrow-up"} 
                            size={18} 
                            color="white" 
                        />
                    </View>
                    <View>
                        <Text style={tw`text-white font-bold capitalize`}>{item.type}</Text>
                        <Text style={tw`text-slate-500 text-xs`}>{new Date(item.createdAt?.toDate()).toDateString()}</Text>
                    </View>
                </View>
                <Text style={tw`text-white font-bold text-lg`}>
                    {item.type === 'withdrawal' ? '-' : '+'}₦{item.amount?.toLocaleString()}
                </Text>
            </View>

            {/* Middle Row: User Info */}
            <Text style={tw`text-slate-400 text-xs mb-3 pl-13`}>
                User: {item.userEmail || 'Unknown'} • Ref: {item.reference?.slice(0,8)}
            </Text>

            {/* Bottom Row: Status Badge OR Action Buttons */}
            <View style={tw`pl-13`}>
                {item.status === 'pending' && item.type === 'withdrawal' ? (
                    // --- ACTION BUTTONS (Only for Pending Withdrawals) ---
                    <View style={tw`flex-row gap-3 mt-1`}>
                        <TouchableOpacity 
                            disabled={!!processingId}
                            onPress={() => handleWithdrawalAction(item, 'approve')}
                            style={tw`bg-emerald-600 px-4 py-2 rounded-lg flex-1 items-center`}
                        >
                            {processingId === item.id ? <ActivityIndicator color="white" size="small"/> : <Text style={tw`text-white font-bold text-xs`}>Approve Payment</Text>}
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            disabled={!!processingId}
                            onPress={() => handleWithdrawalAction(item, 'reject')}
                            style={tw`bg-red-900/50 border border-red-900 px-4 py-2 rounded-lg items-center`}
                        >
                            <Text style={tw`text-red-400 font-bold text-xs`}>Reject</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    // --- STATIC BADGE ---
                    <View style={tw`self-start px-2 py-1 rounded bg-slate-800 border border-slate-700`}>
                        <Text style={tw`text-slate-400 text-[10px] font-bold uppercase`}>{item.status}</Text>
                    </View>
                )}
            </View>

          </View>
        )}
      />
    </View>
  );
}

// Helper for Icon Colors
function getStatusColor(type: string, status: string) {
    if (status === 'failed') return 'bg-red-500';
    if (status === 'pending') return 'bg-yellow-500';
    return type === 'deposit' ? 'bg-emerald-500' : 'bg-blue-500'; // Success colors
}