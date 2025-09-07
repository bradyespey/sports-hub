// src/hooks/useAuth.ts
import { useState, useEffect } from 'react';
import { User as FirebaseUser, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '@/lib/firebase';
import { User } from '@/types';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);

  const allowedEmails = import.meta.env.VITE_ALLOWED_EMAILS?.split(',').map((email: string) => email.trim()) || [];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      setLoading(true);
      
      if (firebaseUser) {
        const allowed = allowedEmails.includes(firebaseUser.email || '');
        setIsAllowed(allowed);
        
        if (allowed) {
          // Create or update user document
          const userDoc = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || '',
            role: 'user' as const,
            createdAt: new Date(),
            lastLogin: new Date()
          };

          const userRef = doc(db, 'users', firebaseUser.uid);
          const existingUser = await getDoc(userRef);
          
          if (existingUser.exists()) {
            // Update last login
            await setDoc(userRef, { lastLogin: new Date() }, { merge: true });
            setUser({ ...existingUser.data() as User, lastLogin: new Date() });
          } else {
            // Create new user
            await setDoc(userRef, userDoc);
            setUser(userDoc);
          }
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
        setIsAllowed(false);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  };

  const signOutUser = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  return {
    user,
    loading,
    isAllowed,
    signInWithGoogle,
    signOut: signOutUser
  };
};