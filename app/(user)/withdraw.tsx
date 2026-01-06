import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

// Firebase
import { addDoc, collection, doc, getDoc, increment, serverTimestamp, updateDoc } from 'firebase/firestore';
// @ts-ignore
import { auth, db } from '../../services/firebaseConfig';

export default function WithdrawScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [amount, setAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNum, setAccountNum] = useState('');
  const [accountName, setAccountName] = useState('');

  // User Data
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    // Fetch current balance for safety check
    const fetchBalance = async () => {
        const user = auth.currentUser;
        if (!user) return;
        const docSnap = await getDoc(doc(db, "users", user.uid));
        if (docSnap.exists()) {
            setBalance(docSnap.data().walletBalance || 0);
        }
    };
    fetchBalance();
  }, []);

  const handleWithdraw = async () => {
    const value = parseInt(amount);

    // 1. Validation
    if (!value || !bankName || !accountNum || !accountName) {
        Alert.alert("Missing Details", "Please fill all bank information.");
        return;
    }
    if (value < 1000) {
        Alert.alert("Minimum Limit", "Minimum withdrawal is ₦1,000");
        return;
    }
    if (value > balance) {
        Alert.alert("Insufficient Funds", `You only have ₦${balance.toLocaleString()}`);
        return;
    }

    setLoading(true);

    try {
        const user = auth.currentUser;
        if (!user) return;

        // 2. ATOMIC DEDUCTION (Prevent double-spending)
        // We deduct money FIRST. If admin rejects later, we refund it.
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, {
            walletBalance: increment(-value)
        });

        // 3. Create Request Ticket
        await addDoc(collection(db, "transactions"), {
            userId: user.uid,
            userEmail: user.email,
            type: 'withdrawal',
            amount: value,
            status: 'pending', // Needs Admin Approval
            bankDetails: {
                bankName,
                accountNumber: accountNum,
                accountName
            },
            createdAt: serverTimestamp(),
            reference: `WDR-${Date.now()}`
        });

        Alert.alert("Request Sent", "Your withdrawal is processing. Admin will verify shortly.");
        router.replace('/(user)/' as any);

    } catch (error) {
        console.error("Withdraw Error:", error);
        Alert.alert("Error", "Could not process request. Please try again.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <View style={tw`flex-1 bg-slate-50`}>
      {/* Header */}
      <View style={tw`pt-14 px-6 pb-4 bg-white border-b border-gray-100 flex-row items-center gap-4`}>
        <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={tw`text-xl font-bold text-slate-900`}>Withdraw Funds</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={tw`flex-1`}>
        <ScrollView contentContainerStyle={tw`p-6 gap-6`}>

            {/* Balance Card */}
            <View style={tw`bg-emerald-900 p-6 rounded-2xl mb-2`}>
                <Text style={tw`text-emerald-200 text-xs font-bold uppercase mb-1`}>Available for Withdrawal</Text>
                <Text style={tw`text-white text-3xl font-bold`}>₦{balance.toLocaleString()}</Text>
            </View>

            {/* Amount Input */}
            <View>
                <Text style={tw`text-slate-500 font-bold text-xs uppercase mb-2`}>Amount (₦)</Text>
                <TextInput 
                    style={tw`bg-white p-4 rounded-xl border border-gray-200 text-lg font-bold text-slate-900`}
                    placeholder="0.00"
                    keyboardType="numeric"
                    value={amount}
                    onChangeText={setAmount}
                />
            </View>

            {/* Bank Details Section */}
            <Text style={tw`text-slate-900 font-bold text-lg mt-2`}>Destination Account</Text>
            
            <View style={tw`gap-4`}>
                <Input label="Bank Name" placeholder="e.g. GTBank, Kuda" value={bankName} onChange={setBankName} />
                <Input label="Account Number" placeholder="0123456789" kType="numeric" value={accountNum} onChange={setAccountNum} />
                <Input label="Account Name" placeholder="Matches your profile name" value={accountName} onChange={setAccountName} />
            </View>

            {/* Warning Note */}
            <View style={tw`bg-orange-50 p-4 rounded-xl flex-row gap-3 items-start border border-orange-100`}>
                <Ionicons name="information-circle" size={20} color="#ea580c" />
                <Text style={tw`text-orange-800 text-xs flex-1 leading-5`}>
                    Withdrawals are processed manually by Admin. Please allow up to 24 hours for the funds to reflect in your bank account.
                </Text>
            </View>

            {/* Action Button */}
            <TouchableOpacity 
                onPress={handleWithdraw}
                disabled={loading}
                style={tw`bg-emerald-600 p-4 rounded-xl items-center shadow-lg shadow-emerald-500/20 mt-4 ${loading ? 'opacity-50' : ''}`}
            >
                {loading ? (
                    <ActivityIndicator color="white" />
                ) : (
                    <Text style={tw`text-white font-bold text-lg`}>Confirm Request</Text>
                )}
            </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// Helper Input Component
function Input({ label, placeholder, value, onChange, kType = 'default' }: any) {
    return (
        <View>
            <Text style={tw`text-slate-500 font-bold text-xs uppercase mb-2`}>{label}</Text>
            <TextInput 
                style={tw`bg-white p-4 rounded-xl border border-gray-200 text-base text-slate-800`}
                placeholder={placeholder}
                value={value}
                onChangeText={onChange}
                keyboardType={kType}
            />
        </View>
    )
}