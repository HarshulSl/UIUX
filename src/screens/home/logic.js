// src/utils/authLogic.js
import { supabase } from '../../supabase';
export const createProfileIfNotExists = async (user) => {
  try {
    // Check if profile already exists
    const { data: existingProfiles, error: fetchError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .limit(1);

    if (fetchError) {
      console.error('Error checking existing profile:', fetchError.message);
      throw fetchError;
    }

    // If profile exists, do nothing
    if (existingProfiles && existingProfiles.length > 0) {
      return existingProfiles[0];
    }

    // If profile doesn't exist, create it
    const { data, error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email,
        name: null,
        phone: null
      })
      .select()
      .single(); // return single row

    if (insertError) {
      console.error('Error creating profile:', insertError.message);
      throw insertError;
    }

    return data;
  } catch (error) {
    console.error('createProfileIfNotExists exception:', error);
    throw error;
  }
};

export const signInWithEmail = async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password,
    });

    if (error) {
      console.error('Sign in error:', error.message);
      throw new Error(getAuthErrorMessage(error));
    }
    if (data.user) {
      await createProfileIfNotExists(data.user);
    }
    return {
      success: true,
      data: data,
      user: data.user,
      session: data.session
    };
  } catch (error) {
    console.error('Sign in exception:', error);
    throw error;
  }
};

export const signUpWithEmail = async (email, password, userData = {}) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: password,
      options: {
        data: userData
      }
    });

    if (error) {
      console.error('Sign up error:', error.message);
      throw new Error(getAuthErrorMessage(error));
    }

    return {
      success: true,
      data: data,
      user: data.user,
      session: data.session
    };
  } catch (error) {
    console.error('Sign up exception:', error);
    throw error;
  }
};

export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Sign out error:', error);
    throw error;
  }
};

export const resetPassword = async (email) => {
  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: 'needify://reset-password', // Adjust based on your deep link setup
    });

    if (error) {
      console.error('Password reset error:', error.message);
      throw new Error(getAuthErrorMessage(error));
    }

    return {
      success: true,
      data: data
    };
  } catch (error) {
    console.error('Password reset exception:', error);
    throw error;
  }
};

export const updatePassword = async (newPassword) => {
  try {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      console.error('Update password error:', error.message);
      throw new Error(getAuthErrorMessage(error));
    }

    return {
      success: true,
      data: data,
      user: data.user
    };
  } catch (error) {
    console.error('Update password exception:', error);
    throw error;
  }
};

export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) throw error;
    return user;
  } catch (error) {
    console.error('Get current user error:', error);
    throw error;
  }
};

export const getSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) throw error;
    return session;
  } catch (error) {
    console.error('Get session error:', error);
    throw error;
  }
};

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password) => {
  return password.length >= 6;
};

export const getAuthErrorMessage = (error) => {
  const errorMap = {
    'Invalid login credentials': 'Invalid email or password. Please try again.',
    'Email not confirmed': 'Please verify your email address before signing in.',
    'User already registered': 'An account with this email already exists.',
    'Weak password': 'Password should be at least 6 characters long.',
    'Invalid email': 'Please enter a valid email address.',
    'Too many requests': 'Too many attempts. Please try again later.',
  };

  return errorMap[error.message] || error.message || 'An unexpected error occurred.';
};

// Social Auth Providers (Optional - if you want to add later)
export const signInWithGoogle = async () => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Google sign in error:', error);
    throw error;
  }
};

export const signInWithApple = async () => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Apple sign in error:', error);
    throw error;
  }
};

// Auth state listener helper
export const onAuthStateChange = (callback) => {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
};

// Profile management functions
export const updateUserProfile = async (updates) => {
  try {
    const { data, error } = await supabase.auth.updateUser({
      data: updates
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Update profile error:', error);
    throw error;
  }
};

export const deleteAccount = async () => {
  try {
    const { error } = await supabase.auth.admin.deleteUser(
      (await supabase.auth.getUser()).data.user.id
    );
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Delete account error:', error);
    throw error;
  }
};