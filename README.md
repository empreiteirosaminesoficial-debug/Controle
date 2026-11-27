# Empreiteiro Saminês — Sistema de Gestão de Obras & PWA Oficial

Aplicativo completo PWA (Progressive Web App) para gestão de obras, serviços, clientes (com validação e consulta de CNPJ/CPF na Receita Federal), controle financeiro, comprovantes, orçamentos, vistorias técnicas e sincronização em tempo real via nuvem Google Firebase (Firestore e Authentication).

---

## 🚀 Tecnologias Utilizadas

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, Canvas Confetti.
- **Backend Server:** Node.js, Express, Sharp (processamento de imagens e ícones PWA).
- **Banco de Dados em Nuvem:** Google Firebase Firestore & Firebase Authentication.
- **PWA (Progressive Web App):** Service Worker nativo, Web App Manifest instalável em Android, Windows, Mac e iOS (com suporte a atalhos rápidos e modo offline).
- **Relatórios:** Geração de PDF e exportação para planilhas Excel (.xlsx).

---

## 💻 Como Rodar o Projeto Localmente

### 1. Pré-requisitos
- Node.js versão 20 ou superior instalado
- Gerenciador de pacotes `npm` ou `bun`

### 2. Instalação das Dependências
Abra o terminal na pasta descompactada e execute:
```bash
npm install
```

### 3. Execução em Modo de Desenvolvimento
Para iniciar o servidor local com hot-reload:
```bash
npm run dev
```
O aplicativo estará rodando em: `http://localhost:3000`

### 4. Compilação para Produção
```bash
npm run build
```

### 5. Iniciar Servidor de Produção
```bash
npm start
```

---

## 📁 Estrutura de Arquivos Principais

```
├── public/                 # Ícones PWA (192, 256, 384, 512, maskable), sons e manifest
├── src/
│   ├── components/         # Modais, tabelas, KPIs e componentes da interface
│   │   ├── pages/          # Páginas: Obras, Serviços, Visitas, Clientes, Comprovantes, Empresa, Configuração
│   │   └── pwa/            # Banners de instalação e modal de atualização de ícones
│   ├── hooks/              # Hooks personalizados (usePWA, etc.)
│   ├── lib/                # Configuração do Firebase e Service Worker PWA
│   ├── utils/              # Sincronização em nuvem, gerador de PDF/Excel, formatação, CNPJ/CPF
│   ├── App.tsx             # Componente raiz com navegação e controle de estado
│   ├── main.tsx            # Ponto de entrada do React
│   └── types.ts            # Definições completas de tipos TypeScript
├── server.ts               # Servidor Express com APIs de CNPJ, logo e download do código
├── firestore.rules         # Regras de segurança do Firebase Firestore
├── firebase-applet-config.json # Credenciais de conexão do Firebase
├── vite.config.ts          # Configuração do Vite e bundler
└── package.json            # Scripts e dependências do projeto
```

---

## 📱 Instalação como Aplicativo Nativo (PWA)
- **No Computador (Windows / Mac):** Abra no Google Chrome ou Edge e clique no botão **"Instalar Aplicativo"** na barra de endereços.
- **No Celular Android:** Abra no Chrome e clique em **"Adicionar à Tela Inicial"** ou **"Instalar Aplicativo"**.
- **No iPhone / iPad:** Abra no Safari, toque no botão de **Compartilhar** e selecione **"Adicionar à Tela de Início"**.

---

© Empreiteiro Saminês — Todos os direitos reservados.


## Firebase configurado para o projeto correto

Este código foi adaptado para usar o projeto Firebase `empreiteirosaminesgestao` e o banco Firestore padrão (`(default)`). O arquivo `firebase-applet-config.json` contém a configuração web desse projeto.

### Regras de segurança e autorização

As regras atuais não concedem acesso geral a qualquer conta autenticada. A conta administrativa `empreiteirosaminesoficial@gmail.com` precisa estar verificada. Contas clientes dependem de aprovação administrativa e de vínculo ativo por estabelecimento (`storeId`). Os clientes têm acesso de leitura aos serviços, obras e visitas dos estabelecimentos autorizados; as operações administrativas e coleções globais permanecem restritas ao administrador.

A configuração do Firebase no cliente não substitui as regras de segurança. Antes de disponibilizar a aplicação, valide as regras e os fluxos com o Firebase Emulator e publique-as separadamente, mediante autorização explícita. Nenhum deploy é executado por este pacote.

### Windows (PowerShell)

```powershell
npm install
npm run dev
```

Abra `http://localhost:3000`. Para validar a compilação: `npm run build`.
