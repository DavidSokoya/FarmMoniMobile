import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

// Firebase
import { collection, onSnapshot, query, where } from 'firebase/firestore';
// @ts-ignore
import { db } from '../../services/firebaseConfig';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function InvestScreen() {
  const router = useRouter();
  const [farms, setFarms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. FETCH FARMS REAL-TIME
  useEffect(() => {
    // We filter for 'open' farms only
    const q = query(collection(db, "farms"), where("status", "==", "open"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const farmList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setFarms(farmList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={tw`flex-1 bg-slate-50 items-center justify-center`}>
        <ActivityIndicator size="large" color="#059669" />
        <Text style={tw`text-emerald-700 mt-2 font-medium`}>Loading Farms...</Text>
      </View>
    );
  }

  return (
    <View style={tw`flex-1 bg-slate-50`}>
      {/* HEADER */}
      <View style={tw`pt-14 px-6 pb-4 bg-white border-b border-gray-100`}>
        <Text style={tw`text-2xl font-bold text-slate-900`}>Invest</Text>
        <Text style={tw`text-gray-500`}>Choose a farm to start earning.</Text>
      </View>

      {/* CONTENT */}
      <ScrollView contentContainerStyle={tw`p-6 pb-24`} showsVerticalScrollIndicator={false}>
        
        {/* If no farms found */}
        {farms.length === 0 && (
            <View style={tw`items-center justify-center mt-20`}>
                <Ionicons name="leaf-outline" size={64} color="#cbd5e1" />
                <Text style={tw`text-gray-400 mt-4 text-center`}>No open farms available right now.{'\n'}Check back later!</Text>
            </View>
        )}

        {/* FARM GRID */}
        {farms.map((farm) => (
          <View key={farm.id} style={tw`bg-white rounded-2xl mb-6 shadow-sm border border-gray-100 overflow-hidden`}>
            
            {/* IMAGE AREA */}
            <Image 
              source={{ uri: farm.imageUrl || 'https://placehold.co/600x400/png' }} 
              style={tw`w-full h-40 bg-gray-200`}
              resizeMode="cover"
            />
            
            {/* BADGES (Overlaid) */}
            <View style={tw`absolute top-3 right-3 flex-row gap-2`}>
                <View style={tw`bg-white/90 px-3 py-1 rounded-full shadow-sm`}>
                    <Text style={tw`text-emerald-700 font-bold text-xs`}>{farm.roi}% ROI</Text>
                </View>
            </View>

            {/* DETAILS */}
            <View style={tw`p-5`}>
                <Text style={tw`text-lg font-bold text-slate-900 mb-1`}>{farm.name}</Text>
                <Text style={tw`text-gray-500 text-sm mb-4 leading-5`} numberOfLines={2}>
                    {farm.description}
                </Text>

                {/* METRICS ROW */}
                <View style={tw`flex-row justify-between items-center mb-4 bg-slate-50 p-3 rounded-lg`}>
                    <View>
                        <Text style={tw`text-gray-400 text-xs uppercase font-bold`}>Price per Slot</Text>
                        <Text style={tw`text-slate-900 font-bold text-base`}>₦{farm.pricePerSlot?.toLocaleString()}</Text>
                    </View>
                    <View style={tw`h-8 w-[1px] bg-gray-200`}></View>
                    <View>
                        <Text style={tw`text-gray-400 text-xs uppercase font-bold`}>Duration</Text>
                        <Text style={tw`text-slate-900 font-bold text-base`}>{farm.duration}</Text>
                    </View>
                </View>

                {/* ACTION BUTTON */}
                <TouchableOpacity 
                    onPress={() => router.push(`/(user)/farm-details/${farm.id}` as any)}
                    style={tw`bg-emerald-900 py-3 rounded-xl items-center flex-row justify-center gap-2`}
                >
                    <Text style={tw`text-white font-bold`}>View Farm</Text>
                    <Ionicons name="arrow-forward" size={16} color="white" />
                </TouchableOpacity>
            </View>
          </View>
        ))}

      </ScrollView>
    </View>
  );
}