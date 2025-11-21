// src/screens/main/BottomNavigation.js
import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  Animated,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import MainUI from './MainUI';
import CreateGig from './CreateGig';
import ProfileUI from './ProfileUI';
import { useNavigation, useRoute } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const BottomNavigation = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const [activeTab, setActiveTab] = useState('home');
  const animation = useRef(new Animated.Value(0)).current;

  // Handle activeTab parameter from navigation
  useEffect(() => {
    if (route.params?.activeTab) {
      const tab = route.params.activeTab;
      if (['home', 'create', 'profile'].includes(tab)) {
        setActiveTab(tab);
      }
    }
  }, [route.params?.activeTab]);

  // Clear navigation params after using them to prevent issues on back navigation
  useEffect(() => {
    if (route.params?.activeTab) {
      // Clear the params after using them
      navigation.setParams({ activeTab: undefined });
    }
  }, [navigation, route.params?.activeTab]);

  const renderScreen = () => {
    switch (activeTab) {
      case 'home':
        return <MainUI />;
      case 'create':
        return <CreateGig />;
      case 'profile':
        return <ProfileUI />;
      default:
        return <MainUI />;
    }
  };

  const handleTabPress = (tabName) => {
    if (tabName === activeTab) return;

    const direction =
      (tabName === 'profile' && activeTab === 'home') ||
      (tabName === 'create' && activeTab === 'home') ||
      (tabName === 'profile' && activeTab === 'create')
        ? -1
        : 1;

    animation.setValue(direction * width);
    setActiveTab(tabName);

    Animated.timing(animation, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={styles.container}>
      {/* Screens with slide animation */}
      <Animated.View
        style={{
          flex: 1,
          transform: [{ translateX: animation }],
        }}
      >
        {renderScreen()}
      </Animated.View>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        {/* Home Tab */}
        <TouchableOpacity
          style={[styles.navItem, activeTab === 'home' && styles.activeNavItem]}
          onPress={() => handleTabPress('home')}
        >
          <Ionicons
            name={activeTab === 'home' ? 'home' : 'home-outline'}
            size={24}
            color={activeTab === 'home' ? Colors.primary : Colors.gray}
          />
          <Text style={[styles.navText, activeTab === 'home' && styles.activeNavText]}>
            Home
          </Text>
        </TouchableOpacity>

        {/* Create Tab */}
        <TouchableOpacity
          style={[styles.navItem, activeTab === 'create' && styles.activeNavItem]}
          onPress={() => handleTabPress('create')}
        >
          <View style={styles.createButton}>
            <Ionicons name="add" size={28} color={Colors.white} />
          </View>
          <Text style={[styles.navText, activeTab === 'create' && styles.activeNavText]}>
            Create
          </Text>
        </TouchableOpacity>

        {/* Profile Tab */}
        <TouchableOpacity
          style={[styles.navItem, activeTab === 'profile' && styles.activeNavItem]}
          onPress={() => handleTabPress('profile')}
        >
          <Ionicons
            name={activeTab === 'profile' ? 'person' : 'person-outline'}
            size={24}
            color={activeTab === 'profile' ? Colors.primary : Colors.gray}
          />
          <Text style={[styles.navText, activeTab === 'profile' && styles.activeNavText]}>
            Profile
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  bottomNav: {
    flexDirection: 'row',
    height: 70,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
    backgroundColor: Colors.white,
    paddingBottom: 8,
    alignItems: 'flex-start',
  },
  navItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 8,
  },
  createButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -20,
    elevation: 4,
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  activeNavItem: {
    color: Colors.primary,
  },
  navText: {
    fontSize: 12,
    marginTop: 4,
    color: Colors.gray,
  },
  activeNavText: {
    color: Colors.primary,
    fontWeight: '600',
  },
});

export default BottomNavigation;