// Vila Pixel — arte em pixel.
// O jogo usa tiles e quadros de personagem de 32x32 (TAM). Quando existe o PNG
// feito pelos alunos (sprites/tiles/*.png, sprites/personagens/*.png), ele é usado;
// o que falta é desenhado aqui por código em 16x16 e ampliado 2x (sem borrar).
//
// Folha de personagem usada pelo motor: 3 colunas (parado, passo A, passo B)
// x 4 linhas (DIRECOES), quadros de TAM x TAM.
window.VilaArte = (function () {
  const T = 16;                 // tamanho em que a arte por código é desenhada
  const ESCALA = 2, TAM = T * ESCALA;   // tamanho no jogo (32)
  const CONTORNO = '#2a1d1a';

  // Ordem dos tiles no tileset (o índice é a posição na lista).
  const TILES = [
    'grama1', 'grama2', 'grama3', 'gramaAlta', 'flores', 'caminho', 'arvore',
    'agua', 'cerca', 'pedra', 'telhado', 'parede', 'janela', 'porta', 'piso',
    'fonteTL', 'fonteTR', 'fonteBL', 'fonteBR', 'banco', 'areia', 'ponte',
    'muro', 'pilar', 'trilho', 'calcada', 'asfalto', 'bicicletaVermelha', 'bicicletaAzul'
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
    arvore: (c, ox) => {
      grama(c, ox, 83);
      ret(c, ox + 3, 13, 10, 2, '#3c7a2a');        // sombra
      ret(c, ox + 6, 10, 4, 5, '#6b4226'); ret(c, ox + 6, 10, 1, 5, '#4f2f1a');
      circulo(c, ox + 8, 7, 7, CONTORNO);
      circulo(c, ox + 8, 7, 6, '#2f7d32');
      circulo(c, ox + 7, 6, 4, '#3f9a3f');
      [[5, 4], [6, 3], [8, 4], [4, 6], [10, 5]].forEach(([x, y]) => px(c, ox + x, y, '#6cc35a'));
    },
    agua: (c, ox) => {
      ret(c, ox, 0, T, T, '#3d7fd6');
      [[1, 3], [9, 2], [4, 8], [11, 10], [2, 13], [8, 14]].forEach(([x, y]) => ret(c, ox + x, y, 4, 1, '#6aa8ec'));
      [[6, 5], [13, 6], [3, 11], [12, 13]].forEach(([x, y]) => px(c, ox + x, y, '#2f68b8'));
    },
    cerca: (c, ox) => {
      grama(c, ox, 97);
      ret(c, ox, 5, T, 2, '#a0703c'); ret(c, ox, 10, T, 2, '#a0703c');
      ret(c, ox, 7, T, 1, '#5a3a1a'); ret(c, ox, 12, T, 1, '#5a3a1a');
      [2, 12].forEach(x => { ret(c, ox + x, 2, 3, 12, '#8b5a2b'); ret(c, ox + x, 2, 3, 1, '#c08a4c'); ret(c, ox + x + 2, 3, 1, 11, '#5a3a1a'); });
    },
    pedra: (c, ox) => {
      grama(c, ox, 101);
      ret(c, ox + 3, 12, 11, 2, '#3c7a2a');
      circulo(c, ox + 8, 9, 5, '#55595f'); circulo(c, ox + 8, 9, 4, '#8a8f98');
      circulo(c, ox + 7, 8, 2, '#b0b5bd');
    },
    telhado: (c, ox) => {
      ret(c, ox, 0, T, T, '#b5473a');
      for (let y = 3; y < T; y += 4) ret(c, ox, y, T, 1, '#8e352b');
      for (let y = 0; y < T; y += 4) for (let x = (y / 4) % 2 ? 2 : 6; x < T; x += 8) ret(c, ox + x, y, 1, 3, '#8e352b');
      for (let y = 1; y < T; y += 4) ret(c, ox, y, T, 1, '#c95d4f');
    },
    parede: (c, ox) => {
      ret(c, ox, 0, T, T, '#e8d3a8');
      for (let y = 3; y < T; y += 4) ret(c, ox, y, T, 1, '#c9b082');
      ret(c, ox, 14, T, 2, '#9c8460');
    },
    janela: (c, ox) => {
      desenhos.parede(c, ox);
      ret(c, ox + 3, 3, 10, 9, '#6b4226'); ret(c, ox + 4, 4, 8, 7, '#8fd3ff');
      ret(c, ox + 7, 4, 1, 7, '#6b4226'); ret(c, ox + 4, 7, 8, 1, '#6b4226');
      px(c, ox + 5, 5, '#ffffff'); px(c, ox + 9, 5, '#ffffff');
    },
    porta: (c, ox) => {
      desenhos.parede(c, ox);
      ret(c, ox + 3, 2, 10, 14, '#4f2f1a'); ret(c, ox + 4, 3, 8, 13, '#7a4a24');
      ret(c, ox + 7, 3, 1, 13, '#5f3820'); px(c, ox + 10, 9, '#f2c14e');
    },
    piso: (c, ox) => {
      ret(c, ox, 0, T, T, '#b9b4aa');
      ret(c, ox, 7, T, 1, '#9c978d'); ret(c, ox, 15, T, 1, '#9c978d');
      ret(c, ox + 7, 0, 1, 7, '#9c978d'); ret(c, ox + 3, 8, 1, 7, '#9c978d'); ret(c, ox + 11, 8, 1, 7, '#9c978d');
      px(c, ox + 2, 2, '#ccc8bf'); px(c, ox + 10, 3, '#ccc8bf'); px(c, ox + 6, 11, '#ccc8bf');
    },
    banco: (c, ox) => {
      fundo(() => desenhos.piso(c, ox));
      ret(c, ox + 1, 4, 14, 2, '#6b4226');               // encosto
      ret(c, ox + 1, 7, 14, 4, '#a0703c'); ret(c, ox + 1, 10, 14, 1, '#5a3a1a');
      ret(c, ox + 2, 11, 2, 4, '#4f2f1a'); ret(c, ox + 12, 11, 2, 4, '#4f2f1a');
    },
    areia: (c, ox) => pontilhado(c, ox, '#e3cf8f', ['#cdb877', '#f1e2ad', '#cdb877'], 16, 113),
    ponte: (c, ox) => {
      ret(c, ox, 0, T, T, '#a0703c');
      for (let x = 3; x < T; x += 4) ret(c, ox + x, 0, 1, T, '#7a5230');
      px(c, ox + 1, 4, '#c08a4c'); px(c, ox + 9, 11, '#c08a4c'); px(c, ox + 13, 6, '#5a3a1a');
    },
    // muro da escola: branco, com a listra azul que sai do portão
    muro: (c, ox) => {
      ret(c, ox, 0, T, T, '#f2f0ea');
      ret(c, ox, 0, T, 2, '#ffffff'); ret(c, ox, 2, T, 1, '#c9c4ba');     // capa de cima
      ret(c, ox, 8, T, 3, '#2b6cb0'); ret(c, ox, 8, T, 1, '#4a8bd6');     // listra azul
      ret(c, ox, 14, T, 1, '#dcd8ce'); ret(c, ox, 15, T, 1, '#b9b4aa');   // rodapé
      px(c, ox + 4, 5, '#e3e0d8'); px(c, ox + 12, 12, '#e3e0d8');
    },
    // pilar do portão: liso (é dele que a listra começa), com luminária
    pilar: (c, ox) => {
      ret(c, ox, 0, T, T, '#f7f5f0');
      ret(c, ox, 0, T, 3, '#ffffff'); ret(c, ox, 3, T, 1, '#c9c4ba');
      ret(c, ox, 0, 1, T, '#c9c4ba'); ret(c, ox + 15, 0, 1, T, '#c9c4ba');
      ret(c, ox, 15, T, 1, '#b9b4aa');
      ret(c, ox + 6, 5, 4, 3, '#2a1d1a'); ret(c, ox + 7, 6, 2, 1, '#f6d34a'); // luminária
    },
    bicicletaVermelha: (c, ox) => bicicleta(c, ox, '#d63c3c'),
    bicicletaAzul: (c, ox) => bicicleta(c, ox, '#2b6cb0'),
    trilho: (c, ox) => {
      fundo(() => desenhos.caminho(c, ox));
      ret(c, ox, 12, T, 1, '#6f6b63'); ret(c, ox, 13, T, 1, '#b9b4aa');
    },
    calcada: (c, ox) => {
      ret(c, ox, 0, T, T, '#a7a39a');
      ret(c, ox, 7, T, 1, '#8e8a82'); ret(c, ox, 15, T, 1, '#8e8a82'); ret(c, ox + 7, 0, 1, T, '#8e8a82'); ret(c, ox + 15, 0, 1, T, '#8e8a82');
      px(c, ox + 3, 3, '#bcb8ae'); px(c, ox + 11, 10, '#bcb8ae');
    },
    asfalto: (c, ox) => {
      pontilhado(c, ox, '#4a4a52', ['#3e3e45', '#57575f'], 14, 131);
      ret(c, ox + 3, 9, 9, 2, '#f6d34a');
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
    ' ': ['..', '..', '..', '..', '..']
  };
  const TIL = ['.#.#', '#.#.'];   // ~ por cima da letra (Ã, Õ)
  const SEM_TIL = { 'Ã': 'A', 'Õ': 'O' };

  // Letreiro pintado direto no muro: uma linha, letras azuis de 3x5 sobre o
  // branco (acima da listra), fundo transparente. Altura 7: 2 linhas para o
  // til (Ã, Õ) + 5 da letra.
  function gerarLetreiro(texto, cor) {
    const chars = [...texto.toUpperCase()];
    const larg = chars.reduce((s, ch) => s + (FONTE[SEM_TIL[ch] || ch] || FONTE.A)[0].length + 1, -1);
    const cv = document.createElement('canvas'); cv.width = larg; cv.height = 7;
    const c = cv.getContext('2d');
    let x = 0;
    chars.forEach(ch => {
      const g = FONTE[SEM_TIL[ch] || ch] || FONTE.A;
      const desenhar = (forma, oy) => forma.forEach((l, gy) => [...l].forEach((p, gx) => {
        if (p === '#') px(c, x + gx, oy + gy, cor);
      }));
      desenhar(g, 2);
      if (SEM_TIL[ch]) desenhar(TIL, 0);
      x += g[0].length + 1;
    });
    return cv;
  }

  // Folha do portão de grade (32x16, fundo transparente), que desliza ao abrir.
  function gerarGrade() {
    const cv = document.createElement('canvas'); cv.width = 32; cv.height = 16;
    const c = cv.getContext('2d');
    ret(c, 0, 2, 32, 2, '#2f3640'); ret(c, 0, 12, 32, 2, '#2f3640'); ret(c, 0, 2, 32, 1, '#5d6b7a');
    ret(c, 0, 2, 2, 12, '#2f3640'); ret(c, 30, 2, 2, 12, '#2f3640');
    for (let x = 3; x < 30; x += 3) {
      ret(c, x, 1, 1, 13, '#2f3640'); px(c, x, 0, '#5d6b7a');            // barra com ponta
    }
    ret(c, 25, 7, 3, 2, '#f6d34a');                                        // cadeado/trinco
    return cv;
  }

  // Bicicleta estacionada no suporte (vista de lado), sobre o piso.
  function bicicleta(c, ox, cor) {
    fundo(() => desenhos.piso(c, ox));
    ret(c, ox, 6, T, 1, '#6f6b63'); ret(c, ox + 1, 6, 1, 9, '#6f6b63'); ret(c, ox + 14, 6, 1, 9, '#6f6b63'); // suporte
    [[4, 11], [12, 11]].forEach(([x, y]) => {
      circulo(c, ox + x, y, 3, '#2a1d1a'); circulo(c, ox + x, y, 1, '#b9b4aa'); px(c, ox + x, y, '#2a1d1a');
    });
    // quadro, selim e guidão
    for (let i = 0; i <= 6; i++) px(c, ox + 4 + i, 11 - Math.floor(i / 2), cor);
    for (let i = 0; i <= 4; i++) px(c, ox + 8 + i, 8 + Math.floor(i * 3 / 4), cor);
    ret(c, ox + 6, 8, 5, 1, cor);
    ret(c, ox + 5, 7, 3, 1, '#2a1d1a');
    ret(c, ox + 11, 6, 1, 2, '#2a1d1a'); ret(c, ox + 10, 6, 3, 1, '#2a1d1a');
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
    gramaAlta: 'grama', flores: 'grama', arvore: 'grama', cerca: 'grama', pedra: 'grama', trilho: 'terra',
    banco: 'cimento', bicicletaVermelha: 'cimento', bicicletaAzul: 'cimento',
    fonteTL: 'cimento', fonteTR: 'cimento', fonteBL: 'cimento', fonteBR: 'cimento'
  };
  const INTEIROS = ['grama1', 'grama2', 'grama3', 'caminho', 'piso', 'calcada'];
  // Nomes dos PNGs de chão que o motor procura.
  const PNG_TILES = ['grama', 'grama1', 'grama2', 'grama3', 'terra', 'cimento'];

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

  // Devolve um canvas 96x128: colunas = quadros, linhas = direções (TAM por quadro).
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
    gerarGrade: () => ampliar(gerarGrade()), gerarLetreiro: (t, cor) => ampliar(gerarLetreiro(t, cor))
  };
})();
