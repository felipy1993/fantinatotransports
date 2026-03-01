const https = require('https');

https.get('https://sistemac.fs-sistema.cloud/api/collections/trips', (res) => {
  let data = '';
  res.on('data', (c) => data += c);
  res.on('end', () => {
    try {
      const collection = JSON.parse(data);
      console.log('Fields in trips collection:');
      collection.schema.forEach(field => {
        console.log(`- ${field.name} (${field.type}) [Required: ${field.required}]`);
      });
    } catch (e) {
      console.log('Full response:', data);
    }
  });
}).on('error', console.error);
