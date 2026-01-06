import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import tw from 'twrnc';

export default function AdminLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: tw`bg-slate-900 border-t border-slate-800 h-24 pt-2`,
        tabBarActiveTintColor: '#10b981', // Emerald 500
        tabBarInactiveTintColor: '#64748b', // Slate 500
        tabBarLabelStyle: tw`font-bold text-[10px] mb-2`,
      }}
    >
      <Tabs.Screen
        name="dashboard" 
        options={{
          title: 'Overview',
          tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="inventory" 
        options={{
          title: 'Inventory',
          tabBarIcon: ({ color, size }) => <Ionicons name="leaf" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="users" 
        options={{
          title: 'Users',
          tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="transactions" 
        options={{
          title: 'Transactions',
          tabBarIcon: ({ color, size }) => <Ionicons name="receipt" size={size} color={color} />,
        }}
      />

    </Tabs>
  );
}