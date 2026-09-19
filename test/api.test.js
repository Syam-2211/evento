const assert = require('assert');
const app = require('../src/app');
const { localDb } = require('../src/config/db');
const http = require('http');

// Reset local db collections for clean test state
localDb.saveCollection('users', []);
localDb.saveCollection('access_logs', []);

let server;
let baseUrl;
let token = '';
let createdStudentId = '';
let createdGuestId = '';

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(baseUrl + path);
    const reqHeaders = { 'Content-Type': 'application/json', ...headers };
    if (token) {
      reqHeaders['Authorization'] = `Bearer ${token}`;
    }

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: reqHeaders
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('--- Starting BioAccess AI API Test Suite ---');

  server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://localhost:${port}`;

  try {
    // 1. Admin Login Test
    console.log('\n[Test 1] Testing Admin Login...');
    const loginRes = await request('POST', '/api/auth/login', { username: 'admin', password: 'admin123' });
    assert.strictEqual(loginRes.status, 200, 'Admin login should return 200');
    assert.strictEqual(loginRes.body.success, true, 'Admin login should succeed');
    assert.ok(loginRes.body.token, 'Token should be returned');
    token = loginRes.body.token;
    console.log('✓ Admin Login test passed');

    // 2. Register Student with NFC and Face Descriptor
    console.log('\n[Test 2] Registering a Student with Face Descriptor & NFC Card...');
    const sampleDescriptor1 = new Array(128).fill(0.123);
    const studentRes = await request('POST', '/api/users', {
      name: 'John Student',
      role: 'Student',
      nfcCardId: 'NFC-STU-1001',
      email: 'john@university.edu',
      faceData: sampleDescriptor1
    });
    assert.strictEqual(studentRes.status, 201, 'Student creation should return 201');
    assert.strictEqual(studentRes.body.user.role, 'Student', 'User role should be Student');
    createdStudentId = studentRes.body.user._id || studentRes.body.user.id;
    console.log('✓ Student Registration test passed');

    // 3. Register Special Guest
    console.log('\n[Test 3] Registering a Special Guest (Spl Guest)...');
    const sampleDescriptor2 = new Array(128).fill(0.888);
    const guestRes = await request('POST', '/api/users', {
      name: 'Dr. VIP Guest',
      role: 'Special Guest',
      nfcCardId: 'NFC-GST-9009',
      email: 'vip@guest.com',
      faceData: sampleDescriptor2
    });
    assert.strictEqual(guestRes.status, 201, 'Guest creation should return 201');
    assert.strictEqual(guestRes.body.user.role, 'Special Guest', 'User role should be Special Guest');
    createdGuestId = guestRes.body.user._id || guestRes.body.user.id;
    console.log('✓ Special Guest Registration test passed');

    // 4. Verify Access via NFC Card
    console.log('\n[Test 4] Verifying Access via NFC Card swipe...');
    const nfcVerify = await request('POST', '/api/access/verify-nfc', { nfcCardId: 'NFC-STU-1001' });
    assert.strictEqual(nfcVerify.status, 200);
    assert.strictEqual(nfcVerify.body.accessGranted, true, 'Access should be granted for valid student NFC card');
    assert.strictEqual(nfcVerify.body.user.name, 'John Student');
    console.log('✓ NFC Verification test passed');

    // 5. Verify Access via Facial Recognition Vector
    console.log('\n[Test 5] Verifying Access via Facial Recognition Vector...');
    const matchVector = new Array(128).fill(0.125); // Close to 0.123
    const faceVerify = await request('POST', '/api/access/verify-face', { descriptor: matchVector });
    assert.strictEqual(faceVerify.status, 200);
    assert.strictEqual(faceVerify.body.accessGranted, true, 'Facial recognition should grant access to John Student');
    assert.strictEqual(faceVerify.body.user.name, 'John Student');
    console.log('✓ Facial Recognition test passed');

    // 6. Test Denied Access (Unrecognized Face)
    console.log('\n[Test 6] Testing Denied Access for Unrecognized Face...');
    const randomVector = new Array(128).fill(0.999); // Far from student descriptor 0.123 and guest descriptor 0.888
    const unknownVerify = await request('POST', '/api/access/verify-face', { descriptor: randomVector, threshold: 0.1 });
    assert.strictEqual(unknownVerify.body.accessGranted, false, 'Unrecognized face should be denied');
    console.log('✓ Unrecognized face denial test passed');

    // 7. Verify Logs & Stats API
    console.log('\n[Test 7] Verifying Access Logs & System Statistics...');
    const statsRes = await request('GET', '/api/access/stats');
    assert.strictEqual(statsRes.body.stats.totalStudents, 1);
    assert.strictEqual(statsRes.body.stats.totalGuests, 1);
    assert.ok(statsRes.body.stats.totalGranted >= 2);
    console.log('✓ System Stats test passed');

    console.log('\n====================================================');
    console.log('ALL API & ACCESS CONTROL TESTS PASSED SUCCESSFULLY!');
    console.log('====================================================');
  } catch (err) {
    console.error('Test failed:', err);
    process.exitCode = 1;
  } finally {
    server.close();
  }
}

runTests();
