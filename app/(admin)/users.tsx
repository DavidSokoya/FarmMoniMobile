import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, Text, TextInput, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

// Firebase
import { addDoc, collection, deleteDoc, doc, increment, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';
// @ts-ignore
import { db } from '../../services/firebaseConfig';

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [actionType, setActionType] = useState<'fund' | 'options' | null>(null); // 'fund' for money, 'options' for delete/edit
  
  // Funding State
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      setUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  // --- ACTIONS ---

  const handleDeleteUser = async () => {
      if (!selectedUser) return;
      Alert.alert(
          "Delete User?",
          `Are you sure you want to permanently remove ${selectedUser.fullName}? This cannot be undone.`,
          [
              { text: "Cancel", style: "cancel" },
              { 
                  text: "Delete", 
                  style: "destructive", 
                  onPress: async () => {
                      try {
                          await deleteDoc(doc(db, "users", selectedUser.id));
                          Alert.alert("Deleted", "User removed from database.");
                          closeModal();
                      } catch (e) {
                          Alert.alert("Error", "Could not delete user.");
                      }
                  }
              }
          ]
      );
  };

  const handleTransaction = async (type: 'credit' | 'debit') => {
    if (!amount || !selectedUser) return;
    setLoading(true);
    const value = parseInt(amount);
    const finalAmount = type === 'credit' ? value : -value;

    try {
        const userRef = doc(db, "users", selectedUser.id);
        await updateDoc(userRef, { walletBalance: increment(finalAmount) });

        await addDoc(collection(db, "transactions"), {
            userId: selectedUser.id,
            amount: value,
            type: type === 'credit' ? 'deposit' : 'withdrawal',
            status: 'success',
            title: type === 'credit' ? 'Admin Deposit' : 'Admin Correction',
            description: reason || 'Manual adjustment by Admin',
            createdAt: serverTimestamp(),
            reference: `ADM-${Date.now()}`
        });

        Alert.alert("Success", `Successfully ${type}ed ₦${value.toLocaleString()}`);
        closeModal();
    } catch (error) {
        Alert.alert("Error", "Transaction failed.");
    } finally {
        setLoading(false);
    }
  };

  const openOptions = (user: any) => {
      setSelectedUser(user);
      setActionType('options');
  };

  const openFunding = () => {
      setActionType('fund');
  };

  const closeModal = () => {
      setSelectedUser(null);
      setActionType(null);
      setAmount('');
      setReason('');
  };

  // Safe Date Helper
  const formatDate = (timestamp: any) => {
      if (timestamp && typeof timestamp.toDate === 'function') {
          return timestamp.toDate().toLocaleDateString();
      }
      return 'N/A';
  };

  return (
    <View style={tw`flex-1 bg-slate-950`}>
      {/* HEADER */}
      <View style={tw`pt-16 px-6 pb-4 bg-slate-900 border-b border-slate-800`}>
        <Text style={tw`text-white text-3xl font-bold`}>User Base</Text>
        <Text style={tw`text-slate-400 text-xs`}>{users.length} Registered Accounts</Text>
      </View>

      {/* USER LIST */}
      <FlatList 
        data={users}
        keyExtractor={item => item.id}
        contentContainerStyle={tw`p-6 pb-32`}
        ListEmptyComponent={<Text style={tw`text-slate-500 text-center mt-10`}>No users found.</Text>}
        renderItem={({ item }) => (
          <View style={tw`bg-slate-900 p-4 rounded-2xl border border-slate-800 mb-3`}>
            
            {/* TOP ROW: Avatar + Name + Action Dots */}
            <View style={tw`flex-row justify-between items-start mb-2`}>
                <View style={tw`flex-row gap-3 items-center flex-1`}>
                    <View style={tw`w-10 h-10 rounded-full bg-slate-800 items-center justify-center border border-slate-700`}>
                        <Text style={tw`text-emerald-500 font-bold`}>{item.fullName?.[0] || 'U'}</Text>
                    </View>
                    <View>
                        <View style={tw`flex-row items-center gap-2`}>
                            <Text style={tw`text-white font-bold text-lg`}>{item.fullName}</Text>
                            <View style={tw`bg-slate-800 px-2 py-0.5 rounded border border-slate-700`}>
                                <Text style={tw`text-[10px] text-slate-400 uppercase font-bold`}>{item.role || 'User'}</Text>
                            </View>
                        </View>
                        <Text style={tw`text-slate-500 text-xs`}>{item.email}</Text>
                    </View>
                </View>

                <TouchableOpacity 
                    onPress={() => openOptions(item)}
                    style={tw`p-2`}
                >
                    <Ionicons name="ellipsis-vertical" size={20} color="#64748b" />
                </TouchableOpacity>
            </View>

            {/* BOTTOM ROW: Stats */}
            <View style={tw`flex-row justify-between items-end border-t border-slate-800 pt-3 mt-1`}>
                <View>
                    <Text style={tw`text-slate-600 text-[10px] uppercase font-bold`}>Joined</Text>
                    <Text style={tw`text-slate-400 text-xs`}>
                        {formatDate(item.createdAt)}
                    </Text>
                </View>
                <View style={tw`items-end`}>
                    <Text style={tw`text-slate-600 text-[10px] uppercase font-bold`}>Wallet Balance</Text>
                    <Text style={tw`text-emerald-400 font-bold text-base`}>₦{item.walletBalance?.toLocaleString() || 0}</Text>
                </View>
            </View>
          </View>
        )}
      />

      {/* --- OPTIONS MODAL (Bottom Sheet) --- */}
      <Modal visible={actionType === 'options'} animationType="slide" transparent>
         <View style={tw`flex-1 bg-black/80 justify-end`}>
             <Pressable style={tw`flex-1`} onPress={closeModal} />
             <View style={tw`bg-slate-900 rounded-t-3xl p-6 border-t border-slate-700 pb-10`}>
                 <Text style={tw`text-slate-400 text-xs font-bold uppercase mb-4 text-center`}>Actions for {selectedUser?.fullName}</Text>
                 
                 <TouchableOpacity onPress={openFunding} style={tw`flex-row items-center gap-4 p-4 bg-slate-800 rounded-xl mb-3 border border-slate-700`}>
                     <View style={tw`bg-emerald-500/10 p-2 rounded-full`}><Ionicons name="wallet" size={24} color="#10b981" /></View>
                     <View>
                        <Text style={tw`text-white font-bold`}>Manage Funds</Text>
                        <Text style={tw`text-slate-500 text-xs`}>Credit or Debit user wallet</Text>
                     </View>
                 </TouchableOpacity>

                 <TouchableOpacity onPress={handleDeleteUser} style={tw`flex-row items-center gap-4 p-4 bg-red-900/10 rounded-xl border border-red-900/30`}>
                     <View style={tw`bg-red-500/10 p-2 rounded-full`}><Ionicons name="trash" size={24} color="#ef4444" /></View>
                     <View>
                        <Text style={tw`text-red-400 font-bold`}>Delete Account</Text>
                        <Text style={tw`text-red-900 text-xs`}>Permanently remove user</Text>
                     </View>
                 </TouchableOpacity>
             </View>
         </View>
      </Modal>

      {/* --- FUNDING MODAL --- */}
      <Modal visible={actionType === 'fund'} animationType="slide" transparent>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={tw`flex-1`}>
            <View style={tw`flex-1 bg-black/80 justify-end`}>
                <Pressable style={tw`flex-1`} onPress={closeModal} />
                <View style={tw`bg-slate-900 rounded-t-3xl p-6 border-t border-slate-700`}>
                    <View style={tw`flex-row justify-between items-center mb-6`}>
                        <Text style={tw`text-white text-xl font-bold`}>Manage Funds</Text>
                        <TouchableOpacity onPress={closeModal}><Ionicons name="close" size={24} color="white" /></TouchableOpacity>
                    </View>

                    <TextInput 
                        style={tw`bg-slate-800 text-white text-2xl font-bold p-4 rounded-xl border border-slate-700 mb-4`}
                        placeholder="0.00"
                        placeholderTextColor="#475569"
                        keyboardType="numeric"
                        value={amount}
                        onChangeText={setAmount}
                    />
                    <TextInput 
                        style={tw`bg-slate-800 text-white p-4 rounded-xl border border-slate-700 mb-6`}
                        placeholder="Reason (e.g. Bank Transfer)"
                        placeholderTextColor="#475569"
                        value={reason}
                        onChangeText={setReason}
                    />

                    <View style={tw`flex-row gap-4 mb-8`}>
                        <TouchableOpacity onPress={() => handleTransaction('credit')} disabled={loading} style={tw`flex-1 bg-emerald-600 p-4 rounded-xl items-center`}>
                            {loading ? <ActivityIndicator color="white" /> : <Text style={tw`text-white font-bold`}>Credit (+)</Text>}
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleTransaction('debit')} disabled={loading} style={tw`flex-1 bg-red-900/50 border border-red-900 p-4 rounded-xl items-center`}>
                            <Text style={tw`text-red-400 font-bold`}>Debit (-)</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
          </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}