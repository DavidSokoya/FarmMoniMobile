import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

// Firebase
import { addDoc, collection, deleteDoc, doc, increment, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
// @ts-ignore
import { db } from '../../services/firebaseConfig';

// --- ENV CONFIG ---
const CLOUDINARY_CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

type Tab = 'stakes' | 'inventory';

export default function AdminInvestments() {
  const [activeTab, setActiveTab] = useState<Tab>('inventory');
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Data State
  const [farms, setFarms] = useState<any[]>([]);
  const [stakes, setStakes] = useState<any[]>([]);
  const [userMap, setUserMap] = useState<any>({});

  // Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [roi, setRoi] = useState('');
  const [price, setPrice] = useState('');
  const [slots, setSlots] = useState('');
  const [duration, setDuration] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);

  useEffect(() => {
    const unsubFarms = onSnapshot(collection(db, "farms"), (snap) => {
      setFarms(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
        const mapping: any = {};
        snap.docs.forEach(doc => { const d = doc.data(); mapping[doc.id] = d.fullName || d.email || 'Unknown'; });
        setUserMap(mapping);
    });

    const q = query(collection(db, "investments"), orderBy("startDate", "desc"));
    const unsubStakes = onSnapshot(q, (snap) => {
      setStakes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubFarms(); unsubStakes(); unsubUsers(); };
  }, []);

  // --- ACTIONS (Inventory) ---

  const handleFarmOptions = (item: any) => {
      Alert.alert(
          "Manage Project",
          `Actions for ${item.name}`,
          [
              { text: "Edit Details", onPress: () => handleEditSetup(item) },
              { text: "Delete", onPress: () => handleDeleteFarm(item), style: 'destructive' },
              { text: "Cancel", style: "cancel" }
          ]
      );
  };

  const handleEditSetup = (item: any) => {
      setIsEditing(true);
      setEditId(item.id);
      setName(item.name);
      setRoi(item.roi.toString());
      setPrice(item.pricePerSlot.toString());
      setSlots(item.totalSlots.toString());
      setDuration(item.duration.toString());
      setImageUri(item.imageUrl);
      setModalVisible(true);
  };

  const handleDeleteFarm = (item: any) => {
      Alert.alert(
          "Confirm Delete",
          "This will hide the farm from the marketplace. Current investments are not affected.",
          [
              { text: "Cancel", style: "cancel" },
              { 
                  text: "Delete Forever", 
                  style: "destructive",
                  onPress: async () => {
                      try { await deleteDoc(doc(db, "farms", item.id)); } catch (e) { Alert.alert("Error", "Could not delete."); }
                  }
              }
          ]
      );
  };

  const handleSaveFarm = async () => {
    if (!name || !roi || !price || !slots || !duration) { Alert.alert("Error", "Fill all fields"); return; }
    setLoading(true);
    let finalImageUrl = imageUri;

    try {
        if (imageUri && !imageUri.startsWith('http')) {
            const formData = new FormData();
            formData.append('file', { uri: imageUri, type: 'image/jpeg', name: 'upload.jpg' } as any);
            formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET || '');
            const res = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
            const data = await res.json();
            if (data.secure_url) finalImageUrl = data.secure_url;
        }

        const farmData = {
            name, roi: parseInt(roi), pricePerSlot: parseInt(price), 
            totalSlots: parseInt(slots), duration: parseInt(duration),
            imageUrl: finalImageUrl, status: 'open',
            ...(isEditing ? {} : { availableSlots: parseInt(slots) }), 
        };

        if (isEditing && editId) {
             await updateDoc(doc(db, "farms", editId), farmData);
             Alert.alert("Updated", "Farm details updated.");
        } else {
             const maturityDate = new Date();
             maturityDate.setMonth(maturityDate.getMonth() + parseInt(duration));
             await addDoc(collection(db, "farms"), {
                 ...farmData, maturityDate: maturityDate.toISOString(), createdAt: serverTimestamp(),
             });
             Alert.alert("Success", "New Farm Launched!");
        }
        closeModal();
    } catch (err) { Alert.alert("Error", "Operation failed"); } 
    finally { setLoading(false); }
  };

  // --- ACTIONS (Ledger) ---
  const handlePayROI = async (stake: any) => {
    const investorName = userMap[stake.userId] || 'Investor';
    const totalPayout = stake.amountInvested + (stake.amountInvested * (stake.expectedRoi / 100));

    Alert.alert(
        "Confirm Payout",
        `Send ₦${totalPayout.toLocaleString()} to ${investorName}?`,
        [
            { text: "Cancel", style: "cancel" },
            { 
                text: "PAY & CLOSE", 
                style: "destructive",
                onPress: async () => {
                    setLoading(true);
                    try {
                        await updateDoc(doc(db, "users", stake.userId), { walletBalance: increment(totalPayout) });
                        await updateDoc(doc(db, "investments", stake.id), { status: 'completed', payoutDate: serverTimestamp() });
                        await addDoc(collection(db, "transactions"), {
                            userId: stake.userId, type: 'payout', amount: totalPayout, status: 'success', description: `ROI for ${stake.farmName}`, createdAt: serverTimestamp()
                        });
                        Alert.alert("Success", "Payout Sent.");
                    } catch (err) { Alert.alert("Error", "Payout failed."); } finally { setLoading(false); }
                }
            }
        ]
    );
  };

  const closeModal = () => { setModalVisible(false); resetForm(); };
  const resetForm = () => { setName(''); setRoi(''); setPrice(''); setSlots(''); setDuration(''); setImageUri(null); setIsEditing(false); setEditId(null); };
  
  // --- FIXED IMAGE PICKER ---
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3], // <--- THIS FIXES THE CROP UI
        quality: 0.5,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const filteredStakes = stakes.filter(s => {
      const term = searchQuery.toLowerCase();
      return (userMap[s.userId] || '').toLowerCase().includes(term) || s.farmName?.toLowerCase().includes(term);
  });
  
  const totalActiveValue = stakes.filter(s => s.status === 'active').reduce((sum, s) => sum + s.amountInvested, 0);

  return (
    <View style={tw`flex-1 bg-slate-950`}>
      <View style={tw`pt-16 px-6 pb-4 bg-slate-900 border-b border-slate-800`}>
        <Text style={tw`text-white text-3xl font-bold`}>Investments</Text>
        <View style={tw`flex-row bg-slate-800 p-1 rounded-xl mt-4`}>
            <TabButton label="Active Ledger" active={activeTab === 'stakes'} onPress={() => setActiveTab('stakes')} />
            <TabButton label="Farm Inventory" active={activeTab === 'inventory'} onPress={() => setActiveTab('inventory')} />
        </View>
        {activeTab === 'stakes' && (
             <View style={tw`mt-4 bg-slate-800 flex-row items-center px-4 rounded-xl border border-slate-700`}>
                 <Ionicons name="search" size={20} color="#94a3b8" />
                 <TextInput placeholder="Search..." placeholderTextColor="#64748b" style={tw`flex-1 p-3 text-white`} value={searchQuery} onChangeText={setSearchQuery} />
             </View>
        )}
      </View>

      {/* --- TAB 1: STAKES --- */}
      {activeTab === 'stakes' && (
          <FlatList 
            data={filteredStakes}
            keyExtractor={item => item.id}
            contentContainerStyle={tw`p-6 pb-32`}
            ListEmptyComponent={<Text style={tw`text-slate-500 text-center mt-10`}>No active investments.</Text>}
            ListHeaderComponent={<View style={tw`mb-4`}><Text style={tw`text-slate-400 text-xs font-bold uppercase`}>Total Active Value</Text><Text style={tw`text-emerald-400 text-2xl font-bold`}>₦{totalActiveValue.toLocaleString()}</Text></View>}
            renderItem={({ item }) => (
                <View style={tw`bg-slate-900 p-4 rounded-2xl border border-slate-800 mb-3`}>
                    <View style={tw`flex-row justify-between items-start mb-1`}>
                        <View style={tw`flex-1 mr-4`}>
                            <Text style={tw`text-white font-bold text-lg`} numberOfLines={1}>{userMap[item.userId] || 'Unknown'}</Text>
                            <Text style={tw`text-emerald-500 text-xs font-bold uppercase`}>{item.farmName}</Text>
                        </View>
                        {item.status === 'active' ? (
                            <TouchableOpacity onPress={() => handlePayROI(item)} style={tw`w-8 h-8 items-end justify-start`}><Ionicons name="ellipsis-vertical" size={20} color="#64748b" /></TouchableOpacity>
                        ) : (
                             <View style={tw`bg-slate-800 px-2 py-1 rounded border border-slate-700`}><Text style={tw`text-slate-500 text-[10px] font-bold uppercase`}>Paid</Text></View>
                        )}
                    </View>
                    <View style={tw`flex-row gap-4 mt-3 mb-3`}>
                        <View><Text style={tw`text-slate-500 text-[10px] uppercase font-bold`}>Invested</Text><Text style={tw`text-slate-200 font-bold text-base`}>₦{item.amountInvested?.toLocaleString()}</Text></View>
                        <View><Text style={tw`text-slate-500 text-[10px] uppercase font-bold`}>Units</Text><Text style={tw`text-slate-200 font-bold text-base`}>{item.slots}</Text></View>
                    </View>
                    <View style={tw`border-t border-slate-800 pt-3`}><Text style={tw`text-slate-600 text-[10px]`}>Started: {item.startDate ? new Date(item.startDate.toDate()).toDateString() : 'N/A'}</Text></View>
                </View>
            )}
          />
      )}

      {/* --- TAB 2: INVENTORY --- */}
      {activeTab === 'inventory' && (
          <View style={tw`flex-1`}>
            <FlatList 
                data={farms}
                keyExtractor={item => item.id}
                contentContainerStyle={tw`p-6 pb-32`}
                renderItem={({ item }) => (
                <View style={tw`bg-slate-900 p-4 rounded-2xl border border-slate-800 mb-3`}>
                    <View style={tw`flex-row items-center mb-3`}>
                        <Image source={{ uri: item.imageUrl }} style={tw`w-14 h-14 rounded-xl bg-slate-800 mr-4`} />
                        <View style={tw`flex-1`}>
                            <Text style={tw`text-white font-bold text-lg`}>{item.name}</Text>
                            <Text style={tw`text-emerald-500 text-xs`}>{item.availableSlots} / {item.totalSlots} Slots</Text>
                        </View>
                        <TouchableOpacity onPress={() => handleFarmOptions(item)} style={tw`p-2`}>
                            <Ionicons name="ellipsis-vertical" size={20} color="#64748b" />
                        </TouchableOpacity>
                    </View>
                    
                    <View style={tw`flex-row bg-slate-950 rounded-lg p-3 justify-between`}>
                        <View><Text style={tw`text-slate-500 text-[10px] font-bold uppercase`}>Price</Text><Text style={tw`text-white font-bold`}>₦{item.pricePerSlot?.toLocaleString()}</Text></View>
                        <View><Text style={tw`text-slate-500 text-[10px] font-bold uppercase`}>ROI</Text><Text style={tw`text-white font-bold`}>{item.roi}%</Text></View>
                        <View><Text style={tw`text-slate-500 text-[10px] font-bold uppercase`}>Duration</Text><Text style={tw`text-white font-bold`}>{item.duration} Mo</Text></View>
                    </View>
                </View>
                )}
            />
            <TouchableOpacity onPress={() => setModalVisible(true)} style={tw`absolute bottom-6 right-6 bg-emerald-500 w-16 h-16 rounded-full items-center justify-center shadow-lg border-4 border-slate-900 z-50`}><Ionicons name="add" size={32} color="white" /></TouchableOpacity>
          </View>
      )}

      <Modal visible={modalVisible} animationType="slide" transparent>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={tw`flex-1`}>
            <View style={tw`flex-1 bg-black/80 justify-end`}>
                <View style={tw`bg-slate-900 rounded-t-3xl h-[85%] w-full border-t border-slate-700`}>
                    <View style={tw`p-6 border-b border-slate-800 flex-row justify-between items-center`}>
                        <Text style={tw`text-white text-xl font-bold`}>{isEditing ? 'Edit Project' : 'New Farm Project'}</Text>
                        <TouchableOpacity onPress={closeModal}><Ionicons name="close-circle" size={28} color="#475569" /></TouchableOpacity>
                    </View>
                    <ScrollView contentContainerStyle={tw`p-6 gap-4`}>
                        {/* --- IMAGE PICKER UI --- */}
                        <TouchableOpacity onPress={pickImage} style={tw`h-40 bg-slate-800 rounded-xl border-2 border-dashed border-slate-700 items-center justify-center mb-2 overflow-hidden`}>
                            {imageUri ? (
                                <Image 
                                    source={{ uri: imageUri }} 
                                    style={{ width: '100%', height: '100%' }} // Enforce sizing
                                    resizeMode="cover" 
                                />
                            ) : (
                                <Ionicons name="camera-outline" size={32} color="#94a3b8" />
                            )}
                        </TouchableOpacity>

                        <Input label="Farm Name" placeholder="e.g. Cashew Export" value={name} onChange={setName} />
                        <View style={tw`flex-row gap-4`}><View style={tw`flex-1`}><Input label="ROI (%)" placeholder="25" kType="numeric" value={roi} onChange={setRoi} /></View><View style={tw`flex-1`}><Input label="Duration (Mo)" placeholder="6" kType="numeric" value={duration} onChange={setDuration} /></View></View>
                        <View style={tw`flex-row gap-4`}><View style={tw`flex-1`}><Input label="Price (₦)" placeholder="50000" kType="numeric" value={price} onChange={setPrice} /></View><View style={tw`flex-1`}><Input label="Total Slots" placeholder="100" kType="numeric" value={slots} onChange={setSlots} /></View></View>
                        <TouchableOpacity onPress={handleSaveFarm} disabled={loading} style={tw`bg-emerald-600 p-4 rounded-xl items-center mt-4 ${loading ? 'opacity-50' : ''}`}>{loading ? <ActivityIndicator color="white" /> : <Text style={tw`text-white font-bold text-lg`}>{isEditing ? 'Update Farm' : 'Launch Farm 🚀'}</Text>}</TouchableOpacity>
                    </ScrollView>
                </View>
            </View>
          </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function TabButton({ label, active, onPress }: any) { return (<TouchableOpacity onPress={onPress} style={tw`flex-1 py-2 items-center rounded-lg ${active ? 'bg-slate-700 shadow' : ''}`}><Text style={tw`text-xs font-bold ${active ? 'text-white' : 'text-slate-500'}`}>{label}</Text></TouchableOpacity>); }
function Input({ label, placeholder, value, onChange, kType = 'default' }: any) { return (<View style={tw`gap-1`}><Text style={tw`text-slate-400 text-xs font-bold uppercase`}>{label}</Text><TextInput style={tw`bg-slate-800 text-white p-4 rounded-xl border border-slate-700`} placeholder={placeholder} placeholderTextColor="#475569" value={value} onChangeText={onChange} keyboardType={kType} /></View>); }