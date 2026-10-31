/**
 * Servidor de Produção em Porta Única para Cartas Contra a Humanidade
 * Ideal para rodar no Termux (Android), Raspberry Pi ou qualquer computador.
 * 
 * Executa o backend Express + Socket.IO e serve o frontend React estático da pasta 'dist'
 * na mesma porta (padrão: 3000), escutando em 0.0.0.0.
 */

const { startServer } = require('./server/index');

startServer();
