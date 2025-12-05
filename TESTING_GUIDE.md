# Testing Guide for Admin Access & Modal Fixes

## 🆕 LATEST UPDATE: Enhanced Admin Privileges & Real Logout (Dec 2025)

### Key Improvements ✅

**Admin Privileges:**
- Paolo Giulio Gazzano (ID=16) and Emiliano Menicucci (ID=12) are **ALWAYS** admin in ALL circumstances
- Triple verification: ID check → username check → database role check
- Session automatically updated if admin flags are missing
- Frontend uses centralized `ADMIN_USERS=[16,12]` array consistently

**Logout Functionality:**
- **ALWAYS** calls server endpoint `/api/fratelli/logout`
- Destroys server session completely
- Clears both `sessionStorage` and `localStorage`
- Shows alert if server call fails but forces local cleanup anyway
- Logout is REAL - server session is destroyed

**Session Validation:**
- Automatic check every 2 minutes via `session-keeper.js`
- Calls `/api/fratelli/me` to verify session validity
- Forces logout if session is invalid on server
- Updates admin privileges if they were lost

## Quick Start Testing

### Prerequisites
1. Server running: `npm start`
2. Browser with DevTools open (F12)
3. Test users available:
   - **Emiliano Menicucci** (ID=12, username: `emiliano.menicucci`) - **ADMIN**
   - **Paolo Giulio Gazzano** (ID=16, username: `paolo.giulio.gazzano`) - **ADMIN**
   - Regular user (any non-admin fratello)

## Test Suite 1: Admin Access (Emiliano Menicucci)

### Test 1.1: Login as Emiliano
**Steps:**
1. Navigate to `http://localhost:3000/`
2. Select "Fratelli" login type
3. Enter username: `emiliano.menicucci`
4. Enter password: [Emiliano's password]
5. Click "Accedi"

**Expected Results:**
- ✅ Login successful
- ✅ Redirected to `/fratelli/dashboard`
- ✅ Admin button visible in header: "🔧 Admin"
- ✅ Console shows: `👑 Login ADMIN (hardcoded): Emiliano Menicucci [@emiliano.menicucci] [ID=12]`
- ✅ Session has `admin_access: true`

**Console Check:**
```javascript
// In browser console:
JSON.parse(sessionStorage.getItem('fratelliAuth'))
// Should show: { ..., admin_access: true, role: "admin" }
```

### Test 1.2: Admin Button Navigation
**Steps:**
1. While logged in as Emiliano
2. Click "🔧 Admin" button in header
3. Observe console logs

**Expected Results:**
- ✅ Console shows: `🔍 Tentativo accesso admin per user ID: 12`
- ✅ Console shows: `✅ Accesso admin verificato, redirect...`
- ✅ Redirected to `/admin/dashboard`
- ✅ Admin dashboard loads successfully

**If it fails:**
- Check console for error messages
- Verify session still valid
- Check `/admin/api/check-access` endpoint

### Test 1.3: Admin Pages Access
**Steps:**
1. While in `/admin/dashboard`
2. Navigate to:
   - `/admin/fratelli` (Gestione Fratelli)
   - `/admin/tornate` (Gestione Tornate)
   - `/admin/tavole` (Gestione Tavole)

**Expected Results:**
- ✅ All pages load without errors
- ✅ Can view data in each section
- ✅ No redirect to login page

### Test 1.4: Paolo Giulio Gazzano Admin Access ⭐ CRITICAL
**Repeat ALL Test Suite 1 tests with Paolo instead of Emiliano:**

1. Login as Paolo (ID=16, username: `paolo.giulio.gazzano`)
2. Verify admin button appears
3. Click admin button → access `/admin/dashboard`
4. Navigate all admin pages

**Expected Results:**
- ✅ **EXACTLY** the same behavior as Emiliano
- ✅ Console shows: `👑 Login ADMIN (ID hardcoded): Paolo Giulio Gazzano [@paolo.giulio.gazzano] [ID=16]`
- ✅ Console shows: `🔒 FORCED ADMIN ACCESS per ID: 16 (Paolo/Emiliano)`
- ✅ Session has `admin_access: true` and `role: 'admin'`
- ✅ Admin button visible in header
- ✅ Can access ALL admin pages

**Console Verification:**
```javascript
// In browser console:
const auth = JSON.parse(sessionStorage.getItem('fratelliAuth'));
console.log('User:', auth.nome, 'ID:', auth.id, 'Admin:', auth.admin_access, 'Role:', auth.role);
// Should show: User: Paolo Giulio Gazzano ID: 16 Admin: true Role: admin
```

## Test Suite 2: Logout Functionality

### Test 2.1: Logout from Fratelli Dashboard ⭐ ENHANCED
**Steps:**
1. Login as any user
2. Go to `/fratelli/dashboard`
3. Open DevTools Console (F12) to monitor logout
4. Click "🚪 Esci" button
5. Confirm logout dialog

**Expected Results:**
- ✅ Console shows: `🚪 Inizio procedura logout...`
- ✅ Console shows: `📡 Chiamata POST /api/fratelli/logout...`
- ✅ Console shows: `✅ Logout server completato con successo`
- ✅ Console shows: `🧹 Pulizia dati locali...`
- ✅ Console shows: `✅ Logout completo - redirect a homepage`
- ✅ Redirected to `/` (login page)
- ✅ `sessionStorage.fratelliAuth` is removed
- ✅ `localStorage.fratelliAuth` is removed (if it was set)

**Verify Session Destroyed (Server Logs):**
```bash
# In server logs:
🚪 Tentativo logout fratello: [Username]
✅ Logout fratello completato con successo: [Username]
```

**Test Network Error Handling:**
1. Open DevTools → Network tab
2. Set network throttling to "Offline"
3. Try to logout
4. **Expected:** Alert shows "❌ Errore di rete durante il logout. La sessione verrà comunque cancellata localmente."
5. Local storage is cleared and redirect happens anyway

### Test 2.2: Verify Session Invalid After Logout
**Steps:**
1. After logout, try to access `/fratelli/dashboard` directly
2. Observe behavior

**Expected Results:**
- ✅ Redirected to login page
- ✅ No cached user data visible
- ✅ Must login again to access dashboard

### Test 2.3: Logout from Admin Dashboard
**Steps:**
1. Login as admin (Emiliano or Paolo)
2. Navigate to `/admin/dashboard`
3. Click logout button
4. Confirm logout

**Expected Results:**
- ✅ Console shows: `✅ Logout admin GET completato, redirect alla homepage`
- ✅ Redirected to `/`
- ✅ Admin session destroyed
- ✅ Cannot access admin pages without re-login

## Test Suite 3: Modal Behavior

### Test 3.1: Admin Fratelli Modal
**Steps:**
1. Login as admin
2. Go to `/admin/fratelli`
3. Click "Nuovo Fratello" or edit existing fratello
4. Modal opens
5. Click outside the modal (on the backdrop/overlay)

**Expected Results:**
- ✅ Modal stays open
- ❌ Modal does NOT close when clicking backdrop
- ✅ Modal only closes via:
  - X button (top right)
  - "Annulla" button
  - "Salva" button (after successful save)

### Test 3.2: Admin Tornate Modal
**Steps:**
1. Login as admin
2. Go to `/admin/tornate`
3. Click "Nuova Tornata" or edit existing tornata
4. Modal opens
5. Click outside the modal

**Expected Results:**
- ✅ Modal stays open
- ❌ Modal does NOT close when clicking backdrop

### Test 3.3: Admin Tavole Modal
**Steps:**
1. Login as admin
2. Go to `/admin/tavole`
3. Click "Nuova Tavola" or edit existing tavola
4. Modal opens
5. Click outside the modal

**Expected Results:**
- ✅ Modal stays open
- ❌ Modal does NOT close when clicking backdrop

### Test 3.4: Modal Button Closing
**For each modal above, test:**
1. Open modal
2. Click X button → Modal closes ✅
3. Open modal again
4. Click "Annulla" → Modal closes ✅
5. Open modal again
6. Fill form and click "Salva" → Modal closes after success ✅

## Test Suite 4: Non-Admin User Access

### Test 4.1: Regular User Login
**Steps:**
1. Login as regular fratello (not Paolo or Emiliano)
2. Go to `/fratelli/dashboard`

**Expected Results:**
- ✅ Login successful
- ❌ NO Admin button visible
- ❌ Admin footer link NOT visible
- ✅ Can access regular fratelli pages
- ✅ Session has `admin_access: false`

### Test 4.2: Regular User Cannot Access Admin
**Steps:**
1. While logged in as regular user
2. Try to access `/admin/dashboard` directly (type in URL)

**Expected Results:**
- ❌ Access denied
- ✅ Redirected to `/?error=access_denied`
- ✅ Error message shown (if UI supports it)

## Test Suite 5: Edge Cases & Session Validation ⭐ NEW

### Test 5.1: Automatic Session Validation (Every 2 Minutes)
**Steps:**
1. Login as any user (Emiliano, Paolo, or regular user)
2. Go to `/fratelli/dashboard`
3. Open DevTools Console
4. Wait and observe console logs

**Expected Results:**
- ✅ After 5 seconds: Console shows `🔍 Verifica sessione: /api/fratelli/me`
- ✅ Console shows: `✅ Sessione valida per: [Username] - Admin: [true/false]`
- ✅ Every 2 minutes: Same check repeats automatically
- ✅ SessionKeeper logs: `✅ SessionKeeper inizializzato per: /fratelli/dashboard`

**To Test Session Expiration:**
1. Login and wait on dashboard
2. In another browser tab, manually destroy the server session (clear cookies)
3. Wait for next automatic check (max 2 minutes)
4. **Expected:** Alert shows "La tua sessione è scaduta. Effettua nuovamente il login."
5. **Expected:** Automatic redirect to login page

### Test 5.2: Admin Privileges Auto-Correction
**Steps:**
1. Login as Paolo or Emiliano
2. Open DevTools Console
3. Execute: `let auth = JSON.parse(sessionStorage.getItem('fratelliAuth')); auth.admin_access = false; auth.role = 'user'; sessionStorage.setItem('fratelliAuth', JSON.stringify(auth));`
4. Refresh the page or wait for automatic session check

**Expected Results:**
- ✅ Console shows: `⚠️ Sessione senza privilegi admin per ID [16/12] - aggiornamento...`
- ✅ Console shows: `✅ Sessione server sincronizzata`
- ✅ Admin button becomes visible again automatically
- ✅ `sessionStorage.fratelliAuth` now has `admin_access: true` and `role: 'admin'`

### Test 5.3: Session Timeout (10 Minutes)
**Steps:**
1. Login as any user
2. Leave browser open but inactive for 11+ minutes
3. Try to navigate or perform action

**Expected Results:**
- ✅ Session expired
- ✅ Alert: "La tua sessione è scaduta. Effettua nuovamente il login."
- ✅ Redirected to login
- ✅ Must login again

### Test 5.2: Concurrent Logins
**Steps:**
1. Login as Emiliano in Browser A
2. Login as Emiliano in Browser B
3. Logout from Browser A
4. Try to use session in Browser B

**Expected Results:**
- ✅ Both browsers work independently
- ✅ Logout in one doesn't affect the other
- ✅ Each has separate session

### Test 5.3: Direct Admin URL Access (Not Logged In)
**Steps:**
1. Ensure logged out (clear cookies/storage)
2. Try to access `/admin/dashboard`

**Expected Results:**
- ❌ Access denied
- ✅ Redirected to `/?error=login_required`

## Test Suite 6: Browser Console Checks

### Check for JavaScript Errors
**Expected:**
- ❌ NO JavaScript errors in console
- ❌ NO 404 errors for resources
- ✅ Clean console (warnings OK, errors NOT OK)

### Check Network Tab
**On login:**
- ✅ POST `/api/fratelli/login` returns 200
- ✅ Response includes `admin_access: true` for admins
- ✅ Cookie set: `kilwinning_session`

**On logout:** ⭐ ENHANCED
- ✅ POST `/api/fratelli/logout` returns 200
- ✅ Response: `{ success: true, redirect: '/', message: 'Logout completato' }`
- ✅ Cookie `kilwinning_session` cleared
- ✅ Even if server returns error, client clears storage and redirects

**On admin access:**
- ✅ GET `/admin/api/check-access` returns 200
- ✅ Response: `{ hasAccess: true, user: {...} }`

**On session validation (every 2 minutes):** ⭐ NEW
- ✅ GET `/api/fratelli/me` returns 200
- ✅ Response: `{ success: true, authenticated: true, user: {...} }`
- ✅ For admin users (ID 16, 12): `user.admin_access: true` and `user.role: 'admin'`

## Automated Testing Commands

### Quick Smoke Test
```bash
# Check server starts
npm start &
SERVER_PID=$!
sleep 5

# Test health endpoint
curl -s http://localhost:3000/api/health | grep "online"

# Kill server
kill $SERVER_PID
```

### Check Logs
```bash
# Watch for admin logins
tail -f logs/combined.log | grep "Login ADMIN"

# Watch for logout events
tail -f logs/combined.log | grep "Logout"

# Check for errors
tail -f logs/error.log
```

## Test Results Template

### Test Run: [Date/Time]
**Tester:** [Your Name]  
**Environment:** [Local/Dev/Production]  
**Browser:** [Chrome/Firefox/Safari]  

| Test ID | Test Name | Status | Notes |
|---------|-----------|--------|-------|
| 1.1 | Login as Emiliano | ✅/❌ | |
| 1.2 | Admin Button Navigation | ✅/❌ | |
| 1.3 | Admin Pages Access | ✅/❌ | |
| 2.1 | Logout from Dashboard | ✅/❌ | |
| 2.2 | Session Invalid After Logout | ✅/❌ | |
| 2.3 | Logout from Admin | ✅/❌ | |
| 3.1 | Fratelli Modal | ✅/❌ | |
| 3.2 | Tornate Modal | ✅/❌ | |
| 3.3 | Tavole Modal | ✅/❌ | |
| 3.4 | Modal Button Closing | ✅/❌ | |
| 4.1 | Regular User Login | ✅/❌ | |
| 4.2 | Regular User Cannot Access Admin | ✅/❌ | |
| 5.1 | Session Timeout | ✅/❌ | |
| 5.2 | Concurrent Logins | ✅/❌ | |
| 5.3 | Direct Admin URL | ✅/❌ | |

**Overall Status:** ✅ PASS / ❌ FAIL  
**Bugs Found:** [List any bugs]  
**Comments:** [Additional notes]

## Troubleshooting

### Admin button not showing
1. Check console for: `✅ Is Admin? true`
2. Verify `ADMIN_USERS` includes user ID
3. Check sessionStorage: `admin_access: true`
4. Check element exists: `document.getElementById('adminHeaderBtn')`

### Logout not working
1. Check network tab for POST `/api/fratelli/logout`
2. Check console for error messages
3. Verify server endpoint is reachable
4. Try manual: `fetch('/api/fratelli/logout', {method: 'POST'})`

### Modal still closing on backdrop click
1. Check browser cache - hard refresh (Ctrl+Shift+R)
2. Verify correct JS file loaded (check timestamp)
3. Check console for `window.onclick` still defined
4. Look for conflicting event listeners

### Admin access denied
1. Check session: `/admin/api/check-access`
2. Verify login response included `admin_access: true`
3. Check server logs for `👑 Login ADMIN`
4. Try logout and login again

## Success Criteria ⭐ UPDATED

All tests must pass (✅) for deployment approval:

### Admin Access (CRITICAL)
- ✅ **Paolo Giulio Gazzano (ID=16) has admin access in ALL circumstances**
- ✅ **Emiliano Menicucci (ID=12) has admin access in ALL circumstances**
- ✅ Admin button visible for both users in dashboard header
- ✅ Admin button navigates to `/admin/dashboard` successfully
- ✅ Both can access all admin pages without errors
- ✅ Session always contains `admin_access: true` and `role: 'admin'` for IDs 16 & 12
- ✅ Auto-correction works if admin flags are lost

### Logout (CRITICAL)
- ✅ **Logout ALWAYS calls server endpoint** `/api/fratelli/logout`
- ✅ **Server session is ALWAYS destroyed** (verified in server logs)
- ✅ Both `sessionStorage` AND `localStorage` are cleared
- ✅ Alert shows if server call fails
- ✅ Logout completes even if network error occurs
- ✅ After logout, accessing protected pages redirects to login

### Session Validation (NEW)
- ✅ SessionKeeper runs on all fratelli pages
- ✅ Automatic check every 2 minutes via `/api/fratelli/me`
- ✅ Forces logout if server session is invalid
- ✅ Updates admin privileges automatically if needed

### General
- ✅ Modals only close via buttons (not backdrop click)
- ✅ No JavaScript errors in console
- ✅ No security vulnerabilities introduced
- ✅ Regular users (non-admin) cannot access admin area

---

## Implementation Details ⭐ NEW

### Backend Changes (`server.js`)

**Login endpoint** (`POST /api/fratelli/login`):
- Triple admin verification: ID → username → database role
- Forced admin check for IDs 16 and 12 at the end
- Always sets `role: 'admin'` AND `admin_access: true` for admin users

**Session validation** (`GET /api/fratelli/me`):
- Checks if user ID is 16 or 12
- Auto-forces admin privileges if missing
- Returns updated session data

**Logout endpoint** (`POST /api/fratelli/logout`):
- Destroys session completely
- Clears cookie always (even on errors)
- Returns success even with warnings for client-side compatibility

### Frontend Changes

**New utility files:**
- `public/js/fratelli/admin-access-utility.js` - Centralized admin logic
- `public/js/fratelli/logout-utility.js` - Centralized logout function
- `public/js/session-keeper.js` - Session validation every 2 minutes

**Key functions:**
- `ADMIN_USERS = [16, 12]` - Global constant
- `setupAdminAccess()` - Auto-corrects admin privileges
- `logoutFratelli()` - Guaranteed server logout
- `SessionKeeper` - Automatic session monitoring

### Console Log Patterns

**Successful admin login:**
```
👑 Login ADMIN (ID hardcoded): Paolo Giulio Gazzano [@paolo.giulio.gazzano] [ID=16]
🔒 FORCED ADMIN ACCESS per ID: 16 (Paolo/Emiliano)
✅ Login successful: Paolo Giulio Gazzano [@paolo.giulio.gazzano] [fratello] (ADMIN)
```

**Successful logout:**
```
🚪 Inizio procedura logout...
📡 Chiamata POST /api/fratelli/logout...
✅ Logout server completato con successo
🧹 Pulizia dati locali...
✅ Logout completo - redirect a homepage
```

**Session validation:**
```
🔍 Verifica sessione: /api/fratelli/me
✅ Sessione valida per: Paolo Giulio Gazzano - Admin: true
```
