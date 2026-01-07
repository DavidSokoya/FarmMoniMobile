## FarmMoni  
[View Project](#)

[![FarmMoni App](https://via.placeholder.com/800x400.png?text=FarmMoni+App+Demo+GIF)](#)

A digital agriculture platform that allows users to securely invest in verified farm cycles and track their returns. **FarmMoni** bridges the gap between everyday investors and high-yield agricultural opportunities in Nigeria.

---

## Technologies Used
- **React Native**
- **JavaScript**
- **Firebase** (Authentication, Firestore, Role Management)

---

## Access Control (User & Admin)
The application supports both **User** and **Admin** interfaces.

- By default, users can access the **User interface** after authentication.
- To access the **Admin interface**, the user role must be updated to `admin` directly in **Firebase**.
- Once the role is changed, the application automatically grants access to admin-specific features on the next login or app refresh.

---

## Optimizations
One major area for optimization was the application binary size. I implemented an **Android App Bundle (AAB)** workflow for production to reduce user download size from ~80MB to ~25MB. I also optimized the asset loading strategy by compressing splash imagery and using **Hermes** as the JavaScript engine to improve startup time on lower-end Android devices.

### Future Optimization
One key optimization planned for the future is to **refactor the codebase** to improve maintainability, scalability, and readability. This refactoring would include better component abstraction, cleaner state management, and improved separation of concerns across the application.

---

## Lessons Learned
Handling **Native vs Custom Splash Screens** was a key challenge. I learned how to synchronize the native `app.json` background color with the React Native animation layer to prevent the *“white flash”* glitch. Additionally, I moved from standard `.env` files to `EXPO_PUBLIC_` variables to ensure secure injection of API keys into the native build process during **EAS builds**.

---

## Installation
```bash
git clone <repo-url>
npm install


### Environment Setup
Create a `.env` file and add your `EXPO_PUBLIC_FIREBASE_` keys.

```bash
npx expo prebuild

```bash
npx expo start -c
Scan the QR code with Expo Go (iOS)

Or install the APK (Android)