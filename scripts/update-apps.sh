#!/bin/bash

###############################################################################
# LiveOS - Umbrel Apps Update Script
#
# This script syncs your local umbrel-apps-ref with the upstream Umbrel
# repository, showing you what changed and letting you approve updates.
#
# Usage: ./scripts/update-apps.sh [--auto-yes]
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
APPS_DIR="${PROJECT_ROOT}/umbrel-apps-ref"
UPSTREAM_REPO="https://github.com/getumbrel/umbrel-apps.git"
UPSTREAM_BRANCH="master"
AUTO_YES=false

# Parse arguments
if [[ "$1" == "--auto-yes" ]] || [[ "$1" == "-y" ]]; then
  AUTO_YES=true
fi

###############################################################################
# Helper Functions
###############################################################################

print_header() {
  echo -e "${CYAN}${BOLD}"
  echo "╔════════════════════════════════════════════════════════════════╗"
  echo "║              LiveOS - Umbrel Apps Update Script                ║"
  echo "╚════════════════════════════════════════════════════════════════╝"
  echo -e "${NC}"
}

print_section() {
  echo -e "\n${BLUE}${BOLD}▶ $1${NC}"
}

print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
  echo -e "${RED}✗ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
  echo -e "${CYAN}ℹ $1${NC}"
}

confirm() {
  if [[ "$AUTO_YES" == true ]]; then
    return 0
  fi

  local prompt="$1"
  local response
  read -p "$(echo -e ${YELLOW}${prompt}${NC}) [y/N]: " response
  case "$response" in
    [yY][eE][sS]|[yY])
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

###############################################################################
# Main Functions
###############################################################################

check_prerequisites() {
  print_section "Checking Prerequisites"

  # Check if git is installed
  if ! command -v git &> /dev/null; then
    print_error "Git is not installed. Please install git first."
    exit 1
  fi
  print_success "Git is installed"

  # Check if apps directory exists
  if [[ ! -d "$APPS_DIR" ]]; then
    print_error "Directory not found: $APPS_DIR"
    print_info "Run this script from the project root or check your setup"
    exit 1
  fi
  print_success "Apps directory found: $APPS_DIR"

  # Check if it's a git repository
  if [[ ! -d "$APPS_DIR/.git" ]]; then
    print_warning "umbrel-apps-ref is not a git repository"

    if confirm "Initialize as git repository and set upstream?"; then
      setup_git_repository
    else
      print_error "Cannot proceed without git repository"
      exit 1
    fi
  else
    print_success "Git repository detected"
  fi
}

setup_git_repository() {
  print_section "Setting Up Git Repository"

  cd "$APPS_DIR"

  # Initialize if needed
  if [[ ! -d ".git" ]]; then
    git init
    print_success "Initialized git repository"
  fi

  # Add upstream remote if it doesn't exist
  if ! git remote get-url upstream &> /dev/null; then
    git remote add upstream "$UPSTREAM_REPO"
    print_success "Added upstream remote: $UPSTREAM_REPO"
  else
    print_info "Upstream remote already exists"
  fi

  # Fetch from upstream
  print_info "Fetching from upstream..."
  git fetch upstream
  print_success "Fetched from upstream"
}

check_upstream() {
  print_section "Checking for Updates"

  cd "$APPS_DIR"

  # Ensure we have the upstream remote
  if ! git remote get-url upstream &> /dev/null; then
    git remote add upstream "$UPSTREAM_REPO"
  fi

  # Fetch latest changes
  print_info "Fetching from upstream..."
  git fetch upstream "$UPSTREAM_BRANCH" 2>&1 | grep -v "^From" || true

  # Get current branch or use HEAD if detached
  CURRENT_BRANCH=$(git symbolic-ref --short HEAD 2>/dev/null || echo "HEAD")

  # Check if there are new commits
  if git rev-parse HEAD &> /dev/null; then
    LOCAL_COMMIT=$(git rev-parse HEAD)
    UPSTREAM_COMMIT=$(git rev-parse upstream/$UPSTREAM_BRANCH)

    if [[ "$LOCAL_COMMIT" == "$UPSTREAM_COMMIT" ]]; then
      print_success "Already up to date!"
      return 1
    fi

    # Count commits behind
    COMMITS_BEHIND=$(git rev-list --count HEAD..upstream/$UPSTREAM_BRANCH 2>/dev/null || echo "unknown")
    print_info "Your repository is ${YELLOW}$COMMITS_BEHIND commits${NC} behind upstream"
  else
    print_warning "No local commits found, will sync from upstream"
  fi

  return 0
}

show_changes() {
  print_section "Changes Summary"

  cd "$APPS_DIR"

  # Show statistics
  echo -e "${BOLD}Changes:${NC}"

  # Check if we have a valid HEAD
  if ! git rev-parse HEAD &> /dev/null; then
    print_info "No local commits to compare. Will pull all apps from upstream."
    echo ""

    # Show some example apps that will be synced
    git ls-tree --name-only upstream/$UPSTREAM_BRANCH | head -10
    echo "... and more"
    echo ""
    return 0
  fi

  # Files changed
  FILES_CHANGED=$(git diff --name-only HEAD upstream/$UPSTREAM_BRANCH | wc -l | tr -d ' ')

  # Apps added
  NEW_APPS=$(git diff --name-only --diff-filter=A HEAD upstream/$UPSTREAM_BRANCH | \
             grep -E '^[^/]+/$' | cut -d'/' -f1 | sort -u | wc -l | tr -d ' ')

  # Apps modified
  MODIFIED_APPS=$(git diff --name-only --diff-filter=M HEAD upstream/$UPSTREAM_BRANCH | \
                  grep -E '^[^/]+/' | cut -d'/' -f1 | sort -u | wc -l | tr -d ' ')

  # Apps deleted
  DELETED_APPS=$(git diff --name-only --diff-filter=D HEAD upstream/$UPSTREAM_BRANCH | \
                 grep -E '^[^/]+/' | cut -d'/' -f1 | sort -u | wc -l | tr -d ' ')

  echo -e "  ${GREEN}+${NEW_APPS}${NC} new apps"
  echo -e "  ${YELLOW}~${MODIFIED_APPS}${NC} modified apps"
  echo -e "  ${RED}-${DELETED_APPS}${NC} deleted apps"
  echo -e "  ${CYAN}=${FILES_CHANGED}${NC} total files changed"
  echo ""

  # Show new apps
  if [[ $NEW_APPS -gt 0 ]]; then
    echo -e "${BOLD}${GREEN}New Apps:${NC}"
    git diff --name-only --diff-filter=A HEAD upstream/$UPSTREAM_BRANCH | \
      grep -E '^[^/]+/umbrel-app.yml$' | cut -d'/' -f1 | while read -r app; do
      echo "  + $app"
    done | head -10
    if [[ $NEW_APPS -gt 10 ]]; then
      echo "  ... and $(($NEW_APPS - 10)) more"
    fi
    echo ""
  fi

  # Show modified apps
  if [[ $MODIFIED_APPS -gt 0 ]]; then
    echo -e "${BOLD}${YELLOW}Modified Apps:${NC}"
    git diff --name-only --diff-filter=M HEAD upstream/$UPSTREAM_BRANCH | \
      grep -E '^[^/]+/' | cut -d'/' -f1 | sort -u | while read -r app; do
      # Check if version changed
      if git diff HEAD upstream/$UPSTREAM_BRANCH -- "$app/umbrel-app.yml" 2>/dev/null | \
         grep -q "^[-+]version:"; then
        OLD_VER=$(git show HEAD:"$app/umbrel-app.yml" 2>/dev/null | \
                  grep "^version:" | cut -d'"' -f2 | head -1)
        NEW_VER=$(git show upstream/$UPSTREAM_BRANCH:"$app/umbrel-app.yml" 2>/dev/null | \
                  grep "^version:" | cut -d'"' -f2 | head -1)
        echo "  ~ $app (${OLD_VER} → ${NEW_VER})"
      else
        echo "  ~ $app"
      fi
    done | head -10
    if [[ $MODIFIED_APPS -gt 10 ]]; then
      echo "  ... and $(($MODIFIED_APPS - 10)) more"
    fi
    echo ""
  fi
}

view_detailed_changes() {
  if ! confirm "Would you like to see detailed changes?"; then
    return
  fi

  print_section "Detailed Changes"

  cd "$APPS_DIR"

  # Show git log
  if git rev-parse HEAD &> /dev/null; then
    echo -e "${BOLD}Recent Commits:${NC}"
    git log --oneline HEAD..upstream/$UPSTREAM_BRANCH | head -20
    echo ""
  fi

  if confirm "View full diff? (This might be long)"; then
    git diff HEAD upstream/$UPSTREAM_BRANCH | less
  fi
}

apply_updates() {
  print_section "Applying Updates"

  cd "$APPS_DIR"

  # Check for uncommitted changes
  if ! git diff-index --quiet HEAD -- 2>/dev/null; then
    print_warning "You have uncommitted changes"

    if confirm "Stash your changes and continue?"; then
      git stash push -m "Auto-stash before update $(date +%Y-%m-%d_%H:%M:%S)"
      print_success "Changes stashed"
    else
      print_error "Cannot update with uncommitted changes"
      print_info "Commit or stash your changes first"
      exit 1
    fi
  fi

  # Determine merge strategy
  if ! git rev-parse HEAD &> /dev/null; then
    # No commits yet, just checkout
    print_info "Checking out upstream branch..."
    git checkout -b main upstream/$UPSTREAM_BRANCH
    print_success "Synced with upstream"
  else
    # Merge or rebase
    print_info "Merging upstream changes..."

    if git merge upstream/$UPSTREAM_BRANCH --no-edit; then
      print_success "Successfully merged upstream changes"
    else
      print_error "Merge conflict detected!"
      print_info "Please resolve conflicts manually:"
      print_info "  1. Fix conflicts in the files"
      print_info "  2. git add <resolved-files>"
      print_info "  3. git merge --continue"
      exit 1
    fi
  fi
}

show_summary() {
  print_section "Update Summary"

  cd "$APPS_DIR"

  # Count total apps
  TOTAL_APPS=$(find . -maxdepth 1 -type d -not -name ".*" -not -name "scripts" | wc -l | tr -d ' ')

  # Get latest commit
  LATEST_COMMIT=$(git log -1 --format="%h - %s" 2>/dev/null || echo "No commits")

  print_success "Update completed successfully!"
  echo ""
  echo -e "  ${BOLD}Total Apps:${NC} $TOTAL_APPS"
  echo -e "  ${BOLD}Latest Commit:${NC} $LATEST_COMMIT"
  echo -e "  ${BOLD}Upstream:${NC} $UPSTREAM_REPO"
  echo ""
  print_info "Your LiveOS app store is now up to date!"
  print_info "Restart your dev server to see the changes: npm run dev"
}

###############################################################################
# Main Execution
###############################################################################

main() {
  print_header

  # Check prerequisites
  check_prerequisites

  # Check for updates
  if ! check_upstream; then
    exit 0
  fi

  # Show what will change
  show_changes

  # Optionally show detailed changes
  view_detailed_changes

  # Ask for confirmation
  if ! confirm "Apply these updates?"; then
    print_warning "Update cancelled"
    exit 0
  fi

  # Apply updates
  apply_updates

  # Show summary
  show_summary
}

# Run main function
main "$@"
