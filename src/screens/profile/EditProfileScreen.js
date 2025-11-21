// src/screens/profile/EditProfileScreen.js
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import * as ImagePicker from 'expo-image-picker';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Alert,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

const EditProfileScreen = ({ navigation, route }) => {
  const [userData, setUserData] = useState({
    name: '',
    username: '',
    college: '',
    bio: '',
    email: '',
    phone: '',
    gender: '',
    avatarurl: '',
  });

  const [initialData, setInitialData] = useState({});
  const [showCollegeModal, setShowCollegeModal] = useState(false);
  const [showGenderModal, setShowGenderModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isFirstTimeLogin, setIsFirstTimeLogin] = useState(false);

  // List of colleges
  const colleges = [
    'Saveetha Engineering College',
    'Saveetha Institute of Medical and Technical Sciences',
    'Saveetha University',
    'Saveetha School of Engineering',
    'Saveetha Dental College and Hospitals',
    'Saveetha School of Law',
    'Saveetha School of Management'
  ];

  // List of genders
  const genders = ['Male', 'Female'];

  // Get user session and profile data
  useEffect(() => {
    const getUserData = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Error getting session:', sessionError);
          Alert.alert('Error', 'Failed to get user session');
          return;
        }

        if (session?.user) {
          // Get existing profile data
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profileError && profileError.code !== 'PGRST116') {
            console.error('Error fetching profile:', profileError);
          }

          const userProfile = profileData || {};

          const userDataObj = {
            name: userProfile.name || '',
            username: userProfile.username || '',
            college: userProfile.college || '',
            bio: userProfile.bio || '',
            email: session.user.email || userProfile.email || '',
            phone: session.user.phone || userProfile.phone || '',
            gender: userProfile.gender || '',
            avatarurl: userProfile.avatarurl || userProfile.avatarurl || '',
          };

          setUserData(userDataObj);
          setInitialData(userDataObj);

          // Check if this is first time login (no name or username set)
          const isFirstTime = !userProfile.name && !userProfile.username;
          setIsFirstTimeLogin(isFirstTime);
        }
      } catch (err) {
        console.error('Unexpected error getting user data:', err);
      } finally {
        setLoading(false);
      }
    };

    getUserData();
  }, []);

  // Check if field is editable based on initial value
  const isFieldEditable = (field) => {
    const restrictedFields = ['email', 'phone', 'gender', 'college'];
    
    if (!restrictedFields.includes(field)) {
      return true; // Name, username, bio are always editable
    }
    
    // For restricted fields, only editable if initial value is empty/null
    return !initialData[field];
  };

  // Profile Image Upload Logic from ProfileUI
  const handleProfileImageChange = async () => {
    try {
      setUploading(true);
      
      // Request permissions
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Permission Denied", "Camera roll permissions are required.");
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const imageUri = result.assets[0].uri;
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not found');
      }

      // Prepare file for upload
      const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user.id}.${fileExt}`;
      const filePath = `profilepics/${fileName}`;

      // Convert image to array buffer
      const response = await fetch(imageUri);
      const arrayBuffer = await response.arrayBuffer();

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profilepic')
        .upload(filePath, arrayBuffer, { 
          upsert: true, 
          contentType: 'image/jpeg' 
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('profilepic')
        .getPublicUrl(filePath);
      
      const publicUrl = urlData.publicUrl;

      // Update profile in database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          avatarurl: publicUrl,
          avatarurl: publicUrl // Update both fields for compatibility
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Update local state with timestamp to avoid caching
      setUserData(prev => ({ 
        ...prev, 
        avatarurl: `${publicUrl}?t=${Date.now()}` 
      }));

      Alert.alert("Success", "Profile picture updated!");
    } catch (err) {
      console.error("Error uploading profile image:", err);
      Alert.alert("Error", "Failed to update profile picture.");
    } finally {
      setUploading(false);
    }
  };

  const navigateToEditField = (field, value) => {
    if (!isFieldEditable(field.toLowerCase())) return;
    
    navigation.navigate('EditField', { 
      field, 
      value,
      onSave: (newValue) => {
        setUserData(prev => ({ ...prev, [field.toLowerCase()]: newValue }));
      }
    });
  };

  const handleCollegeSelect = (college) => {
    if (!isFieldEditable('college')) return;
    setUserData(prev => ({ ...prev, college }));
    setShowCollegeModal(false);
  };

  const handleGenderSelect = (gender) => {
    if (!isFieldEditable('gender')) return;
    setUserData(prev => ({ ...prev, gender }));
    setShowGenderModal(false);
  };

  const handleCompleteProfile = async () => {
    if (!userData.name.trim() || !userData.username.trim()) {
      Alert.alert(
        "Incomplete Profile",
        "Please fill in your name and username to continue.",
        [{ text: "OK" }]
      );
      return;
    }

    try {
      // Get current user ID from session
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        Alert.alert("Error", "Unable to get user information. Please try again.");
        return;
      }

      const updateData = {
        name: userData.name,
        username: userData.username,
        bio: userData.bio,
        updated_at: new Date().toISOString(),
      };

      // Only update restricted fields if they were empty initially
      if (!initialData.college) updateData.college = userData.college;
      if (!initialData.gender) updateData.gender = userData.gender;
      if (!initialData.phone) updateData.phone = userData.phone;
      if (!initialData.email) updateData.email = userData.email;
      if (userData.avatarurl) {
        updateData.avatarurl = userData.avatarurl;
        updateData.avatarurl = userData.avatarurl; // For compatibility
      }

      const { data, error } = await supabase.from('profiles')
        .update(updateData)
        .eq('id', user.id)
        .select();

      if (error) {
        console.error("Update error:", error);
        
        // Handle unique constraint violation (username might already exist)
        if (error.code === '23505') {
          Alert.alert("Error", "Username already exists. Please choose a different one.");
        } else {
          Alert.alert("Error", error.message);
        }
      } else {
        console.log("Updated profile:", data);
        
        // Navigate based on first time login
        if (isFirstTimeLogin) {
          navigation.replace('MainApp', { activeTab: 'home' });
        } else {
          navigation.replace('MainApp', { activeTab: 'profile' });
        }
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      Alert.alert("Error", "Something went wrong while saving profile.");
    }
  };

  const renderSelectionModal = (title, data, selectedValue, onSelect, visible, onClose) => (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity 
              onPress={onClose}
              style={styles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={data}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.selectionItem}
                onPress={() => onSelect(item)}
                activeOpacity={0.8}
              >
                <Text style={styles.selectionText}>{item}</Text>
                {selectedValue === item && (
                  <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                )}
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {isFirstTimeLogin ? 'Complete Profile' : 'Edit Profile'}
          </Text>
          
          <TouchableOpacity 
            onPress={handleCompleteProfile} 
            style={styles.doneButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>

        {/* Scrollable Content */}
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Profile Photo Section */}
          <View style={styles.profileSection}>
            <View style={styles.avatarContainer}>
              <TouchableOpacity 
                onPress={handleProfileImageChange}
                disabled={uploading}
                style={styles.avatarTouchable}
              >
                {userData.avatarurl ? (
                  <Image 
                    source={{ 
                      uri: userData.avatarurl.includes('?t=') 
                        ? userData.avatarurl 
                        : `${userData.avatarurl.split('?')[0]}?t=${Date.now()}`
                    }} 
                    style={styles.avatarImage}
                    defaultSource={{ uri: 'https://placehold.co/120x120/3b82f6/white?text=U' }}
                  />
                ) : (
                  <View style={styles.avatar}>
                    <Ionicons name="person" size={40} color={Colors.gray} />
                  </View>
                )}
                
                {uploading && (
                  <View style={styles.uploadOverlay}>
                    <ActivityIndicator size="small" color={Colors.white} />
                  </View>
                )}
                
                <View style={styles.cameraIcon}>
                  <Ionicons name="camera" size={20} color={Colors.white} />
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.changeAvatarBtn}
                onPress={handleProfileImageChange}
                disabled={uploading}
                activeOpacity={0.7}
              >
                <Text style={styles.changeAvatarText}>
                  {userData.avatarurl ? 'Change Profile Photo' : 'Add Profile Photo'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Form Fields */}
          <View style={styles.fieldsContainer}>
            <FieldItem 
              label="Name" 
              value={userData.name} 
              placeholder="Enter your name"
              onPress={() => navigateToEditField('Name', userData.name)} 
              editable={true}
            />
            <FieldItem 
              label="Username" 
              value={userData.username} 
              placeholder="Choose a username"
              onPress={() => navigateToEditField('Username', userData.username)} 
              editable={true}
            />
            <FieldItem 
              label="College" 
              value={userData.college} 
              placeholder="Select your college"
              onPress={() => setShowCollegeModal(true)} 
              editable={isFieldEditable('college')}
            />
            <FieldItem 
              label="Bio" 
              value={userData.bio} 
              placeholder="Tell us about yourself"
              onPress={() => navigateToEditField('Bio', userData.bio)} 
              editable={true}
            />
            
            {/* Private Info Section */}
            <View style={styles.sectionDivider}>
              <Text style={styles.sectionTitle}>Private Information</Text>
            </View>
            
            <FieldItem 
              label="Email" 
              value={userData.email} 
              placeholder="Loading email..."
              onPress={() => {}} 
              editable={isFieldEditable('email')}
            />
            <FieldItem 
              label="Phone" 
              value={userData.phone} 
              placeholder="Add your phone number"
              onPress={() => navigateToEditField('Phone', userData.phone)} 
              editable={isFieldEditable('phone')}
            />
            <FieldItem 
              label="Gender" 
              value={userData.gender} 
              placeholder="Select your gender"
              onPress={() => setShowGenderModal(true)} 
              editable={isFieldEditable('gender')}
            />
          </View>
        </ScrollView>

        {/* Modals */}
        {renderSelectionModal(
          'Select College',
          colleges,
          userData.college,
          handleCollegeSelect,
          showCollegeModal,
          () => setShowCollegeModal(false)
        )}

        {renderSelectionModal(
          'Select Gender',
          genders,
          userData.gender,
          handleGenderSelect,
          showGenderModal,
          () => setShowGenderModal(false)
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const FieldItem = ({ label, value, placeholder, onPress, editable = true }) => (
  <TouchableOpacity 
    style={[styles.fieldItem, !editable && styles.fieldItemDisabled]} 
    onPress={onPress}
    disabled={!editable}
    activeOpacity={editable ? 0.8 : 1}
  >
    <View style={styles.fieldLabelContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {!editable && (
        <Text style={styles.lockedText}>(Locked)</Text>
      )}
    </View>
    <View style={styles.fieldValueContainer}>
      <Text 
        style={[
          styles.fieldValue, 
          !value && styles.placeholderText,
          !editable && styles.uneditableText
        ]} 
        numberOfLines={1}
      >
        {value || placeholder}
      </Text>
      {editable ? (
        <View style={styles.chevronContainer}>
          <Ionicons name="chevron-forward" size={20} color={Colors.gray} />
        </View>
      ) : (
        <View style={styles.lockContainer}>
          <Ionicons name="lock-closed" size={16} color={Colors.gray} />
        </View>
      )}
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
    backgroundColor: Colors.white,
    elevation: 2,
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.3,
  },
  doneButton: {
    padding: 6,
    borderRadius: 8,
  },
  doneButtonText: {
    color: Colors.primary,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: Colors.white,
    marginBottom: 20,
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarContainer: {
    alignItems: 'center',
  },
  avatarTouchable: {
    position: 'relative',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.lightGray,
    borderWidth: 2,
    borderColor: Colors.lightestGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: Colors.lightestGray,
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: Colors.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  uploadOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  changeAvatarBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: `${Colors.primary}08`,
  },
  changeAvatarText: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 15,
  },
  fieldsContainer: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    marginHorizontal: 16,
    overflow: 'hidden',
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  fieldItem: {
    flexDirection: 'row',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  fieldItemDisabled: {
    opacity: 0.6,
  },
  fieldLabelContainer: {
    width: 110,
    justifyContent: 'center',
  },
  fieldLabel: {
    fontWeight: '600',
    color: Colors.text,
    fontSize: 16,
    letterSpacing: -0.2,
  },
  lockedText: {
    fontSize: 10,
    color: Colors.gray,
    marginTop: 2,
    fontStyle: 'italic',
  },
  fieldValueContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldValue: {
    color: Colors.text,
    flex: 1,
    marginRight: 16,
    fontSize: 16,
    letterSpacing: -0.2,
  },
  placeholderText: {
    color: Colors.gray,
    fontStyle: 'italic',
  },
  uneditableText: {
    color: Colors.gray,
  },
  chevronContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  lockContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  sectionDivider: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    backgroundColor: `${Colors.primary}05`,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  sectionTitle: {
    fontWeight: '700',
    fontSize: 17,
    color: Colors.primaryDark,
    letterSpacing: -0.3,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.gray,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '65%',
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 19,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.3,
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
  },
  selectionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  selectionText: {
    fontSize: 17,
    color: Colors.text,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.lightGray,
    marginHorizontal: 24,
  },
});

export default EditProfileScreen;