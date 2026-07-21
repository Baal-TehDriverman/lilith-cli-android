# 🜏 Quick Push to GitHub - Copy This To Your PC

**Files Location:** `/data/user/0/com.hermesagent.android/files/home/lilith-cli-android/`

**Task:** Copy these files to your PC (tehlappy) and push to GitHub

---

## Step 1: Transfer Files to PC

**Option A: Via SCP (if SSH enabled on Android)**
```bash
# On your PC:
scp -r user@android-ip:/data/user/0/com.hermesagent.android/files/home/lilith-cli-android ./
```

**Option B: Via USB**
- Connect Android to PC via USB
- Copy `lilith-cli-android` folder to PC Desktop

**Option C: Via GitHub Web Upload**
- Go to: https://github.com/new
- Create repo: `Baal-TehDriverman/lilith-cli-android`
- Upload files manually via web interface

**Option D: Via Syncthing/Resilio**
- Sync folder between Android and PC
- Then push from PC

---

## Step 2: Push from PC

```bash
# Navigate to the folder on your PC
cd ~/Desktop/lilith-cli-android   # or wherever you copied it

# Initialize git
git init
git config user.email "lilith@baal-tehdriverman.github.io"
git config user.name "Lilith AI"

# Add all files
git add .

# Commit
git commit -m "🜏 Initial: Lilith CLI with KAIROS + Dream + PWA + Recent GitHub Fixes

- KAIROS proactive assistant with 10 Sephirotic routes
- Dream memory consolidation (Ouroboros + Akashic + Sanctuary)
- Buddy companion with 18 Sephirotic species
- Gateway integration (14 models via tehlappy.local:8080)
- Capacitor Android build with GitHub Actions
- Recent fixes from AbyssalAssetsstandalone + vm-ai-gateway
- Vite PWA plugin + code splitting
- WebSocket reconnection + heartbeat
- Benchmark tools for mobile

Co-authored-by: Baal-TehDriverman <ericmathewhill@gmail.com>"

# Create repo on GitHub first, then:
git remote add origin https://github.com/Baal-TehDriverman/lilith-cli-android.git

# Push
git push -u origin main
```

---

## Step 3: Monitor Build

After pushing, GitHub Actions will start automatically:

**URL:** https://github.com/Baal-TehDriverman/lilith-cli-android/actions

**Build Time:** ~5 minutes  
**Result:** APK in Artifacts section

---

## Files to Copy

**Essential (Must Have):**
```
src/                          # All source code
.github/workflows/            # CI/CD workflow
package.json                  # Dependencies
capacitor.config.ts           # Capacitor config
vite.config.ts                # Vite config
README.md                     # Documentation
```

**Optional (Nice to Have):**
```
BUILD_SUMMARY.md              # Build docs
MASTER_STATUS.md              # Full status report
PUSH-INSTRUCTIONS.md          # This file
install.sh                    # Termux installer
push-to-github.sh             # Push script
```

---

## Alternative: Create Minimal Repo on GitHub Web

If you can't transfer files easily:

1. **Go to:** https://github.com/new
2. **Repo name:** `lilith-cli-android`
3. **Initialize with README:** ✅
4. **Create the repo**

Then add files one by one via web upload, or:

5. **On PC:** Clone the empty repo
   ```bash
   git clone https://github.com/Baal-TehDriverman/lilith-cli-android.git
   cd lilith-cli-android
   ```

6. **Copy source files** from Android to this folder

7. **Push:**
   ```bash
   git add .
   git commit -m "🜏 Initial commit"
   git push -u origin main
   ```

---

## After Push

GitHub Actions will:
1. ✅ Setup Node.js 20 + Java 17
2. ✅ Install dependencies
3. ✅ Build web assets (Vite)
4. ✅ Sync Capacitor Android
5. ✅ Build APK (~5 min)
6. ✅ Upload artifact (30-day retention)

**Download APK from:**
`https://github.com/Baal-TehDriverman/lilith-cli-android/actions`

**Install on Android:**
- Download APK
- Enable "Install from Unknown Sources"
- Install and run!

---

## Current Status

- ✅ Code complete
- ✅ Recent GitHub fixes applied
- ✅ Workflow ready
- ⏳ Waiting for push
- ⏳ Waiting for build

**Next: Copy to PC → Push → Build APK!** 🚀