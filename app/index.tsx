import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  StatusBar, StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import tw from 'twrnc';

const { width, height } = Dimensions.get('window');
const LOGO_IMAGE = require('../assets/farmmoni-logo.png'); // Ensure this path is correct

// --- ONBOARDING SLIDES DATA ---
const SLIDES = [
  {
    id: '1',
    title: 'Start Small, Grow Big',
    subtitle: 'Access high-yield agricultural investments verified by experts, starting with as little as ₦5,000.',
    icon: 'leaf',
    color: '#10b981', // Emerald
  },
  {
    id: '2',
    title: 'Transparent Growth',
    subtitle: 'Monitor your farm’s progress with real-time updates, photos, and live performance reports.',
    icon: 'stats-chart',
    color: '#0ea5e9', // Sky Blue
  },
  {
    id: '3',
    title: 'Secure Harvests',
    subtitle: 'Guaranteed returns sent directly to your bank account or wallet when the cycle ends.',
    icon: 'shield-checkmark',
    color: '#f59e0b', // Amber
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  
  // State
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current; 
  const slideRef = useRef<FlatList>(null);

  useEffect(() => {
    checkFirstLaunch();
  }, []);

  const checkFirstLaunch = async () => {
    try {
      
      // await AsyncStorage.clear(); 

      const value = await AsyncStorage.getItem('@viewed_onboarding');
      
      if (value !== null) {
        // User has seen onboarding -> Go to Login
        setTimeout(() => router.replace('/(auth)/login'), 2500);
      } 
      
      // Run animation. If value is null (First Time), it transitions to Onboarding.
      runSplashAnimation(value === null);

    } catch (e) {
      console.error("Storage Error:", e);
    }
  };

  const runSplashAnimation = (shouldShowOnboarding: boolean) => {
    // 1. Pulse The Logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();

    // 2. If it's the first time, fade out the dark screen to show Onboarding
    if (shouldShowOnboarding) {
        setTimeout(() => {
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 800,
                useNativeDriver: true,
            }).start(() => {
                setShowOnboarding(true);
            });
        }, 2500);
    }
  };

  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / width);
    setCurrentIndex(index);
  };

  const finishOnboarding = async () => {
    await AsyncStorage.setItem('@viewed_onboarding', 'true');
    router.replace('/(auth)/login');
  };

  const RenderItem = ({ item }: any) => {
    return (
      <View style={{ width, alignItems: 'center', padding: 20, paddingTop: 100 }}>
        {/* Onboarding Icon Card - Soft shadow is okay here on Light Mode */}
        <View style={[
            tw`w-64 h-64 rounded-full items-center justify-center mb-10 bg-slate-50`, 
            { shadowColor: item.color, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 }
        ]}>
           <Ionicons name={item.icon} size={100} color={item.color} />
        </View>

        <Text style={tw`text-slate-900 text-3xl font-bold text-center mb-4`}>{item.title}</Text>
        <Text style={tw`text-slate-500 text-base text-center px-4 leading-6`}>{item.subtitle}</Text>
      </View>
    );
  };

  return (
    <View style={tw`flex-1 bg-slate-50`}>
      <StatusBar barStyle={showOnboarding ? "dark-content" : "light-content"} />

      {/* --- LAYER 1: ONBOARDING (Underneath) --- */}
      {showOnboarding && (
        <View style={tw`flex-1`}>
          <TouchableOpacity 
            onPress={finishOnboarding}
            style={tw`absolute top-14 right-6 z-10`}
          >
            <Text style={tw`text-slate-400 font-bold`}>Skip</Text>
          </TouchableOpacity>

          <FlatList
            ref={slideRef}
            data={SLIDES}
            renderItem={RenderItem}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            keyExtractor={(item) => item.id}
          />

          {/* Footer Controls */}
          <View style={tw`absolute bottom-10 w-full px-6`}>
            {/* Dots */}
            <View style={tw`flex-row justify-center gap-2 mb-8`}>
              {SLIDES.map((_, i) => (
                <View 
                  key={i} 
                  style={[
                    tw`h-2 rounded-full`, 
                    { 
                      width: currentIndex === i ? 24 : 8, 
                      backgroundColor: currentIndex === i ? '#10b981' : '#cbd5e1' 
                    }
                  ]} 
                />
              ))}
            </View>

            {/* Button */}
            <TouchableOpacity
              onPress={() => {
                if (currentIndex < SLIDES.length - 1) {
                  slideRef.current?.scrollToIndex({ index: currentIndex + 1 });
                } else {
                  finishOnboarding();
                }
              }}
              style={tw`bg-slate-900 py-4 rounded-2xl items-center shadow-xl shadow-slate-900/20`}
            >
              <Text style={tw`text-white font-bold text-lg`}>
                {currentIndex === SLIDES.length - 1 ? "Create Account" : "Next"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* --- LAYER 2: SPLASH OVERLAY (On Top) --- */}
      <Animated.View 
        style={[
          StyleSheet.absoluteFill, 
          tw`bg-slate-950 items-center justify-center z-50`, // Pure Dark Background
          { opacity: fadeAnim },
          { transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [height, 0] }) }] } 
        ]}
        pointerEvents={showOnboarding ? 'none' : 'auto'} 
      >
        {/* LOGO CONTAINER: No shadows, no elevation, just scale animation */}
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
           <Image 
             source={LOGO_IMAGE} 
             style={{ width: 120, height: 120, resizeMode: 'contain' }} 
           />
        </Animated.View>
        
        <Text style={tw`text-white text-2xl font-bold mt-4 tracking-widest`}>FarmMoni</Text>
        <Text style={tw`text-emerald-500 text-xs uppercase tracking-[4px] mt-2`}>Grow Wealth</Text>
      </Animated.View>
    </View>
  );
}