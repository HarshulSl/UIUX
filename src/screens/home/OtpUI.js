// src/screens/home/OtpUI.js
import React, { useState, useRef, useEffect } from 'react';
import { verifyOtp } from './logic';
import { supabase } from '../../supabase';
import * as SecureStore from 'expo-secure-store';

import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  Animated,
  SafeAreaView,
  TextInput
} from 'react-native';
import { Colors } from '../../constants/colors';
import { resendOtp } from './logic';

// Secure Store keys
const STORAGE_KEYS = {
  PHONE_NUMBER: 'user_phone_number',
  IS_LOGGED_IN: 'user_is_logged_in'
};

const OtpUI = ({ navigation, route }) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [resendEnabled, setResendEnabled] = useState(false);
  const inputRefs = useRef([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const phoneNumber = route.params?.phoneNumber || '+91XXXXXXXXXX';

  // Check if all OTP digits are entered
  const isOtpComplete = otp.every(digit => digit !== '');

  useEffect(() => {
    // Start countdown timer
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setResendEnabled(true);
    }
  }, [countdown]);

  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  // Function to store phone number securely
  const storePhoneNumber = async (phone) => {
    try {
      await SecureStore.setItemAsync(STORAGE_KEYS.PHONE_NUMBER, phone);
      await SecureStore.setItemAsync(STORAGE_KEYS.IS_LOGGED_IN, 'true');
      console.log('Phone number stored successfully');
    } catch (error) {
      console.error('Error storing phone number:', error);
    }
  };

  const focusNext = (index, value) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1].focus();
    }

    // Check if all digits are filled for auto-submit
    if (newOtp.every(digit => digit !== '') && index === 5) {
      // Use setTimeout to ensure state is updated before verification
      setTimeout(() => {
        handleVerify();
      }, 100);
    }
  };
  const checkUserProfile = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('name, username, college')
    .eq('id', userId)
    .single(); // get a single row

  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }

  return data;
};

  const focusPrevious = (index, key) => {
    if (key === 'Backspace' && index > 0 && otp[index] === '') {
      inputRefs.current[index - 1].focus();
    }
  };

  const handleVerify = async () => {
    const enteredOtp = otp.join('');
    if (enteredOtp.length !== 6) return;

    setIsLoading(true);

    try {
      // ✅ Check if user exists in profiles table
      const { data, error } = await supabase
        .from('profiles')
        .select('phone')
        .eq('phone', phoneNumber)
        .single();

      if (error && error.code !== 'PGRST116') {
        // Some other error (not "row not found")
        throw error;
      }

      // Store phone number locally regardless of new/existing user
      await storePhoneNumber(phoneNumber);

      if (!data) {
        // 🚀 New user → go to EditProfile
        navigation.replace('EditProfile', { phoneNumber });
      } else {
        // ✅ Existing user → go to MainApp
        navigation.replace('MainApp');
      }
    } catch (err) {
      console.error('Error verifying user:', err.message);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setCountdown(30);
    setResendEnabled(false);
    setOtp(['', '', '', '', '', '']);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
            <View style={styles.header}>
              <Text style={styles.title}>Verification Code</Text>
              <Text style={styles.subtitle}>
                Enter the 6-digit code sent to{'\n'}
                <Text style={styles.phoneNumber}>{phoneNumber}</Text>
              </Text>
            </View>

            <View style={styles.otpContainer}>
              {otp.map((digit, index) => (
                <View
                  key={index}
                  style={[
                    styles.otpInputWrapper,
                    digit !== '' && styles.otpInputFilled,
                  ]}
                >
                  <TextInput
                    ref={(ref) => (inputRefs.current[index] = ref)}
                    style={styles.otpInput}
                    value={digit}
                    onChangeText={(value) => {
                      // Only allow numeric values
                      if (/^\d*$/.test(value)) {
                        focusNext(index, value);
                      }
                    }}
                    onKeyPress={({ nativeEvent: { key } }) => focusPrevious(index, key)}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                  />
                </View>
              ))}
            </View>

            <TouchableOpacity 
              style={[
                styles.verifyButton, 
                !isOtpComplete ? styles.verifyButtonDisabled : null,
                isLoading && styles.verifyButtonLoading
              ]} 
              onPress={handleVerify}
              disabled={isLoading || !isOtpComplete}
            >
              {isLoading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.verifyButtonText}>Verify OTP</Text>
              )}
            </TouchableOpacity>

            <View style={styles.resendContainer}>
              <Text style={styles.resendText}>Didn't receive the code? </Text>
              {resendEnabled ? (
                <TouchableOpacity onPress={handleResendOtp}>
                  <Text style={styles.resendLink}>Resend OTP</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.countdownText}>Resend in {countdown}s</Text>
              )}
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                By verifying, you agree to our Terms of Service and Privacy Policy
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// Create a separate utility file for storage functions (recommended)
// src/utils/secureStorage.js
export const StorageService = {
  // Store phone number
  storePhoneNumber: async (phone) => {
    try {
      await SecureStore.setItemAsync(STORAGE_KEYS.PHONE_NUMBER, phone);
      await SecureStore.setItemAsync(STORAGE_KEYS.IS_LOGGED_IN, 'true');
      return true;
    } catch (error) {
      console.error('Error storing phone number:', error);
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
      return true;
    } catch (error) {
      console.error('Error clearing storage:', error);
      return false;
    }
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primaryDark,
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.darkGray,
    textAlign: 'center',
    lineHeight: 24,
  },
  phoneNumber: {
    fontWeight: '600',
    color: Colors.primary,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
    width: '100%',
  },
  otpInputWrapper: {
    width: 50,
    height: 60,
    borderRadius: 12,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.lightGray,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  otpInputFilled: {
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOpacity: 0.2,
    elevation: 3,
    transform: [{ scale: 1.05 }],
  },
  otpInput: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
    width: '100%',
  },
  verifyButton: {
    backgroundColor: Colors.primary,
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
    width: '100%',
    marginBottom: 24,
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  verifyButtonDisabled: {
    backgroundColor: Colors.lightGray,
    shadowColor: Colors.gray,
  },
  verifyButtonLoading: {
    opacity: 0.7,
  },
  verifyButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  resendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  resendText: {
    color: Colors.darkGray,
    fontSize: 14,
  },
  resendLink: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  countdownText: {
    color: Colors.gray,
    fontWeight: '500',
    fontSize: 14,
  },
  footer: {
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 12,
    color: Colors.darkGray,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default OtpUI;