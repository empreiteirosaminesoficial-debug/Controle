# Empreiteiro Saminês — Nova base Android e Windows

Esta pasta é uma reconstrução nova baseada no PWA de referência. Ela não copia a interface original: começa com um painel responsivo próprio, preparado para receber os módulos de obras, serviços, clientes, financeiro e relatórios.

## Desenvolvimento

```bash
npm install
npm run dev
```

A camada visual é compartilhada entre Android e Windows. As integrações com Firebase serão adicionadas atrás de uma camada de dados própria, sem acoplar os componentes diretamente ao SDK.
