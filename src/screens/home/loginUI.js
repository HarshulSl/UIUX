// src/screens/LoginUI.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Animated,
  Easing,
  Dimensions,
  Alert
} from 'react-native';
import { Colors } from '../../constants/colors';
import { signInWithEmail, validateEmail, validatePassword } from './logic';

import { supabase } from '../../supabase';

const { width, height } = Dimensions.get('window');

const LoginUI = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];
  const buttonScale = useState(new Animated.Value(1))[0];
  const emailShake = useState(new Animated.Value(0))[0];
  const passwordShake = useState(new Animated.Value(0))[0];

  React.useEffect(() => {
    // Start entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const shakeInput = (inputType) => {
    const shakeAnim = inputType === 'email' ? emailShake : passwordShake;
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      })
    ]).start();
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


  const handleLogin = async () => {
  let isValid = true;

  if (!validateEmail(email)) {
    shakeInput('email');
    isValid = false;
  }

  if (!validatePassword(password)) {
    shakeInput('password');
    isValid = false;
  }

  if (!isValid) return;

  if (!isLoading) {
    setIsLoading(true);
    
    // Button press animation
    await Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      })
    ]).start();

    try {
      const result = await signInWithEmail(email, password);
      
      

      // Check user's profile fields
      const profile = await checkUserProfile(result.user.id);

      if (!profile) {
        Alert.alert('Error', 'Unable to fetch user profile.');
        return;
      }

      const { name, username, college } = profile;

      // Navigate conditionally
      if (!name || !username || !college) {
        navigation.replace('EditProfile');
      } else {
        navigation.replace('MainApp');
      }
      
    } catch (error) {
      console.error('Login failed:', error);
      Alert.alert('Login Failed', error.message);
      shakeInput('email');
      shakeInput('password');
    } finally {
      setIsLoading(false);
    }
  }
};


  const handleEmailChange = (text) => {
    setEmail(text);
  };

  const handlePasswordChange = (text) => {
    setPassword(text);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Test credentials quick fill (for development only)
  const fillTestCredentials = () => {
    setEmail('test@needify.com');
    setPassword('123456');
  };

  const animatedButtonStyle = {
    transform: [{ scale: buttonScale }],
    opacity: email.length > 0 && password.length >= 6 ? 1 : 0.7
  };

  const animatedEmailStyle = {
    transform: [{ translateX: emailShake }]
  };

  const animatedPasswordStyle = {
    transform: [{ translateX: passwordShake }]
  };

  // Loading spinner rotation
  const spinValue = useState(new Animated.Value(0))[0];
  
  React.useEffect(() => {
    if (isLoading) {
      Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    } else {
      spinValue.setValue(0);
    }
  }, [isLoading]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo and Brand Section */}
          <Animated.View 
            style={[
              styles.logoSection,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <Image 
              source={require('../../assets/logotransparent.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.appName}>Needify</Text>
            <Text style={styles.tagline}>You Need It, We Nail It</Text>
          </Animated.View>

          {/* Main Content */}
          <Animated.View 
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <Text style={styles.welcomeTitle}>Welcome Back!</Text>
            <Text style={styles.welcomeSubtitle}>
              Sign in to your account to continue
            </Text>

            {/* Email Input Section */}
            <Animated.View style={[styles.inputContainer, animatedEmailStyle]}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter your email"
                placeholderTextColor={Colors.gray}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                value={email}
                onChangeText={handleEmailChange}
                editable={!isLoading}
              />
              {email.length > 0 && !validateEmail(email) && (
                <Text style={styles.errorText}>
                  Please enter a valid email address
                </Text>
              )}
            </Animated.View>

            {/* Password Input Section */}
            <Animated.View style={[styles.inputContainer, animatedPasswordStyle]}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Enter your password"
                  placeholderTextColor={Colors.gray}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="password"
                  value={password}
                  onChangeText={handlePasswordChange}
                  editable={!isLoading}
                />
                <TouchableOpacity 
                  style={styles.eyeIcon}
                  onPress={togglePasswordVisibility}
                  disabled={isLoading}
                >
                  <Text style={styles.eyeIconText}>
                    {showPassword ? '🙈' : '👁️'}
                  </Text>
                </TouchableOpacity>
              </View>
              {password.length > 0 && password.length < 6 && (
                <Text style={styles.errorText}>
                  Password must be at least 6 characters
                </Text>
              )}
            </Animated.View>

            {/* Quick Test Button (Development only) */}
            

            {/* Login Button */}
            <Animated.View style={animatedButtonStyle}>
              <TouchableOpacity 
                style={[
                  styles.loginButton,
                  isLoading && styles.buttonLoading,
                  (email.length === 0 || password.length < 6) && styles.buttonDisabled
                ]}
                onPress={handleLogin}
                disabled={email.length === 0 || password.length < 6 || isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <View style={styles.loadingContainer}>
                    <Animated.View 
                      style={[
                        styles.loadingSpinner, 
                        { transform: [{ rotate: spin }] }
                      ]} 
                    />
                    <Text style={styles.loginButtonText}>Signing In...</Text>
                  </View>
                ) : (
                  <Text style={styles.loginButtonText}>
                    Sign In to Needify
                  </Text>
                )}
              </TouchableOpacity>
            </Animated.View>

            {/* Terms and Conditions */}
            <Text style={styles.termsText}>
              By continuing, you agree to our{' '}
              <Text style={styles.linkText}>Terms of Service</Text>{' '}
              and <Text style={styles.linkText}>Privacy Policy</Text>
            </Text>
          </Animated.View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              For testing purposes only
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  logoSection: {
    alignItems: 'center',
    paddingHorizontal: 40,
    marginBottom: 40,
    marginTop: 20,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  appName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: Colors.primaryDark,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: Colors.darkGray,
    textAlign: 'center',
    lineHeight: 22,
  },
  content: {
    paddingHorizontal: 30,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: Colors.darkGray,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  textInput: {
    width: '100%',
    height: 56,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.lightGray,
    paddingHorizontal: 16,
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: 56,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.lightGray,
    overflow: 'hidden',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
  eyeIcon: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  eyeIconText: {
    fontSize: 20,
    color: Colors.gray,
  },
  errorText: {
    fontSize: 12,
    color: Colors.error,
    marginTop: 8,
    marginLeft: 4,
  },
  testButton: {
    alignSelf: 'center',
    padding: 10,
    marginBottom: 30,
  },
  testButtonText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  loginButton: {
    width: '100%',
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    shadowColor: Colors.primaryDark,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: Colors.lightGray,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonLoading: {
    opacity: 0.9,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingSpinner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.white,
    borderTopColor: 'transparent',
    marginRight: 10,
  },
  loginButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.white,
  },
  termsText: {
    fontSize: 12,
    color: Colors.gray,
    textAlign: 'center',
    lineHeight: 16,
  },
  linkText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 30,
    paddingTop: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: Colors.gray,
    fontStyle: 'italic',
  },
});

export default LoginUI;