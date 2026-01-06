import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

// Firebase Imports
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
// @ts-ignore
import { auth, db } from '../../services/firebaseConfig';

const logo = require('../../assets/farmmoni-logo.png');

export default function RegisterScreen() {
  const router = useRouter();
  
  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // UI State
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    // 1. Basic Empty Check
    if (!fullName || !email || !password || !confirmPassword) {
      Alert.alert("Missing Fields", "Please fill in all fields.");
      return;
    }

    // 2. Password Match Check
    if (password !== confirmPassword) {
      Alert.alert("Password Error", "Passwords do not match.");
      return;
    }

    // 3. Password Length Check (Optional but recommended)
    if (password.length < 6) {
      Alert.alert("Weak Password", "Password should be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      // 4. Create Auth User
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 5. Save User Profile to Firestore
      await setDoc(doc(db, "users", user.uid), {
        fullName: fullName,
        email: email,
        role: 'user',        // Default role
        walletBalance: 0,    // Start with 0
        createdAt: new Date().toISOString()
      });
      
      console.log("Registered successfully:", user.email);
      Alert.alert("Success", "Account created successfully!");
      
      // 6. Navigate to User Home
      router.replace('/(user)/index' as any);

    } catch (err: any) {
      console.error(err);
      let message = err.message;
      if (err.code === 'auth/email-already-in-use') message = "This email is already registered.";
      Alert.alert("Registration Failed", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={tw`flex-1 bg-gray-900`}
    >
      <StatusBar style="light" />
      
      <ScrollView contentContainerStyle={tw`flex-grow justify-center items-center px-6 py-10`}>

        {/* HEADER */}
        <View style={tw`items-center mb-8`}>
          <View style={tw`bg-white p-4 rounded-3xl mb-4 shadow-lg shadow-green-500/20`}>
            <Image source={logo} style={tw`w-16 h-16`} resizeMode="contain" />
          </View>
          <Text style={tw`text-white text-2xl font-bold`}>Create Account</Text>
          <Text style={tw`text-gray-400 text-sm mt-1`}>Join FarmMoni Today</Text>
        </View>

        {/* FORM */}
        <View style={tw`w-full max-w-sm gap-4`}>
          
          {/* Full Name */}
          <View style={tw`bg-gray-800 rounded-xl border border-gray-700 flex-row items-center px-4 py-3`}>
            <Ionicons name="person-outline" size={20} color="#9CA3AF" />
            <TextInput 
              placeholder="Full Name" 
              placeholderTextColor="#6B7280"
              style={tw`flex-1 text-white ml-3 text-base`}
              value={fullName}
              onChangeText={setFullName}
            />
          </View>

          {/* Email */}
          <View style={tw`bg-gray-800 rounded-xl border border-gray-700 flex-row items-center px-4 py-3`}>
            <Ionicons name="mail-outline" size={20} color="#9CA3AF" />
            <TextInput 
              placeholder="Email Address" 
              placeholderTextColor="#6B7280"
              style={tw`flex-1 text-white ml-3 text-base`}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Password */}
          <View style={tw`bg-gray-800 rounded-xl border border-gray-700 flex-row items-center px-4 py-3`}>
            <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" />
            <TextInput 
              placeholder="Password" 
              placeholderTextColor="#6B7280"
              style={tw`flex-1 text-white ml-3 text-base`}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* Confirm Password */}
          <View style={tw`bg-gray-800 rounded-xl border border-gray-700 flex-row items-center px-4 py-3`}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#9CA3AF" />
            <TextInput 
              placeholder="Confirm Password" 
              placeholderTextColor="#6B7280"
              style={tw`flex-1 text-white ml-3 text-base`}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
            />
            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
              <Ionicons name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* Register Button */}
          <TouchableOpacity 
            onPress={handleRegister}
            disabled={loading}
            style={tw`bg-green-600 py-4 rounded-xl items-center shadow-lg shadow-green-900/50 mt-4 ${loading ? 'opacity-70' : ''}`}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={tw`text-white font-bold text-lg`}>Register</Text>
            )}
          </TouchableOpacity>

          {/* Back to Login Link */}
          <TouchableOpacity onPress={() => router.back()} style={tw`items-center mt-4 mb-10`}>
            <Text style={tw`text-gray-400`}>
              Already have an account? <Text style={tw`text-green-400 font-bold`}>Sign In</Text>
            </Text>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}