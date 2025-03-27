
#!/bin/bash

# Function to increment version
increment_version() {
    local version=$1
    local position=$2
    
    # Remove 'v' prefix if present
    version="${version#v}"
    
    IFS='.' read -ra ADDR <<< "$version"
    
    case $position in
        "major")
            ADDR[0]=$((ADDR[0] + 1))
            ADDR[1]=0
            ADDR[2]=0
            ;;
        "minor")
            ADDR[1]=$((ADDR[1] + 1))
            ADDR[2]=0
            ;;
        "patch")
            ADDR[2]=$((ADDR[2] + 1))
            ;;
    esac
    
    echo "v${ADDR[0]}.${ADDR[1]}.${ADDR[2]}"
}

# Get current version from version.json
CURRENT_VERSION=$(grep -o '"version": *"[^"]*"' config/version.json | cut -d'"' -f4)

# Determine version bump type
if [ "$1" == "" ]; then
    echo "Please specify version bump type: major, minor, or patch"
    exit 1
fi

# Calculate new version
NEW_VERSION=$(increment_version "$CURRENT_VERSION" "$1")

# Update version.json
sed -i "s/\"version\": *\"[^\"]*\"/\"version\": \"$NEW_VERSION\"/" config/version.json

# Get current date
CURRENT_DATE=$(date +"%Y-%m-%d %H:%M:%S")

# Update updated_at in version.json
sed -i "s/\"updated_at\": *\"[^\"]*\"/\"updated_at\": \"$CURRENT_DATE\"/" config/version.json

# Commit changes
git add config/version.json

git commit -m "Bump version to $NEW_VERSION"

# Create and push tag
git tag -a "$NEW_VERSION" -m "Release $NEW_VERSION"
git push origin main "$NEW_VERSION"

echo "Version bumped to $NEW_VERSION and tag pushed to GitHub"

