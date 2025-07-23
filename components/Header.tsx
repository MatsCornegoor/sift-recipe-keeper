import { View, Text, Pressable, StyleSheet, Platform, Image, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../hooks/useTheme';

type HeaderProps = {
  title: string;
  showBack?: boolean;
  showLogo?: boolean;
  rightElement?: React.ReactNode;
};

export default function Header({ title, showBack = true, showLogo = false, rightElement }: HeaderProps) {
  const navigation = useNavigation();
  const { colors, colorScheme } = useTheme();

  return (
    <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.inputBorder }]}>
      <View style={styles.leftContainer}>
        {showBack && (
          <Pressable
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [
              styles.backButton,
              { opacity: pressed ? 0.7 : 1 }
            ]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={28} color={colors.tint} />
          </Pressable>
        )}
      </View>

      {showLogo ? (
        <Image
          source={colorScheme === 'dark' 
            ? require('../assets/images/logo.png')
            : require('../assets/images/logo-dark.png')
          }
          style={styles.logo}
          resizeMode="contain"
        />
      ) : (
        <Text 
          style={[styles.title, { color: colors.text }]}
          numberOfLines={1}
        >
          {title}
        </Text>
      )}

      <View style={styles.rightContainer}>
        {rightElement}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: Platform.OS === 'ios' ? 44 : 56,
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 0 : 0,
    },
    leftContainer: {
        flex: 1,
        alignItems: 'flex-start',
    },
    rightContainer: {
        flex: 1,
        alignItems: 'flex-end',
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        flex: 2,
        textAlign: 'center',
    },
    backButton: {
        marginLeft: -8,
    },
    logo: {
        height: 30,
        width: 100,
        flex: 2,
        marginTop: 10,
    },
}); 