# PromptG • Dream Prompt Vault

A high-aesthetic, photography-first visual prompt management web app designed according to the **Findora iOS UI** and **Pinterest Design System tokens** (`pinterest-DESIGN.md`).

---

## ✨ Features & Architecture

1. **Findora & Pinterest Visual Design**:
   - Clean, rounded design with pill buttons and soft neutral surfaces.
   - **9:16 Aspect Ratio Cards** (`aspect-9-16`) specifically built for mobile & laptop prompt discovery.
   - **Outside Copy Prompt Button**: High-contrast, rounded pill button placed directly below each card for 1-click clipboard copy with animated visual feedback.
   - **Verified Shield Badge & Ratings**: Blue verified badge (Findora style) + frosted glass pill tags and star rating.
   - **Horizontal Category Pills**: Dynamic label filter pills (`All Prompts`, `#Midjourney`, `#Realistic`, `#Architecture`, etc.) with active dark pill vs inactive grey pill styling.

2. **Full Individual Prompt Detail Page**:
   - Clicking any 9:16 card opens the individual view.
   - High-res image gallery with previous/next controls and thumbnail strips for multiple images.
   - Large copy prompt button with character count and syntax-styled code view.
   - Delete with confirmation.

3. **Multi-Image Upload (1 + 2 + 3 etc.)**:
   - Supports selecting multiple images at once from your phone or laptop.
   - Live 9:16 preview thumbnails with individual remove buttons.
   - Web image URL paste support.

4. **Fast Cross-Device Sync (Mobile + Laptop)**:
   - **Supabase Integration**:
     - PostgreSQL database with real-time `postgres_changes` listener.
     - Supabase Storage bucket (`prompt-images`) for multi-image uploads.
     - Fast sync between mobile browser and laptop.
   - **Firebase Integration**:
     - Firestore real-time `onSnapshot` listener.
     - Firebase Storage support.
   - **In-App Cloud Settings UI**:
     - Enter your Supabase URL & Key directly from your mobile phone or laptop browser without needing to touch `.env` files!
     - 1-click "Copy Supabase SQL" button to quickly set up your table and storage policies.

5. **No Sample / Dummy Data**:
   - Strictly clean empty state initially (`[]`) awaiting your real prompts and pictures.

---

## 🚀 Quick Start

### 1. Install & Run Dev Server
```bash
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) on your laptop or local network on mobile!

### 2. Connect Supabase (Recommended)
1. Open the app and click the **Settings / Database** icon in the top header (or bottom dock).
2. Click **"Copy Supabase SQL"** (or view [`supabase-schema.sql`](file:///d:/CAREER/Apps/Arigato%20Labs/PromptG/supabase-schema.sql)).
3. Paste and run it in your **Supabase Dashboard -> SQL Editor**.
4. Enter your `Project URL` and `Anon Key` in the Settings modal, and click **Save & Connect**.
5. Done! Everything you add from your laptop or phone will sync in real time.
