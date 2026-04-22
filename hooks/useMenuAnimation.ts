import { useRef, useState } from 'react';
import { Animated } from 'react-native';

export function useMenuAnimation() {
  const [isVisible, setIsVisible] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.95)).current;

  const open = () => {
    setIsVisible(true);
    Animated.parallel([
      Animated.spring(opacity, { toValue: 1, useNativeDriver: true, tension: 120, friction: 8 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 120, friction: 8 }),
    ]).start();
  };

  const close = (callback?: () => void) => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, useNativeDriver: true, duration: 150 }),
      Animated.timing(scale, { toValue: 0.95, useNativeDriver: true, duration: 150 }),
    ]).start(() => {
      setIsVisible(false);
      callback?.();
    });
  };

  return { isVisible, open, close, opacity, scale };
}
