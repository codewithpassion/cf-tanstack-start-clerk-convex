#!/bin/bash



# Function to load environment variables from a file
load_env_file() {
	local file=$1
	[ ! -f "$file" ] && return

	while IFS='=' read -r key value; do
		# Skip empty lines and comments
		[[ -z "$key" || "$key" =~ ^[[:space:]]*# ]] && continue
		# Trim whitespace
		key=$(echo "$key" | xargs)
		value=$(echo "$value" | xargs)
		# Remove quotes if present
		value="${value%\"}"
		value="${value#\"}"
		export "$key=$value"
	done < "$file"
}


# Load environment variables from .env
load_env_file .env

# Check if CLERK_JWT_ISSUER_DOMAIN is set
if [ -z "$CLERK_JWT_ISSUER_DOMAIN" ]; then
	echo "Error: CLERK_JWT_ISSUER_DOMAIN not found in .env"
	exit 1
fi

echo "Setting CLERK_JWT_ISSUER_DOMAIN in Convex to: $CLERK_JWT_ISSUER_DOMAIN"
# Set the environment variable in Convex
export CLERK_JWT_ISSUER_DOMAIN
if bunx convex env set CLERK_JWT_ISSUER_DOMAIN="$CLERK_JWT_ISSUER_DOMAIN" 2>&1; then
	echo "✓ Successfully set CLERK_JWT_ISSUER_DOMAIN in Convex"
else
	echo "Error setting CLERK_JWT_ISSUER_DOMAIN in Convex"
	exit 1
fi