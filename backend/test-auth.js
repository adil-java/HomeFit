// Simple test script to verify Firebase authentication flow
import firebaseService from './services/firebase.service.js';

async function testFirebaseAuth() {
  console.log('Testing Firebase Authentication Service...');
  
  try {
    // This would normally be a real Firebase ID token from your frontend
    const testToken = 'test-token'; // You'll need to replace this with a real token
    
    console.log('Firebase service initialized successfully');
    console.log('Service instance:', firebaseService);
    
    // Test token verification (will fail with test token, but shows the flow)
    try {
      const user = await firebaseService.verifyToken(testToken);
      console.log('Token verified successfully:', user);
    } catch (error) {
      console.log('Expected error with test token:', error.message);
    }
    
  } catch (error) {
    console.error('Firebase service error:', error);
  }
}

testFirebaseAuth();
