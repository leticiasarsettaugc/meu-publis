# Meu Publis — painel financeiro e rotina para creators

Aplicativo web responsivo e instalável (PWA), em português do Brasil.

## Recursos
- Cadastro de marca/cliente, valor em reais, data da campanha, tipo e detalhes da entrega.
- Status de pagamento recebido ou pendente.
- Edição e exclusão de campanhas.
- Área separada “Minha rotina creator” para cadastrar permutas, eventos presenciais, reuniões e afiliações.
- Campos específicos: produto/valor estimado/entrega em permutas; horário/local em eventos e reuniões; cupom, link, comissão e vigência em afiliações.
- Filtros por categoria, mês, ano e busca; edição e exclusão dos registros creator.
- Contadores por categoria. Permutas e comissões não são somadas automaticamente ao faturamento de publis.
- Filtros por mês, ano e busca por marca/entrega.
- Totais gerais contratado, recebido e a receber; resumo financeiro do período selecionado.
- Armazenamento local automático via IndexedDB.
- Exportação e restauração de backup JSON com publis e registros da rotina creator; backups antigos de publis continuam compatíveis.
- Cache offline da interface via Service Worker (após a primeira abertura online).

## Privacidade e armazenamento
As publis e os registros da rotina creator são guardados em lojas separadas do IndexedDB do navegador, neste aparelho e na origem (endereço) publicada. A atualização preserva os registros de publis já existentes no banco local. Não existe servidor de dados, login ou sincronização em nuvem. A interface solicita ao navegador armazenamento persistente quando disponível, mas isso não é uma garantia absoluta: limpar os dados do site, trocar de aparelho/navegador ou perder acesso ao armazenamento pode apagar os registros. Exporte backups JSON regularmente e guarde-os em Arquivos/iCloud Drive ou outro local seguro. Para recuperar: abra o app, toque no ícone de importar (seta para cima) e selecione o backup JSON.

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

## Atualizar uma instalação já publicada
1. Antes da atualização, exporte um backup pelo ícone de download no topo do aplicativo.
2. Extraia a nova versão do ZIP.
3. No repositório GitHub, use **Add file → Upload files** e envie os arquivos atualizados `index.html`, `app.js`, `styles.css`, `service-worker.js` e `README.md` para a raiz do repositório, substituindo os arquivos de mesmo nome.
4. Confirme em **Commit changes** e aguarde o GitHub Pages publicar.
5. Abra o app novamente e atualize a página. A atualização do banco de dados cria uma nova área de registros e preserva a loja antiga de publis. Mesmo assim, guarde o backup feito no passo 1.
