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

  // Test 8: Product loading
  const prodsRes = await getJson('/api/products?limit=5');
  console.log('[8/12] Product catalog fetch status:', prodsRes.status, 'Items count:', prodsRes.data?.items?.length);
  if (prodsRes.status !== 200 || !Array.isArray(prodsRes.data?.items)) {
    throw new Error('Product catalog fetch failed: ' + JSON.stringify(prodsRes.data));
  }

  // Test 9: Permanent Product Posting by Registered Seller
  const newProductTitle = `Original Tecno Camon 30 Pro 5G - ${Date.now()}`;
  const postProductRes = await postJson('/api/products', {
    title: newProductTitle,
    description: 'Brand new in box Tecno Camon 30 Pro 5G with warranty and invoice.',
    price: 385000,
    category: 'phones-tablets',
    condition: 'new',
    whatsapp: '08022334455',
    state: 'Lagos',
    city: 'Ikeja',
    quantity: 3
  }, token);
  console.log('[9/12] Product posting status:', postProductRes.status, 'Created ID:', postProductRes.data?.product?.id);
  if (postProductRes.status !== 201 || !postProductRes.data?.product?.id) {
    throw new Error('Product posting failed: ' + JSON.stringify(postProductRes.data));
  }
  const createdProductId = postProductRes.data.product.id;

  // Verify created product is immediately in public catalog (visible to everyone)
  const publicCheck = await getJson(`/api/products?q=${encodeURIComponent(newProductTitle)}`);
  console.log('       Public catalog verification:', publicCheck.data?.items?.length > 0 ? 'Visible to public' : 'Not found');
  if (!publicCheck.data?.items?.some(i => i.id === createdProductId)) {
    throw new Error('Newly posted product not visible in public marketplace!');
  }

  // Test 10: Anti-Fraud System: Rejection of Prohibited Goods
  const fraudPostingRes = await postJson('/api/products', {
    title: 'Illegal Firearm Pistol with Ammunition',
    description: 'Black pistol gun with full ammunition cartridge.',
    price: 150000,
    category: 'other-goods'
  }, token);
  console.log('[10/12] Anti-Fraud prohibited goods rejection status:', fraudPostingRes.status, 'Error:', fraudPostingRes.data?.error);
  if (fraudPostingRes.status !== 400 || !fraudPostingRes.data?.error?.includes('prohibited goods')) {
    throw new Error('Anti-fraud engine did not reject prohibited goods! ' + JSON.stringify(fraudPostingRes.data));
  }

  // Test 11: Anti-Fraud System: Flagging unrealistic pricing for admin review
  const suspiciousPriceRes = await postJson('/api/products', {
    title: 'Brand New Apple iPhone 16 Pro Max 1TB Sealed',
    description: 'Brand new sealed iPhone 16 Pro Max.',
    price: 25000,
    category: 'phones-tablets'
  }, token);
  console.log('[11/12] Suspicious pricing flagging status:', suspiciousPriceRes.status, 'Moderation Status:', suspiciousPriceRes.data?.product?.moderationStatus);
  if (suspiciousPriceRes.data?.product?.moderationStatus !== 'pending_review') {
    throw new Error('Suspicious pricing listing was not flagged for pending_review: ' + JSON.stringify(suspiciousPriceRes.data));
  }

  // Test 12: Buyer Report feature
  const reportRes = await postJson(`/api/products/${createdProductId}/report`, {
    reason: 'Suspected fraudulent listing',
    details: 'Seller asked for upfront commitment fee before meeting.',
    reporterEmail: 'buyer_test@naijamart.ng'
  });
  console.log('[12/12] Buyer report submission status:', reportRes.status, 'Success:', reportRes.data?.success);
  if (reportRes.status !== 200 || !reportRes.data?.success) {
    throw new Error('Report submission failed: ' + JSON.stringify(reportRes.data));
  }

  console.log('\n=== ALL 12 VERIFICATION & ANTI-FRAUD CHECKS PASSED FLAWLESSLY! ===');
}

runAuthSuite().catch((err) => {
  console.error('\n❌ Suite Error:', err);
  process.exit(1);
});
