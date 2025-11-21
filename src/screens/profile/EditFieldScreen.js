// src/screens/profile/EditFieldScreen.js
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  SafeAreaView, 
  StatusBar, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform,
  Alert,
  Animated,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { supabase } from '../../supabase';

// Define supported fields with their configurations
const FIELD_CONFIG = {
  Name: {
    placeholder: 'Enter your full name',
    description: 'Help people discover your account by using the name you\'re known by: either your full name, nickname, or business name.',
    keyboardType: 'default',
    maxLength: 50,
    autoCapitalize: 'words',
    validate: (value) => {
      if (!value.trim()) return 'Name cannot be empty';
      if (/^\s/.test(value)) return 'Name cannot start with a space';
      if (/^[0-9]/.test(value)) return 'Name cannot start with a number';
      if (/^[^a-zA-Z]/.test(value)) return 'Name cannot start with a special character';
      if (!/^[a-zA-Z\s.'-]+$/.test(value)) return 'Name can only contain letters, spaces, apostrophes, hyphens, and periods';
      if (value.length < 2) return 'Name must be at least 2 characters long';
      if (value.length > 50) return 'Name cannot exceed 50 characters';
      return '';
    }
  },
  Username: {
    placeholder: 'Choose a unique username (6-20 characters)',
    description: 'Your username must be unique and between 6-20 characters. Use letters, numbers, underscores, or periods.',
    keyboardType: 'default',
    maxLength: 20,
    autoCapitalize: 'none',
    validate: async (value, currentUsername = '') => {
      // Basic validation
      if (!value.trim()) return 'Username cannot be empty';
      if (value.length < 6) return 'Username must be at least 6 characters long';
      if (value.length > 20) return 'Username cannot exceed 20 characters';
      if (/^[0-9]/.test(value)) return 'Username cannot start with a number';
      if (!/^[a-zA-Z0-9_.]+$/.test(value)) return 'Username can only contain letters, numbers, underscores, and periods';
      if (/_{2,}/.test(value)) return 'Username cannot have consecutive underscores';
      if (/\.{2,}/.test(value)) return 'Username cannot have consecutive periods';
      if (/^[_.]|[_.]$/.test(value)) return 'Username cannot start or end with underscore or period';
      
      // Check if username is the same as current (no change)
      if (value.toLowerCase() === currentUsername.toLowerCase()) {
        return ''; // No error if same as current username
      }
      
      // Advanced uniqueness check with similarity search
      const uniquenessResult = await checkUsernameUniqueness(value);
      if (!uniquenessResult.isUnique) {
        if (uniquenessResult.similarUsernames.length > 0) {
          return `Username taken. Similar: ${uniquenessResult.similarUsernames.slice(0, 3).join(', ')}`;
        }
        return 'Username is already taken';
      }
      
      return '';
    }
  },
  Phone: {
    placeholder: 'Enter 10-digit phone number',
    description: 'Add or update your phone number. This will be used for account verification and important notifications.',
    keyboardType: 'phone-pad',
    maxLength: 10,
    autoCapitalize: 'none',
    validate: (value) => {
      if (!value.trim()) return 'Phone number cannot be empty';
      
      // Remove any non-digit characters for validation
      const cleanNumber = value.replace(/\D/g, '');
      
      if (cleanNumber.length !== 10) return 'Phone number must be exactly 10 digits';
      if (!/^\d+$/.test(cleanNumber)) return 'Phone number can only contain numbers';
      
      // Validate it's a proper 10-digit number (not starting with 0)
      if (!/^[1-9]\d{9}$/.test(cleanNumber)) return 'Please enter a valid 10-digit phone number';
      
      return '';
    },
    format: (value) => {
      // Only allow digits and limit to 10 characters
      const cleanNumber = value.replace(/\D/g, '').slice(0, 10);
      return cleanNumber;
    }
  },
  Bio: {
    placeholder: 'Tell us about yourself...',
    description: 'Tell your story with a bio. You can mention your interests, hobbies, or what you do.',
    keyboardType: 'default',
    maxLength: 150,
    autoCapitalize: 'sentences',
    validate: (value) => {
      if (value.length > 150) return 'Bio cannot exceed 150 characters';
      return '';
    }
  },
  Website: {
    placeholder: 'https://yourwebsite.com',
    description: 'Add a link to your website, blog, or social media profile.',
    keyboardType: 'url',
    maxLength: 200,
    autoCapitalize: 'none',
    validate: (value) => {
      if (value && !/^https?:\/\//i.test(value)) {
        return 'Website should start with http:// or https://';
      }
      if (value.length > 200) return 'Website URL too long';
      return '';
    }
  },
  Gender: {
    placeholder: 'Select your gender',
    description: 'Select your gender. This information won\'t be displayed on your public profile.',
    keyboardType: 'default',
    maxLength: 50,
    autoCapitalize: 'words',
    validate: () => '' // Optional field, no strict validation
  }
};

// Advanced username similarity and uniqueness check
const checkUsernameUniqueness = async (username) => {
  try {
    const lowercaseUsername = username.toLowerCase();
    
    // First, check exact match
    const { data: exactMatch, error: exactError } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', lowercaseUsername)
      .maybeSingle();

    if (exactError) {
      console.error('Error checking exact username:', exactError);
      return { isUnique: false, similarUsernames: [] };
    }

    if (exactMatch) {
      return { isUnique: false, similarUsernames: [exactMatch.username] };
    }

    // If no exact match, check for similar usernames using multiple strategies
    const similarUsernames = await findSimilarUsernames(lowercaseUsername);
    
    return {
      isUnique: similarUsernames.length === 0,
      similarUsernames: similarUsernames
    };

  } catch (err) {
    console.error('Unexpected error checking username:', err);
    return { isUnique: false, similarUsernames: [] };
  }
};

// Find similar usernames using multiple search strategies
const findSimilarUsernames = async (username) => {
  try {
    const strategies = [
      // Strategy 1: Levenshtein distance (similar spelling)
      `username <-> '${username}'`,
      
      // Strategy 2: Contains the username
      `username ilike '%${username}%'`,
      
      // Strategy 3: Starts with similar pattern
      `username ilike '${username.slice(0, 4)}%'`,
      
      // Strategy 4: Soundex/phonetic similarity (if supported)
      // Note: This requires Postgres extensions like fuzzystrmatch
      // `difference(username, '${username}') >= 2`,
      
      // Strategy 5: Common variations (underscores vs no underscores)
      `replace(username, '_', '') = '${username.replace(/_/g, '')}'`,
      
      // Strategy 6: Common number additions
      `username ~ '^${username}[0-9]{1,3}$'`,
    ];

    const similarResults = [];
    
    // Execute each search strategy
    for (const strategy of strategies) {
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .or(strategy)
        .limit(5);

      if (!error && data) {
        data.forEach(profile => {
          if (!similarResults.includes(profile.username)) {
            similarResults.push(profile.username);
          }
        });
      }
    }

    // Remove duplicates and limit results
    const uniqueSimilar = [...new Set(similarResults)].slice(0, 5);
    
    // Sort by similarity score (you can implement more sophisticated scoring)
    return uniqueSimilar.sort((a, b) => {
      const scoreA = calculateSimilarityScore(username, a);
      const scoreB = calculateSimilarityScore(username, b);
      return scoreB - scoreA; // Higher score first
    });

  } catch (err) {
    console.error('Error finding similar usernames:', err);
    return [];
  }
};

// Calculate similarity score between two usernames
const calculateSimilarityScore = (username1, username2) => {
  const str1 = username1.toLowerCase();
  const str2 = username2.toLowerCase();
  
  // Exact match
  if (str1 === str2) return 100;
  
  // Contains match
  if (str2.includes(str1) || str1.includes(str2)) return 80;
  
  // Common prefix
  if (str2.startsWith(str1.slice(0, 4)) || str1.startsWith(str2.slice(0, 4))) return 60;
  
  // Levenshtein distance (simplified)
  const distance = levenshteinDistance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);
  const similarity = ((maxLength - distance) / maxLength) * 100;
  
  return Math.max(similarity, 0);
};

// Levenshtein distance calculation for string similarity
const levenshteinDistance = (str1, str2) => {
  const matrix = Array(str2.length + 1).fill(null).map(() => 
    Array(str1.length + 1).fill(null)
  );

  for (let i = 0; i <= str1.length; i++) {
    matrix[0][i] = i;
  }

  for (let j = 0; j <= str2.length; j++) {
    matrix[j][0] = j;
  }

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }

  return matrix[str2.length][str1.length];
};

// Generate username suggestions based on input
const generateUsernameSuggestions = async (baseUsername) => {
  const suggestions = [];
  const base = baseUsername.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  if (base.length < 6) return suggestions;
  
  // Strategy 1: Add numbers
  for (let i = 1; i <= 5; i++) {
    suggestions.push(`${base}${i}`);
  }
  
  // Strategy 2: Add common suffixes
  const suffixes = ['_', 'official', 'real', 'true', 'the'];
  suffixes.forEach(suffix => {
    suggestions.push(`${base}_${suffix}`);
  });
  
  // Strategy 3: Remove numbers and try variations
  const withoutNumbers = base.replace(/[0-9]/g, '');
  if (withoutNumbers.length >= 6 && withoutNumbers !== base) {
    suggestions.push(withoutNumbers);
  }
  
  // Check which suggestions are available
  const availableSuggestions = [];
  
  for (const suggestion of suggestions.slice(0, 10)) {
    const isUnique = await checkUsernameUniqueness(suggestion);
    if (isUnique.isUnique) {
      availableSuggestions.push(suggestion);
      if (availableSuggestions.length >= 3) break;
    }
  }
  
  return availableSuggestions;
};

const EditFieldScreen = ({ navigation, route }) => {
  const { field, value, onSave } = route.params;

  // Validate field is supported
  if (!FIELD_CONFIG[field]) {
    console.error(`Unsupported field: ${field}`);
    navigation.goBack();
    return null;
  }

  const config = FIELD_CONFIG[field];
  const [fieldValue, setFieldValue] = useState(value || '');
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState('');
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [usernameSuggestions, setUsernameSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const validationTimeoutRef = useRef(null);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, []);

  const handleFieldChange = async (text) => {
    let formattedText = text;
    
    // Apply formatting for phone number
    if (field === 'Phone' && config.format) {
      formattedText = config.format(text);
    }
    
    setFieldValue(formattedText);
    setShowSuggestions(false);
    
    // Clear previous timeout
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }
    
    // Clear error immediately
    if (error) setError('');
    
    // Debounced validation for username (check after user stops typing)
    if (field === 'Username' && formattedText.trim() && formattedText !== value) {
      setIsCheckingUsername(true);
      
      validationTimeoutRef.current = setTimeout(async () => {
        try {
          const validationError = await config.validate(formattedText, value);
          if (validationError) {
            setError(validationError);
            // Generate suggestions if username is taken
            if (validationError.includes('Username taken') || validationError.includes('already taken')) {
              const suggestions = await generateUsernameSuggestions(formattedText);
              setUsernameSuggestions(suggestions);
              setShowSuggestions(suggestions.length > 0);
            }
          } else {
            setUsernameSuggestions([]);
            setShowSuggestions(false);
          }
        } catch (err) {
          console.error('Validation error:', err);
          setError('Error checking username availability');
        } finally {
          setIsCheckingUsername(false);
        }
      }, 800); // 800ms debounce for better performance
    } else if (field !== 'Username') {
      // Immediate validation for other fields
      const validationError = config.validate(formattedText);
      if (validationError) {
        setError(validationError);
      }
    }
  };

  const handleSuggestionSelect = (suggestion) => {
    setFieldValue(suggestion);
    setShowSuggestions(false);
    setUsernameSuggestions([]);
    setError('');
  };

  const handleSave = async () => {
    setIsValidating(true);
    
    try {
      let validationError = '';
      
      if (field === 'Username') {
        // For username, do a final uniqueness check
        validationError = await config.validate(fieldValue, value);
      } else {
        validationError = config.validate(fieldValue);
      }
      
      if (validationError) {
        setError(validationError);
        setIsValidating(false);
        return;
      }

      if (onSave) {
        // For phone number, save the cleaned version (digits only)
        let valueToSave = fieldValue.trim();
        if (field === 'Phone') {
          valueToSave = fieldValue.replace(/\D/g, ''); // Remove non-digit characters
        }
        onSave(valueToSave);
      }
      navigation.goBack();
    } catch (err) {
      console.error('Save error:', err);
      setError('Error saving changes');
    } finally {
      setIsValidating(false);
    }
  };

  // Check if save button should be enabled
  const isSaveDisabled = !!error || fieldValue.trim() === (value || '') || isCheckingUsername || isValidating;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
            <Ionicons name="close" size={28} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{field}</Text>
          <TouchableOpacity 
            onPress={handleSave} 
            disabled={isSaveDisabled} 
            style={[styles.headerButton, isSaveDisabled && styles.disabledButton]}
          >
            {isValidating ? (
              <ActivityIndicator size="small" color={Colors.gray} />
            ) : (
              <Text style={[styles.saveButton, isSaveDisabled && styles.saveButtonDisabled]}>
                Save
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>{field}</Text>
              <View style={[
                styles.inputWrapper, 
                focused && styles.inputFocused, 
                error && styles.inputError,
                isCheckingUsername && styles.inputChecking
              ]}>
                <TextInput
                  style={[styles.input, field === 'Bio' && styles.bioInput]}
                  value={fieldValue}
                  onChangeText={handleFieldChange}
                  autoFocus
                  multiline={field === 'Bio'}
                  numberOfLines={field === 'Bio' ? 4 : 1}
                  placeholder={config.placeholder}
                  placeholderTextColor={Colors.gray}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  keyboardType={config.keyboardType}
                  maxLength={config.maxLength}
                  autoCapitalize={config.autoCapitalize}
                  textAlignVertical={field === 'Bio' ? 'top' : 'center'}
                  returnKeyType="done"
                />
                {isCheckingUsername && (
                  <View style={styles.checkingIndicator}>
                    <ActivityIndicator size="small" color={Colors.primary} />
                  </View>
                )}
              </View>
              
              {/* Error or status message */}
              <View style={styles.messageContainer}>
                {error ? (
                  <Text style={styles.errorText}>{error}</Text>
                ) : isCheckingUsername ? (
                  <Text style={styles.checkingText}>Checking availability...</Text>
                ) : field === 'Username' && fieldValue && fieldValue !== value && !error ? (
                  <Text style={styles.availableText}>✓ Username available!</Text>
                ) : null}
              </View>
              
              {/* Username Suggestions */}
              {showSuggestions && usernameSuggestions.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  <Text style={styles.suggestionsTitle}>Try these available usernames:</Text>
                  {usernameSuggestions.map((suggestion, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.suggestionItem}
                      onPress={() => handleSuggestionSelect(suggestion)}
                    >
                      <Ionicons name="sparkles" size={16} color={Colors.primary} />
                      <Text style={styles.suggestionText}>{suggestion}</Text>
                      <Ionicons name="chevron-forward" size={16} color={Colors.gray} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              
              {/* Character count */}
              {(field === 'Bio' || field === 'Phone' || field === 'Username') && (
                <Text style={[
                  styles.charCount,
                  field === 'Username' && fieldValue.length < 6 && styles.charCountWarning
                ]}>
                  {field === 'Phone' 
                    ? `${fieldValue.replace(/\D/g, '').length}/10 digits` 
                    : `${fieldValue.length}/${config.maxLength} characters`
                  }
                  {field === 'Username' && fieldValue.length > 0 && fieldValue.length < 6 && 
                    ` (minimum ${6 - fieldValue.length} more)`
                  }
                </Text>
              )}
            </View>
            
            <Text style={styles.description}>
              {config.description}
            </Text>
          </Animated.View>
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
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  content: {
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
    backgroundColor: Colors.white,
  },
  headerButton: {
    padding: 4,
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  saveButton: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonDisabled: {
    color: Colors.gray,
  },
  inputContainer: {
    marginBottom: 24,
    width: '100%',
  },
  inputLabel: {
    fontWeight: '600',
    marginBottom: 12,
    color: Colors.text,
    fontSize: 16,
  },
  inputWrapper: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.lightGray,
    paddingHorizontal: 16,
    shadowColor: Colors.lightGray,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputFocused: {
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOpacity: 0.2,
    elevation: 3,
  },
  inputError: {
    borderColor: Colors.error,
  },
  inputChecking: {
    borderColor: Colors.warning,
  },
  input: {
    fontSize: 16,
    color: Colors.text,
    paddingVertical: 16,
    flex: 1,
  },
  bioInput: {
    height: 120,
    textAlignVertical: 'top',
  },
  checkingIndicator: {
    marginLeft: 8,
  },
  messageContainer: {
    minHeight: 20,
    marginTop: 8,
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
  },
  checkingText: {
    color: Colors.warning,
    fontSize: 14,
  },
  availableText: {
    color: Colors.success,
    fontSize: 14,
    fontWeight: '500',
  },
  suggestionsContainer: {
    marginTop: 16,
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.lightGray,
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  suggestionText: {
    flex: 1,
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
    marginLeft: 8,
    marginRight: 8,
  },
  charCount: {
    color: Colors.gray,
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  charCountWarning: {
    color: Colors.warning,
  },
  description: {
    color: Colors.darkGray,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
  },
});

export default EditFieldScreen;