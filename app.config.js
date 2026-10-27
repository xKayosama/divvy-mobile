// Firebase's Android app configuration is supplied locally or as an EAS file variable.
// The FCM service-account private key belongs in EAS credentials, never this config.
module.exports = ({ config }) => {
  const googleServicesFile = process.env.GOOGLE_SERVICES_JSON || config.android?.googleServicesFile;
  if (process.env.EAS_BUILD_PLATFORM === "android" && !googleServicesFile) {
    throw new Error("Android push notifications require GOOGLE_SERVICES_JSON pointing to the Firebase google-services.json file. Configure it as an EAS development file environment variable before building.");
  }
  return {
    ...config,
    android: {
      ...config.android,
      ...(googleServicesFile ? { googleServicesFile } : {}),
    },
  };
};
