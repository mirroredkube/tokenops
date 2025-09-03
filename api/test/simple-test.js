import { test } from 'tap'

test('Basic API connectivity test', async (t) => {
  // Test that we can make a basic request
  const response = await fetch('http://localhost:4000/v1/compliance/requirements')
  const data = await response.json()
  
  t.ok(data.templates, 'Should have templates array')
  t.ok(Array.isArray(data.templates), 'Templates should be an array')
  t.ok(data.templates.length > 0, 'Should have at least one template')
  
  console.log('✅ Basic API connectivity test passed')
  console.log(`📋 Found ${data.templates.length} requirement templates`)
})

test('Evidence endpoint structure test', async (t) => {
  // Test that the evidence endpoint exists (should return 404 for invalid ID)
  const response = await fetch('http://localhost:4000/v1/compliance/evidence/invalid-id')
  
  t.equal(response.status, 404, 'Invalid evidence ID should return 404')
  
  console.log('✅ Evidence endpoint structure test passed')
})

test('Requirement status endpoint test', async (t) => {
  // Test that the requirement status endpoint exists (should return 404 for invalid ID)
  const response = await fetch('http://localhost:4000/v1/compliance/requirements/invalid-id', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      status: 'SATISFIED',
      rationale: 'Test'
    })
  })
  
  t.equal(response.status, 404, 'Invalid requirement ID should return 404')
  
  console.log('✅ Requirement status endpoint test passed')
})

console.log('🧪 Running simple API connectivity tests...')
console.log('==========================================')
