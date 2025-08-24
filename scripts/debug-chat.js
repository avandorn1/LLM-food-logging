const fetch = require('node-fetch');

async function testChat() {
  try {
    console.log('Testing chat API with "I had overnight oats"...');
    
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'I had overnight oats',
        conversationHistory: []
      })
    });
    
    const data = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    if (!data.reply || data.reply.trim() === '') {
      console.log('❌ EMPTY RESPONSE DETECTED!');
    } else {
      console.log('✅ Response received:', data.reply);
    }
    
  } catch (error) {
    console.error('Error testing chat:', error);
  }
}

testChat();
