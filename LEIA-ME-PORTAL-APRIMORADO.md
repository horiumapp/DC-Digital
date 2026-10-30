# DC Digital — Escola em Destaque (versão 5)

Esta versão reconstrói a apresentação do sistema existente. A prévia navegável está no arquivo `Previa-Cabecalho-da-Escola.html`, entregue separadamente, e usa dados fictícios. O código deste pacote utiliza as integrações reais do projeto original.

## Identidade da escola no diário

A identificação da escola agora ocupa o cabeçalho compartilhado do sistema, substituindo a antiga barra de navegação superior. Nome, logo e dados da escola acompanham as telas de turmas, diário, registro da aula, relatórios e gestão, conforme o contexto disponível. A faixa duplicada dentro do diário e do registro foi removida. A página atual aparece em uma linha abaixo do cabeçalho.

A interface consulta os campos existentes da escola selecionada e utiliza o logo cadastrado em logo_url. Se não houver logo cadastrado, procura um dos logos locais já incluídos no projeto. Se uma imagem falhar, tenta a alternativa local; sem imagem disponível, usa as iniciais da escola. Ao trocar de escola, a identidade anterior não é exibida durante o carregamento.

O cadastro do logo já existe em Gestão → Escolas → Editar escola. Essa versão não altera o cadastro, banco, serviços ou permissões.

A prévia usa a Escola Francisca Mendes como exemplo e inclui seu logo existente no projeto. Professora, estudantes e registros da prévia continuam fictícios.

## Melhorias da versão anterior

- Painel do professor com atalhos para registro da aula, frequência e notas, além de acesso à turma ativa.
- Turmas favoritas salvas neste navegador, separadas por usuário e ano, e filtros combinados por turno e busca.
- Diário com contagens reais de frequências e conteúdos ainda não registrados, barras de progresso e resumo mensal.
- Calendário mensal compacto no celular, com marcadores de situação; agenda com detalhes completos.
- Registro da aula com quantidade de tempos já registrados e orientação específica para cada etapa.
- Chamada com filtros por presença, falta, falta justificada e ausência de marcação. Controles acessíveis identificados por estudante.
- Gestão com atalhos para turmas, alunos e professores.

## O que foi reformulado

- Entrada com composição editorial, ilustração geométrica e formulário independente.
- Navegação lateral clara com pesquisa, identificação do usuário, contexto da turma e navegação inferior no celular.
- Turmas em um painel com pesquisa, cartões por componente e alternância entre cartões e lista.
- Diário com resumo do período, indicadores, calendário com eventos, modo agenda e filtros por situação. Painel lateral para a aula selecionada.
- Registro da aula organizado em etapas: frequência, conteúdo, anotações e avaliações. Frequência em cartões de estudantes com controles de presença.
- Administração com navegação por módulos e área de trabalho central.
- Relatórios organizados por categorias. Novos espaços de acompanhamento, currículo e fechamento de períodos.
- Portal do aluno com identificação, resumo de indicadores e navegação própria.
- Apresentação compartilhada para páginas de privacidade e recuperação de acesso.
- Composições adaptáveis a telas pequenas, menu móvel com controle de foco, formulários com campos maiores e suporte à preferência por movimento reduzido. Tabelas extensas preservam a rolagem horizontal.

As telas internas de cadastro, tabelas de relatórios e editores mantêm seus controles e regras existentes, dentro da nova composição visual. Não houve recriação do processamento dos dados.

## Backend preservado

Comparação byte a byte com o ZIP original confirmou igualdade em 110 arquivos: pasta `supabase`, scripts, serviços, contextos, hooks, bibliotecas, constantes, configuração, tipos, utilitários e os cinco arquivos de dependências/configuração listados no relatório de verificação. Nenhuma migração ou alteração de banco foi executada.

O relatório `VERIFICACAO.md` detalha os resultados. As alterações estão concentradas nas páginas, componentes e estilos do frontend.

## Executar o sistema

1. Extraia este pacote e abra a pasta `DC-Digital-V5`.
2. Instale as dependências com `npm ci`.
3. Configure o `.env` a partir de `.env.example`, utilizando as configurações existentes do seu projeto Supabase.
4. Execute `npm run dev` para desenvolvimento.
5. Execute `npm run build` para gerar a publicação na pasta `dist`.

A prévia HTML não substitui a aplicação e não autentica usuários. No sistema real, login e permissões continuam ligados ao backend existente. A entrega não foi publicada em produção.

## Referências fornecidas pelo usuário

As páginas públicas foram consultadas para identificar organização de tarefas e linguagem do setor. Não foram acessadas áreas autenticadas dos produtos.

- [DED+ de Minas Gerais](https://www.diarioescolardigital.educacao.mg.gov.br/site/): filtros de turmas e acompanhamento visual das pendências inspiraram os filtros e o resumo de registros.
- [Diário Escola](https://diarioescola.com.br/): integração da rotina pedagógica orientou os atalhos do painel docente.
- [Diário Escolar Digital](https://diarioescolardigital.com.br/): destaque para frequência, notas e calendário reforçou a hierarquia das tarefas.
- [Diário de Classe](https://diariodeclasse.net/): organização por perfil e acesso por celular foram considerados na navegação.
- [iSEMED](https://isemed.com.br/): entradas diretas para serviços foram consideradas nos atalhos da gestão.
- [iScholar](https://ischolar.com.br/blog/diario-escolar-online): o artigo sobre simplificação da rotina reforçou a opção por instruções curtas e indicadores claros.

A identidade visual e a implementação permanecem próprias do DC Digital. Nenhuma funcionalidade de IA, comunicação ou financeiro foi adicionada.
