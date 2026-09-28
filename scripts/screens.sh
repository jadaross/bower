#!/bin/zsh
# Screenshots every page and state of the app in the simulator, on fixtures,
# in light and dark, into one folder, for a look-over before a release.
#
#   ./scripts/screens.sh [out-dir] [light|dark|both] [only-prefix]
#
# Build and install a Debug build first (Xcode, or XcodeBuildMCP build_run_sim).
# Every state comes from a DEBUG launch argument (DebugLaunch.swift, bowerApp.swift,
# StubAPI.swift), since the simulator can't be tapped from outside on Xcode 27.
# Long pages are taken in slices with -bowerScroll.

set -u
OUT=${1:-/tmp/bower-screens}
MODES=${2:-both}
ONLY=${3:-}
SIM=${SIM:-booted}
APP=com.jadaross.bower
LINK=https://www.zara.com/uk/en/wool-coat-p1.html
mkdir -p "$OUT"

shot() { # name wait args...
  local name=$1 wait=$2; shift 2
  [[ -n $ONLY && $name != $ONLY* ]] && return
  xcrun simctl terminate $SIM $APP 2>/dev/null
  xcrun simctl launch $SIM $APP -bowerStub "$@" >/dev/null || { echo "failed: $name"; return; }
  sleep $wait
  xcrun simctl io $SIM screenshot "$OUT/$MODE-$name.png" >/dev/null 2>&1 && echo "$MODE-$name"
}

pass() {
  # One-time pages
  shot 01-signin 4 -bowerScreen signin
  shot 02-signin-email 4 -bowerScreen signin -bowerSheet email
  shot 03-introduce 4 -bowerScreen introduce
  shot 04-why-top 4 -bowerScreen whyBower
  shot 05-why-end 4 -bowerScreen whyBower -bowerScroll 1
  shot 06-how 4 -bowerScreen how
  shot 07-platforms 4 -bowerScreen platforms
  shot 08-platforms-uncovered 4 -bowerScreen platforms -bowerRegion CA -onboardingComplete NO
  shot 09-notifications 5 -bowerScreen platforms -bowerSheet notifications
  # Home and its sheets
  shot 10-home 4
  shot 11-home-pile 4 -bowerPhotos 3
  shot 12-home-pile-full 4 -bowerPhotos 5
  shot 13-home-link 4 -bowerLink $LINK
  shot 14-home-spent 4 -bowerSpent -bowerPhotos 2
  shot 15-tips-top 5 -bowerSheet tips
  shot 16-tips-end 5 -bowerSheet tips -bowerScroll 1
  for step in 0 1 2 3 4; do shot 17-help-$step 5 -bowerHelpStep $step; done
  shot 18-about 5 -bowerSheet about
  # The read
  shot 20-read 2 -bowerLink $LINK -bowerScreen analysing
  shot 21-read-not-clothing 4 -bowerPhotos 2 -bowerScreen analysing -bowerReject not_clothing
  shot 22-read-explicit 4 -bowerPhotos 2 -bowerScreen analysing -bowerReject explicit
  # The listing: estimate, then priced, in slices
  shot 30-listing-estimate 10 -bowerLink $LINK -bowerScreen analysing
  for at in 0 0.25 0.5 0.75 1; do shot 31-listing-priced-$at 12 -bowerLink $LINK -bowerScreen analysing -bowerSearch -bowerScroll $at; done
  shot 32-listing-nothing-comparable 12 -bowerLink $LINK -bowerScreen analysing -bowerSearch -bowerNoListings
  shot 33-comps 14 -bowerLink $LINK -bowerScreen analysing -bowerSearch -bowerSheet comps
  shot 34-listing-feedback 10 -bowerLink $LINK -bowerScreen analysing -bowerSheet feedback
  # History, Profile, paywall
  shot 40-history 5 -bowerScreen history
  shot 41-history-detail 6 -bowerScreen history -bowerSheet detail
  for at in 0 0.5 1; do shot 42-profile-$at 4 -bowerScreen settings -bowerScroll $at; done
  shot 43-profile-plus 4 -bowerScreen settings -bowerPlus
  shot 44-profile-feedback 5 -bowerScreen settings -bowerSheet feedback
  shot 45-paywall-listings 5 -bowerPaywall listings
  shot 46-paywall-checks 5 -bowerPaywall checks
  shot 47-paywall-plus 5 -bowerPaywall browse -bowerPlus
}

for MODE in light dark; do
  [[ $MODES != both && $MODES != $MODE ]] && continue
  xcrun simctl ui $SIM appearance $MODE
  pass
done
xcrun simctl ui $SIM appearance light
echo "→ $OUT"
