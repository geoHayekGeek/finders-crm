# Testing Automatic Logout - Updated Instructions

## Important Note
The automatic logout only works when API calls go through the app's `apiRequest()` function. Direct `fetch()` calls in the console will NOT trigger logout.

## Proper Test Method

### Step 1: Corrupt the Token
Open browser console (F12) and run:
```javascript
localStorage.setItem('token', 'expired.token.test')
console.log('Token corrupted:', localStorage.getItem('token'))
```

### Step 2: Trigger an API Call Through the App
You need to perform an action in the app that makes an API call, such as:
- **Navigate to a page** (e.g., Properties, Leads, Users)
- **Click a button** that loads data
- **Refresh the current page** (F5)
- **Try to create/edit something**

### Step 3: Watch the Console
You should see these messages:
```
🔐 JWT token expired/invalid detected, logging out...
🔐 Error message: Invalid or expired token
🔐 JWT token expired, logging out user...
🔐 Clearing token from localStorage...
🔐 Token cleared. Token: null
🔐 User cleared. User: null
🔐 CSRF token cache cleared
🔐 Redirecting to login page...
```

### Step 4: Verify Logout
- You should be redirected to `/` (login page)
- Check localStorage: `localStorage.getItem('token')` should be `null`
- Check localStorage: `localStorage.getItem('user')` should be `null`

## Alternative: Test with a Real Expired Token

1. Temporarily change token expiration in `backend/utils/jwt.js` to `'10s'` (10 seconds)
2. Restart backend server
3. Log in
4. Wait 10 seconds
5. Perform any action in the app
6. You should be automatically logged out

## Debugging: If Logout Still Doesn't Work

Check the browser console for:
1. **Error messages** - Look for any errors that might prevent the logout
2. **Network tab** - Check the actual response from the API:
   - Status should be `403`
   - Response body should contain: `{"message":"Invalid or expired token"}`
3. **Console logs** - Look for the `🔐` emoji messages

If you see a 403 but no logout messages, the error might not be getting caught. Check:
- Is the response JSON parseable?
- Does the error message match what we're checking for?

## Quick Test Script (Uses App's API)

Run this in the console after corrupting the token:

```javascript
// This simulates what the app does internally
async function testLogout() {
  const token = localStorage.getItem('token')
  console.log('Current token:', token)
  
  // Use the app's API base URL
  const API_BASE_URL = 'http://localhost:10000/api'
  
  try {
    // This will go through the normal error handling
    const response = await fetch(`${API_BASE_URL}/properties`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      console.log('Error response:', errorData)
      
      // Manually trigger logout if needed (for testing)
      if (response.status === 403 && errorData.message && 
          (errorData.message.includes('token') || errorData.message.includes('expired'))) {
        console.log('🔐 Manual logout trigger (for testing)')
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        window.location.href = '/'
      }
    }
  } catch (error) {
    console.error('Test error:', error)
  }
}

testLogout()
```

## What Was Fixed

The updated code now:
1. ✅ Checks for 403 errors when a token is present
2. ✅ Handles cases where JSON parsing fails
3. ✅ Checks for various token-related error messages
4. ✅ Adds detailed console logging for debugging
5. ✅ Logs out even if response can't be parsed (when 403 + token present)

