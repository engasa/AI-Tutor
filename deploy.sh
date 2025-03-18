#!/bin/bash
 
# What:
#	This script pulls latest git changes then restart pm2 (uses ecosystem.config.cjs).
# Prereqs: 
# 	git repo was previously pulled to /path/to/your-app (must be same as as/in/etc/conf.d)
# 	docker is installed and we use docker-compose.yml - if docker not used, remove docker entries below
#	pm2 installed (see _how.text)
# Usage:
#	./deploy.sh [--force]
# 	If --force is passed, deployment will continue even with no new commit.

# Variables
GIT_BRANCH="dev"  		# !!(1)!! Change if deploying a different branch
REPO_DIR="/path/to/yourproject/homefolder/same/as/in/etc/conf.d"	#!!(2)!! change as needed
DOCKER_COMPOSE_FILE="docker-compose.yml"
LAST_COMMIT_FILE="$REPO_DIR/.last_commit"
LOCKFILE="/tmp/deploy.lock"

# Function to clean up the lock file on exit
cleanup() {
    rm -f "$LOCKFILE"
}
trap cleanup EXIT INT TERM

# Check for the --force flag
FORCE_DEPLOY=false
if [ "$1" == "--force" ]; then
    FORCE_DEPLOY=true
    echo "Force deploy enabled: will rebuild and deploy even if no new commit."
fi


# Lock file mechanism: Check if the lock file exists and the process is still running
if [ -f "$LOCKFILE" ] && kill -0 "$(cat "$LOCKFILE")" 2>/dev/null; then
    echo "Deploy script is already running. Exiting."
    exit 1
fi
echo $$ > "$LOCKFILE"	# Create a lock file with the current process ID

#----------------#

echo "Starting deployment process..."

# Navigate to the repository
cd "$REPO_DIR" || { echo "Failed to change directory to $REPO_DIR"; rm -f "$LOCKFILE"; exit 1; }

# Ensure a clean working state
git reset --hard
git clean -fd
git checkout "$GIT_BRANCH"

# Fetch the latest changes
git fetch origin

# Get the latest commit hash on the dev branch
LATEST_COMMIT=$(git rev-parse origin/"$GIT_BRANCH")

# Compare with the last deployed commit if not forcing deploy
if [ "$FORCE_DEPLOY" = false ] && [ -f "$LAST_COMMIT_FILE" ]; then
    LAST_COMMIT=$(cat "$LAST_COMMIT_FILE")
    if [ "$LATEST_COMMIT" == "$LAST_COMMIT" ]; then
        echo "No new changes. Exiting."
        rm -f "$LOCKFILE"
        exit 0
    fi
fi

# Pull the latest changes and reset to the latest commit
git pull origin "$GIT_BRANCH" || { echo "Git pull failed. Exiting."; exit 1; }

# Set execute permissions for deploy.sh so it can run after the pull
chmod +x deploy.sh

# Install dependencies, build, run migrations, and restart the app with PM2
echo "Installing dependencies..."
npm install || { echo "npm install failed. Exiting."; exit 1; }
echo "Building application..."
npm run build || { echo "Build failed. Exiting."; exit 1; }
echo "Running database migrations..."
npx prisma migrate deploy || { echo "Database migration failed. Exiting."; exit 1; }
echo "Restarting application with PM2..."
pm2 restart ecosystem.config.cjs --update-env || { echo "PM2 restart failed. Exiting."; exit 1; }

# Save the latest commit hash
echo "$LATEST_COMMIT" > "$LAST_COMMIT_FILE"

# Remove the lock file when done
rm -f "$LOCKFILE"

echo "Deployment complete: $(date)"

# Restart Apache
echo "Restarting Apache Server (need sudo access - press escape to skip)"
sudo systemctl restart httpd