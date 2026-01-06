import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Easing, Image, Modal, Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

// Firebase
import { signOut } from 'firebase/auth';
import { collection, doc, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
// @ts-ignore
import { auth, db } from '../../services/firebaseConfig';

export default function UserDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [trending, setTrending] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [investedAmount, setInvestedAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [profileModalVisible, setProfileModalVisible] = useState(false);

  // Animation State for Ticker
  const [currentIndex, setCurrentIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    
    // 1. Fetch User Profile
    const unsubUser = onSnapshot(doc(db, "users", currentUser.uid), (doc) => {
      setUser({ uid: currentUser.uid, ...doc.data() });
    });

    // 2. Calculate Active Investments
    const qInvested = query(collection(db, "investments"), where("userId", "==", currentUser.uid), where("status", "==", "active"));
    const unsubInvested = onSnapshot(qInvested, (snap) => {
        const total = snap.docs.reduce((acc, doc) => acc + (doc.data().amountInvested || 0), 0);
        setInvestedAmount(total);
    });

    // 3. Fetch Trending Farms
    const qFarms = query(collection(db, "farms"), where("status", "==", "open"), limit(5));
    const unsubFarms = onSnapshot(qFarms, (snap) => {
        setTrending(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
    });

    // 4. Fetch RECENT ACTIVITIES (The Data for the Ticker)
    const qActivity = query(collection(db, "investments"), orderBy("createdAt", "desc"), limit(10));
    const unsubActivity = onSnapshot(qActivity, (snap) => {
        const list = snap.docs.map(doc => {
            const d = doc.data();
            // Format time (e.g., "2m ago")
            const seconds = d.createdAt?.seconds ? (Date.now()/1000 - d.createdAt.seconds) : 0;
            let timeStr = "Just now";
            if (seconds > 60) timeStr = `${Math.floor(seconds/60)}m ago`;
            if (seconds > 3600) timeStr = `${Math.floor(seconds/3600)}h ago`;
            if (seconds > 86400) timeStr = `${Math.floor(seconds/86400)}d ago`;

            return {
                id: doc.id,
                name: d.userName || 'Investor',
                action: `invested ₦${d.amountInvested?.toLocaleString()}`,
                target: d.farmName,
                time: timeStr,
                initial: (d.userName?.[0] || 'I').toUpperCase()
            };
        });
        setActivities(list);
        setLoading(false);
    });

    return () => { unsubUser(); unsubFarms(); unsubActivity(); unsubInvested(); };
  }, []);

  // --- THE TICKER ANIMATION LOOP ---
  useEffect(() => {
      if (activities.length === 0) return;

      const interval = setInterval(() => {
          // Fade Out
          Animated.timing(fadeAnim, {
              toValue: 0,
              duration: 500,
              useNativeDriver: true,
              easing: Easing.ease
          }).start(() => {
              // Switch Data
              setCurrentIndex((prev) => (prev + 1) % activities.length);
              
              // Fade In
              Animated.timing(fadeAnim, {
                  toValue: 1,
                  duration: 500,
                  useNativeDriver: true,
                  easing: Easing.ease
              }).start();
          });
      }, 4000); // Change every 4 seconds

      return () => clearInterval(interval);
  }, [activities]);

  const handleLogout = async () => {
    try { await signOut(auth); router.replace('/login'); } catch (e) { Alert.alert("Error", "Logout failed"); }
  };

  const totalPortfolio = (user?.walletBalance || 0) + investedAmount;
  const currentActivity = activities.length > 0 ? activities[currentIndex] : null;

  if (loading) return <View style={tw`flex-1 bg-white items-center justify-center`}><ActivityIndicator color="#10b981" /></View>;

  return (
    <View style={tw`flex-1 bg-slate-50`}>
      {/* HEADER */}
      <View style={tw`pt-16 px-6 pb-4 bg-white flex-row justify-between items-center border-b border-gray-100`}>
        <View>
          <Text style={tw`text-slate-400 text-xs font-bold uppercase tracking-wider`}>Welcome back,</Text>
          <Text style={tw`text-2xl font-bold text-slate-900`}>{user?.fullName?.split(' ')[0]}</Text>
        </View>
        <View style={tw`flex-row gap-3`}>
            <TouchableOpacity onPress={() => setProfileModalVisible(true)} style={tw`bg-slate-100 p-2 rounded-full`}>
                <Ionicons name="person" size={24} color="#334155" />
            </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={tw`pb-32`} showsVerticalScrollIndicator={false}>
        
        {/* --- WALLET CARD --- */}
        <View style={tw`mx-6 mt-6 mb-8`}>
            <View style={tw`bg-slate-900 rounded-3xl p-6 relative overflow-hidden shadow-xl shadow-slate-900/30`}>
                <View style={tw`mb-6`}>
                    <Text style={tw`text-slate-400 text-xs font-bold uppercase mb-1`}>Total Portfolio Value</Text>
                    <Text style={tw`text-white text-4xl font-bold`}>₦{totalPortfolio.toLocaleString()}</Text>
                </View>

                <View style={tw`flex-row gap-6 mb-6 border-t border-slate-700 pt-4`}>
                    <View>
                        <Text style={tw`text-slate-500 text-[10px] font-bold uppercase`}>Cash Balance</Text>
                        <Text style={tw`text-emerald-400 font-bold text-lg`}>₦{user?.walletBalance?.toLocaleString() || 0}</Text>
                    </View>
                    <View>
                        <Text style={tw`text-slate-500 text-[10px] font-bold uppercase`}>Active Inv.</Text>
                        <Text style={tw`text-yellow-400 font-bold text-lg`}>₦{investedAmount.toLocaleString()}</Text>
                    </View>
                </View>

                <View style={tw`flex-row justify-between items-center`}>
                    <TouchableOpacity 
                        onPress={() => router.push('/(user)/deposit' as any)}
                        style={tw`bg-emerald-600 px-5 py-3 rounded-xl flex-row items-center gap-2`}>
                        <Ionicons name="add" size={20} color="white" />
                        <Text style={tw`text-white font-bold`}>Deposit Funds</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        onPress={() => router.push('/(user)/withdraw' as any)}
                        style={tw`w-12 h-12 bg-slate-700 rounded-full items-center justify-center border border-slate-600`}
                    >
                        <Ionicons name="arrow-down" size={24} color="white" />
                    </TouchableOpacity>
                </View>
            </View>
        </View>

        {/* --- 🔥 LIVE ACTIVITY TICKER (REPLACES QUICK ACTIONS) --- */}
        {currentActivity && (
             <View style={tw`px-6 mb-8`}>
                 <Text style={tw`text-slate-400 text-xs font-bold uppercase mb-3 ml-1`}>Happening Now ⚡</Text>
                 <Animated.View style={{ opacity: fadeAnim }}>
                     <View style={tw`bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm flex-row items-center gap-4`}>
                         <View style={tw`w-12 h-12 bg-emerald-100 rounded-full items-center justify-center border-2 border-white shadow-sm`}>
                             <Text style={tw`text-emerald-700 font-bold text-lg`}>{currentActivity.initial}</Text>
                         </View>
                         <View style={tw`flex-1`}>
                             <View style={tw`flex-row justify-between items-start`}>
                                 <Text style={tw`text-slate-900 font-bold text-sm`} numberOfLines={1}>
                                     {currentActivity.name}
                                 </Text>
                                 <Text style={tw`text-slate-400 text-[10px] font-bold`}>{currentActivity.time}</Text>
                             </View>
                             <Text style={tw`text-slate-600 text-xs leading-5`} numberOfLines={2}>
                                 {currentActivity.action} in <Text style={tw`text-emerald-600 font-bold`}>{currentActivity.target}</Text>
                             </Text>
                         </View>
                     </View>
                 </Animated.View>
             </View>
        )}

        {/* --- TRENDING FARMS --- */}
        <View style={tw`px-6 mb-4 flex-row justify-between items-end`}>
            <Text style={tw`text-lg font-bold text-slate-900`}>Trending Opportunities</Text>
            <TouchableOpacity onPress={() => router.push('/(user)/invest' as any)}>
                <Text style={tw`text-emerald-600 font-bold text-xs`}>View All</Text>
            </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`px-6 gap-4`}>
            {trending.length === 0 ? (
                <View style={tw`w-80 h-40 bg-gray-100 rounded-2xl items-center justify-center`}>
                    <Text style={tw`text-gray-400`}>No open farms found.</Text>
                </View>
            ) : (
                trending.map((item) => (
                    <TouchableOpacity 
                        key={item.id}
                        onPress={() => router.push('/(user)/invest' as any)}
                        style={tw`w-72 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm mr-2`}
                    >
                        <Image 
                            source={{ uri: item.imageUrl || 'https://placehold.co/600x400/png' }} 
                            style={tw`w-full h-32 rounded-xl bg-gray-200 mb-3`}
                        />
                        <View style={tw`flex-row justify-between items-start mb-1`}>
                            <Text style={tw`font-bold text-slate-900 text-lg flex-1 mr-2`} numberOfLines={1}>{item.name}</Text>
                            <View style={tw`bg-emerald-100 px-2 py-1 rounded`}>
                                <Text style={tw`text-emerald-700 font-bold text-xs`}>{item.roi}% ROI</Text>
                            </View>
                        </View>
                        <Text style={tw`text-gray-500 text-xs mb-3`}>{item.duration} Months • {item.availableSlots} Slots left</Text>
                        
                        <View style={tw`flex-row justify-between items-center mt-auto`}>
                            <Text style={tw`text-slate-900 font-bold`}>₦{item.pricePerSlot?.toLocaleString()}</Text>
                            <View style={tw`w-8 h-8 bg-slate-900 rounded-full items-center justify-center`}>
                                <Ionicons name="arrow-forward" size={16} color="white" />
                            </View>
                        </View>
                    </TouchableOpacity>
                ))
            )}
        </ScrollView>
      </ScrollView>

      {/* --- PROFILE MODAL --- */}
      <Modal visible={profileModalVisible} animationType="slide" transparent>
          <View style={tw`flex-1 bg-black/50 justify-end`}>
            <Pressable style={tw`flex-1`} onPress={() => setProfileModalVisible(false)} />
            <View style={tw`bg-white rounded-t-3xl p-6 pb-10`}>
                <View style={tw`items-center mb-6 border-b border-gray-100 pb-6`}>
                    <View style={tw`w-16 h-16 bg-slate-200 rounded-full items-center justify-center mb-3`}>
                         <Text style={tw`text-2xl font-bold text-slate-500`}>{user?.fullName?.[0]}</Text>
                    </View>
                    <Text style={tw`text-xl font-bold text-slate-900`}>{user?.fullName}</Text>
                    <Text style={tw`text-slate-500`}>{user?.email}</Text>
                </View>

                {user?.role === 'admin' && (
                    <TouchableOpacity 
                        onPress={() => { setProfileModalVisible(false); router.replace('/(admin)/dashboard' as any); }}
                        style={tw`flex-row items-center gap-4 p-4 bg-slate-900 rounded-xl mb-3`}
                    >
                        <Ionicons name="shield-checkmark" size={24} color="#10b981" />
                        <View>
                            <Text style={tw`text-white font-bold`}>Admin Console</Text>
                            <Text style={tw`text-slate-400 text-xs`}>Manage farms & users</Text>
                        </View>
                    </TouchableOpacity>
                )}

                <TouchableOpacity onPress={handleLogout} style={tw`flex-row items-center gap-4 p-4 bg-red-50 rounded-xl mt-2`}>
                    <Ionicons name="log-out-outline" size={24} color="#ef4444" />
                    <Text style={tw`text-red-600 font-bold`}>Log Out</Text>
                </TouchableOpacity>
            </View>
          </View>
      </Modal>
    </View>
  );
}