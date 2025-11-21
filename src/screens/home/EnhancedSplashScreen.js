// EnhancedSplashScreen.js
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

const EnhancedSplashScreen = ({ onAnimationComplete }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const pathRef = useRef(null);
  const appNameOpacity = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;

  // Path data for blob and backpack
  const initialBlob = "M120,60 C140,40 160,40 180,60 C200,80 200,100 180,120 C160,140 140,140 120,120 C100,100 100,80 120,60 Z";
  const backpackLogo = "M100,50 C120,30 180,30 200,50 C220,70 220,130 200,150 C180,170 120,170 100,150 C80,130 80,70 100,50 Z M130,60 L170,60 L170,90 L130,90 Z M140,150 L160,150 L160,170 L140,170 Z";

  // We'll simulate morphing by cross-fading between two paths
  const [currentPath, setCurrentPath] = React.useState(initialBlob);
  const [pathOpacity] = React.useState(new Animated.Value(1));
  const [nextPathOpacity] = React.useState(new Animated.Value(0));

  useEffect(() => {
    startAnimation();
  }, []);

  const startAnimation = () => {
    // Initial fade in
    Animated.timing(opacityAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    // Start morph animation after delay
    setTimeout(() => {
      morphAnimation();
    }, 800);
  };

  const morphAnimation = () => {
    // Phase 1: Scale up slightly
    Animated.sequence([
      // Scale up
      Animated.timing(scaleAnim, {
        toValue: 1.2,
        duration: 800,
        useNativeDriver: true,
      }),
      // Morph to backpack (change path)
      Animated.timing(pathOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Change to backpack path
      setCurrentPath(backpackLogo);
      
      // Phase 2: Scale bounce and fade in new path
      Animated.parallel([
        Animated.timing(pathOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.3,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        // Phase 3: Show app name and tagline
        Animated.parallel([
          Animated.timing(appNameOpacity, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(taglineOpacity, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]).start(() => {
          // Complete after delay
          setTimeout(() => {
            onAnimationComplete();
          }, 1000);
        });
      });
    });
  };

  return (
    <View style={styles.container}>
      <Animated.View 
        style={[
          styles.svgContainer,
          {
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          }
        ]}
      >
        <Svg width={280} height={280} viewBox="0 0 300 300">
          <Defs>
            <LinearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#667eea" stopOpacity="1" />
              <Stop offset="100%" stopColor="#764ba2" stopOpacity="1" />
            </LinearGradient>
          </Defs>

          <Path
            d={currentPath}
            fill="url(#gradient)"
            stroke="#ffffff"
            strokeWidth="2.5"
          />
        </Svg>
      </Animated.View>
      
      <View style={styles.textContainer}>
        <Animated.Text style={[styles.appName, { opacity: appNameOpacity }]}>
          Needify
        </Animated.Text>
        <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
          Your Needs, Delivered
        </Animated.Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  svgContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  appName: {
    fontSize: 36,
    fontWeight: '300',
    color: '#2d3748',
    letterSpacing: 1,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#718096',
    fontWeight: '400',
    letterSpacing: 2,
  },
});

export default EnhancedSplashScreen;