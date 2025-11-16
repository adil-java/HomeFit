import { StyleSheet, Text, TouchableOpacity, View, Image, Alert, ActivityIndicator } from 'react-native';
import React, { useState, useEffect } from 'react';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../../firebaseConfig';
import { useAuth } from '../../contexts/AuthContext';
import { router } from 'expo-router';

const GoogleAuth = () => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    // Configure Google Sign-In
    GoogleSignin.configure({
      webClientId: '1066517448696-tgpl2cf5snd5auej7brq4hjb6sg1ugv9.apps.googleusercontent.com',
      iosClientId: '1066517448696-rffitabve6rg0j8bhje6quh1j8mqie9o.apps.googleusercontent.com',
      offlineAccess: true,
      forceCodeForRefreshToken: true,
    });
  }, []);

  const handleGoogleLogin = async () => {
    if (loading) return;
    
    try {
      setLoading(true);

      // Check if device supports Google Play Services (Android)
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Sign out first to ensure account picker shows
      await GoogleSignin.signOut();

      // Trigger Google Sign-In with account picker
      const userInfo = await GoogleSignin.signIn();
      console.log('Google Sign-In Success:', userInfo);

      // Get ID token for Firebase authentication
      const idToken = userInfo.data?.idToken || (userInfo as any).idToken;

      if (!idToken) {
        throw new Error('No ID token received from Google');
      }

      // Create Firebase credential
      const credential = GoogleAuthProvider.credential(idToken);

      // Sign in to Firebase
      const firebaseUserCredential = await signInWithCredential(auth, credential);
      console.log('Firebase Sign-In Success:', firebaseUserCredential.user.email);

      Alert.alert(
        'Success',
        `Signed in as ${firebaseUserCredential.user.email}`,
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(tabs)'),
          },
        ]
      );
    } catch (error: any) {
      console.error('Google Sign-In Error:', error);

      let errorMessage = 'Failed to sign in with Google';

      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        errorMessage = 'Sign in cancelled';
      } else if (error.code === statusCodes.IN_PROGRESS) {
        errorMessage = 'Sign in already in progress';
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        errorMessage = 'Google Play Services not available';
      } else {
        errorMessage = error.message || 'An error occurred during sign in';
      }

      Alert.alert('Sign In Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={[styles.googleButton, loading && styles.googleButtonDisabled]} 
        onPress={handleGoogleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#000" />
        ) : (
          <>
            <Image
              source={{
                uri: 'https://developers.google.com/identity/images/g-logo.png',
              }}
              style={styles.googleLogo}
            />
            <Text style={styles.googleText}>Sign in with Google</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

export default GoogleAuth;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    elevation: 3,
    minWidth: 200,
    justifyContent: 'center',
  },
  googleButtonDisabled: {
    opacity: 0.6,
  },
  googleLogo: {
    width: 20,
    height: 20,
    marginRight: 10,
  },
  googleText: {
    fontSize: 16,
    color: '#000',
    fontFamily: 'Roboto',
  },
});
