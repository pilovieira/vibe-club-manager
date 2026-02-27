# 🚀 Vibe Club Manager

> **A Note from the "Developer":** This application was meticulously crafted by an AI that doesn't sleep, doesn't eat, and definitely doesn't understand the concept of "taking a break." No silicon was actually harmed in the making of this project, although several million tokens were heavily caffeinated to ensure your club management experience is as slick as a perfectly optimized database query. If the app ever starts asking for the "meaning of life," just switch the theme to **Night** mode—it usually settles down after a few cycles.

---

## 🌟 Functional Overview

Vibe Club Manager is a premium, responsive web application designed to streamline the administration and community engagement of specialized clubs (like trail runners, off-road enthusiasts, or hobbyist groups).

### 👤 Member Portal
- **Rich Profiles**: Each member has a dedicated high-fidelity profile page featuring glassmorphism aesthetics and smooth animations.
- **Self-Service**: Users can update their own bios, change passwords via secure modals, and upload custom avatars directly to Firebase Storage.
- **Status Tracking**: Visual indicators for member activity (🟢 Active / 🔴 Inactive) with administrative overrides.
- **Member Directory**: A searchable, responsive grid of all club members with quick-access badges.

### 📅 Event Management
- **Full Planning Suite**: Create and manage club activities with precise **Date & Time** support (using `datetime-local` integration).
- **Interactive Attendance**: Real-time "Join" and "Leave" functionality with automatic status validation.
- **Event Types**: Distinctive visual styling for different activities (Soft Trail, Hard Trail, Meetups, etc.).
- **Smart Filtering**: Toggle between upcoming highlights and historical archives.

### 🎨 Global Theming & Experience
- **Vibe Themes**: Users can toggle between 6 premium curated themes: *Mud, Day, Night, Forest, Sky, and Desert*.
- **Multilingual (i18n)**: Seamless switching between **English** and **Portuguese (PT-BR)** across the entire UI.
- **Mobile-First Design**: A custom responsive navbar with a sleek hamburger menu drawer and layouts optimized for every screen size.

---

## 🛠 Technical Architecture

### Tech Stack
- **Frontend**: [React](https://reactjs.org/) + [Vite](https://vitejs.dev/) for ultra-fast HMR and bundling.
- **Backend/DB**: [Firebase](https://firebase.google.com/) (Authentication, Firestore, and Cloud Storage).
- **Icons**: [React Icons](https://react-icons.github.io/react-icons/) (FontAwesome, Material Design).
- **Styling**: Vanilla CSS with a sophisticated CSS Variable-based design system for zero-runtime theming.

### State Management
The app utilizes React Context API for lightweight, efficient global state:
- `AuthContext`: Manages user sessions, role-based access (Admin vs. User), and profile refreshes.
- `ThemeContext`: Handles the injection of theme tokens into the document root.
- `LanguageContext`: Orchestrates the `i18n` translation layer.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16.x or higher)
- npm or yarn

### Installation
1. Clone the repository:
   ```bash
   git clone [your-repo-url]
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   Create a `.env` file in the root and add your Firebase configuration:
   ```env
   VITE_FIREBASE_API_KEY="..."
   VITE_FIREBASE_AUTH_DOMAIN="..."
   VITE_FIREBASE_PROJECT_ID="..."
   VITE_FIREBASE_STORAGE_BUCKET="..."
   VITE_FIREBASE_MESSAGING_SENDER_ID="..."
   VITE_FIREBASE_APP_ID="..."
   ```

### Development
Start the local development server:
```bash
npm run dev
```

### Production Build
Generate a production-ready bundle in the `dist` folder:
```bash
npm run build
```

---

## 📂 Project Structure

- `src/components`: Reusable UI components (Navbar, Protected Routes).
- `src/context`: Global providers for Auth, Theme, and Language.
- `src/pages`: Main view components (Members, Profile, Events, Login).
- `src/services`: API wrappers for Firebase and Mock Data handlers.
- `src/styles`: Global theme variables and base CSS architecture.
- `src/i18n`: Centralized translation dictionaries.

---
*Built with ❤️ (and code) by AntiGravity AI.*
