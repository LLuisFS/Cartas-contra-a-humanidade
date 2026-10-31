# 🃏 Cartas Contra a Humanidade (PT-BR) - Edição LAN / Termux / Celular

Uma aplicação web completa (React + Tailwind CSS + Node.js + Socket.IO) para jogar **Cartas Contra a Humanidade em Português (PT-BR)** diretamente pelo navegador do smartphone em **redes locais fechadas (LAN / Wi-Fi / Hotspot 4G/5G)**, sem depender de internet externa.

Projetada com suporte nativo para execução em **Porta Única (3000)** no **Termux (Android)**, Raspberry Pi, Linux, Mac ou Windows.

---

## 🚀 Como Executar

### Pré-requisitos
- Node.js instalado (v18+)

---

### 📱 1. Modo Produção / Termux / Celular (Porta Única 3000)
Ideal para rodar direto no celular (via Termux) ou no computador com um único comando. Compila o frontend na pasta `dist` com todas as 491 cartas brancas e 115 pretas embutidas em JSON estático e sobe tudo na porta `3000`:

```bash
# 1. Compila as cartas para JSON estático e gera a pasta dist:
npm run build

# 2. Inicia o servidor em porta única (0.0.0.0:3000):
npm start
# (ou diretamente: node server.js)
```

No **Termux** (Android), você só precisa executar:
```bash
pkg install nodejs
git clone <seu-repo>   # ou copie a pasta para o celular
cd "Cartas contra a humanidade"
npm install
npm run build
node server.js
```

---

### 📱 2. App Nativo do Jogador Host (React Native)
Para o anfitrião jogar e controlar a partida **sem precisar abrir o navegador**:
```bash
# Iniciar o app nativo do Host:
npm run host
```
*(Abra o app **Expo Go** no telemóvel e aponte para o QR Code no terminal, ou use `npm run host:android` para emulador).*

---

### 💻 3. Modo de Desenvolvimento (Concorrente)
Para quem está desenvolvendo e alterando código em tempo real:
```bash
npm run dev
```
*(Inicia o Vite com Hot-Reload na porta 3000 e o Backend na 3001 com proxy transparente).*

---

## 📶 Conexão via Hotspot de Celular (Android) & Termux

### Deteção e Ajuste Manual de IP (Hotspot)
Em alguns aparelhos Android, devido a restrições de permissão/SELinux do sistema operacional, o Node.js no Termux pode não conseguir listar o IP da interface `wlan` automaticamente.

Pensando nisso:
1. No painel do **Lobby** e no modal de **QR Code**, o Host tem um botão **"Ajustar"** onde pode:
   - Digitar qualquer IP manualmente.
   - Usar atalhos rápidos de 1 clique:
     - `192.168.43.1` (IP padrão de Hotspot Android na maioria das marcas).
     - `192.168.234.1` (IP padrão de Hotspot Samsung/Motorola/Xiaomi).
2. Ao alterar o IP, o **QR Code e o link são atualizados em tempo real** para todos os jogadores conectados!

---

## ⚡ Screen Wake Lock (Tela Sempre Ativa)
- A aplicação utiliza a API nativa `navigator.wakeLock.request('screen')` para **impedir que a tela do celular do host ou dos jogadores apague** e cause suspensão da conexão Wi-Fi/Socket.
- Se o jogador trocar de aplicativo e voltar, o sistema reativa o Wake Lock automaticamente através do evento `visibilitychange`.
- Um indicador visual (`⚡ Tela Ativa`) confirma o status no topo e no Lobby.

---

## 🛑 Desfazer / Resetar Sala (Sem Parar o Servidor)
- O Host pode clicar em **"Desfazer Sala"** tanto no Lobby quanto no topo da tela (`TopBar`) durante qualquer momento da partida.
- A sala é resetada para o estado inicial (`LOBBY`), zerando placares, mãos e reembaralhando o baralho, **sem precisar reiniciar o processo Node.js / Termux**.
- O Host também pode remover jogadores inativos/fantasmas através do botão de expulsão na lista de jogadores do Lobby.

---

## 🧪 Testes Automatizados

```bash
# Executa todos os testes (Parser CSV + E2E com simulação multijogador, reconexão e reset)
npm test

# Testar apenas servidor de produção em porta única (dist + API na 3000)
node server/testProduction.js
```
