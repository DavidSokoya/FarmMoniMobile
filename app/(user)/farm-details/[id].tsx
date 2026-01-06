import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

// Firebase
import { collection, doc, getDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
// @ts-ignore
import { auth, db } from '../../../services/firebaseConfig';

export default function FarmDetails() {
  const { id } = useLocalSearchParams(); 
  const router = useRouter();
  
  const [farm, setFarm] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState(1);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const fetchFarm = async () => {
      // @ts-ignore
      const docRef = doc(db, "farms", id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setFarm(docSnap.data());
      }
      setLoading(false);
    };
    fetchFarm();
  }, [id]);

  const handleInvest = async () => {
    const user = auth.currentUser;
    if (!user || !farm) return;

    const totalCost = slots * farm.pricePerSlot;

    Alert.alert(
      "Confirm Investment",
      `You are about to invest ₦${totalCost.toLocaleString()} for ${slots} slots in ${farm.name}.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Confirm & Pay", 
          onPress: async () => await executeTransaction(user.uid, totalCost) 
        }
      ]
    );
  };

  const executeTransaction = async (userId: string, cost: number) => {
    setProcessing(true);
    try {
      await runTransaction(db, async (transaction) => {
        // A. Get fresh data
        const userRef = doc(db, "users", userId);
        const farmRef = doc(db, "farms", id as string);
        
        const userDoc = await transaction.get(userRef);
        const farmDoc = await transaction.get(farmRef);

        if (!userDoc.exists() || !farmDoc.exists()) throw "Document not found";

        const userData = userDoc.data();
        const farmData = farmDoc.data();

        // B. Check Constraints
        if (userData.walletBalance < cost) {
            throw "Insufficient Funds. Please Top Up.";
        }
        if (farmData.availableSlots < slots) {
            throw "Not enough slots available!";
        }

        // C. WRITE: Deduct Money & Slots
        transaction.update(userRef, { walletBalance: userData.walletBalance - cost });
        transaction.update(farmRef, { availableSlots: farmData.availableSlots - slots });

        // D. WRITE: Create Investment Record (The Asset)
        const newInvestRef = doc(collection(db, "investments")); 
        transaction.set(newInvestRef, {
            userId: userId,
            farmId: id,
            farmName: farmData.name,
            amountInvested: cost,
            slots: slots,
            expectedRoi: farmData.roi,
            status: 'active',
            startDate: serverTimestamp(),
            // Calculate maturity date (Simplified)
            maturityDate: new Date(new Date().setMonth(new Date().getMonth() + parseInt(farmData.duration))).toISOString()
        });

        // E. WRITE: Create Transaction Receipt (The Paper Trail) --- NEW FIX ---
        const newTransRef = doc(collection(db, "transactions"));
        transaction.set(newTransRef, {
            userId: userId,
            type: 'investment', // Identified as Debit in History
            amount: cost,
            reference: `INV-${farmData.name.substring(0,3).toUpperCase()}-${Date.now()}`,
            status: 'success',
            date: new Date().toISOString()
        });

      });

      Alert.alert("Success! 🎉", "You are now an investor!");
      router.replace('/(user)/history' as any);

    } catch (e: any) {
      Alert.alert("Transaction Failed", e.toString() || "Unknown error");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <ActivityIndicator size="large" color="#059669" style={tw`flex-1`} />;
  if (!farm) return <Text>Farm not found</Text>;

  return (
    <View style={tw`flex-1 bg-white`}>
      <View style={tw`h-64 bg-gray-200 relative`}>
        <Image source={{ uri: farm.imageUrl }} style={tw`w-full h-full`} resizeMode="cover" />
        <TouchableOpacity onPress={() => router.back()} style={tw`absolute top-12 left-6 bg-white/80 p-2 rounded-full`}>
           <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
      </View>

      <ScrollView style={tw`flex-1 -mt-6 bg-white rounded-t-3xl px-6 pt-8`}>
        <View style={tw`flex-row justify-between items-start`}>
            <Text style={tw`text-2xl font-bold text-slate-900 flex-1 mr-2`}>{farm.name}</Text>
            <View style={tw`bg-emerald-100 px-3 py-1 rounded-lg`}>
                <Text style={tw`text-emerald-800 font-bold`}>{farm.roi}% Returns</Text>
            </View>
        </View>

        <Text style={tw`text-gray-500 mt-4 leading-6`}>{farm.description}</Text>

        <View style={tw`flex-row gap-4 mt-6`}>
            <InfoBox label="Duration" value={farm.duration} icon="time-outline" />
            <InfoBox label="Risk Level" value="Low" icon="shield-checkmark-outline" />
            <InfoBox label="Slots Left" value={farm.availableSlots.toString()} icon="grid-outline" />
        </View>

        <View style={tw`mt-8 bg-slate-50 p-6 rounded-2xl border border-gray-100`}>
            <Text style={tw`font-bold text-slate-700 mb-4`}>How many slots?</Text>
            <View style={tw`flex-row justify-between items-center mb-6`}>
                <TouchableOpacity onPress={() => slots > 1 && setSlots(slots - 1)} style={tw`w-12 h-12 bg-white border border-gray-200 rounded-xl items-center justify-center`}>
                    <Ionicons name="remove" size={24} color="black" />
                </TouchableOpacity>
                <View style={tw`items-center`}>
                    <Text style={tw`text-3xl font-bold text-slate-900`}>{slots}</Text>
                    <Text style={tw`text-gray-400 text-xs`}>Slots</Text>
                </View>
                <TouchableOpacity onPress={() => setSlots(slots + 1)} style={tw`w-12 h-12 bg-emerald-100 border border-emerald-200 rounded-xl items-center justify-center`}>
                    <Ionicons name="add" size={24} color="#065f46" />
                </TouchableOpacity>
            </View>
            <View style={tw`h-[1px] bg-gray-200 mb-4`}></View>
            <View style={tw`flex-row justify-between items-center`}>
                <Text style={tw`text-gray-500`}>Total Investment:</Text>
                <Text style={tw`text-xl font-bold text-emerald-700`}>₦{(slots * farm.pricePerSlot).toLocaleString()}</Text>
            </View>
        </View>
        <View style={tw`h-32`} /> 
      </ScrollView>

      <View style={tw`absolute bottom-0 left-0 right-0 p-6 bg-white border-t border-gray-100`}>
        <TouchableOpacity onPress={handleInvest} disabled={processing} style={tw`bg-emerald-900 py-4 rounded-2xl items-center shadow-lg ${processing ? 'opacity-50' : ''}`}>
            {processing ? <ActivityIndicator color="white" /> : <Text style={tw`text-white font-bold text-lg`}>Invest Now</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function InfoBox({ label, value, icon }: any) {
    return (
        <View style={tw`flex-1 bg-white border border-gray-100 p-3 rounded-xl items-center`}>
            <Ionicons name={icon} size={20} color="#64748b" style={tw`mb-1`} />
            <Text style={tw`text-slate-900 font-bold`}>{value}</Text>
            <Text style={tw`text-gray-400 text-[10px] uppercase`}>{label}</Text>
        </View>
    )
}