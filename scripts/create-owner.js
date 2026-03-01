const http = require('http');

function post(url, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const u = new URL(url);
    const opts = {
      hostname: u.hostname,
      port: u.port,
      path: u.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    };
    const req = http.request(opts, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function patch(url, data, cookie) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const u = new URL(url);
    const opts = {
      hostname: u.hostname,
      port: u.port,
      path: u.pathname,
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json', 
        'Content-Length': Buffer.byteLength(body),
        ...(cookie ? { 'Cookie': cookie } : {}),
      },
    };
    const req = http.request(opts, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d, headers: res.headers }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

(async () => {
  const CMS = 'http://localhost:3001';
  
  // Step 1: Create the eski@dmokb.info user
  console.log('=== Creating eski@dmokb.info user ===');
  const createRes = await post(`${CMS}/api/users`, {
    email: process.env.CMS_ADMIN_EMAIL,
    password: process.env.CMS_ADMIN_PASSWORD,
    username: 'eski',
    name: 'Eski',
  });
  console.log('Create status:', createRes.status);
  const createData = JSON.parse(createRes.body);
  const userId = createData.doc?.id;
  console.log('User ID:', userId);
  
  if (!userId) {
    // User might already exist, try to find them
    console.log('User may already exist, trying login...');
  }
  
  // Step 2: Login as existing owner to get admin cookie
  console.log('\n=== Logging in as existing owner ===');
  const loginRes = await post(`${CMS}/api/users/login`, {
    email: process.env.CMS_ADMIN_EMAIL,
    password: process.env.CMS_ADMIN_PASSWORD,
  });
  console.log('Login status:', loginRes.status);
  const loginData = JSON.parse(loginRes.body);
  const token = loginData.token;
  console.log('Token obtained:', !!token);
  console.log('Current owner role:', loginData.user?.role);
  
  if (!token) {
    console.log('Failed to get admin token, cannot set owner role');
    return;
  }
  
  // Step 3: Find eski user
  const findUrl = `${CMS}/api/users?where[email][equals]=eski@dmokb.info&limit=1`;
  const findReq = http.get(findUrl, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', async () => {
      const found = JSON.parse(data);
      const eskiId = found.docs?.[0]?.id || userId;
      console.log('\nEski user ID:', eskiId);
      console.log('Current role:', found.docs?.[0]?.role);
      
      if (!eskiId) {
        console.log('Could not find eski user');
        return;
      }
      
      // Step 4: Update eski to owner role using admin token
      console.log('\n=== Setting eski as owner ===');
      const updateRes = await patch(`${CMS}/api/users/${eskiId}`, {
        role: 'owner',
      }, `payload-token=${token}`);
      console.log('Update status:', updateRes.status);
      console.log('Update response:', updateRes.body.substring(0, 200));
      
      // Step 5: Verify login works
      console.log('\n=== Verifying eski login ===');
      const verifyRes = await post(`${CMS}/api/users/login`, {
        email: process.env.CMS_ADMIN_EMAIL,
        password: process.env.CMS_ADMIN_PASSWORD,
      });
      console.log('Login status:', verifyRes.status);
      const verifyData = JSON.parse(verifyRes.body);
      console.log('Login successful:', !!verifyData.token);
      console.log('User role:', verifyData.user?.role);
      console.log('User email:', verifyData.user?.email);
    });
  });
})();
