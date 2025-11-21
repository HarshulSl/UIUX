// src/screens/main/ProfileUI.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Image,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Animated,
  Alert,
  Linking
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../../constants/colors';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../supabase';
import { StorageService } from '../../secureStorage';
import { useNavigation } from '@react-navigation/native';
import * as ImageManipulator from 'expo-image-manipulator';

const ProfileUI = () => {
  const navigation = useNavigation();
  const [profileData, setProfileData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [uploading, setUploading] = useState(false);
  const slideAnim = useState(new Animated.Value(300))[0];

  const fetchProfileData = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      if (!session) {
        Alert.alert('Error', 'Please login again');
        navigation.replace('Login');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profileError) {
        if (profileError.code === 'PGRST116') {
          Alert.alert('Profile Not Found', 'Please complete your profile');
          navigation.navigate('EditProfile', { 
            userId: session.user.id,
            isNewProfile: true 
          });
          return;
        }
        throw profileError;
      }

      setProfileData(profile);
    } catch (error) {
      console.error('Error fetching profile data:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [navigation]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfileData();
  };

  const toggleMenu = () => {
    if (menuVisible) {
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setMenuVisible(false));
    } else {
      setMenuVisible(true);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleProfileImageChange = async () => {
    try {
      setUploading(true);
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Permission Denied", "Camera roll permissions are required.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled) return;

      const imageUri = result.assets[0].uri;
      const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${profileData.id}.${fileExt}`;
      const filePath = `profilepics/${fileName}`;

      const response = await fetch(imageUri);
      const arrayBuffer = await response.arrayBuffer();

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profilepic')
        .upload(filePath, arrayBuffer, { upsert: true, contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('profilepic').getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatarurl: publicUrl })
        .eq('id', profileData.id);

      if (updateError) throw updateError;

      setProfileData(prev => ({ ...prev, avatarurl: `${publicUrl}?t=${Date.now()}` }));
      Alert.alert("Success", "Profile picture updated!");
    } catch (err) {
      console.error("Error uploading profile image:", err);
      Alert.alert("Error", "Failed to update profile picture.");
    } finally {
      setUploading(false);
    }
  };

  const handleEditProfile = () => {
    navigation.navigate('EditProfile', { 
      profileData: profileData,
      userId: profileData?.id 
    });
  };

  const handleBecomeHelpmate = () => {
    toggleMenu();
    navigation.navigate('BecomeHelpmate', { profileData });
  };

  const handleSettings = () => {
    toggleMenu();
    navigation.navigate('Settings');
  };

  const handleCreateGig = () => {
    navigation.navigate('CreateGig');
  };

  const handleLogout = async () => {
    toggleMenu();
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
            await StorageService.logout();
            navigation.replace('Login');
          }
        }
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!profileData) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load profile</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchProfileData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerUsername}>
            {profileData.username || `@user_${profileData.id.slice(-6)}`}
          </Text>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.menuButton} onPress={toggleMenu}>
              <Ionicons name="menu" size={24} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Profile Content */}
      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Profile Info Section */}
        <View style={styles.profileSection}>
          <View style={styles.profileHeader}>
            <View style={styles.profileImageContainer}>
              <TouchableOpacity 
                onPress={handleProfileImageChange} 
                disabled={uploading}
                style={styles.profileImageTouchable}
              >
                <Image 
                  source={{ 
                    uri: profileData.avatarurl ? `${profileData.avatarurl.split('?')[0]}?t=${Date.now()}` : 'https://placehold.co/120x120/3b82f6/white?text=U' 
                  }} 
                  style={styles.profileImage} 
                  defaultSource={{ uri: 'https://placehold.co/120x120/3b82f6/white?text=U' }}
                />
                {uploading && (
                  <View style={styles.uploadOverlay}>
                    <ActivityIndicator size="small" color={Colors.white} />
                  </View>
                )}
                <View style={styles.cameraIconContainer}>
                  <Ionicons name="camera" size={16} color={Colors.white} />
                </View>
              </TouchableOpacity>
            </View>
            
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{profileData.gigcreated || 0}</Text>
                <Text style={styles.statLabel}>Gigs Created</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{profileData.followers || 0}</Text>
                <Text style={styles.statLabel}>Followers</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{profileData.following || 0}</Text>
                <Text style={styles.statLabel}>Following</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{profileData.gigsworked || 0}</Text>
                <Text style={styles.statLabel}>Gigs Worked</Text>
              </View>
            </View>
          </View>

          {/* Profile Info */}
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profileData.name || 'Unknown User'}</Text>
            <Text style={styles.profileTitle}>{profileData.title || 'Professional'}</Text>
            {profileData.college && (
              <View style={styles.collegeContainer}>
                <Ionicons name="school-outline" size={16} color={Colors.darkGray} />
                <Text style={styles.collegeText}>{profileData.college}</Text>
              </View>
            )}
            <Text style={styles.profileBio}>{profileData.bio || 'No bio available'}</Text>
          </View>

          {/* Edit Profile Button */}
          <TouchableOpacity 
            style={styles.editProfileButton}
            onPress={handleEditProfile}
          >
            <Feather name="edit-3" size={18} color={Colors.white} />
            <Text style={styles.editProfileButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* My Works Section */}
        <View style={styles.worksSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Works (0)</Text>
          </View>
        </View>
      </ScrollView>

      {/* Post Work Button */}
      <TouchableOpacity 
        style={styles.postWorkButton}
        onPress={handleCreateGig}
      >
        <Feather name="plus" size={24} color={Colors.white} />
        <Text style={styles.postWorkText}>Post Work</Text>
      </TouchableOpacity>

      {/* Slide Menu */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="none"
        onRequestClose={toggleMenu}
      >
        <TouchableOpacity 
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={toggleMenu}
        >
          <Animated.View style={[styles.menuContainer, { transform: [{ translateX: slideAnim }] }]}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>Menu</Text>
              <TouchableOpacity onPress={toggleMenu}>
                <Ionicons name="close" size={24} color={Colors.white} />
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity style={styles.menuItem} onPress={handleSettings}>
              <Ionicons name="settings-outline" size={22} color={Colors.darkGray} />
              <Text style={styles.menuItemText}>Settings</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuItem} onPress={handleBecomeHelpmate}>
              <MaterialCommunityIcons name="hand-heart" size={22} color={Colors.primary} />
              <Text style={[styles.menuItemText, styles.helpmateText]}>Become a Helpmate</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={22} color={Colors.error} />
              <Text style={[styles.menuItemText, styles.logoutText]}>Logout</Text>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.darkGray,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: Colors.error,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: Colors.white,
    fontWeight: '600',
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerUsername: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.black,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuButton: {
    padding: 8,
    borderRadius: 8,
  },
  content: {
    flex: 1,
  },
  profileSection: {
    padding: 20,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  profileImageContainer: {
    marginRight: 20,
  },
  profileImageTouchable: {
    position: 'relative',
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: Colors.lightGray,
  },
  uploadOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: Colors.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  statsContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 15,
    padding: 10,
    backgroundColor: Colors.background,
    borderRadius: 8,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.darkGray,
    marginTop: 4,
    textAlign: 'center',
  },
  profileInfo: {
    marginBottom: 20,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.black,
    marginBottom: 4,
  },
  profileTitle: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
    marginBottom: 8,
  },
  collegeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  collegeText: {
    fontSize: 14,
    color: Colors.darkGray,
    marginLeft: 6,
  },
  profileBio: {
    fontSize: 14,
    color: Colors.darkGray,
    lineHeight: 20,
    marginBottom: 20,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginBottom: 20,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  editProfileButtonText: {
    color: Colors.white,
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  worksSection: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.black,
  },
  worksGrid: {
    padding: 1,
  },
  gigItem: {
    flex: 1,
    aspectRatio: 1,
    margin: 4,
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
  },
  gigImage: {
    width: '100%',
    height: '100%',
  },
  gigOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    padding: 8,
  },
  likeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  likeCount: {
    color: Colors.white,
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
  noWorksContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noWorksText: {
    fontSize: 16,
    color: Colors.darkGray,
    marginTop: 16,
    marginBottom: 8,
    fontWeight: '600',
  },
  noWorksSubtext: {
    fontSize: 14,
    color: Colors.gray,
    textAlign: 'center',
  },
  postWorkButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    elevation: 4,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  postWorkText: {
    color: Colors.white,
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 14,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  menuContainer: {
    width: 280,
    height: '100%',
    backgroundColor: Colors.white,
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  menuTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.black,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background,
  },
  menuItemText: {
    fontSize: 16,
    marginLeft: 15,
    color: Colors.darkGray,
  },
  helpmateText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  logoutText: {
    color: Colors.error,
    fontWeight: '600',
  },
});

export default ProfileUI;