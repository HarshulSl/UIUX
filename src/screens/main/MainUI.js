import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  TextInput,
  RefreshControl,
  Animated,
  Dimensions
} from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { supabase } from '../../supabase';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const HomeScreen = () => {
  const [gigs, setGigs] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const flatListRef = useRef(null);
  const navigation = useNavigation();


  const categories = [
    { id: 'food', name: 'Food', icon: 'fast-food', searchTerm: 'food' },
    { id: 'offline', name: 'Offline', icon: 'storefront', searchTerm: 'offline service' },
    { id: 'online', name: 'Online', icon: 'globe', searchTerm: 'online service' },
    { id: 'printout', name: 'Printout', icon: 'print', searchTerm: 'print printout' },
    { id: 'designs', name: 'Designs', icon: 'brush', searchTerm: 'design graphic' },
  ];

  useEffect(() => {
    fetchGigs();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    // Scroll to top when search query changes
    if (searchQuery.length > 0 && flatListRef.current) {
      scrollToTop();
    }
  }, [searchQuery]);

  const fetchGigs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('gigs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setGigs(data || []);
    } catch (error) {
      console.error('Error fetching gigs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCategoryPress = (category) => {
    if (selectedCategory?.id === category.id) {
      setSelectedCategory(null);
      setSearchQuery('');
    } else {
      setSelectedCategory(category);
      setSearchQuery(category.searchTerm);
      // Scroll to top when category is selected
      scrollToTop();
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchGigs();
  };

  const clearAllFilters = () => {
    setSelectedCategory(null);
    setSearchQuery('');
    // Scroll to top when clearing filters
    scrollToTop();
  };

  const scrollToTop = () => {
    if (flatListRef.current) {
      flatListRef.current.scrollToOffset({ animated: true, offset: 0 });
    }
  };

  const handleSearchChange = (text) => {
    setSearchQuery(text);
    // No need to call scrollToTop here as the useEffect will handle it
  };

  const filteredGigs = gigs.filter(gig => {
    if (!searchQuery.trim()) return true;
    
    const searchTerms = searchQuery.toLowerCase().split(' ');
    const gigText = `${gig.title} ${gig.description} ${gig.category}`.toLowerCase();
    
    return searchTerms.some(term => gigText.includes(term));
  });

  const formatPrice = (price) => {
    return `₹${price.toFixed(2)}`;
  };

  const formatDeliveryTime = (hours) => {
    if (hours < 24) return `${hours} hours`;
    const days = Math.ceil(hours / 24);
    return `${days} day${days > 1 ? 's' : ''}`;
  };

  const getCategoryIcon = (category) => {
    const foundCategory = categories.find(cat => cat.id === category);
    return foundCategory ? foundCategory.icon : 'grid';
  };

  const getStatusConfig = (status) => {
    const statusConfigs = {
      active: {
        icon: 'flash',
        color: '#22C55E',
        backgroundColor: '#DCFCE7',
        borderColor: '#BBF7D0',
        text: 'Available Now',
        badgeStyle: styles.statusBadgeActive
      },
      completed: {
        icon: 'checkmark-done',
        color: '#3B82F6',
        backgroundColor: '#DBEAFE',
        borderColor: '#BFDBFE',
        text: 'Completed',
        badgeStyle: styles.statusBadgeCompleted
      },
      pending: {
        icon: 'time',
        color: '#F59E0B',
        backgroundColor: '#FEF3C7',
        borderColor: '#FDE68A',
        text: 'Pending',
        badgeStyle: styles.statusBadgePending
      },
      cancelled: {
        icon: 'close',
        color: '#EF4444',
        backgroundColor: '#FEE2E2',
        borderColor: '#FECACA',
        text: 'Cancelled',
        badgeStyle: styles.statusBadgeCancelled
      }
    };
    
    return statusConfigs[status] || statusConfigs.active;
  };

  const renderCategoryItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.categoryItem,
        selectedCategory?.id === item.id && styles.categoryItemSelected
      ]}
      onPress={() => handleCategoryPress(item)}
    >
      <Ionicons
        name={item.icon}
        size={22}
        color={selectedCategory?.id === item.id ? Colors.white : Colors.primary}
      />
      <Text style={[
        styles.categoryText,
        selectedCategory?.id === item.id && styles.categoryTextSelected
      ]}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const renderGigItem = ({ item, index }) => {
    const statusConfig = getStatusConfig(item.status);
    
    return (
      <Animated.View
        style={[
          styles.gigCard,
          {
            opacity: fadeAnim,
            transform: [{
              translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0]
              })
            }]
          }
        ]}
      >
        <TouchableOpacity style={styles.gigContent}>
          {/* Header with Status and Price */}
          <View style={styles.gigHeader}>
            <View style={styles.statusContainer}>
              <View style={[styles.statusBadge, statusConfig.badgeStyle]}>
                <View style={styles.statusIconContainer}>
                  <Ionicons 
                    name={statusConfig.icon} 
                    size={14} 
                    color={statusConfig.color} 
                  />
                </View>
                <Text style={[styles.statusText, { color: statusConfig.color }]}>
                  {statusConfig.text}
                </Text>
              </View>
            </View>
            <Text style={styles.gigPrice}>
              {formatPrice(item.price)}
            </Text>
          </View>
          
          {/* Category Icon */}
          <View style={styles.categoryIconWrapper}>
            <View style={styles.categoryIconContainer}>
              <Ionicons 
                name={getCategoryIcon(item.category)} 
                size={20} 
                color={Colors.primary} 
              />
            </View>
          </View>

          {/* Gig Details */}
          <View style={styles.gigDetails}>
            <Text style={styles.gigTitle} numberOfLines={2}>
              {item.title}
            </Text>
            
            <Text style={styles.gigDescription} numberOfLines={3}>
              {item.description}
            </Text>
            
            <View style={styles.gigFooter}>
              <View style={styles.deliveryBadge}>
                <Ionicons name="time-outline" size={14} color={Colors.gray} />
                <Text style={styles.deliveryText}>
                  {formatDeliveryTime(item.delivery_time)}
                </Text>
              </View>
              
              <View style={[
                styles.categoryBadge,
                { backgroundColor: getCategoryColor(item.category) }
              ]}>
                <Text style={styles.categoryBadgeText}>
                  {item.category}
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const getCategoryColor = (category) => {
    const categoryColors = {
      food: '#FF6B6B',
      offline: '#4ECDC4',
      online: '#45B7D1',
      printout: '#96CEB4',
      designs: '#FFBE0B'
    };
    return categoryColors[category] || Colors.primaryLighter;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.logo}>Needify</Text>
        </View>
        
        <TouchableOpacity onPress={() => navigation.navigate('MessageScreen')}>
          <Ionicons name="chatbubbles" size={24} color={Colors.primary} />
          <View style={styles.notificationBadge}>
            <Text style={styles.notificationText}>1</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={Colors.gray} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search for food, designs, printouts..."
          placeholderTextColor={Colors.gray}
          value={searchQuery}
          onChangeText={handleSearchChange}
        />
        {(searchQuery.length > 0 || selectedCategory) && (
          <TouchableOpacity onPress={clearAllFilters}>
            <Ionicons name="close-circle" size={20} color={Colors.gray} />
          </TouchableOpacity>
        )}
      </View>

      {/* Categories Header */}
      <View style={styles.categoriesHeader}>
        <Text style={styles.categoriesTitle}>Quick Categories</Text>
        {(searchQuery || selectedCategory) && (
          <TouchableOpacity 
            style={styles.clearFilterButton}
            onPress={clearAllFilters}
          >
            <Text style={styles.clearFilterText}>Clear all</Text>
            <Ionicons name="close" size={16} color={Colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Categories */}
      <View style={styles.categoriesContainer}>
        <FlatList
          data={categories}
          renderItem={renderCategoryItem}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesList}
        />
      </View>

      {/* Active Filter Indicator */}
      {selectedCategory && (
        <View style={styles.activeFilterContainer}>
          <Text style={styles.activeFilterText}>
            Showing results for: <Text style={styles.activeFilterCategory}>{selectedCategory.name}</Text>
          </Text>
        </View>
      )}

      {/* Results Header */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsTitle}>
          {selectedCategory 
            ? `${selectedCategory.name} Services`
            : 'All Services'
          }
        </Text>
        <Text style={styles.resultsCount}>({filteredGigs.length} results)</Text>
      </View>

      {/* Gigs List */}
      <FlatList
        ref={flatListRef}
        data={filteredGigs}
        renderItem={renderGigItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.gigsList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <MaterialIcons 
                name={searchQuery ? 'search-off' : 'work-outline'} 
                size={64} 
                color={Colors.lightGray} 
              />
              <Text style={styles.emptyStateTitle}>
                {searchQuery ? 'No matching services found' : 'No services available'}
              </Text>
              <Text style={styles.emptyStateText}>
                {searchQuery 
                  ? 'Try different search terms or browse categories' 
                  : 'Check back later for new services'
                }
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  headerLeft: {
    flex: 1,
  },
  logo: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: -0.5,
  },
  notificationBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: Colors.error,
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    margin: 20,
    marginBottom: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.lightGray,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: Colors.text,
  },
  categoriesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 5,
  },
  categoriesTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  clearFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: Colors.primaryLighter,
    borderRadius: 15,
  },
  clearFilterText: {
    fontSize: 12,
    color: Colors.primary,
    marginRight: 4,
    fontWeight: '500',
  },
  categoriesContainer: {
    marginVertical: 5,
  },
  categoriesList: {
    paddingHorizontal: 20,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: Colors.lightGray,
    minWidth: 100,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  categoryItemSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  categoryTextSelected: {
    color: Colors.white,
  },
  activeFilterContainer: {
    backgroundColor: Colors.primaryLighter,
    marginHorizontal: 20,
    marginVertical: 10,
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  activeFilterText: {
    fontSize: 14,
    color: Colors.primaryDark,
    fontWeight: '500',
  },
  activeFilterCategory: {
    fontWeight: '700',
    color: Colors.primary,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 15,
    marginBottom: 10,
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  resultsCount: {
    fontSize: 14,
    color: Colors.gray,
    fontWeight: '500',
  },
  gigsList: {
    padding: 20,
    paddingTop: 5,
  },
  gigCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  gigContent: {
    flex: 1,
    padding: 16,
  },
  gigHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  statusContainer: {
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusBadgeActive: {
    backgroundColor: '#DCFCE7',
    borderColor: '#BBF7D0',
  },
  statusBadgeCompleted: {
    backgroundColor: '#DBEAFE',
    borderColor: '#BFDBFE',
  },
  statusBadgePending: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  statusBadgeCancelled: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
  },
  statusIconContainer: {
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  gigPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
    marginLeft: 10,
  },
  categoryIconWrapper: {
    position: 'absolute',
    top: 50,
    right: 16,
  },
  categoryIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryLighter,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  gigDetails: {
    flex: 1,
    marginTop: 8,
  },
  gigTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
    lineHeight: 22,
    paddingRight: 40,
  },
  gigDescription: {
    fontSize: 14,
    color: Colors.darkGray,
    lineHeight: 20,
    marginBottom: 12,
  },
  gigFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deliveryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  deliveryText: {
    fontSize: 12,
    color: Colors.darkGray,
    marginLeft: 4,
    fontWeight: '500',
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  categoryBadgeText: {
    fontSize: 12,
    color: Colors.white,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.darkGray,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: Colors.gray,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default HomeScreen;