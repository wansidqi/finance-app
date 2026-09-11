// app.json was a static file, but the development build needs its own
// Android package name (distinct from preview/production) so both can be
// installed on the same device at once — hence a config function keyed off
// APP_VARIANT (set per build profile in eas.json) instead.
const IS_DEV = process.env.APP_VARIANT === "development";

module.exports = {
  expo: {
    name: IS_DEV ? "Zakat Tracker (Dev)" : "Zakat Tracker",
    slug: "zakat-tracker",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/zakat.png",
    scheme: IS_DEV ? "zakattrackerdev" : "zakattracker",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: IS_DEV ? "com.lumvyr.zakattracker.dev" : "com.lumvyr.zakattracker",
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/zakat.png",
        backgroundImage: "./assets/images/zakat.png",
        monochromeImage: "./assets/images/zakat.png",
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: IS_DEV ? "com.lumvyr.zakattracker.dev" : "com.lumvyr.zakattracker",
    },
    web: {
      output: "static",
      favicon: "./assets/images/zakat.png",
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/zakat.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#05060f",
          dark: {
            backgroundColor: "#05060f",
          },
        },
      ],
      [
        "expo-notifications",
        {
          icon: "./assets/images/android-icon-monochrome.png",
          color: "#663af3",
        },
      ],
      "expo-background-task",
      "expo-sqlite",
      "expo-secure-store",
      "@react-native-google-signin/google-signin",
      [
        "expo-image-picker",
        {
          photosPermission: "Allow Finance App to access your photos to attach receipts.",
          cameraPermission: "Allow Finance App to use your camera to photograph receipts.",
        },
      ],
      [
        "expo-location",
        {
          locationWhenInUsePermission:
            "Allow Finance App to use your location to detect your state, so Zakat nisab can use your state's official rate.",
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    owner: "wansidqi",
    extra: {
      router: {},
      eas: {
        projectId: "677db663-3760-405d-a2ba-ea6a348cc622",
      },
    },
  },
};
