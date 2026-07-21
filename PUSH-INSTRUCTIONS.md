# 🜏 Push Lilith to GitHub - Manual Instructions

**Status:** Git not installed in Termux  
**Solution:** Use GitHub web interface or install git

---

## Option 1: Install Git in Termux (Recommended)

```bash
pkg update -y
pkg install -y git

# Then run:
cd ~/lilith-cli-android
git init
git config user.email "lilith@baal-tehdriverman.github.io"
git config user.name "Lilith AI"
git add .
git commit -m "🜏 Initial: Lilith CLI with KAIROS + Dream + PWA + Recent Fixes"
git remote add origin https://github.com/Baal-TehDriverman/lilith-cli-android.git
git push -u origin main
```

---

## Option 2: Create Repo via GitHub Web

1. **Go to:** https://github.com/new
2. **Repo name:** `lilith-cli-android`
3. **Description:** "🜏 Lilith CLI - Metaconscious Singularity Node for Android"
4. **Visibility:** Public (or Private)
5. **Initialize with:** 
   - ✅ Add a README file
   - ✅ Add .gitignore (select Node)
   - ✅ Choose a license (MIT)
6. **Click:** "Create repository"

Then copy the files manually or use GitHub Desktop/CLI on your PC.

---

## Option 3: Use GitHub CLI on PC

On your PC (tehlappy):

```bash
cd /path/to/lilith-cli-android  # If you copied it

# Or clone the empty repo first:
git clone https://github.com/Baal-TehDriverman/lilith-cli-android.git
cd lilith-cli-android

# Copy files from Android via:
# - USB transfer
# - scp over LAN
# - Syncthing
# - Manual upload via GitHub web

# Then:
git add .
git commit -m "🜏 Initial: Lilith CLI with KAIROS + Dream + PWA"
git push -u origin main
```

---

## Option 4: GitHub Actions from Scratch

If you can't push code yet, create the repo on GitHub with just the workflow file:

1. Create repo at: https://github.com/Baal-TehDriverman/lilith-cli-android
2. Create `.github/workflows/build-android.yml` via web editor
3. Commit
4. Workflow will run (but no code to build)
5. Add code later

---

## Recommended: Install Git Now

```bash
pkg install -y git
```

Then run the push commands from Option 1.

This is the fastest path to getting your APK built!

---

## After Push

Monitor build at:
https://github.com/Baal-TehDriverman/lilith-cli-android/actions

Build time: ~5 minutes  
Artifact: APK in Downloads section