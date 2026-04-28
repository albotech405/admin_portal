# AlboTax — Flutter Push Notifications Integration Guide

## Overview

Push notifications are implemented using **Firebase Cloud Messaging (FCM)**.  
The backend sends notifications via the FCM HTTP v1 API.  
Flutter receives them using the `firebase_messaging` package.

The notification system works in three app states:
- **Foreground** — app is open and visible
- **Background** — app is open but minimized
- **Terminated** — app is fully closed

---

## ⚠️ Important: Always Do a Full Rebuild

Any change involving Firebase config, native plugin setup, or `AndroidManifest.xml` / `Info.plist` **will NOT work with hot reload or hot restart**.

After every setup step in this guide, run:

```bash
flutter clean
flutter pub get
flutter run
```

This simulates a fresh install. Skipping this will make you think notifications are broken when they are not.

---

## Step 1 — Add Dependencies

In `pubspec.yaml`:

```yaml
dependencies:
  firebase_core: ^3.0.0
  firebase_messaging: ^15.0.0
  flutter_local_notifications: ^17.0.0   # for foreground notification banners on Android
```

Then run:

```bash
flutter pub get
```

---

## Step 2 — Firebase Project Setup

### Android

1. Go to [Firebase Console](https://console.firebase.google.com) → **albo-car-ride** project
2. **Project Settings** → **Your apps** → Add Android app (or select existing)
   - Package name: your app's `applicationId` from `android/app/build.gradle`
3. Download `google-services.json`
4. Place it at: `android/app/google-services.json`

In `android/build.gradle` (project level):
```gradle
buildscript {
  dependencies {
    classpath 'com.google.gms:google-services:4.4.2'
  }
}
```

In `android/app/build.gradle` (app level):
```gradle
apply plugin: 'com.google.gms.google-services'
```

### iOS

1. Firebase Console → **albo-car-ride** → Add iOS app (or select existing)
   - Bundle ID: your app's bundle ID from Xcode
2. Download `GoogleService-Info.plist`
3. In Xcode: drag `GoogleService-Info.plist` into the `Runner` folder (check "Copy items if needed")

**APNs setup** (required for iOS push notifications):
1. Apple Developer Portal → **Certificates, Identifiers & Profiles** → **Keys** → Create a new key
2. Enable **Apple Push Notifications service (APNs)**
3. Download the `.p8` key file
4. Firebase Console → **Project Settings** → **Cloud Messaging** → **Apple app configuration**
5. Upload the `.p8` key file, enter the Key ID and Team ID

In `ios/Runner/AppDelegate.swift`:
```swift
import UIKit
import Flutter
import Firebase

@UIApplicationMain
@objc class AppDelegate: FlutterAppDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    FirebaseApp.configure()
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
}
```

> **iOS Note**: Push notifications do NOT work on the iOS Simulator. You need a **physical device** and an Apple Developer account to test on iOS.

---

## Step 3 — Initialize Firebase in Flutter

In `main.dart`, initialize Firebase before `runApp`:

```dart
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';

// Top-level function — required for background message handling
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  // Handle background message if needed (optional — FCM shows the banner automatically)
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);
  runApp(const MyApp());
}
```

---

## Step 4 — Android Notification Channel

FCM on Android requires a notification channel. Create it on app startup (before anything else).

```dart
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

const AndroidNotificationChannel rideChannel = AndroidNotificationChannel(
  'albotax_rides',           // must match channel_id sent by backend
  'AlboTax Ride Alerts',
  description: 'Ride requests, offers, and trip updates',
  importance: Importance.max,
  playSound: true,
);

final FlutterLocalNotificationsPlugin flutterLocalNotificationsPlugin =
    FlutterLocalNotificationsPlugin();

Future<void> setupNotificationChannel() async {
  await flutterLocalNotificationsPlugin
      .resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin>()
      ?.createNotificationChannel(rideChannel);
}
```

Call `setupNotificationChannel()` in `main()` after `Firebase.initializeApp()`.

---

## Step 5 — Request Permission

```dart
Future<void> requestNotificationPermission() async {
  final messaging = FirebaseMessaging.instance;

  final settings = await messaging.requestPermission(
    alert: true,
    badge: true,
    sound: true,
    provisional: false,
  );

  if (settings.authorizationStatus == AuthorizationStatus.authorized) {
    print('Notification permission granted');
  } else {
    print('Notification permission denied');
  }
}
```

Call this **once**, right after the user logs in. Do not call it on every app open.

---

## Step 6 — Get FCM Token and Send to Backend

This is the critical step — the backend cannot send notifications until it has the user's token.

```dart
Future<void> registerFcmToken() async {
  final messaging = FirebaseMessaging.instance;

  // Get the current token
  final token = await messaging.getToken();
  if (token != null) {
    await _sendTokenToBackend(token);
  }

  // Listen for token refreshes — FCM may issue a new token at any time
  messaging.onTokenRefresh.listen((newToken) {
    _sendTokenToBackend(newToken);
  });
}

Future<void> _sendTokenToBackend(String token) async {
  try {
    await apiClient.put(
      '/user/fcm-token',
      data: {'token': token},
    );
    print('FCM token registered with backend');
  } catch (e) {
    print('Failed to register FCM token: $e');
    // Non-critical — user won't get push notifications until next app open
  }
}
```

**When to call `registerFcmToken()`:**
- After a successful login / session restore
- Do NOT call before the user is authenticated (the endpoint requires a JWT)

---

## Step 7 — Handle Incoming Notifications

### Foreground (app is open)

FCM does NOT show a banner automatically when the app is in the foreground.  
Use `flutter_local_notifications` to show it manually:

```dart
void setupForegroundNotificationHandler() {
  FirebaseMessaging.onMessage.listen((RemoteMessage message) {
    final notification = message.notification;
    final android = message.notification?.android;

    if (notification != null && android != null) {
      flutterLocalNotificationsPlugin.show(
        notification.hashCode,
        notification.title,
        notification.body,
        NotificationDetails(
          android: AndroidNotificationDetails(
            rideChannel.id,
            rideChannel.name,
            channelDescription: rideChannel.description,
            importance: Importance.max,
            priority: Priority.high,
            icon: '@mipmap/ic_launcher',
          ),
        ),
      );
    }

    // Also handle the data payload immediately (update UI, refresh state)
    _handleNotificationData(message.data);
  });
}
```

### Background / Terminated (app tap)

When the user taps a notification to open the app:

```dart
void setupNotificationTapHandlers() {
  // App was in background and user tapped notification
  FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
    _navigateFromNotification(message.data);
  });

  // App was terminated — check if it was launched from a notification tap
  FirebaseMessaging.instance.getInitialMessage().then((message) {
    if (message != null) {
      _navigateFromNotification(message.data);
    }
  });
}
```

---

## Step 8 — Navigation from Notification Data

The backend sends a `type` field in every notification's `data` payload.  
Use it to navigate to the right screen:

```dart
void _navigateFromNotification(Map<String, dynamic> data) {
  final type = data['type'] as String?;
  if (type == null) return;

  switch (type) {
    // --- DRIVER SCREENS ---
    case 'new_ride_request':
      // Navigate to the driver's ride requests list
      // data['request_id'] available
      navigatorKey.currentState?.pushNamed('/driver/requests');
      break;

    case 'offer_accepted':
      // Navigate to the active ride screen
      // data['ride_id'] available
      navigatorKey.currentState?.pushNamed('/driver/active-ride',
          arguments: data['ride_id']);
      break;

    case 'offer_rejected':
      // Navigate back to the ride request so driver can re-offer
      // data['request_id'] available
      navigatorKey.currentState?.pushNamed('/driver/requests');
      break;

    case 'request_closed':
      // Ride was taken or cancelled — go home
      navigatorKey.currentState?.pushNamedAndRemoveUntil('/driver/home', (_) => false);
      break;

    case 'topup_approved':
    case 'topup_rejected':
      // Navigate to wallet screen
      // data['amount'], data['new_balance'] available
      navigatorKey.currentState?.pushNamed('/driver/wallet');
      break;

    case 'account_approved':
      // Driver account approved — prompt to go online
      navigatorKey.currentState?.pushNamed('/driver/home');
      break;

    case 'account_suspended':
      // Driver account suspended
      navigatorKey.currentState?.pushNamed('/driver/account');
      break;

    // --- CUSTOMER SCREENS ---
    case 'driver_offer':
      // New offer on customer's request
      // data['request_id'], data['response_id'] available
      navigatorKey.currentState?.pushNamed('/customer/offers',
          arguments: data['request_id']);
      break;

    case 'driver_arrived':
      // Driver at pickup point
      // data['ride_id'] available
      navigatorKey.currentState?.pushNamed('/customer/active-ride',
          arguments: data['ride_id']);
      break;

    case 'ride_started':
    case 'ride_completed':
    case 'ride_cancelled':
      // data['ride_id'] available. For ride_completed, data['prompt_rating'] == 'true'
      navigatorKey.currentState?.pushNamed('/customer/active-ride',
          arguments: data['ride_id']);
      break;
  }
}

void _handleNotificationData(Map<String, dynamic> data) {
  // Same as above but for foreground — may want to show an in-app toast
  // instead of navigating immediately to avoid interrupting the user
  final type = data['type'] as String?;
  if (type == null) return;

  // Example: refresh the offers list if we're already on that screen
  // Use your state management (Provider / Riverpod / Bloc) to trigger a refresh
}
```

> **Note**: All `data` payload values are strings. If you need to compare booleans (e.g. `prompt_rating`), check `data['prompt_rating'] == 'true'`.

---

## Step 9 — Wire Everything Up

In your app's initialization (after login / session restore):

```dart
Future<void> initializeNotifications() async {
  await setupNotificationChannel();       // Step 4
  await requestNotificationPermission();  // Step 5
  await registerFcmToken();               // Step 6
  setupForegroundNotificationHandler();   // Step 7
  setupNotificationTapHandlers();         // Step 7
}
```

Call `initializeNotifications()` once after the user is authenticated.

---

## Backend API Reference

### Register / Refresh FCM Token

```
PUT /api/v1/user/fcm-token
Authorization: Bearer <jwt>
Content-Type: application/json

{ "token": "<fcm_device_token>" }
```

Response:
```json
{ "success": true }
```

Call this:
- After login
- Whenever `onTokenRefresh` fires

---

## Data Payload Reference

All notifications include a `data` map. Values are always **strings**.

| `type` | Extra fields | Who receives it |
|---|---|---|
| `new_ride_request` | `request_id` | Driver |
| `driver_offer` | `request_id`, `response_id` | Customer |
| `offer_accepted` | `ride_id` | Driver |
| `offer_rejected` | `request_id`, `response_id` | Driver |
| `request_closed` | `request_id` | Driver |
| `driver_arrived` | `ride_id` | Customer |
| `ride_started` | `ride_id` | Customer |
| `ride_completed` | `ride_id`, `prompt_rating` (`"true"`) | Customer |
| `ride_cancelled` | `ride_id` | Both |
| `topup_approved` | `amount`, `new_balance` | Driver |
| `topup_rejected` | `amount`, `reason` | Driver |
| `account_approved` | — | Driver |
| `account_suspended` | — | Driver |

---

## Troubleshooting

**Notifications not received at all**
- Did you call `PUT /user/fcm-token` after login? Check network logs.
- Did you do a full rebuild (`flutter clean && flutter run`) after adding Firebase files?
- On Android: check that `google-services.json` is in `android/app/` (not `android/`)
- On iOS: is the `.p8` APNs key uploaded in Firebase Console?

**Notifications received in background but not foreground**
- This is expected — you need `flutter_local_notifications` to show banners in foreground (Step 4 & 7)

**Notifications work on Android but not iOS**
- APNs key is likely missing or misconfigured (Firebase Console → Project Settings → Cloud Messaging → Apple app configuration)
- iOS Simulator does NOT support push notifications — test on a real device

**Token registered but no notification delivered**
- Check backend logs for `[FCM]` lines — they show success/failure per send
- The token may be stale. Re-login to force a fresh `getToken()` call.

**`getInitialMessage()` always returns null**
- This only returns a value when the app was launched by tapping a notification while it was fully terminated. It requires a real notification, not a test from the Firebase Console (use the backend to trigger a real one).
