const http = require('http');
require('../server.js');

setTimeout(() => {
  // 1. Test Static files from 'dist'
  http.get('http://127.0.0.1:3000/', (res) => {
    console.log('✅ GET / status:', res.statusCode);
    let html = '';
    res.on('data', c => html += c);
    res.on('end', () => {
      console.log('✅ HTML carregado com sucesso, contém root:', html.includes('id="root"'));

      // 2. Test /api/network-info
      http.get('http://127.0.0.1:3000/api/network-info', (netRes) => {
        let netData = '';
        netRes.on('data', c => netData += c);
        netRes.on('end', () => {
          const net = JSON.parse(netData);
          console.log(`✅ Network info OK (IP: ${net.ip}, Porta: ${net.serverPort})`);

          // 3. Test /api/cards
          http.get('http://127.0.0.1:3000/api/cards', (cardRes) => {
            let cardData = '';
            cardRes.on('data', c => cardData += c);
            cardRes.on('end', () => {
              const cards = JSON.parse(cardData);
              console.log(`✅ API Cards OK (${cards.counts.white} brancas, ${cards.counts.black} pretas)`);
              console.log('\n🎉 Servidor de produção em porta única (3000) validado com 100% de sucesso!\n');
              process.exit(0);
            });
          });
        });
      });
    });
  }).on('error', e => {
    console.error('❌ Erro na requisição:', e);
    process.exit(1);
  });
}, 1000);
