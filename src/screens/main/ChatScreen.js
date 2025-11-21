import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

const ChatScreen = ({ navigation, route }) => {
  const { username } = route.params;
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const scrollViewRef = useRef();

  useEffect(() => {
    const mockMessages = [
      {
        id: '1',
        text: 'Hey! How are you doing?',
        timestamp: '10:30 AM',
        isOutgoing: false,
      },
      {
        id: '2',
        text: "I'm good! Just finished that project we talked about",
        timestamp: '10:31 AM',
        isOutgoing: true,
      },
      {
        id: '3',
        text: 'Thats awesome! Send me some pics when you get a chance',
        timestamp: '10:32 AM',
        isOutgoing: false,
      },
      {
        id: '4',
        text: 'Definitely! Here are some previews 📸',
        timestamp: '10:33 AM',
        isOutgoing: true,
      },
      {
        id: '5',
        text: 'These look incredible! The color scheme is perfect',
        timestamp: '10:35 AM',
        isOutgoing: false,
      },
    ];
    setMessages(mockMessages);
  }, []);

  const sendMessage = () => {
    if (newMessage.trim()) {
      const message = {
        id: Date.now().toString(),
        text: newMessage,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isOutgoing: true,
      };
      setMessages([...messages, message]);
      setNewMessage('');
    }
  };

  const renderMessage = (message, index) => {
    const showTimestamp = index === messages.length - 1 || 
      messages[index + 1]?.isOutgoing !== message.isOutgoing;

    return (
      <View key={message.id}>
        <View style={[
          styles.messageContainer,
          message.isOutgoing ? styles.outgoingContainer : styles.incomingContainer
        ]}>
          <View style={[
            styles.messageBubble,
            message.isOutgoing ? styles.outgoingBubble : styles.incomingBubble
          ]}>
            <Text style={[
              styles.messageText,
              message.isOutgoing ? styles.outgoingText : styles.incomingText
            ]}>
              {message.text}
            </Text>
          </View>
        </View>
        {showTimestamp && (
          <Text style={[
            styles.timestamp,
            message.isOutgoing ? styles.outgoingTimestamp : styles.incomingTimestamp
          ]}>
            {message.timestamp}
          </Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Image 
            source={{ uri: 'https://i.pravatar.cc/150?img=1' }}
            style={styles.headerAvatar}
          />
          <Text style={styles.headerUsername}>{username}</Text>
        </View>
        
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerIcon}>
            <Ionicons name="videocam-outline" size={22} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIcon}>
            <Ionicons name="information-circle-outline" size={22} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages Area */}
      <KeyboardAvoidingView 
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map(renderMessage)}
        </ScrollView>

        {/* Input Bar */}
        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.inputIcon}>
            <Feather name="image" size={20} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.inputIcon}>
            <Feather name="camera" size={20} color={Colors.text} />
          </TouchableOpacity>
          
          <TextInput
            style={styles.textInput}
            placeholder="Message..."
            placeholderTextColor={Colors.gray}
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
          />
          
          <TouchableOpacity 
            style={[
              styles.sendButton,
              !newMessage.trim() && styles.sendButtonDisabled
            ]}
            onPress={sendMessage}
            disabled={!newMessage.trim()}
          >
            <Feather 
              name="send" 
              size={18} 
              color={newMessage.trim() ? Colors.white : Colors.gray} 
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  headerButton: {
    padding: 4,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  headerUsername: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    padding: 4,
  },
  keyboardAvoid: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  messageContainer: {
    marginBottom: 4,
  },
  incomingContainer: {
    alignItems: 'flex-start',
  },
  outgoingContainer: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    marginBottom: 2,
  },
  incomingBubble: {
    backgroundColor: Colors.lightGray,
  },
  outgoingBubble: {
    backgroundColor: Colors.primary,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  incomingText: {
    color: Colors.text,
  },
  outgoingText: {
    color: Colors.white,
  },
  timestamp: {
    fontSize: 11,
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  incomingTimestamp: {
    textAlign: 'left',
    color: Colors.gray,
  },
  outgoingTimestamp: {
    textAlign: 'right',
    color: Colors.gray,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
    backgroundColor: Colors.background,
  },
  inputIcon: {
    padding: 8,
    marginRight: 4,
  },
  textInput: {
    flex: 1,
    backgroundColor: Colors.lightGray,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    fontSize: 16,
    color: Colors.text,
    maxHeight: 100,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  sendButtonDisabled: {
    backgroundColor: Colors.lightGray,
  },
});

export default ChatScreen;