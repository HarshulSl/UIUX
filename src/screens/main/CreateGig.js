// src/screens/main/CreateGig.js
import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../supabase';
import { Colors } from '../../constants/colors';
import { useNavigation } from '@react-navigation/native';

import { StorageService } from '../../secureStorage';

const CreateGig = ({ navigation }) => {
  const [gigData, setGigData] = useState({
    title: '',
    description: '',
    category: '',
    price: '',
    deliveryTime: '',
  });
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const categories = ['Food', 'Offline', 'Online', 'Printout', 'Designs'];

  // Request photo library permission
  const requestPermission = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'We need access to your photos to upload images.');
        return false;
      }
    }
    return true;
  };

  // Pick image
  const pickImage = async () => {
    if (images.length >= 3) {
      Alert.alert('Limit Reached', 'Maximum 3 images allowed.');
      return;
    }

    const hasPermission = await requestPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.length > 0) {
        const newImage = {
          uri: result.assets[0].uri,
          name: `gig_${Date.now()}.jpg`,
          type: 'image/jpeg',
        };
        setImages(prev => [...prev, newImage]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select image.');
    }
  };

  const removeImage = (indexToRemove) => {
    setImages(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  // Upload images to Supabase
  const uploadImagesToStorage = async (imageFiles, userId) => {
    const uploadedUrls = [];

    for (const image of imageFiles) {
      try {
        let imageUri = image.uri;
        if (Platform.OS === 'ios' && imageUri.startsWith('file://')) {
          imageUri = imageUri.replace('file://', '');
        }

        const response = await fetch(image.uri);
        const arrayBuffer = await response.arrayBuffer();

        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 9);
        const fileName = `users/${userId}/gigs/${timestamp}_${randomId}.jpg`;

        const { error: uploadError } = await supabase.storage
          .from('gig-images')
          .upload(fileName, arrayBuffer, { contentType: 'image/jpeg', upsert: false });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          continue;
        }

        const { data: { publicUrl }, error: urlError } = supabase.storage
          .from('gig-images')
          .getPublicUrl(fileName);

        if (urlError) {
          console.error('Public URL error:', urlError);
          continue;
        }

        uploadedUrls.push(publicUrl);
      } catch (error) {
        console.error('Image upload exception:', error);
        continue;
      }
    }

    return uploadedUrls;
  };

  // Validate form
  const validateForm = () => {
    const { title, description, category, price } = gigData;
    if (!title.trim() || title.length < 5) {
      Alert.alert('Invalid Title', 'Title must be at least 5 characters.');
      return false;
    }
    if (!description.trim() || description.length < 15) {
      Alert.alert('Invalid Description', 'Description must be at least 15 characters.');
      return false;
    }
    if (!category) {
      Alert.alert('Category Required', 'Please select a category.');
      return false;
    }
    const priceValue = parseFloat(price);
    if (!price || isNaN(priceValue) || priceValue < 5) {
      Alert.alert('Invalid Price', 'Price must be at least $5.');
      return false;
    }
    return true;
  };

  // Get current user session
  const getCurrentUser = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        throw error;
      }
      
      if (!session) {
        Alert.alert('Error', 'Please login to create a gig');
        navigation.replace('Login');
        return null;
      }
      
      return session.user;
    } catch (error) {
      console.error('Error getting user session:', error);
      Alert.alert('Error', 'Failed to get user information');
      return null;
    }
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      // Get current user from session
      const user = await getCurrentUser();
      if (!user) {
        setLoading(false);
        return;
      }

      let imageUrls = [];
      if (images.length > 0) {
        setUploading(true);
        imageUrls = await uploadImagesToStorage(images, user.id);
        setUploading(false);
      }

      const gigPayload = {
        user_id: user.id, // Use the UID from session
        title: gigData.title.trim(),
        description: gigData.description.trim(),
        category: gigData.category,
        price: parseFloat(gigData.price),
        delivery_time: parseInt(gigData.deliveryTime) || 24,
        images: imageUrls,
        status: 'active',
        created_at: new Date().toISOString(),
        
      };

      const { data: dbData, error: dbError } = await supabase
        .from('gigs')
        .insert([gigPayload])
        .select()
        .single();

      if (dbError) throw dbError;

      // Update user's profile to include this gig in gigscreated array
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('gigscreated')
        .eq('id', user.id)
        .single();

      if (!profileError) {
        const currentGigs = profileData?.gigscreated || [];
        const updatedGigs = [...currentGigs, dbData.id];

      await supabase
        .from('profiles')
        .update({ gigscreated: supabase.raw('gigscreated + 1') })
        .eq('id', user.id);
      }

      Alert.alert(
        'Success! 🎉',
        'Your gig has been published successfully.',
        [
          { 
            text: 'Okay', 
            

             
          }
        ]
      );

      // Reset form
      setGigData({ title: '', description: '', category: '', price: '', deliveryTime: '24' });
      setImages([]);
      
    } catch (error) {
      console.error('Create gig error:', error);
      Alert.alert('Error', error.message || 'Failed to create gig. Please try again.');
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  // Update form field
  const updateField = (field, value) => {
    setGigData(prev => ({ ...prev, [field]: value }));
  };

  // Render category button
  const renderCategoryButton = (category) => (
    <TouchableOpacity
      key={category}
      style={[
        styles.categoryButton,
        gigData.category === category && styles.categoryButtonActive,
      ]}
      onPress={() => updateField('category', category)}
      disabled={loading}
    >
      <Text style={[
        styles.categoryText, 
        gigData.category === category && styles.categoryTextActive
      ]}>
        {category}
      </Text>
    </TouchableOpacity>
  );

  // Render selected image
  const renderSelectedImage = (image, index) => (
    <View key={index} style={styles.imageItem}>
      <Image source={{ uri: image.uri }} style={styles.image} />
      <TouchableOpacity
        style={styles.removeImageButton}
        onPress={() => removeImage(index)}
        disabled={loading}
      >
        <Ionicons name="close-circle" size={20} color={Colors.error} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.replace('MainApp', { activeTab: 'home' })}
          disabled={loading}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create New Gig</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Basic Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Gig Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Professional Logo Design"
              placeholderTextColor={Colors.gray}
              value={gigData.title}
              onChangeText={(text) => updateField('title', text)}
              maxLength={100}
              editable={!loading}
            />
            <Text style={styles.charCount}>{gigData.title.length}/100</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Category *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
              <View style={styles.categoriesContainer}>{categories.map(renderCategoryButton)}</View>
            </ScrollView>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe your service in detail..."
              placeholderTextColor={Colors.gray}
              value={gigData.description}
              onChangeText={(text) => updateField('description', text)}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={500}
              editable={!loading}
            />
            <Text style={styles.charCount}>{gigData.description.length}/500</Text>
          </View>
        </View>

        {/* Pricing & Delivery */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pricing & Delivery</Text>
          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.flex1]}>
              <Text style={styles.label}>Price (₹) *</Text>
              <View style={styles.priceContainer}>
                <Text style={styles.currency}>₹</Text>
                <TextInput
                  style={[styles.input, styles.priceInput]}
                  placeholder="50.00"
                  placeholderTextColor={Colors.gray}
                  keyboardType="decimal-pad"
                  value={gigData.price}
                  onChangeText={(text) => updateField('price', text)}
                  editable={!loading}
                />
              </View>
            </View>

            <View style={[styles.inputGroup, styles.flex1]}>
              <Text style={styles.label}>Delivery (hours) *</Text>
              <TextInput
                style={styles.input}
                placeholder="24"
                placeholderTextColor={Colors.gray}
                keyboardType="number-pad"
                value={gigData.deliveryTime}
                onChangeText={(text) => updateField('deliveryTime', text)}
                editable={!loading}
              />
            </View>
          </View>
        </View>

        {/* Portfolio Images */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Portfolio Images</Text>
          <Text style={styles.sectionSubtitle}>Showcase your work (up to 3 images)</Text>

          <TouchableOpacity
            style={[styles.uploadButton, (loading || images.length >= 3) && styles.uploadButtonDisabled]}
            onPress={pickImage}
            disabled={loading || images.length >= 3}
          >
            <Ionicons name="images-outline" size={32} color={Colors.primary} />
            <Text style={styles.uploadText}>Add Images</Text>
            <Text style={styles.uploadSubtext}>{images.length}/3 images selected</Text>
          </TouchableOpacity>

          {uploading && (
            <View style={styles.uploadProgress}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.uploadProgressText}>Uploading images...</Text>
            </View>
          )}

          {images.length > 0 && (
            <View style={styles.imagesContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.imagesList}>{images.map(renderSelectedImage)}</View>
              </ScrollView>
            </View>
          )}
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <>
              <Ionicons name="rocket-outline" size={20} color={Colors.white} />
              <Text style={styles.submitButtonText}>Publish Gig</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.white },
  headerSpacer: { width: 32 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  section: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.lightGray,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.primaryDark, marginBottom: 8 },
  sectionSubtitle: { fontSize: 14, color: Colors.gray, marginBottom: 16 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 8 },
  input: {
    backgroundColor: Colors.lightBackground,
    borderWidth: 1,
    borderColor: Colors.lightGray,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.text,
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  charCount: { fontSize: 12, color: Colors.gray, textAlign: 'right', marginTop: 4 },
  row: { flexDirection: 'row' },
  flex1: { flex: 1 },
  priceContainer: { flexDirection: 'row', alignItems: 'center' },
  currency: { position: 'absolute', left: 12, zIndex: 1, fontSize: 16, color: Colors.text, fontWeight: '500' },
  priceInput: { paddingLeft: 28 },
  categoriesScroll: { marginHorizontal: -20 },
  categoriesContainer: { flexDirection: 'row', paddingHorizontal: 20 },
  categoryButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: Colors.lightBackground, borderWidth: 1, borderColor: Colors.lightGray, marginRight: 8 },
  categoryButtonActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  categoryText: { fontSize: 14, fontWeight: '500', color: Colors.text },
  categoryTextActive: { color: Colors.white, fontWeight: '600' },
  uploadButton: { alignItems: 'center', justifyContent: 'center', padding: 24, borderWidth: 2, borderStyle: 'dashed', borderColor: Colors.primary, borderRadius: 12, marginBottom: 12 },
  uploadButtonDisabled: { opacity: 0.6 },
  uploadText: { fontSize: 14, fontWeight: '600', color: Colors.primary, marginTop: 8 },
  uploadSubtext: { fontSize: 12, color: Colors.gray, marginTop: 4 },
  uploadProgress: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  uploadProgressText: { fontSize: 12, color: Colors.gray, marginLeft: 8 },
  imagesContainer: { marginTop: 8 },
  imagesList: { flexDirection: 'row' },
  imageItem: { marginRight: 12, position: 'relative' },
  image: { width: 80, height: 80, borderRadius: 8 },
  removeImageButton: { position: 'absolute', top: -6, right: -6, backgroundColor: Colors.white, borderRadius: 10 },
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary, paddingVertical: 14, borderRadius: 12, marginTop: 12 },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: Colors.white, fontSize: 16, fontWeight: '700', marginLeft: 8 },
});

export default CreateGig;