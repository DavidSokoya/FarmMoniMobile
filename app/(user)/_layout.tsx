import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import tw from 'twrnc';

export default function UserLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: tw`bg-white h-24 pt-2 border-t border-gray-100 shadow-lg`,
        tabBarActiveTintColor: '#059669', // Emerald 600
        tabBarInactiveTintColor: '#94a3b8', // Slate 400
        tabBarLabelStyle: tw`text-xs font-bold mb-2`,
      }}
    >
      {/* 1. HOME (Points to app/(user)/index.tsx) */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      
      {/* 2. INVEST (Points to app/(user)/invest.tsx) */}
      <Tabs.Screen
        name="invest"
        options={{
          title: 'Invest',
          tabBarIcon: ({ color, size }) => <Ionicons name="leaf" size={size} color={color} />,
        }}
      />
      
      {/* 3. HISTORY (Points to app/(user)/history.tsx) */}
      {/* Make sure you create this file or map it to Transactions */}
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, size }) => <Ionicons name="time" size={size} color={color} />,
        }}
      />

      {/* --- HIDDEN ROUTES --- */}
      
      {/* Withdraw Screen */}
      <Tabs.Screen
        name="withdraw"
        options={{
          href: null, 
          tabBarStyle: { display: 'none' },
        }}
      />
     <Tabs.Screen
        name="deposit"
        options={{
          href: null, 
          tabBarStyle: { display: 'none' },
        }}
      />
      {/* Market/Farm Details Screen (If you use dynamic routing) */}
      <Tabs.Screen
        name="farm-details/[id]" 
        options={{
          href: null, 
          tabBarStyle: { display: 'none' },
        }}
      />
      
    </Tabs>
  );
}