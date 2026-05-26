# Roteiro de Testes Manuais — Recursos LGPD

Este documento fornece as instruções passo a passo para testar manualmente todos os recursos de apoio à conformidade com a LGPD implementados no sistema **Diário Digital**.

---

## 1. Banner de Cookies e Privacidade (Primeiro Acesso)

### Objetivo
Garantir que o banner apareça no primeiro acesso, respeite a escolha do usuário, persista as escolhas e suma nos acessos seguintes.

### Passos
1. Abra o navegador em uma **aba anônima** e acesse o endereço local do sistema (`http://localhost:3000`).
2. Verifique se o banner aparece no rodapé inferior com a mensagem explicativa, os botões **"Política de Privacidade"**, **"Recusar não essenciais"** e **"Aceitar tudo"**.
3. Sem clicar em nada no banner, tente interagir com a tela de login. Verifique se a navegação **não** está bloqueada (o banner é não-intrusivo).
4. Clique no botão **"Política de Privacidade"** e confira se você é redirecionado para a página `/politica-de-privacidade`.
5. Volte para a tela inicial, abra as ferramentas de desenvolvedor (F12) > aba **Aplicação/Armazenamento** > **LocalStorage**.
6. Clique no botão **"Aceitar tudo"** no banner.
7. Verifique se o banner some imediatamente e se foi criada a chave `dc_digital_lgpd_consent` no LocalStorage com o valor:
   `{"status":"accepted","version":"1.0","timestamp":"..."}`.
8. Recarregue a página (F5) e garanta que o banner **não** reaparece.
9. Faça o mesmo procedimento limpando o LocalStorage (ou em outra janela anônima) e clicando em **"Recusar não essenciais"**. Verifique se a chave é criada com `"status":"declined"`.

---

## 2. Formulário de Solicitação LGPD

### Objetivo
Validar o preenchimento, as mensagens de erro e a gravação de solicitações LGPD de titulares.

### Passos
1. Acesse a rota `/solicitacao-lgpd` (pública, mesmo sem login).
2. Tente clicar em **"Enviar Solicitação"** com o formulário em branco. Verifique se o navegador ou a validação acusam campos obrigatórios.
3. Preencha o nome, digite um e-mail inválido (ex: `email-sem-arroba`) e envie. Verifique se aparece a mensagem de alerta em vermelho: `"Por favor, informe um endereço de e-mail válido."`
4. Preencha todos os campos corretamente, mas deixe a caixa de declaração desmarcada e clique em enviar. Verifique o erro de validação.
5. Marque a caixa de declaração de veracidade e envie.
6. Verifique se a tela muda para o estado de **Sucesso**, indicando que a solicitação foi registrada no banco de dados e será tratada no prazo legal de 15 dias.

---

## 3. Centro de Privacidade do Usuário ("Minha Privacidade")

### Objetivo
Garantir que usuários autenticados consigam verificar seus dados, alterar consentimentos opcionais e exportar seu perfil em JSON.

### Passos
1. Faça login no sistema:
   - Como **Servidor** (ex: usando sua conta cadastrada de professor ou gestor).
   - Como **Aluno** (utilizando matrícula/CPF e senha).
2. Clique no botão com o ícone de **Escudo ("Privacidade")** no cabeçalho ou menu mobile.
3. Verifique se a rota muda para `/minha-privacidade`.
4. Confira as informações cadastrais expostas no card principal. Garanta que seus dados pessoais reais (nome, e-mail, perfil, alocações) são exibidos corretamente.
5. Na seção **"Controle de Consentimentos"**, clique no interruptor (toggle) da opção **"Cookies não essenciais / Analíticos"** para desativá-la.
   - Abra o LocalStorage e verifique se o status do consentimento foi atualizado para `declined`.
6. Na seção **"Portabilidade"**, clique no botão **"Exportar Meus Dados (JSON)"**.
   - Verifique se o download de um arquivo com nome `dados_{email_do_usuario}_diario_digital.json` é iniciado automaticamente.
   - Abra o arquivo baixado e garanta que a estrutura contém todas as suas informações de perfil sem expor senhas ou chaves sensíveis.

---

## 4. Painel Administrativo LGPD (Apenas Administradores)

### Objetivo
Garantir que administradores consigam acompanhar e dar tratativas formais às solicitações registradas.

### Passos
1. Faça login como **Administrador** no sistema.
2. Acesse a seção **"Administração"** no menu superior.
3. Verifique se aparece a aba **"LGPD"** à direita de "Usuários".
4. Clique na aba **"LGPD"** e verifique se a lista de solicitações LGPD é carregada do banco.
5. Tente usar a barra de pesquisa para filtrar as solicitações pelo nome do requerente ou e-mail.
6. Alterne os filtros rápidos no topo (Todas, Recebida, Em Análise, Concluída, Recusada) para validar a filtragem dinâmica.
7. Localize uma solicitação pendente e clique no botão **"Tratar"**.
8. No modal que abrir, verifique a mensagem do titular, selecione o novo status (ex: **"Concluída"**) e digite a resposta administrativa formal (ex: `"Seus dados foram retificados conforme solicitado."`).
9. Clique em **"Salvar Alterações"**. Verifique se o modal se fecha, a lista é recarregada exibindo o novo status e um toast de sucesso é disparado.
