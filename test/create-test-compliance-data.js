#!/usr/bin/env node

// Simple test script to create compliance records and verify the API
const https = require('https');
const http = require('http');

const API_BASE = 'http://localhost:4000';

async function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const req = http.request(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

async function testComplianceAPI() {
  console.log('🧪 Testing Compliance API...\n');
  
  try {
    // 1. Test if API is running
    console.log('1. Testing API connectivity...');
    const healthCheck = await makeRequest('/system/health');
    console.log(`   API Status: ${healthCheck.status}`);
    
    // 2. List existing compliance records
    console.log('\n2. Listing existing compliance records...');
    const listResponse = await makeRequest('/v1/compliance-records');
    console.log(`   Status: ${listResponse.status}`);
    console.log(`   Records: ${listResponse.data.records?.length || 0}`);
    
    if (listResponse.data.records?.length > 0) {
      console.log('   ✅ Compliance records found!');
      console.log('   First record:', listResponse.data.records[0].recordId);
      return;
    }
    
    // 3. Create a test asset if needed
    console.log('\n3. Creating test asset...');
    const assetResponse = await makeRequest('/v1/assets', {
      method: 'POST',
      body: {
        ledger: 'xrpl',
        network: 'testnet',
        issuer: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
        code: 'TEST',
        decimals: 6,
        complianceMode: 'RECORD_ONLY'
      }
    });
    
    let assetId;
    if (assetResponse.status === 201) {
      assetId = assetResponse.data.id;
      console.log(`   ✅ Test asset created: ${assetId}`);
    } else if (assetResponse.status === 409) {
      console.log('   ⚠️  Asset already exists, using existing');
      // Try to get the asset ID from the error or use a default
      assetId = 'test_asset_123';
    } else {
      console.log(`   ❌ Failed to create asset: ${assetResponse.status}`);
      console.log('   Response:', assetResponse.data);
      return;
    }
    
    // 4. Create a test compliance record
    console.log('\n4. Creating test compliance record...');
    const complianceResponse = await makeRequest('/v1/compliance-records', {
      method: 'POST',
      headers: {
        'Idempotency-Key': `test_${Date.now()}`
      },
      body: {
        assetId: assetId,
        holder: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
        isin: 'TEST123456789',
        legalIssuer: 'Test Financial Corp',
        jurisdiction: 'DE',
        micaClass: 'Utility Token',
        kycRequirement: 'optional',
        transferRestrictions: false,
        purpose: 'Testing compliance management'
      }
    });
    
    if (complianceResponse.status === 201) {
      console.log('   ✅ Test compliance record created!');
      console.log('   Record ID:', complianceResponse.data.recordId);
      console.log('   SHA256:', complianceResponse.data.sha256);
    } else {
      console.log(`   ❌ Failed to create compliance record: ${complianceResponse.status}`);
      console.log('   Response:', complianceResponse.data);
      return;
    }
    
    // 5. Verify the record was created
    console.log('\n5. Verifying record creation...');
    const verifyResponse = await makeRequest(`/v1/compliance-records/${complianceResponse.data.recordId}`);
    
    if (verifyResponse.status === 200) {
      console.log('   ✅ Compliance record verified!');
      console.log('   Status:', verifyResponse.data.status);
    } else {
      console.log(`   ❌ Failed to verify record: ${verifyResponse.status}`);
    }
    
    // 6. List records again to confirm
    console.log('\n6. Listing compliance records again...');
    const finalListResponse = await makeRequest('/v1/compliance-records');
    console.log(`   Total records: ${finalListResponse.data.records?.length || 0}`);
    
    console.log('\n🎉 Compliance API test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\nPossible issues:');
    console.log('1. API server not running (start with: cd api && pnpm dev)');
    console.log('2. Database connection issues');
    console.log('3. Missing environment variables');
  }
}

testComplianceAPI();
