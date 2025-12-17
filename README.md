# KP Family Chit Fund 🎰

A modern, real-time web application for managing monthly chit fund lucky draws with transparency and ease. Built with Astro, React, and Firebase.

## 🌟 Features

- **🎲 Real-time Lucky Draw**: Conduct live lucky draws with animated spinning effects and confetti celebrations
- **👥 Participant Management**: Add, view, and manage participants across multiple cycles
- **🔐 Role-Based Access Control**: 
  - **Admin**: Full control including draw management, participant management, and guest link generation
  - **Editor**: Can add and manage participants
  - **Viewer**: Read-only access to view draws and participants
  - **Guest**: Temporary access via secure token links for conducting draws
- **📅 Multi-Cycle Support**: Manage multiple chit fund cycles (e.g., 2025-2026, 2026-2027)
- **📊 Draw History**: View complete history of all past winners
- **🔗 Secure Guest Links**: Generate time-limited guest links (30 minutes) for authorized draw conductors
- **⚡ Real-time Updates**: Live synchronization across all connected devices
- **🎨 Modern UI**: Beautiful, responsive design with Tailwind CSS

## 🛠️ Tech Stack

- **Framework**: [Astro](https://astro.build) v5.15.3
- **UI Library**: [React](https://react.dev) v19.2.0
- **Styling**: [Tailwind CSS](https://tailwindcss.com) v4.1.16
- **Backend**: [Firebase](https://firebase.google.com) v12.6.0
  - Firestore (Database)
  - Firebase Authentication (Google Sign-In)
- **Deployment**: [Netlify](https://netlify.com)
- **Animations**: react-confetti

## 📋 Prerequisites

- Node.js 18+ and npm
- Firebase account and project
- Netlify account (for deployment)

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd chit-fund-site
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Firebase

1. Create a new Firebase project at [Firebase Console](https://console.firebase.google.com)
2. Enable **Firestore Database** (start in production mode)
3. Enable **Authentication** and configure **Google** as a sign-in provider
4. Get your Firebase configuration from Project Settings → General → Your apps

### 4. Configure Environment Variables

Create a `.env` file in the root directory:

```env
# Firebase Configuration
PUBLIC_FIREBASE_API_KEY=your_api_key_here
PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
PUBLIC_FIREBASE_PROJECT_ID=your_project_id
PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
PUBLIC_FIREBASE_APP_ID=your_app_id
PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Admin Configuration (comma-separated emails)
PUBLIC_ADMIN_EMAILS=admin1@example.com,admin2@example.com

# Editor Configuration (comma-separated emails)
PUBLIC_ALLOWED_EDITORS=editor1@example.com,editor2@example.com
```

### 5. Set Up Firestore Security Rules

In Firebase Console → Firestore Database → Rules, add:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Participants collection
    match /participants/{participantId} {
      allow read: if true; // Anyone can read
      allow write: if request.auth != null; // Only authenticated users can write
    }
    
    // Draws collection
    match /draws/{drawId} {
      allow read: if true; // Anyone can read
      allow write: if request.auth != null; // Only authenticated users can write
    }
    
    // Config collection
    match /config/{document=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Guest tokens collection
    match /guestTokens/{tokenId} {
      allow read: if true; // Anyone can read to validate tokens
      allow write: if request.auth != null; // Only authenticated users can create tokens
    }
  }
}
```

### 6. Create Firestore Collections

The app will automatically create collections as needed, but you can pre-create them:

- `participants` - Stores participant information
- `draws` - Stores draw results
- `config` - Stores app configuration (cycles, game state)
- `guestTokens` - Stores temporary guest access tokens

### 7. Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:4321`

## 📁 Project Structure

```
chit-fund-site/
├── public/                 # Static assets
│   └── favicon.svg
├── src/
│   ├── components/        # React and Astro components
│   │   ├── Header.astro
│   │   ├── ParticipantList.jsx  # Main lucky draw component
│   │   └── HistoryList.jsx      # Winners history component
│   ├── layouts/
│   │   └── Layout.astro   # Main layout wrapper
│   ├── lib/
│   │   └── firebase.js    # Firebase configuration
│   ├── pages/
│   │   ├── index.astro    # Home page
│   │   ├── lucky-draw.astro  # Lucky draw page
│   │   └── history.astro  # Winners history page
│   └── styles/
│       └── global.css     # Global styles
├── netlify/
│   └── functions/         # Netlify serverless functions (if needed)
├── astro.config.mjs       # Astro configuration
├── netlify.toml          # Netlify deployment config
├── package.json
└── README.md
```

## 🎮 Usage

### For Admins

1. **Login**: Click "Login" and sign in with your Google account (must be in `PUBLIC_ADMIN_EMAILS`)
2. **Add Participants**: Use the form to add participants to the current cycle
3. **Create Cycles**: Click "New Cycle" to create a new chit fund cycle
4. **Generate Guest Links**: Click "Generate Guest Link" to create a temporary link for authorized draw conductors
5. **Conduct Draw**: Click "PICK WINNER" to start the lucky draw
6. **Reset Draw**: Admins can reset a draw if needed

### For Editors

1. **Login**: Sign in with your Google account (must be in `PUBLIC_ALLOWED_EDITORS`)
2. **Add Participants**: You can add and delete participants
3. **View Draws**: View ongoing and completed draws

### For Guests

1. **Access via Link**: Use the guest link provided by an admin
2. **Conduct Draw**: Click "✨ SPIN THE WHEEL ✨" to start the draw
3. **Note**: Guest links expire after 30 minutes

### For Viewers

1. **View Only**: Browse participants, view draw results, and check history
2. **No Login Required**: Public access to view draws and winners

## 🚢 Deployment

### Deploy to Netlify

1. **Connect Repository**: Link your Git repository to Netlify
2. **Set Environment Variables**: Add all `PUBLIC_*` variables in Netlify dashboard → Site settings → Environment variables
3. **Build Settings**: 
   - Build command: `npm run build`
   - Publish directory: `dist`
4. **Deploy**: Netlify will automatically deploy on every push to your main branch

### Manual Deployment

```bash
npm run build
# Deploy the dist/ folder to your hosting provider
```

## 🔒 Security Features

- ✅ Role-based access control (Admin, Editor, Viewer, Guest)
- ✅ Secure guest token system with expiration
- ✅ Firebase Authentication integration
- ✅ Firestore security rules
- ✅ Environment variable protection

## 🐛 Troubleshooting

### Firebase Connection Issues
- Verify all environment variables are set correctly
- Check Firebase project settings
- Ensure Firestore is enabled

### Authentication Not Working
- Verify Google Sign-In is enabled in Firebase Console
- Check that your email is in `PUBLIC_ADMIN_EMAILS` or `PUBLIC_ALLOWED_EDITORS`

### Guest Links Not Working
- Ensure the token exists in Firestore `guestTokens` collection
- Check if the token has expired (30-minute limit)
- Verify Firestore security rules allow token reads

## 📝 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 👥 Support

For issues or questions, please contact the project administrators.

---

**Built with ❤️ for KP Family Chit Fund**
