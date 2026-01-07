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
  
  // FIX: Cast this to string[] to stop TypeScript from complaining about length 0
  const segments = useSegments() as string[];

  useEffect(() => {
    const subscriber = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (initializing) setInitializing(false);
    });
    return subscriber;
  }, []);

  useEffect(() => {
    if (initializing) return;

    // Now this check works without error
    const inAuthGroup = segments[0] === '(auth)';
    const isSplashScreen = segments.length === 0; 
    const isPublic = inAuthGroup || isSplashScreen;

    const checkRoleAndRedirect = async () => {
      if (user) {
        // If logged in but in a public area (Splash/Login), send to Dashboard
        if (isPublic) {
            try {
                const userDoc = await getDoc(doc(db, "users", user.uid));
                
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    if (userData.role === 'admin') {
                        router.replace('/(admin)/dashboard' as any); 
                    } else {
                        router.replace('/(user)/' as any);
                    }
                }
            } catch (error) {
                console.error("Role check failed", error);
            }
        }
      } 
      // If NOT logged in, and NOT in a public area, send to Login
      else if (!user && !isPublic) {
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