// App.js
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Auth Screens
import 'react-native-url-polyfill/auto';

import LoginUI from './src/screens/home/loginUI';
import OtpUI from './src/screens/home/OtpUI';

// Profile Completion Screen
import EditProfileScreen from './src/screens/profile/EditProfileScreen';
import EditFieldScreen from './src/screens/profile/EditFieldScreen';

// Main App
import BottomNavigation from './src/screens/main/BottomNavigation';
import MessagesScreen from './src/screens/main/MessagesScreen';
import ChatScreen from './src/screens/main/ChatScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="LoginUI"
        screenOptions={{ 
          headerShown: false,
          animation: 'slide_from_right'
        }}
      >
        {/* Auth Screens */}
        <Stack.Screen name="LoginUI" component={LoginUI} />
        <Stack.Screen name="OtpUI" component={OtpUI} />
        <Stack.Screen name="MessageScreen" component={MessagesScreen} />
        <Stack.Screen name="ChatScreen" component={ChatScreen} />

        {/* Profile Completion Screen (Replaces SignUpUI) */}
        <Stack.Screen 
          name="EditProfile" 
          component={EditProfileScreen}
          options={{
            animation: 'slide_from_right'
          }}
        />
        <Stack.Screen 
          name="EditField" 
          component={EditFieldScreen}
          options={{
            animation: 'slide_from_right'
          }}
        />

        {/* Main App Screen with Bottom Navigation */}
        <Stack.Screen 
          name="MainApp" 
          component={BottomNavigation} 
          options={{
            gestureEnabled: false, // Prevent going back to auth screens
            animation: 'slide_from_right'
          }}
        />
      </Stack.Navigator>
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});