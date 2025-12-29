# Testing Token Expiration & Automatic Logout

This guide provides several methods to test if the automatic logout functionality works when JWT tokens expire.

## Method 1: Temporarily Change Token Expiration (Recommended for Quick Testing)

This is the easiest method - temporarily change the token expiration to a very short time (like 10 seconds).

### Steps:
1. Open `backend/utils/jwt.js`
2. Temporarily change line 10 from:
   ```javascript
   { expiresIn: '16h' }
   ```
   to:
   ```javascript
   { expiresIn: '10s' }  // or '1m' for 1 minute
   ```
3. Restart your backend server
4. Log in to the application
5. Wait 10 seconds (or 1 minute if you used '1m')
6. Try to perform any action (navigate to a page, click a button, etc.)
7. You should be automatically logged out and redirected to the login page
8. **Important:** Change it back to `'16h'` after testing!

## Method 2: Manually Corrupt Token in Browser (Quick Test)

This simulates an expired/invalid token without waiting.

### Steps:
1. Log in to the application
2. Open browser DevTools (F12)
3. Go to the **Console** tab
4. Run this command to corrupt your token:
   ```javascript
   localStorage.setItem('token', 'invalid.expired.token')
   ```
5. Try to perform any action (refresh the page, navigate, click a button)
6. You should see in the console: `🔐 JWT token expired detected, logging out...`
7. You should be automatically redirected to the login page
8. Check that localStorage is cleared (token and user should be removed)

## Method 3: Use Browser Console to Simulate Expired Token Response

This method intercepts API responses to simulate the expired token error.

### Steps:
1. Log in to the application
2. Open browser DevTools (F12)
3. Go to the **Network** tab
4. Perform any action that makes an API call
5. Find the API request in the Network tab
6. Right-click on it → **Copy** → **Copy as fetch**
7. In the **Console** tab, paste and modify it to return a 403 error:
   ```javascript
   fetch('YOUR_API_URL', {
     method: 'GET',
     headers: {
       'Authorization': `Bearer ${localStorage.getItem('token')}`
     }
   }).then(async (response) => {
     if (response.ok) {
       // Simulate expired token by creating a fake 403 response
       const fakeResponse = new Response(
         JSON.stringify({ message: 'Invalid or expired token' }),
         { status: 403, headers: { 'Content-Type': 'application/json' } }
       );
       // This will trigger the logout handler
       throw new Error('Simulated expired token');
     }
   });
   ```

## Method 4: Create a Test Endpoint (For Development)

Create a test endpoint that always returns the expired token error.

### Steps:
1. Add this to your backend routes (temporarily):
   ```javascript
   // In your routes file (e.g., routes/index.js or app.js)
   router.get('/api/test-expired-token', authenticateToken, (req, res) => {
     // This will never be reached because authenticateToken will fail
     res.json({ message: 'This should not appear' });
   });
   ```

2. Or create a test route that bypasses auth and returns the error:
   ```javascript
   router.get('/api/test-expired-token', (req, res) => {
     res.status(403).json({ message: 'Invalid or expired token' });
   });
   ```

3. In your frontend, call this endpoint:
   ```javascript
   // In browser console
   fetch('http://localhost:10000/api/test-expired-token', {
     headers: {
       'Authorization': `Bearer ${localStorage.getItem('token')}`
     }
   });
   ```

4. You should be automatically logged out

## Method 5: Monitor Console Logs

Watch for the logout messages in the browser console.

### Steps:
1. Open browser DevTools (F12)
2. Go to the **Console** tab
3. Clear the console
4. Log in to the application
5. Use Method 2 (corrupt token) or wait for actual expiration
6. Look for these console messages:
   - `🔐 JWT token expired detected, logging out...`
   - `🔐 JWT token expired, logging out user...`
7. Check that you're redirected to `/`

## What to Verify:

✅ **Token is cleared from localStorage**
- Check: `localStorage.getItem('token')` should return `null`

✅ **User data is cleared from localStorage**
- Check: `localStorage.getItem('user')` should return `null`

✅ **User is redirected to login page**
- Check: URL should change to `/` (or your login page)

✅ **Console shows logout messages**
- Check: Console should show the logout messages

✅ **CSRF token cache is cleared**
- Check: Console should show `🔐 CSRF token cache cleared`

## Quick Test Script (Browser Console)

Run this in your browser console after logging in:

```javascript
// Test automatic logout
console.log('🧪 Testing token expiration logout...');
console.log('Current token:', localStorage.getItem('token'));
console.log('Current user:', localStorage.getItem('user'));

// Corrupt the token
localStorage.setItem('token', 'expired.token.test');

// Try to make an API call
fetch('http://localhost:10000/api/properties', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
}).catch(err => {
  console.log('✅ API call failed as expected');
  setTimeout(() => {
    console.log('Token after logout:', localStorage.getItem('token'));
    console.log('User after logout:', localStorage.getItem('user'));
    console.log('Current URL:', window.location.href);
  }, 1000);
});
```

## Restoring After Testing

After testing, make sure to:
1. Change token expiration back to `'16h'` in `backend/utils/jwt.js`
2. Restart your backend server
3. Log in again with valid credentials

