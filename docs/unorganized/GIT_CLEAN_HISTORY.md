# 1. Create a backup branch first
git branch backup-before-cleanup

# 2. Soft reset to the commit before deployment experiments
git reset --soft adcee98

# 3. Create a single clean commit with all your changes
git commit -m "feat: migrate web app to Firebase App Hosting with SSR support

- Configure Firebase App Hosting for staging and production
- Update deployment workflows for GCP and Firebase
- Commit generated shared types for Firebase App Hosting compatibility
- Update environment configurations"

# 4. Force push to update remote
git push origin main --force-with-lease

# 5. Check the files
git status
git log

# 6. Compare with backup
git diff backup-before-cleanup