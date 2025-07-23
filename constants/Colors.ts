/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = '#171717';
const tintColorDark = '#E5E5E5';

export default {
  light: {
    text: '#171717',
    background: '#FFFFFF',
    tint: tintColorLight,
    tabIconDefault: '#737373',
    tabIconSelected: tintColorLight,
    inputBackground: '#e9e9e9',
    inputBorder: '#E5E5E5',
    cardBackground: '#e9e9e9', 
    placeholderBackground: '#e9e9e9',
    placeholderText: '#A3A3A3F7',
    deleteButton: '#525252',
    success: '#16A34A',
  },
  dark: {
    text: '#FAFAFA',
    background: '#171717',
    tint: tintColorDark,
    tabIconDefault: '#737373',
    tabIconSelected: tintColorDark,
    inputBackground: '#262626',
    inputBorder: '#404040',
    cardBackground: '#262626',
    placeholderBackground: '#262626',
    placeholderText: '#A3A3A3A6',
    deleteButton: '#A3A3A3',
    success: '#16A34A',
  },
};
