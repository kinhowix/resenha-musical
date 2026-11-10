# 🎸 Resenha Musical

Aplicativo web de cifras colaborativo e sincronizado em tempo real para rodas de violão com amigos.

## ✨ Recursos
- **Palco Sincronizado:** Quando quem está tocando muda a música ou o tom, a tela de todos os amigos na roda atualiza automaticamente em tempo real.
- **Transposição Dinâmica:** Botões `-1` e `+1` semitom instantâneos.
- **Modo Tela Cheia & Rolagem Automática:** 5 velocidades de rolagem + `Wake Lock API` (não deixa a tela do Android ou iPhone apagar no meio da música).
- **Importador Inteligente:** Copie qualquer cifra da internet (ex: Cifra Club) com acordes na linha de cima e cole direto no app — ele converte automaticamente para o formato posicionado.
- **Jukebox da Roda (QR Code):** Seus amigos escaneiam o QR Code e adicionam pedidos de música na fila pelo celular.
- **Histórico de Tocadas:** Ranking automático das músicas mais tocadas nos encontros.

## 🚀 Como rodar localmente

```bash
npm install
npm run dev
```

## 🔥 Configuração do Firebase (Firestore)

Copie o arquivo `.env.example` para `.env` (ou adicione nas Environment Variables da Vercel) com as chaves do seu projeto Firebase:

```env
VITE_FIREBASE_API_KEY=sua_api_key
VITE_FIREBASE_AUTH_DOMAIN=seu_projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seu_projeto_id
VITE_FIREBASE_STORAGE_BUCKET=seu_projeto.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=seu_sender_id
VITE_FIREBASE_APP_ID=seu_app_id
```

