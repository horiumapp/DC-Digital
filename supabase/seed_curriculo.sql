-- Carga de Conteúdos Curriculares (BNCC)
-- Gerado a partir de Conteúdos.txt (152 unidades / 3009 conteúdos)

DO $$
DECLARE
  v_unidade_id uuid;
BEGIN
  -- 1º Ano | Geografia | 1º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '1º Ano' AND disciplina = 'Geografia' AND bimestre = '1º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '1º Ano', 'Geografia', '1º Bimestre', 'O que é Geografia?')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'O que é Geografia?'),
    (v_unidade_id, 'Conhecendo o espaço onde vivemos'),
    (v_unidade_id, 'Minha casa'),
    (v_unidade_id, 'Os cômodos da casa e suas funções'),
    (v_unidade_id, 'Minha família e seus espaços'),
    (v_unidade_id, 'Desenho da minha casa'),
    (v_unidade_id, 'A escola como espaço de convivência'),
    (v_unidade_id, 'Dependências da escola'),
    (v_unidade_id, 'Pessoas que trabalham na escola'),
    (v_unidade_id, 'Regras de convivência nos espaços'),
    (v_unidade_id, 'Identificação dos espaços da escola'),
    (v_unidade_id, 'O caminho de casa para a escola'),
    (v_unidade_id, 'Pontos de referência'),
    (v_unidade_id, 'Localização de objetos e lugares'),
    (v_unidade_id, 'Noções de perto e longe'),
    (v_unidade_id, 'Atividade sobre o trajeto casa-escola'),
    (v_unidade_id, 'Lugares importantes da comunidade'),
    (v_unidade_id, 'Serviços da comunidade'),
    (v_unidade_id, 'Conservação dos espaços coletivos'),
    (v_unidade_id, 'Produção de cartaz sobre a comunidade');

  -- 1º Ano | Geografia | 2º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '1º Ano' AND disciplina = 'Geografia' AND bimestre = '2º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '1º Ano', 'Geografia', '2º Bimestre', 'O que é paisagem?')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'O que é paisagem?'),
    (v_unidade_id, 'Elementos naturais da paisagem'),
    (v_unidade_id, 'Elementos construídos pelo ser humano'),
    (v_unidade_id, 'Observação de paisagens locais'),
    (v_unidade_id, 'Identificação de elementos da paisagem'),
    (v_unidade_id, 'Campo e cidade'),
    (v_unidade_id, 'Características do campo'),
    (v_unidade_id, 'Características da cidade'),
    (v_unidade_id, 'Comparação entre campo e cidade'),
    (v_unidade_id, 'Desenho comparativo campo e cidade'),
    (v_unidade_id, 'Mudanças na paisagem ao longo do tempo'),
    (v_unidade_id, 'Paisagens antigas e atuais'),
    (v_unidade_id, 'A ação humana na paisagem'),
    (v_unidade_id, 'Cuidados com o ambiente'),
    (v_unidade_id, 'Observação e registro de mudanças na paisagem'),
    (v_unidade_id, 'Espaços de lazer'),
    (v_unidade_id, 'Praças e parques'),
    (v_unidade_id, 'Uso consciente dos espaços públicos'),
    (v_unidade_id, 'Preservação dos ambientes'),
    (v_unidade_id, 'Cartaz sobre preservação ambiental');

  -- 1º Ano | Geografia | 3º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '1º Ano' AND disciplina = 'Geografia' AND bimestre = '3º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '1º Ano', 'Geografia', '3º Bimestre', 'Os elementos da natureza')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Os elementos da natureza'),
    (v_unidade_id, 'Solo, água e ar'),
    (v_unidade_id, 'A importância da água'),
    (v_unidade_id, 'Uso da água no dia a dia'),
    (v_unidade_id, 'Atividade sobre a importância da água'),
    (v_unidade_id, 'O clima e o tempo'),
    (v_unidade_id, 'Dias ensolarados e chuvosos'),
    (v_unidade_id, 'As estações do ano'),
    (v_unidade_id, 'Mudanças observadas nas estações'),
    (v_unidade_id, 'Registro das estações do ano'),
    (v_unidade_id, 'Plantas e animais do ambiente'),
    (v_unidade_id, 'Cuidados com os seres vivos'),
    (v_unidade_id, 'A preservação da natureza'),
    (v_unidade_id, 'Problemas ambientais simples'),
    (v_unidade_id, 'Produção sobre cuidados com a natureza'),
    (v_unidade_id, 'Coleta seletiva'),
    (v_unidade_id, 'Reciclagem'),
    (v_unidade_id, 'Redução do desperdício'),
    (v_unidade_id, 'Atitudes sustentáveis'),
    (v_unidade_id, 'Projeto de reciclagem na escola');

  -- 1º Ano | Geografia | 4º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '1º Ano' AND disciplina = 'Geografia' AND bimestre = '4º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '1º Ano', 'Geografia', '4º Bimestre', 'Representando espaços por desenhos')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Representando espaços por desenhos'),
    (v_unidade_id, 'Croquis simples'),
    (v_unidade_id, 'Mapas ilustrados'),
    (v_unidade_id, 'Símbolos e legendas'),
    (v_unidade_id, 'Construção de legenda simples'),
    (v_unidade_id, 'Representação da sala de aula'),
    (v_unidade_id, 'Representação da escola'),
    (v_unidade_id, 'Localização de objetos no espaço'),
    (v_unidade_id, 'Orientação espacial básica'),
    (v_unidade_id, 'Desenho da sala de aula com legenda'),
    (v_unidade_id, 'O bairro onde vivo'),
    (v_unidade_id, 'Principais locais do bairro'),
    (v_unidade_id, 'Serviços públicos do bairro'),
    (v_unidade_id, 'Mobilidade no bairro'),
    (v_unidade_id, 'Mapa ilustrado do bairro'),
    (v_unidade_id, 'Revisão dos conteúdos do ano'),
    (v_unidade_id, 'Jogos geográficos'),
    (v_unidade_id, 'Atividades práticas de localização'),
    (v_unidade_id, 'Exposição dos trabalhos realizados'),
    (v_unidade_id, 'Portfólio geográfico do estudante');

  -- 1º Ano | História | 1º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '1º Ano' AND disciplina = 'História' AND bimestre = '1º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '1º Ano', 'História', '1º Bimestre', 'Minha história e minha identidade')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Minha história e minha identidade'),
    (v_unidade_id, 'Meu nome e sua importância'),
    (v_unidade_id, 'Minha família'),
    (v_unidade_id, 'Pessoas que fazem parte da minha vida'),
    (v_unidade_id, ' Minha família e minha identidade'),
    (v_unidade_id, 'Minha casa e seus espaços'),
    (v_unidade_id, 'Regras de convivência em casa'),
    (v_unidade_id, 'Minha escola'),
    (v_unidade_id, 'Pessoas que trabalham na escola'),
    (v_unidade_id, ' Minha casa e minha escola'),
    (v_unidade_id, 'O caminho de casa para a escola'),
    (v_unidade_id, 'Lugares importantes do bairro'),
    (v_unidade_id, 'O passado e o presente'),
    (v_unidade_id, 'Mudanças ao longo do tempo'),
    (v_unidade_id, ' O tempo e as mudanças'),
    (v_unidade_id, 'Brinquedos antigos e atuais'),
    (v_unidade_id, 'Brincadeiras de ontem e de hoje'),
    (v_unidade_id, 'Datas importantes da minha vida'),
    (v_unidade_id, 'Festas e comemorações familiares'),
    (v_unidade_id, ' Brinquedos, brincadeiras e comemorações');

  -- 1º Ano | História | 2º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '1º Ano' AND disciplina = 'História' AND bimestre = '2º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '1º Ano', 'História', '2º Bimestre', 'Minha história de vida')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Minha história de vida'),
    (v_unidade_id, 'O crescimento das pessoas'),
    (v_unidade_id, 'Fases da vida'),
    (v_unidade_id, 'Semelhanças e diferenças entre as pessoas'),
    (v_unidade_id, ' Fases da vida e crescimento'),
    (v_unidade_id, 'Minha comunidade'),
    (v_unidade_id, 'Pessoas importantes da comunidade'),
    (v_unidade_id, 'Serviços da comunidade'),
    (v_unidade_id, 'Direitos e deveres das crianças'),
    (v_unidade_id, ' Comunidade e cidadania'),
    (v_unidade_id, 'Tradições familiares'),
    (v_unidade_id, 'Costumes da comunidade'),
    (v_unidade_id, 'Festas populares'),
    (v_unidade_id, 'Cultura local'),
    (v_unidade_id, ' Tradições e cultura'),
    (v_unidade_id, 'Memórias e recordações'),
    (v_unidade_id, 'Fotografias e histórias'),
    (v_unidade_id, 'Objetos antigos da família'),
    (v_unidade_id, 'Preservando memórias'),
    (v_unidade_id, ' Memórias e histórias familiares');

  -- 1º Ano | História | 3º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '1º Ano' AND disciplina = 'História' AND bimestre = '3º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '1º Ano', 'História', '3º Bimestre', 'A história da escola')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'A história da escola'),
    (v_unidade_id, 'Como a escola mudou com o tempo'),
    (v_unidade_id, 'A rotina escolar'),
    (v_unidade_id, 'Regras de convivência'),
    (v_unidade_id, ' A escola e sua história'),
    (v_unidade_id, 'Profissões de ontem e de hoje'),
    (v_unidade_id, 'O trabalho das pessoas'),
    (v_unidade_id, 'A importância das profissões'),
    (v_unidade_id, 'Profissões da comunidade'),
    (v_unidade_id, ' Profissões e trabalho'),
    (v_unidade_id, 'Meios de transporte antigos'),
    (v_unidade_id, 'Meios de transporte atuais'),
    (v_unidade_id, 'Meios de comunicação antigos'),
    (v_unidade_id, 'Meios de comunicação atuais'),
    (v_unidade_id, ' Transportes e comunicação'),
    (v_unidade_id, 'O uso da tecnologia no dia a dia'),
    (v_unidade_id, 'Mudanças trazidas pela tecnologia'),
    (v_unidade_id, 'Comparando passado e presente'),
    (v_unidade_id, 'Transformações na vida das pessoas'),
    (v_unidade_id, ' Mudanças ao longo do tempo');

  -- 1º Ano | História | 4º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '1º Ano' AND disciplina = 'História' AND bimestre = '4º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '1º Ano', 'História', '4º Bimestre', 'A história do meu bairro')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'A história do meu bairro'),
    (v_unidade_id, 'Lugares históricos da comunidade'),
    (v_unidade_id, 'Pessoas que fizeram história na comunidade'),
    (v_unidade_id, 'Patrimônio cultural'),
    (v_unidade_id, ' História da comunidade'),
    (v_unidade_id, 'Datas comemorativas brasileiras'),
    (v_unidade_id, 'Independência do Brasil (introdução)'),
    (v_unidade_id, 'Proclamação da República (introdução)'),
    (v_unidade_id, 'Símbolos nacionais'),
    (v_unidade_id, ' Datas e símbolos nacionais'),
    (v_unidade_id, 'Diversidade cultural do Brasil'),
    (v_unidade_id, 'Povos indígenas'),
    (v_unidade_id, 'Cultura afro-brasileira'),
    (v_unidade_id, 'Respeito às diferenças'),
    (v_unidade_id, ' Diversidade cultural'),
    (v_unidade_id, 'Revisão dos conteúdos do ano'),
    (v_unidade_id, 'Atividades de síntese histórica'),
    (v_unidade_id, 'Construção da linha do tempo pessoal'),
    (v_unidade_id, 'Exposição de trabalhos'),
    (v_unidade_id, ' Revisão geral do ano letivo');

  -- 1º Ano | Matemática | 1º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '1º Ano' AND disciplina = 'Matemática' AND bimestre = '1º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '1º Ano', 'Matemática', '1º Bimestre', 'Conhecendo os números de 0 a')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Conhecendo os números de 0 a'),
    (v_unidade_id, 'Contagem de objetos'),
    (v_unidade_id, 'Correspondência entre número e quantidade'),
    (v_unidade_id, 'Comparação de quantidades (mais e menos)'),
    (v_unidade_id, 'Sequência numérica até 0'),
    (v_unidade_id, 'Números de 0 a'),
    (v_unidade_id, 'Números de 6 a 0'),
    (v_unidade_id, 'Leitura e escrita dos números'),
    (v_unidade_id, 'Contagem oral crescente'),
    (v_unidade_id, 'Contagem oral decrescente'),
    (v_unidade_id, 'Quantidades e contagem'),
    (v_unidade_id, 'Noções de adição com materiais concretos'),
    (v_unidade_id, 'Juntando quantidades'),
    (v_unidade_id, 'Noções de subtração'),
    (v_unidade_id, 'Retirando quantidades'),
    (v_unidade_id, 'Adição e subtração simples'),
    (v_unidade_id, 'Situações-problema do cotidiano'),
    (v_unidade_id, 'Jogos matemáticos'),
    (v_unidade_id, 'Revisão dos conteúdos'),
    (v_unidade_id, 'Situações-problema envolvendo números até 0');

  -- 1º Ano | Matemática | 2º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '1º Ano' AND disciplina = 'Matemática' AND bimestre = '2º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '1º Ano', 'Matemática', '2º Bimestre', 'Números de  a 0')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Números de  a 0'),
    (v_unidade_id, 'Formação dos números'),
    (v_unidade_id, 'Ordem crescente'),
    (v_unidade_id, 'Ordem decrescente'),
    (v_unidade_id, 'Antecessor e sucessor'),
    (v_unidade_id, 'Adição até 0'),
    (v_unidade_id, 'Subtração até 0'),
    (v_unidade_id, 'Resolução de problemas'),
    (v_unidade_id, 'Cálculo mental simples'),
    (v_unidade_id, 'Operações de adição'),
    (v_unidade_id, 'Medidas de comprimento'),
    (v_unidade_id, 'Comparação de tamanhos'),
    (v_unidade_id, 'Medidas de massa'),
    (v_unidade_id, 'Medidas de capacidade'),
    (v_unidade_id, 'Grandezas e medidas'),
    (v_unidade_id, 'Calendário'),
    (v_unidade_id, 'Dias da semana'),
    (v_unidade_id, 'Revisão'),
    (v_unidade_id, 'Tempo e calendário');

  -- 1º Ano | Matemática | 3º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '1º Ano' AND disciplina = 'Matemática' AND bimestre = '3º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '1º Ano', 'Matemática', '3º Bimestre', 'Figuras geométricas planas')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Figuras geométricas planas'),
    (v_unidade_id, 'Círculo'),
    (v_unidade_id, 'Quadrado'),
    (v_unidade_id, 'Triângulo'),
    (v_unidade_id, 'Retângulo'),
    (v_unidade_id, 'Sólidos geométricos'),
    (v_unidade_id, 'Cubo'),
    (v_unidade_id, 'Esfera'),
    (v_unidade_id, 'Cilindro'),
    (v_unidade_id, 'Localização espacial'),
    (v_unidade_id, 'Dentro e fora'),
    (v_unidade_id, 'Em cima e embaixo'),
    (v_unidade_id, 'Direita e esquerda'),
    (v_unidade_id, 'Leitura de tabelas simples'),
    (v_unidade_id, 'Construção de gráficos simples'),
    (v_unidade_id, 'Revisão'),
    (v_unidade_id, 'Interpretação de gráficos e tabelas');

  -- 1º Ano | Matemática | 4º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '1º Ano' AND disciplina = 'Matemática' AND bimestre = '4º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '1º Ano', 'Matemática', '4º Bimestre', 'Números até 0')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Números até 0'),
    (v_unidade_id, 'Sequências numéricas'),
    (v_unidade_id, 'Agrupamentos e dezenas'),
    (v_unidade_id, 'Composição de números'),
    (v_unidade_id, 'Decomposição de números'),
    (v_unidade_id, 'Adição com dezenas'),
    (v_unidade_id, 'Subtração com dezenas'),
    (v_unidade_id, 'Problemas envolvendo operações'),
    (v_unidade_id, 'Estratégias de resolução'),
    (v_unidade_id, 'Resolução de problemas'),
    (v_unidade_id, 'Revisão de geometria'),
    (v_unidade_id, 'Revisão de medidas'),
    (v_unidade_id, 'Revisão de tratamento da informação'),
    (v_unidade_id, 'Jogos matemáticos educativos'),
    (v_unidade_id, 'Geometria e medidas'),
    (v_unidade_id, 'Revisão geral'),
    (v_unidade_id, 'Atividades integradoras'),
    (v_unidade_id, 'Recuperação paralela'),
    (v_unidade_id, 'final dos conteúdos do ano');

  -- 1º Ano | Português | 1º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '1º Ano' AND disciplina = 'Português' AND bimestre = '1º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '1º Ano', 'Português', '1º Bimestre', 'Apresentação da disciplina e combinados da turma')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Apresentação da disciplina e combinados da turma'),
    (v_unidade_id, 'Identificação do próprio nome'),
    (v_unidade_id, 'Letras do alfabeto (A a E)'),
    (v_unidade_id, 'Letras do alfabeto (F a J)'),
    (v_unidade_id, 'Letras do alfabeto (K a O)'),
    (v_unidade_id, 'Letras do alfabeto (P a T)'),
    (v_unidade_id, 'Letras do alfabeto (U a Z)'),
    (v_unidade_id, 'Vogais e seus sons'),
    (v_unidade_id, 'Reconhecimento de letras em palavras'),
    (v_unidade_id, 'Formação de palavras simples'),
    (v_unidade_id, 'Reconhecimento das letras do alfabeto'),
    (v_unidade_id, 'Consciência fonológica sons iniciais'),
    (v_unidade_id, 'Sons finais das palavras'),
    (v_unidade_id, 'Separação oral de sílabas'),
    (v_unidade_id, 'Leitura de imagens'),
    (v_unidade_id, 'Vogais e identificação de sons'),
    (v_unidade_id, 'Escrita espontânea'),
    (v_unidade_id, 'Cantigas e parlendas'),
    (v_unidade_id, 'Leitura de imagens e interpretação oral');

  -- 1º Ano | Português | 2º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '1º Ano' AND disciplina = 'Português' AND bimestre = '2º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '1º Ano', 'Português', '2º Bimestre', 'Sílabas simples (BA, BE, BI, BO, BU)')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Sílabas simples (BA, BE, BI, BO, BU)'),
    (v_unidade_id, 'Sílabas simples (CA, CE, CI, CO, CU)'),
    (v_unidade_id, 'Sílabas simples (DA, DE, DI, DO, DU)'),
    (v_unidade_id, 'Construção de palavras'),
    (v_unidade_id, 'Leitura de palavras simples'),
    (v_unidade_id, 'Leitura de sílabas simples'),
    (v_unidade_id, 'Famílias silábicas'),
    (v_unidade_id, 'Associação imagem e palavra'),
    (v_unidade_id, 'Escrita de palavras conhecidas'),
    (v_unidade_id, 'Pequenos textos ilustrados'),
    (v_unidade_id, 'Formação de palavras'),
    (v_unidade_id, 'Leitura compartilhada'),
    (v_unidade_id, 'Rimas e aliterações'),
    (v_unidade_id, 'Produção de listas'),
    (v_unidade_id, 'Leitura de quadrinhas'),
    (v_unidade_id, 'Interpretação oral de textos curtos'),
    (v_unidade_id, 'Produção coletiva de frases'),
    (v_unidade_id, 'Leitura e compreensão de frases simples'),
    (v_unidade_id, 'Revisão dos conteúdos');

  -- 1º Ano | Português | 3º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '1º Ano' AND disciplina = 'Português' AND bimestre = '3º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '1º Ano', 'Português', '3º Bimestre', 'Leitura de frases curtas')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Leitura de frases curtas'),
    (v_unidade_id, 'Formação de frases'),
    (v_unidade_id, 'Uso do ponto final'),
    (v_unidade_id, 'Organização de palavras em frases'),
    (v_unidade_id, 'Construção de frases simples'),
    (v_unidade_id, 'Pequenos textos narrativos'),
    (v_unidade_id, 'Identificação de personagens'),
    (v_unidade_id, 'Sequência de fatos'),
    (v_unidade_id, 'Histórias em quadrinhos'),
    (v_unidade_id, 'Interpretação de pequenos textos'),
    (v_unidade_id, 'Bilhetes e recados'),
    (v_unidade_id, 'Produção de frases coletivas'),
    (v_unidade_id, 'Leitura individual'),
    (v_unidade_id, 'Ampliação do vocabulário'),
    (v_unidade_id, 'Leitura de frases e textos curtos'),
    (v_unidade_id, 'Poemas infantis'),
    (v_unidade_id, 'Reconto de histórias'),
    (v_unidade_id, 'Produção textual com imagens'),
    (v_unidade_id, 'Produção de frases a partir de imagens'),
    (v_unidade_id, 'Revisão geral');

  -- 1º Ano | Português | 4º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '1º Ano' AND disciplina = 'Português' AND bimestre = '4º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '1º Ano', 'Português', '4º Bimestre', 'Leitura de pequenos textos')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Leitura de pequenos textos'),
    (v_unidade_id, 'Interpretação oral'),
    (v_unidade_id, 'Produção de frases completas'),
    (v_unidade_id, 'Uso de maiúsculas'),
    (v_unidade_id, 'Leitura e interpretação de texto curto'),
    (v_unidade_id, 'Gêneros textuais convite'),
    (v_unidade_id, 'Gêneros textuais bilhete'),
    (v_unidade_id, 'Gêneros textuais história infantil'),
    (v_unidade_id, 'Produção coletiva de texto'),
    (v_unidade_id, 'Produção de bilhete simples'),
    (v_unidade_id, 'Sequência lógica de histórias'),
    (v_unidade_id, 'Reescrita de histórias'),
    (v_unidade_id, 'Leitura fluente'),
    (v_unidade_id, 'Ampliação de vocabulário'),
    (v_unidade_id, 'Organização de sequência narrativa'),
    (v_unidade_id, 'Produção textual com apoio de imagens'),
    (v_unidade_id, 'Revisão das letras, sílabas e palavras'),
    (v_unidade_id, 'Revisão da leitura e escrita'),
    (v_unidade_id, 'Produção de pequeno texto ilustrado'),
    (v_unidade_id, 'Encerramento e socialização das produções');

  -- 6º Ano | Artes | 1º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Finais (6° ao 9° ANO)' AND ano = '6º Ano' AND disciplina = 'Artes' AND bimestre = '1º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Finais (6° ao 9° ANO)', '6º Ano', 'Artes', '1º Bimestre', 'Introdução à Arte e suas linguagens')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Introdução à Arte e suas linguagens'),
    (v_unidade_id, 'A arte como expressão e comunicação'),
    (v_unidade_id, 'Elementos visuais ponto, linha e forma'),
    (v_unidade_id, 'Cor, textura e composição'),
    (v_unidade_id, 'Técnicas básicas de desenho artístico'),
    (v_unidade_id, 'Produção artística utilizando os elementos visuais'),
    (v_unidade_id, 'História da Arte na Pré-História'),
    (v_unidade_id, 'Pinturas rupestres'),
    (v_unidade_id, 'Arte nas primeiras civilizações'),
    (v_unidade_id, 'Arte no Egito Antigo'),
    (v_unidade_id, 'Produção inspirada nas pinturas rupestres ou arte egípcia'),
    (v_unidade_id, 'Simetria e proporção nas artes'),
    (v_unidade_id, 'Desenho de observação'),
    (v_unidade_id, 'Luz e sombra'),
    (v_unidade_id, 'Técnicas de sombreamento'),
    (v_unidade_id, 'Desenho com aplicação de luz e sombra'),
    (v_unidade_id, 'Composição artística'),
    (v_unidade_id, 'Produção visual criativa'),
    (v_unidade_id, 'Revisão dos conteúdos'),
    (v_unidade_id, 'Composição artística livre utilizando técnicas estudadas');

  -- 6º Ano | Artes | 2º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Finais (6° ao 9° ANO)' AND ano = '6º Ano' AND disciplina = 'Artes' AND bimestre = '2º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Finais (6° ao 9° ANO)', '6º Ano', 'Artes', '2º Bimestre', 'A música como manifestação cultural')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'A música como manifestação cultural'),
    (v_unidade_id, 'Elementos da música ritmo, melodia e harmonia'),
    (v_unidade_id, 'Instrumentos musicais e suas classificações'),
    (v_unidade_id, 'Música brasileira e regional'),
    (v_unidade_id, 'Pesquisa e apresentação sobre um gênero musical brasileiro'),
    (v_unidade_id, 'Percussão corporal'),
    (v_unidade_id, 'Criação de ritmos'),
    (v_unidade_id, 'Construção de instrumentos alternativos'),
    (v_unidade_id, 'Produção sonora coletiva'),
    (v_unidade_id, 'Construção e demonstração de instrumento alternativo'),
    (v_unidade_id, 'Introdução ao teatro'),
    (v_unidade_id, 'Jogos dramáticos'),
    (v_unidade_id, 'Expressão corporal e vocal'),
    (v_unidade_id, 'Construção de personagens'),
    (v_unidade_id, 'Apresentação de cena teatral curta'),
    (v_unidade_id, 'História da dança'),
    (v_unidade_id, 'Danças populares brasileiras'),
    (v_unidade_id, 'Criação coreográfica'),
    (v_unidade_id, 'Ensaios'),
    (v_unidade_id, 'Apresentação de dança em grupo');

  -- 6º Ano | Artes | 3º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Finais (6° ao 9° ANO)' AND ano = '6º Ano' AND disciplina = 'Artes' AND bimestre = '3º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Finais (6° ao 9° ANO)', '6º Ano', 'Artes', '3º Bimestre', 'Cultura e identidade brasileira')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Cultura e identidade brasileira'),
    (v_unidade_id, 'Patrimônio cultural material e imaterial'),
    (v_unidade_id, 'Arte indígena brasileira'),
    (v_unidade_id, 'Grafismos e simbologias indígenas'),
    (v_unidade_id, 'Produção artística baseada em grafismos indígenas'),
    (v_unidade_id, 'Arte afro-brasileira'),
    (v_unidade_id, 'Máscaras africanas'),
    (v_unidade_id, 'Influências africanas na arte brasileira'),
    (v_unidade_id, 'Produção artística temática'),
    (v_unidade_id, 'Produção artística inspirada na cultura afro-brasileira'),
    (v_unidade_id, 'Folclore brasileiro'),
    (v_unidade_id, 'Lendas e tradições populares'),
    (v_unidade_id, 'Ilustração de narrativas folclóricas'),
    (v_unidade_id, 'Produção coletiva'),
    (v_unidade_id, 'Ilustração de uma lenda folclórica brasileira'),
    (v_unidade_id, 'Festas populares brasileiras'),
    (v_unidade_id, 'Elementos visuais das festas tradicionais'),
    (v_unidade_id, 'Confecção de adereços culturais'),
    (v_unidade_id, 'Revisão dos conteúdos'),
    (v_unidade_id, 'Produção de adereço relacionado a uma festa popular');

  -- 6º Ano | Artes | 4º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Finais (6° ao 9° ANO)' AND ano = '6º Ano' AND disciplina = 'Artes' AND bimestre = '4º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Finais (6° ao 9° ANO)', '6º Ano', 'Artes', '4º Bimestre', 'Introdução à Arte Moderna')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Introdução à Arte Moderna'),
    (v_unidade_id, 'Modernismo no Brasil'),
    (v_unidade_id, 'Principais artistas modernistas brasileiros'),
    (v_unidade_id, 'Leitura e interpretação de obras'),
    (v_unidade_id, 'Releitura de obra modernista brasileira'),
    (v_unidade_id, 'Arte contemporânea'),
    (v_unidade_id, 'Instalações e intervenções artísticas'),
    (v_unidade_id, 'Arte digital'),
    (v_unidade_id, 'Produção artística contemporânea'),
    (v_unidade_id, 'Criação de obra contemporânea utilizando técnica livre'),
    (v_unidade_id, 'Escultura e modelagem'),
    (v_unidade_id, 'Arte tridimensional'),
    (v_unidade_id, 'Produção de esculturas'),
    (v_unidade_id, 'Finalização dos trabalhos'),
    (v_unidade_id, 'Escultura produzida com materiais diversos'),
    (v_unidade_id, 'Planejamento de projeto artístico'),
    (v_unidade_id, 'Desenvolvimento do projeto'),
    (v_unidade_id, 'Organização de exposição'),
    (v_unidade_id, 'Montagem da mostra'),
    (v_unidade_id, 'Apresentação do projeto artístico em exposição escolar');

  -- 6º Ano | Ciências | 1º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Finais (6° ao 9° ANO)' AND ano = '6º Ano' AND disciplina = 'Ciências' AND bimestre = '1º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Finais (6° ao 9° ANO)', '6º Ano', 'Ciências', '1º Bimestre', 'Apresentação da disciplina e introdução às Ciências')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Apresentação da disciplina e introdução às Ciências'),
    (v_unidade_id, 'A Terra como ambiente de vida'),
    (v_unidade_id, 'Características dos seres vivos'),
    (v_unidade_id, 'Níveis de organização dos seres vivos'),
    (v_unidade_id, 'A célula unidade básica da vida'),
    (v_unidade_id, 'Características dos seres vivos e célula'),
    (v_unidade_id, 'Classificação dos seres vivos'),
    (v_unidade_id, 'Reinos dos seres vivos'),
    (v_unidade_id, 'Biodiversidade brasileira'),
    (v_unidade_id, 'Ecossistemas e seus componentes'),
    (v_unidade_id, 'Classificação dos seres vivos e biodiversidade'),
    (v_unidade_id, 'Cadeias alimentares'),
    (v_unidade_id, 'Teias alimentares'),
    (v_unidade_id, 'Relações ecológicas'),
    (v_unidade_id, 'Equilíbrio ambiental'),
    (v_unidade_id, 'Cadeias alimentares e relações ecológicas'),
    (v_unidade_id, 'Impactos ambientais'),
    (v_unidade_id, 'Conservação da biodiversidade'),
    (v_unidade_id, 'Revisão dos conteúdos'),
    (v_unidade_id, 'Ecossistemas e preservação ambiental');

  -- 6º Ano | Ciências | 2º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Finais (6° ao 9° ANO)' AND ano = '6º Ano' AND disciplina = 'Ciências' AND bimestre = '2º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Finais (6° ao 9° ANO)', '6º Ano', 'Ciências', '2º Bimestre', 'Conceito de matéria')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Conceito de matéria'),
    (v_unidade_id, 'Propriedades da matéria'),
    (v_unidade_id, 'Estados físicos da matéria'),
    (v_unidade_id, 'Mudanças de estado físico'),
    (v_unidade_id, 'Massa e volume'),
    (v_unidade_id, 'Matéria e propriedades'),
    (v_unidade_id, 'Substâncias e misturas'),
    (v_unidade_id, 'Misturas homogêneas e heterogêneas'),
    (v_unidade_id, 'Métodos de separação de misturas'),
    (v_unidade_id, 'Transformações físicas e químicas'),
    (v_unidade_id, 'Misturas e transformações da matéria'),
    (v_unidade_id, 'Conceito de energia'),
    (v_unidade_id, 'Formas de energia'),
    (v_unidade_id, 'Fontes renováveis e não renováveis'),
    (v_unidade_id, 'Transformação de energia'),
    (v_unidade_id, 'Formas e fontes de energia'),
    (v_unidade_id, 'Consumo consciente de energia'),
    (v_unidade_id, 'Sustentabilidade energética'),
    (v_unidade_id, 'Revisão dos conteúdos'),
    (v_unidade_id, 'Energia e sustentabilidade');

  -- 6º Ano | Ciências | 3º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Finais (6° ao 9° ANO)' AND ano = '6º Ano' AND disciplina = 'Ciências' AND bimestre = '3º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Finais (6° ao 9° ANO)', '6º Ano', 'Ciências', '3º Bimestre', 'Organização do corpo humano')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Organização do corpo humano'),
    (v_unidade_id, 'Células, tecidos e órgãos'),
    (v_unidade_id, 'Sistema digestório'),
    (v_unidade_id, 'Sistema respiratório'),
    (v_unidade_id, 'Sistema circulatório'),
    (v_unidade_id, 'Organização corporal e sistemas'),
    (v_unidade_id, 'Sistema excretor'),
    (v_unidade_id, 'Sistema locomotor'),
    (v_unidade_id, 'Sistema nervoso'),
    (v_unidade_id, 'Órgãos dos sentidos'),
    (v_unidade_id, 'Sistema nervoso e sentidos'),
    (v_unidade_id, 'Alimentação saudável'),
    (v_unidade_id, 'Nutrientes e suas funções'),
    (v_unidade_id, 'Doenças relacionadas à alimentação'),
    (v_unidade_id, 'Hábitos saudáveis'),
    (v_unidade_id, 'Alimentação e qualidade de vida'),
    (v_unidade_id, 'Vacinação e prevenção de doenças'),
    (v_unidade_id, 'Saneamento básico'),
    (v_unidade_id, 'Revisão dos conteúdos'),
    (v_unidade_id, 'Saúde e prevenção de doenças');

  -- 6º Ano | Ciências | 4º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Finais (6° ao 9° ANO)' AND ano = '6º Ano' AND disciplina = 'Ciências' AND bimestre = '4º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Finais (6° ao 9° ANO)', '6º Ano', 'Ciências', '4º Bimestre', 'Estrutura do planeta Terra')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Estrutura do planeta Terra'),
    (v_unidade_id, 'Camadas da Terra'),
    (v_unidade_id, 'Rochas e minerais'),
    (v_unidade_id, 'Formação do solo'),
    (v_unidade_id, 'Tipos de solo'),
    (v_unidade_id, 'Estrutura da Terra e solos'),
    (v_unidade_id, 'Atmosfera terrestre'),
    (v_unidade_id, 'Fenômenos meteorológicos'),
    (v_unidade_id, 'Clima e tempo'),
    (v_unidade_id, 'Recursos naturais'),
    (v_unidade_id, 'Atmosfera e clima'),
    (v_unidade_id, 'Sistema Solar'),
    (v_unidade_id, 'Movimentos da Terra'),
    (v_unidade_id, 'Fases da Lua'),
    (v_unidade_id, 'Eclipses'),
    (v_unidade_id, 'Sistema Solar e movimentos terrestres'),
    (v_unidade_id, 'Exploração espacial'),
    (v_unidade_id, 'Ciência e tecnologia espacial'),
    (v_unidade_id, 'Revisão geral dos conteúdos'),
    (v_unidade_id, 'Terra e Universo');

  -- 6º Ano | Educação Física | 1º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Finais (6° ao 9° ANO)' AND ano = '6º Ano' AND disciplina = 'Educação Física' AND bimestre = '1º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Finais (6° ao 9° ANO)', '6º Ano', 'Educação Física', '1º Bimestre', 'Apresentação da disciplina, regras de convivência e segurança')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Apresentação da disciplina, regras de convivência e segurança'),
    (v_unidade_id, 'Cultura corporal de movimento e sua importância'),
    (v_unidade_id, 'Capacidades físicas força, resistência, velocidade e flexibilidade'),
    (v_unidade_id, 'diagnóstica das habilidades motoras'),
    (v_unidade_id, 'Circuitos motores e coordenação corporal'),
    (v_unidade_id, 'Capacidades físicas e coordenação motora'),
    (v_unidade_id, 'Jogos cooperativos e integração social'),
    (v_unidade_id, 'Jogos competitivos e respeito às regras'),
    (v_unidade_id, 'Estratégias em jogos coletivos'),
    (v_unidade_id, 'Trabalho em equipe e liderança'),
    (v_unidade_id, 'Participação em jogos cooperativos e coletivos'),
    (v_unidade_id, 'Atletismo corridas de velocidade'),
    (v_unidade_id, 'Atletismo corridas de resistência'),
    (v_unidade_id, 'Atletismo saltos'),
    (v_unidade_id, 'Atletismo lançamentos adaptados'),
    (v_unidade_id, 'Fundamentos básicos do atletismo'),
    (v_unidade_id, 'Alongamento e flexibilidade'),
    (v_unidade_id, 'Postura corporal e prevenção de lesões'),
    (v_unidade_id, 'Qualidade de vida e atividade física'),
    (v_unidade_id, 'Saúde, postura e qualidade de vida');

  -- 6º Ano | Educação Física | 2º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Finais (6° ao 9° ANO)' AND ano = '6º Ano' AND disciplina = 'Educação Física' AND bimestre = '2º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Finais (6° ao 9° ANO)', '6º Ano', 'Educação Física', '2º Bimestre', 'História e fundamentos do futsal')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'História e fundamentos do futsal'),
    (v_unidade_id, 'Condução e domínio de bola'),
    (v_unidade_id, 'Passe e recepção'),
    (v_unidade_id, 'Finalização e posicionamento'),
    (v_unidade_id, 'Jogos reduzidos de futsal'),
    (v_unidade_id, 'Fundamentos técnicos do futsal'),
    (v_unidade_id, 'Regras oficiais básicas do futsal'),
    (v_unidade_id, 'Sistemas simples de jogo'),
    (v_unidade_id, 'Estratégias ofensivas e defensivas'),
    (v_unidade_id, 'Partidas orientadas'),
    (v_unidade_id, 'Aplicação das regras e estratégias do futsal'),
    (v_unidade_id, 'Fundamentos do handebol'),
    (v_unidade_id, 'Passe, recepção e arremesso'),
    (v_unidade_id, 'Dribles e deslocamentos'),
    (v_unidade_id, 'Jogos adaptados de handebol'),
    (v_unidade_id, 'Fundamentos básicos do handebol'),
    (v_unidade_id, 'Fair play e ética esportiva'),
    (v_unidade_id, 'Respeito às diferenças no esporte'),
    (v_unidade_id, 'Inclusão e cooperação nas práticas corporais'),
    (v_unidade_id, 'Ética, respeito e inclusão');

  -- 6º Ano | Educação Física | 3º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Finais (6° ao 9° ANO)' AND ano = '6º Ano' AND disciplina = 'Educação Física' AND bimestre = '3º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Finais (6° ao 9° ANO)', '6º Ano', 'Educação Física', '3º Bimestre', 'História e fundamentos do voleibol')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'História e fundamentos do voleibol'),
    (v_unidade_id, 'Toque e manchete'),
    (v_unidade_id, 'Saque por baixo'),
    (v_unidade_id, 'Sistemas simples de jogo'),
    (v_unidade_id, 'Jogos adaptados de voleibol'),
    (v_unidade_id, 'Fundamentos técnicos do voleibol'),
    (v_unidade_id, 'História e fundamentos do basquetebol'),
    (v_unidade_id, 'Drible e controle de bola'),
    (v_unidade_id, 'Passe e recepção'),
    (v_unidade_id, 'Arremessos e bandejas'),
    (v_unidade_id, 'Fundamentos básicos do basquetebol'),
    (v_unidade_id, 'Jogos pré-desportivos'),
    (v_unidade_id, 'Estratégias coletivas'),
    (v_unidade_id, 'Organização tática básica'),
    (v_unidade_id, 'Partidas orientadas'),
    (v_unidade_id, 'Participação e estratégias em jogos coletivos'),
    (v_unidade_id, 'Danças populares brasileiras'),
    (v_unidade_id, 'Ritmos regionais'),
    (v_unidade_id, 'Expressão corporal e criação coreográfica'),
    (v_unidade_id, 'Dança e expressão corporal');

  -- 6º Ano | Educação Física | 4º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Finais (6° ao 9° ANO)' AND ano = '6º Ano' AND disciplina = 'Educação Física' AND bimestre = '4º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Finais (6° ao 9° ANO)', '6º Ano', 'Educação Física', '4º Bimestre', 'Ginástica geral e consciência corporal')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Ginástica geral e consciência corporal'),
    (v_unidade_id, 'Exercícios de flexibilidade'),
    (v_unidade_id, 'Exercícios de resistência física'),
    (v_unidade_id, 'Circuitos funcionais adaptados'),
    (v_unidade_id, 'Benefícios da atividade física para a saúde'),
    (v_unidade_id, 'Condicionamento físico e saúde'),
    (v_unidade_id, 'Jogos de aventura e desafios motores'),
    (v_unidade_id, 'Atividades recreativas ao ar livre'),
    (v_unidade_id, 'Orientação espacial e trabalho em equipe'),
    (v_unidade_id, 'Gincanas esportivas'),
    (v_unidade_id, 'Participação em atividades recreativas e de aventura'),
    (v_unidade_id, 'Lutas conceitos e regras de segurança'),
    (v_unidade_id, 'Jogos de oposição'),
    (v_unidade_id, 'Movimentos básicos das lutas'),
    (v_unidade_id, 'Respeito ao adversário e autocontrole'),
    (v_unidade_id, 'Práticas corporais de luta e respeito mútuo'),
    (v_unidade_id, 'Revisão dos conteúdos do ano'),
    (v_unidade_id, 'Jogos integradores'),
    (v_unidade_id, 'Recreação orientada'),
    (v_unidade_id, 'Participação, evolução motora e socialização');

  -- 6º Ano | Ensino Religioso | 1º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Finais (6° ao 9° ANO)' AND ano = '6º Ano' AND disciplina = 'Ensino Religioso' AND bimestre = '1º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Finais (6° ao 9° ANO)', '6º Ano', 'Ensino Religioso', '1º Bimestre', 'O ser humano e a busca por sentido na vida')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'O ser humano e a busca por sentido na vida'),
    (v_unidade_id, 'Identidade, valores e convivência'),
    (v_unidade_id, 'A formação ética do indivíduo'),
    (v_unidade_id, 'O respeito às diferenças'),
    (v_unidade_id, 'Direitos humanos e dignidade humana'),
    (v_unidade_id, 'Identidade e valores humanos'),
    (v_unidade_id, 'A convivência social e o respeito mútuo'),
    (v_unidade_id, 'Empatia e solidariedade'),
    (v_unidade_id, 'A importância do diálogo'),
    (v_unidade_id, 'Resolução pacífica de conflitos'),
    (v_unidade_id, 'Convivência e diálogo'),
    (v_unidade_id, 'O papel da família na formação de valores'),
    (v_unidade_id, 'A amizade e as relações interpessoais'),
    (v_unidade_id, 'Responsabilidade e compromisso'),
    (v_unidade_id, 'Ética nas relações humanas'),
    (v_unidade_id, 'Ética e responsabilidade'),
    (v_unidade_id, 'Cidadania e participação social'),
    (v_unidade_id, 'Valores para a vida em comunidade'),
    (v_unidade_id, 'Revisão dos conteúdos'),
    (v_unidade_id, 'Cidadania e convivência social');

  -- 6º Ano | Ensino Religioso | 2º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Finais (6° ao 9° ANO)' AND ano = '6º Ano' AND disciplina = 'Ensino Religioso' AND bimestre = '2º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Finais (6° ao 9° ANO)', '6º Ano', 'Ensino Religioso', '2º Bimestre', 'Cultura, religião e sociedade')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Cultura, religião e sociedade'),
    (v_unidade_id, 'Diversidade cultural no Brasil'),
    (v_unidade_id, 'Tradições culturais e religiosas'),
    (v_unidade_id, 'A influência da cultura na vida das pessoas'),
    (v_unidade_id, 'Respeito à diversidade cultural'),
    (v_unidade_id, 'Cultura e diversidade'),
    (v_unidade_id, 'A preservação do patrimônio cultural'),
    (v_unidade_id, 'Festas e celebrações religiosas'),
    (v_unidade_id, 'O significado dos rituais'),
    (v_unidade_id, 'Símbolos presentes nas tradições religiosas'),
    (v_unidade_id, 'Rituais e símbolos religiosos'),
    (v_unidade_id, 'O valor da paz'),
    (v_unidade_id, 'Tolerância e respeito às diferenças'),
    (v_unidade_id, 'Mediação de conflitos'),
    (v_unidade_id, 'A convivência democrática'),
    (v_unidade_id, 'Cultura da paz'),
    (v_unidade_id, 'Cooperação e responsabilidade coletiva'),
    (v_unidade_id, 'O papel do cidadão na comunidade'),
    (v_unidade_id, 'Revisão dos conteúdos'),
    (v_unidade_id, 'Paz e convivência social');

  -- 6º Ano | Ensino Religioso | 3º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Finais (6° ao 9° ANO)' AND ano = '6º Ano' AND disciplina = 'Ensino Religioso' AND bimestre = '3º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Finais (6° ao 9° ANO)', '6º Ano', 'Ensino Religioso', '3º Bimestre', 'Origem das tradições religiosas')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Origem das tradições religiosas'),
    (v_unidade_id, 'As religiões presentes no Brasil'),
    (v_unidade_id, 'Liberdade religiosa e direitos humanos'),
    (v_unidade_id, 'Espaços sagrados e locais de culto'),
    (v_unidade_id, 'A diversidade religiosa e o respeito'),
    (v_unidade_id, 'Diversidade religiosa'),
    (v_unidade_id, 'Textos sagrados e sua importância'),
    (v_unidade_id, 'Valores presentes nas tradições religiosas'),
    (v_unidade_id, 'O respeito às crenças e convicções'),
    (v_unidade_id, 'A influência da religião na cultura'),
    (v_unidade_id, 'Textos sagrados e valores'),
    (v_unidade_id, 'O preconceito religioso e suas consequências'),
    (v_unidade_id, 'O diálogo inter-religioso'),
    (v_unidade_id, 'O combate à intolerância religiosa'),
    (v_unidade_id, 'A convivência entre diferentes crenças'),
    (v_unidade_id, 'Respeito e tolerância religiosa'),
    (v_unidade_id, 'Ética e espiritualidade'),
    (v_unidade_id, 'Religião e construção da cidadania'),
    (v_unidade_id, 'Revisão dos conteúdos'),
    (v_unidade_id, 'Religião e sociedade');

  -- 6º Ano | Ensino Religioso | 4º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Finais (6° ao 9° ANO)' AND ano = '6º Ano' AND disciplina = 'Ensino Religioso' AND bimestre = '4º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Finais (6° ao 9° ANO)', '6º Ano', 'Ensino Religioso', '4º Bimestre', 'Projeto de vida e valores pessoais')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Projeto de vida e valores pessoais'),
    (v_unidade_id, 'Sonhos, objetivos e planejamento'),
    (v_unidade_id, 'A importância da esperança'),
    (v_unidade_id, 'O sentido da solidariedade'),
    (v_unidade_id, 'O cuidado consigo e com o próximo'),
    (v_unidade_id, 'Projeto de vida e esperança'),
    (v_unidade_id, 'O respeito às diferenças sociais e culturais'),
    (v_unidade_id, 'A amizade e os vínculos humanos'),
    (v_unidade_id, 'A responsabilidade nas escolhas'),
    (v_unidade_id, 'A construção da autonomia'),
    (v_unidade_id, 'Responsabilidade e autonomia'),
    (v_unidade_id, 'Cidadania e transformação social'),
    (v_unidade_id, 'Direitos e deveres na sociedade'),
    (v_unidade_id, 'A participação social dos jovens'),
    (v_unidade_id, 'O compromisso com o bem comum'),
    (v_unidade_id, 'Cidadania e participação social'),
    (v_unidade_id, 'Revisão dos conteúdos do ano'),
    (v_unidade_id, 'Reflexão sobre valores e atitudes'),
    (v_unidade_id, 'Atividade integradora dos conteúdos'),
    (v_unidade_id, 'Valores para a vida e a sociedade');

  -- 6º Ano | Espanhol | 1º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Finais (6° ao 9° ANO)' AND ano = '6º Ano' AND disciplina = 'Espanhol' AND bimestre = '1º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Finais (6° ao 9° ANO)', '6º Ano', 'Espanhol', '1º Bimestre', 'Apresentação da disciplina e importância da língua espanhola')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Apresentação da disciplina e importância da língua espanhola'),
    (v_unidade_id, 'Alfabeto espanhol letras e pronúncia'),
    (v_unidade_id, 'Saudações e despedidas'),
    (v_unidade_id, 'Expressões de cortesia'),
    (v_unidade_id, 'Apresentação pessoal (nome, idade e origem)'),
    (v_unidade_id, 'Nacionalidades e países hispânicos'),
    (v_unidade_id, 'Números de 0 a 0'),
    (v_unidade_id, 'Dias da semana e meses do ano'),
    (v_unidade_id, 'Saudações, apresentações e expressões de cortesia'),
    (v_unidade_id, 'Cores em espanhol'),
    (v_unidade_id, 'Objetos da sala de aula'),
    (v_unidade_id, 'Artigos definidos e indefinidos'),
    (v_unidade_id, 'Formação de frases simples'),
    (v_unidade_id, 'Compreensão de diálogos básicos'),
    (v_unidade_id, 'Leitura de pequenos textos'),
    (v_unidade_id, 'Números, dias da semana e meses do ano'),
    (v_unidade_id, 'Revisão dos conteúdos estudados'),
    (v_unidade_id, 'Produção oral apresentação pessoal'),
    (v_unidade_id, 'Cores, objetos escolares e artigos');

  -- 6º Ano | Espanhol | 2º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Finais (6° ao 9° ANO)' AND ano = '6º Ano' AND disciplina = 'Espanhol' AND bimestre = '2º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Finais (6° ao 9° ANO)', '6º Ano', 'Espanhol', '2º Bimestre', 'Família e parentesco')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Família e parentesco'),
    (v_unidade_id, 'Descrição física das pessoas'),
    (v_unidade_id, 'Características pessoais'),
    (v_unidade_id, 'Pronomes pessoais'),
    (v_unidade_id, 'Verbo SER'),
    (v_unidade_id, 'Construção de frases com SER'),
    (v_unidade_id, 'Leitura e interpretação de textos'),
    (v_unidade_id, 'Vocabulário sobre a família'),
    (v_unidade_id, 'Família e descrição física'),
    (v_unidade_id, 'Animais domésticos'),
    (v_unidade_id, 'Animais selvagens'),
    (v_unidade_id, 'Adjetivos qualificativos'),
    (v_unidade_id, 'Concordância básica'),
    (v_unidade_id, 'Produção escrita simples'),
    (v_unidade_id, 'Compreensão auditiva'),
    (v_unidade_id, 'Verbo SER e pronomes pessoais'),
    (v_unidade_id, 'Revisão dos conteúdos'),
    (v_unidade_id, 'Atividade prática de comunicação'),
    (v_unidade_id, 'Animais e adjetivos qualificativos');

  -- 6º Ano | Espanhol | 3º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Finais (6° ao 9° ANO)' AND ano = '6º Ano' AND disciplina = 'Espanhol' AND bimestre = '3º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Finais (6° ao 9° ANO)', '6º Ano', 'Espanhol', '3º Bimestre', 'Partes da casa')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Partes da casa'),
    (v_unidade_id, 'Móveis e objetos domésticos'),
    (v_unidade_id, 'Cômodos da residência'),
    (v_unidade_id, 'Verbo ESTAR'),
    (v_unidade_id, 'Localização de objetos'),
    (v_unidade_id, 'Preposições de lugar'),
    (v_unidade_id, 'Rotina diária'),
    (v_unidade_id, 'Horas em espanhol'),
    (v_unidade_id, 'Casa, cômodos e móveis'),
    (v_unidade_id, 'Atividades do cotidiano'),
    (v_unidade_id, 'Verbos de rotina'),
    (v_unidade_id, 'Pequenos diálogos'),
    (v_unidade_id, 'Interpretação de textos'),
    (v_unidade_id, 'Produção textual'),
    (v_unidade_id, 'Exercícios de comunicação oral'),
    (v_unidade_id, 'Verbo ESTAR e preposições de lugar'),
    (v_unidade_id, 'Revisão dos conteúdos'),
    (v_unidade_id, 'Atividade prática sobre rotina diária'),
    (v_unidade_id, 'Horas e rotina diária');

  -- 6º Ano | Espanhol | 4º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Finais (6° ao 9° ANO)' AND ano = '6º Ano' AND disciplina = 'Espanhol' AND bimestre = '4º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Finais (6° ao 9° ANO)', '6º Ano', 'Espanhol', '4º Bimestre', 'Alimentação e refeições')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Alimentação e refeições'),
    (v_unidade_id, 'Frutas e verduras'),
    (v_unidade_id, 'Bebidas e alimentos diversos'),
    (v_unidade_id, 'Preferências alimentares'),
    (v_unidade_id, 'Verbo GUSTAR'),
    (v_unidade_id, 'Compras e mercado'),
    (v_unidade_id, 'Diálogos em restaurantes'),
    (v_unidade_id, 'Cultura alimentar dos países hispânicos'),
    (v_unidade_id, 'Alimentos, frutas e bebidas'),
    (v_unidade_id, 'Vestuário e acessórios'),
    (v_unidade_id, 'Estações do ano'),
    (v_unidade_id, 'Clima e tempo'),
    (v_unidade_id, 'Vocabulário relacionado ao cotidiano'),
    (v_unidade_id, 'Produção textual guiada'),
    (v_unidade_id, 'Leitura e interpretação'),
    (v_unidade_id, 'Verbo GUSTAR e preferências alimentares'),
    (v_unidade_id, 'Revisão geral dos conteúdos anuais'),
    (v_unidade_id, 'Atividade comunicativa integradora'),
    (v_unidade_id, 'Vestuário, estações e clima'),
    (v_unidade_id, 'final integradora dos conteúdos do ano');

  -- 6º Ano | Geografia | 1º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Finais (6° ao 9° ANO)' AND ano = '6º Ano' AND disciplina = 'Geografia' AND bimestre = '1º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Finais (6° ao 9° ANO)', '6º Ano', 'Geografia', '1º Bimestre', 'O que é Geografia e seu objeto de estudo')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'O que é Geografia e seu objeto de estudo'),
    (v_unidade_id, 'O espaço geográfico e suas transformações'),
    (v_unidade_id, 'Paisagem, lugar, território e região'),
    (v_unidade_id, 'Sociedade e natureza'),
    (v_unidade_id, 'Orientação e localização no espaço'),
    (v_unidade_id, 'Conceitos fundamentais da Geografia'),
    (v_unidade_id, 'Os pontos cardeais, colaterais e subcolaterais'),
    (v_unidade_id, 'A rosa dos ventos'),
    (v_unidade_id, 'Coordenadas geográficas latitude e longitude'),
    (v_unidade_id, 'Paralelos e meridianos'),
    (v_unidade_id, 'Orientação e coordenadas geográficas'),
    (v_unidade_id, 'Introdução à cartografia'),
    (v_unidade_id, 'Elementos dos mapas'),
    (v_unidade_id, 'Escala cartográfica'),
    (v_unidade_id, 'Tipos de mapas'),
    (v_unidade_id, 'Leitura e interpretação de mapas'),
    (v_unidade_id, 'Tecnologias de representação do espaço'),
    (v_unidade_id, 'GPS, imagens de satélite e geotecnologias'),
    (v_unidade_id, 'Revisão dos conteúdos'),
    (v_unidade_id, 'Produção de mapa temático simples');

  -- 6º Ano | Geografia | 2º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Finais (6° ao 9° ANO)' AND ano = '6º Ano' AND disciplina = 'Geografia' AND bimestre = '2º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Finais (6° ao 9° ANO)', '6º Ano', 'Geografia', '2º Bimestre', 'Estrutura interna da Terra')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Estrutura interna da Terra'),
    (v_unidade_id, 'Crosta, manto e núcleo'),
    (v_unidade_id, 'Movimentos das placas tectônicas'),
    (v_unidade_id, 'Vulcanismo e terremotos'),
    (v_unidade_id, 'Estrutura da Terra e tectonismo'),
    (v_unidade_id, 'Formação do relevo terrestre'),
    (v_unidade_id, 'Agentes internos do relevo'),
    (v_unidade_id, 'Agentes externos do relevo'),
    (v_unidade_id, 'Erosão e intemperismo'),
    (v_unidade_id, 'Formação e transformação do relevo'),
    (v_unidade_id, 'A atmosfera terrestre'),
    (v_unidade_id, 'Tempo e clima'),
    (v_unidade_id, 'Elementos e fatores climáticos'),
    (v_unidade_id, 'Zonas climáticas da Terra'),
    (v_unidade_id, 'Clima e atmosfera'),
    (v_unidade_id, 'Hidrosfera e recursos hídricos'),
    (v_unidade_id, 'Oceanos, mares, rios e lagos'),
    (v_unidade_id, 'O ciclo da água'),
    (v_unidade_id, 'Revisão dos conteúdos'),
    (v_unidade_id, 'Recursos hídricos e ciclo da água');

  -- 6º Ano | Geografia | 3º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Finais (6° ao 9° ANO)' AND ano = '6º Ano' AND disciplina = 'Geografia' AND bimestre = '3º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Finais (6° ao 9° ANO)', '6º Ano', 'Geografia', '3º Bimestre', 'Biosfera e diversidade ambiental')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Biosfera e diversidade ambiental'),
    (v_unidade_id, 'Ecossistemas terrestres'),
    (v_unidade_id, 'Biomas mundiais'),
    (v_unidade_id, 'Florestas tropicais'),
    (v_unidade_id, 'Biomas e ecossistemas'),
    (v_unidade_id, 'Savanas, desertos e tundras'),
    (v_unidade_id, 'Vegetação e clima'),
    (v_unidade_id, 'Recursos naturais'),
    (v_unidade_id, 'Uso sustentável dos recursos naturais'),
    (v_unidade_id, 'Recursos naturais e sustentabilidade'),
    (v_unidade_id, 'Impactos ambientais'),
    (v_unidade_id, 'Desmatamento'),
    (v_unidade_id, 'Queimadas e poluição'),
    (v_unidade_id, 'Mudanças climáticas'),
    (v_unidade_id, 'Problemas ambientais contemporâneos'),
    (v_unidade_id, 'Preservação e conservação ambiental'),
    (v_unidade_id, 'Unidades de conservação'),
    (v_unidade_id, 'Educação ambiental'),
    (v_unidade_id, 'Revisão dos conteúdos'),
    (v_unidade_id, 'Projeto de conscientização ambiental');

  -- 6º Ano | Geografia | 4º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Finais (6° ao 9° ANO)' AND ano = '6º Ano' AND disciplina = 'Geografia' AND bimestre = '4º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Finais (6° ao 9° ANO)', '6º Ano', 'Geografia', '4º Bimestre', 'Conceito de população')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Conceito de população'),
    (v_unidade_id, 'Crescimento populacional'),
    (v_unidade_id, 'Distribuição da população mundial'),
    (v_unidade_id, 'Densidade demográfica'),
    (v_unidade_id, 'População e distribuição demográfica'),
    (v_unidade_id, 'Migrações e deslocamentos populacionais'),
    (v_unidade_id, 'Imigração e emigração'),
    (v_unidade_id, 'Refugiados e mobilidade humana'),
    (v_unidade_id, 'Urbanização'),
    (v_unidade_id, 'Migrações e urbanização'),
    (v_unidade_id, 'Cidades e metrópoles'),
    (v_unidade_id, 'Problemas urbanos'),
    (v_unidade_id, 'Qualidade de vida nas cidades'),
    (v_unidade_id, 'Espaço rural e atividades agrícolas'),
    (v_unidade_id, 'Espaço urbano e rural'),
    (v_unidade_id, 'Relações entre sociedade e natureza'),
    (v_unidade_id, 'Desenvolvimento sustentável'),
    (v_unidade_id, 'Revisão geral dos conteúdos'),
    (v_unidade_id, 'Organização do portfólio'),
    (v_unidade_id, 'Seminário sobre sociedade e meio ambiente');

  -- 6º Ano | História | 1º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Finais (6° ao 9° ANO)' AND ano = '6º Ano' AND disciplina = 'História' AND bimestre = '1º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Finais (6° ao 9° ANO)', '6º Ano', 'História', '1º Bimestre', 'Introdução ao estudo da História tempo, memória e fontes históricas')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Introdução ao estudo da História tempo, memória e fontes históricas'),
    (v_unidade_id, 'O trabalho do historiador e a produção do conhecimento histórico'),
    (v_unidade_id, 'Diferentes tipos de fontes históricas'),
    (v_unidade_id, 'A origem dos seres humanos e as teorias sobre a evolução'),
    (v_unidade_id, 'Fontes históricas e origem da humanidade'),
    (v_unidade_id, 'O período Paleolítico'),
    (v_unidade_id, 'O período Neolítico e a Revolução Agrícola'),
    (v_unidade_id, 'O surgimento das primeiras aldeias'),
    (v_unidade_id, 'A Idade dos Metais'),
    (v_unidade_id, 'Pré-História e Revolução Neolítica'),
    (v_unidade_id, 'As primeiras civilizações'),
    (v_unidade_id, 'Mesopotâmia localização e organização social'),
    (v_unidade_id, 'Cultura, religião e escrita na Mesopotâmia'),
    (v_unidade_id, 'Legados das civilizações mesopotâmicas'),
    (v_unidade_id, 'Civilização Mesopotâmica'),
    (v_unidade_id, 'O Egito Antigo formação e localização'),
    (v_unidade_id, 'Sociedade e política no Egito'),
    (v_unidade_id, 'Religião e cultura egípcia'),
    (v_unidade_id, 'As contribuições do Egito para a humanidade'),
    (v_unidade_id, 'Egito Antigo');

  -- 6º Ano | História | 2º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Finais (6° ao 9° ANO)' AND ano = '6º Ano' AND disciplina = 'História' AND bimestre = '2º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Finais (6° ao 9° ANO)', '6º Ano', 'História', '2º Bimestre', 'Povos da Antiguidade Oriental Hebreus')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Povos da Antiguidade Oriental Hebreus'),
    (v_unidade_id, 'Religião e cultura hebraica'),
    (v_unidade_id, 'Fenícios e o comércio marítimo'),
    (v_unidade_id, 'Os persas e a formação de impérios'),
    (v_unidade_id, 'Hebreus, Fenícios e Persas'),
    (v_unidade_id, 'A formação da Grécia Antiga'),
    (v_unidade_id, 'As cidades-estado gregas Atenas e Esparta'),
    (v_unidade_id, 'A democracia ateniense'),
    (v_unidade_id, 'Cultura, arte e filosofia grega'),
    (v_unidade_id, 'Grécia Antiga'),
    (v_unidade_id, 'As Guerras Médicas'),
    (v_unidade_id, 'Alexandre Magno e o Helenismo'),
    (v_unidade_id, 'A expansão da cultura grega'),
    (v_unidade_id, 'Influências gregas no mundo atual'),
    (v_unidade_id, 'Helenismo e expansão grega'),
    (v_unidade_id, 'Revisão dos conteúdos estudados'),
    (v_unidade_id, 'Atividades práticas e análise de fontes'),
    (v_unidade_id, 'Produção de linha do tempo'),
    (v_unidade_id, 'Seminário sobre civilizações antigas'),
    (v_unidade_id, 'Civilizações da Antiguidade Oriental e Grécia');

  -- 6º Ano | História | 3º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Finais (6° ao 9° ANO)' AND ano = '6º Ano' AND disciplina = 'História' AND bimestre = '3º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Finais (6° ao 9° ANO)', '6º Ano', 'História', '3º Bimestre', 'A origem de Roma')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'A origem de Roma'),
    (v_unidade_id, 'Monarquia Romana'),
    (v_unidade_id, 'República Romana'),
    (v_unidade_id, 'Sociedade e cultura romana'),
    (v_unidade_id, 'Formação de Roma'),
    (v_unidade_id, 'Expansão territorial romana'),
    (v_unidade_id, 'As Guerras Púnicas'),
    (v_unidade_id, 'Crise da República'),
    (v_unidade_id, 'A ascensão do Império Romano'),
    (v_unidade_id, 'República e expansão romana'),
    (v_unidade_id, 'O Império Romano e sua administração'),
    (v_unidade_id, 'Religião e cotidiano em Roma'),
    (v_unidade_id, 'O surgimento do Cristianismo'),
    (v_unidade_id, 'A cristianização do Império'),
    (v_unidade_id, 'Império Romano e Cristianismo'),
    (v_unidade_id, 'A crise do Império Romano'),
    (v_unidade_id, 'As invasões bárbaras'),
    (v_unidade_id, 'A queda do Império Romano do Ocidente'),
    (v_unidade_id, 'Legados da civilização romana'),
    (v_unidade_id, 'Crise e legado romano');

  -- 6º Ano | História | 4º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Finais (6° ao 9° ANO)' AND ano = '6º Ano' AND disciplina = 'História' AND bimestre = '4º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Finais (6° ao 9° ANO)', '6º Ano', 'História', '4º Bimestre', 'A formação da Idade Média')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'A formação da Idade Média'),
    (v_unidade_id, 'Os povos germânicos'),
    (v_unidade_id, 'O Reino Franco'),
    (v_unidade_id, 'Carlos Magno e o Império Carolíngio'),
    (v_unidade_id, 'Formação da Europa Medieval'),
    (v_unidade_id, 'O sistema feudal'),
    (v_unidade_id, 'Sociedade feudal'),
    (v_unidade_id, 'Economia e relações de trabalho no feudalismo'),
    (v_unidade_id, 'O poder da Igreja Medieval'),
    (v_unidade_id, 'Feudalismo e Igreja Medieval'),
    (v_unidade_id, 'Cultura e educação na Idade Média'),
    (v_unidade_id, 'As Cruzadas'),
    (v_unidade_id, 'Renascimento comercial e urbano'),
    (v_unidade_id, 'Transformações da Baixa Idade Média'),
    (v_unidade_id, 'Cruzadas e renascimento urbano'),
    (v_unidade_id, 'A crise do feudalismo'),
    (v_unidade_id, 'A Peste Negra'),
    (v_unidade_id, 'O fortalecimento das monarquias nacionais'),
    (v_unidade_id, 'Revisão geral dos conteúdos'),
    (v_unidade_id, 'Idade Média e transição para a Idade Moderna');

  -- 6º Ano | Matemática | 1º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Finais (6° ao 9° ANO)' AND ano = '6º Ano' AND disciplina = 'Matemática' AND bimestre = '1º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Finais (6° ao 9° ANO)', '6º Ano', 'Matemática', '1º Bimestre', 'Apresentação da disciplina e diagnóstico inicial')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Apresentação da disciplina e diagnóstico inicial'),
    (v_unidade_id, 'Sistema de numeração decimal'),
    (v_unidade_id, 'Leitura e escrita de números naturais'),
    (v_unidade_id, 'Comparação e ordenação de números naturais'),
    (v_unidade_id, 'Sistema de numeração decimal e números naturais'),
    (v_unidade_id, 'Potenciação de números naturais'),
    (v_unidade_id, 'Expressões numéricas'),
    (v_unidade_id, 'Múltiplos de um número'),
    (v_unidade_id, 'Divisores de um número'),
    (v_unidade_id, 'Potenciação, múltiplos e divisores'),
    (v_unidade_id, 'Critérios de divisibilidade'),
    (v_unidade_id, 'Números primos'),
    (v_unidade_id, 'Decomposição em fatores primos'),
    (v_unidade_id, 'Máximo Divisor Comum (MDC)'),
    (v_unidade_id, 'Números primos e divisibilidade'),
    (v_unidade_id, 'Mínimo Múltiplo Comum (MMC)'),
    (v_unidade_id, 'Resolução de problemas com MDC e MMC'),
    (v_unidade_id, 'Revisão dos conteúdos'),
    (v_unidade_id, 'Exercícios de fixação'),
    (v_unidade_id, 'Resolução de problemas envolvendo números naturais');

  -- 6º Ano | Matemática | 2º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Finais (6° ao 9° ANO)' AND ano = '6º Ano' AND disciplina = 'Matemática' AND bimestre = '2º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Finais (6° ao 9° ANO)', '6º Ano', 'Matemática', '2º Bimestre', 'Conceito de fração')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Conceito de fração'),
    (v_unidade_id, 'Leitura e representação de frações'),
    (v_unidade_id, 'Frações equivalentes'),
    (v_unidade_id, 'Comparação e simplificação de frações'),
    (v_unidade_id, 'Conceitos e equivalência de frações'),
    (v_unidade_id, 'Adição de frações'),
    (v_unidade_id, 'Subtração de frações'),
    (v_unidade_id, 'Multiplicação de frações'),
    (v_unidade_id, 'Divisão de frações'),
    (v_unidade_id, 'Operações com frações'),
    (v_unidade_id, 'Números decimais'),
    (v_unidade_id, 'Operações com números decimais'),
    (v_unidade_id, 'Transformação entre frações e decimais'),
    (v_unidade_id, 'Problemas envolvendo números decimais'),
    (v_unidade_id, 'Números decimais e operações'),
    (v_unidade_id, 'Conceito de porcentagem'),
    (v_unidade_id, 'Cálculo de porcentagens simples'),
    (v_unidade_id, 'Aplicações da porcentagem no cotidiano'),
    (v_unidade_id, 'Revisão dos conteúdos'),
    (v_unidade_id, 'Porcentagem e situações-problema');

  -- 6º Ano | Matemática | 3º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Finais (6° ao 9° ANO)' AND ano = '6º Ano' AND disciplina = 'Matemática' AND bimestre = '3º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Finais (6° ao 9° ANO)', '6º Ano', 'Matemática', '3º Bimestre', 'Conceitos básicos da geometria')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Conceitos básicos da geometria'),
    (v_unidade_id, 'Ponto, reta e plano'),
    (v_unidade_id, 'Segmento de reta e semirreta'),
    (v_unidade_id, 'Ângulos e suas classificações'),
    (v_unidade_id, 'Conceitos geométricos básicos'),
    (v_unidade_id, 'Triângulos'),
    (v_unidade_id, 'Quadriláteros'),
    (v_unidade_id, 'Polígonos'),
    (v_unidade_id, 'Circunferência e círculo'),
    (v_unidade_id, 'Figuras geométricas planas'),
    (v_unidade_id, 'Perímetro de figuras planas'),
    (v_unidade_id, 'Área de quadrados e retângulos'),
    (v_unidade_id, 'Área de outras figuras planas'),
    (v_unidade_id, 'Problemas envolvendo área e perímetro'),
    (v_unidade_id, 'Área e perímetro'),
    (v_unidade_id, 'Medidas de comprimento'),
    (v_unidade_id, 'Medidas de massa'),
    (v_unidade_id, 'Medidas de capacidade'),
    (v_unidade_id, 'Revisão dos conteúdos'),
    (v_unidade_id, 'Grandezas e medidas');

  -- 6º Ano | Matemática | 4º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Finais (6° ao 9° ANO)' AND ano = '6º Ano' AND disciplina = 'Matemática' AND bimestre = '4º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Finais (6° ao 9° ANO)', '6º Ano', 'Matemática', '4º Bimestre', 'Coleta e organização de dados')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Coleta e organização de dados'),
    (v_unidade_id, 'Tabelas estatísticas'),
    (v_unidade_id, 'Gráficos de barras'),
    (v_unidade_id, 'Gráficos de colunas'),
    (v_unidade_id, 'Tabelas e gráficos'),
    (v_unidade_id, 'Gráficos de setores'),
    (v_unidade_id, 'Interpretação de dados estatísticos'),
    (v_unidade_id, 'Média aritmética simples'),
    (v_unidade_id, 'Problemas envolvendo estatística'),
    (v_unidade_id, 'Estatística e interpretação de dados'),
    (v_unidade_id, 'Introdução à probabilidade'),
    (v_unidade_id, 'Experimentos aleatórios'),
    (v_unidade_id, 'Cálculo de probabilidades simples'),
    (v_unidade_id, 'Situações-problema envolvendo probabilidade'),
    (v_unidade_id, 'Probabilidade'),
    (v_unidade_id, 'Revisão geral dos conteúdos do ano'),
    (v_unidade_id, 'Exercícios integradores'),
    (v_unidade_id, 'Jogos de raciocínio lógico'),
    (v_unidade_id, 'Recuperação paralela'),
    (v_unidade_id, 'Final dos conteúdos do ano');

  -- 6º Ano | Português | 1º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Finais (6° ao 9° ANO)' AND ano = '6º Ano' AND disciplina = 'Português' AND bimestre = '1º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Finais (6° ao 9° ANO)', '6º Ano', 'Português', '1º Bimestre', 'Apresentação da disciplina e diagnóstico inicial')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Apresentação da disciplina e diagnóstico inicial'),
    (v_unidade_id, 'Estratégias de leitura e compreensão textual'),
    (v_unidade_id, 'Identificação do tema e da finalidade do texto'),
    (v_unidade_id, 'Informações explícitas e implícitas'),
    (v_unidade_id, 'Interpretação de texto e identificação do tema'),
    (v_unidade_id, 'Variações linguísticas'),
    (v_unidade_id, 'Linguagem formal e informal'),
    (v_unidade_id, 'Ortografia e uso do dicionário'),
    (v_unidade_id, 'Acentuação gráfica'),
    (v_unidade_id, 'Variações linguísticas e ortografia'),
    (v_unidade_id, 'Classes de palavras introdução'),
    (v_unidade_id, 'Substantivos e suas classificações'),
    (v_unidade_id, 'Adjetivos e locuções adjetivas'),
    (v_unidade_id, 'Artigos e numerais'),
    (v_unidade_id, 'Classes gramaticais nominais'),
    (v_unidade_id, 'Produção de parágrafos'),
    (v_unidade_id, 'Coesão e coerência textual'),
    (v_unidade_id, 'Revisão dos conteúdos'),
    (v_unidade_id, 'Exercícios de aplicação'),
    (v_unidade_id, 'Produção de texto descritivo');

  -- 6º Ano | Português | 2º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Finais (6° ao 9° ANO)' AND ano = '6º Ano' AND disciplina = 'Português' AND bimestre = '2º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Finais (6° ao 9° ANO)', '6º Ano', 'Português', '2º Bimestre', 'Contos populares e contemporâneos')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Contos populares e contemporâneos'),
    (v_unidade_id, 'Elementos da narrativa'),
    (v_unidade_id, 'Narrador, personagens, tempo e espaço'),
    (v_unidade_id, 'Sequência narrativa'),
    (v_unidade_id, 'Interpretação de conto'),
    (v_unidade_id, 'Fábulas e lendas'),
    (v_unidade_id, 'Mitos e tradições culturais'),
    (v_unidade_id, 'Comparação entre gêneros narrativos'),
    (v_unidade_id, 'Leitura e análise textual'),
    (v_unidade_id, 'Fábulas, lendas e mitos'),
    (v_unidade_id, 'Produção de narrativas'),
    (v_unidade_id, 'Planejamento da escrita'),
    (v_unidade_id, 'Desenvolvimento e conclusão'),
    (v_unidade_id, 'Revisão e reescrita'),
    (v_unidade_id, 'Produção de narrativa'),
    (v_unidade_id, 'Histórias em quadrinhos'),
    (v_unidade_id, 'Linguagem verbal e não verbal'),
    (v_unidade_id, 'Produção de HQ'),
    (v_unidade_id, 'Revisão dos conteúdos'),
    (v_unidade_id, 'Produção de história em quadrinhos');

  -- 6º Ano | Português | 3º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Finais (6° ao 9° ANO)' AND ano = '6º Ano' AND disciplina = 'Português' AND bimestre = '3º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Finais (6° ao 9° ANO)', '6º Ano', 'Português', '3º Bimestre', 'Pronomes pessoais, possessivos e demonstrativos')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Pronomes pessoais, possessivos e demonstrativos'),
    (v_unidade_id, 'Emprego dos pronomes'),
    (v_unidade_id, 'Verbos conceito e classificação'),
    (v_unidade_id, 'Tempos verbais'),
    (v_unidade_id, 'Pronomes e verbos'),
    (v_unidade_id, 'Modos verbais'),
    (v_unidade_id, 'Verbos regulares e irregulares'),
    (v_unidade_id, 'Advérbios'),
    (v_unidade_id, 'Locuções adverbiais'),
    (v_unidade_id, 'Verbos e advérbios'),
    (v_unidade_id, 'Preposições'),
    (v_unidade_id, 'Conjunções'),
    (v_unidade_id, 'Relações de sentido nas frases'),
    (v_unidade_id, 'Concordância verbal básica'),
    (v_unidade_id, 'Preposições e conjunções'),
    (v_unidade_id, 'Pontuação'),
    (v_unidade_id, 'Uso da vírgula'),
    (v_unidade_id, 'Discurso direto e indireto'),
    (v_unidade_id, 'Revisão gramatical'),
    (v_unidade_id, 'Pontuação e discurso direto');

  -- 6º Ano | Português | 4º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Finais (6° ao 9° ANO)' AND ano = '6º Ano' AND disciplina = 'Português' AND bimestre = '4º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Finais (6° ao 9° ANO)', '6º Ano', 'Português', '4º Bimestre', 'Textos informativos')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Textos informativos'),
    (v_unidade_id, 'Notícias e reportagens'),
    (v_unidade_id, 'Estrutura da notícia'),
    (v_unidade_id, 'Linguagem jornalística'),
    (v_unidade_id, 'Interpretação de notícia'),
    (v_unidade_id, 'Resumo e síntese textual'),
    (v_unidade_id, 'Identificação de ideias principais'),
    (v_unidade_id, 'Produção de resumos'),
    (v_unidade_id, 'Técnicas de síntese'),
    (v_unidade_id, 'Produção de resumo'),
    (v_unidade_id, 'Poemas e poesia'),
    (v_unidade_id, 'Figuras de linguagem (introdução)'),
    (v_unidade_id, 'Versos, estrofes e ritmo'),
    (v_unidade_id, 'Interpretação poética'),
    (v_unidade_id, 'Interpretação de poema'),
    (v_unidade_id, 'Produção textual livre'),
    (v_unidade_id, 'Revisão geral dos conteúdos'),
    (v_unidade_id, 'Leitura crítica e argumentação inicial'),
    (v_unidade_id, 'Socialização das produções'),
    (v_unidade_id, 'Produção textual final');

  -- 2º Ano | Geografia | 1º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '2º Ano' AND disciplina = 'Geografia' AND bimestre = '1º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '2º Ano', 'Geografia', '1º Bimestre', 'O estudo da Geografia')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'O estudo da Geografia'),
    (v_unidade_id, 'Os lugares onde vivemos'),
    (v_unidade_id, 'Minha casa e sua organização'),
    (v_unidade_id, 'Diferentes tipos de moradia'),
    (v_unidade_id, 'As pessoas que convivem comigo'),
    (v_unidade_id, 'Desenho e identificação dos tipos de moradia'),
    (v_unidade_id, 'A escola como espaço de convivência'),
    (v_unidade_id, 'Funções dos espaços da escola'),
    (v_unidade_id, 'Direitos e deveres na escola'),
    (v_unidade_id, 'Convivência e respeito aos colegas'),
    (v_unidade_id, 'Atividade sobre os espaços da escola'),
    (v_unidade_id, 'O bairro onde moro'),
    (v_unidade_id, 'Locais importantes do bairro'),
    (v_unidade_id, 'Serviços públicos da comunidade'),
    (v_unidade_id, 'Cuidados com os espaços coletivos'),
    (v_unidade_id, 'Produção sobre o bairro'),
    (v_unidade_id, 'O caminho entre casa e escola'),
    (v_unidade_id, 'Pontos de referência'),
    (v_unidade_id, 'Orientação espacial básica'),
    (v_unidade_id, 'Representação do trajeto casa-escola');

  -- 2º Ano | Geografia | 2º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '2º Ano' AND disciplina = 'Geografia' AND bimestre = '2º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '2º Ano', 'Geografia', '2º Bimestre', 'O que é paisagem')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'O que é paisagem'),
    (v_unidade_id, 'Paisagens naturais'),
    (v_unidade_id, 'Paisagens modificadas pelo ser humano'),
    (v_unidade_id, 'Observação de paisagens locais'),
    (v_unidade_id, 'Identificação dos elementos da paisagem'),
    (v_unidade_id, 'Campo e cidade'),
    (v_unidade_id, 'Atividades desenvolvidas no campo'),
    (v_unidade_id, 'Atividades desenvolvidas na cidade'),
    (v_unidade_id, 'Relação entre campo e cidade'),
    (v_unidade_id, 'Comparação entre campo e cidade'),
    (v_unidade_id, 'Mudanças na paisagem ao longo do tempo'),
    (v_unidade_id, 'Crescimento das cidades'),
    (v_unidade_id, 'Transformações no bairro'),
    (v_unidade_id, 'Preservação dos espaços naturais'),
    (v_unidade_id, 'Registro de mudanças na paisagem'),
    (v_unidade_id, 'Espaços de lazer'),
    (v_unidade_id, 'Praças, parques e áreas verdes'),
    (v_unidade_id, 'Importância da preservação ambiental'),
    (v_unidade_id, 'Atitudes de conservação'),
    (v_unidade_id, 'Cartaz sobre preservação dos espaços públicos');

  -- 2º Ano | Geografia | 3º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '2º Ano' AND disciplina = 'Geografia' AND bimestre = '3º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '2º Ano', 'Geografia', '3º Bimestre', 'Elementos da natureza')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Elementos da natureza'),
    (v_unidade_id, 'Água e sua importância'),
    (v_unidade_id, 'Uso consciente da água'),
    (v_unidade_id, 'Fontes de água na comunidade'),
    (v_unidade_id, 'Atividade sobre o uso consciente da água'),
    (v_unidade_id, 'O ar e sua importância'),
    (v_unidade_id, 'O solo e sua utilidade'),
    (v_unidade_id, 'Conservação do solo'),
    (v_unidade_id, 'Recursos naturais'),
    (v_unidade_id, 'Identificação dos recursos naturais'),
    (v_unidade_id, 'Clima e tempo atmosférico'),
    (v_unidade_id, 'As estações do ano'),
    (v_unidade_id, 'Características das estações'),
    (v_unidade_id, 'Influência do clima na vida das pessoas'),
    (v_unidade_id, 'Produção sobre as estações do ano'),
    (v_unidade_id, 'Problemas ambientais'),
    (v_unidade_id, 'Poluição da água, do ar e do solo'),
    (v_unidade_id, 'Reciclagem e reaproveitamento'),
    (v_unidade_id, 'Sustentabilidade no dia a dia'),
    (v_unidade_id, 'Projeto de reciclagem');

  -- 2º Ano | Geografia | 4º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '2º Ano' AND disciplina = 'Geografia' AND bimestre = '4º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '2º Ano', 'Geografia', '4º Bimestre', 'Formas de representar os espaços')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Formas de representar os espaços'),
    (v_unidade_id, 'Desenhos e croquis'),
    (v_unidade_id, 'Mapas simples'),
    (v_unidade_id, 'Símbolos e legendas'),
    (v_unidade_id, 'Construção de legenda cartográfica'),
    (v_unidade_id, 'Localização de objetos e lugares'),
    (v_unidade_id, 'Noções de direita, esquerda, frente e atrás'),
    (v_unidade_id, 'Orientação espacial'),
    (v_unidade_id, 'Leitura de representações espaciais'),
    (v_unidade_id, 'Exercícios de orientação espacial'),
    (v_unidade_id, 'Representação da sala de aula'),
    (v_unidade_id, 'Representação da escola'),
    (v_unidade_id, 'Representação do bairro'),
    (v_unidade_id, 'Identificação de pontos de referência'),
    (v_unidade_id, 'Elaboração de croqui do bairro'),
    (v_unidade_id, 'Revisão dos conteúdos estudados'),
    (v_unidade_id, 'Jogos e desafios geográficos'),
    (v_unidade_id, 'Atividades práticas de localização'),
    (v_unidade_id, 'Organização do portfólio'),
    (v_unidade_id, 'Portfólio geográfico do estudante');

  -- 2º Ano | História | 1º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '2º Ano' AND disciplina = 'História' AND bimestre = '1º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '2º Ano', 'História', '1º Bimestre', 'História pessoal e identidade')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'História pessoal e identidade'),
    (v_unidade_id, 'Meu nome e minha história'),
    (v_unidade_id, 'Minha família e suas origens'),
    (v_unidade_id, 'Diferentes tipos de família'),
    (v_unidade_id, ' Identidade e família'),
    (v_unidade_id, 'Minha casa e suas mudanças ao longo do tempo'),
    (v_unidade_id, 'Regras de convivência familiar'),
    (v_unidade_id, 'A história da minha escola'),
    (v_unidade_id, 'Pessoas que fazem parte da escola'),
    (v_unidade_id, ' Casa e escola'),
    (v_unidade_id, 'O bairro onde moro'),
    (v_unidade_id, 'Serviços existentes no bairro'),
    (v_unidade_id, 'A importância da comunidade'),
    (v_unidade_id, 'Convivência e respeito na comunidade'),
    (v_unidade_id, ' Bairro e comunidade'),
    (v_unidade_id, 'O passado e o presente'),
    (v_unidade_id, 'Mudanças na vida das pessoas'),
    (v_unidade_id, 'Objetos antigos e atuais'),
    (v_unidade_id, 'Comparando épocas diferentes'),
    (v_unidade_id, ' Passado e presente');

  -- 2º Ano | História | 2º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '2º Ano' AND disciplina = 'História' AND bimestre = '2º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '2º Ano', 'História', '2º Bimestre', 'As fases da vida humana')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'As fases da vida humana'),
    (v_unidade_id, 'Crescimento e desenvolvimento'),
    (v_unidade_id, 'Direitos das crianças'),
    (v_unidade_id, 'Deveres das crianças'),
    (v_unidade_id, ' Fases da vida e cidadania'),
    (v_unidade_id, 'Memórias e recordações'),
    (v_unidade_id, 'Fotografias como fonte histórica'),
    (v_unidade_id, 'Objetos que contam histórias'),
    (v_unidade_id, 'Histórias da família'),
    (v_unidade_id, ' Memórias e fontes históricas'),
    (v_unidade_id, 'Costumes e tradições familiares'),
    (v_unidade_id, 'Festas e celebrações culturais'),
    (v_unidade_id, 'Tradições da comunidade'),
    (v_unidade_id, 'Cultura local'),
    (v_unidade_id, ' Cultura e tradições'),
    (v_unidade_id, 'Histórias contadas pelos mais velhos'),
    (v_unidade_id, 'A importância da oralidade'),
    (v_unidade_id, 'Registro das histórias'),
    (v_unidade_id, 'Preservação das memórias'),
    (v_unidade_id, ' História oral e memórias');

  -- 2º Ano | História | 3º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '2º Ano' AND disciplina = 'História' AND bimestre = '3º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '2º Ano', 'História', '3º Bimestre', 'Profissões antigas e atuais')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Profissões antigas e atuais'),
    (v_unidade_id, 'O trabalho na comunidade'),
    (v_unidade_id, 'A importância das profissões'),
    (v_unidade_id, 'Mudanças no mundo do trabalho'),
    (v_unidade_id, ' Trabalho e profissões'),
    (v_unidade_id, 'Meios de transporte de ontem e de hoje'),
    (v_unidade_id, 'A evolução dos transportes'),
    (v_unidade_id, 'Transportes da comunidade'),
    (v_unidade_id, 'Segurança no trânsito'),
    (v_unidade_id, ' Meios de transporte'),
    (v_unidade_id, 'Meios de comunicação antigos'),
    (v_unidade_id, 'Meios de comunicação atuais'),
    (v_unidade_id, 'Comunicação e tecnologia'),
    (v_unidade_id, 'O uso responsável da tecnologia'),
    (v_unidade_id, ' Comunicação e tecnologia'),
    (v_unidade_id, 'Mudanças tecnológicas na vida das pessoas'),
    (v_unidade_id, 'Invenções importantes'),
    (v_unidade_id, 'Transformações no cotidiano'),
    (v_unidade_id, 'Comparação entre passado e presente'),
    (v_unidade_id, ' Transformações históricas');

  -- 2º Ano | História | 4º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '2º Ano' AND disciplina = 'História' AND bimestre = '4º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '2º Ano', 'História', '4º Bimestre', 'A história do município')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'A história do município'),
    (v_unidade_id, 'Formação da comunidade local'),
    (v_unidade_id, 'Lugares históricos da cidade'),
    (v_unidade_id, 'Patrimônio histórico e cultural'),
    (v_unidade_id, ' História do município'),
    (v_unidade_id, 'Povos indígenas do Brasil'),
    (v_unidade_id, 'A contribuição dos povos indígenas'),
    (v_unidade_id, 'Cultura indígena na atualidade'),
    (v_unidade_id, 'Respeito aos povos originários'),
    (v_unidade_id, ' Povos indígenas'),
    (v_unidade_id, 'Cultura afro-brasileira'),
    (v_unidade_id, 'Contribuições africanas para o Brasil'),
    (v_unidade_id, 'Diversidade cultural brasileira'),
    (v_unidade_id, 'Respeito às diferenças culturais'),
    (v_unidade_id, ' Diversidade cultural'),
    (v_unidade_id, 'Revisão dos conteúdos estudados'),
    (v_unidade_id, 'Linha do tempo da aprendizagem'),
    (v_unidade_id, 'Produção de atividades de síntese'),
    (v_unidade_id, 'Exposição de trabalhos históricos'),
    (v_unidade_id, ' Revisão geral dos conteúdos do ano');

  -- 2º Ano | Matemática | 1º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '2º Ano' AND disciplina = 'Matemática' AND bimestre = '1º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '2º Ano', 'Matemática', '1º Bimestre', 'Revisão dos números até 0')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Revisão dos números até 0'),
    (v_unidade_id, 'Números naturais até 0'),
    (v_unidade_id, 'Leitura e escrita de números'),
    (v_unidade_id, 'Sequência numérica crescente'),
    (v_unidade_id, 'Sequência numérica decrescente'),
    (v_unidade_id, 'Leitura, escrita e sequência numérica'),
    (v_unidade_id, 'Antecessor e sucessor'),
    (v_unidade_id, 'Comparação de números'),
    (v_unidade_id, 'Maior, menor e igual'),
    (v_unidade_id, 'Composição e decomposição de números'),
    (v_unidade_id, 'Comparação e composição de números'),
    (v_unidade_id, 'Adição sem reagrupamento'),
    (v_unidade_id, 'Adição em situações-problema'),
    (v_unidade_id, 'Cálculo mental'),
    (v_unidade_id, 'Estratégias de adição'),
    (v_unidade_id, 'Adição e cálculo mental'),
    (v_unidade_id, 'Problemas envolvendo adição'),
    (v_unidade_id, 'Jogos matemáticos'),
    (v_unidade_id, 'Revisão dos conteúdos'),
    (v_unidade_id, 'Resolução de problemas de adição');

  -- 2º Ano | Matemática | 2º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '2º Ano' AND disciplina = 'Matemática' AND bimestre = '2º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '2º Ano', 'Matemática', '2º Bimestre', 'Subtração sem reagrupamento')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Subtração sem reagrupamento'),
    (v_unidade_id, 'Ideia de retirar'),
    (v_unidade_id, 'Ideia de comparar'),
    (v_unidade_id, 'Problemas envolvendo subtração'),
    (v_unidade_id, 'Cálculo mental na subtração'),
    (v_unidade_id, 'Conceitos de subtração'),
    (v_unidade_id, 'Subtração com dezenas'),
    (v_unidade_id, 'Situações-problema'),
    (v_unidade_id, 'Relação entre adição e subtração'),
    (v_unidade_id, 'Jogos envolvendo operações'),
    (v_unidade_id, 'Operações de subtração'),
    (v_unidade_id, 'Medidas de comprimento'),
    (v_unidade_id, 'Instrumentos de medida'),
    (v_unidade_id, 'Medidas de massa'),
    (v_unidade_id, 'Medidas de capacidade'),
    (v_unidade_id, 'Grandezas e medidas'),
    (v_unidade_id, 'Calendário'),
    (v_unidade_id, 'Dias, semanas e meses'),
    (v_unidade_id, 'Revisão dos conteúdos'),
    (v_unidade_id, 'Medidas de tempo');

  -- 2º Ano | Matemática | 3º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '2º Ano' AND disciplina = 'Matemática' AND bimestre = '3º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '2º Ano', 'Matemática', '3º Bimestre', 'Figuras geométricas planas')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Figuras geométricas planas'),
    (v_unidade_id, 'Quadrado e retângulo'),
    (v_unidade_id, 'Triângulo e círculo'),
    (v_unidade_id, 'Identificação de formas no cotidiano'),
    (v_unidade_id, 'Construção de figuras'),
    (v_unidade_id, 'Sólidos geométricos'),
    (v_unidade_id, 'Cubo e paralelepípedo'),
    (v_unidade_id, 'Esfera e cilindro'),
    (v_unidade_id, 'Comparação de sólidos'),
    (v_unidade_id, 'Introdução à multiplicação'),
    (v_unidade_id, 'Adição de parcelas iguais'),
    (v_unidade_id, 'Dobro'),
    (v_unidade_id, 'Triplo'),
    (v_unidade_id, 'Conceitos de multiplicação'),
    (v_unidade_id, 'Situações-problema envolvendo multiplicação'),
    (v_unidade_id, 'Jogos matemáticos'),
    (v_unidade_id, 'Revisão dos conteúdos'),
    (v_unidade_id, 'Problemas de multiplicação');

  -- 2º Ano | Matemática | 4º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '2º Ano' AND disciplina = 'Matemática' AND bimestre = '4º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '2º Ano', 'Matemática', '4º Bimestre', 'Introdução à divisão')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Introdução à divisão'),
    (v_unidade_id, 'Repartição em partes iguais'),
    (v_unidade_id, 'Divisão em situações do cotidiano'),
    (v_unidade_id, 'Relação entre multiplicação e divisão'),
    (v_unidade_id, 'Exercícios práticos'),
    (v_unidade_id, 'Conceitos de divisão'),
    (v_unidade_id, 'Coleta de informações'),
    (v_unidade_id, 'Organização de dados'),
    (v_unidade_id, 'Tabelas simples'),
    (v_unidade_id, 'Gráficos de colunas'),
    (v_unidade_id, 'Tabelas e gráficos'),
    (v_unidade_id, 'Resolução de problemas envolvendo operações'),
    (v_unidade_id, 'Revisão de números e operações'),
    (v_unidade_id, 'Revisão de medidas'),
    (v_unidade_id, 'Revisão de geometria'),
    (v_unidade_id, 'Revisão de conteúdos matemáticos'),
    (v_unidade_id, 'Jogos de raciocínio lógico'),
    (v_unidade_id, 'Atividades integradoras'),
    (v_unidade_id, 'Recuperação e reforço'),
    (v_unidade_id, 'final dos conteúdos do ano');

  -- 2º Ano | Português | 1º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '2º Ano' AND disciplina = 'Português' AND bimestre = '1º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '2º Ano', 'Português', '1º Bimestre', 'Apresentação da disciplina e revisão do alfabeto')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Apresentação da disciplina e revisão do alfabeto'),
    (v_unidade_id, 'Ordem alfabética'),
    (v_unidade_id, 'Formação de palavras'),
    (v_unidade_id, 'Separação silábica'),
    (v_unidade_id, 'Leitura de palavras e frases'),
    (v_unidade_id, 'Ordem alfabética e formação de palavras'),
    (v_unidade_id, 'Uso das vogais e consoantes'),
    (v_unidade_id, 'Leitura e interpretação de frases'),
    (v_unidade_id, 'Produção de frases simples'),
    (v_unidade_id, 'Substantivos comuns'),
    (v_unidade_id, 'Substantivos próprios'),
    (v_unidade_id, 'Uso de letra maiúscula'),
    (v_unidade_id, 'Gênero das palavras (masculino e feminino)'),
    (v_unidade_id, 'Número das palavras (singular e plural)'),
    (v_unidade_id, 'Substantivos e uso de letra maiúscula'),
    (v_unidade_id, 'Leitura compartilhada'),
    (v_unidade_id, 'Produção textual com imagens'),
    (v_unidade_id, 'Revisão dos conteúdos'),
    (v_unidade_id, 'Produção de frases e pequeno texto');

  -- 2º Ano | Português | 2º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '2º Ano' AND disciplina = 'Português' AND bimestre = '2º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '2º Ano', 'Português', '2º Bimestre', 'Leitura de bilhetes')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Leitura de bilhetes'),
    (v_unidade_id, 'Produção de bilhetes'),
    (v_unidade_id, 'Convites e suas características'),
    (v_unidade_id, 'Produção de convites'),
    (v_unidade_id, 'Leitura de histórias infantis'),
    (v_unidade_id, 'Produção de bilhete'),
    (v_unidade_id, 'Identificação de personagens'),
    (v_unidade_id, 'Local e tempo da narrativa'),
    (v_unidade_id, 'Sequência dos acontecimentos'),
    (v_unidade_id, 'Interpretação textual'),
    (v_unidade_id, 'Interpretação de história infantil'),
    (v_unidade_id, 'Poemas e parlendas'),
    (v_unidade_id, 'Rimas em poemas'),
    (v_unidade_id, 'Leitura expressiva'),
    (v_unidade_id, 'Produção coletiva de poemas'),
    (v_unidade_id, 'Identificação de rimas'),
    (v_unidade_id, 'Histórias em quadrinhos'),
    (v_unidade_id, 'Leitura de tirinhas'),
    (v_unidade_id, 'Revisão dos conteúdos'),
    (v_unidade_id, 'Compreensão de histórias em quadrinhos');

  -- 2º Ano | Português | 3º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '2º Ano' AND disciplina = 'Português' AND bimestre = '3º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '2º Ano', 'Português', '3º Bimestre', 'Adjetivos')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Adjetivos'),
    (v_unidade_id, 'Características de pessoas e objetos'),
    (v_unidade_id, 'Verbos ações do dia a dia'),
    (v_unidade_id, 'Identificação de verbos em frases'),
    (v_unidade_id, 'Construção de frases'),
    (v_unidade_id, 'Adjetivos e características'),
    (v_unidade_id, 'Pontuação ponto final'),
    (v_unidade_id, 'Pontuação ponto de interrogação'),
    (v_unidade_id, 'Pontuação ponto de exclamação'),
    (v_unidade_id, 'Uso correto da pontuação'),
    (v_unidade_id, 'Uso dos sinais de pontuação'),
    (v_unidade_id, 'Produção de textos curtos'),
    (v_unidade_id, 'Organização de ideias'),
    (v_unidade_id, 'Coerência textual'),
    (v_unidade_id, 'Revisão textual'),
    (v_unidade_id, 'Produção de texto narrativo curto'),
    (v_unidade_id, 'Leitura silenciosa'),
    (v_unidade_id, 'Interpretação textual'),
    (v_unidade_id, 'Revisão geral'),
    (v_unidade_id, 'Leitura e interpretação de texto');

  -- 2º Ano | Português | 4º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '2º Ano' AND disciplina = 'Português' AND bimestre = '4º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '2º Ano', 'Português', '4º Bimestre', 'Contos infantis')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Contos infantis'),
    (v_unidade_id, 'Elementos da narrativa'),
    (v_unidade_id, 'Início, meio e fim'),
    (v_unidade_id, 'Reconto de histórias'),
    (v_unidade_id, 'Produção de narrativa simples'),
    (v_unidade_id, 'Cartazes e anúncios'),
    (v_unidade_id, 'Interpretação de cartazes'),
    (v_unidade_id, 'Produção de cartazes'),
    (v_unidade_id, 'Comunicação escrita'),
    (v_unidade_id, 'Produção de cartaz'),
    (v_unidade_id, 'Leitura fluente'),
    (v_unidade_id, 'Ampliação de vocabulário'),
    (v_unidade_id, 'Ortografia básica'),
    (v_unidade_id, 'Revisão ortográfica'),
    (v_unidade_id, 'Ortografia e vocabulário'),
    (v_unidade_id, 'Produção textual livre'),
    (v_unidade_id, 'Revisão dos conteúdos anuais'),
    (v_unidade_id, 'Socialização das produções'),
    (v_unidade_id, 'Produção textual final');

  -- 7º Ano | Artes | 1º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Finais (6° ao 9° ANO)' AND ano = '7º Ano' AND disciplina = 'Artes' AND bimestre = '1º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Finais (6° ao 9° ANO)', '7º Ano', 'Artes', '1º Bimestre', 'Introdução às linguagens artísticas')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Introdução às linguagens artísticas'),
    (v_unidade_id, 'Arte como expressão cultural e histórica'),
    (v_unidade_id, 'Elementos da linguagem visual'),
    (v_unidade_id, 'Composição, equilíbrio e proporção'),
    (v_unidade_id, 'Técnicas de desenho artístico'),
    (v_unidade_id, 'Produção artística utilizando elementos da linguagem visual'),
    (v_unidade_id, 'Arte na Antiguidade'),
    (v_unidade_id, 'Arte Grega'),
    (v_unidade_id, 'Arte Romana'),
    (v_unidade_id, 'Arte na Idade Média'),
    (v_unidade_id, 'Produção artística inspirada na arte da Antiguidade ou Medieval'),
    (v_unidade_id, 'Perspectiva e profundidade'),
    (v_unidade_id, 'Luz e sombra no desenho'),
    (v_unidade_id, 'Técnicas de observação'),
    (v_unidade_id, 'Produção artística orientada'),
    (v_unidade_id, 'Desenho com perspectiva e sombreamento'),
    (v_unidade_id, 'Leitura e interpretação de obras de arte'),
    (v_unidade_id, 'Crítica e apreciação artística'),
    (v_unidade_id, 'Revisão dos conteúdos'),
    (v_unidade_id, 'Análise e produção baseada em obra artística estudada');

  -- 7º Ano | Artes | 2º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Finais (6° ao 9° ANO)' AND ano = '7º Ano' AND disciplina = 'Artes' AND bimestre = '2º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Finais (6° ao 9° ANO)', '7º Ano', 'Artes', '2º Bimestre', 'História da música')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'História da música'),
    (v_unidade_id, 'Música popular brasileira'),
    (v_unidade_id, 'Ritmo, melodia e harmonia'),
    (v_unidade_id, 'Gêneros musicais brasileiros'),
    (v_unidade_id, 'Pesquisa e apresentação sobre um gênero musical brasileiro'),
    (v_unidade_id, 'Instrumentos musicais e suas funções'),
    (v_unidade_id, 'Produção de sons e ritmos'),
    (v_unidade_id, 'Criação musical coletiva'),
    (v_unidade_id, 'Ensaios musicais'),
    (v_unidade_id, 'Apresentação musical em grupo'),
    (v_unidade_id, 'História do teatro'),
    (v_unidade_id, 'Técnicas de interpretação'),
    (v_unidade_id, 'Construção de personagens'),
    (v_unidade_id, 'Improvisação teatral'),
    (v_unidade_id, 'Apresentação de cena teatral temática'),
    (v_unidade_id, 'História da dança'),
    (v_unidade_id, 'Danças populares e urbanas'),
    (v_unidade_id, 'Criação coreográfica'),
    (v_unidade_id, 'Ensaios'),
    (v_unidade_id, 'Apresentação de coreografia em grupo');

  -- 7º Ano | Artes | 3º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Finais (6° ao 9° ANO)' AND ano = '7º Ano' AND disciplina = 'Artes' AND bimestre = '3º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Finais (6° ao 9° ANO)', '7º Ano', 'Artes', '3º Bimestre', 'Cultura e identidade brasileira')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Cultura e identidade brasileira'),
    (v_unidade_id, 'Patrimônio cultural brasileiro'),
    (v_unidade_id, 'Arte indígena contemporânea'),
    (v_unidade_id, 'Grafismos e simbologias indígenas'),
    (v_unidade_id, 'Produção artística inspirada na arte indígena'),
    (v_unidade_id, 'Arte afro-brasileira'),
    (v_unidade_id, 'Influências africanas na cultura nacional'),
    (v_unidade_id, 'Máscaras e símbolos africanos'),
    (v_unidade_id, 'Produção temática'),
    (v_unidade_id, 'Produção artística baseada na cultura afro-brasileira'),
    (v_unidade_id, 'Folclore e cultura popular'),
    (v_unidade_id, 'Festas populares brasileiras'),
    (v_unidade_id, 'Literatura e arte popular'),
    (v_unidade_id, 'Produção coletiva'),
    (v_unidade_id, 'Criação de painel sobre manifestações culturais brasileiras'),
    (v_unidade_id, 'Arte regional brasileira'),
    (v_unidade_id, 'Artistas populares brasileiros'),
    (v_unidade_id, 'Produção artística regional'),
    (v_unidade_id, 'Revisão dos conteúdos'),
    (v_unidade_id, 'Produção artística representando a cultura regional brasileira');

  -- 7º Ano | Artes | 4º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Finais (6° ao 9° ANO)' AND ano = '7º Ano' AND disciplina = 'Artes' AND bimestre = '4º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Finais (6° ao 9° ANO)', '7º Ano', 'Artes', '4º Bimestre', 'Arte Moderna no mundo')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Arte Moderna no mundo'),
    (v_unidade_id, 'Modernismo brasileiro'),
    (v_unidade_id, 'A Semana de Arte Moderna de 9'),
    (v_unidade_id, 'Principais artistas modernistas'),
    (v_unidade_id, 'Releitura de obra modernista brasileira'),
    (v_unidade_id, 'Arte Contemporânea'),
    (v_unidade_id, 'Instalações artísticas'),
    (v_unidade_id, 'Arte urbana e grafite'),
    (v_unidade_id, 'Produção artística contemporânea'),
    (v_unidade_id, 'Criação de obra inspirada na arte contemporânea'),
    (v_unidade_id, 'Fotografia como linguagem artística'),
    (v_unidade_id, 'Técnicas básicas de fotografia'),
    (v_unidade_id, 'Produção fotográfica'),
    (v_unidade_id, 'Edição e composição visual'),
    (v_unidade_id, 'Projeto fotográfico temático'),
    (v_unidade_id, 'Planejamento de projeto artístico final'),
    (v_unidade_id, 'Desenvolvimento do projeto'),
    (v_unidade_id, 'Organização da exposição'),
    (v_unidade_id, 'Montagem e apresentação'),
    (v_unidade_id, 'Apresentação do projeto artístico final em exposição escolar');

  -- 7º Ano | Ciências | 1º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Finais (6° ao 9° ANO)' AND ano = '7º Ano' AND disciplina = 'Ciências' AND bimestre = '1º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Finais (6° ao 9° ANO)', '7º Ano', 'Ciências', '1º Bimestre', 'Apresentação da disciplina e introdução à biodiversidade')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Apresentação da disciplina e introdução à biodiversidade'),
    (v_unidade_id, 'Características gerais dos seres vivos'),
    (v_unidade_id, 'Classificação biológica dos seres vivos'),
    (v_unidade_id, 'Vírus características e importância'),
    (v_unidade_id, 'Reino Monera bactérias'),
    (v_unidade_id, 'Classificação dos seres vivos e vírus'),
    (v_unidade_id, 'Reino Protista'),
    (v_unidade_id, 'Reino Fungi'),
    (v_unidade_id, 'Reino Plantae'),
    (v_unidade_id, 'Reino Animalia'),
    (v_unidade_id, 'Reinos dos seres vivos'),
    (v_unidade_id, 'Ecossistemas brasileiros'),
    (v_unidade_id, 'Cadeias e teias alimentares'),
    (v_unidade_id, 'Relações ecológicas'),
    (v_unidade_id, 'Ciclos biogeoquímicos'),
    (v_unidade_id, 'Ecologia e relações ecológicas'),
    (v_unidade_id, 'Impactos ambientais'),
    (v_unidade_id, 'Sustentabilidade e conservação ambiental'),
    (v_unidade_id, 'Revisão dos conteúdos'),
    (v_unidade_id, 'Biodiversidade e preservação ambiental');

  -- 7º Ano | Ciências | 2º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Finais (6° ao 9° ANO)' AND ano = '7º Ano' AND disciplina = 'Ciências' AND bimestre = '2º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Finais (6° ao 9° ANO)', '7º Ano', 'Ciências', '2º Bimestre', 'Estrutura da matéria')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Estrutura da matéria'),
    (v_unidade_id, 'Átomos e moléculas'),
    (v_unidade_id, 'Elementos químicos'),
    (v_unidade_id, 'Substâncias simples e compostas'),
    (v_unidade_id, 'Misturas homogêneas e heterogêneas'),
    (v_unidade_id, 'Métodos de separação de misturas'),
    (v_unidade_id, 'Transformações físicas'),
    (v_unidade_id, 'Transformações químicas'),
    (v_unidade_id, 'Evidências de reações químicas'),
    (v_unidade_id, 'Misturas e transformações químicas'),
    (v_unidade_id, 'Conceito de energia'),
    (v_unidade_id, 'Formas de energia'),
    (v_unidade_id, 'Fontes renováveis e não renováveis'),
    (v_unidade_id, 'Transformação e conservação da energia'),
    (v_unidade_id, 'Formas e fontes de energia'),
    (v_unidade_id, 'Energia elétrica e consumo consciente'),
    (v_unidade_id, 'Sustentabilidade energética'),
    (v_unidade_id, 'Revisão dos conteúdos'),
    (v_unidade_id, 'Energia e meio ambiente');

  -- 7º Ano | Ciências | 3º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Finais (6° ao 9° ANO)' AND ano = '7º Ano' AND disciplina = 'Ciências' AND bimestre = '3º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Finais (6° ao 9° ANO)', '7º Ano', 'Ciências', '3º Bimestre', 'Organização do corpo humano')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Organização do corpo humano'),
    (v_unidade_id, 'Sistema digestório'),
    (v_unidade_id, 'Sistema respiratório'),
    (v_unidade_id, 'Sistema circulatório'),
    (v_unidade_id, 'Sistema excretor'),
    (v_unidade_id, 'Sistemas digestório, respiratório e circulatório'),
    (v_unidade_id, 'Sistema locomotor'),
    (v_unidade_id, 'Sistema nervoso'),
    (v_unidade_id, 'Sistema endócrino'),
    (v_unidade_id, 'Integração dos sistemas corporais'),
    (v_unidade_id, 'Sistema nervoso e endócrino'),
    (v_unidade_id, 'Alimentação equilibrada'),
    (v_unidade_id, 'Distúrbios alimentares'),
    (v_unidade_id, 'Doenças transmissíveis e não transmissíveis'),
    (v_unidade_id, 'Vacinação e imunização'),
    (v_unidade_id, 'Saúde e prevenção de doenças'),
    (v_unidade_id, 'Saneamento básico'),
    (v_unidade_id, 'Qualidade de vida e saúde coletiva'),
    (v_unidade_id, 'Revisão dos conteúdos'),
    (v_unidade_id, 'Saúde pública e qualidade de vida');

  -- 7º Ano | Ciências | 4º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Finais (6° ao 9° ANO)' AND ano = '7º Ano' AND disciplina = 'Ciências' AND bimestre = '4º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Finais (6° ao 9° ANO)', '7º Ano', 'Ciências', '4º Bimestre', 'Estrutura interna da Terra')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Estrutura interna da Terra'),
    (v_unidade_id, 'Rochas e minerais'),
    (v_unidade_id, 'Formação e tipos de solo'),
    (v_unidade_id, 'Recursos minerais'),
    (v_unidade_id, 'Uso sustentável dos recursos naturais'),
    (v_unidade_id, 'Estrutura da Terra e recursos minerais'),
    (v_unidade_id, 'Atmosfera terrestre'),
    (v_unidade_id, 'Clima e fatores climáticos'),
    (v_unidade_id, 'Fenômenos meteorológicos'),
    (v_unidade_id, 'Mudanças climáticas'),
    (v_unidade_id, 'Atmosfera e clima'),
    (v_unidade_id, 'Sistema Solar'),
    (v_unidade_id, 'Planetas e suas características'),
    (v_unidade_id, 'Movimentos da Terra e da Lua'),
    (v_unidade_id, 'Eclipses e marés'),
    (v_unidade_id, 'Sistema Solar e movimentos celestes'),
    (v_unidade_id, 'Exploração espacial'),
    (v_unidade_id, 'Avanços científicos e tecnológicos'),
    (v_unidade_id, 'Revisão geral dos conteúdos'),
    (v_unidade_id, 'Terra, Universo e tecnologia');

  -- 7º Ano | Educação Física | 1º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Finais (6° ao 9° ANO)' AND ano = '7º Ano' AND disciplina = 'Educação Física' AND bimestre = '1º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Finais (6° ao 9° ANO)', '7º Ano', 'Educação Física', '1º Bimestre', 'Apresentação da disciplina, regras de convivência e segurança')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Apresentação da disciplina, regras de convivência e segurança'),
    (v_unidade_id, 'Cultura corporal de movimento e sua importância social'),
    (v_unidade_id, 'Capacidades físicas força, resistência, velocidade e flexibilidade'),
    (v_unidade_id, 'Diagnóstica das habilidades motoras'),
    (v_unidade_id, 'Circuitos funcionais e coordenação motora'),
    (v_unidade_id, 'Capacidades físicas e coordenação motora'),
    (v_unidade_id, 'Jogos cooperativos e competitivos'),
    (v_unidade_id, 'Trabalho em equipe e liderança'),
    (v_unidade_id, 'Estratégias em jogos coletivos'),
    (v_unidade_id, 'Resolução de desafios motores em grupo'),
    (v_unidade_id, 'Cooperação e participação em jogos coletivos'),
    (v_unidade_id, 'Atletismo corridas de velocidade e resistência'),
    (v_unidade_id, 'Atletismo revezamento'),
    (v_unidade_id, 'Atletismo saltos (distância e altura adaptada)'),
    (v_unidade_id, 'Atletismo lançamentos adaptados'),
    (v_unidade_id, 'Fundamentos e práticas do atletismo'),
    (v_unidade_id, 'Saúde, atividade física e qualidade de vida'),
    (v_unidade_id, 'Postura corporal e prevenção de lesões'),
    (v_unidade_id, 'Alongamento e relaxamento muscular'),
    (v_unidade_id, 'Saúde, postura e hábitos saudáveis');

  -- 7º Ano | Educação Física | 2º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Finais (6° ao 9° ANO)' AND ano = '7º Ano' AND disciplina = 'Educação Física' AND bimestre = '2º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Finais (6° ao 9° ANO)', '7º Ano', 'Educação Física', '2º Bimestre', 'História e evolução do futsal')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'História e evolução do futsal'),
    (v_unidade_id, 'Fundamentos técnicos condução e domínio'),
    (v_unidade_id, 'Passe e recepção'),
    (v_unidade_id, 'Finalização e marcação'),
    (v_unidade_id, 'Jogos reduzidos de futsal'),
    (v_unidade_id, 'Fundamentos técnicos do futsal'),
    (v_unidade_id, 'Regras oficiais do futsal'),
    (v_unidade_id, 'Sistemas táticos básicos'),
    (v_unidade_id, 'Estratégias ofensivas e defensivas'),
    (v_unidade_id, 'Partidas orientadas'),
    (v_unidade_id, 'Aplicação das regras e táticas do futsal'),
    (v_unidade_id, 'Fundamentos do handebol'),
    (v_unidade_id, 'Passe, recepção e arremesso'),
    (v_unidade_id, 'Sistemas defensivos simples'),
    (v_unidade_id, 'Jogos adaptados de handebol'),
    (v_unidade_id, 'Fundamentos técnicos do handebol'),
    (v_unidade_id, 'Ética esportiva e fair play'),
    (v_unidade_id, 'Inclusão e respeito às diferenças'),
    (v_unidade_id, 'Esporte e cidadania'),
    (v_unidade_id, 'Ética, cidadania e respeito nas práticas esportivas');

  -- 7º Ano | Educação Física | 3º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Finais (6° ao 9° ANO)' AND ano = '7º Ano' AND disciplina = 'Educação Física' AND bimestre = '3º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Finais (6° ao 9° ANO)', '7º Ano', 'Educação Física', '3º Bimestre', 'História e fundamentos do voleibol')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'História e fundamentos do voleibol'),
    (v_unidade_id, 'Toque, manchete e saque'),
    (v_unidade_id, 'Rotação e posicionamento'),
    (v_unidade_id, 'Sistemas simples de jogo'),
    (v_unidade_id, 'Jogos adaptados de voleibol'),
    (v_unidade_id, 'Fundamentos técnicos do voleibol'),
    (v_unidade_id, 'História e fundamentos do basquetebol'),
    (v_unidade_id, 'Drible e controle de bola'),
    (v_unidade_id, 'Passe e recepção'),
    (v_unidade_id, 'Arremesso e bandeja'),
    (v_unidade_id, 'Fundamentos técnicos do basquetebol'),
    (v_unidade_id, 'Jogos pré-desportivos'),
    (v_unidade_id, 'Estratégias coletivas'),
    (v_unidade_id, 'Organização tática básica'),
    (v_unidade_id, 'Partidas orientadas'),
    (v_unidade_id, 'Estratégias e participação em jogos coletivos'),
    (v_unidade_id, 'Danças urbanas e contemporâneas'),
    (v_unidade_id, 'Ritmo e expressão corporal'),
    (v_unidade_id, 'Criação de coreografias em grupo'),
    (v_unidade_id, 'Dança, ritmo e expressão corporal');

  -- 7º Ano | Educação Física | 4º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Finais (6° ao 9° ANO)' AND ano = '7º Ano' AND disciplina = 'Educação Física' AND bimestre = '4º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Finais (6° ao 9° ANO)', '7º Ano', 'Educação Física', '4º Bimestre', 'Ginástica geral e condicionamento físico')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Ginástica geral e condicionamento físico'),
    (v_unidade_id, 'Exercícios de resistência muscular'),
    (v_unidade_id, 'Exercícios de flexibilidade e mobilidade'),
    (v_unidade_id, 'Circuitos funcionais'),
    (v_unidade_id, 'Planejamento de atividades físicas saudáveis'),
    (v_unidade_id, 'Condicionamento físico e saúde'),
    (v_unidade_id, 'Introdução às lutas conceitos e segurança'),
    (v_unidade_id, 'Jogos de oposição'),
    (v_unidade_id, 'Movimentos básicos das lutas'),
    (v_unidade_id, 'Respeito ao adversário e autocontrole'),
    (v_unidade_id, 'Práticas corporais de luta'),
    (v_unidade_id, 'Esportes alternativos e recreativos'),
    (v_unidade_id, 'Queimada, dodgeball e jogos adaptados'),
    (v_unidade_id, 'Jogos de aventura e desafios motores'),
    (v_unidade_id, 'Gincanas esportivas'),
    (v_unidade_id, 'Participação em esportes alternativos e recreativos'),
    (v_unidade_id, 'Revisão dos conteúdos do ano'),
    (v_unidade_id, 'Jogos integradores'),
    (v_unidade_id, 'Recreação orientada e socialização'),
    (v_unidade_id, 'Desenvolvimento global, participação e convivência social');

  -- 7º Ano | Ensino Religioso | 1º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Finais (6° ao 9° ANO)' AND ano = '7º Ano' AND disciplina = 'Ensino Religioso' AND bimestre = '1º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Finais (6° ao 9° ANO)', '7º Ano', 'Ensino Religioso', '1º Bimestre', 'O ser humano e a construção da identidade')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'O ser humano e a construção da identidade'),
    (v_unidade_id, 'Valores éticos e morais na sociedade'),
    (v_unidade_id, 'O respeito à dignidade humana'),
    (v_unidade_id, 'Direitos humanos e cidadania'),
    (v_unidade_id, 'A importância da convivência respeitosa'),
    (v_unidade_id, 'Identidade, ética e cidadania'),
    (v_unidade_id, 'Empatia e relações interpessoais'),
    (v_unidade_id, 'A amizade e os vínculos sociais'),
    (v_unidade_id, 'O diálogo na resolução de conflitos'),
    (v_unidade_id, 'A cultura da paz'),
    (v_unidade_id, 'Convivência e cultura da paz'),
    (v_unidade_id, 'Solidariedade e responsabilidade social'),
    (v_unidade_id, 'O papel da família na formação de valores'),
    (v_unidade_id, 'A influência dos grupos sociais'),
    (v_unidade_id, 'O respeito às diferenças individuais'),
    (v_unidade_id, 'Valores e responsabilidade social'),
    (v_unidade_id, 'Ética no cotidiano'),
    (v_unidade_id, 'Participação social e cidadania'),
    (v_unidade_id, 'Revisão dos conteúdos'),
    (v_unidade_id, 'Ética e convivência social');

  -- 7º Ano | Ensino Religioso | 2º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Finais (6° ao 9° ANO)' AND ano = '7º Ano' AND disciplina = 'Ensino Religioso' AND bimestre = '2º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Finais (6° ao 9° ANO)', '7º Ano', 'Ensino Religioso', '2º Bimestre', 'Cultura e diversidade religiosa')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Cultura e diversidade religiosa'),
    (v_unidade_id, 'As manifestações religiosas na sociedade'),
    (v_unidade_id, 'Religião e identidade cultural'),
    (v_unidade_id, 'Tradições religiosas brasileiras'),
    (v_unidade_id, 'Patrimônio cultural e religioso'),
    (v_unidade_id, 'Cultura e religiosidade'),
    (v_unidade_id, 'Símbolos e rituais religiosos'),
    (v_unidade_id, 'O significado dos ritos nas tradições religiosas'),
    (v_unidade_id, 'Festas religiosas e culturais'),
    (v_unidade_id, 'A importância das celebrações comunitárias'),
    (v_unidade_id, 'O respeito à diversidade cultural'),
    (v_unidade_id, 'O diálogo intercultural'),
    (v_unidade_id, 'Preconceito e discriminação cultural'),
    (v_unidade_id, 'A valorização das diferenças'),
    (v_unidade_id, 'Diversidade cultural e respeito'),
    (v_unidade_id, 'Religião, cultura e sociedade'),
    (v_unidade_id, 'Convivência em uma sociedade plural'),
    (v_unidade_id, 'Revisão dos conteúdos'),
    (v_unidade_id, 'Cultura, diversidade e cidadania');

  -- 7º Ano | Ensino Religioso | 3º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Finais (6° ao 9° ANO)' AND ano = '7º Ano' AND disciplina = 'Ensino Religioso' AND bimestre = '3º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Finais (6° ao 9° ANO)', '7º Ano', 'Ensino Religioso', '3º Bimestre', 'As grandes tradições religiosas do mundo')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'As grandes tradições religiosas do mundo'),
    (v_unidade_id, 'Religiões monoteístas e politeístas'),
    (v_unidade_id, 'Textos sagrados e suas funções'),
    (v_unidade_id, 'Espaços sagrados das diferentes tradições'),
    (v_unidade_id, 'A liberdade religiosa como direito humano'),
    (v_unidade_id, 'Tradições religiosas mundiais'),
    (v_unidade_id, 'O diálogo inter-religioso'),
    (v_unidade_id, 'Intolerância religiosa e suas consequências'),
    (v_unidade_id, 'O combate ao preconceito religioso'),
    (v_unidade_id, 'Respeito às crenças e convicções'),
    (v_unidade_id, 'Liberdade e tolerância religiosa'),
    (v_unidade_id, 'Valores comuns entre diferentes religiões'),
    (v_unidade_id, 'Religião e construção da paz'),
    (v_unidade_id, 'Espiritualidade e sentido da vida'),
    (v_unidade_id, 'Religião e ética'),
    (v_unidade_id, 'Valores e espiritualidade'),
    (v_unidade_id, 'Religião e transformação social'),
    (v_unidade_id, 'O papel das religiões na sociedade'),
    (v_unidade_id, 'Revisão dos conteúdos'),
    (v_unidade_id, 'Religião, ética e sociedade');

  -- 7º Ano | Ensino Religioso | 4º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Finais (6° ao 9° ANO)' AND ano = '7º Ano' AND disciplina = 'Ensino Religioso' AND bimestre = '4º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Finais (6° ao 9° ANO)', '7º Ano', 'Ensino Religioso', '4º Bimestre', 'Projeto de vida e construção da identidade')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Projeto de vida e construção da identidade'),
    (v_unidade_id, 'Sonhos, metas e planejamento pessoal'),
    (v_unidade_id, 'Autoconhecimento e responsabilidade'),
    (v_unidade_id, 'Escolhas e consequências'),
    (v_unidade_id, 'O sentido da vida e os valores humanos'),
    (v_unidade_id, 'Projeto de vida e identidade'),
    (v_unidade_id, 'Solidariedade e compromisso social'),
    (v_unidade_id, 'O respeito às diferenças sociais e culturais'),
    (v_unidade_id, 'Juventude e cidadania'),
    (v_unidade_id, 'Participação dos jovens na sociedade'),
    (v_unidade_id, 'Direitos e deveres do cidadão'),
    (v_unidade_id, 'O compromisso com o bem comum'),
    (v_unidade_id, 'Ética e responsabilidade coletiva'),
    (v_unidade_id, 'Construção de uma sociedade mais justa'),
    (v_unidade_id, 'Ética e responsabilidade social'),
    (v_unidade_id, 'Revisão dos conteúdos do ano'),
    (v_unidade_id, 'Reflexão sobre valores e atitudes'),
    (v_unidade_id, 'Atividade integradora dos conteúdos'),
    (v_unidade_id, 'Valores humanos para a vida em sociedade');

  -- 7º Ano | Espanhol | 1º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Finais (6° ao 9° ANO)' AND ano = '7º Ano' AND disciplina = 'Espanhol' AND bimestre = '1º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Finais (6° ao 9° ANO)', '7º Ano', 'Espanhol', '1º Bimestre', 'Revisão dos conteúdos básicos do 6º ano')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Revisão dos conteúdos básicos do 6º ano'),
    (v_unidade_id, 'Cumprimentos e apresentações formais e informais'),
    (v_unidade_id, 'Países e nacionalidades dos países hispânicos'),
    (v_unidade_id, 'Pronomes pessoais e tratamento formal'),
    (v_unidade_id, 'Verbo SER  usos e aplicações'),
    (v_unidade_id, 'Descrição física de pessoas'),
    (v_unidade_id, 'Características de personalidade'),
    (v_unidade_id, 'Produção oral apresentação de colegas'),
    (v_unidade_id, 'Cumprimentos, nacionalidades e apresentações pessoais'),
    (v_unidade_id, 'Família e relações familiares'),
    (v_unidade_id, 'Vocabulário da escola'),
    (v_unidade_id, 'Objetos escolares e materiais didáticos'),
    (v_unidade_id, 'Artigos e substantivos'),
    (v_unidade_id, 'Formação de frases afirmativas'),
    (v_unidade_id, 'Leitura e interpretação de textos simples'),
    (v_unidade_id, 'Família e vocabulário escolar'),
    (v_unidade_id, 'Produção textual sobre a família'),
    (v_unidade_id, 'Verbo SER e descrição de pessoas'),
    (v_unidade_id, 'Produção oral e escrita dos conteúdos estudados');

  -- 7º Ano | Espanhol | 2º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Finais (6° ao 9° ANO)' AND ano = '7º Ano' AND disciplina = 'Espanhol' AND bimestre = '2º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Finais (6° ao 9° ANO)', '7º Ano', 'Espanhol', '2º Bimestre', 'Verbo ESTAR  usos e diferenças em relação ao SER')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Verbo ESTAR  usos e diferenças em relação ao SER'),
    (v_unidade_id, 'Estados físicos e emocionais'),
    (v_unidade_id, 'Partes da casa'),
    (v_unidade_id, 'Cômodos e objetos domésticos'),
    (v_unidade_id, 'Preposições de lugar'),
    (v_unidade_id, 'Localização de pessoas e objetos'),
    (v_unidade_id, 'Rotina diária'),
    (v_unidade_id, 'Horários e atividades cotidianas'),
    (v_unidade_id, 'Verbo ESTAR e estados físicos/emocionais'),
    (v_unidade_id, 'Verbos de rotina'),
    (v_unidade_id, 'Dias da semana e meses do ano'),
    (v_unidade_id, 'Planejamento de atividades diárias'),
    (v_unidade_id, 'Produção textual sobre rotina'),
    (v_unidade_id, 'Compreensão auditiva'),
    (v_unidade_id, 'Diálogos sobre rotina diária'),
    (v_unidade_id, 'Casa, cômodos e preposições de lugar'),
    (v_unidade_id, 'Revisão dos conteúdos'),
    (v_unidade_id, 'Atividade prática de comunicação'),
    (v_unidade_id, 'Rotina diária e horários');

  -- 7º Ano | Espanhol | 3º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Finais (6° ao 9° ANO)' AND ano = '7º Ano' AND disciplina = 'Espanhol' AND bimestre = '3º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Finais (6° ao 9° ANO)', '7º Ano', 'Espanhol', '3º Bimestre', 'Alimentação e hábitos alimentares')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Alimentação e hábitos alimentares'),
    (v_unidade_id, 'Frutas, verduras e legumes'),
    (v_unidade_id, 'Refeições do dia'),
    (v_unidade_id, 'Verbo GUSTAR'),
    (v_unidade_id, 'Expressando gostos e preferências'),
    (v_unidade_id, 'Compras em mercados e feiras'),
    (v_unidade_id, 'Diálogos em restaurantes'),
    (v_unidade_id, 'Interpretação de cardápios'),
    (v_unidade_id, 'Alimentação e vocabulário de alimentos'),
    (v_unidade_id, 'Vestuário e acessórios'),
    (v_unidade_id, 'Cores e combinações'),
    (v_unidade_id, 'Descrição de roupas'),
    (v_unidade_id, 'Estações do ano'),
    (v_unidade_id, 'Clima e condições do tempo'),
    (v_unidade_id, 'Produção textual sobre preferências'),
    (v_unidade_id, 'Verbo GUSTAR e preferências pessoais'),
    (v_unidade_id, 'Revisão dos conteúdos'),
    (v_unidade_id, 'Atividade comunicativa'),
    (v_unidade_id, 'Vestuário, estações e clima'),
    (v_unidade_id, 'Produção oral e escrita dos conteúdos estudados');

  -- 7º Ano | Espanhol | 4º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Finais (6° ao 9° ANO)' AND ano = '7º Ano' AND disciplina = 'Espanhol' AND bimestre = '4º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Finais (6° ao 9° ANO)', '7º Ano', 'Espanhol', '4º Bimestre', 'Meios de transporte')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Meios de transporte'),
    (v_unidade_id, 'Localização e orientação na cidade'),
    (v_unidade_id, 'Lugares públicos'),
    (v_unidade_id, 'Pedindo e dando informações'),
    (v_unidade_id, 'Viagens e turismo'),
    (v_unidade_id, 'Países de língua espanhola'),
    (v_unidade_id, 'Aspectos culturais hispânicos'),
    (v_unidade_id, 'Festividades e tradições'),
    (v_unidade_id, 'Meios de transporte e orientação na cidade'),
    (v_unidade_id, 'Tecnologia e comunicação'),
    (v_unidade_id, 'Redes sociais e vocabulário digital'),
    (v_unidade_id, 'Leitura de textos informativos'),
    (v_unidade_id, 'Produção de diálogos'),
    (v_unidade_id, 'Compreensão oral'),
    (v_unidade_id, 'Projeto cultural sobre país hispânico'),
    (v_unidade_id, 'Cultura e países hispânicos'),
    (v_unidade_id, 'Revisão geral dos conteúdos anuais'),
    (v_unidade_id, 'Apresentação de projetos'),
    (v_unidade_id, 'Tecnologia e comunicação digital'),
    (v_unidade_id, 'Final integradora dos conteúdos do ano');

  -- 7º Ano | Geografia | 1º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Finais (6° ao 9° ANO)' AND ano = '7º Ano' AND disciplina = 'Geografia' AND bimestre = '1º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Finais (6° ao 9° ANO)', '7º Ano', 'Geografia', '1º Bimestre', 'A formação histórica do território brasileiro')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'A formação histórica do território brasileiro'),
    (v_unidade_id, 'Expansão territorial e ocupação do espaço'),
    (v_unidade_id, 'Tratados e limites territoriais'),
    (v_unidade_id, 'Organização político-administrativa do Brasil'),
    (v_unidade_id, 'Estados, municípios e Distrito Federal'),
    (v_unidade_id, 'Formação do território brasileiro'),
    (v_unidade_id, 'Regionalização do espaço brasileiro'),
    (v_unidade_id, 'Critérios de regionalização'),
    (v_unidade_id, 'As cinco regiões brasileiras'),
    (v_unidade_id, 'Características da Região Norte'),
    (v_unidade_id, 'Regionalização e Regiões Brasileiras'),
    (v_unidade_id, 'Características da Região Nordeste'),
    (v_unidade_id, 'Características da Região Centro-Oeste'),
    (v_unidade_id, 'Características da Região Sudeste'),
    (v_unidade_id, 'Características da Região Sul'),
    (v_unidade_id, 'Pesquisa sobre uma região brasileira'),
    (v_unidade_id, 'Integração nacional e redes de transporte'),
    (v_unidade_id, 'Infraestrutura e circulação'),
    (v_unidade_id, 'Revisão dos conteúdos'),
    (v_unidade_id, 'Seminário sobre as regiões do Brasil');

  -- 7º Ano | Geografia | 2º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Finais (6° ao 9° ANO)' AND ano = '7º Ano' AND disciplina = 'Geografia' AND bimestre = '2º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Finais (6° ao 9° ANO)', '7º Ano', 'Geografia', '2º Bimestre', 'Estruturas geológicas do Brasil')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Estruturas geológicas do Brasil'),
    (v_unidade_id, 'Relevo brasileiro'),
    (v_unidade_id, 'Planaltos, planícies e depressões'),
    (v_unidade_id, 'Agentes de transformação do relevo'),
    (v_unidade_id, 'Relevo e estruturas geológicas'),
    (v_unidade_id, 'Hidrografia brasileira'),
    (v_unidade_id, 'Bacias hidrográficas'),
    (v_unidade_id, 'Recursos hídricos e abastecimento'),
    (v_unidade_id, 'Uso sustentável da água'),
    (v_unidade_id, 'Hidrografia e recursos hídricos'),
    (v_unidade_id, 'Climas do Brasil'),
    (v_unidade_id, 'Fatores climáticos'),
    (v_unidade_id, 'Massas de ar e influência climática'),
    (v_unidade_id, 'Mudanças climáticas'),
    (v_unidade_id, 'Climas brasileiros'),
    (v_unidade_id, 'Vegetação e biomas brasileiros'),
    (v_unidade_id, 'Amazônia, Cerrado, Caatinga, Mata Atlântica, Pantanal e Pampa'),
    (v_unidade_id, 'Conservação dos biomas'),
    (v_unidade_id, 'Revisão dos conteúdos'),
    (v_unidade_id, 'Projeto sobre os biomas brasileiros');

  -- 7º Ano | Geografia | 3º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Finais (6° ao 9° ANO)' AND ano = '7º Ano' AND disciplina = 'Geografia' AND bimestre = '3º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Finais (6° ao 9° ANO)', '7º Ano', 'Geografia', '3º Bimestre', 'Conteúdo')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Conteúdo'),
    (v_unidade_id, 'Crescimento da população brasileira'),
    (v_unidade_id, 'Estrutura etária da população'),
    (v_unidade_id, 'Indicadores demográficos'),
    (v_unidade_id, 'Distribuição da população no território'),
    (v_unidade_id, 'População e indicadores demográficos'),
    (v_unidade_id, 'Migrações internas'),
    (v_unidade_id, 'Migrações internacionais'),
    (v_unidade_id, 'Formação multicultural da população brasileira'),
    (v_unidade_id, 'Diversidade étnica e cultural'),
    (v_unidade_id, 'Migrações e diversidade cultural'),
    (v_unidade_id, 'Processo de urbanização no Brasil'),
    (v_unidade_id, 'Crescimento das cidades'),
    (v_unidade_id, 'Metrópoles e regiões metropolitanas'),
    (v_unidade_id, 'Rede urbana brasileira'),
    (v_unidade_id, 'Urbanização e rede urbana'),
    (v_unidade_id, 'Problemas urbanos'),
    (v_unidade_id, 'Mobilidade urbana'),
    (v_unidade_id, 'Qualidade de vida nas cidades'),
    (v_unidade_id, 'Revisão dos conteúdos');

  -- 7º Ano | Geografia | 4º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Finais (6° ao 9° ANO)' AND ano = '7º Ano' AND disciplina = 'Geografia' AND bimestre = '4º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Finais (6° ao 9° ANO)', '7º Ano', 'Geografia', '4º Bimestre', 'Atividades econômicas e organização do espaço')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Atividades econômicas e organização do espaço'),
    (v_unidade_id, 'Setor primário da economia'),
    (v_unidade_id, 'Agricultura brasileira'),
    (v_unidade_id, 'Pecuária e extrativismo'),
    (v_unidade_id, 'Agropecuária e extrativismo'),
    (v_unidade_id, 'Modernização do campo'),
    (v_unidade_id, 'Agronegócio e agricultura familiar'),
    (v_unidade_id, 'Questão fundiária no Brasil'),
    (v_unidade_id, 'Sustentabilidade no meio rural'),
    (v_unidade_id, 'Agricultura familiar e agronegócio'),
    (v_unidade_id, 'Industrialização brasileira'),
    (v_unidade_id, 'Principais polos industriais'),
    (v_unidade_id, 'Comércio e setor de serviços'),
    (v_unidade_id, 'Tecnologia e inovação econômica'),
    (v_unidade_id, 'Industrialização e desenvolvimento econômico'),
    (v_unidade_id, 'Globalização e economia brasileira'),
    (v_unidade_id, 'Desigualdades regionais'),
    (v_unidade_id, 'Desenvolvimento sustentável'),
    (v_unidade_id, 'Revisão geral dos conteúdos'),
    (v_unidade_id, 'Seminário sobre economia e desenvolvimento sustentável');

  -- 7º Ano | História | 1º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Finais (6° ao 9° ANO)' AND ano = '7º Ano' AND disciplina = 'História' AND bimestre = '1º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Finais (6° ao 9° ANO)', '7º Ano', 'História', '1º Bimestre', 'A transição da Idade Média para a Idade Moderna')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'A transição da Idade Média para a Idade Moderna'),
    (v_unidade_id, 'O Renascimento Cultural e Científico'),
    (v_unidade_id, 'Humanismo e novas formas de pensar'),
    (v_unidade_id, 'Grandes artistas e cientistas renascentistas'),
    (v_unidade_id, 'Renascimento Cultural e Humanismo'),
    (v_unidade_id, 'A formação dos Estados Nacionais Modernos'),
    (v_unidade_id, 'O Absolutismo Monárquico'),
    (v_unidade_id, 'Teóricos do absolutismo'),
    (v_unidade_id, 'O fortalecimento das monarquias europeias'),
    (v_unidade_id, 'Estados Nacionais e Absolutismo'),
    (v_unidade_id, 'A expansão marítima europeia'),
    (v_unidade_id, 'Navegações portuguesas e espanholas'),
    (v_unidade_id, 'Avanços tecnológicos das navegações'),
    (v_unidade_id, 'Consequências das Grandes Navegações'),
    (v_unidade_id, 'Expansão Marítima Europeia'),
    (v_unidade_id, 'O encontro entre europeus, africanos e indígenas'),
    (v_unidade_id, 'A chegada dos portugueses à América'),
    (v_unidade_id, 'Impactos da conquista para os povos indígenas'),
    (v_unidade_id, 'Revisão dos conteúdos estudados'),
    (v_unidade_id, 'Expansão Europeia e chegada à América');

  -- 7º Ano | História | 2º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Finais (6° ao 9° ANO)' AND ano = '7º Ano' AND disciplina = 'História' AND bimestre = '2º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Finais (6° ao 9° ANO)', '7º Ano', 'História', '2º Bimestre', 'A Reforma Protestante')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'A Reforma Protestante'),
    (v_unidade_id, 'Martinho Lutero e o Luteranismo'),
    (v_unidade_id, 'Calvinismo e Anglicanismo'),
    (v_unidade_id, 'Consequências da Reforma Religiosa'),
    (v_unidade_id, 'Reforma Protestante'),
    (v_unidade_id, 'A Contrarreforma Católica'),
    (v_unidade_id, 'O Concílio de Trento'),
    (v_unidade_id, 'A Companhia de Jesus'),
    (v_unidade_id, 'Disputas religiosas na Europa'),
    (v_unidade_id, 'Contrarreforma Católica'),
    (v_unidade_id, 'A colonização portuguesa na América'),
    (v_unidade_id, 'Capitanias hereditárias e Governo-Geral'),
    (v_unidade_id, 'A economia açucareira'),
    (v_unidade_id, 'Sociedade colonial brasileira'),
    (v_unidade_id, 'Início da Colonização do Brasil'),
    (v_unidade_id, 'Povos indígenas e resistência'),
    (v_unidade_id, 'Escravidão africana no Brasil'),
    (v_unidade_id, 'Cultura afro-brasileira'),
    (v_unidade_id, 'Quilombos e formas de resistência'),
    (v_unidade_id, 'Povos indígenas, africanos e resistência');

  -- 7º Ano | História | 3º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Finais (6° ao 9° ANO)' AND ano = '7º Ano' AND disciplina = 'História' AND bimestre = '3º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Finais (6° ao 9° ANO)', '7º Ano', 'História', '3º Bimestre', 'A mineração no Brasil Colonial')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'A mineração no Brasil Colonial'),
    (v_unidade_id, 'A sociedade mineradora'),
    (v_unidade_id, 'Urbanização e desenvolvimento econômico'),
    (v_unidade_id, 'Controle metropolitano e impostos'),
    (v_unidade_id, 'Mineração no Brasil Colonial'),
    (v_unidade_id, 'Revoltas coloniais e movimentos nativistas'),
    (v_unidade_id, 'A Guerra dos Emboabas'),
    (v_unidade_id, 'A Guerra dos Mascates'),
    (v_unidade_id, 'A Revolta de Vila Rica'),
    (v_unidade_id, 'Revoltas Coloniais'),
    (v_unidade_id, 'O Iluminismo'),
    (v_unidade_id, 'Principais pensadores iluministas'),
    (v_unidade_id, 'Ideias de liberdade e igualdade'),
    (v_unidade_id, 'Influências do Iluminismo na América'),
    (v_unidade_id, 'Iluminismo'),
    (v_unidade_id, 'A Independência dos Estados Unidos'),
    (v_unidade_id, 'A Revolução Industrial'),
    (v_unidade_id, 'Transformações econômicas e sociais'),
    (v_unidade_id, 'Revisão dos conteúdos estudados'),
    (v_unidade_id, 'Revolução Industrial e Independência dos EUA');

  -- 7º Ano | História | 4º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Finais (6° ao 9° ANO)' AND ano = '7º Ano' AND disciplina = 'História' AND bimestre = '4º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Finais (6° ao 9° ANO)', '7º Ano', 'História', '4º Bimestre', 'A Revolução Francesa causas e contexto')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'A Revolução Francesa causas e contexto'),
    (v_unidade_id, 'As fases da Revolução Francesa'),
    (v_unidade_id, 'A Declaração dos Direitos do Homem e do Cidadão'),
    (v_unidade_id, 'Consequências da Revolução Francesa'),
    (v_unidade_id, 'Revolução Francesa'),
    (v_unidade_id, 'A Era Napoleônica'),
    (v_unidade_id, 'O governo de Napoleão Bonaparte'),
    (v_unidade_id, 'O Bloqueio Continental'),
    (v_unidade_id, 'A queda de Napoleão'),
    (v_unidade_id, 'Era Napoleônica'),
    (v_unidade_id, 'A transferência da Corte Portuguesa para o Brasil'),
    (v_unidade_id, 'Mudanças políticas e econômicas no Brasil'),
    (v_unidade_id, 'O processo de Independência do Brasil'),
    (v_unidade_id, 'O Grito do Ipiranga e seus desdobramentos'),
    (v_unidade_id, 'Independência do Brasil'),
    (v_unidade_id, 'O Primeiro Reinado'),
    (v_unidade_id, 'A Constituição de 8'),
    (v_unidade_id, 'Crises políticas do Primeiro Reinado'),
    (v_unidade_id, 'Revisão geral dos conteúdos do ano'),
    (v_unidade_id, 'Brasil no início do século XIX');

  -- 7º Ano | Matemática | 1º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Finais (6° ao 9° ANO)' AND ano = '7º Ano' AND disciplina = 'Matemática' AND bimestre = '1º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Finais (6° ao 9° ANO)', '7º Ano', 'Matemática', '1º Bimestre', 'Apresentação da disciplina e  diagnóstica')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Apresentação da disciplina e  diagnóstica'),
    (v_unidade_id, 'Conjunto dos números inteiros'),
    (v_unidade_id, 'Representação dos números inteiros na reta numérica'),
    (v_unidade_id, 'Comparação e ordenação de números inteiros'),
    (v_unidade_id, 'Números inteiros e reta numérica'),
    (v_unidade_id, 'Adição de números inteiros'),
    (v_unidade_id, 'Subtração de números inteiros'),
    (v_unidade_id, 'Multiplicação de números inteiros'),
    (v_unidade_id, 'Divisão de números inteiros'),
    (v_unidade_id, 'Operações com números inteiros'),
    (v_unidade_id, 'Potenciação de números inteiros'),
    (v_unidade_id, 'Expressões numéricas'),
    (v_unidade_id, 'Resolução de problemas envolvendo números inteiros'),
    (v_unidade_id, 'Introdução aos números racionais'),
    (v_unidade_id, 'Potenciação e expressões numéricas'),
    (v_unidade_id, 'Frações e números racionais'),
    (v_unidade_id, 'Comparação de números racionais'),
    (v_unidade_id, 'Problemas envolvendo números racionais'),
    (v_unidade_id, 'Revisão dos conteúdos'),
    (v_unidade_id, 'Números racionais e situações-problema');

  -- 7º Ano | Matemática | 2º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Finais (6° ao 9° ANO)' AND ano = '7º Ano' AND disciplina = 'Matemática' AND bimestre = '2º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Finais (6° ao 9° ANO)', '7º Ano', 'Matemática', '2º Bimestre', 'Revisão de frações')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Revisão de frações'),
    (v_unidade_id, 'Adição e subtração de frações'),
    (v_unidade_id, 'Multiplicação de frações'),
    (v_unidade_id, 'Divisão de frações'),
    (v_unidade_id, 'Operações com frações'),
    (v_unidade_id, 'Números decimais'),
    (v_unidade_id, 'Operações com números decimais'),
    (v_unidade_id, 'Transformação entre frações e decimais'),
    (v_unidade_id, 'Problemas envolvendo números decimais'),
    (v_unidade_id, 'Números decimais e operações'),
    (v_unidade_id, 'Linguagem algébrica'),
    (v_unidade_id, 'Expressões algébricas'),
    (v_unidade_id, 'Valor numérico de expressões'),
    (v_unidade_id, 'Simplificação de expressões algébricas'),
    (v_unidade_id, 'Linguagem e expressões algébricas'),
    (v_unidade_id, 'Equações do º grau'),
    (v_unidade_id, 'Resolução de equações simples'),
    (v_unidade_id, 'Problemas envolvendo equações'),
    (v_unidade_id, 'Revisão dos conteúdos');

  -- 7º Ano | Matemática | 3º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Finais (6° ao 9° ANO)' AND ano = '7º Ano' AND disciplina = 'Matemática' AND bimestre = '3º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Finais (6° ao 9° ANO)', '7º Ano', 'Matemática', '3º Bimestre', 'Conceitos básicos da geometria')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Conceitos básicos da geometria'),
    (v_unidade_id, 'Ângulos e suas classificações'),
    (v_unidade_id, 'Medidas de ângulos'),
    (v_unidade_id, 'Uso do transferidor'),
    (v_unidade_id, 'Ângulos e medidas angulares'),
    (v_unidade_id, 'Triângulos classificação'),
    (v_unidade_id, 'Soma dos ângulos internos dos triângulos'),
    (v_unidade_id, 'Quadriláteros'),
    (v_unidade_id, 'Polígonos'),
    (v_unidade_id, 'Triângulos e polígonos'),
    (v_unidade_id, 'Perímetro de figuras planas'),
    (v_unidade_id, 'Área de quadrados e retângulos'),
    (v_unidade_id, 'Área de triângulos'),
    (v_unidade_id, 'Área de paralelogramos e trapézios'),
    (v_unidade_id, 'Área e perímetro de figuras planas'),
    (v_unidade_id, 'Medidas de comprimento'),
    (v_unidade_id, 'Medidas de área'),
    (v_unidade_id, 'Medidas de volume'),
    (v_unidade_id, 'Revisão dos conteúdos'),
    (v_unidade_id, 'Grandezas e medidas');

  -- 7º Ano | Matemática | 4º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Finais (6° ao 9° ANO)' AND ano = '7º Ano' AND disciplina = 'Matemática' AND bimestre = '4º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Finais (6° ao 9° ANO)', '7º Ano', 'Matemática', '4º Bimestre', 'Razão e proporção')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Razão e proporção'),
    (v_unidade_id, 'Grandezas proporcionais'),
    (v_unidade_id, 'Regra de três simples'),
    (v_unidade_id, 'Aplicações da proporcionalidade'),
    (v_unidade_id, 'Razão, proporção e regra de três'),
    (v_unidade_id, 'Porcentagem'),
    (v_unidade_id, 'Cálculo de porcentagens'),
    (v_unidade_id, 'Problemas envolvendo porcentagem'),
    (v_unidade_id, 'Juros simples (introdução)'),
    (v_unidade_id, 'Porcentagem e aplicações financeiras'),
    (v_unidade_id, 'Coleta e organização de dados'),
    (v_unidade_id, 'Tabelas e gráficos'),
    (v_unidade_id, 'Média aritmética'),
    (v_unidade_id, 'Interpretação de dados estatísticos'),
    (v_unidade_id, 'Estatística e interpretação de gráficos'),
    (v_unidade_id, 'Introdução à probabilidade'),
    (v_unidade_id, 'Experimentos aleatórios'),
    (v_unidade_id, 'Probabilidade em situações cotidianas'),
    (v_unidade_id, 'Revisão geral dos conteúdos do ano'),
    (v_unidade_id, 'Final dos conteúdos do ano');

  -- 7º Ano | Português | 1º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Finais (6° ao 9° ANO)' AND ano = '7º Ano' AND disciplina = 'Português' AND bimestre = '1º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Finais (6° ao 9° ANO)', '7º Ano', 'Português', '1º Bimestre', 'Apresentação da disciplina e  diagnóstica')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Apresentação da disciplina e  diagnóstica'),
    (v_unidade_id, 'Estratégias de leitura e interpretação textual'),
    (v_unidade_id, 'Tema, assunto e finalidade dos textos'),
    (v_unidade_id, 'Informações explícitas e implícitas'),
    (v_unidade_id, 'Interpretação e compreensão textual'),
    (v_unidade_id, 'Linguagem verbal, não verbal e mista'),
    (v_unidade_id, 'Variação linguística e preconceito linguístico'),
    (v_unidade_id, 'Linguagem formal e informal'),
    (v_unidade_id, 'Funções da linguagem (introdução)'),
    (v_unidade_id, 'Variação linguística e usos da linguagem'),
    (v_unidade_id, 'Ortografia oficial'),
    (v_unidade_id, 'Acentuação gráfica'),
    (v_unidade_id, 'Pontuação e efeitos de sentido'),
    (v_unidade_id, 'Ampliação vocabular e uso do dicionário'),
    (v_unidade_id, 'Ortografia, acentuação e pontuação'),
    (v_unidade_id, 'Produção de texto descritivo'),
    (v_unidade_id, 'Coesão textual'),
    (v_unidade_id, 'Coerência textual'),
    (v_unidade_id, 'Revisão dos conteúdos');

  -- 7º Ano | Português | 2º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Finais (6° ao 9° ANO)' AND ano = '7º Ano' AND disciplina = 'Português' AND bimestre = '2º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Finais (6° ao 9° ANO)', '7º Ano', 'Português', '2º Bimestre', 'Contos populares e contemporâneos')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Contos populares e contemporâneos'),
    (v_unidade_id, 'Elementos da narrativa'),
    (v_unidade_id, 'Narrador, personagens, tempo e espaço'),
    (v_unidade_id, 'Enredo e conflito'),
    (v_unidade_id, 'Interpretação de conto'),
    (v_unidade_id, 'Crônicas'),
    (v_unidade_id, 'Características da crônica'),
    (v_unidade_id, 'Leitura e análise de crônicas'),
    (v_unidade_id, 'Produção de crônicas'),
    (v_unidade_id, 'Produção de crônica'),
    (v_unidade_id, 'Lendas e mitos'),
    (v_unidade_id, 'Literatura popular brasileira'),
    (v_unidade_id, 'Diferenças entre mito, lenda e conto'),
    (v_unidade_id, 'Interpretação literária'),
    (v_unidade_id, 'Mitos e lendas'),
    (v_unidade_id, 'Histórias em quadrinhos'),
    (v_unidade_id, 'Linguagem verbal e visual'),
    (v_unidade_id, 'Produção de HQ'),
    (v_unidade_id, 'Revisão dos conteúdos'),
    (v_unidade_id, 'Produção de história em quadrinhos');

  -- 7º Ano | Português | 3º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Finais (6° ao 9° ANO)' AND ano = '7º Ano' AND disciplina = 'Português' AND bimestre = '3º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Finais (6° ao 9° ANO)', '7º Ano', 'Português', '3º Bimestre', 'Classes gramaticais revisão')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Classes gramaticais revisão'),
    (v_unidade_id, 'Substantivos e adjetivos'),
    (v_unidade_id, 'Artigos e numerais'),
    (v_unidade_id, 'Pronomes'),
    (v_unidade_id, 'Classes gramaticais nominais'),
    (v_unidade_id, 'Verbos estrutura e flexão'),
    (v_unidade_id, 'Tempos e modos verbais'),
    (v_unidade_id, 'Verbos regulares e irregulares'),
    (v_unidade_id, 'Emprego verbal'),
    (v_unidade_id, 'Verbos e tempos verbais'),
    (v_unidade_id, 'Advérbios e locuções adverbiais'),
    (v_unidade_id, 'Preposições'),
    (v_unidade_id, 'Conjunções'),
    (v_unidade_id, 'Relações de sentido entre orações'),
    (v_unidade_id, 'Advérbios, preposições e conjunções'),
    (v_unidade_id, 'Concordância verbal'),
    (v_unidade_id, 'Concordância nominal'),
    (v_unidade_id, 'Revisão gramatical'),
    (v_unidade_id, 'Exercícios de aplicação'),
    (v_unidade_id, 'Concordância verbal e nominal');

  -- 7º Ano | Português | 4º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Finais (6° ao 9° ANO)' AND ano = '7º Ano' AND disciplina = 'Português' AND bimestre = '4º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Finais (6° ao 9° ANO)', '7º Ano', 'Português', '4º Bimestre', 'Texto informativo')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Texto informativo'),
    (v_unidade_id, 'Notícia e reportagem'),
    (v_unidade_id, 'Estrutura dos textos jornalísticos'),
    (v_unidade_id, 'Linguagem jornalística'),
    (v_unidade_id, 'Interpretação de notícia e reportagem'),
    (v_unidade_id, 'Resumo e síntese textual'),
    (v_unidade_id, 'Identificação das ideias principais'),
    (v_unidade_id, 'Produção de resumos'),
    (v_unidade_id, 'Técnicas de síntese'),
    (v_unidade_id, 'Produção de resumo'),
    (v_unidade_id, 'Poemas e poesia'),
    (v_unidade_id, 'Figuras de linguagem'),
    (v_unidade_id, 'Versificação, ritmo e musicalidade'),
    (v_unidade_id, 'Interpretação poética'),
    (v_unidade_id, 'Interpretação de poema e figuras de linguagem'),
    (v_unidade_id, 'Produção de texto argumentativo (introdução)'),
    (v_unidade_id, 'Organização de argumentos'),
    (v_unidade_id, 'Revisão geral dos conteúdos'),
    (v_unidade_id, 'Produção textual final'),
    (v_unidade_id, 'Produção de texto argumentativo');

  -- 3º Ano | Geografia | 1º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '3º Ano' AND disciplina = 'Geografia' AND bimestre = '1º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '3º Ano', 'Geografia', '1º Bimestre', 'Introdução ao estudo da Geografia')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Introdução ao estudo da Geografia'),
    (v_unidade_id, 'O espaço geográfico e o cotidiano'),
    (v_unidade_id, 'O município onde vivemos'),
    (v_unidade_id, 'Características da comunidade local'),
    (v_unidade_id, 'Organização dos espaços urbanos e rurais'),
    (v_unidade_id, 'Identificação das características da comunidade'),
    (v_unidade_id, 'A história do bairro'),
    (v_unidade_id, 'Serviços públicos essenciais'),
    (v_unidade_id, 'Direitos e deveres do cidadão'),
    (v_unidade_id, 'O papel da prefeitura no município'),
    (v_unidade_id, 'Pesquisa sobre serviços públicos da comunidade'),
    (v_unidade_id, 'O trabalho das pessoas na cidade e no campo'),
    (v_unidade_id, 'Profissões e atividades econômicas'),
    (v_unidade_id, 'Relações entre campo e cidade'),
    (v_unidade_id, 'Produção e consumo de bens'),
    (v_unidade_id, 'Atividade sobre profissões e economia local'),
    (v_unidade_id, 'Problemas e desafios da comunidade'),
    (v_unidade_id, 'Soluções para melhorar os espaços coletivos'),
    (v_unidade_id, 'Revisão dos conteúdos'),
    (v_unidade_id, 'Produção de texto sobre o lugar onde vivo');

  -- 3º Ano | Geografia | 2º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '3º Ano' AND disciplina = 'Geografia' AND bimestre = '2º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '3º Ano', 'Geografia', '2º Bimestre', 'O conceito de paisagem')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'O conceito de paisagem'),
    (v_unidade_id, 'Elementos naturais da paisagem'),
    (v_unidade_id, 'Elementos culturais da paisagem'),
    (v_unidade_id, 'Observação e descrição de paisagens'),
    (v_unidade_id, 'Identificação dos elementos da paisagem'),
    (v_unidade_id, 'Transformações das paisagens ao longo do tempo'),
    (v_unidade_id, 'A ação humana no ambiente'),
    (v_unidade_id, 'Crescimento urbano e mudanças ambientais'),
    (v_unidade_id, 'Preservação das paisagens naturais'),
    (v_unidade_id, 'Comparação entre paisagens antigas e atuais'),
    (v_unidade_id, 'Paisagens urbanas'),
    (v_unidade_id, 'Paisagens rurais'),
    (v_unidade_id, 'Diferenças entre campo e cidade'),
    (v_unidade_id, 'Integração entre espaços urbanos e rurais'),
    (v_unidade_id, 'Produção de painel sobre campo e cidade'),
    (v_unidade_id, 'Patrimônio cultural e natural'),
    (v_unidade_id, 'Monumentos e espaços históricos'),
    (v_unidade_id, 'Valorização do patrimônio local'),
    (v_unidade_id, 'Revisão dos conteúdos'),
    (v_unidade_id, 'Pesquisa sobre patrimônio cultural da comunidade');

  -- 3º Ano | Geografia | 3º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '3º Ano' AND disciplina = 'Geografia' AND bimestre = '3º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '3º Ano', 'Geografia', '3º Bimestre', 'Recursos naturais e sua importância')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Recursos naturais e sua importância'),
    (v_unidade_id, 'A água como recurso essencial'),
    (v_unidade_id, 'Uso consciente da água'),
    (v_unidade_id, 'Bacias hidrográficas e rios locais'),
    (v_unidade_id, 'Atividade sobre preservação da água'),
    (v_unidade_id, 'O solo e sua utilização'),
    (v_unidade_id, 'Conservação do solo'),
    (v_unidade_id, 'Vegetação e biodiversidade'),
    (v_unidade_id, 'A importância das florestas'),
    (v_unidade_id, 'Pesquisa sobre a vegetação da região'),
    (v_unidade_id, 'Tempo atmosférico e clima'),
    (v_unidade_id, 'Fatores climáticos'),
    (v_unidade_id, 'As estações do ano'),
    (v_unidade_id, 'Influência do clima na vida das pessoas'),
    (v_unidade_id, 'Produção sobre clima e estações do ano'),
    (v_unidade_id, 'Problemas ambientais'),
    (v_unidade_id, 'Poluição e seus impactos'),
    (v_unidade_id, 'Sustentabilidade e reciclagem'),
    (v_unidade_id, 'Atitudes de preservação ambiental'),
    (v_unidade_id, 'Projeto de conscientização ambiental');

  -- 3º Ano | Geografia | 4º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '3º Ano' AND disciplina = 'Geografia' AND bimestre = '4º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '3º Ano', 'Geografia', '4º Bimestre', 'Formas de representar os espaços')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Formas de representar os espaços'),
    (v_unidade_id, 'Croquis e mapas'),
    (v_unidade_id, 'Elementos do mapa'),
    (v_unidade_id, 'Título, legenda e símbolos'),
    (v_unidade_id, 'Interpretação de mapas simples'),
    (v_unidade_id, 'Orientação espacial'),
    (v_unidade_id, 'Pontos cardeais'),
    (v_unidade_id, 'Localização e deslocamento'),
    (v_unidade_id, 'Uso de referências espaciais'),
    (v_unidade_id, 'Exercícios com pontos cardeais'),
    (v_unidade_id, 'Leitura de mapas do município'),
    (v_unidade_id, 'Representação do bairro'),
    (v_unidade_id, 'Representação da escola'),
    (v_unidade_id, 'Escalas simples e proporções'),
    (v_unidade_id, 'Elaboração de croqui do bairro'),
    (v_unidade_id, 'Revisão dos conteúdos cartográficos'),
    (v_unidade_id, 'Jogos e atividades de localização'),
    (v_unidade_id, 'Produção de mapa ilustrado'),
    (v_unidade_id, 'Organização do portfólio geográfico'),
    (v_unidade_id, 'Portfólio de representações cartográficas');

  -- 3º Ano | História | 1º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '3º Ano' AND disciplina = 'História' AND bimestre = '1º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '3º Ano', 'História', '1º Bimestre', 'A história pessoal e a construção da identidade')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'A história pessoal e a construção da identidade'),
    (v_unidade_id, 'Minha trajetória de vida'),
    (v_unidade_id, 'A família como grupo social'),
    (v_unidade_id, 'Diferentes composições familiares'),
    (v_unidade_id, ' Identidade e família'),
    (v_unidade_id, 'A escola como espaço de convivência'),
    (v_unidade_id, 'A história da escola'),
    (v_unidade_id, 'Direitos e deveres na escola'),
    (v_unidade_id, 'Regras de convivência e cidadania'),
    (v_unidade_id, ' Escola e cidadania'),
    (v_unidade_id, 'O bairro onde vivemos'),
    (v_unidade_id, 'Transformações no bairro ao longo do tempo'),
    (v_unidade_id, 'Serviços públicos da comunidade'),
    (v_unidade_id, 'Participação social na comunidade'),
    (v_unidade_id, ' Bairro e comunidade'),
    (v_unidade_id, 'O tempo histórico'),
    (v_unidade_id, 'Passado, presente e futuro'),
    (v_unidade_id, 'Mudanças e permanências'),
    (v_unidade_id, 'A importância das memórias'),
    (v_unidade_id, ' Tempo histórico e memórias');

  -- 3º Ano | História | 2º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '3º Ano' AND disciplina = 'História' AND bimestre = '2º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '3º Ano', 'História', '2º Bimestre', 'Fontes históricas o que são?')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Fontes históricas o que são?'),
    (v_unidade_id, 'Fotografias como documentos históricos'),
    (v_unidade_id, 'Objetos e documentos antigos'),
    (v_unidade_id, 'História oral e relatos familiares'),
    (v_unidade_id, ' Fontes históricas'),
    (v_unidade_id, 'As tradições familiares'),
    (v_unidade_id, 'Costumes e hábitos culturais'),
    (v_unidade_id, 'Festas populares brasileiras'),
    (v_unidade_id, 'Cultura e identidade'),
    (v_unidade_id, ' Tradições e cultura'),
    (v_unidade_id, 'Povos que formaram o Brasil'),
    (v_unidade_id, 'Povos indígenas e sua história'),
    (v_unidade_id, 'Africanos e afro-brasileiros'),
    (v_unidade_id, 'Imigrantes no Brasil'),
    (v_unidade_id, ' Formação do povo brasileiro'),
    (v_unidade_id, 'Diversidade cultural brasileira'),
    (v_unidade_id, 'Respeito às diferenças'),
    (v_unidade_id, 'Cultura local e regional'),
    (v_unidade_id, 'Valorização da diversidade'),
    (v_unidade_id, ' Diversidade cultural');

  -- 3º Ano | História | 3º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '3º Ano' AND disciplina = 'História' AND bimestre = '3º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '3º Ano', 'História', '3º Bimestre', 'O trabalho ao longo da história')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'O trabalho ao longo da história'),
    (v_unidade_id, 'Profissões antigas e atuais'),
    (v_unidade_id, 'O trabalho na comunidade'),
    (v_unidade_id, 'Direitos dos trabalhadores'),
    (v_unidade_id, ' Trabalho e profissões'),
    (v_unidade_id, 'Os meios de transporte no passado'),
    (v_unidade_id, 'Os meios de transporte na atualidade'),
    (v_unidade_id, 'A evolução dos transportes'),
    (v_unidade_id, 'Impactos dos transportes na sociedade'),
    (v_unidade_id, ' Transportes ao longo do tempo'),
    (v_unidade_id, 'Meios de comunicação antigos'),
    (v_unidade_id, 'Meios de comunicação modernos'),
    (v_unidade_id, 'A tecnologia e a comunicação'),
    (v_unidade_id, 'O uso consciente da tecnologia'),
    (v_unidade_id, ' Comunicação e tecnologia'),
    (v_unidade_id, 'Invenções que mudaram a sociedade'),
    (v_unidade_id, 'Transformações na vida cotidiana'),
    (v_unidade_id, 'Mudanças e permanências na sociedade'),
    (v_unidade_id, 'Comparações entre diferentes épocas'),
    (v_unidade_id, ' Transformações históricas');

  -- 3º Ano | História | 4º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '3º Ano' AND disciplina = 'História' AND bimestre = '4º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '3º Ano', 'História', '4º Bimestre', 'A história do município')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'A história do município'),
    (v_unidade_id, 'Fundação e desenvolvimento da cidade'),
    (v_unidade_id, 'Patrimônio histórico local'),
    (v_unidade_id, 'Preservação da memória da comunidade'),
    (v_unidade_id, ' História do município'),
    (v_unidade_id, 'Povos indígenas do Brasil'),
    (v_unidade_id, 'Modos de vida indígenas'),
    (v_unidade_id, 'Contribuições indígenas para a sociedade'),
    (v_unidade_id, 'Respeito aos povos originários'),
    (v_unidade_id, ' Povos indígenas'),
    (v_unidade_id, 'Cultura afro-brasileira'),
    (v_unidade_id, 'Heranças culturais africanas'),
    (v_unidade_id, 'A luta contra o preconceito'),
    (v_unidade_id, 'Igualdade e respeito à diversidade'),
    (v_unidade_id, ' Cultura afro-brasileira e diversidade'),
    (v_unidade_id, 'Revisão dos conteúdos do ano'),
    (v_unidade_id, 'Construção de linha do tempo histórica'),
    (v_unidade_id, 'Produção de trabalhos temáticos'),
    (v_unidade_id, 'Socialização dos conhecimentos adquiridos'),
    (v_unidade_id, ' Revisão geral dos conteúdos anuais');

  -- 3º Ano | Matemática | 1º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '3º Ano' AND disciplina = 'Matemática' AND bimestre = '1º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '3º Ano', 'Matemática', '1º Bimestre', 'Revisão dos números naturais')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Revisão dos números naturais'),
    (v_unidade_id, 'Leitura e escrita de números até .000'),
    (v_unidade_id, 'Composição e decomposição de números'),
    (v_unidade_id, 'Valor posicional dos algarismos'),
    (v_unidade_id, 'Ordem crescente e decrescente'),
    (v_unidade_id, 'Sistema de numeração decimal'),
    (v_unidade_id, 'Antecessor e sucessor'),
    (v_unidade_id, 'Comparação e ordenação de números'),
    (v_unidade_id, 'Sequências numéricas'),
    (v_unidade_id, 'Regularidades em sequências'),
    (v_unidade_id, 'Sequências e comparação de números'),
    (v_unidade_id, 'Adição com reagrupamento'),
    (v_unidade_id, 'Subtração com reagrupamento'),
    (v_unidade_id, 'Cálculo mental'),
    (v_unidade_id, 'Estratégias de resolução de operações'),
    (v_unidade_id, 'Adição e subtração'),
    (v_unidade_id, 'Problemas envolvendo adição e subtração'),
    (v_unidade_id, 'Situações-problema do cotidiano'),
    (v_unidade_id, 'Revisão dos conteúdos'),
    (v_unidade_id, 'Resolução de problemas envolvendo adição e subtração');

  -- 3º Ano | Matemática | 2º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '3º Ano' AND disciplina = 'Matemática' AND bimestre = '2º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '3º Ano', 'Matemática', '2º Bimestre', 'Conceito de multiplicação')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Conceito de multiplicação'),
    (v_unidade_id, 'Multiplicação por ,  e'),
    (v_unidade_id, 'Multiplicação por  e 0'),
    (v_unidade_id, 'Multiplicação por 6, 7, 8 e 9'),
    (v_unidade_id, 'Construção da tabuada'),
    (v_unidade_id, 'Tabuada e multiplicação'),
    (v_unidade_id, 'Problemas envolvendo multiplicação'),
    (v_unidade_id, 'Conceito de divisão'),
    (v_unidade_id, 'Divisão como repartição'),
    (v_unidade_id, 'Divisão como medida'),
    (v_unidade_id, 'Divisão e suas aplicações'),
    (v_unidade_id, 'Relação entre multiplicação e divisão'),
    (v_unidade_id, 'Problemas envolvendo as quatro operações'),
    (v_unidade_id, 'Estratégias de cálculo'),
    (v_unidade_id, 'Jogos matemáticos'),
    (v_unidade_id, 'Problemas com multiplicação e divisão'),
    (v_unidade_id, 'Medidas de comprimento'),
    (v_unidade_id, 'Medidas de massa'),
    (v_unidade_id, 'Revisão dos conteúdos'),
    (v_unidade_id, 'Grandezas e medidas');

  -- 3º Ano | Matemática | 3º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '3º Ano' AND disciplina = 'Matemática' AND bimestre = '3º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '3º Ano', 'Matemática', '3º Bimestre', 'Figuras geométricas planas')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Figuras geométricas planas'),
    (v_unidade_id, 'Polígonos'),
    (v_unidade_id, 'Triângulos'),
    (v_unidade_id, 'Quadriláteros'),
    (v_unidade_id, 'Circunferência e círculo'),
    (v_unidade_id, 'Sólidos geométricos'),
    (v_unidade_id, 'Faces, vértices e arestas'),
    (v_unidade_id, 'Cubo, prisma e pirâmide'),
    (v_unidade_id, 'Corpos redondos'),
    (v_unidade_id, 'Localização e movimentação no espaço'),
    (v_unidade_id, 'Pontos de referência'),
    (v_unidade_id, 'Mapas e trajetos'),
    (v_unidade_id, 'Orientação espacial'),
    (v_unidade_id, 'Localização e orientação espacial'),
    (v_unidade_id, 'Coleta e organização de dados'),
    (v_unidade_id, 'Tabelas simples'),
    (v_unidade_id, 'Construção de gráficos'),
    (v_unidade_id, 'Leitura e interpretação de tabelas e gráficos');

  -- 3º Ano | Matemática | 4º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '3º Ano' AND disciplina = 'Matemática' AND bimestre = '4º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '3º Ano', 'Matemática', '4º Bimestre', 'Introdução às frações')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Introdução às frações'),
    (v_unidade_id, 'Fração como parte do todo'),
    (v_unidade_id, 'Representação de frações'),
    (v_unidade_id, 'Frações em situações cotidianas'),
    (v_unidade_id, 'Comparação de frações simples'),
    (v_unidade_id, 'Frações'),
    (v_unidade_id, 'Medidas de tempo'),
    (v_unidade_id, 'Leitura de relógios'),
    (v_unidade_id, 'Calendário'),
    (v_unidade_id, 'Duração de acontecimentos'),
    (v_unidade_id, 'Revisão das operações matemáticas'),
    (v_unidade_id, 'Revisão de geometria'),
    (v_unidade_id, 'Revisão de medidas'),
    (v_unidade_id, 'Revisão de tratamento da informação'),
    (v_unidade_id, 'Revisão dos conteúdos matemáticos'),
    (v_unidade_id, 'Jogos de raciocínio lógico'),
    (v_unidade_id, 'Atividades integradoras'),
    (v_unidade_id, 'Recuperação e reforço'),
    (v_unidade_id, 'final dos conteúdos do ano');

  -- 3º Ano | Português | 1º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '3º Ano' AND disciplina = 'Português' AND bimestre = '1º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '3º Ano', 'Português', '1º Bimestre', 'Apresentação da disciplina e revisão dos conhecimentos anteriores')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Apresentação da disciplina e revisão dos conhecimentos anteriores'),
    (v_unidade_id, 'Leitura e interpretação de textos curtos'),
    (v_unidade_id, 'Ordem alfabética e uso do dicionário'),
    (v_unidade_id, 'Separação silábica'),
    (v_unidade_id, 'Classificação das palavras quanto ao número de sílabas'),
    (v_unidade_id, 'Ordem alfabética e separação silábica'),
    (v_unidade_id, 'Ortografia uso de M antes de P e B'),
    (v_unidade_id, 'Ortografia uso de R e RR'),
    (v_unidade_id, 'Ortografia uso de C, Ç e S'),
    (v_unidade_id, 'Formação de palavras'),
    (v_unidade_id, 'Regras ortográficas'),
    (v_unidade_id, 'Substantivos próprios e comuns'),
    (v_unidade_id, 'Masculino e feminino'),
    (v_unidade_id, 'Singular e plural'),
    (v_unidade_id, 'Ampliação do vocabulário'),
    (v_unidade_id, 'Substantivos e flexões'),
    (v_unidade_id, 'Produção de frases'),
    (v_unidade_id, 'Produção de pequenos textos'),
    (v_unidade_id, 'Revisão dos conteúdos'),
    (v_unidade_id, 'Produção textual simples');

  -- 3º Ano | Português | 2º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '3º Ano' AND disciplina = 'Português' AND bimestre = '2º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '3º Ano', 'Português', '2º Bimestre', 'Bilhetes e recados')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Bilhetes e recados'),
    (v_unidade_id, 'Convites'),
    (v_unidade_id, 'Cartas pessoais'),
    (v_unidade_id, 'Características dos gêneros textuais'),
    (v_unidade_id, 'Leitura de textos informativos'),
    (v_unidade_id, 'Produção de bilhete ou convite'),
    (v_unidade_id, 'Contos populares'),
    (v_unidade_id, 'Personagens, tempo e espaço'),
    (v_unidade_id, 'Sequência dos fatos'),
    (v_unidade_id, 'Interpretação textual'),
    (v_unidade_id, 'Interpretação de conto'),
    (v_unidade_id, 'Poemas'),
    (v_unidade_id, 'Versos e estrofes'),
    (v_unidade_id, 'Rimas'),
    (v_unidade_id, 'Leitura expressiva'),
    (v_unidade_id, 'Poemas, versos e rimas'),
    (v_unidade_id, 'Histórias em quadrinhos'),
    (v_unidade_id, 'Linguagem verbal e não verbal'),
    (v_unidade_id, 'Revisão dos conteúdos'),
    (v_unidade_id, 'Interpretação de história em quadrinhos');

  -- 3º Ano | Português | 3º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '3º Ano' AND disciplina = 'Português' AND bimestre = '3º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '3º Ano', 'Português', '3º Bimestre', 'Adjetivos')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Adjetivos'),
    (v_unidade_id, 'Características dos seres'),
    (v_unidade_id, 'Artigos definidos e indefinidos'),
    (v_unidade_id, 'Pronomes pessoais'),
    (v_unidade_id, 'Construção de frases'),
    (v_unidade_id, 'Artigos e adjetivos'),
    (v_unidade_id, 'Verbos e ações'),
    (v_unidade_id, 'Tempos verbais presente'),
    (v_unidade_id, 'Tempos verbais passado e futuro'),
    (v_unidade_id, 'Emprego dos verbos'),
    (v_unidade_id, 'Verbos e tempos verbais'),
    (v_unidade_id, 'Pontuação ponto final, interrogação e exclamação'),
    (v_unidade_id, 'Uso da vírgula em enumerações'),
    (v_unidade_id, 'Discurso direto'),
    (v_unidade_id, 'Leitura e interpretação'),
    (v_unidade_id, 'Pontuação e discurso direto'),
    (v_unidade_id, 'Produção textual'),
    (v_unidade_id, 'Revisão textual'),
    (v_unidade_id, 'Reescrita de textos'),
    (v_unidade_id, 'Produção de narrativa curta');

  -- 3º Ano | Português | 4º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '3º Ano' AND disciplina = 'Português' AND bimestre = '4º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '3º Ano', 'Português', '4º Bimestre', 'Narrativas e contos')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Narrativas e contos'),
    (v_unidade_id, 'Início, desenvolvimento e conclusão'),
    (v_unidade_id, 'Produção de histórias'),
    (v_unidade_id, 'Organização de ideias'),
    (v_unidade_id, 'Coesão textual'),
    (v_unidade_id, 'Produção de narrativa'),
    (v_unidade_id, 'Textos informativos'),
    (v_unidade_id, 'Pesquisa e organização de informações'),
    (v_unidade_id, 'Resumo de textos'),
    (v_unidade_id, 'Leitura crítica'),
    (v_unidade_id, 'Produção de resumo'),
    (v_unidade_id, 'Cartazes e anúncios'),
    (v_unidade_id, 'Finalidade dos textos publicitários'),
    (v_unidade_id, 'Produção de cartazes'),
    (v_unidade_id, 'Comunicação escrita'),
    (v_unidade_id, 'Produção de cartaz informativo'),
    (v_unidade_id, 'Revisão geral dos conteúdos'),
    (v_unidade_id, 'Leitura fluente'),
    (v_unidade_id, 'Socialização das produções'),
    (v_unidade_id, 'Produção textual final e interpretação de texto');

  -- 4º Ano | Geografia | 1º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '4º Ano' AND disciplina = 'Geografia' AND bimestre = '1º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '4º Ano', 'Geografia', '1º Bimestre', 'Introdução ao estudo da Geografia')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Introdução ao estudo da Geografia'),
    (v_unidade_id, 'O espaço geográfico e a sociedade'),
    (v_unidade_id, 'O município conceito e características'),
    (v_unidade_id, 'História e formação do município'),
    (v_unidade_id, 'Divisão entre área urbana e área rural'),
    (v_unidade_id, 'Identificação das características do município'),
    (v_unidade_id, 'Os serviços públicos municipais'),
    (v_unidade_id, 'O papel da prefeitura e da câmara municipal'),
    (v_unidade_id, 'Infraestrutura urbana'),
    (v_unidade_id, 'Problemas e soluções para a cidade'),
    (v_unidade_id, 'Pesquisa sobre os serviços públicos do município'),
    (v_unidade_id, 'Atividades econômicas locais'),
    (v_unidade_id, 'Agricultura, pecuária e extrativismo'),
    (v_unidade_id, 'Comércio e prestação de serviços'),
    (v_unidade_id, 'Indústria e produção local'),
    (v_unidade_id, 'Atividade sobre atividades econômicas do município'),
    (v_unidade_id, 'Participação cidadã na comunidade'),
    (v_unidade_id, 'Conservação dos espaços públicos'),
    (v_unidade_id, 'Revisão dos conteúdos'),
    (v_unidade_id, 'Produção de texto sobre o município onde vivo');

  -- 4º Ano | Geografia | 2º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '4º Ano' AND disciplina = 'Geografia' AND bimestre = '2º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '4º Ano', 'Geografia', '2º Bimestre', 'O conceito de paisagem')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'O conceito de paisagem'),
    (v_unidade_id, 'Paisagens naturais e humanizadas'),
    (v_unidade_id, 'Transformações das paisagens'),
    (v_unidade_id, 'A ação humana no ambiente'),
    (v_unidade_id, 'Identificação dos elementos da paisagem'),
    (v_unidade_id, 'Relevo brasileiro'),
    (v_unidade_id, 'Planaltos, planícies e depressões'),
    (v_unidade_id, 'Hidrografia do Brasil'),
    (v_unidade_id, 'Principais rios brasileiros'),
    (v_unidade_id, 'Atividade sobre relevo e hidrografia'),
    (v_unidade_id, 'Clima e vegetação do Brasil'),
    (v_unidade_id, 'Biomas brasileiros'),
    (v_unidade_id, 'A importância da Amazônia'),
    (v_unidade_id, 'Recursos naturais e sua utilização'),
    (v_unidade_id, 'Pesquisa sobre os biomas brasileiros'),
    (v_unidade_id, 'Preservação ambiental'),
    (v_unidade_id, 'Desmatamento e queimadas'),
    (v_unidade_id, 'Sustentabilidade'),
    (v_unidade_id, 'Revisão dos conteúdos'),
    (v_unidade_id, 'Projeto de preservação ambiental');

  -- 4º Ano | Geografia | 3º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '4º Ano' AND disciplina = 'Geografia' AND bimestre = '3º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '4º Ano', 'Geografia', '3º Bimestre', 'O que é população')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'O que é população'),
    (v_unidade_id, 'Crescimento populacional'),
    (v_unidade_id, 'Distribuição da população brasileira'),
    (v_unidade_id, 'Migrações internas'),
    (v_unidade_id, 'Atividade sobre população e migrações'),
    (v_unidade_id, 'Diversidade cultural brasileira'),
    (v_unidade_id, 'Povos indígenas'),
    (v_unidade_id, 'Povos afro-brasileiros'),
    (v_unidade_id, 'Contribuições culturais para a sociedade'),
    (v_unidade_id, 'Pesquisa sobre diversidade cultural'),
    (v_unidade_id, 'Setores da economia'),
    (v_unidade_id, 'Setor primário'),
    (v_unidade_id, 'Setor secundário'),
    (v_unidade_id, 'Setor terciário'),
    (v_unidade_id, 'Exercícios sobre os setores econômicos'),
    (v_unidade_id, 'Trabalho e qualidade de vida'),
    (v_unidade_id, 'Consumo consciente'),
    (v_unidade_id, 'Desenvolvimento sustentável'),
    (v_unidade_id, 'Revisão dos conteúdos'),
    (v_unidade_id, 'Produção textual sobre trabalho e cidadania');

  -- 4º Ano | Geografia | 4º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '4º Ano' AND disciplina = 'Geografia' AND bimestre = '4º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '4º Ano', 'Geografia', '4º Bimestre', 'Cartografia ciência dos mapas')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Cartografia ciência dos mapas'),
    (v_unidade_id, 'Tipos de mapas'),
    (v_unidade_id, 'Elementos cartográficos'),
    (v_unidade_id, 'Título, legenda e escala'),
    (v_unidade_id, 'Interpretação de mapas e legendas'),
    (v_unidade_id, 'Orientação espacial'),
    (v_unidade_id, 'Pontos cardeais e colaterais'),
    (v_unidade_id, 'Rosa dos ventos'),
    (v_unidade_id, 'Localização geográfica'),
    (v_unidade_id, 'Exercícios com rosa dos ventos'),
    (v_unidade_id, 'Leitura de mapas do Brasil'),
    (v_unidade_id, 'Divisão política do Brasil'),
    (v_unidade_id, 'Estados e capitais brasileiras'),
    (v_unidade_id, 'Regiões do Brasil'),
    (v_unidade_id, 'Identificação das regiões brasileiras'),
    (v_unidade_id, 'Mapas temáticos'),
    (v_unidade_id, 'Produção de mapas simples'),
    (v_unidade_id, 'Representação do espaço local'),
    (v_unidade_id, 'Revisão dos conteúdos'),
    (v_unidade_id, 'Elaboração de mapa ilustrado da comunidade');

  -- 4º Ano | História | 1º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '4º Ano' AND disciplina = 'História' AND bimestre = '1º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '4º Ano', 'História', '1º Bimestre', 'O que é História e sua importância')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'O que é História e sua importância'),
    (v_unidade_id, 'O trabalho do historiador'),
    (v_unidade_id, 'Fontes históricas escritas, orais e materiais'),
    (v_unidade_id, 'O tempo histórico e a contagem do tempo'),
    (v_unidade_id, ' História, fontes históricas e tempo'),
    (v_unidade_id, 'A formação das comunidades humanas'),
    (v_unidade_id, 'Os primeiros grupos humanos'),
    (v_unidade_id, 'Modos de vida dos povos antigos'),
    (v_unidade_id, 'Organização das primeiras comunidades'),
    (v_unidade_id, ' Primeiros grupos humanos'),
    (v_unidade_id, 'A história da comunidade local'),
    (v_unidade_id, 'Transformações da comunidade ao longo do tempo'),
    (v_unidade_id, 'Patrimônio histórico e cultural'),
    (v_unidade_id, 'Preservação da memória histórica'),
    (v_unidade_id, ' Comunidade e patrimônio histórico'),
    (v_unidade_id, 'Memória individual e coletiva'),
    (v_unidade_id, 'A importância dos registros históricos'),
    (v_unidade_id, 'Linha do tempo e acontecimentos históricos'),
    (v_unidade_id, 'Construção de linha do tempo da comunidade'),
    (v_unidade_id, ' Memória e registros históricos');

  -- 4º Ano | História | 2º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '4º Ano' AND disciplina = 'História' AND bimestre = '2º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '4º Ano', 'História', '2º Bimestre', 'Povos indígenas do Brasil')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Povos indígenas do Brasil'),
    (v_unidade_id, 'Organização social dos povos indígenas'),
    (v_unidade_id, 'Cultura e tradições indígenas'),
    (v_unidade_id, 'A presença indígena na atualidade'),
    (v_unidade_id, ' Povos indígenas brasileiros'),
    (v_unidade_id, 'A chegada dos portugueses ao Brasil'),
    (v_unidade_id, 'O encontro entre indígenas e portugueses'),
    (v_unidade_id, 'Mudanças provocadas pela colonização'),
    (v_unidade_id, 'Primeiros núcleos de povoamento'),
    (v_unidade_id, ' Chegada dos portugueses e colonização'),
    (v_unidade_id, 'Povos africanos antes da escravidão'),
    (v_unidade_id, 'A vinda dos africanos para o Brasil'),
    (v_unidade_id, 'Resistência e cultura afro-brasileira'),
    (v_unidade_id, 'Contribuições africanas para a sociedade brasileira'),
    (v_unidade_id, ' Povos africanos e cultura afro-brasileira'),
    (v_unidade_id, 'Diversidade cultural brasileira'),
    (v_unidade_id, 'Formação do povo brasileiro'),
    (v_unidade_id, 'Respeito às diferenças culturais'),
    (v_unidade_id, 'Identidade cultural brasileira'),
    (v_unidade_id, ' Diversidade e formação cultural do Brasil');

  -- 4º Ano | História | 3º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '4º Ano' AND disciplina = 'História' AND bimestre = '3º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '4º Ano', 'História', '3º Bimestre', 'O Brasil Colonial')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'O Brasil Colonial'),
    (v_unidade_id, 'A vida nas vilas e cidades coloniais'),
    (v_unidade_id, 'O trabalho na colônia'),
    (v_unidade_id, 'Economia colonial'),
    (v_unidade_id, ' Brasil Colonial'),
    (v_unidade_id, 'O ciclo do açúcar'),
    (v_unidade_id, 'A mineração no Brasil'),
    (v_unidade_id, 'Transformações econômicas e sociais'),
    (v_unidade_id, 'O crescimento das cidades'),
    (v_unidade_id, ' Economia colonial'),
    (v_unidade_id, 'Revoltas e movimentos de resistência'),
    (v_unidade_id, 'Quilombos e resistência negra'),
    (v_unidade_id, 'Lideranças históricas brasileiras'),
    (v_unidade_id, 'A busca por liberdade'),
    (v_unidade_id, ' Resistência e movimentos sociais'),
    (v_unidade_id, 'Mudanças no final do período colonial'),
    (v_unidade_id, 'A vinda da família real ao Brasil'),
    (v_unidade_id, 'Transformações políticas e culturais'),
    (v_unidade_id, 'Preparação para a independência'),
    (v_unidade_id, ' Transformações do período colonial');

  -- 4º Ano | História | 4º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '4º Ano' AND disciplina = 'História' AND bimestre = '4º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '4º Ano', 'História', '4º Bimestre', 'A Independência do Brasil')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'A Independência do Brasil'),
    (v_unidade_id, 'Personagens da Independência'),
    (v_unidade_id, 'Consequências da Independência'),
    (v_unidade_id, 'O Brasil Imperial'),
    (v_unidade_id, ' Independência do Brasil'),
    (v_unidade_id, 'A vida durante o Império'),
    (v_unidade_id, 'Economia e sociedade no Império'),
    (v_unidade_id, 'O fim da escravidão'),
    (v_unidade_id, 'A Lei Áurea e seus impactos'),
    (v_unidade_id, ' Brasil Império e Abolição'),
    (v_unidade_id, 'A Proclamação da República'),
    (v_unidade_id, 'Mudanças políticas no Brasil'),
    (v_unidade_id, 'Símbolos nacionais'),
    (v_unidade_id, 'Cidadania e participação social'),
    (v_unidade_id, ' República e cidadania'),
    (v_unidade_id, 'Revisão dos conteúdos do ano'),
    (v_unidade_id, 'Construção de linha do tempo histórica'),
    (v_unidade_id, 'Produção de trabalhos sobre a história do Brasil'),
    (v_unidade_id, 'Apresentação e socialização dos trabalhos'),
    (v_unidade_id, ' Revisão geral dos conteúdos anuais');

  -- 4º Ano | Matemática | 1º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '4º Ano' AND disciplina = 'Matemática' AND bimestre = '1º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '4º Ano', 'Matemática', '1º Bimestre', 'Conhecendo a Matemática no dia a dia')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Conhecendo a Matemática no dia a dia'),
    (v_unidade_id, 'Noções de quantidade muito, pouco, nenhum'),
    (v_unidade_id, 'Contagem oral até'),
    (v_unidade_id, 'Reconhecimento dos números de 0 a'),
    (v_unidade_id, 'Números de 0 a'),
    (v_unidade_id, 'Correspondência entre número e quantidade'),
    (v_unidade_id, 'Contagem de objetos e figuras'),
    (v_unidade_id, 'Números de 6 a 0'),
    (v_unidade_id, 'Escrita dos números de 0 a 0'),
    (v_unidade_id, 'Quantidade e contagem'),
    (v_unidade_id, 'Sequência numérica crescente'),
    (v_unidade_id, 'Sequência numérica decrescente'),
    (v_unidade_id, 'Comparação de quantidades'),
    (v_unidade_id, 'Maior quantidade e menor quantidade'),
    (v_unidade_id, 'Sequência numérica'),
    (v_unidade_id, 'Antecessor e sucessor'),
    (v_unidade_id, 'Jogos com números'),
    (v_unidade_id, 'Problemas simples envolvendo números'),
    (v_unidade_id, 'Revisão dos conteúdos'),
    (v_unidade_id, 'Resolução de situações-problema com números até 0');

  -- 4º Ano | Matemática | 2º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '4º Ano' AND disciplina = 'Matemática' AND bimestre = '2º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '4º Ano', 'Matemática', '2º Bimestre', 'Ideia de adição juntar')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Ideia de adição juntar'),
    (v_unidade_id, 'Adição com materiais concretos'),
    (v_unidade_id, 'Adição com desenhos'),
    (v_unidade_id, 'Adição até 0'),
    (v_unidade_id, 'Adição simples'),
    (v_unidade_id, 'Ideia de subtração retirar'),
    (v_unidade_id, 'Subtração com materiais concretos'),
    (v_unidade_id, 'Subtração com desenhos'),
    (v_unidade_id, 'Subtração até 0'),
    (v_unidade_id, 'Subtração simples'),
    (v_unidade_id, 'Comparação entre adição e subtração'),
    (v_unidade_id, 'Problemas envolvendo adição'),
    (v_unidade_id, 'Problemas envolvendo subtração'),
    (v_unidade_id, 'Jogos matemáticos'),
    (v_unidade_id, 'Problemas envolvendo operações'),
    (v_unidade_id, 'Sequências lógicas'),
    (v_unidade_id, 'Completação de padrões'),
    (v_unidade_id, 'Desafios matemáticos'),
    (v_unidade_id, 'Revisão dos conteúdos'),
    (v_unidade_id, 'Raciocínio lógico e sequências');

  -- 4º Ano | Matemática | 3º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '4º Ano' AND disciplina = 'Matemática' AND bimestre = '3º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '4º Ano', 'Matemática', '3º Bimestre', 'Formas geométricas no cotidiano')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Formas geométricas no cotidiano'),
    (v_unidade_id, 'Círculo'),
    (v_unidade_id, 'Quadrado'),
    (v_unidade_id, 'Triângulo'),
    (v_unidade_id, 'Figuras geométricas planas'),
    (v_unidade_id, 'Retângulo'),
    (v_unidade_id, 'Comparação de formas'),
    (v_unidade_id, 'Montagem de figuras geométricas'),
    (v_unidade_id, 'Identificação de formas em objetos'),
    (v_unidade_id, 'Reconhecimento de formas geométricas'),
    (v_unidade_id, 'Noções de comprimento'),
    (v_unidade_id, 'Objetos longos e curtos'),
    (v_unidade_id, 'Noções de massa'),
    (v_unidade_id, 'Objetos leves e pesados'),
    (v_unidade_id, 'Grandezas e medidas'),
    (v_unidade_id, 'Noções de capacidade'),
    (v_unidade_id, 'Comparação de recipientes'),
    (v_unidade_id, 'Medidas no cotidiano'),
    (v_unidade_id, 'Revisão dos conteúdos'),
    (v_unidade_id, 'Aplicação de medidas no cotidiano');

  -- 4º Ano | Matemática | 4º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '4º Ano' AND disciplina = 'Matemática' AND bimestre = '4º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '4º Ano', 'Matemática', '4º Bimestre', 'Dias da semana')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Dias da semana'),
    (v_unidade_id, 'Meses do ano'),
    (v_unidade_id, 'Calendário'),
    (v_unidade_id, 'Organização do tempo'),
    (v_unidade_id, 'Medidas de tempo'),
    (v_unidade_id, 'Leitura e interpretação de imagens'),
    (v_unidade_id, 'Coleta de informações simples'),
    (v_unidade_id, 'Organização de dados'),
    (v_unidade_id, 'Construção de tabelas simples'),
    (v_unidade_id, 'Tabelas e organização de dados'),
    (v_unidade_id, 'Leitura de gráficos ilustrados'),
    (v_unidade_id, 'Interpretação de gráficos simples'),
    (v_unidade_id, 'Situações-problema envolvendo gráficos'),
    (v_unidade_id, 'Jogos matemáticos integrados'),
    (v_unidade_id, 'Leitura e interpretação de gráficos'),
    (v_unidade_id, 'Revisão geral dos números'),
    (v_unidade_id, 'Revisão das operações'),
    (v_unidade_id, 'Revisão da geometria e medidas'),
    (v_unidade_id, 'Recuperação dos conteúdos'),
    (v_unidade_id, 'final dos conteúdos do ano');

  -- 4º Ano | Português | 1º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '4º Ano' AND disciplina = 'Português' AND bimestre = '1º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '4º Ano', 'Português', '1º Bimestre', 'Apresentação da disciplina e revisão dos conteúdos anteriores')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Apresentação da disciplina e revisão dos conteúdos anteriores'),
    (v_unidade_id, 'Leitura e interpretação de textos narrativos'),
    (v_unidade_id, 'Localização de informações explícitas no texto'),
    (v_unidade_id, 'Inferência de informações implícitas'),
    (v_unidade_id, 'Interpretação de texto narrativo'),
    (v_unidade_id, 'Uso do dicionário'),
    (v_unidade_id, 'Ortografia uso de S, SS, C, Ç e XC'),
    (v_unidade_id, 'Ortografia uso de G e J'),
    (v_unidade_id, 'Ortografia uso de X e CH'),
    (v_unidade_id, 'Regras ortográficas'),
    (v_unidade_id, 'Separação silábica'),
    (v_unidade_id, 'Classificação das palavras quanto ao número de sílabas'),
    (v_unidade_id, 'Acentuação gráfica'),
    (v_unidade_id, 'Ampliação do vocabulário'),
    (v_unidade_id, 'Separação silábica e acentuação'),
    (v_unidade_id, 'Produção de frases e parágrafos'),
    (v_unidade_id, 'Organização de ideias em textos'),
    (v_unidade_id, 'Coesão textual'),
    (v_unidade_id, 'Revisão dos conteúdos'),
    (v_unidade_id, 'Produção de texto descritivo');

  -- 4º Ano | Português | 2º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '4º Ano' AND disciplina = 'Português' AND bimestre = '2º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '4º Ano', 'Português', '2º Bimestre', 'Bilhete e recado')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Bilhete e recado'),
    (v_unidade_id, 'Carta pessoal'),
    (v_unidade_id, 'Convite'),
    (v_unidade_id, 'Características dos gêneros textuais'),
    (v_unidade_id, 'Produção de carta pessoal'),
    (v_unidade_id, 'Contos populares'),
    (v_unidade_id, 'Fábulas'),
    (v_unidade_id, 'Moral da história'),
    (v_unidade_id, 'Elementos da narrativa'),
    (v_unidade_id, 'Interpretação de fábula'),
    (v_unidade_id, 'Poemas'),
    (v_unidade_id, 'Versos, estrofes e rimas'),
    (v_unidade_id, 'Linguagem figurada simples'),
    (v_unidade_id, 'Leitura expressiva'),
    (v_unidade_id, 'Poemas e rimas'),
    (v_unidade_id, 'Histórias em quadrinhos'),
    (v_unidade_id, 'Linguagem verbal e não verbal'),
    (v_unidade_id, 'Produção de quadrinhos'),
    (v_unidade_id, 'Revisão dos conteúdos'),
    (v_unidade_id, 'Produção de história em quadrinhos');

  -- 4º Ano | Português | 3º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '4º Ano' AND disciplina = 'Português' AND bimestre = '3º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '4º Ano', 'Português', '3º Bimestre', 'Substantivos e suas classificações')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Substantivos e suas classificações'),
    (v_unidade_id, 'Substantivos próprios e comuns'),
    (v_unidade_id, 'Substantivos coletivos'),
    (v_unidade_id, 'Flexão de gênero e número'),
    (v_unidade_id, 'Substantivos e classificações'),
    (v_unidade_id, 'Adjetivos'),
    (v_unidade_id, 'Locuções adjetivas'),
    (v_unidade_id, 'Artigos definidos e indefinidos'),
    (v_unidade_id, 'Pronomes pessoais'),
    (v_unidade_id, 'Adjetivos, artigos e pronomes'),
    (v_unidade_id, 'Verbos'),
    (v_unidade_id, 'Tempos verbais presente, passado e futuro'),
    (v_unidade_id, 'Concordância básica'),
    (v_unidade_id, 'Formação de frases'),
    (v_unidade_id, 'Verbos e tempos verbais'),
    (v_unidade_id, 'Pontuação'),
    (v_unidade_id, 'Uso da vírgula'),
    (v_unidade_id, 'Discurso direto e indireto'),
    (v_unidade_id, 'Revisão dos conteúdos'),
    (v_unidade_id, 'Pontuação e construção de frases');

  -- 4º Ano | Português | 4º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '4º Ano' AND disciplina = 'Português' AND bimestre = '4º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '4º Ano', 'Português', '4º Bimestre', 'Texto narrativo')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Texto narrativo'),
    (v_unidade_id, 'Estrutura da narrativa'),
    (v_unidade_id, 'Personagens, tempo e espaço'),
    (v_unidade_id, 'Produção de narrativa'),
    (v_unidade_id, 'Produção de texto narrativo'),
    (v_unidade_id, 'Texto informativo'),
    (v_unidade_id, 'Pesquisa e organização de informações'),
    (v_unidade_id, 'Resumo de textos'),
    (v_unidade_id, 'Síntese de informações'),
    (v_unidade_id, 'Produção de resumo'),
    (v_unidade_id, 'Notícias'),
    (v_unidade_id, 'Manchetes e fatos'),
    (v_unidade_id, 'Reportagens'),
    (v_unidade_id, 'Interpretação crítica'),
    (v_unidade_id, 'Interpretação de notícia'),
    (v_unidade_id, 'Revisão dos conteúdos anuais'),
    (v_unidade_id, 'Leitura fluente'),
    (v_unidade_id, 'Produção textual livre'),
    (v_unidade_id, 'Socialização das produções'),
    (v_unidade_id, 'Produção textual final');

  -- 5º Ano | Geografia | 1º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '5º Ano' AND disciplina = 'Geografia' AND bimestre = '1º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '5º Ano', 'Geografia', '1º Bimestre', 'Introdução ao estudo da Geografia')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Introdução ao estudo da Geografia'),
    (v_unidade_id, 'O espaço geográfico brasileiro'),
    (v_unidade_id, 'Formação do território brasileiro'),
    (v_unidade_id, 'Limites e fronteiras do Brasil'),
    (v_unidade_id, 'Divisão política do Brasil'),
    (v_unidade_id, 'Formação e organização do território brasileiro'),
    (v_unidade_id, 'Estados e capitais brasileiras'),
    (v_unidade_id, 'As cinco regiões do Brasil'),
    (v_unidade_id, 'Características da Região Norte'),
    (v_unidade_id, 'Características da Região Nordeste'),
    (v_unidade_id, 'Regiões brasileiras e suas características'),
    (v_unidade_id, 'Características da Região Centro-Oeste'),
    (v_unidade_id, 'Características da Região Sudeste'),
    (v_unidade_id, 'Características da Região Sul'),
    (v_unidade_id, 'Comparação entre as regiões brasileiras'),
    (v_unidade_id, 'Pesquisa sobre uma região brasileira'),
    (v_unidade_id, 'Integração regional e transporte'),
    (v_unidade_id, 'Comunicação e circulação de pessoas'),
    (v_unidade_id, 'Revisão dos conteúdos'),
    (v_unidade_id, 'Seminário sobre as regiões do Brasil');

  -- 5º Ano | Geografia | 2º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '5º Ano' AND disciplina = 'Geografia' AND bimestre = '2º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '5º Ano', 'Geografia', '2º Bimestre', 'Relevo brasileiro')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Relevo brasileiro'),
    (v_unidade_id, 'Planaltos, planícies e depressões'),
    (v_unidade_id, 'Formação do relevo'),
    (v_unidade_id, 'Principais formas de relevo do Brasil'),
    (v_unidade_id, 'Hidrografia brasileira'),
    (v_unidade_id, 'Bacias hidrográficas'),
    (v_unidade_id, 'Principais rios do Brasil'),
    (v_unidade_id, 'Importância da água para a sociedade'),
    (v_unidade_id, 'Hidrografia e bacias hidrográficas'),
    (v_unidade_id, 'Climas do Brasil'),
    (v_unidade_id, 'Fatores climáticos'),
    (v_unidade_id, 'Vegetação brasileira'),
    (v_unidade_id, 'Os principais biomas do Brasil'),
    (v_unidade_id, 'Climas e biomas brasileiros'),
    (v_unidade_id, 'Recursos naturais renováveis e não renováveis'),
    (v_unidade_id, 'Preservação ambiental'),
    (v_unidade_id, 'Sustentabilidade e consumo consciente'),
    (v_unidade_id, 'Revisão dos conteúdos'),
    (v_unidade_id, 'Projeto de preservação dos recursos naturais');

  -- 5º Ano | Geografia | 3º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '5º Ano' AND disciplina = 'Geografia' AND bimestre = '3º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '5º Ano', 'Geografia', '3º Bimestre', 'A população brasileira')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'A população brasileira'),
    (v_unidade_id, 'Crescimento populacional'),
    (v_unidade_id, 'Distribuição da população no território'),
    (v_unidade_id, 'Urbanização no Brasil'),
    (v_unidade_id, 'População e urbanização'),
    (v_unidade_id, 'Migrações internas'),
    (v_unidade_id, 'Imigração e emigração'),
    (v_unidade_id, 'Diversidade cultural brasileira'),
    (v_unidade_id, 'Povos indígenas e comunidades tradicionais'),
    (v_unidade_id, 'Atividades econômicas do setor primário'),
    (v_unidade_id, 'Agricultura e pecuária'),
    (v_unidade_id, 'Extrativismo'),
    (v_unidade_id, 'Recursos minerais'),
    (v_unidade_id, 'Setor primário da economia'),
    (v_unidade_id, 'Indústria, comércio e serviços'),
    (v_unidade_id, 'Tecnologia e desenvolvimento econômico'),
    (v_unidade_id, 'Trabalho e qualidade de vida'),
    (v_unidade_id, 'Revisão dos conteúdos'),
    (v_unidade_id, 'Produção textual sobre economia e trabalho');

  -- 5º Ano | Geografia | 4º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '5º Ano' AND disciplina = 'Geografia' AND bimestre = '4º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '5º Ano', 'Geografia', '4º Bimestre', 'A importância da cartografia')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'A importância da cartografia'),
    (v_unidade_id, 'Elementos dos mapas'),
    (v_unidade_id, 'Título, legenda e orientação'),
    (v_unidade_id, 'Escala cartográfica'),
    (v_unidade_id, 'Leitura e interpretação de mapas'),
    (v_unidade_id, 'Coordenadas geográficas'),
    (v_unidade_id, 'Latitude e longitude'),
    (v_unidade_id, 'Fusos horários (introdução)'),
    (v_unidade_id, 'Localização no mapa-múndi'),
    (v_unidade_id, 'Mapas físicos e políticos'),
    (v_unidade_id, 'Mapas temáticos'),
    (v_unidade_id, 'Tecnologias de localização (GPS e satélites)'),
    (v_unidade_id, 'Representações digitais do espaço'),
    (v_unidade_id, 'Análise de mapas temáticos'),
    (v_unidade_id, 'Produção de mapas e croquis'),
    (v_unidade_id, 'Representação do espaço local'),
    (v_unidade_id, 'Revisão geral dos conteúdos'),
    (v_unidade_id, 'Organização do portfólio geográfico'),
    (v_unidade_id, 'Elaboração de mapa ilustrado do município');

  -- 5º Ano | História | 1º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '5º Ano' AND disciplina = 'História' AND bimestre = '1º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '5º Ano', 'História', '1º Bimestre', 'O que é História e a importância das fontes históricas')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'O que é História e a importância das fontes históricas'),
    (v_unidade_id, 'Diferentes tipos de fontes históricas'),
    (v_unidade_id, 'O trabalho do historiador'),
    (v_unidade_id, 'Tempo histórico duração, simultaneidade e mudanças'),
    (v_unidade_id, ' Fontes históricas e tempo histórico'),
    (v_unidade_id, 'Povos originários do Brasil antes da chegada dos europeus'),
    (v_unidade_id, 'Organização social dos povos indígenas'),
    (v_unidade_id, 'Cultura, tradições e saberes indígenas'),
    (v_unidade_id, 'A presença indígena no Brasil atual'),
    (v_unidade_id, ' Povos indígenas do Brasil'),
    (v_unidade_id, 'A chegada dos portugueses ao território brasileiro'),
    (v_unidade_id, 'Os primeiros contatos entre indígenas e portugueses'),
    (v_unidade_id, 'O processo de ocupação do território'),
    (v_unidade_id, 'As capitanias hereditárias'),
    (v_unidade_id, ' Início da colonização portuguesa'),
    (v_unidade_id, 'Formação dos primeiros povoados'),
    (v_unidade_id, 'A vida cotidiana no Brasil Colonial'),
    (v_unidade_id, 'Trabalho e produção na colônia'),
    (v_unidade_id, 'Revisão dos conteúdos estudados'),
    (v_unidade_id, ' Formação do Brasil Colonial');

  -- 5º Ano | História | 2º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '5º Ano' AND disciplina = 'História' AND bimestre = '2º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '5º Ano', 'História', '2º Bimestre', 'A escravização dos povos africanos')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'A escravização dos povos africanos'),
    (v_unidade_id, 'Povos africanos e suas culturas'),
    (v_unidade_id, 'O tráfico negreiro'),
    (v_unidade_id, 'A resistência dos africanos escravizados'),
    (v_unidade_id, ' Povos africanos e escravidão'),
    (v_unidade_id, 'Quilombos e resistência negra'),
    (v_unidade_id, 'O Quilombo dos Palmares'),
    (v_unidade_id, 'Lideranças da resistência negra'),
    (v_unidade_id, 'Contribuições africanas para a cultura brasileira'),
    (v_unidade_id, ' Quilombos e resistência'),
    (v_unidade_id, 'A economia açucareira'),
    (v_unidade_id, 'A mineração no Brasil Colonial'),
    (v_unidade_id, 'O crescimento das cidades coloniais'),
    (v_unidade_id, 'Mudanças sociais e econômicas na colônia'),
    (v_unidade_id, ' Economia colonial'),
    (v_unidade_id, 'As revoltas coloniais'),
    (v_unidade_id, 'A Inconfidência Mineira'),
    (v_unidade_id, 'Outros movimentos de contestação'),
    (v_unidade_id, 'Ideias de liberdade na colônia'),
    (v_unidade_id, ' Revoltas e movimentos coloniais');

  -- 5º Ano | História | 3º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '5º Ano' AND disciplina = 'História' AND bimestre = '3º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '5º Ano', 'História', '3º Bimestre', 'A transferência da Corte Portuguesa para o Brasil')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'A transferência da Corte Portuguesa para o Brasil'),
    (v_unidade_id, 'Mudanças trazidas pela família real'),
    (v_unidade_id, 'Abertura dos portos e novas relações comerciais'),
    (v_unidade_id, 'Transformações culturais no Brasil'),
    (v_unidade_id, ' A Corte Portuguesa no Brasil'),
    (v_unidade_id, 'O processo de Independência do Brasil'),
    (v_unidade_id, 'Personagens da Independência'),
    (v_unidade_id, 'O 7 de Setembro de 8'),
    (v_unidade_id, 'Consequências da Independência'),
    (v_unidade_id, ' Independência do Brasil'),
    (v_unidade_id, 'O Primeiro Reinado'),
    (v_unidade_id, 'O Período Regencial'),
    (v_unidade_id, 'Revoltas do período regencial'),
    (v_unidade_id, 'Organização política do Império'),
    (v_unidade_id, ' Primeiro Reinado e Regências'),
    (v_unidade_id, 'O Segundo Reinado'),
    (v_unidade_id, 'Economia cafeeira'),
    (v_unidade_id, 'Modernização e crescimento urbano'),
    (v_unidade_id, 'Revisão dos conteúdos estudados'),
    (v_unidade_id, ' Brasil Império');

  -- 5º Ano | História | 4º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '5º Ano' AND disciplina = 'História' AND bimestre = '4º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '5º Ano', 'História', '4º Bimestre', 'A luta pela abolição da escravidão')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'A luta pela abolição da escravidão'),
    (v_unidade_id, 'A Lei do Ventre Livre e a Lei dos Sexagenários'),
    (v_unidade_id, 'A Lei Áurea'),
    (v_unidade_id, 'Consequências da abolição'),
    (v_unidade_id, ' Abolição da escravidão'),
    (v_unidade_id, 'A Proclamação da República'),
    (v_unidade_id, 'Mudanças políticas com a República'),
    (v_unidade_id, 'Os símbolos republicanos'),
    (v_unidade_id, 'A participação política dos cidadãos'),
    (v_unidade_id, ' Proclamação da República'),
    (v_unidade_id, 'A formação da sociedade brasileira contemporânea'),
    (v_unidade_id, 'Diversidade cultural e identidade nacional'),
    (v_unidade_id, 'Direitos humanos e cidadania'),
    (v_unidade_id, 'Respeito às diferenças e inclusão social'),
    (v_unidade_id, ' Cidadania e diversidade cultural'),
    (v_unidade_id, 'Revisão dos principais conteúdos do ano'),
    (v_unidade_id, 'Construção de linha do tempo histórica'),
    (v_unidade_id, 'Produção de trabalhos temáticos'),
    (v_unidade_id, 'Apresentação dos trabalhos e debates'),
    (v_unidade_id, ' Revisão geral dos conteúdos anuais');

  -- 5º Ano | Matemática | 1º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '5º Ano' AND disciplina = 'Matemática' AND bimestre = '1º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '5º Ano', 'Matemática', '1º Bimestre', 'Revisão dos números naturais')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Revisão dos números naturais'),
    (v_unidade_id, 'Sistema de numeração decimal'),
    (v_unidade_id, 'Leitura e escrita de números até milhões'),
    (v_unidade_id, 'Composição e decomposição de números'),
    (v_unidade_id, 'Valor posicional dos algarismos'),
    (v_unidade_id, 'Comparação e ordenação de números'),
    (v_unidade_id, 'Sequências numéricas'),
    (v_unidade_id, 'Expressões numéricas simples'),
    (v_unidade_id, 'Leitura, escrita e ordenação de números'),
    (v_unidade_id, 'Adição de números naturais'),
    (v_unidade_id, 'Subtração de números naturais'),
    (v_unidade_id, 'Multiplicação de números naturais'),
    (v_unidade_id, 'Divisão de números naturais'),
    (v_unidade_id, 'As quatro operações'),
    (v_unidade_id, 'Problemas envolvendo as quatro operações'),
    (v_unidade_id, 'Estratégias de cálculo mental'),
    (v_unidade_id, 'Resolução de desafios matemáticos'),
    (v_unidade_id, 'Revisão dos conteúdos'),
    (v_unidade_id, 'Resolução de problemas com números naturais');

  -- 5º Ano | Matemática | 2º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '5º Ano' AND disciplina = 'Matemática' AND bimestre = '2º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '5º Ano', 'Matemática', '2º Bimestre', 'Conceito de fração')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Conceito de fração'),
    (v_unidade_id, 'Leitura e representação de frações'),
    (v_unidade_id, 'Frações próprias e impróprias'),
    (v_unidade_id, 'Frações equivalentes'),
    (v_unidade_id, 'Conceitos de frações'),
    (v_unidade_id, 'Comparação de frações'),
    (v_unidade_id, 'Adição de frações com mesmo denominador'),
    (v_unidade_id, 'Subtração de frações simples'),
    (v_unidade_id, 'Problemas envolvendo frações'),
    (v_unidade_id, 'Operações com frações'),
    (v_unidade_id, 'Números decimais'),
    (v_unidade_id, 'Leitura e escrita de números decimais'),
    (v_unidade_id, 'Comparação de números decimais'),
    (v_unidade_id, 'Operações com números decimais'),
    (v_unidade_id, 'Introdução à porcentagem'),
    (v_unidade_id, 'Porcentagens simples do cotidiano'),
    (v_unidade_id, 'Situações-problema com porcentagem'),
    (v_unidade_id, 'Revisão dos conteúdos'),
    (v_unidade_id, 'Porcentagem aplicada ao cotidiano');

  -- 5º Ano | Matemática | 3º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '5º Ano' AND disciplina = 'Matemática' AND bimestre = '3º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '5º Ano', 'Matemática', '3º Bimestre', 'Figuras geométricas planas')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Figuras geométricas planas'),
    (v_unidade_id, 'Polígonos'),
    (v_unidade_id, 'Triângulos e quadriláteros'),
    (v_unidade_id, 'Circunferência e círculo'),
    (v_unidade_id, 'Perímetro de figuras planas'),
    (v_unidade_id, 'Área de figuras planas'),
    (v_unidade_id, 'Malha quadriculada'),
    (v_unidade_id, 'Resolução de problemas com área e perímetro'),
    (v_unidade_id, 'Área e perímetro'),
    (v_unidade_id, 'Sólidos geométricos'),
    (v_unidade_id, 'Faces, vértices e arestas'),
    (v_unidade_id, 'Prismas e pirâmides'),
    (v_unidade_id, 'Planificações'),
    (v_unidade_id, 'Medidas de comprimento'),
    (v_unidade_id, 'Medidas de massa'),
    (v_unidade_id, 'Medidas de capacidade'),
    (v_unidade_id, 'Revisão dos conteúdos'),
    (v_unidade_id, 'Grandezas e medidas');

  -- 5º Ano | Matemática | 4º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '5º Ano' AND disciplina = 'Matemática' AND bimestre = '4º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '5º Ano', 'Matemática', '4º Bimestre', 'Coleta e organização de dados')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Coleta e organização de dados'),
    (v_unidade_id, 'Tabelas simples e de dupla entrada'),
    (v_unidade_id, 'Gráficos de colunas'),
    (v_unidade_id, 'Gráficos de barras'),
    (v_unidade_id, 'Tabelas e gráficos'),
    (v_unidade_id, 'Gráficos de linhas'),
    (v_unidade_id, 'Interpretação de gráficos'),
    (v_unidade_id, 'Leitura de informações estatísticas'),
    (v_unidade_id, 'Pesquisa e organização de dados'),
    (v_unidade_id, 'Interpretação de dados estatísticos'),
    (v_unidade_id, 'Problemas envolvendo porcentagem'),
    (v_unidade_id, 'Problemas envolvendo medidas'),
    (v_unidade_id, 'Problemas envolvendo geometria'),
    (v_unidade_id, 'Estratégias de resolução de problemas'),
    (v_unidade_id, 'Resolução de problemas matemáticos'),
    (v_unidade_id, 'Revisão geral das operações'),
    (v_unidade_id, 'Revisão de frações e decimais'),
    (v_unidade_id, 'Revisão de geometria e medidas'),
    (v_unidade_id, 'Recuperação e reforço'),
    (v_unidade_id, 'final dos conteúdos do ano');

  -- 5º Ano | Português | 1º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '5º Ano' AND disciplina = 'Português' AND bimestre = '1º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '5º Ano', 'Português', '1º Bimestre', 'Apresentação da disciplina e revisão dos conteúdos anteriores')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Apresentação da disciplina e revisão dos conteúdos anteriores'),
    (v_unidade_id, 'Estratégias de leitura e compreensão textual'),
    (v_unidade_id, 'Identificação do tema e da ideia principal'),
    (v_unidade_id, 'Informações explícitas e implícitas no texto'),
    (v_unidade_id, 'Interpretação de texto e identificação de ideias principais'),
    (v_unidade_id, 'Ortografia uso de S, SS, C, Ç, SC e XC'),
    (v_unidade_id, 'Ortografia uso de X e CH'),
    (v_unidade_id, 'Ortografia uso de G e J'),
    (v_unidade_id, 'Ampliação de vocabulário e uso do dicionário'),
    (v_unidade_id, 'Regras ortográficas'),
    (v_unidade_id, 'Acentuação gráfica'),
    (v_unidade_id, 'Classificação das palavras quanto à tonicidade'),
    (v_unidade_id, 'Separação silábica'),
    (v_unidade_id, 'Uso correto da pontuação'),
    (v_unidade_id, 'Acentuação e pontuação'),
    (v_unidade_id, 'Produção de parágrafos'),
    (v_unidade_id, 'Coesão e coerência textual'),
    (v_unidade_id, 'Revisão textual'),
    (v_unidade_id, 'Produção escrita orientada'),
    (v_unidade_id, 'Produção de texto descritivo');

  -- 5º Ano | Português | 2º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '5º Ano' AND disciplina = 'Português' AND bimestre = '2º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '5º Ano', 'Português', '2º Bimestre', 'Contos populares e contos modernos')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Contos populares e contos modernos'),
    (v_unidade_id, 'Elementos da narrativa'),
    (v_unidade_id, 'Personagens, narrador, tempo e espaço'),
    (v_unidade_id, 'Sequência dos fatos'),
    (v_unidade_id, 'Interpretação de conto'),
    (v_unidade_id, 'Fábulas e suas características'),
    (v_unidade_id, 'Moral da história'),
    (v_unidade_id, 'Comparação entre gêneros narrativos'),
    (v_unidade_id, 'Produção de fábulas'),
    (v_unidade_id, 'Produção de fábula'),
    (v_unidade_id, 'Poemas'),
    (v_unidade_id, 'Versos, estrofes e rimas'),
    (v_unidade_id, 'Linguagem figurada'),
    (v_unidade_id, 'Leitura expressiva'),
    (v_unidade_id, 'Estrutura e interpretação de poemas'),
    (v_unidade_id, 'Histórias em quadrinhos'),
    (v_unidade_id, 'Linguagem verbal e não verbal'),
    (v_unidade_id, 'Produção de HQ'),
    (v_unidade_id, 'Revisão dos conteúdos'),
    (v_unidade_id, 'Produção de história em quadrinhos');

  -- 5º Ano | Português | 3º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '5º Ano' AND disciplina = 'Português' AND bimestre = '3º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '5º Ano', 'Português', '3º Bimestre', 'Substantivos classificação e flexões')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Substantivos classificação e flexões'),
    (v_unidade_id, 'Substantivos coletivos'),
    (v_unidade_id, 'Adjetivos e locuções adjetivas'),
    (v_unidade_id, 'Formação de frases'),
    (v_unidade_id, 'Substantivos e adjetivos'),
    (v_unidade_id, 'Artigos definidos e indefinidos'),
    (v_unidade_id, 'Pronomes pessoais'),
    (v_unidade_id, 'Pronomes possessivos e demonstrativos'),
    (v_unidade_id, 'Emprego dos pronomes'),
    (v_unidade_id, 'Artigos e pronomes'),
    (v_unidade_id, 'Verbos e suas funções'),
    (v_unidade_id, 'Tempos verbais'),
    (v_unidade_id, 'Concordância verbal básica'),
    (v_unidade_id, 'Modos verbais (introdução)'),
    (v_unidade_id, 'Verbos e tempos verbais'),
    (v_unidade_id, 'Pontuação e uso da vírgula'),
    (v_unidade_id, 'Discurso direto e indireto'),
    (v_unidade_id, 'Revisão gramatical'),
    (v_unidade_id, 'Exercícios de aplicação'),
    (v_unidade_id, 'Pontuação e análise linguística');

  -- 5º Ano | Português | 4º Bimestre
  DELETE FROM public.curriculo_unidades WHERE modalidade = 'Fundamental Anos Iniciais (1° ao 5° ANO)' AND ano = '5º Ano' AND disciplina = 'Português' AND bimestre = '4º Bimestre';
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES ('Fundamental Anos Iniciais (1° ao 5° ANO)', '5º Ano', 'Português', '4º Bimestre', 'Texto narrativo')
  RETURNING id INTO v_unidade_id;

  INSERT INTO public.curriculo_objetos (unidade_id, descricao) VALUES
    (v_unidade_id, 'Texto narrativo'),
    (v_unidade_id, 'Planejamento da escrita'),
    (v_unidade_id, 'Desenvolvimento de histórias'),
    (v_unidade_id, 'Revisão e reescrita'),
    (v_unidade_id, 'Produção de narrativa'),
    (v_unidade_id, 'Texto informativo'),
    (v_unidade_id, 'Pesquisa e organização de informações'),
    (v_unidade_id, 'Produção de resumos'),
    (v_unidade_id, 'Técnicas de síntese textual'),
    (v_unidade_id, 'Produção de resumo'),
    (v_unidade_id, 'Notícias e reportagens'),
    (v_unidade_id, 'Estrutura da notícia'),
    (v_unidade_id, 'Manchetes e subtítulos'),
    (v_unidade_id, 'Interpretação crítica de notícias'),
    (v_unidade_id, 'Interpretação de notícia'),
    (v_unidade_id, 'Produção textual livre'),
    (v_unidade_id, 'Revisão geral dos conteúdos'),
    (v_unidade_id, 'Leitura fluente e expressiva'),
    (v_unidade_id, 'Socialização das produções'),
    (v_unidade_id, 'Produção textual final');

END $$;
