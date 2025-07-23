import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';

type ContentWrapperProps = {
  children: React.ReactNode;
  fullWidth?: boolean;
};

export default function ContentWrapper({ children, fullWidth = false }: ContentWrapperProps) {
  return (
    <View style={[
      styles.centerContainer,
      Platform.select({
        web: { minHeight: '100%' },
      })
    ]}>
      <View style={[
        styles.container, 
        fullWidth && styles.fullWidth,
        Platform.select({
          web: styles.webContainer,
        })
      ]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    width: '100%',
    ...Platform.select({
      web: {
        minHeight: '100%',
        overflow: 'visible'
      },
      default: {
        overflow: 'visible'
      }
    }),
    backgroundColor: Platform.OS === 'web' ? 'transparent' : undefined,
  },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: 900,
    // paddingHorizontal: 16,
  },
  webContainer: {
    alignSelf: 'center',
  },
  fullWidth: {
    maxWidth: undefined,
    paddingHorizontal: 0,
  },
}); 