#!/usr/bin/env bash
# Archive bower and upload it to App Store Connect. One command; no Xcode UI.
#
# Bumps the build number first, because App Store Connect refuses a build
# number it has already seen. Uses the Apple ID Xcode is signed into, and
# creates or renews the distribution certificate and profile as needed.
#
#   ./scripts/upload.sh          # bump build, archive, upload
#
# With "Enable automatic distribution" on the TestFlight group, the build
# reaches testers the moment it finishes processing — usually minutes.
#
# Headless uploads: the export step needs App Store Connect access, and the
# Apple ID Xcode is signed into only works from an interactive session with a
# live keychain. Set these and the upload authenticates with an App Store
# Connect API key instead, so it runs from anywhere:
#
#   ASC_KEY_ID        the key's ID, e.g. AB12CD34EF
#   ASC_ISSUER_ID     the issuer UUID shown on the Integrations page
#   ASC_KEY_PATH      path to AuthKey_<KEY_ID>.p8 (default: ~/.appstoreconnect/private_keys/AuthKey_<KEY_ID>.p8)
#
# Make one at App Store Connect → Users and Access → Integrations → Team Keys,
# role "App Manager". The .p8 downloads once; keep it outside the repo.
set -euo pipefail

# Load the App Store Connect API key ids if present (gitignored), so uploads
# authenticate with the key instead of a Xcode account session that expires.
_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
[[ -f "$_ROOT/.asc-key.env" ]] && source "$_ROOT/.asc-key.env"

AUTH=()
if [[ -n "${ASC_KEY_ID:-}" && -n "${ASC_ISSUER_ID:-}" ]]; then
  KEY_PATH="${ASC_KEY_PATH:-$HOME/.appstoreconnect/private_keys/AuthKey_${ASC_KEY_ID}.p8}"
  [[ -f "$KEY_PATH" ]] || { echo "ASC_KEY_ID is set but $KEY_PATH does not exist" >&2; exit 1; }
  AUTH=(-authenticationKeyPath "$KEY_PATH" -authenticationKeyID "$ASC_KEY_ID" -authenticationKeyIssuerID "$ASC_ISSUER_ID")
  echo "authenticating with App Store Connect key $ASC_KEY_ID"
fi
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/ios-app/bower"

PBX=bower.xcodeproj/project.pbxproj
CURRENT=$(grep -o 'CURRENT_PROJECT_VERSION = [0-9]*' "$PBX" | head -1 | grep -o '[0-9]*$')
NEXT=$((CURRENT + 1))
sed -i '' "s/CURRENT_PROJECT_VERSION = $CURRENT;/CURRENT_PROJECT_VERSION = $NEXT;/g" "$PBX"
echo "build $CURRENT → $NEXT"

OUT=$(mktemp -d)
xcodebuild archive \
  -project bower.xcodeproj -scheme bower -configuration Release \
  -destination "generic/platform=iOS" \
  -archivePath "$OUT/bower.xcarchive" \
  -allowProvisioningUpdates ${AUTH[@]+"${AUTH[@]}"} -quiet
echo "archived"

# Manual signing with the distribution certificate + App Store profile that live
# in the keychain and ~/Library/MobileDevice/Provisioning Profiles. Self-contained:
# no Xcode account session (which expires) and no cloud signing (which the API key
# cannot do). Falls back to ExportOptions.plist if the manual one is absent.
EXPORT_PLIST=ExportOptions.plist
[[ -f ExportOptions-manual.plist ]] && EXPORT_PLIST=ExportOptions-manual.plist
# AUTH (the API key) authenticates the UPLOAD. Manual signing means xcodebuild
# never attempts cloud signing, so the App-Manager key — which can upload but
# not cloud-sign — is exactly enough.
xcodebuild -exportArchive \
  -archivePath "$OUT/bower.xcarchive" \
  -exportOptionsPlist "$EXPORT_PLIST" \
  -exportPath "$OUT/export" ${AUTH[@]+"${AUTH[@]}"} -quiet
echo "uploaded build $NEXT — App Store Connect is processing it"

cd ../..
git add ios-app/bower/bower.xcodeproj/project.pbxproj
git commit -q -m "chore: build $NEXT" && git push -q origin main
echo "committed and pushed"
