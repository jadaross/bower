# Page review

A look at every page before a release, to catch anything that looks off: a line that
runs over, text that wraps badly, a colour you can't read. About 20 minutes on your
phone. Do it once in light and once in dark (Settings → Display & Brightness), and
once more with a bigger text size if the release touched layout (Settings → Display &
Brightness → Text Size, two steps up).

Claude can also shoot every page in the simulator first:
`./scripts/screens.sh ~/Desktop/bower-screens` (light and dark, long pages in slices).
Skim those, then do the pass below on the phone for anything that looked wrong.

## On every page

- [ ] No text is cut off, runs under an icon, or ends in "…" where a whole word should fit.
- [ ] No headline breaks before its last word or two.
- [ ] Nothing overlaps: tags, badges and buttons sit clear of the text beside them.
- [ ] Everything blue, red or green is easy to read, in dark mode especially.
- [ ] Grey helper text is readable without squinting.
- [ ] Buttons in a row are the same height, and the page doesn't jump as it loads.

## The pages

How to reach each one is in brackets. To see the one-time pages again, delete and
reinstall the app, or sign in on a fresh account.

### Signing in and set-up
- [ ] **Sign in** (fresh install): the mark, the wordmark, the two buttons the same height.
- [ ] **Continue with email**: the Sign up / Log in switch and both fields.
- [ ] **Introduce yourself**: the name fields with the keyboard up; Continue stays visible.
- [ ] **Why bower?**: the text and the row of blue things beneath it.
- [ ] **What bower does**: the line under the headline on one line; the three steps.
- [ ] **Where do you sell?**: the four countries; the three platform rows.
- [ ] **Know when it's in** (the notifications ask, after set-up).

### Home
- [ ] **Empty**: the camera area, Upload from library, the link field's placeholder.
- [ ] **With photos** (add 2, then 5): the tiles and their labels; "Write it · N photos".
- [ ] **With a link pasted**: the Size and Condition fields and the line under them.
- [ ] **Tips** (Tips, top right): every row, scrolled to the end.
- [ ] **How bower works** (`?`): all five steps, Next through to Start selling.
- [ ] **About** (tap the mark): the whole sheet, scrolled to the end.

### Writing a listing
- [ ] **The read** (Write it): the four frames and the title arriving.
- [ ] **Not clothing** (photograph a mug): "Only clothes, shoes and bags".
- [ ] **The listing, estimate only**: the Estimate card and Check the market.
- [ ] **The listing, priced** (Check the market): the Ask, the three bands, the "Post here first" tag.
- [ ] **Scroll the whole listing**: title, description, hashtags, every form field, the chips, Open, the thumbs and "Tell us".
- [ ] **Switch platform** (Vinted, Depop, eBay): each listing's fields.
- [ ] **Comparables** (tap a band): the list of listings, scrolled.
- [ ] **Tell us** (under the listing): the feedback sheet with the keyboard up.

### History, Profile and Plus
- [ ] **History**: both cards; "Clear history".
- [ ] **A past item** (tap a card): the sheet, scrolled to the end.
- [ ] **Profile**: scroll from top to bottom, including the meters ("6 of 10 left"), Plus, Feedback, Sign out and Delete account.
- [ ] **Tell bower what's wrong** (Profile → Feedback).
- [ ] **The paywall** (Profile → bower Plus): both cards, and the fine print under Get Plus.
- [ ] **Out of listings** (when the meter is at zero, or ask Claude for a stub build): the paywall's other headline, and Home's "Get more listings".

If something looks wrong, screenshot it and hand it to Claude with the page's name
from this list.
