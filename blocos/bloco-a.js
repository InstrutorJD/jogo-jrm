// Bloco A — a Escola (onde o jogo começa).
// Legenda do mapa: . grama  , grama alta  " flores  = caminho  # árvore
// ~ água  F cerca  r pedra  R telhado  W parede  w janela  D porta
// p piso  o fonte (2x2)  b banco  a areia  x ponte
// M muro  P pilar  G piso de cimento do portão (vão de 2 tiles)  c calçada  e rua
// k bicicleta vermelha  K bicicleta azul  z faixa de pedestre
// q mesa de cimento (2 tiles de largura; o comprimento é o que tiver no mapa)
// n piso emborrachado (preto com bolinhas)  y pneu colorido com planta (cercado)
// v janela de vidro de correr  B bebedouro  L canto de prédio com porta na lateral direita
// J telhado com porta na lateral direita  H canto de prédio com lateral direita, sem porta  h telhado com lateral direita, sem porta
// i piso emborrachado com corrimão de ferro atravessando pelo meio (horizontal)  I o mesmo, com o corrimão no topo
// g corredor de cimento gasto (com rachaduras)  C piso de cerâmica (4 por quadrado)  m mesa de plástico com cadeiras (pátio)
// t mesa de ping-pong  f mesa de pebolim (as duas com 2 quadrados de largura)
// E piso de cerâmica escura  Q bancada de pedra com panelas (2 de largura)  Y ipê-amarelo
// T mesinha de madeira  * canteiro de flores  _ banco de cimento fino (horizontal)
// A árvore pequena na terra  S portão grande de correr, azul (2 de largura)
// O pneu de trator com terra e cebolas (horta)  U lavatório de cerâmica com torneiras (2 de largura)
VilaPixel.registrarBloco({
  id: 'bloco-a',
  nome: 'Bloco A',
  subtitulo: 'A Escola',
  // Dia 1: o estudante chega pela calçada, do lado de fora do portão da escola
  inicio: { x: 16.5, y: 24, dir: 'cima' },
  // a partir do Dia 2: já começa dentro da escola, no caminho logo depois do portão
  inicioDentro: { x: 17, y: 18, dir: 'cima' },
  // portão de grade (começa fechado): x/y = primeiro tile do vão (G G).
  // Quem abre é o NPC com `abre: '<id do portão>'`.
  portoes: [
    { id: 'portao-escola', x: 16, y: 23 }
  ],
  // nome da escola pintado no muro, à direita do portão (x = centro, em tiles)
  // tenda (pergolado com folhas) por cima das mesas: postes nos quadrados
  // (x1,y1), (x2,y1), (x1,y2) e (x2,y2) — coluna,linha da grade (tecla G)
  tendas: [
    { x1: 6, y1: 18, x2: 11, y2: 22 }
  ],
  // árvores grandes (maiores que um quadrado): (x, y) = quadrado do pé do tronco
  arvores: [
    { x: 28, y: 9, tipo: 'ipe' },   // ipê-amarelo
    { x: 36, y: 8, tipo: 'grande' }  // árvore grande, com o tronco à mostra
  ],
  // plaquinhas em pé: x = centro (em quadrados), y = quadrado dos pés dos postes
  placas: [],
  // quadra esportiva no chão (de canto a canto, em quadrados)
  quadras: [{ x1: 6, y1: 1, x2: 8, y2: 4 }],
  // corredor de cimento na diagonal: sai do pátio (coluna 15, linha 6) e chega na quadra pelo canto de baixo à direita (coluna 8, linha 4)
  corredores: [{ pontos: [[15.5, 7], [8.8, 4.8]], largura: 0.7 }],
  letreiros: [
    { x: 21.4, y: 23, texto: 'CEPI JOÃO ROBERTO MOREIRA' }
  ],
  mapa: [
    'MMMMMMMMMMMMMMMMMMMMMMMMMSSMMMMMMMMMMMMM',
    '###...ppp..==========================M.#',
    '###...ppp..===A=====A================M.#',
    '###...ppp..==========================M.#',
    '###...ppp..=====A====================M.#',
    '###........=========OOO==============M.#',
    '#..........=========OOO=======______=M.#',
    '#.RRRRmmmmmRRRhCCCCCCCRRRR===========M.#',
    '#.RRRRmmmmmRRRJCCffCCCRRRR=====T=*=T=M.#',
    '#.RRRRmmmmmRRRhCCCCCCCRRRRA==========M.#',
    '#.RRRRmmmmmRRRJCCttCCCRRRRppgggggggggM.#',
    '#.RRRREEEEBWWWHCCCCCCCDWDvppgRRRRCRRRM.#',
    '#.DUUDQQEnnCCCCCCCCCCCCCCBppgRRRRBRRRM.#',
    '#.====RRRppRRRJCCCCCCCCCCCIIgRRRRRRRRM=#',
    '#.====WWWppWWWHCCCCCCCRRRRiigRRRRRRRRM=#',
    '#.........yyyyyynnyyy.WWWW..gWDDWWWWWM.#',
    '#..............ynny.........gggggggggM.#',
    '#.,............ynny,.................M.#',
    '#..............ynny..................M.#',
    '#.....qq..qq...ynny..................M.#',
    '#.....qq..qq...MppM.kKkKk..........##M##',
    '####..qq..qq...MppM.KkKkK..........##M##',
    '####...........MppM.kKkKk..........##M##',
    'MMMMMMMMMMMMMMMPGGMMMMMMMMMMMMMMMMMMMMMM',
    'cccccccccccccccccccccccccccccccccccccccc',
    'eeeeeeeeeeeeeeeezzeeeeeeeeeeeeeeeeeeeeee'
  ],
  saidas: [],
  npcs: [
    {
      // fixo: não passeia, fica no posto ao lado do portão.
      // alcance: dá para falar com ele por trás da grade.
      // abre: com o portão fechado, ele fala `antesDeAbrir`, vai até a grade,
      // abre com as mãos, volta ao posto e fala `depoisDeAbrir`.
      // As falas de `conversas` vêm de dialogos/seuZe.json (quando o arquivo existe).
      id: 'seuZe', nome: 'Seu Zé, o porteiro', x: 16, y: 20, fixo: true, alcance: 300,
      abre: 'portao-escola',
      cores: { pele: '#b07a4f', cabelo: '#3b2a20', boina: '#1b2a4a', camisa: '#2c4a7a', calca: '#1f2a3a', sapato: '#111111' },
      antesDeAbrir: ['Bom dia! Só um instante, que eu já abro o portão.'],
      depoisDeAbrir: ['Seja bem-vindo à escola, {nome}!', 'Pode entrar, fique à vontade.'],
      // de dentro da escola, depois das 14h (antes disso ele não abre)
      antesDeSair: ['Já são {horario}, hora da saída! Vou abrir para você.'],
      depoisDeSair: ['Até amanhã, {nome}! Bom descanso.'],
      conversas: [
        ['Bom estudo, {nome}! Qualquer coisa, estou aqui no portão.'],
        ['As bicicletas ficam ali no bicicletário. Pode deixar que eu fico de olho.'],
        ['A boina? É o charme do uniforme, ué.']
      ]
    },
    {
      // Tia Suzana: as falas vêm de dialogos/tiaSuzana.json (estas são a reserva).
      id: 'tiaSuzana', nome: 'Tia Suzana', x: 21, y: 12, raio: 4,
      // de vez em quando entra numa destas portas (sorteia uma perto) e depois sai:
      // a da secretaria (22,11) e a lateral da sala dos professores (14,13)
      porta: [{ x: 22, y: 11 }, { x: 14, y: 13, lado: 'direita' }],
      cores: { pele: '#c68c53', cabelo: '#2b1b14', cabeloLongo: true, camisa: '#8e44ad', calca: '#34495e' },
      conversas: [
        ['Bom dia! Bora pra sala, que já deu a hora.']
      ]
    },
    {
      id: 'cida', nome: 'Dona Cida', x: 9, y: 21, raio: 3,
      cores: { pele: '#d9a066', cabelo: '#dcdcdc', cabeloLongo: true, camisa: '#7cb342', calca: '#5d4037' },
      conversas: [
        ['Bom dia! Você é novo por aqui, né?', 'Eu cuido desta horta faz trinta anos. Cada flor tem um nome.'],
        ['As flores gostam de conversa. Sério!', 'Pelo menos é o que eu digo para elas.']
      ]
    },
    {
      id: 'teo', nome: 'Téo', x: 16, y: 11, raio: 7,
      cores: { pele: '#8d5524', cabelo: '#1b1b1b', camisa: '#e53935', calca: '#1e3a8a' },
      conversas: [
        ['Ei! Aposto que eu corro mais rápido que você!', '...Segura o SHIFT e tenta me alcançar.'],
        ['Você sabia que dá para andar na diagonal? Eu descobri sozinho!']
      ]
    },
    {
      // Diretor Josimar: anda pela escola, pela área da secretaria e do pátio de jogos.
      // Falas em dialogos/coordenacao/josimar.json (estas são a reserva).
      id: 'josimar', nome: 'Diretor Josimar', x: 19, y: 9, raio: 7,
      cores: { pele: '#f1c27d', cabelo: '#f1c27d', camisa: '#c0392b', calca: '#1f3a5f' },
      conversas: [
        ['Bom dia, {nome}! Tudo certo por aqui?']
      ]
    },
    {
      // Professor José Moreira (inglês): anda pela frente das salas de aula.
      // Falas em dialogos/professores/jose.json (estas são a reserva).
      id: 'jose', nome: 'Prof. José Moreira', x: 31, y: 18, raio: 6,
      cores: { pele: '#a0643c', cabelo: '#3b2a20', camisa: '#9ccc3c', calca: '#1b1b1b' },
      conversas: [
        ['Good morning, {nome}! How are you?']
      ]
    }
  ]
});
