# GitHub Repository Setup Instructions

## Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `Smartply`
3. Description: `AI-powered cover letter generation tool`
4. Make it **Public** or **Private** (your choice)
5. **DO NOT** initialize with README, .gitignore, or license (we already have these)
6. Click "Create repository"

## Step 2: Push Your Code to GitHub

After creating the repository on GitHub, run these commands in your terminal:

```bash
# Navigate to your project
cd /Users/aryanshetty/Desktop/smartply

# Add the remote repository (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/Smartply.git

# Verify the remote was added
git remote -v

# Push your code to GitHub
git push -u origin main
```

If you get an error about 'main' not existing, try:
```bash
git branch -M main
git push -u origin main
```

## Step 3: Verify Upload

Go to your GitHub repository URL:
https://github.com/YOUR_USERNAME/Smartply

You should see all your files including:
- README.md
- LICENSE
- .gitignore
- backend/ folder
- frontend/ folder

## Step 4: Add Repository Description and Topics (Optional but Recommended)

On your GitHub repository page:
1. Click "About" (gear icon) on the right side
2. Add description: `AI-powered cover letter generation tool built with FastAPI and React`
3. Add topics: `ai`, `cover-letter`, `fastapi`, `react`, `typescript`, `gpt-4`, `job-search`, `resume`
4. Add website URL if deployed
5. Click "Save changes"

## Troubleshooting

### Authentication Error
If you get an authentication error, you may need to:

**Option 1: Use Personal Access Token (Recommended)**
1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token with 'repo' scope
3. Use the token as your password when pushing

**Option 2: Use SSH**
```bash
# Generate SSH key (if you don't have one)
ssh-keygen -t ed25519 -C "your_email@example.com"

# Add SSH key to ssh-agent
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519

# Copy public key
cat ~/.ssh/id_ed25519.pub

# Add to GitHub: Settings → SSH and GPG keys → New SSH key

# Change remote to SSH
git remote set-url origin git@github.com:YOUR_USERNAME/Smartply.git

# Push again
git push -u origin main
```

### Branch Name Issue
If GitHub uses 'master' instead of 'main':
```bash
git branch -M main
git push -u origin main
```

## Next Steps After Pushing

1. **Create a .env.example file** (to show what environment variables are needed):
   ```bash
   # In backend directory
   cat > backend/.env.example << EOF
   OPENAI_API_KEY=your_openai_api_key_here
   DATABASE_URL=sqlite:///./smartply.db
   EOF
   
   # Commit and push
   git add backend/.env.example
   git commit -m "Add .env.example for environment variables"
   git push
   ```

2. **Add GitHub Actions** (optional - for CI/CD):
   - Create `.github/workflows/` directory
   - Add workflow files for testing and deployment

3. **Enable GitHub Pages** (optional - for documentation):
   - Settings → Pages → Source: Deploy from a branch
   - Select `main` branch and `/docs` folder

4. **Add Project Board** (optional - for task tracking):
   - Projects → New project
   - Choose template: "Kanban"

5. **Set up Issues Templates**:
   - Settings → Features → Issues → Set up templates
   - Add bug report and feature request templates

## Useful Git Commands

```bash
# Check status
git status

# Add specific files
git add filename

# Commit changes
git commit -m "Your commit message"

# Push changes
git push

# Pull latest changes
git pull

# Create new branch
git checkout -b feature-name

# Switch branches
git checkout branch-name

# View commit history
git log --oneline
```

## Repository Settings Recommendations

### General
- ✅ Allow merge commits
- ✅ Allow squash merging
- ✅ Allow rebase merging
- ✅ Automatically delete head branches

### Branch Protection (for main branch)
- ✅ Require a pull request before merging
- ✅ Require approvals (if working with a team)
- ✅ Dismiss stale pull request approvals when new commits are pushed

### Security
- ✅ Enable Dependabot alerts
- ✅ Enable Dependabot security updates

---

**Congratulations! Your Smartply project is now on GitHub! 🎉**
