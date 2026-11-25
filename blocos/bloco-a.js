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
VilaPixel.registrarBloco({
  id: 'bloco-a',
  nome: 'Bloco A',
  subtitulo: 'A Escola',
  // Dia 1: o estudante chega pela calçada, do lado de fora do portão da escola
  inicio: { x: 16.5, y: 22, dir: 'cima' },
  // a partir do Dia 2: já começa dentro da escola, no caminho logo depois do portão
  inicioDentro: { x: 17, y: 16, dir: 'cima' },
  // portão de grade (começa fechado): x/y = primeiro tile do vão (G G).
  // Quem abre é o NPC com `abre: '<id do portão>'`.
  portoes: [
    { id: 'portao-escola', x: 16, y: 21 }
  ],
  // nome da escola pintado no muro, à direita do portão (x = centro, em tiles)
  // tenda (pergolado com folhas) por cima das mesas: postes nos quadrados
  // (x1,y1), (x2,y1), (x1,y2) e (x2,y2) — coluna,linha da grade (tecla G)
  tendas: [
    { x1: 6, y1: 16, x2: 11, y2: 20 }
  ],
  // TESTE de visual "pixel art" (pontilhado, sombreado em degraus): só nesta área
  // (a secretaria e o chão em volta). Para tirar o teste, apague esta linha.
  estiloPixel: [{ x1: 21, y1: 5, x2: 26, y2: 10 }],
  // árvores grandes (maiores que um quadrado): (x, y) = quadrado do pé do tronco
  arvores: [
    { x: 28, y: 7, tipo: 'ipe' }    // ipê-amarelo
  ],
  // plaquinhas em pé: x = centro (em quadrados), y = quadrado dos pés dos postes
  placas: [
    { x: 19, y: 11, texto: 'MEU CEPI É 10' }   // entre os quadrados 18,11 e 19,11
  ],
  letreiros: [
    { x: 21.4, y: 21, texto: 'CEPI JOÃO ROBERTO MOREIRA' }
  ],
  mapa: [
    '########################################',
    '###..................................M.#',
    '###..................................M.#',
    '###..................................M.#',
    '#....................................M.#',
    '#.....mmmmmRRRhCCCCCCCRRRR.".........M.#',
    '#.....mmmmmRRRJCCffCCCRRRR..........#M.#',
    '#.....mmmmmRRRhCCCCCCCRRRR#..........M.#',
    '#..#..mmmmmRRRJCCttCCCRRRR..gggggggggM.#',
    '#.....EEEEBWWWHCCCCCCCDWDv,.gRRRRCRRRM.#',
    '#.....QQEnnCCCCCCCCCCCCCCB..gRRRRBRRRM.#',
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
      id: 'seuZe', nome: 'Seu Zé, o porteiro', x: 16, y: 18, fixo: true, alcance: 300,
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
      id: 'tiaSuzana', nome: 'Tia Suzana', x: 21, y: 10, raio: 4,
      // de vez em quando entra numa destas portas (sorteia uma perto) e depois sai:
      // a da secretaria (22,9) e a lateral da sala dos professores (14,11)
      porta: [{ x: 22, y: 9 }, { x: 14, y: 11, lado: 'direita' }],
      cores: { pele: '#c68c53', cabelo: '#2b1b14', cabeloLongo: true, camisa: '#8e44ad', calca: '#34495e' },
      conversas: [
        ['Bom dia! Bora pra sala, que já deu a hora.']
      ]
    },
    {
      id: 'cida', nome: 'Dona Cida', x: 9, y: 19, raio: 3,
      cores: { pele: '#d9a066', cabelo: '#dcdcdc', cabeloLongo: true, camisa: '#7cb342', calca: '#5d4037' },
      conversas: [
        ['Bom dia! Você é novo por aqui, né?', 'Eu cuido desta horta faz trinta anos. Cada flor tem um nome.'],
        ['As flores gostam de conversa. Sério!', 'Pelo menos é o que eu digo para elas.']
      ]
    },
    {
      id: 'teo', nome: 'Téo', x: 16, y: 9, raio: 7,
      cores: { pele: '#8d5524', cabelo: '#1b1b1b', camisa: '#e53935', calca: '#1e3a8a' },
      conversas: [
        ['Ei! Aposto que eu corro mais rápido que você!', '...Segura o SHIFT e tenta me alcançar.'],
        ['Você sabia que dá para andar na diagonal? Eu descobri sozinho!']
      ]
    }
  ]
});
