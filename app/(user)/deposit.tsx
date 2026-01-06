import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import tw from 'twrnc';

// Firebase Imports
import { addDoc, collection, doc, increment, updateDoc } from 'firebase/firestore';
// @ts-ignore
import { auth, db } from '../../services/firebaseConfig';

export default function DepositScreen() {
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [showPaystack, setShowPaystack] = useState(false);
  
  const user = auth.currentUser;
  const paystackKey = process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY || '';

  // 1. MODERNIZED PAYMENT UI HTML
  const PaystackHTML = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          <title>Secure Payment</title>
          <style>
              body {
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                  background-color: #f8fafc; /* Slate-50 */
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  height: 100vh;
                  margin: 0;
                  padding: 20px;
                  color: #334155;
              }
              .card {
                  background: white;
                  padding: 40px 30px;
                  border-radius: 20px;
                  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
                  text-align: center;
                  width: 100%;
                  max-width: 320px;
              }
              .loader {
                  border: 3px solid #e2e8f0;
                  border-radius: 50%;
                  border-top: 3px solid #059669; /* FarmMoni Green */
                  width: 40px;
                  height: 40px;
                  -webkit-animation: spin 1s linear infinite; /* Safari */
                  animation: spin 1s linear infinite;
                  margin: 0 auto 20px auto;
              }
              h3 { margin: 0 0 10px 0; font-size: 18px; font-weight: 600; color: #0f172a; }
              p { margin: 0; font-size: 14px; color: #64748b; }
              
              @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
              @-webkit-keyframes spin { 0% { -webkit-transform: rotate(0deg); } 100% { -webkit-transform: rotate(360deg); } }
          </style>
      </head>
      <body>
          <div class="card">
              <div class="loader"></div>
              <h3>Securing Connection</h3>
              <p>Please wait while we load the payment gateway...</p>
          </div>

          <script src="https://js.paystack.co/v1/inline.js"></script>
          <script>
            function payWithPaystack() {
              var handler = PaystackPop.setup({
                key: '${paystackKey}',
                email: '${user?.email}',
                amount: ${parseFloat(amount) * 100},
                currency: 'NGN',
                channels: ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer'], // Enable all channels
                callback: function(response) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({status: 'success', reference: response.reference}));
                },
                onClose: function() {
                  window.ReactNativeWebView.postMessage(JSON.stringify({status: 'cancelled'}));
                }
              });
              handler.openIframe();
            }
            // Slight delay to allow the beautiful UI to be seen briefly and ensure DOM is ready
            setTimeout(payWithPaystack, 800); 
          </script>
      </body>
      </html>
  `;

  // 2. MESSAGE HANDLER
  const handleWebViewMessage = async (event: any) => {
    const data = JSON.parse(event.nativeEvent.data);
    
    // Close modal immediately on action
    setShowPaystack(false);

    if (data.status === 'success') {
      await handleSuccess(data.reference);
    } else {
      // Optional: Don't alert on cancel, just close quietly (better UX)
      // Alert.alert("Cancelled", "Transaction cancelled."); 
    }
  };

  const handleSuccess = async (reference: string) => {
    if (!user) return;
    try {
      const value = parseFloat(amount);
      const userRef = doc(db, "users", user.uid);
      
      await updateDoc(userRef, {
        walletBalance: increment(value)
      });

      await addDoc(collection(db, "transactions"), {
        userId: user.uid,
        type: 'deposit',
        amount: value,
        reference: reference,
        status: 'success',
        date: new Date().toISOString()
      });

      Alert.alert("Payment Successful", `₦${value.toLocaleString()} has been added to your wallet.`);
      router.back();

    } catch (error) {
      console.error(error);
      Alert.alert("System Error", "Payment received but wallet update failed. Please contact support with Ref: " + reference);
    }
  };

  const startPayment = () => {
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid amount.");
      return;
    }
    setShowPaystack(true);
  };


  if (!user) return <ActivityIndicator />;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={tw`flex-1 bg-slate-50`}>
      
      {/* HEADER */}
      <View style={tw`px-6 pt-14 pb-4 bg-white flex-row items-center border-b border-gray-100`}>
        <TouchableOpacity 
          onPress={() => router.back()} style={tw`mr-4`}>
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={tw`text-xl font-bold text-slate-900`}>Fund Wallet</Text>
      </View>

      <View style={tw`p-6`}>
        <Text style={tw`text-gray-500 mb-2`}>How much do you want to deposit?</Text>
        
        {/* INPUT */}
        <View style={tw`flex-row items-center bg-white border border-gray-200 rounded-2xl px-4 py-6 mb-6 shadow-sm`}>
          <Text style={tw`text-3xl font-bold text-slate-400 mr-2`}>₦</Text>
          <TextInput 
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder="0.00"
            style={tw`flex-1 text-3xl font-bold text-slate-900`}
            autoFocus
          />
        </View>

        {/* PRESETS */}
        <View style={tw`flex-row justify-between mb-8`}>
          {['5000', '10000', '50000'].map((val) => (
            <TouchableOpacity key={val} onPress={() => setAmount(val)} style={tw`bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-100`}>
              <Text style={tw`text-emerald-700 font-bold`}>₦{parseInt(val).toLocaleString()}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* BUTTON */}
        <TouchableOpacity 
          onPress={startPayment}
          style={tw`bg-emerald-900 py-5 rounded-2xl items-center shadow-lg shadow-emerald-900/20`}
        >
            <Text style={tw`text-white font-bold text-lg`}>Pay Now</Text>
        </TouchableOpacity>

      </View>

      {/* FULL SCREEN MODAL */}
      <Modal visible={showPaystack} animationType="slide" onRequestClose={() => setShowPaystack(false)}>
        <View style={tw`flex-1 bg-white pt-12`}>
           {/* Header */}
           <View style={tw`px-4 pb-2 flex-row justify-between items-center border-b border-gray-100 pb-4`}>
             <Text style={tw`font-bold text-lg text-slate-800 ml-2`}>Secure Checkout</Text>
             <TouchableOpacity onPress={() => setShowPaystack(false)} style={tw`bg-gray-100 p-2 rounded-full`}>
               <Ionicons name="close" size={20} color="black" />
             </TouchableOpacity>
           </View>

           <WebView
             originWhitelist={['*']}
             source={{ html: PaystackHTML }}
             onMessage={handleWebViewMessage}
             startInLoadingState={true}
             renderLoading={() => (
                 <View style={tw`absolute inset-0 items-center justify-center bg-white`}>
                     <ActivityIndicator size="large" color="#059669" />
                 </View>
             )}
           />
        </View>
      </Modal>

    </KeyboardAvoidingView>
  );
}