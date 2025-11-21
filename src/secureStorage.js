// src/utils/secureStorage.js
import * as SecureStore from 'expo-secure-store';

const STORAGE_KEYS = {
  PHONE_NUMBER: 'user_phone_number',
  IS_LOGGED_IN: 'user_is_logged_in',
  USER_ID: 'user_id' // Optional: store user ID if needed
};

export const StorageService = {
  // Store user data after successful OTP verification
  storeUserData: async (phone, userId = null) => {
    try {
      await SecureStore.setItemAsync(STORAGE_KEYS.PHONE_NUMBER, phone);
      await SecureStore.setItemAsync(STORAGE_KEYS.IS_LOGGED_IN, 'true');
      if (userId) {
        await SecureStore.setItemAsync(STORAGE_KEYS.USER_ID, userId.toString());
      }
      return true;
    } catch (error) {
      console.error('Error storing user data:', error);
      return false;
    }
  },

  // Retrieve phone number
  getPhoneNumber: async () => {
    try {
      return await SecureStore.getItemAsync(STORAGE_KEYS.PHONE_NUMBER);
    } catch (error) {
      console.error('Error retrieving phone number:', error);
      return null;
    }
  },

  // Retrieve user ID
  getUserId: async () => {
    try {
      return await SecureStore.getItemAsync(STORAGE_KEYS.USER_ID);
    } catch (error) {
      console.error('Error retrieving user ID:', error);
      return null;
    }
  },

  // Check if user is logged in
  isLoggedIn: async () => {
    try {
      const isLoggedIn = await SecureStore.getItemAsync(STORAGE_KEYS.IS_LOGGED_IN);
      return isLoggedIn === 'true';
    } catch (error) {
      console.error('Error checking login status:', error);
      return false;
    }
  },

  // Clear stored data (logout)
  clearStorage: async () => {
    try {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.PHONE_NUMBER);
      await SecureStore.deleteItemAsync(STORAGE_KEYS.IS_LOGGED_IN);
      await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_ID);
      return true;
    } catch (error) {
      console.error('Error clearing storage:', error);
      return false;
    }
  }
};