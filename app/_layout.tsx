import { Slot, useRouter, useSegments } from 'expo-router';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import tw from 'twrnc';
// @ts-ignore
import { auth, db } from '../services/firebaseConfig';

export default function RootLayout() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const subscriber = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (initializing) setInitializing(false);
    });
    return subscriber;
  }, []);

  useEffect(() => {
    if (initializing) return;

    const inAuthGroup = segments[0] === '(auth)';

    const checkRoleAndRedirect = async () => {
      if (user && inAuthGroup) {
        // --- FIX 1: USER IS LOGGED IN, BUT ON LOGIN PAGE ---
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // --- FIX 2: CORRECT ROUTE PATHS ---
            // Use '/' instead of '/dashboard' or '/home'
            if (userData.role === 'admin') {
              router.replace('/(admin)/' as any); 
            } else {
              router.replace('/(user)/' as any);
            }
          }
        } catch (error) {
          console.error("Role check failed", error);
        }

      } else if (!user && !inAuthGroup) {
        // --- FIX 3: USER NOT LOGGED IN, TRYING TO ACCESS APP ---
        router.replace('/(auth)/login' as any);
      }
    };

    checkRoleAndRedirect();

  }, [user, initializing, segments]);

  if (initializing) {
    return (
      <View style={tw`flex-1 bg-slate-950 justify-center items-center`}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return <Slot />;
}