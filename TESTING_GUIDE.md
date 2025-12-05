# Testing Guide for Admin Access & Modal Fixes

## Quick Start Testing

### Prerequisites
1. Server running: `npm start`
2. Browser with DevTools open
3. Test users available:
   - Emiliano Menicucci (ID=12, username: `emiliano.menicucci`)
   - Paolo Giulio Gazzano (ID=16, username: `paolo.giulio.gazzano`)
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

## Test Suite 2: Logout Functionality

### Test 2.1: Logout from Fratelli Dashboard
**Steps:**
1. Login as any user
2. Go to `/fratelli/dashboard`
3. Click "🚪 Esci" button
4. Confirm logout dialog

**Expected Results:**
- ✅ Console shows: `✅ Logout server completato`
- ✅ Redirected to `/` (login page)
- ✅ `sessionStorage.fratelliAuth` is removed
- ✅ `localStorage.fratelliAuth` is removed (if it was set)

**Verify Session Destroyed:**
```bash
# In server logs (if running with logs):
✅ Logout fratello completato
```

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

## Test Suite 5: Edge Cases

### Test 5.1: Session Timeout
**Steps:**
1. Login as any user
2. Wait 11 minutes (session timeout is 10 minutes)
3. Try to navigate or perform action

**Expected Results:**
- ✅ Session expired
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

**On logout:**
- ✅ POST `/api/fratelli/logout` returns 200
- ✅ Cookie cleared

**On admin access:**
- ✅ GET `/admin/api/check-access` returns 200
- ✅ Response: `{ hasAccess: true }`

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

## Success Criteria

All tests must pass (✅) for deployment approval:
- ✅ Emiliano (ID=12) has admin access
- ✅ Admin button navigates to dashboard
- ✅ Logout destroys server session
- ✅ Modals only close via buttons
- ✅ No JavaScript errors
- ✅ No security vulnerabilities introduced
