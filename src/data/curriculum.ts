export interface UnidadeCurricular {
  nome: string;
  objetos: string[];
}

export interface ReferencialCurricular {
  [segmento: string]: {
    [ano: string]: UnidadeCurricular[];
  };
}

export const REFERENCIAL_CURRICULAR: ReferencialCurricular = {
  "Ensino Fundamental": {
    "1": [
      {
        nome: "Unidade Didática 1: Linguagem e Alfabetização",
        objetos: [
          "Reconhecimento das letras do alfabeto",
          "Formação de sílabas e palavras",
          "Leitura de palavras e frases simples",
          "Escrita do nome próprio",
          "Produção de pequenos textos orais e escritos"
        ]
      },
      {
        nome: "Unidade Didática 2: Números e Quantidades",
        objetos: [
          "Contagem oral e escrita",
          "Números até 100",
          "Adição e subtração simples",
          "Comparação de quantidades",
          "Sequências numéricas"
        ]
      },
      {
        nome: "Unidade Didática 3: Corpo, Saúde e Ambiente",
        objetos: [
          "Partes do corpo humano",
          "Hábitos de higiene",
          "Alimentação saudável",
          "Animais e plantas",
          "Preservação do meio ambiente"
        ]
      },
      {
        nome: "Unidade Didática 4: Convivência e Sociedade",
        objetos: [
          "Regras de convivência",
          "Família e escola",
          "Datas comemorativas",
          "Identidade e diversidade",
          "Espaços de convivência"
        ]
      }
    ],
    "2": [
      {
        nome: "Unidade Didática 1: Leitura e Produção de Texto",
        objetos: [
          "Leitura de pequenos textos",
          "Interpretação textual",
          "Produção de frases e pequenos parágrafos",
          "Pontuação básica",
          "Gêneros textuais simples"
        ]
      },
      {
        nome: "Unidade Didática 2: Operações Matemáticas",
        objetos: [
          "Números até 1.000",
          "Adição e subtração com reagrupamento",
          "Introdução à multiplicação",
          "Situações-problema",
          "Medidas de tempo e comprimento"
        ]
      },
      {
        nome: "Unidade Didática 3: Natureza e Sociedade",
        objetos: [
          "Seres vivos e não vivos",
          "Estados físicos da água",
          "Profissões",
          "Meios de transporte",
          "Importância da água"
        ]
      },
      {
        nome: "Unidade Didática 4: Cultura e História",
        objetos: [
          "História da família",
          "Brincadeiras antigas e atuais",
          "Festas populares",
          "Cultura local",
          "Noções de passado e presente"
        ]
      }
    ],
    "3": [
      {
        nome: "Unidade Didática 1: Comunicação e Linguagem",
        objetos: [
          "Gêneros textuais",
          "Produção de textos narrativos",
          "Ortografia básica",
          "Uso de pontuação",
          "Leitura e interpretação de histórias"
        ]
      },
      {
        nome: "Unidade Didática 2: Matemática no Cotidiano",
        objetos: [
          "Números até 10.000",
          "Multiplicação e divisão",
          "Sistema monetário",
          "Medidas de massa e capacidade",
          "Resolução de problemas"
        ]
      },
      {
        nome: "Unidade Didática 3: Meio Ambiente e Ciências",
        objetos: [
          "Ciclo da água",
          "Cadeia alimentar",
          "Recursos naturais",
          "Reciclagem",
          "Tipos de solo"
        ]
      },
      {
        nome: "Unidade Didática 4: História e Geografia",
        objetos: [
          "Bairro e município",
          "Mapas e localização",
          "História da comunidade",
          "Direitos e deveres",
          "Diversidade cultural"
        ]
      }
    ],
    "4": [
      {
        nome: "Unidade Didática 1: Produção e Interpretação Textual",
        objetos: [
          "Leitura de textos informativos",
          "Produção de relatos e cartas",
          "Classes gramaticais",
          "Ortografia e acentuação",
          "Coesão textual"
        ]
      },
      {
        nome: "Unidade Didática 2: Números e Geometria",
        objetos: [
          "Números naturais e decimais",
          "Frações",
          "Geometria plana",
          "Perímetro e medidas",
          "Situações-problema"
        ]
      },
      {
        nome: "Unidade Didática 3: Ciências e Sustentabilidade",
        objetos: [
          "Sistema solar",
          "Corpo humano",
          "Fontes de energia",
          "Sustentabilidade",
          "Preservação ambiental"
        ]
      },
      {
        nome: "Unidade Didática 4: Espaço e Sociedade",
        objetos: [
          "Regiões do Brasil",
          "Migrações",
          "Formação da população brasileira",
          "Paisagens naturais e urbanas",
          "Cidadania"
        ]
      }
    ],
    "5": [
      {
        nome: "Unidade Didática 1: Leitura, Escrita e Argumentação",
        objetos: [
          "Gêneros jornalísticos",
          "Produção de textos opinativos",
          "Regras gramaticais",
          "Interpretação de textos",
          "Uso de conectivos"
        ]
      },
      {
        nome: "Unidade Didática 2: Matemática e Raciocínio Lógico",
        objetos: [
          "Operações com números naturais e decimais",
          "Frações e porcentagem",
          "Geometria espacial",
          "Gráficos e tabelas",
          "Resolução de problemas"
        ]
      },
      {
        nome: "Unidade Didática 3: Ciência, Tecnologia e Saúde",
        objetos: [
          "Sistemas do corpo humano",
          "Transformações da matéria",
          "Energia e tecnologia",
          "Saúde e qualidade de vida",
          "Meio ambiente"
        ]
      },
      {
        nome: "Unidade Didática 4: História, Geografia e Cidadania",
        objetos: [
          "Formação do povo brasileiro",
          "Continentes e oceanos",
          "Direitos da criança e do adolescente",
          "Organização política do Brasil",
          "Patrimônio cultural"
        ]
      }
    ],
    "6": [
      {
        nome: "Unidade Didática 1: Linguagem, Leitura e Produção Textual",
        objetos: [
          "Gêneros textuais",
          "Interpretação de textos",
          "Produção de narrativas e relatos",
          "Classes gramaticais",
          "Ortografia e pontuação"
        ]
      },
      {
        nome: "Unidade Didática 2: Números, Operações e Geometria",
        objetos: [
          "Sistema de numeração decimal",
          "Operações com números naturais",
          "Frações e números decimais",
          "Geometria plana",
          "Grandezas e medidas"
        ]
      },
      {
        nome: "Unidade Didática 3: Ciências e Meio Ambiente",
        objetos: [
          "Seres vivos",
          "Ecossistemas",
          "Cadeias alimentares",
          "Água, ar e solo",
          "Sustentabilidade"
        ]
      },
      {
        nome: "Unidade Didática 4: História, Cultura e Sociedade",
        objetos: [
          "Povos antigos",
          "Formação das civilizações",
          "Cultura e patrimônio",
          "Organização social",
          "Espaço geográfico"
        ]
      }
    ],
    "7": [
      {
        nome: "Unidade Didática 1: Comunicação e Argumentação",
        objetos: [
          "Textos informativos e argumentativos",
          "Produção textual",
          "Coesão e coerência",
          "Verbos e tempos verbais",
          "Variação linguística"
        ]
      },
      {
        nome: "Unidade Didática 2: Álgebra e Geometria",
        objetos: [
          "Expressões numéricas",
          "Equações simples",
          "Razão e proporção",
          "Geometria espacial",
          "Porcentagem"
        ]
      },
      {
        nome: "Unidade Didática 3: Ciências e Tecnologia",
        objetos: [
          "Corpo humano",
          "Sistemas do organismo",
          "Máquinas simples",
          "Transformações da matéria",
          "Energia"
        ]
      },
      {
        nome: "Unidade Didática 4: Território e Sociedade",
        objetos: [
          "Formação do território brasileiro",
          "Regiões do Brasil",
          "Cartografia",
          "População",
          "Direitos e cidadania"
        ]
      }
    ],
    "8": [
      {
        nome: "Unidade Didática 1: Linguagem e Produção de Sentidos",
        objetos: [
          "Leitura crítica",
          "Gêneros digitais",
          "Produção de textos argumentativos",
          "Figuras de linguagem",
          "Concordância verbal e nominal"
        ]
      },
      {
        nome: "Unidade Didática 2: Álgebra, Estatística e Geometria",
        objetos: [
          "Equações do 1º grau",
          "Sistemas de equações",
          "Estatística",
          "Probabilidade",
          "Teorema de Pitágoras"
        ]
      },
      {
        nome: "Unidade Didática 3: Ciências da Vida e da Terra",
        objetos: [
          "Reprodução humana",
          "Sistema nervoso",
          "Genética",
          "Fenômenos naturais",
          "Recursos energéticos"
        ]
      },
      {
        nome: "Unidade Didática 4: História e Transformações Sociais",
        objetos: [
          "Brasil Colônia",
          "Revoluções",
          "Industrialização",
          "Urbanização",
          "Movimentos sociais"
        ]
      }
    ],
    "9": [
      {
        nome: "Unidade Didática 1: Leitura, Escrita e Análise Linguística",
        objetos: [
          "Gêneros argumentativos",
          "Produção de dissertação",
          "Sintaxe",
          "Regência e crase",
          "Interpretação crítica"
        ]
      },
      {
        nome: "Unidade Didática 2: Matemática e Pensamento Algébrico",
        objetos: [
          "Equações do 2º grau",
          "Funções",
          "Geometria analítica",
          "Estatística e gráficos",
          "Matemática financeira"
        ]
      },
      {
        nome: "Unidade Didática 3: Ciências, Tecnologia e Sociedade",
        objetos: [
          "Química e Física básica",
          "Eletricidade",
          "Ondas e som",
          "Evolução",
          "Sustentabilidade e tecnologia"
        ]
      },
      {
        nome: "Unidade Didática 4: Mundo Contemporâneo e Cidadania",
        objetos: [
          "República e democracia",
          "Globalização",
          "Geopolítica",
          "Direitos humanos",
          "Diversidade cultural"
        ]
      }
    ]
  },
  "Ensino Médio": {
    "1": [
      {
        nome: "Unidade Didática 1: Linguagens e Comunicação",
        objetos: [
          "Gêneros textuais",
          "Interpretação de textos",
          "Produção textual",
          "Linguagem verbal e não verbal",
          "Variação linguística"
        ]
      },
      {
        nome: "Unidade Didática 2: Matemática e Raciocínio Lógico",
        objetos: [
          "Conjuntos numéricos",
          "Funções",
          "Geometria plana",
          "Razão e proporção",
          "Estatística básica"
        ]
      },
      {
        nome: "Unidade Didática 3: Ciências da Natureza",
        objetos: [
          "Estrutura da matéria",
          "Sistema solar",
          "Ecologia",
          "Corpo humano",
          "Energia"
        ]
      },
      {
        nome: "Unidade Didática 4: Ciências Humanas",
        objetos: [
          "Formação das sociedades",
          "Cultura e identidade",
          "Espaço geográfico",
          "Cidadania",
          "Direitos humanos"
        ]
      }
    ],
    "2": [
      {
        nome: "Unidade Didática 1: Leitura, Argumentação e Linguagem",
        objetos: [
          "Produção de textos argumentativos",
          "Figuras de linguagem",
          "Literatura brasileira",
          "Gramática aplicada",
          "Análise crítica de textos"
        ]
      },
      {
        nome: "Unidade Didática 2: Álgebra, Geometria e Estatística",
        objetos: [
          "Funções exponenciais e logarítmicas",
          "Geometria espacial",
          "Trigonometria",
          "Probabilidade",
          "Estatística"
        ]
      },
      {
        nome: "Unidade Didática 3: Ciências, Tecnologia e Sociedade",
        objetos: [
          "Reações químicas",
          "Leis da Física",
          "Genética",
          "Sustentabilidade",
          "Tecnologia e inovação"
        ]
      },
      {
        nome: "Unidade Didática 4: História, Geografia e Filosofia",
        objetos: [
          "Revoluções",
          "Globalização",
          "Filosofia clássica",
          "Sociologia",
          "Organização política"
        ]
      }
    ],
    "3": [
      {
        nome: "Unidade Didática 1: Linguagem, Literatura e Produção Textual",
        objetos: [
          "Redação dissertativa-argumentativa",
          "Literatura contemporânea",
          "Interpretação crítica",
          "Gramática normativa",
          "Leitura de diferentes gêneros"
        ]
      },
      {
        nome: "Unidade Didática 2: Matemática Avançada e Aplicada",
        objetos: [
          "Funções do 2º grau",
          "Matemática financeira",
          "Geometria analítica",
          "Estatística e probabilidade",
          "Análise de gráficos"
        ]
      },
      {
        nome: "Unidade Didática 3: Ciências da Natureza e suas Tecnologias",
        objetos: [
          "Química orgânica",
          "Eletromagnetismo",
          "Evolução",
          "Biotecnologia",
          "Meio ambiente"
        ]
      },
      {
        nome: "Unidade Didática 4: Ciências Humanas e Sociais Aplicadas",
        objetos: [
          "Mundo contemporâneo",
          "Democracia e cidadania",
          "Geopolítica",
          "Direitos sociais",
          "Cultura e diversidade"
        ]
      }
    ]
  }
};
