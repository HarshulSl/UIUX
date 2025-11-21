import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  TextInput,
  Image
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

const MessagesScreen = ({ navigation }) => {
  const [chats, setChats] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const mockChats = [
      {
        id: '1',
        username: 'johndoe',
        lastMessage: 'Hey there! How are you doing?',
        timestamp: '2h ago',
        unread: true,
        profilePic: 'https://i.pravatar.cc/150?img=1'
      },
      {
        id: '2',
        username: 'sarahsmith',
        lastMessage: 'Thanks for the photo! 📸',
        timestamp: '4h ago',
        unread: false,
        profilePic: 'https://i.pravatar.cc/150?img=2'
      },
      {
        id: '3',
        username: 'mikejohnson',
        lastMessage: 'See you tomorrow!',
        timestamp: '1d ago',
        unread: true,
        profilePic: 'https://i.pravatar.cc/150?img=3'
      },
      {
        id: '4',
        username: 'emilywilson',
        lastMessage: 'That looks amazing!',
        timestamp: '2d ago',
        unread: false,
        profilePic: 'https://i.pravatar.cc/150?img=4'
      }
    ];
    setChats(mockChats);
  }, []);

  const filteredChats = chats.filter(chat =>
    chat.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderChatItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.chatItem}
      onPress={() => navigation.navigate('ChatScreen', { username: item.username })}
    >
      <View style={styles.chatLeft}>
        <Image source={{ uri: item.profilePic }} style={styles.avatar} />
        <View style={styles.chatInfo}>
          <Text style={styles.username}>{item.username}</Text>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage}
          </Text>
        </View>
      </View>
      
      <View style={styles.chatRight}>
        <Text style={styles.timestamp}>{item.timestamp}</Text>
        {item.unread && <View style={styles.unreadIndicator} />}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerLeft}>
          <Image 
            source={{ uri: 'https://i.pravatar.cc/150?img=5' }}
            style={styles.headerAvatar}
          />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Messages</Text>
        
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerIcon}>
            <Ionicons name="videocam-outline" size={24} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIcon}>
            <Feather name="edit" size={20} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Feather name="search" size={16} color={Colors.gray} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search"
          placeholderTextColor={Colors.gray}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Chat List */}
      <FlatList
        data={filteredChats}
        renderItem={renderChatItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.chatList}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  headerLeft: {
    width: 32,
    height: 32,
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerIcon: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.lightGray,
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: Colors.text,
  },
  chatList: {
    paddingHorizontal: 16,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  chatLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
  },
  chatInfo: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  lastMessage: {
    fontSize: 14,
    color: Colors.darkGray,
  },
  chatRight: {
    alignItems: 'flex-end',
  },
  timestamp: {
    fontSize: 12,
    color: Colors.gray,
    marginBottom: 4,
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
});

export default MessagesScreen;