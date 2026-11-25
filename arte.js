// CEPI JRM — arte em pixel.
// O jogo usa tiles e quadros de personagem de 64x64 (TAM). Quando existe o PNG
// feito pelos alunos (sprites/tiles/*.png, sprites/personagens/*.png), ele é usado;
// o que falta é desenhado aqui por código em 16x16 e ampliado 4x (sem borrar).
//
// Folha de personagem usada pelo motor: 3 colunas (parado, passo A, passo B)
// x 4 linhas (DIRECOES), quadros de TAM x TAM.
window.VilaArte = (function () {
  const T = 16;                 // tamanho em que a arte por código é desenhada
  const ESCALA = 4, TAM = T * ESCALA;   // tamanho no jogo (64)
  const CONTORNO = '#2a1d1a';

  // Ordem dos tiles no tileset (o índice é a posição na lista).
  const TILES = [
    'grama1', 'grama2', 'grama3', 'gramaAlta', 'flores', 'caminho', 'arvore',
    'agua', 'cerca', 'pedra', 'telhado', 'parede', 'janela', 'porta', 'piso',
    'fonteTL', 'fonteTR', 'fonteBL', 'fonteBR', 'banco', 'areia', 'ponte',
    'muro', 'pilar', 'trilho', 'calcada', 'asfalto', 'bicicletaVermelha', 'bicicletaAzul',
    'faixa', 'borracha', 'borrachaCorrimao', 'borrachaCorrimaoTopo', 'ceramica', 'ceramicaEscura', 'bebedouroEscuro', 'bancadaE', 'bancadaD', 'ipe', 'mesaPlastico', 'pingPongE', 'pingPongD', 'pebolimE', 'pebolimD', 'cimentoGasto1', 'cimentoGasto2', 'cimentoGasto3', 'janelaVidro', 'bebedouro', 'portaLateral', 'telhadoPortaLateral', 'paredeLateral', 'telhadoLateral', 'mesaTopoE', 'mesaTopoD', 'mesaMeioE', 'mesaMeioD', 'mesaBaseE', 'mesaBaseD',
    'pneuH1', 'pneuH2', 'pneuH3', 'pneuH4', 'pneuH5', 'pneuV1', 'pneuV2', 'pneuV3', 'pneuV4', 'pneuV5',
    'pneuHB1', 'pneuHB2', 'pneuHB3', 'pneuHB4', 'pneuHB5',
    'pneuVE1', 'pneuVE2', 'pneuVE3', 'pneuVE4', 'pneuVE5', 'pneuHBE1', 'pneuHBE2', 'pneuHBE3', 'pneuHBE4', 'pneuHBE5',
    'mesaMadeira', 'canteiro', 'bancoCimentoE', 'bancoCimentoM', 'bancoCimentoD',
    'arvoreTerra', 'portaoCorrerE', 'portaoCorrerD', 'pneuTratorA', 'pneuTratorB', 'lavatorioE', 'lavatorioD'
  ];

  function rng(seed) {
    let s = seed % 2147483647; if (s <= 0) s += 2147483646;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
  }
  // Com semFundo, os tiles desenham só o que fica por cima do chão (árvore,
  // banco...), para o chão vir do PNG dos alunos.
  let semFundo = false;
  const fundo = f => { if (!semFundo) f(); };

  const px = (c, x, y, cor) => { c.fillStyle = cor; c.fillRect(x, y, 1, 1); };
  const ret = (c, x, y, w, h, cor) => { c.fillStyle = cor; c.fillRect(x, y, w, h); };
  function pontilhado(c, ox, base, cores, n, seed) {
    ret(c, ox, 0, T, T, base);
    const r = rng(seed);
    for (let i = 0; i < n; i++) px(c, ox + Math.floor(r() * T), Math.floor(r() * T), cores[Math.floor(r() * cores.length)]);
  }
  // Estilo "pixel art" (o mesmo da secretaria): ruído fixo por posição (emenda de um
  // tile para o outro), xadrez para passar de uma cor para outra em degraus.
  const ruido = (x, y) => (x * 7 + y * 13 + x * y) % 17;
  function salpicar(c, ox, x0, y0, w, h, escura, clara) {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      const k = ruido(x, y);
      if (k === 0 && escura) px(c, ox + x, y, escura); else if (k === 9 && clara) px(c, ox + x, y, clara);
    }
  }
  function xadrez(c, x0, y0, w, h, cor, fase = 0) {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if ((x + y + fase) % 2 === 0) px(c, x, y, cor);
  }
  // círculo com luz no alto à esquerda e sombra embaixo à direita, em degraus
  function bola(c, cx, cy, raio, [escura, media, clara, brilho]) {
    const dentro = (x, y, r) => x * x + y * y <= r * r + r * 0.6;
    for (let y = -raio; y <= raio; y++) for (let x = -raio; x <= raio; x++) {
      if (!dentro(x, y, raio)) continue;
      let cor = media;
      if (!dentro(x + 1, y + 1, raio)) cor = escura;                                   // borda de baixo/direita
      else if (!dentro(x + 2, y + 2, raio) && (x + y) % 2 === 0) cor = escura;         // degrau pontilhado
      else if (dentro(x + raio / 2.5, y + raio / 2.5, raio / 2)) cor = clara;          // luz no alto à esquerda
      else if (dentro(x + raio / 2.5, y + raio / 2.5, raio / 2 + 1) && (x + y) % 2 === 0) cor = clara;
      px(c, cx + x, cy + y, cor);
    }
    if (brilho) px(c, cx - Math.ceil(raio / 2), cy - Math.ceil(raio / 2), brilho);
  }
  function circulo(c, cx, cy, raio, cor) {
    for (let y = -raio; y <= raio; y++) for (let x = -raio; x <= raio; x++)
      if (x * x + y * y <= raio * raio + raio * 0.6) px(c, cx + x, cy + y, cor);
  }

  // ---------- tiles ----------
  const grama = (c, ox, seed) => semFundo || pontilhado(c, ox, '#5fa83e', ['#4e9434', '#72bf4c', '#4e9434'], 14, seed);
  const desenhos = {
    grama1: (c, ox) => grama(c, ox, 11),
    grama2: (c, ox) => grama(c, ox, 23),
    grama3: (c, ox) => { grama(c, ox, 37); px(c, ox + 4, 9, '#72bf4c'); px(c, ox + 5, 8, '#72bf4c'); px(c, ox + 11, 4, '#72bf4c'); },
    gramaAlta: (c, ox) => {
      grama(c, ox, 51);
      [[2, 12], [6, 13], [10, 11], [13, 14], [4, 7], [9, 5], [12, 8]].forEach(([x, y]) => {
        px(c, ox + x, y, '#3f7d2a'); px(c, ox + x, y - 1, '#3f7d2a'); px(c, ox + x - 1, y - 2, '#7fcf55'); px(c, ox + x + 1, y - 2, '#7fcf55');
      });
    },
    flores: (c, ox) => {
      grama(c, ox, 67);
      const cores = ['#e94b5a', '#f6d34a', '#ffffff', '#f08ad0'];
      [[3, 3], [11, 2], [7, 8], [2, 12], [12, 11]].forEach(([x, y], i) => {
        const cor = cores[i % cores.length];
        px(c, ox + x, y - 1, cor); px(c, ox + x - 1, y, cor); px(c, ox + x + 1, y, cor); px(c, ox + x, y + 1, cor);
        px(c, ox + x, y, '#f6a02a');
      });
    },
    caminho: (c, ox) => pontilhado(c, ox, '#c9a26b', ['#b08a55', '#d9b77f', '#b08a55'], 18, 79),
    arvore: (c, ox) => arvorePequena(c, ox, false),
    arvoreTerra: (c, ox) => arvorePequena(c, ox, true),   // a mesma árvore, com o chão de terra
    // portão grande de correr, azul (2 quadrados de largura, no lugar do muro)
    portaoCorrerE: (c, ox) => portaoCorrer(c, ox, 'E'),
    portaoCorrerD: (c, ox) => portaoCorrer(c, ox, 'D'),
    // horta: pneu de trator com terra e cebolas (A e B mudam as cebolas de lugar)
    pneuTratorA: (c, ox) => pneuTrator(c, ox, 0),
    pneuTratorB: (c, ox) => pneuTrator(c, ox, 1),
    // lavatório de cerâmica com torneiras, encostado na parede (2 quadrados: E e D)
    lavatorioE: (c, ox) => lavatorio(c, ox, 'E'),
    lavatorioD: (c, ox) => lavatorio(c, ox, 'D'),
    // ipê-amarelo: tronco fino e torto, copa toda coberta de flores amarelas (sem
    // folhas, como na florada) e flores caídas na grama em volta
    ipe: (c, ox) => {
      grama(c, ox, 89);
      ret(c, ox + 3, 13, 10, 2, '#3c7a2a');                                   // sombra
      [[1, 12], [13, 14], [2, 15], [14, 11], [11, 15]].forEach(([x, y]) => px(c, ox + x, y, '#f6d34a'));   // flores caídas
      ret(c, ox + 7, 9, 2, 6, '#5a3a22'); px(c, ox + 6, 10, '#5a3a22'); px(c, ox + 9, 11, '#5a3a22');   // tronco
      circulo(c, ox + 8, 6, 7, '#8a6a12');                                    // contorno da copa
      circulo(c, ox + 8, 6, 6, '#e0a80f');                                    // copa (amarelo mais fundo)
      circulo(c, ox + 6, 5, 3, '#f6c628'); circulo(c, ox + 10, 6, 3, '#f6c628');   // tufos de flores
      circulo(c, ox + 8, 3, 2, '#f6c628');
      [[5, 3], [7, 2], [9, 4], [4, 6], [11, 5], [8, 8], [6, 8]].forEach(([x, y]) => px(c, ox + x, y, '#fff07a'));   // brilho das flores
      px(c, ox + 3, 8, '#5a3a22'); px(c, ox + 12, 9, '#5a3a22');             // galhinhos aparecendo
    },
    agua: (c, ox) => {
      ret(c, ox, 0, T, T, '#3d7fd6');
      salpicar(c, ox, 0, 0, T, T, '#3573c4', '#4a8ade');
      [[1, 3], [9, 2], [4, 8], [11, 10], [2, 13], [8, 14]].forEach(([x, y]) => {   // marolas: crista clara, sombra embaixo
        ret(c, ox + x, y, 4, 1, '#6aa8ec'); px(c, ox + x + 1, y, '#bfe0ff'); ret(c, ox + x + 1, y + 1, 3, 1, '#2f68b8');
      });
    },
    cerca: (c, ox) => {
      grama(c, ox, 97);
      for (const y of [5, 10]) {                                                // tábuas: luz em cima, sombra embaixo
        ret(c, ox, y, T, 2, '#a0703c'); ret(c, ox, y, T, 1, '#c08a4c');
        ret(c, ox, y + 2, T, 1, '#5a3a1a'); xadrez(c, ox, y + 1, T, 1, '#8b5a2b');
      }
      [2, 12].forEach(x => {                                                    // mourões
        ret(c, ox + x, 2, 3, 12, '#8b5a2b'); ret(c, ox + x, 2, 1, 12, '#a87545'); ret(c, ox + x, 2, 3, 1, '#c08a4c');
        ret(c, ox + x + 2, 3, 1, 11, '#5a3a1a'); px(c, ox + x + 1, 6, '#6b4226'); px(c, ox + x + 1, 11, '#6b4226');
        ret(c, ox + x + 3, 13, 1, 1, '#3c7a2a');
      });
    },
    pedra: (c, ox) => {
      grama(c, ox, 101);
      ret(c, ox + 3, 12, 11, 2, '#3c7a2a'); xadrez(c, ox + 2, 12, 13, 3, '#3c7a2a', 1);
      circulo(c, ox + 8, 9, 5, '#3f4248');
      bola(c, ox + 8, 9, 4, ['#55595f', '#8a8f98', '#b0b5bd', '#e2e5ea']);
      px(c, ox + 9, 9, '#6b7078'); px(c, ox + 10, 10, '#6b7078');              // rachinha
    },
    // telhado: fileiras de telhas com luz no alto e sombra embaixo de cada uma, em degraus
    telhado: (c, ox) => {
      ret(c, ox, 0, T, T, '#b5473a');
      for (let fila = 0; fila < 4; fila++) {
        const y = fila * 4, desloc = fila % 2 ? 4 : 0;
        ret(c, ox, y, T, 1, '#dc735d'); ret(c, ox, y + 1, T, 1, '#c55a46');      // luz no alto da telha
        ret(c, ox, y + 2, T, 1, '#ad4535'); ret(c, ox, y + 3, T, 1, '#7a2c23');  // sombra embaixo dela
        for (let x = fila % 2; x < T; x += 2) px(c, ox + x, y + 2, '#9a3c2f');    // pontilhado da sombra
        for (let x = desloc; x < T; x += 8) {                                  // emenda entre as telhas
          ret(c, ox + x, y, 1, 3, '#7a2c23'); px(c, ox + x + 1, y, '#ec8c74');
        }
      }
      [[3, 1], [12, 6], [6, 10], [13, 13], [9, 2]].forEach(([x, y]) => px(c, ox + x, y, '#8e352b'));   // manchinhas
    },
    // parede: reboco com pontilhado, fiadas e rodapé em degraus
    parede: (c, ox) => {
      ret(c, ox, 0, T, T, '#e8d3a8');
      salpicar(c, ox, 0, 0, T, 12, '#d6bf90', '#f4e6c6');
      for (let y = 3; y < 12; y += 4) for (let x = 0; x < T; x++) if ((x + y) % 7) px(c, ox + x, y, '#d3bc8e');   // fiadas
      ret(c, ox, 0, T, 1, '#f4e6c6');                                          // luz no alto
      ret(c, ox, 12, T, 1, '#cdb486'); for (let x = 0; x < T; x += 2) px(c, ox + x, 12, '#bba274');   // rodapé em degraus
      ret(c, ox, 13, T, 1, '#b89f72');
      ret(c, ox, 14, T, 2, '#9c8460'); for (let x = 1; x < T; x += 2) px(c, ox + x, 14, '#8a7352');
    },
    janela: (c, ox) => {
      desenhos.parede(c, ox);
      ret(c, ox + 3, 2, 10, 10, '#4f2f1a');                                     // batente
      ret(c, ox + 3, 2, 10, 1, '#8a5a34'); ret(c, ox + 3, 2, 1, 10, '#8a5a34');   // luz no batente
      ret(c, ox + 4, 3, 8, 8, '#6fbbe8');                                       // vidro
      xadrez(c, ox + 4, 7, 8, 4, '#5aa6d6');                                    // vidro mais escuro embaixo
      ret(c, ox + 4, 3, 8, 1, '#3f7fa8');                                       // sombra do batente no vidro
      ret(c, ox + 7, 3, 2, 8, '#6b4226'); ret(c, ox + 4, 6, 8, 1, '#6b4226'); px(c, ox + 7, 3, '#8a5a34');   // caixilho
      [[5, 4], [6, 5], [10, 4], [9, 8], [10, 7]].forEach(([x, y]) => px(c, ox + x, y, '#d9f1ff'));   // reflexo em diagonal
      ret(c, ox + 2, 12, 12, 1, '#e2ded6'); ret(c, ox + 2, 13, 12, 1, '#a9a49a');   // peitoril
    },
    // porta de madeira com almofadas e veios
    porta: (c, ox) => {
      desenhos.parede(c, ox);
      ret(c, ox + 3, 2, 10, 14, '#3f2414'); ret(c, ox + 3, 2, 1, 14, '#6b4226');   // batente
      ret(c, ox + 4, 3, 8, 12, '#7a4a24');                                      // folha
      for (const [y0, h] of [[4, 4], [9, 5]]) {                                 // almofadas (painéis)
        ret(c, ox + 5, y0, 6, h, '#86542a');
        ret(c, ox + 5, y0, 6, 1, '#a06c38'); ret(c, ox + 5, y0, 1, h, '#a06c38');
        ret(c, ox + 5, y0 + h - 1, 6, 1, '#5f3820'); ret(c, ox + 10, y0, 1, h, '#5f3820');
      }
      [[6, 5], [8, 6], [7, 10], [9, 12], [6, 12]].forEach(([x, y]) => px(c, ox + x, y, '#744420'));   // veios da madeira
      px(c, ox + 10, 9, '#f2c14e'); px(c, ox + 10, 10, '#b8860b');              // maçaneta
      ret(c, ox + 4, 15, 8, 1, '#2a1d1a');                                      // vão embaixo da porta
    },
    // piso de cimento: placas com junta funda (sombra em cima, luz embaixo) e pontilhado
    piso: (c, ox) => {
      ret(c, ox, 0, T, T, '#b9b4aa');
      salpicar(c, ox, 0, 0, T, T, '#a9a49a', '#c9c5bc');
      const junta = (x, y, w, h) => {
        ret(c, ox + x, y, w, h, '#9c978d');
        if (w > 1) ret(c, ox + x, y + 1, w, 1, '#ccc8bf'); else ret(c, ox + x + 1, y, 1, h, '#ccc8bf');
      };
      junta(0, 7, T, 1); junta(0, 15, T, 1);
      junta(7, 0, 1, 7); junta(3, 8, 1, 7); junta(11, 8, 1, 7);
      ret(c, ox, 0, T, 1, '#ccc8bf');                                           // luz da junta de baixo do tile de cima
    },
    banco: (c, ox) => {
      fundo(() => desenhos.piso(c, ox));
      xadrez(c, ox + 1, 12, 14, 2, '#8e897f');                                   // sombra pontilhada no chão
      ret(c, ox + 1, 4, 14, 2, '#6b4226'); ret(c, ox + 1, 4, 14, 1, '#8b5a2b');   // encosto
      ret(c, ox + 1, 7, 14, 4, '#a0703c');                                       // assento: duas ripas
      ret(c, ox + 1, 7, 14, 1, '#c08a4c'); ret(c, ox + 1, 9, 14, 1, '#c08a4c'); ret(c, ox + 1, 8, 14, 1, '#8b5a2b');
      [[4, 10], [9, 7], [12, 10]].forEach(([x, y]) => px(c, ox + x, y, '#8b5a2b'));   // veios
      ret(c, ox + 1, 10, 14, 1, '#5a3a1a');
      ret(c, ox + 2, 11, 2, 4, '#4f2f1a'); ret(c, ox + 12, 11, 2, 4, '#4f2f1a');
      px(c, ox + 2, 11, '#6b4226'); px(c, ox + 12, 11, '#6b4226');
    },
    areia: (c, ox) => {
      ret(c, ox, 0, T, T, '#e3cf8f');
      salpicar(c, ox, 0, 0, T, T, '#cdb877', '#f1e2ad');
      [[3, 4], [10, 9], [6, 13]].forEach(([x, y]) => { ret(c, ox + x, y, 3, 1, '#f1e2ad'); ret(c, ox + x, y + 1, 3, 1, '#cdb877'); });   // ondinhas
    },
    ponte: (c, ox) => {
      ret(c, ox, 0, T, T, '#a0703c');
      for (let x = 0; x < T; x += 4) {                                          // tábuas: luz à esquerda, fresta à direita
        ret(c, ox + x, 0, 1, T, '#b98650'); ret(c, ox + x + 3, 0, 1, T, '#5a3a1a'); xadrez(c, ox + x + 2, 0, 1, T, '#8b5a2b');
      }
      px(c, ox + 1, 4, '#c08a4c'); px(c, ox + 9, 11, '#c08a4c'); px(c, ox + 5, 6, '#3f2414'); px(c, ox + 13, 12, '#3f2414');   // pregos
    },
    // muro da escola: branco, com a faixa azul, verde e amarela que sai do portão
    muro: (c, ox) => {
      ret(c, ox, 0, T, T, '#f2f0ea');
      salpicar(c, ox, 0, 3, T, 11, '#e3e0d8', '#fbfaf6');
      ret(c, ox, 0, T, 2, '#ffffff'); ret(c, ox, 2, T, 1, '#c9c4ba');     // capa de cima
      for (let x = 0; x < T; x += 2) px(c, ox + x, 3, '#dcd8ce');          // sombra da capa em degrau
      // faixa de três linhas finas: azul, verde e amarelo
      ret(c, ox, 8, T, 1, '#2b6cb0'); ret(c, ox, 9, T, 1, '#2e9e4f'); ret(c, ox, 10, T, 1, '#f2c12e');
      ret(c, ox, 13, T, 1, '#e3e0d8'); xadrez(c, ox, 13, T, 1, '#dcd8ce');
      ret(c, ox, 14, T, 1, '#dcd8ce'); ret(c, ox, 15, T, 1, '#b9b4aa');   // rodapé
      for (let x = 1; x < T; x += 2) px(c, ox + x, 15, '#a7a39a');
    },
    // pilar do portão: liso (é dele que a listra começa), com luminária
    pilar: (c, ox) => {
      ret(c, ox, 0, T, T, '#f7f5f0');
      salpicar(c, ox, 1, 4, 14, 11, '#ebe8e1', null);
      ret(c, ox, 0, T, 3, '#ffffff'); ret(c, ox, 3, T, 1, '#c9c4ba');
      ret(c, ox, 0, 1, T, '#ffffff'); ret(c, ox + 1, 4, 1, 11, '#fbfaf6');           // luz à esquerda
      ret(c, ox + 15, 0, 1, T, '#c9c4ba'); xadrez(c, ox + 14, 4, 1, 11, '#dcd8ce'); // sombra à direita
      ret(c, ox, 15, T, 1, '#b9b4aa');
      ret(c, ox + 6, 5, 4, 3, '#2a1d1a'); ret(c, ox + 7, 6, 2, 1, '#f6d34a'); px(c, ox + 7, 6, '#fff7c0');   // luminária
      ret(c, ox + 6, 8, 4, 1, '#efe9d0'); xadrez(c, ox + 5, 9, 6, 1, '#f3eedc');   // luz batendo no pilar
    },
    bicicletaVermelha: (c, ox) => bicicleta(c, ox, '#d63c3c'),
    bicicletaAzul: (c, ox) => bicicleta(c, ox, '#2b6cb0'),
    mesaTopoE: (c, ox) => mesaDeCimento(c, ox, 'Topo', 'E'), mesaTopoD: (c, ox) => mesaDeCimento(c, ox, 'Topo', 'D'),
    mesaMeioE: (c, ox) => mesaDeCimento(c, ox, 'Meio', 'E'), mesaMeioD: (c, ox) => mesaDeCimento(c, ox, 'Meio', 'D'),
    mesaBaseE: (c, ox) => mesaDeCimento(c, ox, 'Base', 'E'), mesaBaseD: (c, ox) => mesaDeCimento(c, ox, 'Base', 'D'),
    // lado direito de um prédio, com a parede lateral aparecendo de lado (da quina para a direita):
    // portaLateral = parede da frente + lateral com porta; telhadoPortaLateral = telhado +
    // lateral com porta (porta numa linha de telhado); paredeLateral = parede da frente + lateral sem porta
    portaLateral: (c, ox) => ladoDoPredio(c, ox, 'parede', true),
    telhadoPortaLateral: (c, ox) => ladoDoPredio(c, ox, 'telhado', true),
    paredeLateral: (c, ox) => ladoDoPredio(c, ox, 'parede', false),
    telhadoLateral: (c, ox) => ladoDoPredio(c, ox, 'telhado', false),   // telhado + lateral sem porta
    // janela de vidro de correr que abre no meio (guichê da secretaria), sempre ABERTA:
    // as duas folhas de vidro ficam empurradas para os cantos e o vão do meio mostra a sala
    janelaVidro: (c, ox) => {
      desenhos.parede(c, ox);
      janelaVidroDetalhe(c, ox);
      px(c, ox + 3, 9, '#cfeaf8'); px(c, ox + 12, 9, '#bfe2f5'); px(c, ox + 2, 10, '#7fb8d8'); px(c, ox + 13, 10, '#7fb8d8');   // vidro com degradê
      ret(c, ox + 1, 2, 14, 1, '#b3bac3');                                      // luz no alumínio de cima
    },
    // mesinha de madeira (quadrada, pequena) sobre a terra
    mesaMadeira: (c, ox) => {
      fundo(() => desenhos.caminho(c, ox));
      ret(c, ox + 3, 13, 11, 2, 'rgba(0, 0, 0, 0.2)'); xadrez(c, ox + 2, 13, 13, 2, 'rgba(0, 0, 0, 0.12)', 1);   // sombra
      ret(c, ox + 4, 10, 2, 4, '#5a3a1a'); ret(c, ox + 10, 10, 2, 4, '#5a3a1a');      // pés
      px(c, ox + 4, 10, '#6b4226'); px(c, ox + 10, 10, '#6b4226');
      ret(c, ox + 3, 4, 10, 6, '#a0703c');                                          // tampo
      for (const y of [5, 7]) ret(c, ox + 3, y, 10, 1, '#8b5a2b');                    // emendas das tábuas
      ret(c, ox + 3, 4, 10, 1, '#c99a5c'); ret(c, ox + 3, 4, 1, 6, '#b98650');       // luz na borda
      [[6, 6], [10, 8], [8, 4]].forEach(([x, y]) => px(c, ox + x, y, '#b98650'));    // veios
      ret(c, ox + 3, 10, 10, 1, '#6b4226'); ret(c, ox + 12, 4, 1, 7, '#6b4226');     // espessura e lado na sombra
    },
    // canteiro pequeno de flores, com borda de tijolinho, sobre a terra
    canteiro: (c, ox) => {
      fundo(() => desenhos.caminho(c, ox));
      xadrez(c, ox + 2, 14, 13, 1, 'rgba(0, 0, 0, 0.18)');                          // sombra
      ret(c, ox + 2, 5, 12, 9, '#b5473a');                                          // borda de tijolo
      ret(c, ox + 2, 5, 12, 1, '#dc735d'); ret(c, ox + 2, 13, 12, 1, '#7a2c23');
      for (let x = 4; x < 14; x += 4) px(c, ox + x, 13, '#5a1f18');                 // juntas do tijolo
      ret(c, ox + 3, 6, 10, 6, '#4a3020'); xadrez(c, ox + 3, 6, 10, 6, '#5a3a22');  // terra fofa
      ret(c, ox + 3, 12, 10, 1, '#9a3c2f');                                         // parte de dentro da borda
      const cores = ['#e94b5a', '#f6d34a', '#ffffff', '#f08ad0', '#8e6ae0'];
      [[5, 4], [8, 6], [11, 4], [6, 9], [10, 9]].forEach(([x, y], i) => {           // florzinhas com folhas
        px(c, ox + x - 1, y + 2, '#3f9a3f'); px(c, ox + x + 1, y + 2, '#2f7d32'); px(c, ox + x, y + 2, '#2f7d32');
        const cor = cores[i];
        px(c, ox + x, y, cor); px(c, ox + x - 1, y + 1, cor); px(c, ox + x + 1, y + 1, cor); px(c, ox + x, y + 1, '#f6a02a');
      });
    },
    // banco de cimento bem fino, comprido na horizontal (E = ponta esquerda, M = meio, D = ponta direita)
    bancoCimentoE: (c, ox) => bancoCimento(c, ox, 'E'),
    bancoCimentoM: (c, ox) => bancoCimento(c, ox, 'M'),
    bancoCimentoD: (c, ox) => bancoCimento(c, ox, 'D'),
    // bebedouro de inox, em pé no piso de cerâmica, virado para a esquerda (bica e botão
    // do lado esquerdo). bebedouroEscuro: o mesmo, no piso de cerâmica escura (pátio).
    bebedouro: (c, ox) => bebedouro(c, ox, 'ceramica'),
    bebedouroEscuro: (c, ox) => bebedouro(c, ox, 'ceramicaEscura'),
    // bancada de pedra (2 quadrados de largura) com panelas de comida em cima
    bancadaE: (c, ox) => bancada(c, ox, 'E'), bancadaD: (c, ox) => bancada(c, ox, 'D'),
    // pneus cortados e pintados, com planta dentro (cercado do jardim)
    // (H = fila na horizontal, V = na vertical; o número é a cor do primeiro pneu)
    pneuH1: (c, ox) => pneus(c, ox, 'H', 0), pneuH2: (c, ox) => pneus(c, ox, 'H', 1), pneuH3: (c, ox) => pneus(c, ox, 'H', 2),
    pneuH4: (c, ox) => pneus(c, ox, 'H', 3), pneuH5: (c, ox) => pneus(c, ox, 'H', 4),
    pneuV1: (c, ox) => pneus(c, ox, 'V', 0), pneuV2: (c, ox) => pneus(c, ox, 'V', 1), pneuV3: (c, ox) => pneus(c, ox, 'V', 2),
    pneuV4: (c, ox) => pneus(c, ox, 'V', 3), pneuV5: (c, ox) => pneus(c, ox, 'V', 4),
    // HB = fila horizontal que, no canto, desce para uma fila vertical (o arame faz a curva)
    pneuHB1: (c, ox) => pneus(c, ox, 'H', 0, true), pneuHB2: (c, ox) => pneus(c, ox, 'H', 1, true), pneuHB3: (c, ox) => pneus(c, ox, 'H', 2, true),
    pneuHB4: (c, ox) => pneus(c, ox, 'H', 3, true), pneuHB5: (c, ox) => pneus(c, ox, 'H', 4, true),
    // E = espelhados (a fila fica do outro lado: encostada à esquerda / canto virando para a direita)
    pneuVE1: (c, ox) => pneus(c, ox, 'V', 0, false, true), pneuVE2: (c, ox) => pneus(c, ox, 'V', 1, false, true),
    pneuVE3: (c, ox) => pneus(c, ox, 'V', 2, false, true), pneuVE4: (c, ox) => pneus(c, ox, 'V', 3, false, true),
    pneuVE5: (c, ox) => pneus(c, ox, 'V', 4, false, true),
    pneuHBE1: (c, ox) => pneus(c, ox, 'H', 0, true, true), pneuHBE2: (c, ox) => pneus(c, ox, 'H', 1, true, true),
    pneuHBE3: (c, ox) => pneus(c, ox, 'H', 2, true, true), pneuHBE4: (c, ox) => pneus(c, ox, 'H', 3, true, true),
    pneuHBE5: (c, ox) => pneus(c, ox, 'H', 4, true, true),
    // piso emborrachado: preto, com pequenos círculos em relevo (de 4 em 4 px,
    // então emenda de um tile para o outro). Corredor depois do portão.
    borracha: (c, ox) => {
      ret(c, ox, 0, T, T, '#18181c');
      for (let y = 0; y < T; y += 4) for (let x = 0; x < T; x += 4) {
        // círculo de 3x3 sem os cantos, com um brilho em cima (relevo)
        ret(c, ox + x + 1, y + 2, 3, 1, '#2e2e35'); ret(c, ox + x + 2, y + 1, 1, 3, '#2e2e35');
        px(c, ox + x + 2, y + 1, '#45454e');
      }
    },
    // piso do vão do portão (a entrada): cimento, como o corredor logo depois dele
    trilho: (c, ox) => desenhos.piso(c, ox),
    // mesas de jogo (2 quadrados de largura: metade E e D), sobre a cerâmica
    pingPongE: (c, ox) => pingPong(c, ox, 'E'), pingPongD: (c, ox) => pingPong(c, ox, 'D'),
    pebolimE: (c, ox) => pebolim(c, ox, 'E'), pebolimD: (c, ox) => pebolim(c, ox, 'D'),
    // mesa de plástico branca com duas cadeiras (uma de cada lado), no piso de cerâmica
    // escura do pátio. Só o tampo bloqueia (o motor põe uma barreira pequena), dá para passar entre elas.
    mesaPlastico: (c, ox) => {
      desenhos.ceramicaEscura(c, ox);
      const BRANCO = '#f4f4ef', SOMBRA = '#c8c8c0', PERNA = '#a9a9a0';
      // conjunto menor (do x 3 ao 12), deixando chão livre dos lados para passar entre as mesas
      ret(c, ox + 4, 12, 8, 2, 'rgba(0, 0, 0, 0.18)');                       // sombra no chão
      const cadeira = (x, encostoX) => {                                     // cadeira vista de lado
        ret(c, ox + encostoX, 5, 1, 5, BRANCO); ret(c, ox + encostoX, 5, 1, 1, '#ffffff');   // encosto
        ret(c, ox + x, 8, 3, 2, BRANCO); ret(c, ox + x, 10, 3, 1, SOMBRA);     // assento
        px(c, ox + x, 11, PERNA); px(c, ox + x + 2, 11, PERNA); px(c, ox + x, 12, PERNA); px(c, ox + x + 2, 12, PERNA);
      };
      cadeira(3, 3); cadeira(10, 12);
      ret(c, ox + 6, 10, 1, 3, PERNA); ret(c, ox + 9, 10, 1, 3, PERNA);       // pés da mesa
      ret(c, ox + 6, 5, 4, 5, BRANCO);                                        // tampo
      ret(c, ox + 6, 5, 4, 1, '#ffffff');                                     // brilho
      ret(c, ox + 6, 9, 4, 1, SOMBRA);                                        // beirada da frente
    },
    // piso de cerâmica: 4 cerâmicas pequenas por quadrado (2 colunas x 2 linhas, cada
    // peça com 8 x 8), com rejunte, brilho no canto de cima e sombra embaixo.
    // ceramica = branco meio amarelado; ceramicaEscura = bege mais escuro (pátio das mesas).
    ceramica: (c, ox) => ceramica(c, ox, ['#efe6c8', '#c6b78f', '#fbf6e6', '#d6c89f', '#e6dab5']),
    ceramicaEscura: (c, ox) => ceramica(c, ox, ['#c4ad85', '#9c8662', '#d6c29d', '#a89068', '#b8a17a']),
    // corredor de cimento gasto: o cimento com pequenas rachaduras e lascas
    // (três desenhos, que o motor alterna para não ficarem todos iguais)
    cimentoGasto1: (c, ox) => cimentoGasto(c, ox, [[2, 3], [3, 4], [4, 4], [5, 5], [5, 6], [6, 7]], [[11, 11], [12, 10], [12, 9], [13, 8]], [[9, 2], [13, 13]]),
    cimentoGasto2: (c, ox) => cimentoGasto(c, ox, [[9, 2], [9, 3], [10, 4], [10, 5], [11, 6], [12, 6], [13, 7]], [[3, 12], [4, 11], [5, 11]], [[2, 7], [14, 13]]),
    cimentoGasto3: (c, ox) => cimentoGasto(c, ox, [[4, 9], [5, 9], [6, 10], [7, 10], [8, 11], [8, 12]], [[12, 2], [13, 3]], [[3, 3], [12, 12], [7, 5]]),
    // piso emborrachado com corrimão de ferro atravessando pelo meio, na horizontal
    borrachaCorrimao: (c, ox) => corrimao(c, ox),
    borrachaCorrimaoTopo: (c, ox) => corrimao(c, ox, 0),   // o mesmo, com o corrimão no topo do quadrado
    calcada: (c, ox) => {
      ret(c, ox, 0, T, T, '#a7a39a');
      salpicar(c, ox, 0, 0, T, T, '#98948b', '#b8b4aa');
      for (const y of [0, 8]) for (const x of [0, 8]) {                         // lajotas com relevo
        ret(c, ox + x, y, 8, 1, '#bcb8ae'); ret(c, ox + x, y, 1, 8, '#bcb8ae');
        ret(c, ox + x, y + 7, 8, 1, '#8e8a82'); ret(c, ox + x + 7, y, 1, 8, '#8e8a82');
      }
    },
    asfalto: (c, ox) => {
      pontilhado(c, ox, '#4a4a52', ['#3e3e45', '#57575f'], 14, 131);
      salpicar(c, ox, 0, 0, T, T, '#404047', '#5a5a63');
      ret(c, ox + 3, 9, 9, 2, '#f6d34a'); ret(c, ox + 3, 10, 9, 1, '#d4b23a');   // faixa amarela com sombra
      px(c, ox + 6, 9, '#c9a83a'); px(c, ox + 10, 10, '#b8962e');                // desgaste da tinta
    },
    // faixa de pedestre: listras brancas paralelas à rua (horizontal), empilhadas
    // no sentido da travessia; emendam lado a lado.
    faixa: (c, ox) => {
      pontilhado(c, ox, '#4a4a52', ['#3e3e45', '#57575f'], 14, 131);
      for (let y = 1; y < T; y += 4) {
        ret(c, ox, y, T, 2, '#f2f0ea');
        px(c, ox + 5, y, '#d6d3cc'); px(c, ox + 11, y + 1, '#d6d3cc');   // desgaste da tinta
      }
    }
  };

  // Fontinha pixelada 3x5 (M e W com 5 de largura) para os letreiros.
  // Letra que faltar aparece como um bloco — é só acrescentar aqui.
  const FONTE = {
    A: ['.#.', '#.#', '###', '#.#', '#.#'], B: ['##.', '#.#', '##.', '#.#', '##.'],
    C: ['.##', '#..', '#..', '#..', '.##'], D: ['##.', '#.#', '#.#', '#.#', '##.'],
    E: ['###', '#..', '##.', '#..', '###'], F: ['###', '#..', '##.', '#..', '#..'],
    G: ['.##', '#..', '#.#', '#.#', '.##'], H: ['#.#', '#.#', '###', '#.#', '#.#'],
    I: ['###', '.#.', '.#.', '.#.', '###'], J: ['..#', '..#', '..#', '#.#', '.#.'],
    K: ['#.#', '#.#', '##.', '#.#', '#.#'], L: ['#..', '#..', '#..', '#..', '###'],
    M: ['#...#', '##.##', '#.#.#', '#...#', '#...#'], N: ['#..#', '##.#', '#.##', '#..#', '#..#'],
    O: ['.#.', '#.#', '#.#', '#.#', '.#.'], P: ['##.', '#.#', '##.', '#..', '#..'],
    Q: ['.#.', '#.#', '#.#', '##.', '.##'], R: ['##.', '#.#', '##.', '#.#', '#.#'],
    S: ['.##', '#..', '.#.', '..#', '##.'], T: ['###', '.#.', '.#.', '.#.', '.#.'],
    U: ['#.#', '#.#', '#.#', '#.#', '###'], V: ['#.#', '#.#', '#.#', '#.#', '.#.'],
    W: ['#...#', '#...#', '#.#.#', '##.##', '#...#'], X: ['#.#', '#.#', '.#.', '#.#', '#.#'],
    Y: ['#.#', '#.#', '.#.', '.#.', '.#.'], Z: ['###', '..#', '.#.', '#..', '###'],
    ' ': ['..', '..', '..', '..', '..'],
    '0': ['###', '#.#', '#.#', '#.#', '###'], '1': ['.#.', '##.', '.#.', '.#.', '###'],
    '2': ['##.', '..#', '.#.', '#..', '###'], '3': ['##.', '..#', '.#.', '..#', '##.'],
    '4': ['#.#', '#.#', '###', '..#', '..#'], '5': ['###', '#..', '##.', '..#', '##.'],
    '6': ['.##', '#..', '###', '#.#', '###'], '7': ['###', '..#', '.#.', '.#.', '.#.'],
    '8': ['###', '#.#', '###', '#.#', '###'], '9': ['###', '#.#', '###', '..#', '##.'],
    '!': ['#', '#', '#', '.', '#'], '.': ['.', '.', '.', '.', '#'], ',': ['.', '.', '.', '#', '#']
  };
  // acentos: a letra sem acento + a marquinha desenhada nas 2 linhas de cima
  const TIL = ['.#.#', '#.#.'], AGUDO = ['..#', '.#.'], CIRCUNFLEXO = ['.#.', '#.#'];
  const ACENTOS = {
    'Ã': ['A', TIL], 'Õ': ['O', TIL], 'Á': ['A', AGUDO], 'É': ['E', AGUDO], 'Í': ['I', AGUDO],
    'Ó': ['O', AGUDO], 'Ú': ['U', AGUDO], 'Â': ['A', CIRCUNFLEXO], 'Ê': ['E', CIRCUNFLEXO], 'Ô': ['O', CIRCUNFLEXO]
  };
  const glifo = ch => FONTE[ACENTOS[ch] ? ACENTOS[ch][0] : ch] || FONTE.A;
  const larguraTexto = texto => [...texto.toUpperCase()].reduce((s, ch) => s + glifo(ch)[0].length + 1, -1);
  // Escreve o texto (fontinha 3x5) a partir de (x0, y0); cada letra ocupa 7 de altura:
  // 2 linhas para o acento + 5 da letra.
  function escrever(c, texto, x0, y0, cor) {
    let x = x0;
    [...texto.toUpperCase()].forEach(ch => {
      const g = glifo(ch);
      const desenhar = (forma, oy) => forma.forEach((l, gy) => [...l].forEach((p, gx) => {
        if (p === '#') px(c, x + gx, y0 + oy + gy, cor);
      }));
      desenhar(g, 2);
      if (ACENTOS[ch]) desenhar(ACENTOS[ch][1], 0);
      x += g[0].length + 1;
    });
  }

  // Letreiro pintado direto no muro: uma linha, letras azuis de 3x5 sobre o
  // branco (acima da listra), fundo transparente. Altura 7: 2 linhas para o
  // acento (Ã, É...) + 5 da letra.
  function gerarLetreiro(texto, cor) {
    const cv = document.createElement('canvas'); cv.width = larguraTexto(texto); cv.height = 7;
    escrever(cv.getContext('2d'), texto, 0, 0, cor);
    return cv;
  }

  // Plaquinha em pé (sobre dois postes): placa branca com borda e o texto. Desenhada
  // no dobro da resolução do resto (ampliada 2x, não 4x), para o texto caber pequeno.
  const POSTE_PLACA = 8;   // altura dos postes, em px da placa
  function gerarPlaca(texto, cor) {
    const tw = larguraTexto(texto), W = tw + 6, HP = 11, H = HP + POSTE_PLACA;
    const cv = novoCanvas(W, H), c = cv.getContext('2d');
    ret(c, 3, HP, 2, POSTE_PLACA, '#6b737d'); ret(c, W - 5, HP, 2, POSTE_PLACA, '#6b737d');   // postes
    ret(c, 3, HP, 1, POSTE_PLACA, '#9aa1aa'); ret(c, W - 5, HP, 1, POSTE_PLACA, '#9aa1aa');
    ret(c, 0, 0, W, HP, cor);                                                // borda
    ret(c, 1, 1, W - 2, HP - 2, '#f7f5ef');                                  // placa
    ret(c, 1, HP - 2, W - 2, 1, '#dcd8ce');                                  // sombrinha embaixo
    escrever(c, texto, 3, 2, cor);
    return cv;
  }

  // Ipê-amarelo grande (40 x 50 px antes de ampliar, ~2,5 x 3 quadrados): tronco à
  // mostra, galhos abrindo em três e a copa coberta de flores amarelas, com vãos onde
  // aparecem os galhos. `chao` é a sombra e as flores caídas (ficam por baixo de todos).
  // O pé do tronco fica em (20, PE_IPE).
  const PE_IPE = 47;
  function gerarIpe() {
    const W = 40, H = 50;
    const cv = novoCanvas(W, H), c = cv.getContext('2d');
    const chao = novoCanvas(W, H), g = chao.getContext('2d');
    // sombra e flores caídas
    for (let y = -4; y <= 4; y++) for (let x = -15; x <= 15; x++)
      if ((x * x) / 225 + (y * y) / 16 <= 1) px(g, 20 + x, PE_IPE + y, 'rgba(0, 0, 0, 0.18)');
    const r = rng(97);
    for (let i = 0; i < 26; i++) {
      const a = r() * Math.PI * 2, d = 6 + r() * 13;
      px(g, Math.round(20 + Math.cos(a) * d), Math.round(PE_IPE + Math.sin(a) * d * 0.35), r() < 0.5 ? '#f6d34a' : '#e0a80f');
    }
    // tronco (um pouco torto) e galhos
    const TRONCO = '#5a3a22', CLARO = '#7a5232';
    for (let y = PE_IPE; y >= 26; y--) {
      const x = 19 + (y < 37 ? 1 : 0);
      ret(c, x, y, 3, 1, TRONCO); px(c, x, y, CLARO);
    }
    ret(c, 18, PE_IPE - 1, 5, 2, TRONCO);                                    // base mais larga (raízes)
    const galho = (x0, y0, x1, y1, esp) => {
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
      for (let i = 0; i <= n; i++) ret(c, Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), esp, esp, TRONCO);
    };
    galho(20, 27, 10, 15, 2); galho(21, 27, 31, 13, 2); galho(20, 27, 20, 8, 2);
    galho(14, 20, 8, 21, 1); galho(27, 19, 33, 20, 1);
    // copa: tufos de flores (contorno, amarelo fundo, amarelo claro e brilho)
    const tufos = [[10, 14, 7], [20, 8, 8], [30, 12, 7], [15, 19, 6], [25, 19, 6], [20, 14, 7], [5, 19, 4], [35, 18, 4]];
    tufos.forEach(([x, y, raio]) => circulo(c, x, y, raio + 1, '#8a6a12'));
    tufos.forEach(([x, y, raio]) => bola(c, x, y, raio, ['#b8860b', '#e0a80f', '#f6c628', null]));
    for (let i = 0; i < 40; i++) {
      const [x, y, raio] = tufos[i % tufos.length], a = r() * Math.PI * 2, d = r() * (raio - 1);
      px(c, Math.round(x + Math.cos(a) * d), Math.round(y + Math.sin(a) * d), '#fff07a');
    }
    // galhos aparecendo nos vãos de baixo da copa
    galho(17, 25, 14, 22, 1); galho(23, 25, 26, 22, 1);
    return { arvore: ampliar(cv), chao: ampliar(chao) };
  }

  // Árvore grande com o tronco à mostra (40 x 58 px antes de ampliar): tronco alto e
  // grosso, raízes, dois galhos e a copa verde bem lá em cima. Mesmo jeito do ipê:
  // `chao` é a sombra (por baixo de todos) e o pé do tronco fica em (20, PE_ARVORE_GRANDE).
  const PE_ARVORE_GRANDE = 55;
  function gerarArvoreGrande() {
    const W = 40, H = 58, PE = PE_ARVORE_GRANDE;
    const cv = novoCanvas(W, H), c = cv.getContext('2d');
    const chao = novoCanvas(W, H), g = chao.getContext('2d');
    for (let y = -4; y <= 4; y++) for (let x = -14; x <= 14; x++) {               // sombra da copa no chão
      const miolo = (x * x) / 100 + (y * y) / 9 <= 1, borda = (x * x) / 196 + (y * y) / 16 <= 1 && (x + y) % 2 === 0;
      if (miolo || borda) px(g, 20 + x, PE + y, 'rgba(0, 0, 0, 0.2)');
    }
    const CASCA = '#6b4226', LUZ = '#8a5a34', SOMBRA = '#4a2c18', FUNDO = '#3a2213';
    for (let y = PE; y >= 22; y--) {                                              // tronco: 5 px, luz à esquerda
      ret(c, 18, y, 5, 1, CASCA); px(c, 18, y, LUZ); px(c, 21, y, SOMBRA); px(c, 22, y, FUNDO);
      if (y % 5 === 0) px(c, 19 + (y % 2), y, SOMBRA);                             // sulcos da casca
      if (y % 7 === 3) px(c, 20, y, LUZ);
    }
    ret(c, 16, PE - 1, 9, 2, CASCA); px(c, 15, PE, CASCA); px(c, 25, PE, SOMBRA);   // raízes
    px(c, 16, PE - 1, LUZ); px(c, 24, PE - 1, SOMBRA); ret(c, 17, PE + 1, 7, 1, FUNDO);
    px(c, 20, 40, FUNDO); px(c, 20, 41, FUNDO); px(c, 21, 40, SOMBRA);              // nó na madeira
    const galho = (x0, y0, x1, y1, esp) => {
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
      for (let i = 0; i <= n; i++) {
        const x = Math.round(x0 + (x1 - x0) * i / n), y = Math.round(y0 + (y1 - y0) * i / n);
        ret(c, x, y, esp, esp, CASCA); px(c, x, y, LUZ);
      }
    };
    galho(19, 30, 11, 20, 2); galho(21, 28, 29, 18, 2); galho(20, 24, 20, 12, 2);
    // copa: tufos com contorno escuro e sombreado em degraus
    const tufos = [[11, 15, 8], [29, 14, 8], [20, 9, 9], [15, 21, 7], [25, 21, 7], [20, 16, 8]];
    tufos.forEach(([x, y, r]) => circulo(c, x, y, r + 1, '#163f1a'));
    tufos.forEach(([x, y, r]) => bola(c, x, y, r, ['#1f5e24', '#2f7d32', '#3f9a3f', null]));
    [[8, 12], [14, 7], [22, 5], [27, 11], [17, 15], [24, 17], [12, 19]].forEach(([x, y]) => {   // tufos menores por dentro
      circulo(c, x, y, 2, '#2a7030'); px(c, x - 1, y - 1, '#4fae45'); px(c, x, y - 2, '#6cc35a'); px(c, x - 2, y, '#3f9a3f');
      px(c, x + 1, y + 2, '#1f5e24'); px(c, x + 2, y + 1, '#1f5e24');
    });
    const r = rng(53);
    for (let i = 0; i < 45; i++) {                                                // folhinhas com luz e na sombra
      const [x, y, raio] = tufos[i % tufos.length], a = r() * Math.PI * 2, d = r() * (raio - 1);
      const fx = Math.round(x + Math.cos(a) * d), fy = Math.round(y + Math.sin(a) * d);
      px(c, fx, fy, fy < y ? '#6cc35a' : '#174a1b');
    }
    [[7, 10], [16, 3], [24, 5], [33, 9]].forEach(([x, y]) => px(c, x, y, '#8fdc6a'));   // brilho no alto
    galho(17, 27, 14, 24, 1); galho(23, 27, 26, 24, 1);                          // galhos aparecendo embaixo da copa
    return { arvore: ampliar(cv), chao: ampliar(chao) };
  }

  // Porta aberta (fica por cima do tile 'porta' enquanto um NPC entra ou sai):
  // o batente, o escuro de dentro e a folha de madeira recolhida junto do batente.
  function gerarPortaAberta() {
    const cv = novoCanvas(T, T), c = cv.getContext('2d');
    desenhos.parede(c, 0);
    ret(c, 3, 2, 10, 14, '#3f2414'); ret(c, 3, 2, 1, 14, '#6b4226');   // batente
    ret(c, 4, 3, 8, 13, '#1c1512');                      // o escuro lá dentro
    xadrez(c, 6, 4, 6, 11, '#241b17');                   // um pouco de luz entrando
    ret(c, 4, 3, 8, 1, '#120d0b');
    ret(c, 4, 3, 2, 13, '#7a4a24'); ret(c, 5, 3, 1, 13, '#5f3820');   // folha aberta, encostada no batente
    px(c, 5, 9, '#f2c14e');                              // maçaneta
    return cv;
  }
  // Porta lateral aberta (por cima do tile 'telhadoPortaLateral' enquanto alguém entra
  // ou sai pelo lado direito do prédio): o escuro de dentro e a folha aberta para fora.
  function gerarPortaLateralAberta() {
    const cv = novoCanvas(T, T), c = cv.getContext('2d');
    ladoDoPredio(c, 0, 'telhado', false);
    ret(c, 12, 2, 4, 14, '#4f2f1a');                     // batente
    ret(c, 13, 3, 3, 13, '#1c1512');                     // o escuro lá dentro
    ret(c, 15, 3, 1, 13, '#7a4a24');                     // folha aberta, de lado
    return cv;
  }

  // Portão de grade azul-escuro de duas folhas (cada uma com 1 tile de largura),
  // presas nos pilares. A da esquerda é fixa; a da direita abre para fora (para a
  // rua, que fica embaixo) e leva o trinco, no meio do portão.
  // Cada folha vem numa folha de QUADROS_PORTAO quadros de 16x32 (antes de ampliar):
  // quadro 0 = fechada (ocupa a linha do muro), último = aberta (75°, para a grade
  // continuar visível em vez de virar um risco), apontando para baixo.
  // A dobradiça fica em x = 0 na folha esquerda e em x = 15 na direita.
  const QUADROS_PORTAO = 7, ABERTURA_PORTAO = Math.PI * 75 / 180;
  function desenharFolha(comTrinco) {
    const cv = document.createElement('canvas'); cv.width = 16; cv.height = 16;
    const c = cv.getContext('2d');
    const AZUL = '#1a2b5c', BRILHO = '#3d5a9e';                          // azul-escuro, com reflexo
    ret(c, 0, 2, 16, 2, AZUL); ret(c, 0, 12, 16, 2, AZUL); ret(c, 0, 2, 16, 1, BRILHO);
    ret(c, 0, 1, 2, 13, AZUL); ret(c, 14, 1, 2, 13, AZUL);                // montante da dobradiça e do meio
    for (let x = 3; x < 14; x += 3) {
      ret(c, x, 1, 1, 13, AZUL); px(c, x, 0, BRILHO);                     // barra com ponta
    }
    if (comTrinco) ret(c, 13, 7, 3, 2, '#f6d34a');                        // trinco, no meio do portão
    return cv;
  }
  function gerarFolhaPortao(lado) {
    const base = desenharFolha(lado === 'direita');   // o trinco vai na folha que abre
    const cv = document.createElement('canvas'); cv.width = 16 * QUADROS_PORTAO; cv.height = 32;
    const c = cv.getContext('2d');
    for (let q = 0; q < QUADROS_PORTAO; q++) {
      const ang = ABERTURA_PORTAO * q / (QUADROS_PORTAO - 1);
      const quadro = document.createElement('canvas'); quadro.width = 16; quadro.height = 32;
      const qc = quadro.getContext('2d');
      // gira em torno da dobradiça: cada coluna da folha anda para dentro (cos)
      // e para baixo, na direção da rua (sin). As mais distantes da dobradiça
      // ficam mais perto de quem olha, então são desenhadas por último.
      for (let d = 0; d < 16; d++)
        qc.drawImage(base, d, 0, 1, 16, Math.round(d * Math.cos(ang)), Math.round(d * Math.sin(ang)), 1, 16);
      c.save();
      if (lado === 'direita') { c.translate(16 * q + 16, 0); c.scale(-1, 1); } else c.translate(16 * q, 0);
      c.drawImage(quadro, 0, 0);
      c.restore();
    }
    return cv;
  }

  // Mesa grande de cimento, comprida na vertical, sobre a grama. Tem 2 tiles de
  // largura (lado 'E' e 'D') e o comprimento que tiver no mapa: 'Topo' (borda de
  // trás, com brilho), 'Meio' e 'Base' (frente: espessura do tampo, pé e sombra).
  function mesaDeCimento(c, ox, parte, lado) {
    grama(c, ox, parte === 'Topo' ? 141 : parte === 'Meio' ? 147 : 153);
    const esq = lado === 'E', x0 = esq ? 4 : 0, larg = 12;                 // 4 px de grama nas laterais
    const y0 = parte === 'Topo' ? 4 : 0, y1 = parte === 'Base' ? 8 : T;      // onde o tampo começa/termina
    if (parte === 'Base') {
      ret(c, ox + (esq ? 7 : 0), 12, 9, 2, 'rgba(0, 0, 0, 0.2)');           // sombra
      ret(c, ox + (esq ? 12 : 0), 10, 4, 3, '#4f4b45');                      // pé (metade de cada lado)
    }
    ret(c, ox + x0, y0, larg, y1 - y0, '#7a766e');                           // tampo (cimento escuro)
    if (parte === 'Topo') ret(c, ox + x0, y0, larg, 1, '#928e86');            // brilho da borda de trás
    if (parte === 'Base') ret(c, ox + x0, y1, larg, 2, '#57534d');            // frente do tampo (espessura)
    ret(c, ox + (esq ? 4 : 11), y0, 1, y1 - y0 + (parte === 'Base' ? 2 : 0), '#67635c');   // laterais
    px(c, ox + (esq ? 7 : 6), y0 + 2, '#6b675f'); px(c, ox + (esq ? 12 : 3), y0 + 5, '#6b675f');   // textura
  }

  // Bicicleta estacionada na vertical, sobre o piso, num bicicletário colado ao muro
  // de baixo: a roda de trás encaixada no suporte junto ao muro (embaixo do tile) e a
  // frente virada para o pátio (em cima). Quem olha vê a bicicleta por trás.
  // O trilho do suporte emenda de um tile para o outro, formando o bicicletário.
  function bicicleta(c, ox, cor) {
    fundo(() => desenhos.piso(c, ox));
    ret(c, ox + 5, 12, 6, 2, 'rgba(0, 0, 0, 0.18)');                           // sombra
    ret(c, ox, 14, T, 1, '#6f6b63'); ret(c, ox, 15, T, 1, '#9c978d');            // trilho do suporte, junto ao muro
    ret(c, ox + 7, 1, 2, 5, '#2a1d1a'); px(c, ox + 8, 3, '#55595f');            // roda da frente (mais longe)
    ret(c, ox + 4, 5, 8, 1, '#2a1d1a'); px(c, ox + 3, 5, cor); px(c, ox + 12, 5, cor);   // guidão e manoplas
    ret(c, ox + 7, 6, 2, 3, cor); px(c, ox + 7, 6, '#ffffff');                   // quadro
    ret(c, ox + 6, 8, 4, 2, '#2a1d1a');                                          // selim
    ret(c, ox + 7, 10, 2, 5, '#2a1d1a'); px(c, ox + 8, 12, '#55595f');          // roda de trás (mais perto)
    px(c, ox + 7, 10, '#e94b5a');                                                // refletor
    ret(c, ox + 5, 11, 1, 4, '#6f6b63'); ret(c, ox + 10, 11, 1, 4, '#6f6b63');   // arco que segura a roda
  }

  // Árvore pequena (cabe num quadrado). naTerra: o chão é de terra em vez de grama.
  function arvorePequena(c, ox, naTerra) {
    if (naTerra) {
      fundo(() => desenhos.caminho(c, ox));
      ret(c, ox + 3, 13, 10, 2, 'rgba(0, 0, 0, 0.22)'); xadrez(c, ox + 2, 13, 12, 2, 'rgba(0, 0, 0, 0.12)', ox);
    } else {
      grama(c, ox, 83);
      ret(c, ox + 3, 13, 10, 2, '#3c7a2a'); xadrez(c, ox + 2, 13, 12, 2, '#3c7a2a', ox);   // sombra com borda pontilhada
    }
    ret(c, ox + 6, 10, 4, 5, '#6b4226'); ret(c, ox + 6, 10, 1, 5, '#8a5a34'); ret(c, ox + 9, 10, 1, 5, '#4f2f1a');
    px(c, ox + 7, 12, '#4f2f1a'); px(c, ox + 8, 14, '#4f2f1a');                    // casca
    px(c, ox + 5, 14, '#4f2f1a'); px(c, ox + 10, 14, '#4f2f1a');                    // raízes
    copaPequena(c, ox);
  }

  // Copa da árvore pequena: contorno irregular (tufos saindo da bola), sombreado em
  // degraus, tufos de folhas com luz própria, vãos escuros e brilho na borda de cima.
  const TUFOS_COPA = [[-5, -2], [-3, -5], [1, -6], [5, -4], [6, 0], [4, 4], [-1, 5], [-5, 3]];
  function copaPequena(c, ox) {
    const cx = ox + 8, cy = 7;
    circulo(c, cx, cy, 7, CONTORNO);
    TUFOS_COPA.forEach(([dx, dy]) => circulo(c, cx + Math.round(dx * 1.05), cy + Math.round(dy * 1.05), 2, CONTORNO));
    TUFOS_COPA.forEach(([dx, dy]) => circulo(c, cx + Math.round(dx * 1.05), cy + Math.round(dy * 1.05), 1,
      dx + dy < -2 ? '#3f9a3f' : dx + dy > 2 ? '#1f5e24' : '#2f7d32'));
    bola(c, cx, cy, 6, ['#1f5e24', '#2f7d32', '#3f9a3f', null]);
    [[-3, -2], [1, -3], [3, 1], [-2, 2], [0, 0]].forEach(([dx, dy]) => {          // tufos de folhas por dentro
      const x = cx + dx, y = cy + dy, claro = dx + dy < 0;
      px(c, x, y, claro ? '#4fae45' : '#2a7030'); px(c, x - 1, y, claro ? '#3f9a3f' : '#256a2a');
      px(c, x, y - 1, claro ? '#6cc35a' : '#3f9a3f'); px(c, x + 1, y + 1, '#1f5e24');
    });
    [[-1, 3], [3, -1], [-4, 0], [2, 4]].forEach(([dx, dy]) => px(c, cx + dx, cy + dy, '#174a1b'));   // vãos escuros
    [[-4, -4], [-2, -5], [0, -6], [-5, -2], [-6, -1]].forEach(([dx, dy]) => px(c, cx + dx, cy + dy, '#8fdc6a'));   // luz na borda
    px(c, cx - 3, cy - 4, '#c4f2a0');                                                // brilho
  }

  // Portão grande de correr, azul, com 2 quadrados de largura (E e D), no lugar do muro.
  // Grade de barras verticais, travessas em cima e embaixo, trilho no chão com rodinhas,
  // puxador no meio e a grama do lado de fora aparecendo entre as barras.
  function portaoCorrer(c, ox, lado) {
    grama(c, ox, lado === 'E' ? 171 : 173);                                       // lá fora, entre as barras
    const AZUL = '#2b6cb0', CLARO = '#5b9ae0', ESCURO = '#1d4c80', FUNDO = '#14365c';
    ret(c, ox, 14, T, 2, '#8e8a82'); ret(c, ox, 15, T, 1, '#6f6b63');               // trilho no chão
    for (let x = 1; x < T; x += 3) {                                              // barras
      ret(c, ox + x, 2, 2, 12, AZUL); px(c, ox + x, 2, CLARO); ret(c, ox + x, 3, 1, 11, CLARO);
      ret(c, ox + x + 1, 3, 1, 11, ESCURO); px(c, ox + x, 1, ESCURO); px(c, ox + x + 1, 1, ESCURO);   // ponta
    }
    ret(c, ox, 2, T, 2, AZUL); ret(c, ox, 2, T, 1, CLARO); ret(c, ox, 4, T, 1, FUNDO);   // travessa de cima
    ret(c, ox, 8, T, 1, AZUL); xadrez(c, ox, 9, T, 1, ESCURO);                      // travessa do meio
    ret(c, ox, 12, T, 2, AZUL); ret(c, ox, 12, T, 1, CLARO); ret(c, ox, 13, T, 1, ESCURO);   // travessa de baixo
    if (lado === 'E') {
      ret(c, ox, 1, 2, 13, ESCURO); ret(c, ox, 1, 1, 13, AZUL);                    // montante junto do muro
      ret(c, ox + 14, 1, 2, 13, AZUL); ret(c, ox + 15, 1, 1, 13, FUNDO);            // montante do meio (a folha corre por aqui)
      ret(c, ox + 12, 6, 1, 4, '#c9ced5'); px(c, ox + 12, 6, '#ffffff');            // puxador
      circulo(c, ox + 4, 14, 1, '#3a3f46');                                         // rodinha no trilho
    } else {
      ret(c, ox + 14, 1, 2, 13, ESCURO); ret(c, ox + 15, 1, 1, 13, FUNDO);          // montante junto do muro
      ret(c, ox, 1, 1, 13, CLARO);
      ret(c, ox + 3, 6, 3, 2, '#f6d34a'); px(c, ox + 3, 7, '#b8901c');              // cadeado
      circulo(c, ox + 11, 14, 1, '#3a3f46');
    }
  }

  // Quadra esportiva (vista de cima): piso verde com faixa de fora, linhas brancas,
  // círculo do meio, áreas e gols nas duas pontas (nos lados mais curtos). Fica no chão.
  // colunas/linhas = tamanho em quadrados.
  function gerarQuadra(colunas, linhas) {
    const W = colunas * T, H = linhas * T, deitada = W >= H;
    const cv = novoCanvas(W, H), c = cv.getContext('2d');
    ret(c, 0, 0, W, H, '#b5473a'); salpicar(c, 0, 0, 0, W, H, '#a3402f', '#c55a46');   // faixa de fora (vermelha)
    ret(c, 0, 0, W, 1, '#dc735d'); ret(c, 0, H - 1, W, 1, '#7a2c23');
    const m = 4, x0 = m, y0 = m, w = W - 2 * m, h = H - 2 * m;
    ret(c, x0, y0, w, h, '#2e8b57'); salpicar(c, 0, x0, y0, w, h, '#277a4c', '#36996a');   // piso verde
    for (let i = 0; i < (deitada ? w : h); i += 8) if ((i / 8) % 2)                          // faixas de piso mais claro
      if (deitada) xadrez(c, x0 + i, y0, 8, h, '#33935e'); else xadrez(c, x0, y0 + i, w, 8, '#33935e');
    const BRANCO = '#f4f4ef', cx = Math.floor(W / 2), cy = Math.floor(H / 2);
    ret(c, x0, y0, w, 1, BRANCO); ret(c, x0, y0 + h - 1, w, 1, BRANCO);                  // linhas de fora
    ret(c, x0, y0, 1, h, BRANCO); ret(c, x0 + w - 1, y0, 1, h, BRANCO);
    if (deitada) ret(c, cx, y0, 1, h, BRANCO); else ret(c, x0, cy, w, 1, BRANCO);          // linha do meio
    const raio = Math.max(4, Math.round(Math.min(w, h) * 0.16));
    for (let a = 0; a < 96; a++) px(c, Math.round(cx + Math.cos(a / 96 * Math.PI * 2) * raio), Math.round(cy + Math.sin(a / 96 * Math.PI * 2) * raio), BRANCO);
    ret(c, cx - 1, cy - 1, 2, 2, BRANCO);                                                 // marca do meio
    const area = Math.round(Math.min(w, h) * 0.3), fundoArea = Math.round(Math.min(w, h) * 0.22);
    for (const lado of [0, 1]) {                                                          // áreas, pênaltis e gols
      for (let a = 0; a <= 48; a++) {
        const ang = a / 48 * Math.PI, u = Math.cos(ang) * area, v = Math.sin(ang) * fundoArea;
        if (deitada) px(c, Math.round(lado ? x0 + w - 1 - v : x0 + v), Math.round(cy + u), BRANCO);
        else px(c, Math.round(cx + u), Math.round(lado ? y0 + h - 1 - v : y0 + v), BRANCO);
      }
      const gol = Math.round(Math.min(w, h) * 0.18);
      if (deitada) {
        const gx = lado ? x0 + w : x0 - 3;
        ret(c, gx, cy - gol, 3, gol * 2 + 1, '#d6dbe1'); ret(c, gx + (lado ? 2 : 0), cy - gol, 1, gol * 2 + 1, '#8a9099');   // gol (rede)
        xadrez(c, gx, cy - gol + 1, 3, gol * 2 - 1, '#b8bec6');
        px(c, lado ? x0 + w - 1 - fundoArea - 3 : x0 + fundoArea + 3, cy, BRANCO);       // marca do pênalti
      } else {
        const gy = lado ? y0 + h : y0 - 3;
        ret(c, cx - gol, gy, gol * 2 + 1, 3, '#d6dbe1'); ret(c, cx - gol, gy + (lado ? 2 : 0), gol * 2 + 1, 1, '#8a9099');
        xadrez(c, cx - gol + 1, gy, gol * 2 - 1, 3, '#b8bec6');
        px(c, cx, lado ? y0 + h - 1 - fundoArea - 3 : y0 + fundoArea + 3, BRANCO);
      }
      cesta(lado);
    }
    // cesta de basquete em cada ponta, por cima do gol: tabela branca com o quadradinho,
    // aro laranja e a redinha (vista de cima)
    function cesta(lado) {
      const LARG = 6, ARO = '#f08a24', ESC = '#b0641a';
      if (deitada) {
        const tx = lado ? x0 + w - 2 : x0, dir = lado ? -1 : 1, ax = tx + dir * 4;
        ret(c, tx, cy - LARG, 2, LARG * 2 + 1, '#2a1d1a'); ret(c, tx + (lado ? 0 : 1), cy - LARG + 1, 1, LARG * 2 - 1, '#ffffff');
        ret(c, tx + (lado ? 0 : 1), cy - 2, 1, 5, '#d63c3c');
        ret(c, ax - 2, cy - 2, 5, 5, ARO); ret(c, ax - 1, cy - 1, 3, 3, '#2e8b57');   // aro
        px(c, ax - 2, cy - 2, ESC); px(c, ax + 2, cy + 2, ESC); xadrez(c, ax - 1, cy - 1, 3, 3, '#f4f4ef');   // redinha
        ret(c, lado ? tx + 2 : tx - 2, cy, 2, 1, '#6b737d');                          // braço da tabela
      } else {
        const ty = lado ? y0 + h - 2 : y0, dir = lado ? -1 : 1, ay = ty + dir * 4;
        ret(c, cx - LARG, ty, LARG * 2 + 1, 2, '#2a1d1a'); ret(c, cx - LARG + 1, ty + (lado ? 0 : 1), LARG * 2 - 1, 1, '#ffffff');
        ret(c, cx - 2, ty + (lado ? 0 : 1), 5, 1, '#d63c3c');
        ret(c, cx - 2, ay - 2, 5, 5, ARO); ret(c, cx - 1, ay - 1, 3, 3, '#2e8b57');
        px(c, cx - 2, ay - 2, ESC); px(c, cx + 2, ay + 2, ESC); xadrez(c, cx - 1, ay - 1, 3, 3, '#f4f4ef');
        ret(c, cx, lado ? ty + 2 : ty - 2, 1, 2, '#6b737d');
      }
    }
    return ampliar(cv);
  }

  // Lavatório comprido de cerâmica (2 quadrados), encostado na parede da frente do
  // prédio: azulejos atrás, bancada branca com duas cubas e duas torneiras por quadrado.
  function lavatorio(c, ox, lado) {
    desenhos.parede(c, ox);
    const x0 = lado === 'E' ? 1 : 0, x1 = lado === 'D' ? 15 : T, w = x1 - x0;
    ret(c, ox + x0, 2, w, 7, '#e8f0f4');                                            // azulejos
    for (let x = x0; x < x1; x += 4) ret(c, ox + x, 2, 1, 7, '#b9c6cc');
    ret(c, ox + x0, 5, w, 1, '#b9c6cc'); ret(c, ox + x0, 2, w, 1, '#ffffff');
    xadrez(c, ox + x0 + 1, 3, w - 1, 1, '#f6fafc');
    ret(c, ox + x0, 9, w, 4, '#f4f4ef'); ret(c, ox + x0, 9, w, 1, '#ffffff');       // bancada
    ret(c, ox + x0, 12, w, 1, '#c8c8c0'); ret(c, ox + x0, 13, w, 1, 'rgba(0, 0, 0, 0.25)');
    for (const bx of [3, 10]) {                                                     // duas cubas com torneira
      ret(c, ox + bx - 1, 9, 5, 3, '#c8d2d8'); ret(c, ox + bx, 10, 3, 2, '#9aa7ad'); px(c, ox + bx + 1, 11, '#7d8a90');   // cuba
      ret(c, ox + bx + 1, 6, 1, 3, '#9aa1aa'); px(c, ox + bx + 1, 6, '#e2e5ea');   // cano da torneira
      ret(c, ox + bx, 7, 3, 1, '#c9ced5'); px(c, ox + bx, 7, '#ffffff');            // registro
      px(c, ox + bx + 1, 9, '#8fd3ff');                                            // pingo d'água
    }
    if (lado === 'E') ret(c, ox, 2, 1, 11, '#b9c6cc');
    if (lado === 'D') ret(c, ox + 15, 2, 1, 11, '#9aa7ad');
  }

  // Pneu de trator deitado no chão de terra, usado como canteiro da horta: borracha
  // grossa com garras (cravos) em volta, terra fofa dentro e pés de cebola plantados.
  // variante: 0 ou 1 (muda as cebolas de lugar, para os pneus não ficarem iguais).
  function pneuTrator(c, ox, variante) {
    fundo(() => desenhos.caminho(c, ox));
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {                          // sombra no chão
      const dx = (x + 0.5 - 8.5) / 7.5, dy = (y + 0.5 - 9.5) / 6.5;
      if (dx * dx + dy * dy <= 1 && (x + y) % 2 === 0) px(c, ox + x, y, 'rgba(0, 0, 0, 0.25)');
    }
    const elipse = (cx, cy, rx, ry, cor, so) => {
      for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1 && (!so || so(x, y, dx, dy))) px(c, ox + x, y, cor);
      }
    };
    elipse(8, 9, 7.5, 6.2, '#1c1c20');                                                 // lateral do pneu (espessura)
    elipse(8, 8, 7.5, 6.2, '#2e2e34');                                                 // borracha de cima
    elipse(8, 8, 7.5, 6.2, '#45454d', (x, y, dx, dy) => dy < -0.3 && dx < 0.4);        // luz no alto à esquerda
    elipse(8, 8, 7.5, 6.2, '#3a3a41', (x, y, dx, dy) => dy < 0 && (x + y) % 2 === 0);
    for (let a = 0; a < 16; a++) {                                                     // garras do pneu em volta
      const ang = a / 16 * Math.PI * 2, x = Math.round(8 + Math.cos(ang) * 6.4 - 0.5), y = Math.round(8 + Math.sin(ang) * 5.2 - 0.5);
      px(c, ox + x, y, a % 2 ? '#1c1c20' : '#55555c');
    }
    elipse(8, 8, 4.6, 3.6, '#17171a');                                                 // borda de dentro (funda)
    elipse(8, 8.6, 4.3, 3.1, '#5a3a22');                                               // terra fofa dentro
    elipse(8, 8.6, 4.3, 3.1, '#4a3020', (x, y) => (x + y) % 2 === 0 && y > 8);
    elipse(8, 8.6, 4.3, 3.1, '#6b4a2e', (x, y) => ruido(x, y) === 3);
    const cebola = (x, y) => {                                                         // pé de cebola: bulbo + folhas
      px(c, ox + x, y - 3, '#7fcf55'); px(c, ox + x - 1, y - 2, '#5fb350'); px(c, ox + x + 1, y - 3, '#5fb350');
      px(c, ox + x, y - 2, '#3f9a3f'); px(c, ox + x, y - 1, '#3f9a3f'); px(c, ox + x + 1, y - 2, '#3f9a3f');
      px(c, ox + x, y, '#e8d9e8'); px(c, ox + x + 1, y, '#b06ab3'); px(c, ox + x, y + 1, '#c99ac9');   // bulbo roxinho
    };
    (variante ? [[6, 8], [10, 9], [8, 10]] : [[5, 9], [8, 8], [11, 10]]).forEach(([x, y]) => cebola(x, y));
  }

  // Corredor de cimento por cima do chão, em qualquer direção (até na diagonal).
  // pontos = [[x, y], ...] em quadrados; largura em quadrados. Devolve a imagem e o
  // canto de cima à esquerda (em quadrados), para o motor pôr no lugar.
  function gerarCorredor(pontos, largura) {
    const P = pontos.map(([x, y]) => [x * T, y * T]), r = largura * T / 2;
    const xs = P.map(p => p[0]), ys = P.map(p => p[1]);
    const minX = Math.floor(Math.min(...xs) - r - 1), minY = Math.floor(Math.min(...ys) - r - 1);
    const W = Math.ceil(Math.max(...xs) + r + 1) - minX, H = Math.ceil(Math.max(...ys) + r + 1) - minY;
    const cv = novoCanvas(W, H), c = cv.getContext('2d');
    const dist = (x, y) => {                                                         // distância até a linha
      let m = Infinity;
      for (let i = 0; i < P.length - 1; i++) {
        const [ax, ay] = P[i], [bx, by] = P[i + 1], dx = bx - ax, dy = by - ay;
        const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
        m = Math.min(m, Math.hypot(x - ax - t * dx, y - ay - t * dy));
      }
      return m;
    };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const d = dist(x + minX + 0.5, y + minY + 0.5);
      if (d > r) continue;
      const gx = x + minX, gy = y + minY, k = ruido(gx, gy);
      let cor = k === 0 ? '#a9a49a' : k === 9 ? '#c9c5bc' : '#b9b4aa';                // cimento pontilhado
      if (d > r - 1) cor = '#8e8a82';                                                 // beirada
      else if (d > r - 2 && (gx + gy) % 2 === 0) cor = '#a7a39a';                     // degrau pontilhado
      px(c, x, y, cor);
    }
    return { img: ampliar(cv), x: minX / T, y: minY / T };
  }

  // Banco de cimento fino (uma laje estreita sobre apoios nas pontas), sobre a terra.
  function bancoCimento(c, ox, parte) {
    fundo(() => desenhos.caminho(c, ox));
    const x0 = parte === 'E' ? 1 : 0, x1 = parte === 'D' ? 15 : T, w = x1 - x0;
    xadrez(c, ox + x0, 11, w, 2, 'rgba(0, 0, 0, 0.2)');                            // sombra pontilhada
    if (parte !== 'M') {                                                          // apoios nas pontas
      const ax = parte === 'E' ? 2 : 11;
      ret(c, ox + ax, 9, 3, 3, '#8e8a82'); ret(c, ox + ax, 9, 1, 3, '#a7a39a');
    }
    ret(c, ox + x0, 7, w, 2, '#c9c5bc');                                          // tampo (laje fina)
    ret(c, ox + x0, 7, w, 1, '#e2ded6');                                          // luz na borda de trás
    ret(c, ox + x0, 9, w, 1, '#8e8a82');                                          // espessura da laje
    salpicar(c, ox, x0, 8, w, 1, '#b3afa6', null);
    if (parte === 'E') ret(c, ox + 1, 7, 1, 3, '#a7a39a');
    if (parte === 'D') ret(c, ox + 14, 7, 1, 3, '#8e8a82');
  }

  // Janela de vidro de correr aberta (sem a parede em volta, que vem antes).
  function janelaVidroDetalhe(c, ox) {
    ret(c, ox + 1, 2, 14, 11, '#8a9099');                                   // moldura de alumínio
    ret(c, ox + 2, 3, 12, 9, '#3b302b');                                    // vão aberto: o escuro da sala
    ret(c, ox + 2, 3, 12, 1, '#2a211d');                                    // sombra do batente de cima
    ret(c, ox + 5, 9, 6, 1, '#6b4226');                                     // balcão lá dentro
    ret(c, ox + 2, 3, 3, 9, '#a9daf3'); ret(c, ox + 11, 3, 3, 9, '#93cdec'); // folhas recolhidas nos cantos
    ret(c, ox + 4, 3, 1, 9, '#6b737d'); ret(c, ox + 11, 3, 1, 9, '#6b737d'); // perfil das folhas, na beira do vão
    px(c, ox + 2, 5, '#e8f7ff'); px(c, ox + 3, 4, '#e8f7ff'); px(c, ox + 12, 6, '#e8f7ff'); px(c, ox + 13, 5, '#e8f7ff');   // reflexo
    ret(c, ox + 3, 7, 1, 2, '#3a3a40'); ret(c, ox + 12, 7, 1, 2, '#3a3a40');  // puxadores
    ret(c, ox, 12, T, 2, '#c9c4ba'); ret(c, ox, 12, T, 1, '#e2ded6');        // peitoril (balcão de fora)
  }

  // Cerâmica: 4 peças 8x8 por quadrado. cores = [base, rejunte, brilho, sombra da peça].
  // Cerâmica: 4 peças 8x8 por quadrado, com relevo (borda clara em cima/à esquerda,
  // escura embaixo/à direita) e pontilhado. cores = [base, rejunte, brilho, sombra, pontilhado].
  function ceramica(c, ox, [base, rejunte, brilho, sombra, ponto]) {
    const LARG = 8, ALT = 8;   // tamanho de cada peça (devem dividir 16)
    ret(c, ox, 0, T, T, base);
    for (let y = 0; y < T; y += ALT) for (let x = 0; x < T; x += LARG) {
      ret(c, ox + x, y, LARG, 1, rejunte); ret(c, ox + x, y, 1, ALT, rejunte);                        // rejunte
      ret(c, ox + x + 1, y + 1, LARG - 2, 1, brilho); ret(c, ox + x + 1, y + 1, 1, ALT - 2, brilho);   // borda clara (relevo)
      ret(c, ox + x + 1, y + ALT - 1, LARG - 1, 1, sombra); ret(c, ox + x + LARG - 1, y + 1, 1, ALT - 1, sombra);   // borda escura
      [[3, 4], [5, 3], [4, 5], [5, 5]].forEach(([dx, dy]) => px(c, ox + x + dx, y + dy, ponto));      // pontilhado
    }
    px(c, ox + 12, 4, sombra); px(c, ox + 3, 12, sombra);                                            // manchinhas
  }

  // Bebedouro de inox virado para a esquerda, em pé sobre o piso indicado.
  function bebedouro(c, ox, piso) {
    desenhos[piso](c, ox);
    ret(c, ox + 4, 14, 9, 2, 'rgba(0, 0, 0, 0.2)');                         // sombra
    ret(c, ox + 5, 5, 7, 10, '#b8bec6');                                    // corpo
    ret(c, ox + 5, 5, 2, 10, '#d6dbe1'); ret(c, ox + 11, 5, 1, 10, '#8a9099');   // brilho e sombra do inox
    ret(c, ox + 5, 12, 7, 1, '#8a9099');                                    // rodapé
    ret(c, ox + 4, 3, 9, 3, '#c9ced5'); ret(c, ox + 5, 3, 6, 2, '#7a828c');  // tampo com a cuba
    px(c, ox + 6, 3, '#8fd3ff'); px(c, ox + 8, 4, '#8fd3ff');               // água na cuba
    ret(c, ox + 3, 2, 2, 1, '#6b737d'); px(c, ox + 3, 3, '#6b737d');        // bica, virada para a esquerda
    ret(c, ox + 4, 8, 1, 2, '#2b6cb0');                                     // botão, do lado esquerdo
  }

  // Bancada de pedra (2 quadrados de largura) sobre a cerâmica escura, com panelas de
  // comida em cima: na metade E uma panela tampada e uma de arroz; na D uma de feijão e
  // uma tampada. Um fiozinho de vapor sai das panelas abertas.
  function bancada(c, ox, lado) {
    desenhos.ceramicaEscura(c, ox);
    const esq = lado === 'E', x0 = esq ? 1 : 0, larg = 15;
    ret(c, ox + x0, 13, larg, 2, 'rgba(0, 0, 0, 0.25)');                    // sombra
    ret(c, ox + x0, 9, larg, 4, '#45423f');                                 // frente da bancada (pedra escura)
    ret(c, ox + x0, 12, larg, 1, '#2f2d2b');
    ret(c, ox + x0, 6, larg, 3, '#56534f');                                 // tampo de granito escuro
    ret(c, ox + x0, 6, larg, 1, '#6e6a66');
    [[3, 7], [8, 8], [12, 7], [6, 7], [10, 8]].forEach(([x, y]) => px(c, ox + x, y, '#807c77'));   // pintinhas do granito
    ret(c, ox + (esq ? 1 : 14), 6, 1, 7, '#3a3835');                        // ponta
    const panela = (x, comida) => {                                         // panela de alumínio
      ret(c, ox + x, 3, 5, 4, '#c9ced5'); ret(c, ox + x, 6, 5, 1, '#9aa1aa');
      px(c, ox + x - 1, 4, '#6b737d'); px(c, ox + x + 5, 4, '#6b737d');      // alças
      if (comida) {
        ret(c, ox + x + 1, 3, 3, 1, comida);                                 // comida aparecendo
        px(c, ox + x + 2, 1, 'rgba(255, 255, 255, 0.7)'); px(c, ox + x + 1, 0, 'rgba(255, 255, 255, 0.5)');   // vapor
      } else {
        ret(c, ox + x, 2, 5, 1, '#b0b6bd'); px(c, ox + x + 2, 1, '#6b737d'); // tampa com pegador
      }
    };
    if (esq) { panela(3, null); panela(9, '#f4f1e8'); }      // tampada e arroz
    else { panela(2, '#5a3018'); panela(8, null); }           // feijão e tampada
  }

  // Mesa de ping-pong (2 quadrados de largura) sobre a cerâmica: tampo verde com a
  // borda e a linha do meio brancas, rede no meio (na emenda das duas metades) e pés.
  function pingPong(c, ox, lado) {
    desenhos.ceramica(c, ox);
    const esq = lado === 'E', x0 = esq ? 1 : 0, larg = 15, ponta = esq ? 1 : 14;
    ret(c, ox + (esq ? 2 : 0), 13, 14, 2, 'rgba(0, 0, 0, 0.2)');            // sombra
    ret(c, ox + (esq ? 2 : 12), 11, 2, 3, '#3a3f46');                       // pés, nas pontas
    ret(c, ox + x0, 4, larg, 6, '#2e7d4f');                                 // tampo
    ret(c, ox + x0, 10, larg, 1, '#1f5a38');                                // espessura do tampo
    ret(c, ox + x0, 4, larg, 1, '#ffffff'); ret(c, ox + x0, 9, larg, 1, '#ffffff');   // bordas brancas
    ret(c, ox + ponta, 4, 1, 6, '#ffffff');                                 // borda da ponta
    ret(c, ox + x0, 7, larg, 1, 'rgba(255, 255, 255, 0.7)');                // linha do meio
    const rede = esq ? 15 : 0;                                              // rede, na emenda
    ret(c, ox + rede, 2, 1, 8, '#e6e6e6'); px(c, ox + rede, 2, '#3a3f46'); px(c, ox + rede, 10, '#3a3f46');
  }
  // Mesa de pebolim (2 quadrados de largura) sobre a cerâmica: caixa de madeira, campo
  // verde com linha do meio e gols, varetas atravessando o campo com bonequinhos
  // vermelhos (de um lado) e azuis (do outro), e pés.
  function pebolim(c, ox, lado) {
    desenhos.ceramica(c, ox);
    const esq = lado === 'E', x0 = esq ? 1 : 0, larg = 15;
    ret(c, ox + (esq ? 2 : 0), 13, 14, 2, 'rgba(0, 0, 0, 0.2)');            // sombra
    ret(c, ox + (esq ? 2 : 12), 11, 2, 3, '#4f2f1a');                       // pés
    ret(c, ox + x0, 3, larg, 8, '#8b5a2b');                                 // caixa de madeira
    ret(c, ox + x0, 10, larg, 1, '#5f3820');                                // frente da caixa
    ret(c, ox + x0 + (esq ? 1 : 0), 4, larg - 1, 5, '#3f9a3f');            // campo
    ret(c, ox + (esq ? 15 : 0), 4, 1, 5, '#ffffff');                        // linha do meio
    ret(c, ox + (esq ? 2 : 13), 5, 1, 3, '#ffffff');                        // gol
    const cor = esq ? '#d63c3c' : '#2b6cb0';
    for (const x of esq ? [5, 9, 12] : [3, 6, 10]) {                         // varetas com bonequinhos
      ret(c, ox + x, 2, 1, 10, '#c9ced5');
      px(c, ox + x, 11, '#2a1d1a');                                          // manopla
      px(c, ox + x, 5, cor); px(c, ox + x, 7, cor);
    }
  }

  // Cimento gasto: o piso de cimento com rachaduras finas (cada uma é uma lista de
  // pixels) e lascas (pontinhos), simulando um piso velho de corredor.
  function cimentoGasto(c, ox, racha1, racha2, lascas) {
    fundo(() => desenhos.piso(c, ox));
    [racha1, racha2].forEach(r => r.forEach(([x, y]) => px(c, ox + x, y, '#6f6a62')));
    racha1.slice(1).forEach(([x, y]) => px(c, ox + x, y + 1, 'rgba(255, 255, 255, 0.15)'));   // beirada clara da racha
    lascas.forEach(([x, y]) => { px(c, ox + x, y, '#8a857c'); px(c, ox + x + 1, y, '#9c978d'); });
  }

  // Corrimão de ferro sobre o piso emborrachado, atravessando o quadrado na horizontal,
  // pelo meio: barra de cima, postes de 8 em 8 (emenda com o quadrado do lado) e a
  // sombra no chão.
  // y = altura da barra no quadrado (6 = no meio; 0 = no topo).
  function corrimao(c, ox, y = 6) {
    desenhos.borracha(c, ox);
    ret(c, ox, y + 5, T, 1, 'rgba(0, 0, 0, 0.4)');        // sombra no chão
    for (let x = 3; x < T; x += 8) {                       // postes, da barra até o chão
      ret(c, ox + x, y + 2, 2, 4, '#3a3f46'); px(c, ox + x, y + 2, '#8a929c');
    }
    ret(c, ox, y, T, 2, '#4a5058');                        // barra (o corrimão)
    ret(c, ox, y, T, 1, '#9aa3ad');                        // reflexo do ferro
  }

  // Lado direito de um prédio: à esquerda o que está na frente (parede ou telhado);
  // da quina para a direita, a parede lateral vista de lado (mais escura), com ou sem
  // uma porta virada para a direita. As laterais de cima e de baixo emendam.
  function ladoDoPredio(c, ox, base, comPorta) {
    desenhos[base](c, ox);
    ret(c, ox + 10, 0, 6, T, '#d6bf93');                                     // parede lateral (na sombra)
    salpicar(c, ox, 10, 0, 6, T, '#c4ad80', '#e2cda2');
    for (let y = 3; y < T; y += 4) for (let x = 10; x < T; x++) if ((x + y) % 7) px(c, ox + x, y, '#bba57a');
    ret(c, ox + 10, 0, 1, T, '#9c8460'); xadrez(c, ox + 11, 0, 1, T, '#c4ad80');   // quina do prédio, com degrau
    if (base === 'parede') { ret(c, ox + 10, 12, 6, 2, '#a68e66'); ret(c, ox + 10, 14, 6, 2, '#8a7352'); }   // rodapé (só embaixo)
    if (comPorta) {
      ret(c, ox + 12, 2, 4, 14, '#4f2f1a');                                  // batente (de lado: estreito)
      ret(c, ox + 13, 3, 3, 13, '#7a4a24'); ret(c, ox + 13, 3, 1, 13, '#5f3820');   // porta
      ret(c, ox + 14, 4, 2, 4, '#86542a'); ret(c, ox + 14, 9, 2, 5, '#86542a'); px(c, ox + 14, 4, '#a06c38'); px(c, ox + 14, 9, '#a06c38');   // almofadas
      px(c, ox + 14, 9, '#f2c14e');                                          // maçaneta
    }
  }

  // Pneus cortados, deitados na grama e pintados, com terra e planta dentro. Cada
  // quadrado tem 2 pneuzinhos encostados, então vários quadrados seguidos formam uma
  // fila contínua (o cercado do jardim). fila: 'H' (horizontal) ou 'V' (vertical);
  // cor: qual cor da lista começa (a cor muda de pneu em pneu).
  const CORES_PNEU = [['#d63c3c', '#9e2a2a'], ['#f2c12e', '#b8901c'], ['#2b6cb0', '#1d4c80'],
    ['#8e44ad', '#63307a'], ['#f08a24', '#b0641a']];   // vermelho, amarelo, azul, roxo, laranja
  // espelho: desenha virado da esquerda para a direita (fila vertical encostada no
  // lado esquerdo do quadrado, ou canto em que a fila horizontal segue para a direita).
  function pneus(c, ox, fila, cor, desce, espelho) {
    if (espelho) {
      const tmp = novoCanvas(T, T);
      pneus(tmp.getContext('2d'), 0, fila, cor, desce, false);
      c.save(); c.translate(ox + T, 0); c.scale(-1, 1); c.drawImage(tmp, 0, 0); c.restore();
      return;
    }
    grama(c, ox, 163);
    const elipse = (cx, cy, rx, ry, tinta) => {
      for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) px(c, ox + x, y, tinta);
      }
    };
    const pneu = (cx, cy, k) => {
      const [tinta, escura] = CORES_PNEU[k % CORES_PNEU.length];
      elipse(cx, cy + 2, 4, 1.4, 'rgba(0, 0, 0, 0.2)');   // sombra
      elipse(cx, cy + 1, 4, 2.3, escura);                 // lateral (espessura)
      elipse(cx, cy, 4, 2.3, tinta);                      // borda pintada
      elipse(cx, cy, 2.3, 1, '#4a3020');                  // terra
      px(c, ox + cx - 3, cy - 1, '#ffffff');              // brilho da tinta
    };
    const planta = (cx, cy, k) => {                       // planta saindo da terra
      circulo(c, ox + cx, cy - 2, 2, '#2f7d32');
      px(c, ox + cx - 2, cy - 1, '#3f9a3f'); px(c, ox + cx + 2, cy - 1, '#3f9a3f');
      px(c, ox + cx - 1, cy - 3, '#6cc35a'); px(c, ox + cx + 1, cy - 4, '#6cc35a');
      if (k % 2) px(c, ox + cx + 1, cy - 3, '#f6d34a');   // florzinha em um sim, um não
    };
    // arame que prende os pneus: passa por cima da borda e emenda com o quadrado vizinho
    const fio = (x, y, w, h) => {
      ret(c, ox + x, y, w, h, '#3a3a40');
      for (let i = 0; i < Math.max(w, h); i += 3) px(c, ox + x + (w > 1 ? i : 0), y + (h > 1 ? i : 0), '#9aa0a8');
    };
    if (fila === 'H') {
      pneu(4, 11, cor); pneu(12, 11, cor + 1);
      fio(0, 12, desce ? 10 : T, 1);                       // no canto, para na curva
      if (desce) fio(9, 12, 1, T - 12);                    // e desce pela borda dos pneus de baixo                  // no canto, o arame desce para a fila de baixo
      planta(4, 11, cor); planta(12, 11, cor + 1);
    } else {                                              // o de cima primeiro (o de baixo fica na frente)
      pneu(12, 4, cor); pneu(12, 12, cor + 1);
      fio(9, 0, 1, T);                                    // pela borda esquerda (as plantas ficam no meio)
      planta(12, 4, cor); planta(12, 12, cor + 1);
    }
  }

  // Tenda (pergolado) de madeira coberta de folhas, presa em 4 postes nos cantos.
  // colunas/linhas = distância entre os postes, em tiles. As folhas são ralas:
  // cobrem só parte da cobertura, para o que está embaixo continuar aparecendo, e
  // o chão ganha uma sombra manchada no mesmo desenho das folhas.
  // Medidas em px da arte por código (no jogo, x ESCALA):
  const ALTURA_TENDA = 20, BEIRAL_TENDA = 4;   // altura da cobertura e quanto ela passa dos postes
  function gerarTenda(colunas, linhas, semente) {
    const B = BEIRAL_TENDA, W = colunas * T + 2 * B, H = linhas * T + 2 * B;
    const telhado = novoCanvas(W, H), c = telhado.getContext('2d');
    const mancha = novoCanvas(W, H), m = mancha.getContext('2d');
    // vigas de contorno (na linha dos postes) e ripas atravessadas
    for (let y = B + 3; y < H - B; y += 5) { ret(c, B, y, W - 2 * B, 1, '#8b5a2b'); ret(m, B, y, W - 2 * B, 1, '#000'); }
    [[B, B, W - 2 * B, 1], [B, H - B - 1, W - 2 * B, 1], [B, B, 1, H - 2 * B], [W - B - 1, B, 1, H - 2 * B]]
      .forEach(([x, y, w, h]) => { ret(c, x, y, w, h, '#6b4226'); ret(m, x, y, w, h, '#000'); });
    // folhas: tufos espalhados, deixando vãos
    const r = rng(semente), n = Math.round(W * H / 95);   // menos tufos = folhas mais ralas
    for (let i = 0; i < n; i++) {
      const x = Math.floor(r() * W), y = Math.floor(r() * H), raio = 2 + Math.floor(r() * 3);
      circulo(c, x, y, raio, r() < 0.5 ? '#2f7d32' : '#3f8f3a');
      circulo(c, x - 1, y - 1, Math.max(1, raio - 2), '#5fb350');
      circulo(m, x, y, raio, '#000');
    }
    // sombra no chão: a mancha das folhas e vigas, bem clarinha
    const sombra = novoCanvas(W, H), s = sombra.getContext('2d');
    s.globalAlpha = 0.22; s.drawImage(mancha, 0, 0);
    // poste: madeira, da grama até a cobertura
    const poste = novoCanvas(3, ALTURA_TENDA + 2), p = poste.getContext('2d');
    ret(p, 0, 0, 3, ALTURA_TENDA + 2, '#6b4226'); ret(p, 0, 0, 1, ALTURA_TENDA + 2, '#8b5a2b');
    ret(p, 2, 0, 1, ALTURA_TENDA + 2, '#4f2f1a');
    return { telhado: ampliar(telhado), sombra: ampliar(sombra), poste: ampliar(poste) };
  }

  // A fonte ocupa 2x2 tiles: desenha 32x32 e recorta em quatro.
  function desenharFonte() {
    const cv = document.createElement('canvas'); cv.width = 32; cv.height = 32;
    const c = cv.getContext('2d');
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      c.save(); c.translate(i * 16, j * 16); fundo(() => desenhos.piso(c, 0)); c.restore();
    }
    circulo(c, 16, 16, 15, '#6f6b63'); circulo(c, 16, 16, 14, '#9c978d');
    circulo(c, 16, 16, 11, '#3d7fd6'); circulo(c, 16, 16, 10, '#5aa0e6');
    circulo(c, 16, 16, 3, '#6f6b63'); circulo(c, 16, 15, 2, '#c9c4ba');
    [[16, 10], [15, 9], [17, 9], [12, 13], [20, 13], [11, 18], [21, 18]].forEach(([x, y]) => px(c, x, y, '#ffffff'));
    [[9, 12], [22, 20], [14, 22]].forEach(([x, y]) => ret(c, x, y, 3, 1, '#8cc4f2'));
    return cv;
  }

  // De qual PNG de chão (sprites/tiles/) cada tile tira o fundo.
  // "Inteiros" são só chão; os outros desenham algo por cima dele.
  const CHAO = {
    grama1: 'grama', grama2: 'grama', grama3: 'grama', caminho: 'terra', piso: 'cimento', calcada: 'cimento',
    gramaAlta: 'grama', flores: 'grama', arvore: 'grama', cerca: 'grama', pedra: 'grama', trilho: 'cimento',
    banco: 'cimento', bicicletaVermelha: 'cimento', bicicletaAzul: 'cimento',
    mesaTopoE: 'grama', mesaTopoD: 'grama', mesaMeioE: 'grama', mesaMeioD: 'grama', mesaBaseE: 'grama', mesaBaseD: 'grama',
    ipe: 'grama', cimentoGasto1: 'cimento', cimentoGasto2: 'cimento', cimentoGasto3: 'cimento',
    pneuH1: 'grama', pneuH2: 'grama', pneuH3: 'grama', pneuH4: 'grama', pneuH5: 'grama',
    pneuV1: 'grama', pneuV2: 'grama', pneuV3: 'grama', pneuV4: 'grama', pneuV5: 'grama',
    pneuHB1: 'grama', pneuHB2: 'grama', pneuHB3: 'grama', pneuHB4: 'grama', pneuHB5: 'grama',
    pneuVE1: 'grama', pneuVE2: 'grama', pneuVE3: 'grama', pneuVE4: 'grama', pneuVE5: 'grama',
    pneuHBE1: 'grama', pneuHBE2: 'grama', pneuHBE3: 'grama', pneuHBE4: 'grama', pneuHBE5: 'grama',
    fonteTL: 'cimento', fonteTR: 'cimento', fonteBL: 'cimento', fonteBR: 'cimento',
    mesaMadeira: 'terra', canteiro: 'terra', arvoreTerra: 'terra', pneuTratorA: 'terra', pneuTratorB: 'terra', portaoCorrerE: 'grama', portaoCorrerD: 'grama', bancoCimentoE: 'terra', bancoCimentoM: 'terra', bancoCimentoD: 'terra'
  };
  const INTEIROS = ['grama1', 'grama2', 'grama3', 'caminho', 'piso', 'calcada'];
  // Nomes dos PNGs de chão que o motor procura.
  // O cimento.png entregue é uma cor só, cinza-azulada (#8a9bad), e deixava o cimento
  // azul demais: por enquanto o cimento vem do desenho por código (cinza neutro, com
  // juntas). Quando chegar um cimento.png novo, é só pôr 'cimento' de volta na lista.
  const PNG_TILES = ['grama', 'grama1', 'grama2', 'grama3', 'terra'];

  function novoCanvas(w, h) {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const c = cv.getContext('2d'); c.imageSmoothingEnabled = false;
    return cv;
  }

  // Amplia um canvas por um fator inteiro, pixel por pixel.
  function ampliar(origem, e = ESCALA) {
    const cv = novoCanvas(origem.width * e, origem.height * e);
    cv.getContext('2d').drawImage(origem, 0, 0, cv.width, cv.height);
    return cv;
  }

  // Tileset em TAM x TAM. pngs = { grama: imagem, terra: imagem, ... } (os que existirem).
  function gerarTileset(pngs = {}) {
    const cv = novoCanvas(TAM * TILES.length, TAM), c = cv.getContext('2d');
    const pngDoChao = nome => {
      const chao = CHAO[nome];
      if (!chao) return null;
      if (chao === 'grama') return pngs[INTEIROS.includes(nome) ? nome : 'grama1'] || pngs.grama || pngs.grama1 || null;
      return pngs[chao] || null;
    };
    const fontes = {};
    TILES.forEach((nome, i) => {
      const ox = i * TAM, png = pngDoChao(nome);
      if (png) c.drawImage(png, ox, 0, TAM, TAM);
      if (png && INTEIROS.includes(nome)) return;
      semFundo = !!png;
      const peq = novoCanvas(T, T), pc = peq.getContext('2d');
      if (nome.startsWith('fonte')) {
        const chave = semFundo ? 'sem' : 'com';
        const fonte = fontes[chave] = fontes[chave] || desenharFonte();
        const q = { fonteTL: [0, 0], fonteTR: [16, 0], fonteBL: [0, 16], fonteBR: [16, 16] }[nome];
        pc.drawImage(fonte, q[0], q[1], 16, 16, 0, 0, 16, 16);
      } else desenhos[nome](pc, 0);
      semFundo = false;
      c.drawImage(peq, ox, 0, TAM, TAM);
    });
    return cv;
  }

  // ---------- personagens ----------
  // Letras: h cabelo, s pele, e olho, c camisa, p calça, f sapato.
  const FRENTE = [
    '................',
    '.....hhhhhh.....',
    '....hhhhhhhh....',
    '....hhhhhhhh....',
    '....hssssssh....',
    '....sesssses....',
    '....ssssssss....',
    '.....ssssss.....',
    '....cccccccc....',
    '...sccccccccs...',
    '...sccccccccs...',
    '....cccccccc....',
    '....pppppppp....',
    '....ppp..ppp....',
    '....fff..fff....',
    '................'
  ];
  const COSTAS = FRENTE.map((l, i) =>
    i === 4 || i === 5 ? '....hhhhhhhh....' : i === 6 ? '....shhhhhhs....' : l);
  const LADO = [
    '................',
    '.....hhhhhh.....',
    '....hhhhhhhh....',
    '....hhhhhhhh....',
    '....hhhhssss....',
    '....hhhssses....',
    '....hhssssss....',
    '.....ssssss.....',
    '.....cccccc.....',
    '.....ccsccc.....',
    '.....ccsccc.....',
    '.....cccccc.....',
    '.....pppppp.....',
    '......pppp......',
    '......fffff.....',
    '................'
  ];
  const troca = (base, linhas) => base.map((l, i) => linhas[i] || l);
  // [parado, passo A, passo B] por direção
  const QUADROS = {
    baixo: [FRENTE,
      troca(FRENTE, { 14: '....fff.........' }),
      troca(FRENTE, { 14: '.........fff....' })],
    cima: [COSTAS,
      troca(COSTAS, { 14: '....fff.........' }),
      troca(COSTAS, { 14: '.........fff....' })],
    direita: [LADO,
      troca(LADO, { 13: '.....pp..pp.....', 14: '....ff....fff...' }),
      troca(LADO, { 9: '.....cccscc.....', 10: '.....cccscc.....', 13: '.....pp..pp.....', 14: '....fff...ff....' })]
  };
  // Linhas do spritesheet: 0 baixo, 1 esquerda, 2 direita, 3 cima.
  const DIRECOES = ['baixo', 'esquerda', 'direita', 'cima'];

  function cabeloLongo(linhas, dir) {
    return linhas.map((l, i) => {
      if (i < 4 || i > 8) return l;
      const a = l.split('');
      if (dir === 'baixo') { a[3] = 'h'; a[12] = 'h'; }
      if (dir === 'cima') { for (let x = 4; x <= 11; x++) a[x] = 'h'; a[3] = 'h'; a[12] = 'h'; }
      if (dir === 'direita') { a[4] = 'h'; a[5] = 'h'; }
      return a.join('');
    });
  }

  // Boina: chapéu achatado e meio inclinado por cima do cabelo.
  const BOINA = {
    baixo: { 0: '....bbbbbbb.....', 1: '...bbbbbbbbbb...' },
    cima: { 0: '.....bbbbbbb....', 1: '...bbbbbbbbbb...' },
    direita: { 0: '.....bbbbbb.....', 1: '...bbbbbbbbb....' }
  };

  function desenharQuadro(c, ox, oy, linhas, cores, espelhar) {
    const mapa = { b: cores.boina, h: cores.cabelo, s: cores.pele, e: '#1b1b2a', c: cores.camisa, p: cores.calca, f: cores.sapato || '#3a2a22' };
    const cheio = (x, y) => y >= 0 && y < T && x >= 0 && x < T && linhas[y][espelhar ? T - 1 - x : x] !== '.';
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      if (cheio(x, y)) px(c, ox + x, oy + y, mapa[linhas[y][espelhar ? T - 1 - x : x]]);
      else if (cheio(x - 1, y) || cheio(x + 1, y) || cheio(x, y - 1) || cheio(x, y + 1)) px(c, ox + x, oy + y, CONTORNO);
    }
  }

  // Devolve um canvas 192x256: colunas = quadros, linhas = direções (TAM por quadro).
  function gerarPersonagem(cores) {
    return ampliar(desenharPersonagem(cores));
  }
  function desenharPersonagem(cores) {
    const cv = document.createElement('canvas'); cv.width = T * 3; cv.height = T * 4;
    const c = cv.getContext('2d');
    DIRECOES.forEach((dir, linha) => {
      const base = dir === 'esquerda' ? 'direita' : dir;
      QUADROS[base].forEach((q, col) => {
        let l = cores.cabeloLongo ? cabeloLongo(q, base) : q;
        if (cores.boina) l = troca(l, BOINA[base]);
        desenharQuadro(c, col * T, linha * T, l, cores, dir === 'esquerda');
      });
    });
    return cv;
  }

  // Monta a folha do motor a partir do PNG do aluno: 7 quadros de TAM numa linha
  // (baixo parado, baixo passo A, cima parado, cima passo A, direita parado/A/B).
  // A esquerda é a direita espelhada; o passo B de baixo/cima é o passo A espelhado.
  function montarPersonagem(img) {
    const cv = novoCanvas(TAM * 3, TAM * 4), c = cv.getContext('2d');
    const quadro = (f, col, linha, espelhar) => {
      const x = col * TAM, y = linha * TAM;
      c.save();
      if (espelhar) { c.translate(x + TAM, y); c.scale(-1, 1); } else c.translate(x, y);
      c.drawImage(img, f * TAM, 0, TAM, TAM, 0, 0, TAM, TAM);
      c.restore();
    };
    const usar = { baixo: [[0], [1], [1, true]], cima: [[2], [3], [3, true]],
      direita: [[4], [5], [6]], esquerda: [[4, true], [5, true], [6, true]] };
    DIRECOES.forEach((dir, linha) => usar[dir].forEach(([f, esp], col) => quadro(f, col, linha, !!esp)));
    return cv;
  }

  // Balão "E" que aparece sobre quem dá para conversar (11x11).
  function gerarBalao() {
    const cv = document.createElement('canvas'); cv.width = 11; cv.height = 12;
    const c = cv.getContext('2d');
    ret(c, 1, 0, 9, 10, CONTORNO); ret(c, 0, 1, 11, 8, CONTORNO); ret(c, 4, 10, 3, 1, CONTORNO); px(c, 5, 11, CONTORNO);
    ret(c, 1, 1, 9, 8, '#fff8e7'); ret(c, 5, 9, 1, 1, '#fff8e7');
    ret(c, 3, 2, 1, 6, CONTORNO); ret(c, 3, 2, 5, 1, CONTORNO); ret(c, 3, 4, 4, 1, CONTORNO); ret(c, 3, 7, 5, 1, CONTORNO);
    return cv;
  }

  // Seta que marca a saída para outro bloco (aponta para a direita, 9x9).
  function gerarSeta() {
    const cv = document.createElement('canvas'); cv.width = 9; cv.height = 9;
    const c = cv.getContext('2d');
    const forma = ['...#.....', '...##....', '#######..', '########.', '#########', '########.', '#######..', '...##....', '...#.....'];
    const cheio = (x, y) => forma[y] && forma[y][x] === '#';
    for (let y = 0; y < 9; y++) for (let x = 0; x < 9; x++) {
      if (!cheio(x, y)) continue;
      const borda = !cheio(x - 1, y) || !cheio(x + 1, y) || !cheio(x, y - 1) || !cheio(x, y + 1);
      px(c, x, y, borda ? CONTORNO : '#f6d34a');
    }
    return cv;
  }

  const QUADROS_PNG = 7;
  return {
    T: TAM, TILES, DIRECOES, PNG_TILES, QUADROS_PNG, ampliar, gerarTileset, gerarPersonagem, montarPersonagem,
    gerarBalao: () => ampliar(gerarBalao()), gerarSeta: () => ampliar(gerarSeta()),
    QUADROS_PORTAO, gerarFolhaPortao: lado => ampliar(gerarFolhaPortao(lado)),
    gerarTenda, ALTURA_TENDA, BEIRAL_TENDA, ESCALA, gerarPortaAberta: () => ampliar(gerarPortaAberta()),
    gerarPortaLateralAberta: () => ampliar(gerarPortaLateralAberta()),
    gerarIpe, PE_IPE, gerarArvoreGrande, PE_ARVORE_GRANDE,
    gerarFolha: seca => {                    // folhinha que cai das árvores (4 x 3 px da arte)
      const cv = novoCanvas(4, 3), c = cv.getContext('2d');
      const [esc, med, cla] = seca ? ['#9a6a1c', '#c9a227', '#ecd27a'] : ['#1f5e24', '#3f9a3f', '#7fcf55'];
      ret(c, 1, 0, 2, 1, cla); ret(c, 0, 1, 3, 1, med); px(c, 3, 1, esc); ret(c, 1, 2, 2, 1, esc);
      return ampliar(cv);
    }, gerarQuadra, gerarCorredor, gerarPlaca: (t, cor) => ampliar(gerarPlaca(t, cor), 2), POSTE_PLACA,
    gerarLetreiro: (t, cor) => ampliar(gerarLetreiro(t, cor))
  };
})();
