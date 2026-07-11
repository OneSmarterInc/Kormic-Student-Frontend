# Kormic Student Frontend

React Native / Expo onboarding application for the Kormic Student mobile app.

## Native Identity And Liveness

The liveness module uses `react-native-vision-camera` plus `react-native-vision-camera-face-detector` for on-device ML Kit face detection in a custom native build. Expo Go is not sufficient for this feature because the camera, Nitro, and ML Kit detector are native modules.

No biometric imagery is persisted by this module. The Phase 2 liveness implementation consumes live frame-derived face geometry and eye-open probabilities on device, then discards them. It does not store raw frames, photographs, video, face geometry, or eye probabilities, and it does not upload camera data.

Device Face ID or fingerprint setup remains optional and is only used to authenticate access on the current device. It is not face matching and is not identity proof.

## Native Build Requirements

- Use a custom Expo development build for iOS and Android.
- Physical-device testing is mandatory for liveness. Some iOS simulator/ML Kit combinations do not support the native detector reliably.
- Microphone permission is intentionally disabled.

## Useful Commands

```bash
npm.cmd install
npm.cmd run typecheck
npm.cmd test
npm.cmd run lint
npm.cmd run android
npm.cmd run ios
```
