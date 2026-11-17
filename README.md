# Meu Publis — controle financeiro para creators

Aplicativo web responsivo e instalável (PWA), em português do Brasil.

## Recursos
- Cadastro de marca/cliente, valor em reais, data da campanha, tipo e detalhes da entrega.
- Status de pagamento recebido ou pendente.
- Edição e exclusão de campanhas.
- Filtros por mês, ano e busca por marca/entrega.
- Totais gerais contratado, recebido e a receber; resumo financeiro do período selecionado.
- Armazenamento local automático via IndexedDB.
- Exportação e restauração de backup JSON.
- Cache offline da interface via Service Worker (após a primeira abertura online).

## Privacidade e armazenamento
Os registros são guardados no IndexedDB do navegador, neste aparelho e na origem (endereço) publicada. Não existe servidor de dados, login ou sincronização em nuvem. A interface solicita ao navegador armazenamento persistente quando disponível, mas isso não é uma garantia absoluta: limpar os dados do site, trocar de aparelho/navegador ou perder acesso ao armazenamento pode apagar os registros. Exporte backups JSON regularmente e guarde-os em Arquivos/iCloud Drive ou outro local seguro. Para recuperar: abra o app, toque no ícone de importar (seta para cima) e selecione o backup JSON.

O backup inclui informações financeiras e nomes de marcas; guarde-o como um documento privado.

## Publicar gratuitamente com GitHub Pages
1. Crie ou entre em uma conta em https://github.com.
2. Crie um repositório **público** chamado `meu-publis`.
3. Envie todos os arquivos desta pasta para a raiz do repositório (a pasta onde está `index.html`).
4. No repositório, abra **Settings → Pages**.
5. Em **Build and deployment**, escolha **Deploy from a branch**; em Branch, selecione **main** e **/(root)**; toque em **Save**.
6. Aguarde o GitHub Pages publicar. A URL será parecida com `https://SEU-USUARIO.github.io/meu-publis/`. Só considere publicado quando o link abrir e a página aparecer.

## Adicionar à Tela de Início do iPhone
1. Abra o endereço publicado no Safari (não dentro do navegador de outro aplicativo).
2. Toque em Compartilhar.
3. Escolha **Adicionar à Tela de Início**. Se aparecer, ative **Abrir como App**.
4. Toque em **Adicionar**. Abra pelo novo ícone.

## Atualizar o app
Substitua os arquivos do repositório pelos novos e aguarde a publicação. Se a interface parecer antiga, feche e reabra o app; em último caso, remova o ícone e adicione novamente. Não apague os dados do site sem antes exportar um backup.

## Atenção ao publicar
No GitHub Free, o repositório usado pelo Pages precisa ser público. Os arquivos do aplicativo ficam visíveis na internet, mas os registros financeiros são armazenados no navegador, não no repositório. Nunca envie backups JSON, planilhas financeiras ou informações bancárias para o repositório.
