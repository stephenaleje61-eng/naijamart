const http = require('http');

function postJson(path, payload, token) {
  const data = JSON.stringify(payload);
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: 'localhost',
        port: 3000,
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      },
      (res) => {
        let respBody = '';
        res.on('data', (c) => (respBody += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(respBody), raw: respBody });
          } catch {
            resolve({ status: res.statusCode, headers: res.headers, raw: respBody });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function getJson(path, token) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: 'localhost',
        port: 3000,
        path,
        method: 'GET',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      },
      (res) => {
        let respBody = '';
        res.on('data', (c) => (respBody += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(respBody), raw: respBody });
          } catch {
            resolve({ status: res.statusCode, headers: res.headers, raw: respBody });
          }
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

async function runAuthSuite() {
  console.log('=== STARTING ZANGAMARKET AUTH & API VERIFICATION SUITE ===\n');

  // Test 1: Health check & CORS
  const health = await getJson('/api/health');
  console.log('[1/8] Health check:', health.status, 'CORS header:', health.headers['access-control-allow-origin']);
  if (health.headers['access-control-allow-origin'] !== '*') {
    throw new Error('CORS origin is not *');
  }

  // Test 2: User registration with fresh credentials
  const testEmail = `testuser_${Date.now()}@zangamarket.ng`;
  const regRes = await postJson('/api/auth/register', {
    name: 'Tunde Bakare',
    email: testEmail,
    password: 'SecurePassword123!',
    role: 'seller',
    phone: '08022334455',
    state: 'Lagos',
    city: 'Ikeja',
    shopName: 'Tunde Electronics'
  });
  console.log('[2/8] User registration status:', regRes.status, 'Success:', regRes.data?.success);
  if (regRes.status !== 201 || !regRes.data?.token) {
    throw new Error('Registration failed: ' + JSON.stringify(regRes.data));
  }
  const token = regRes.data.token;

  // Test 3: Duplicate email rejection (Requirement 7)
  const dupRes = await postJson('/api/auth/register', {
    name: 'Duplicate Person',
    email: testEmail,
    password: 'AnotherPassword123!'
  });
  console.log('[3/8] Duplicate email registration status:', dupRes.status, 'Error:', dupRes.data?.error);
  if (dupRes.status !== 400 || !dupRes.data?.error?.includes('already exists')) {
    throw new Error('Duplicate email not properly rejected with 400: ' + JSON.stringify(dupRes.data));
  }

  // Test 4: Login with valid credentials
  const loginValid = await postJson('/api/auth/login', {
    email: testEmail,
    password: 'SecurePassword123!'
  });
  console.log('[4/8] Valid login status:', loginValid.status, 'Token returned:', !!loginValid.data?.token);
  if (loginValid.status !== 200 || !loginValid.data?.token) {
    throw new Error('Valid login failed!');
  }

  // Test 5: Login with INVALID password (Requirement 7)
  const loginInvalid = await postJson('/api/auth/login', {
    email: testEmail,
    password: 'WrongPassword999!'
  });
  console.log('[5/8] Invalid password rejection status:', loginInvalid.status, 'Error:', loginInvalid.data?.error);
  if (loginInvalid.status !== 401 || !loginInvalid.data?.error?.includes('Invalid email or password')) {
    throw new Error('Invalid password not properly rejected with 401: ' + JSON.stringify(loginInvalid.data));
  }

  // Test 6: Password recovery (Requirement 7)
  const forgotRes = await postJson('/api/auth/forgot-password', {
    email: testEmail
  });
  console.log('[6/8] Forgot password status:', forgotRes.status, 'Reset token generated:', !!forgotRes.data?.resetToken);
  if (forgotRes.status !== 200 || !forgotRes.data?.success) {
    throw new Error('Password recovery failed: ' + JSON.stringify(forgotRes.data));
  }

  // Test 7: Reset password with new password
  const resetRes = await postJson('/api/auth/reset-password', {
    email: testEmail,
    newPassword: 'BrandNewPassword2026!'
  });
  console.log('[7/8] Reset password status:', resetRes.status, 'Message:', resetRes.data?.message);
  if (resetRes.status !== 200 || !resetRes.data?.success) {
    throw new Error('Reset password failed: ' + JSON.stringify(resetRes.data));
  }

  // Verify login with the NEW password
  const loginNewPass = await postJson('/api/auth/login', {
    email: testEmail,
    password: 'BrandNewPassword2026!'
  });
  console.log('      Login with new password status:', loginNewPass.status, '(Verified updated in DB)');
  if (loginNewPass.status !== 200) {
    throw new Error('Could not log in with newly reset password!');
  }

  // Test 8: Product loading (Requirement 7)
  const prodsRes = await getJson('/api/products?limit=5');
  console.log('[8/8] Product catalog fetch status:', prodsRes.status, 'Items count:', prodsRes.data?.items?.length);
  if (prodsRes.status !== 200 || !Array.isArray(prodsRes.data?.items)) {
    throw new Error('Product catalog fetch failed: ' + JSON.stringify(prodsRes.data));
  }

  console.log('\n=== ALL 8 VERIFICATION CHECKS PASSED FLAWLESSLY! ===');
}

runAuthSuite().catch((err) => {
  console.error('\n❌ Suite Error:', err);
  process.exit(1);
});
