// Simple test script to verify the new endpoint
const fetch = require('node-fetch');

async function testUserModelsEndpoint() {
  const userId = '68ecd81bd5dd96b3feb717fd'; // The user ID from your logs
  const baseUrl = 'http://localhost:5000';
  
  try {
    console.log('Testing endpoint:', `${baseUrl}/api/v1/models/user/${userId}/list`);
    
    const response = await fetch(`${baseUrl}/api/v1/models/user/${userId}/list`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // You might need to add an auth token here:
        // 'Authorization': 'Bearer YOUR_TOKEN_HERE'
      }
    });
    
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    
    const data = await response.text();
    console.log('Response:', data);
    
    if (response.ok) {
      const jsonData = JSON.parse(data);
      console.log('\n✅ Success! Response structure:');
      console.log('- Downloaded models:', jsonData.data?.downloaded?.length || 0);
      console.log('- Available to download:', jsonData.data?.availableToDownload?.length || 0);
      console.log('- Available global:', jsonData.data?.availableGlobal?.length || 0);
      console.log('- User info:', jsonData.user ? 'Present' : 'Missing');
    } else {
      console.log('\n❌ Request failed');
    }
    
  } catch (error) {
    console.error('Error testing endpoint:', error.message);
  }
}

testUserModelsEndpoint();