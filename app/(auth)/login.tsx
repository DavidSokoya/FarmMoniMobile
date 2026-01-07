import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

// Firebase
import { signInWithEmailAndPassword } from 'firebase/auth';
// @ts-ignore
import { auth } from '../../services/firebaseConfig';

const logo = require('../../assets/farmmoni-logo.png');

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Missing Fields", "Please enter both email and password.");
      return;
    }

    setLoading(true);

    try {
      // JUST SIGN IN. Do not route here. The _layout.tsx will see the user change and route automatically.
      await signInWithEmailAndPassword(auth, email, password);
      console.log("Login Success");
      
    } catch (err: any) {
      const error = err;
      console.error("Login Error:", error);
      
      let message = "Something went wrong.";
      if (error.code === 'auth/invalid-credential') message = "Invalid email or password.";
      if (error.code === 'auth/user-not-found') message = "User not found.";
      if (error.code === 'auth/too-many-requests') message = "Too many failed attempts. Try again later.";
      
      Alert.alert("Login Failed", message);
      setLoading(false); // Only stop loading on error. On success, keep loading until the layout redirects.
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={tw`flex-1 bg-gray-900 justify-center items-center px-6`}
    >
      <StatusBar style="light" />

      {/* --- HEADER --- */}
      <View style={tw`items-center mb-10`}>
        <View style={tw`bg-white p-4 rounded-3xl mb-4 shadow-lg shadow-green-500/20`}>
          <Image source={logo} style={tw`w-20 h-20`} resizeMode="contain" />
        </View>
        <Text style={tw`text-white text-3xl font-bold tracking-tight`}>Welcome Back</Text>
        <Text style={tw`text-gray-400 text-sm mt-1`}>Sign in to continue</Text>
      </View>

      {/* --- FORM --- */}
      <View style={tw`w-full max-w-sm gap-4`}>
        <View style={tw`bg-gray-800 rounded-xl border border-gray-700 flex-row items-center px-4 py-3`}>
          <Ionicons name="mail-outline" size={20} color="#9CA3AF" />
          <TextInput 
            placeholder="Email Address" 
            placeholderTextColor="#6B7280"
            style={tw`flex-1 text-white ml-3 text-base`}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

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

        <TouchableOpacity style={tw`items-end`}>
          <Text style={tw`text-green-500 font-medium text-sm`}>Forgot Password?</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={handleLogin}
          disabled={loading}
          style={tw`bg-green-600 py-4 rounded-xl items-center shadow-lg shadow-green-900/50 mt-4 ${loading ? 'opacity-70' : ''}`}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={tw`text-white font-bold text-lg`}>Sign In</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/(auth)/register' as any)} style={tw`items-center mt-6`}>
          <Text style={tw`text-gray-400`}>
            Don't have an account? <Text style={tw`text-green-400 font-bold`}>Sign Up</Text>
          </Text>
        </TouchableOpacity>

      </View>
    </KeyboardAvoidingView>
  );
}