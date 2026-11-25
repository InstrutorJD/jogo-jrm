// CEPI JRM — motor do protótipo (Phaser 3).
//
// O mundo é dividido em BLOCOS (Bloco A, B e C), como as áreas do Stardew
// Valley: só o bloco onde o jogador está fica montado na tela. Os dados de
// cada bloco moram num arquivo próprio (blocos/<id>.js, ao lado deste arquivo) e só são
// baixados quando o jogador entra nele pela primeira vez — ver carregarBloco().
//
// Formato de um bloco (VilaPixel.registrarBloco):
//   id, nome, subtitulo
//   mapa:   lista de linhas de texto, 1 caractere = 1 tile (legenda abaixo)
//   inicio: { x, y }            onde o jogador nasce (só no bloco inicial)
//   saidas: [{ x, y, w, h, para, chegada: { x, y, dir } }]  em tiles
//   npcs:   [{ id, nome, cores, x, y, raio, conversas: [[fala, ...], ...] }]
//           opcionais: fixo (não passeia), alcance (px para conversar),
//           abre (id de um portão que ele abre ao conversar).
//           Nas falas, {nome} vira o primeiro nome do aluno (?name= da URL).
//   portoes: [{ id, x, y }]  portão de grade de 2 tiles: folha esquerda fixa, a direita abre para fora; começa fechado
//
// Arte: tiles e quadros de 64x64. Os PNGs de sprites/ (feitos pelos alunos)
// são usados quando existem; o que falta vem do arte.js — ver carregarPng().
window.VilaPixel = (function () {
  const T = VilaArte.T;                        // 64
  const LARGURA = 1536, ALTURA = 864;          // área de jogo de referência (24 x 13,5 tiles)
  const VEL_JOGADOR = 320, VEL_CORRENDO = 520, VEL_NPC = 112;   // px/s
  const DIST_CONVERSA = 88;                    // px entre os pés

  // Legenda do mapa → nome do tile (ver VilaArte.TILES).
  const LEGENDA = {
    '.': 'grama', ',': 'gramaAlta', '"': 'flores', '=': 'caminho', '#': 'arvore',
    '~': 'agua', 'F': 'cerca', 'r': 'pedra', 'R': 'telhado', 'W': 'parede',
    'w': 'janela', 'D': 'porta', 'p': 'piso', 'o': 'fonte', 'b': 'banco',
    'a': 'areia', 'x': 'ponte', 'M': 'muro', 'P': 'pilar', 'G': 'trilho',
    'c': 'calcada', 'e': 'asfalto', 'z': 'faixa', 'k': 'bicicletaVermelha', 'K': 'bicicletaAzul',
    'q': 'mesa', 'n': 'borracha', 'y': 'pneu', 'v': 'janelaVidro', 'B': 'bebedouro', 'L': 'portaLateral', 'J': 'telhadoPortaLateral', 'H': 'paredeLateral', 'h': 'telhadoLateral',
    'i': 'borrachaCorrimao', 'I': 'borrachaCorrimaoTopo', 'C': 'ceramica', 'm': 'mesaPlastico', 'E': 'ceramicaEscura', 'Q': 'bancada', 'Y': 'ipe', 't': 'pingPong', 'f': 'pebolim', 'g': 'cimentoGasto'
  };
  const SOLIDOS = ['telhadoPx', 'paredePx', 'portaPx', 'janelaVidroPx', 'bebedouroEscuro', 'bancadaE', 'bancadaD', 'ipe', 'pingPongE', 'pingPongD', 'pebolimE', 'pebolimD', 'portaLateral', 'telhadoPortaLateral', 'paredeLateral', 'telhadoLateral', 'janelaVidro', 'bebedouro', 'arvore', 'agua', 'cerca', 'pedra', 'telhado', 'parede', 'janela', 'porta',
    'banco', 'fonteTL', 'fonteTR', 'fonteBL', 'fonteBR', 'muro', 'pilar',
    'bicicletaVermelha', 'bicicletaAzul', 'mesaTopoE', 'mesaTopoD', 'mesaMeioE', 'mesaMeioD', 'mesaBaseE', 'mesaBaseD',
    'pneuH1', 'pneuH2', 'pneuH3', 'pneuH4', 'pneuH5', 'pneuV1', 'pneuV2', 'pneuV3', 'pneuV4', 'pneuV5',
    'pneuHB1', 'pneuHB2', 'pneuHB3', 'pneuHB4', 'pneuHB5',
    'pneuVE1', 'pneuVE2', 'pneuVE3', 'pneuVE4', 'pneuVE5', 'pneuHBE1', 'pneuHBE2', 'pneuHBE3', 'pneuHBE4', 'pneuHBE5'];

  // Nome do estudante: digitado na tela inicial (ou ?name=... da URL, quando o portal abre o jogo).
  // O primeiro nome vira {nome} nas falas, para os NPCs chamarem o estudante por ele.
  const PARAMS = new URLSearchParams(location.search);
  const NOME_DA_URL = (PARAMS.get('name') || '').trim();
  const primeiroNome = s => (s || '').trim().split(/\s+/)[0];
  let nomeAluno = primeiroNome(NOME_DA_URL) || 'estudante';
  // ---------- relógio e dias do jogo ----------
  // O Dia 1 começa às 06:55, com o estudante do lado de fora. Das 07:00 às 14:00
  // passam DURACAO_AULAS minutos reais (o relógio anda no mesmo ritmo o dia todo).
  // Depois de entrar, só dá para sair a partir de FIM_AULAS. A partir do Dia 2, o
  // estudante já começa dentro da escola, às INICIO_DIA.
  // Tudo em minutos do dia (ex.: 7 * 60 = 07:00). Para na pausa (a cena fica parada).
  const INICIO_DIA1 = 6 * 60 + 55, INICIO_DIA = 7 * 60, FIM_AULAS = 14 * 60;
  const DURACAO_AULAS = 15;                                                  // minutos reais
  const MINUTOS_POR_SEGUNDO = (FIM_AULAS - INICIO_DIA) / (DURACAO_AULAS * 60);
  const relogio = { dia: 1, min: INICIO_DIA1, entrou: false, avisouSaida: false, vel: 1 };
  // Velocidades do relógio (tecla T ou menu de pausa): só o tempo acelera, não o movimento.
  const VELOCIDADES = [1, 2, 5, 10, 30];
  function mudarVelocidade() {
    relogio.vel = VELOCIDADES[(VELOCIDADES.indexOf(relogio.vel) + 1) % VELOCIDADES.length];
    mostrarRelogio();
  }
  const doisDigitos = n => String(n).padStart(2, '0');
  const hora = m => doisDigitos(Math.floor(m / 60) % 24) + ':' + doisDigitos(Math.floor(m % 60));
  const podeSair = () => relogio.min >= FIM_AULAS;

  // Variáveis que podem aparecer nas falas. Uma variável desconhecida fica como está na tela.
  // {aluno} continua valendo para as falas antigas.
  const VARIAVEIS = {
    nome: () => nomeAluno,
    estudante: () => nomeAluno,
    aluno: () => nomeAluno,
    horario: () => hora(relogio.min),     // hora do jogo
    dia: () => String(relogio.dia)
  };
  const preencher = fala => fala.replace(/\{(\w+)\}/g, (m, k) => VARIAVEIS[k] ? VARIAVEIS[k]() : m);

  // localStorage pode falhar (aba anônima, site bloqueado): o jogo segue sem lembrar.
  const guardar = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const lembrar = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };

  // Série do aluno (1, 2 ou 3): ?ano=2 na URL, ou escolhida na tela inicial.
  const serieValida = s => ['1', '2', '3'].includes(String(s)) ? String(s) : null;
  let serie = serieValida(PARAMS.get('ano') || PARAMS.get('serie'));
  const SERIE_DA_URL = !!serie;

  // Pasta onde este motor.js está: os blocos ficam em <pasta>/blocos/.
  // Assim funciona tanto com o jogo na raiz quanto dentro de vila-pixel/ no portal.
  const BASE = ((document.currentScript && document.currentScript.src) || '').replace(/[^/]*$/, '');

  const blocos = {};          // dados já carregados, por id
  const memoria = {};         // o que muda enquanto se joga (posição dos NPCs, conversas)
  const idx = nome => VilaArte.TILES.indexOf(nome);

  function registrarBloco(dados) { blocos[dados.id] = dados; }

  // ---------- PNGs de sprites/ ----------
  // Cada PNG é procurado uma vez; o que não existe (ou está no tamanho errado)
  // fica de fora e o jogo usa a arte do arte.js. Erros 404 no console para os
  // PNGs que ainda não foram feitos são normais.
  const pngs = { tiles: {}, personagens: {} };
  let avisouArquivo = false;
  function carregarPng(caminho, larg, alt) {
    return new Promise(ok => {
      const img = new Image();
      img.onerror = () => ok(null);
      img.onload = () => {
        if (img.width !== larg || img.height !== alt) {
          console.warn('[VilaPixel] ' + caminho + ' tem ' + img.width + 'x' + img.height + ', mas precisa ter ' + larg + 'x' + alt +
            ' — passe pelo ferramentas/verificar-tiles.js. Usando a arte padrão.');
          return ok(null);
        }
        // Aberto direto do arquivo (file://), o navegador não deixa o jogo usar o PNG.
        try { const c = document.createElement('canvas').getContext('2d'); c.drawImage(img, 0, 0); c.getImageData(0, 0, 1, 1); }
        catch (e) {
          if (!avisouArquivo) console.warn('[VilaPixel] Para usar os PNGs de sprites/, abra o jogo por um servidor (npx serve .), não direto do arquivo.');
          avisouArquivo = true;
          return ok(null);
        }
        console.log('[VilaPixel] usando ' + caminho);
        ok(img);
      };
      img.src = BASE + caminho;
    });
  }
  function carregarTiles() {
    return Promise.all(VilaArte.PNG_TILES.map(nome =>
      carregarPng('sprites/tiles/' + nome + '.png', T, T).then(img => { if (img) pngs.tiles[nome] = img; })));
  }
  function carregarPersonagens(ids) {
    return Promise.all(ids.filter(id => !(id in pngs.personagens)).map(id => {
      pngs.personagens[id] = null;
      return carregarPng('sprites/personagens/' + id + '.png', T * VilaArte.QUADROS_PNG, T).then(img => { pngs.personagens[id] = img; });
    }));
  }

  // ---------- falas de dialogos/<id>.json ----------
  // Se o arquivo existe e está certo, as falas dele substituem as `conversas`
  // do bloco (e o "nome" dele, se não estiver vazio). Senão, valem as do bloco.
  const dialogos = {};
  const conversaValida = c => Array.isArray(c) && c.length && c.every(f => typeof f === 'string' && f.trim());
  // As falas ficam em subpastas por grupo (ver INSTRUCOES.md): o jogo procura o
  // <id>.json em cada uma, nesta ordem, e usa o primeiro que achar.
  const PASTAS_DIALOGOS = ['coordenacao/', 'professores/', 'alunos/', ''];
  function buscarDialogo(id, i = 0) {
    if (i >= PASTAS_DIALOGOS.length) return Promise.resolve(null);
    const caminho = 'dialogos/' + PASTAS_DIALOGOS[i] + id + '.json';
    return fetch(BASE + caminho)
      .then(r => r.ok ? r.json().then(d => ({ d, caminho })) : buscarDialogo(id, i + 1))
      .catch(e => { console.warn('[VilaPixel] ' + caminho + ': ' + e.message); return buscarDialogo(id, i + 1); });
  }
  function carregarDialogos(ids) {
    return Promise.all(ids.filter(id => !(id in dialogos)).map(id => {
      dialogos[id] = null;
      return buscarDialogo(id).then(achado => {
        if (!achado) return;
        const { d, caminho } = achado;
        const conversas = Array.isArray(d.conversas) ? d.conversas.filter(conversaValida) : [];
        if (!conversas.length) return console.warn('[VilaPixel] ' + caminho + ' não tem conversas válidas — usando as falas do bloco.');
        dialogos[id] = { nome: typeof d.nome === 'string' && d.nome.trim() ? d.nome.trim() : null, conversas };
        console.log('[VilaPixel] usando ' + caminho);
      });
    }));
  }
  const falasDe = d => (dialogos[d.id] && dialogos[d.id].conversas) || d.conversas;
  const nomeDe = d => (dialogos[d.id] && dialogos[d.id].nome) || d.nome;

  // ---------- conteúdos das aulas (conteudo/conteudos_<n>ano/) ----------
  const conteudos = {}, conteudoPronto = {};   // Promises / dados já baixados, por série
  function carregarConteudo(s) {
    if (!s) return Promise.resolve(null);
    if (!(s in conteudos)) {
      conteudos[s] = fetch(BASE + 'conteudo/conteudos_' + s + 'ano/' + s + '-ano-completo.json')
        .then(r => r.ok ? r.json() : null)
        .then(d => (conteudoPronto[s] = d && Array.isArray(d.materias) ? d : null))
        .catch(e => { console.warn('[VilaPixel] conteúdos do ' + s + 'º ano: ' + e.message); return null; });
    }
    return conteudos[s];
  }
  const nomeSerie = s => s ? s + 'º ano' : 'não escolhida';

  // ---------- sons ----------
  // Quando chegar a cópia .ogg, ponha ela antes da .mp3 na lista.
  // Ordem = ordem de download: os pequenos primeiro, para os passos não esperarem as músicas.
  const SONS = {
    // trecho: [início, fim] em segundos — só essa parte toca. Vários arquivos têm silêncio no
    // começo ou no fim, então usamos só a parte com som.
    passos: { arquivos: ['sons/efeitos/passos/passos.mp3'], volume: 0.5, loop: true, trecho: [0.56, 3.84] },        // andando no piso
    grama:  { arquivos: ['sons/efeitos/passos/andargrama.mp3'], volume: 0.9, loop: true, trecho: [1, 30] },         // andando na grama
    correr: { arquivos: ['sons/efeitos/passos/passos3.mp3'], volume: 0.5, loop: true, trecho: [0, 0.95] },          // correndo (SHIFT)
    dialogo: { arquivos: ['sons/efeitos/dialogos/somdialogo.mp3'], volume: 0.3, loop: true, trecho: [0, 4.3] },    // enquanto as letras aparecem
    porta:  { arquivos: ['sons/efeitos/portas/abrirporta.mp3'], volume: 0.5, loop: false, trecho: [0, 1.3] },       // porta de sala abrindo
    portao: { arquivos: ['sons/efeitos/portas/abrirportao.mp3'], volume: 0.5, loop: false },                        // portão da escola
    errou:  { arquivos: ['sons/musicas/musicaerrouenigma.mp3'], volume: 0.5, loop: false },  // errou a pergunta
    menu:   { arquivos: ['sons/musicas/menu.mp3'], volume: 0.45, loop: true },              // tela inicial e pausa
    missao: { arquivos: ['sons/musicas/musicamissao.mp3'], volume: 0.35, loop: true }       // aulas do Mestre Bit
  };
  let jogo = null;
  let mudo = lembrar('vilaPixelMudo') === '1';
  const som = {
    sons: {}, querMusica: {}, passo: null,
    item(k) {
      if (!jogo || !jogo.cache.audio.exists(k)) return null;
      if (this.sons[k]) return this.sons[k];
      const c = SONS[k], s = this.sons[k] = jogo.sound.add(k, { loop: c.loop, volume: c.volume });
      if (c.trecho) s.addMarker({ name: 'trecho', start: c.trecho[0], duration: c.trecho[1] - c.trecho[0],
        config: { loop: c.loop, volume: c.volume } });
      return s;
    },
    // começa do início (ou do trecho, se o som tiver um)
    iniciar(k, s) { return SONS[k].trecho ? s.play('trecho') : s.play(); },
    // música em loop (menu, missao): liga/desliga; se ainda não baixou, toca quando chegar
    musica(ligar, k = 'menu') {
      this.querMusica[k] = ligar;
      const s = this.item(k);
      if (!s) return;
      if (ligar) { if (!s.isPlaying && !s.isPaused) s.play(); else if (s.isPaused) s.resume(); }
      else if (s.isPlaying || s.isPaused) s.stop();
    },
    // som curto, uma vez (se ainda não baixou, simplesmente não toca)
    tocar(k) { const s = this.item(k); if (s) this.iniciar(k, s); },
    parar(k) { const s = this.sons[k]; if (s && s.isPlaying) s.stop(); },
    // som em loop que liga e desliga (ex.: o som de diálogo enquanto as letras aparecem)
    laco(k, ligar) {
      const s = this.item(k);
      if (!s) return;
      if (ligar) { if (!s.isPlaying) this.iniciar(k, s); } else if (s.isPlaying) s.stop();
    },
    // pausa/retoma uma música sem voltar ao começo
    segurar(k, sim) {
      const s = this.sons[k];
      if (!s) return;
      if (sim && s.isPlaying) s.pause(); else if (!sim && s.isPaused && this.querMusica[k]) s.resume();
    },
    // tipo: 'passos' (andando no piso), 'grama' (andando na grama), 'correr' (com SHIFT) ou null (parado).
    // Ao parar, o som só pausa: na volta continua de onde estava, sem recomeçar o ritmo.
    passos(tipo) {
      if (tipo === this.passo) return;
      this.passo = tipo;
      ['passos', 'grama', 'correr'].forEach(k => {
        const s = this.item(k);
        if (!s) return;
        if (k === tipo) { if (s.isPaused) s.resume(); else if (!s.isPlaying) this.iniciar(k, s); }
        else if (s.isPlaying) s.pause();
      });
    },
    // chamado quando os arquivos terminam de baixar
    carregou() {
      Object.keys(this.querMusica).forEach(k => { if (this.querMusica[k]) this.musica(true, k); });
      const p = this.passo; this.passo = null; this.passos(p);
    }
  };
  function alternarSom() {
    mudo = !mudo;
    guardar('vilaPixelMudo', mudo ? '1' : '0');
    if (jogo) jogo.sound.mute = mudo;
    ui.hudSom.textContent = mudo ? '🔇' : '🔊';
    ui.hudSom.title = mudo ? 'Ligar o som (M)' : 'Desligar o som (M)';
  }

  // ---------- grade numerada (tecla G) ----------
  // Mostra "coluna,linha" em cada quadrado do chão — os mesmos números do mapa
  // em blocos/<bloco>.js (coluna = posição na linha de texto, linha = qual linha,
  // os dois começando do 0). Serve para combinar exatamente onde mudar o mapa.
  // Também pode ligar pelo endereço: index.html?grade=1
  // ---------- efeitos visuais (Phaser) ----------
  // Camadas por cima da arte, para ela não ficar "chapada": sombras projetadas pelos
  // prédios/muros/árvores, sombra embaixo dos personagens, luz do dia que muda com o
  // relógio, sombras de nuvens passando, pétalas caindo do ipê e um acabamento de
  // câmera (cantos escurecidos e cores mais vivas). Liga/desliga no menu de pausa
  // (para computadores mais fracos); a escolha fica lembrada.
  let efeitosVisuais = lembrar('vilaPixelEfeitos') !== '0';
  function alternarEfeitos() {
    efeitosVisuais = !efeitosVisuais;
    guardar('vilaPixelEfeitos', efeitosVisuais ? '1' : '0');
    const m = jogo && jogo.scene.getScene('Mundo');
    if (m && m.efeitos) m.ligarEfeitos(efeitosVisuais);
  }
  // Tiles "altos", que projetam sombra no chão (o sol vem do alto, à esquerda).
  const PROJETAM_SOMBRA = ['telhadoPx', 'paredePx', 'portaPx', 'janelaVidroPx', 'telhado', 'parede', 'janela', 'porta', 'muro', 'pilar', 'arvore', 'portaLateral',
    'telhadoPortaLateral', 'paredeLateral', 'telhadoLateral', 'janelaVidro', 'bancadaE', 'bancadaD'];
  // Cor da luz ao longo do dia: [minuto do dia, cor, intensidade]. Entre dois pontos a
  // cor vai mudando aos poucos. Manhã alaranjada, meio do dia neutro, tarde dourada.
  const LUZ_DO_DIA = [
    [6 * 60 + 55, [255, 176, 112], 0.30], [8 * 60, [255, 224, 176], 0.14], [10 * 60, [255, 255, 255], 0],
    [12 * 60 + 30, [255, 255, 255], 0], [13 * 60 + 30, [255, 216, 144], 0.16], [14 * 60 + 30, [255, 168, 96], 0.30]
  ];
  function luzDoMomento(min) {
    const L = LUZ_DO_DIA;
    if (min <= L[0][0]) return { cor: L[0][1], forca: L[0][2] };
    for (let i = 1; i < L.length; i++) if (min <= L[i][0]) {
      const [m0, c0, a0] = L[i - 1], [m1, c1, a1] = L[i], k = (min - m0) / (m1 - m0);
      return { cor: c0.map((v, j) => Math.round(v + (c1[j] - v) * k)), forca: a0 + (a1 - a0) * k };
    }
    const u = L[L.length - 1];
    return { cor: u[1], forca: u[2] };
  }

  let mostrarGrade = PARAMS.get('grade') === '1' || lembrar('vilaPixelGrade') === '1';
  function alternarGrade() {
    mostrarGrade = !mostrarGrade;
    guardar('vilaPixelGrade', mostrarGrade ? '1' : '0');
    const m = jogo && jogo.scene.getScene('Mundo');
    if (m && m.grade) { m.grade.setVisible(mostrarGrade); m.mostrarOndeEsta(true); }
  }
  // Desenha (uma vez por bloco) a grade com os números num canvas do tamanho do mapa.
  function texturaDaGrade(cena, b, larg, alt) {
    const chave = 'grade-' + b.id;
    if (cena.textures.exists(chave)) return chave;
    const cv = document.createElement('canvas'); cv.width = larg * T; cv.height = alt * T;
    const c = cv.getContext('2d');
    c.strokeStyle = 'rgba(255, 255, 255, 0.45)'; c.lineWidth = 1;
    for (let x = 0; x <= larg; x++) { c.beginPath(); c.moveTo(x * T + 0.5, 0); c.lineTo(x * T + 0.5, alt * T); c.stroke(); }
    for (let y = 0; y <= alt; y++) { c.beginPath(); c.moveTo(0, y * T + 0.5); c.lineTo(larg * T, y * T + 0.5); c.stroke(); }
    c.font = 'bold 14px monospace'; c.textBaseline = 'top'; c.lineWidth = 3;
    c.strokeStyle = '#000'; c.fillStyle = '#fff';
    for (let y = 0; y < alt; y++) for (let x = 0; x < larg; x++) {
      const t = x + ',' + y;
      c.strokeText(t, x * T + 4, y * T + 4); c.fillText(t, x * T + 4, y * T + 4);
    }
    cena.textures.addCanvas(chave, cv);
    return chave;
  }

  // Cena sem imagem que fica rodando o jogo inteiro só para baixar os sons,
  // sem atrasar o começo (a música tem uns 5 MB).
  class Som extends Phaser.Scene {
    constructor() { super('Som'); }
    preload() {
      this.load.setPath(BASE);
      Object.keys(SONS).forEach(k => this.load.audio(k, SONS[k].arquivos));
      this.load.on('loaderror', f => console.warn('[VilaPixel] não deu para carregar o som ' + f.key + ' (abra o jogo por um servidor: npx serve .)'));
      // cada som passa a valer assim que termina de baixar
      this.load.on('filecomplete', () => som.carregou());
      this.sound.mute = mudo;
    }
    create() { this.sound.mute = mudo; som.carregou(); }
  }

  function carregarBloco(id) {
    if (blocos[id]) return Promise.resolve(blocos[id]);
    console.log('[VilaPixel] carregando dados do ' + id + '...');
    return new Promise((ok, falha) => {
      const s = document.createElement('script');
      s.src = BASE + 'blocos/' + id + '.js';
      s.onload = () => blocos[id] ? ok(blocos[id]) : falha(new Error('O arquivo de ' + id + ' não registrou o bloco.'));
      s.onerror = () => falha(new Error('Não deu para carregar ' + s.src));
      document.head.appendChild(s);
    });
  }

  // Converte o mapa de texto em índices do tileset.
  // tiles que têm versão "pixel art" (nome + 'Px'), usada nas áreas de `estiloPixel`
  const VARIANTE_PIXEL = ['telhado', 'parede', 'porta', 'janelaVidro', 'ceramica'];
  function montarDados(mapa, estiloPixel) {
    const alt = mapa.length, larg = Math.max(...mapa.map(l => l.length));
    const ch = (x, y) => (mapa[y] || '')[x] || '.';
    const dados = [];
    for (let y = 0; y < alt; y++) {
      const linha = [];
      for (let x = 0; x < larg; x++) {
        let nome = LEGENDA[ch(x, y)] || 'grama';
        // teste de estilo "pixel art": nas áreas de `estiloPixel` do bloco, alguns tiles
        // usam a versão com pontilhado e sombreado (telhadoPx, paredePx...)
        if (VARIANTE_PIXEL.includes(nome) && (estiloPixel || []).some(r => x >= r.x1 && x <= r.x2 && y >= r.y1 && y <= r.y2)) nome += 'Px';
        if (nome === 'grama') nome = 'grama' + (1 + ((x * 7 + y * 13 + x * y) % 3));
        if (nome === 'fonte') nome = 'fonte' + (ch(x, y - 1) === 'o' ? 'B' : 'T') + (ch(x - 1, y) === 'o' ? 'R' : 'L');
        // mesa de cimento: 2 tiles de largura (metade E e D) e o comprimento que tiver
        // no mapa (Topo, Meio... e Base, onde aparece a espessura do tampo e o pé)
        // pneus do cercado: 2 pneuzinhos por quadrado, em fila — na horizontal se o
        // vizinho do lado também é pneu, senão na vertical. A cor muda de pneu em pneu.
        if (nome === 'pneu') {
          const horiz = ch(x - 1, y) === 'y' || ch(x + 1, y) === 'y';
          const desce = horiz && ch(x, y + 1) === 'y';   // canto: a fila vira para baixo
          const grama = k => '.,"'.includes(ch(k, y));
          // espelhado: fila vertical com a grama à direita (encosta no que está à esquerda,
          // ex.: um caminho) ou canto em que a fila horizontal segue para a direita
          const espelho = horiz ? desce && ch(x + 1, y) === 'y' && ch(x - 1, y) !== 'y'
            : grama(x + 1) && !grama(x - 1);
          nome = 'pneu' + (horiz ? (desce ? 'HB' : 'H') : 'V') + (espelho ? 'E' : '') + (1 + (2 * (horiz ? x : y)) % 5);
        }
        // corredor de cimento gasto: alterna 3 desenhos de rachaduras
        if (nome === 'cimentoGasto') nome += 1 + (x * 2 + y) % 3;
        // bebedouro junto do pátio (piso escuro ou mesas do lado): no piso escuro
        if (nome === 'bebedouro' && [ch(x - 1, y), ch(x + 1, y), ch(x, y - 1), ch(x, y + 1)].some(k => 'Em'.includes(k))) nome = 'bebedouroEscuro';
        // ping-pong, pebolim e bancada: 2 quadrados de largura (metade E e D)
        if (nome === 'pingPong' || nome === 'pebolim' || nome === 'bancada') {
          const c0 = ch(x, y);
          nome += ch(x - 1, y) === c0 && ch(x - 2, y) !== c0 ? 'D' : 'E';
        }
        if (nome === 'mesa') {
          const lado = ch(x - 1, y) === 'q' && ch(x - 2, y) !== 'q' ? 'D' : 'E';
          const parte = ch(x, y - 1) !== 'q' ? 'Topo' : ch(x, y + 1) !== 'q' ? 'Base' : 'Meio';
          nome = 'mesa' + parte + lado;
        }
        linha.push(idx(nome));
      }
      dados.push(linha);
    }
    return dados;
  }

  // ---------- telas HTML por cima do jogo (diálogo, nome do bloco) ----------
  const ui = {};
  function prepararUI() {
    ['dialogo', 'dialogoNome', 'dialogoTexto', 'dialogoSeta',
      'faixaBloco', 'faixaNome', 'faixaSub', 'hudBloco', 'carregando', 'carregandoTitulo',
      'carregandoFrase', 'carregandoDica', 'menu', 'menuTitulo', 'menuTexto', 'menuOpcoes',
      'hudSom', 'hudRelogio'].forEach(id => ui[id] = document.getElementById(id));
    ui.hudSom.onclick = e => { alternarSom(); e.currentTarget.blur(); };
    mudo = !mudo; alternarSom();   // só para mostrar o ícone certo
  }

  // ---------- menu (tela inicial, pausa e aulas) ----------
  // Mostra opções e devolve (Promise) o número da escolhida, ou `cancelar`
  // se o aluno apertar ESC (cancelar: null = ESC não fecha).
  // Setas/W/S escolhem; Enter, Espaço ou E confirmam; 1–9 escolhem direto; dá para clicar.
  // As teclas apertadas no menu não chegam ao jogo.
  let menuAberto = false;
  function mostrarMenu({ titulo = '', texto = '', opcoes, cancelar = -1 }) {
    return new Promise(ok => {
      menuAberto = true;
      ui.menuTitulo.textContent = titulo; ui.menuTitulo.hidden = !titulo;
      ui.menuTexto.textContent = texto; ui.menuTexto.hidden = !texto;
      ui.menuOpcoes.innerHTML = '';
      let sel = 0;
      const marcar = i => {
        sel = i;
        botoes.forEach((b, k) => b.classList.toggle('sel', k === i));
        botoes[i].scrollIntoView({ block: 'nearest' });
      };
      const fim = i => {
        document.removeEventListener('keydown', tecla, true);
        ui.menu.hidden = true;
        menuAberto = false;
        ok(i);
      };
      const botoes = opcoes.map((o, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = o;
        b.onclick = () => fim(i);
        b.onmouseenter = () => marcar(i);
        ui.menuOpcoes.appendChild(b);
        return b;
      });
      const tecla = e => {
        const k = e.key;
        if (k === 'ArrowDown' || k === 's' || k === 'S') marcar((sel + 1) % botoes.length);
        else if (k === 'ArrowUp' || k === 'w' || k === 'W') marcar((sel - 1 + botoes.length) % botoes.length);
        else if (k === 'Enter' || k === ' ' || k === 'e' || k === 'E') { if (!e.repeat) fim(sel); }
        else if (k === 'Escape') { if (cancelar !== null) fim(cancelar); }
        else if (/^[1-9]$/.test(k) && +k <= botoes.length) fim(+k - 1);
        else if (k === 'm' || k === 'M') alternarSom();
        else return;
        e.preventDefault();
        e.stopImmediatePropagation();
      };
      document.addEventListener('keydown', tecla, true);
      ui.menu.hidden = false;
      marcar(0);
    });
  }

  async function escolherSerie(obrigatorio) {
    const i = await mostrarMenu({
      titulo: 'Qual é a sua série?',
      texto: 'As aulas do jogo são da série que você escolher.',
      opcoes: ['1º ano', '2º ano', '3º ano'],
      cancelar: obrigatorio ? null : -1
    });
    if (i < 0) return;
    serie = String(i + 1);
    guardar('vilaPixelSerie', serie);
    await carregarConteudo(serie);
  }

  // tela inicial: espera um clique/tecla (o navegador só deixa tocar som depois disso)
  // Tela inicial: o estudante digita o nome e escolhe a série. Os dois ficam
  // lembrados no navegador e já vêm preenchidos na próxima vez. Se o portal abriu
  // o jogo com ?name= e ?ano=, só pede um clique (o navegador só toca som depois dele).
  async function telaInicial() {
    ui.carregando.hidden = true;
    som.musica(true);
    if (NOME_DA_URL && SERIE_DA_URL) {
      await mostrarMenu({ titulo: 'CEPI JRM', texto: 'CEPI João Roberto Moreira', opcoes: ['▶ Jogar'], cancelar: null });
    } else {
      const r = await telaCadastro();
      nomeAluno = primeiroNome(r.nome);
      guardar('vilaPixelNome', r.nome);
      serie = r.serie;
      guardar('vilaPixelSerie', serie);
    }
    await carregarConteudo(serie);
    som.musica(false);
  }

  // Formulário da tela inicial (#cadastro no index.html). Devolve { nome, serie }.
  function telaCadastro() {
    return new Promise(ok => {
      const el = id => document.getElementById(id);
      const tela = el('cadastro'), form = el('cadastroCaixa'), campo = el('cadastroNome'), erro = el('cadastroErro');
      const botoes = [...document.querySelectorAll('#cadastroSeries button')];
      let escolhida = null;
      const marcar = s => {
        escolhida = s;
        botoes.forEach(b => b.setAttribute('aria-checked', String(b.dataset.serie === s)));
      };
      campo.value = NOME_DA_URL || lembrar('vilaPixelNome') || '';
      marcar(serie);
      botoes.forEach(b => { b.onclick = () => { marcar(b.dataset.serie); erro.hidden = true; }; });
      campo.oninput = () => { erro.hidden = true; };
      form.onsubmit = e => {
        e.preventDefault();
        const nome = campo.value.trim().replace(/\s+/g, ' ');
        const falta = !nome ? 'Digite o seu nome.' : !escolhida ? 'Escolha a sua série.' : '';
        if (falta) { erro.textContent = falta; erro.hidden = false; (nome ? botoes[0] : campo).focus(); return; }
        tela.hidden = true;
        menuAberto = false;
        ok({ nome, serie: escolhida });
      };
      menuAberto = true;   // as teclas digitadas (M, T, P...) não mexem no jogo
      tela.hidden = false;
      campo.focus();
      campo.select();
    });
  }

  // pausa (ESC ou P): o mundo para e toca a música do menu
  async function pausar() {
    const cena = jogo && jogo.scene.getScene('Mundo');
    if (!cena || !cena.scene.isActive() || cena.trocando) return;
    cena.scene.pause();
    som.passos(null);
    som.musica(true);
    for (;;) {
      const opcoes = ['Continuar', 'Som: ' + (mudo ? 'desligado' : 'ligado'),
        'Velocidade do tempo: ' + relogio.vel + 'x  (tecla T)',
        'Grade com números: ' + (mostrarGrade ? 'ligada' : 'desligada') + '  (tecla G)',
        'Efeitos visuais: ' + (efeitosVisuais ? 'ligados' : 'desligados')];
      if (!SERIE_DA_URL) opcoes.push('Série: ' + nomeSerie(serie));
      const i = await mostrarMenu({ titulo: 'Pausado', texto: 'Dia ' + relogio.dia + ' · ' + hora(relogio.min), opcoes });
      if (i === 1) { alternarSom(); continue; }
      if (i === 2) { mudarVelocidade(); continue; }
      if (i === 3) { alternarGrade(); continue; }
      if (i === 4) { alternarEfeitos(); continue; }
      if (i === 5) { await escolherSerie(false); continue; }
      break;
    }
    som.musica(false);
    cena.input.keyboard.resetKeys();   // teclas soltas durante a pausa não ficam "presas"
    cena.scene.resume();
  }
  addEventListener('keydown', e => {
    if (menuAberto || e.repeat) return;
    if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') pausar();
    else if ((e.key === 'm' || e.key === 'M') && ui.hudSom) alternarSom();
    else if ((e.key === 't' || e.key === 'T') && ui.hudRelogio) mudarVelocidade();
    else if (e.key === 'g' || e.key === 'G') alternarGrade();
  });
  function mostrarFaixa(bloco) {
    ui.hudBloco.textContent = bloco.nome;
    mostrarAviso(bloco.nome, 'Dia ' + relogio.dia + (bloco.subtitulo ? ' · ' + bloco.subtitulo : ''));
  }
  // faixa grande no alto da tela, que some sozinha (nome do bloco, hora da saída...)
  function mostrarAviso(titulo, sub) {
    ui.faixaNome.textContent = titulo;
    ui.faixaSub.textContent = sub || '';
    ui.faixaBloco.classList.remove('ativa'); void ui.faixaBloco.offsetWidth; ui.faixaBloco.classList.add('ativa');
  }
  function mostrarRelogio() {
    const t = 'Dia ' + relogio.dia + ' · ' + hora(relogio.min) + (relogio.vel > 1 ? ' · ⏩ ' + relogio.vel + 'x' : '');
    if (ui.hudRelogio.textContent !== t) ui.hudRelogio.textContent = t;
  }

  // ---------- tela de carregamento com "Você sabia?" ----------
  // Fica pelo menos TEMPO_CURIOSIDADE na tela, para dar tempo de ler a frase
  // (lista em curiosidades.js), e espera o bloco terminar de baixar.
  const TEMPO_CURIOSIDADE = 2500;
  let ultimaFrase = -1;
  // Além das frases de curiosidades.js, entram as aulas da série escolhida.
  let fonteCuriosidades = null, frasesDasAulas = [];
  function frasesDoConteudo() {
    const d = (serie && conteudoPronto[serie]) || null;
    if (fonteCuriosidades !== d) {
      fonteCuriosidades = d;
      frasesDasAulas = [];
      (d ? d.materias : []).forEach(m => (m.conteudos || []).forEach(c => {
        if (c && typeof c.aula === 'string' && c.aula.length <= 260) frasesDasAulas.push(m.nome + ' — ' + c.aula);
      }));
    }
    return frasesDasAulas;
  }
  function sortearCuriosidade() {
    const lista = (window.VILA_CURIOSIDADES || []).concat(frasesDoConteudo());
    if (!lista.length) return '';
    let i = Math.floor(Math.random() * lista.length);
    if (lista.length > 1 && i === ultimaFrase) i = (i + 1) % lista.length;
    ultimaFrase = i;
    return lista[i];
  }
  function telaCarregando(id) {
    const frase = sortearCuriosidade();
    ui.carregandoTitulo.textContent = 'Carregando ' + id.replace(/^bloco-(\w+)$/, (m, l) => 'Bloco ' + l.toUpperCase()) + '...';
    ui.carregandoFrase.textContent = frase;
    ui.carregandoDica.hidden = !frase;
    ui.carregando.hidden = false;
    const dados = carregarBloco(id).then(b => {
      const ids = (b.npcs || []).map(n => n.id);
      return Promise.all([carregarPersonagens(ids), carregarDialogos(ids)]).then(() => b);
    });
    return Promise.all([dados, new Promise(r => setTimeout(r, TEMPO_CURIOSIDADE))])
      .then(([b]) => { ui.carregando.hidden = true; return b; });
  }

  // ---------- cena inicial: carrega os PNGs, gera a arte e carrega o Bloco A ----------
  class Inicio extends Phaser.Scene {
    constructor() { super('Inicio'); }
    create() {
      const primeiro = window.VILA_BLOCO_INICIAL || 'bloco-a';
      if (!serie && !SERIE_DA_URL) serie = serieValida(lembrar('vilaPixelSerie'));
      this.scene.launch('Som');
      Promise.all([carregarTiles(), carregarPersonagens(['jogador'])])
        .then(() => {
          this.textures.addCanvas('tiles', VilaArte.gerarTileset(pngs.tiles));
          this.textures.addCanvas('balao', VilaArte.gerarBalao());
          this.textures.addCanvas('porta-aberta', VilaArte.gerarPortaAberta());
          this.textures.addCanvas('porta-aberta-lateral', VilaArte.gerarPortaLateralAberta());
          this.textures.addCanvas('seta', VilaArte.gerarSeta());
          ['esquerda', 'direita'].forEach(lado => {   // as duas folhas do portão, em quadros
            const tex = this.textures.addCanvas('portao-' + lado, VilaArte.gerarFolhaPortao(lado));
            for (let q = 0; q < VilaArte.QUADROS_PORTAO; q++) tex.add(q, 0, q * T, 0, T, 2 * T);
          });
          return telaInicial();
        })
        .then(() => telaCarregando(primeiro))
        .then(b => this.scene.start('Mundo', { bloco: b.id, chegada: b.inicio }))
        .catch(err => { ui.carregandoTitulo.textContent = '⚠ ' + err.message; console.error(err); });
    }
  }

  // Cria (uma vez) a textura e as animações de um personagem:
  // o PNG sprites/personagens/<id>.png se existir, senão a arte do arte.js.
  function prepararPersonagem(cena, chave, id, cores) {
    if (cena.textures.exists(chave)) return;
    const png = pngs.personagens[id];
    const tex = cena.textures.addCanvas(chave, png ? VilaArte.montarPersonagem(png) : VilaArte.gerarPersonagem(cores));
    for (let i = 0; i < 12; i++) tex.add(i, 0, (i % 3) * T, Math.floor(i / 3) * T, T, T);
    VilaArte.DIRECOES.forEach((dir, linha) => {
      const b = linha * 3;
      cena.anims.create({ key: chave + '-andar-' + dir, frameRate: 8, repeat: -1,
        frames: [b + 1, b, b + 2, b].map(f => ({ key: chave, frame: f })) });
    });
  }
  const quadroParado = dir => VilaArte.DIRECOES.indexOf(dir) * 3;

  function corpoNosPes(sprite) {
    sprite.body.setSize(40, 24).setOffset(12, 36);
    sprite.body.setCollideWorldBounds(true);
  }
  const pes = s => ({ x: s.x, y: s.y + T / 4 });
  function direcaoPara(dx, dy) {
    return Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'esquerda' : 'direita') : (dy < 0 ? 'cima' : 'baixo');
  }
  const VETOR = { baixo: [0, 1], cima: [0, -1], esquerda: [-1, 0], direita: [1, 0] };

  // ---------- cena do mundo: monta UM bloco por vez ----------
  class Mundo extends Phaser.Scene {
    constructor() { super('Mundo'); }

    init(dados) {
      this.bloco = blocos[dados.bloco];
      this.chegada = dados.chegada || this.bloco.inicio || { x: 2, y: 2 };
      this.trocando = false;
      this.conversa = null;
      this.ocupado = false;     // true enquanto o portão abre (ninguém se mexe)
    }

    create() {
      const b = this.bloco;
      const dados = montarDados(b.mapa, b.estiloPixel);
      const mapa = this.make.tilemap({ data: dados, tileWidth: T, tileHeight: T });
      const tileset = mapa.addTilesetImage('tiles', 'tiles', T, T, 0, 0);
      this.camada = mapa.createLayer(0, tileset, 0, 0);
      this.camada.setCollision(SOLIDOS.map(idx));
      // barreiras finas de alguns tiles (em this.corrimaos):
      // corrimão (atravessa o quadrado pelo meio, na horizontal): uma barreira fina na
      // linha dele — dá para andar ao longo, mas não atravessar de cima para baixo
      this.corrimaos = [];
      this.camada.forEachTile(t => {
        // mesa de plástico: só o tampo bloqueia (dá para passar entre as mesas)
        if (t.index === idx('mesaPlastico')) {
          // estreita (0,3 do quadrado) para sobrar espaço para o estudante passar entre duas mesas
          const z = this.add.zone(t.pixelX + T / 2, t.pixelY + T * 0.55, T * 0.3, T * 0.3);
          this.physics.add.existing(z, true);
          this.corrimaos.push(z);
          return;
        }
        const topo = t.index === idx('borrachaCorrimaoTopo');
        if (t.index !== idx('borrachaCorrimao') && !topo) return;
        const z = this.add.zone(t.pixelX + T / 2, t.pixelY + (topo ? T * 0.2 : T * 0.62), T, 12);
        this.physics.add.existing(z, true);
        this.corrimaos.push(z);
      });
      const largPx = mapa.widthInPixels, altPx = mapa.heightInPixels;
      this.physics.world.setBounds(0, 0, largPx, altPx);

      // jogador
      prepararPersonagem(this, 'jogador', 'jogador', { pele: '#f2c19b', cabelo: '#4a2c1a', camisa: '#3b82c4', calca: '#2c3e6b' });
      const c = this.chegada;
      this.jogador = this.physics.add.sprite(c.x * T + T / 2, c.y * T + T / 4, 'jogador', quadroParado(c.dir || 'baixo'));
      this.jogador.direcao = c.dir || 'baixo';
      corpoNosPes(this.jogador);
      this.physics.add.collider(this.jogador, this.camada);

      // NPCs (voltam onde estavam se o jogador já passou por este bloco)
      const mem = memoria[b.id] = memoria[b.id] || { npcs: {} };
      this.npcs = this.physics.add.group();
      (b.npcs || []).forEach(d => {
        prepararPersonagem(this, 'npc-' + d.id, d.id, d.cores);
        const salvo = mem.npcs[d.id];
        const n = this.npcs.create(salvo ? salvo.x : d.x * T + T / 2, salvo ? salvo.y : d.y * T + T / 4, 'npc-' + d.id, quadroParado('baixo'));
        n.dados = d;
        n.casa = { x: d.x * T + T / 2, y: d.y * T + T / 4 };
        n.direcao = salvo ? salvo.direcao : 'baixo';
        n.ia = { estado: 'parado', ate: this.time.now + Phaser.Math.Between(300, 2000) };
        // NPC com `porta: { x, y }`: de vez em quando entra por ela e depois sai
        if (d.porta) n.proximaPorta = this.time.now + Phaser.Math.Between(8000, 20000);
        corpoNosPes(n);
        n.body.pushable = false;
        n.setFrame(quadroParado(n.direcao));
      });
      this.physics.add.collider(this.npcs, this.camada);
      this.physics.add.collider(this.npcs, this.npcs);
      this.physics.add.collider(this.jogador, this.npcs);
      this.physics.add.collider(this.jogador, this.corrimaos);
      this.physics.add.collider(this.npcs, this.corrimaos);

      // portões de grade com duas folhas presas nos pilares. A da esquerda é
      // fixa (fica sempre fechada); a da direita abre para fora (para a rua).
      // Fechado: barreiras invisíveis tapam o vão. Aberto: a metade esquerda
      // continua tapada e a folha da direita, para fora junto do pilar, bloqueia.
      // Um portão aberto continua aberto.
      mem.portoes = mem.portoes || {};
      this.portoes = {};
      const ultimoQuadro = VilaArte.QUADROS_PORTAO - 1;
      const barreira = (x, y, w, h) => {
        const z = this.add.zone(x, y, w, h);
        this.physics.add.existing(z, true);
        this.physics.add.collider(this.jogador, z);
        this.physics.add.collider(this.npcs, z);
        return z;
      };
      (b.portoes || []).forEach(p => {
        const aberto = !!mem.portoes[p.id];
        const x0 = p.x * T, y0 = p.y * T, q = aberto ? ultimoQuadro : 0;
        const fixa = this.add.image(x0, y0, 'portao-esquerda', 0).setOrigin(0, 0).setDepth(y0 + T * 3 / 4);
        const movel = this.add.image(x0 + T, y0, 'portao-direita', q).setOrigin(0, 0);
        barreira(x0 + T / 2, y0 + T / 2, T, T);                              // folha fixa: sempre tapada
        const trava = barreira(x0 + T + T / 2, y0 + T / 2, T, T);            // folha da direita, enquanto fechada
        const aberta = barreira(x0 + 2 * T - 10, y0 + T + T / 2, 20, T);     // folha da direita, aberta para fora
        // quem cuida do portão (NPC com `abre: '<id>'`): abre e, depois que o estudante entra, fecha
        const porteiro = this.npcs.getChildren().find(n => n.dados.abre === p.id) || null;
        const portao = { dados: p, movel, trava, aberta, aberto, porteiro };
        this.ajustarPortao(portao);
        this.portoes[p.id] = portao;
      });

      // letreiros pintados no muro (ex.: o nome da escola).
      // x = centro (em tiles), y = linha do tile de muro onde fica a pintura.
      (b.letreiros || []).forEach((l, i) => {
        const chave = 'letreiro-' + b.id + '-' + i;
        if (!this.textures.exists(chave)) this.textures.addCanvas(chave, VilaArte.gerarLetreiro(l.texto, l.cor || '#1f4f8f'));
        const larg = this.textures.get(chave).getSourceImage().width;
        this.add.image(Math.round(l.x * T - larg / 2), l.y * T + 4, chave).setOrigin(0, 0).setDepth(l.y * T + T - 4);
      });

      // barreira pequena (para o pé de árvores, postes de placa...)
      const obstaculo = (x, y, w, h) => {
        const z = this.add.zone(x, y, w, h);
        this.physics.add.existing(z, true);
        this.physics.add.collider(this.jogador, z);
        this.physics.add.collider(this.npcs, z);
      };

      // árvores grandes, maiores que um quadrado: `arvores: [{ x, y, tipo: 'ipe' }]`.
      // (x, y) é o quadrado onde fica o pé do tronco. A copa fica por cima de quem passa
      // atrás da árvore; só o pé do tronco bloqueia. Sombra e flores caídas ficam no chão.
      (b.arvores || []).forEach(a => {
        if (!this.textures.exists('ipe')) {
          const d = VilaArte.gerarIpe();
          this.textures.addCanvas('ipe', d.arvore);
          this.textures.addCanvas('ipe-chao', d.chao);
        }
        const e = VilaArte.ESCALA, pe = { x: (a.x + 0.5) * T, y: (a.y + 0.85) * T };
        const canto = { x: pe.x - 20 * e, y: pe.y - VilaArte.PE_IPE * e };   // o tronco fica no x 20 da arte
        this.add.image(canto.x, canto.y, 'ipe-chao').setOrigin(0, 0).setDepth(1);
        this.add.image(canto.x, canto.y, 'ipe').setOrigin(0, 0).setDepth(pe.y);
        obstaculo(pe.x, pe.y - 6, 24, 14);
      });

      // plaquinhas em pé: `placas: [{ x, y, texto, cor? }]` — x = centro (em quadrados),
      // y = quadrado onde ficam os pés dos postes. Os postes bloqueiam.
      (b.placas || []).forEach((pl, i) => {
        const chave = 'placa-' + b.id + '-' + i;
        if (!this.textures.exists(chave)) this.textures.addCanvas(chave, VilaArte.gerarPlaca(pl.texto, pl.cor || '#1f4f8f'));
        const pe = { x: pl.x * T, y: (pl.y + 0.85) * T };
        const img = this.add.image(pe.x, pe.y, chave).setOrigin(0.5, 1).setDepth(pe.y);
        obstaculo(pe.x, pe.y - 6, img.width - 8, 12);
      });

      // tendas (pergolado com folhas): postes nos quadrados (x1,y1), (x2,y1), (x1,y2) e (x2,y2).
      // A cobertura fica por cima de todo mundo (quem passa embaixo fica na sombra das
      // folhas) e a sombra manchada fica no chão, por baixo dos personagens.
      (b.tendas || []).forEach((td, i) => {
        const chave = 'tenda-' + b.id + '-' + i;
        if (!this.textures.exists(chave + '-telhado')) {
          const a = VilaArte.gerarTenda(td.x2 - td.x1, td.y2 - td.y1, 7 + i);
          this.textures.addCanvas(chave + '-telhado', a.telhado);
          this.textures.addCanvas(chave + '-sombra', a.sombra);
          this.textures.addCanvas(chave + '-poste', a.poste);
        }
        const e = VilaArte.ESCALA, beiral = VilaArte.BEIRAL_TENDA * e, altura = VilaArte.ALTURA_TENDA * e;
        const pe = (cx, cy) => ({ x: (cx + 0.5) * T, y: (cy + 0.85) * T });   // pé do poste no quadrado
        const canto = pe(td.x1, td.y1);
        this.add.image(canto.x - beiral, canto.y - beiral, chave + '-sombra').setOrigin(0, 0).setDepth(1);
        this.add.image(canto.x - beiral, canto.y - beiral - altura, chave + '-telhado').setOrigin(0, 0).setDepth(5000).setAlpha(0.88);
        [[td.x1, td.y1], [td.x2, td.y1], [td.x1, td.y2], [td.x2, td.y2]].forEach(([cx, cy]) => {
          const p = pe(cx, cy);
          this.add.image(p.x, p.y, chave + '-poste').setOrigin(0.5, 1).setDepth(p.y);
          const z = this.add.zone(p.x, p.y - 6, 16, 12);   // só o pé do poste bloqueia
          this.physics.add.existing(z, true);
          this.physics.add.collider(this.jogador, z);
          this.physics.add.collider(this.npcs, z);
        });
      });

      // setas nas saídas
      (b.saidas || []).forEach(s => {
        const leste = s.x * T >= largPx / 2;
        const seta = this.add.image((s.x + s.w / 2) * T + (leste ? -40 : 40), (s.y + s.h / 2) * T, 'seta').setFlipX(!leste).setDepth(9999);
        this.tweens.add({ targets: seta, x: seta.x + (leste ? 12 : -12), duration: 450, yoyo: true, repeat: -1 });
      });

      this.balao = this.add.image(0, 0, 'balao').setOrigin(0.5, 1).setDepth(10000).setVisible(false);
      this.tweens.add({ targets: this.balao, scaleY: 0.85, duration: 380, yoyo: true, repeat: -1 });

      const cam = this.cameras.main;
      cam.setBounds(0, 0, largPx, altPx);
      // Sem "atraso suave" (lerp): com lerp a câmera para entre um pixel e
      // outro e o cenário treme em relação ao personagem.
      cam.startFollow(this.jogador, true, 1, 1);
      cam.setRoundPixels(true);
      cam.fadeIn(250, 0, 0, 0);

      this.teclas = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SHIFT,E,SPACE,ENTER');
      this.input.keyboard.on('keydown-E', () => this.apertouE());
      this.input.keyboard.on('keydown-SPACE', () => { if (this.conversa) this.apertouE(); });
      this.input.keyboard.on('keydown-ENTER', () => { if (this.conversa) this.apertouE(); });
      ui.dialogo.onclick = () => { if (this.conversa) this.apertouE(); };
      this.events.once('shutdown', () => { ui.dialogo.onclick = null; som.passos(null); this.fecharDialogo(); });

      // grade numerada por cima de tudo (tecla G)
      this.grade = this.add.image(0, 0, texturaDaGrade(this, b, mapa.width, mapa.height))
        .setOrigin(0, 0).setDepth(20000).setVisible(mostrarGrade);

      this.criarEfeitos(b, mapa, dados);

      mostrarFaixa(b);
      mostrarRelogio();
      this.mostrarOndeEsta(true);
    }

    // ---------- efeitos visuais ----------
    // Monta as camadas de efeito do bloco (ver `efeitosVisuais`). dados = índices dos tiles.
    criarEfeitos(b, mapa, dados) {
      const ef = this.efeitos = { objetos: [], sombras: [], nuvens: [], emissores: [], fx: [] };
      const larg = mapa.width, alt = mapa.height, W = larg * T, H = alt * T;
      const alto = new Set(PROJETAM_SOMBRA.map(idx));

      // 1) sombras projetadas: cada tile alto joga uma sombra para baixo e para a direita;
      //    a borda é borrada (sombra macia) e nada fica sombreado em cima dos próprios prédios
      const chave = 'sombras-' + b.id;
      if (!this.textures.exists(chave)) {
        const bruto = document.createElement('canvas'); bruto.width = W; bruto.height = H;
        const cb = bruto.getContext('2d'); cb.fillStyle = '#000';
        const final = document.createElement('canvas'); final.width = W; final.height = H;
        const cf = final.getContext('2d');
        dados.forEach((linha, y) => linha.forEach((t, x) => { if (alto.has(t)) cb.fillRect(x * T + T * 0.3, y * T + T * 0.3, T, T); }));
        cf.filter = 'blur(10px)'; cf.globalAlpha = 0.3; cf.drawImage(bruto, 0, 0);
        cf.filter = 'none'; cf.globalAlpha = 1; cf.globalCompositeOperation = 'destination-out';
        dados.forEach((linha, y) => linha.forEach((t, x) => { if (alto.has(t)) cf.fillRect(x * T, y * T, T, T); }));
        this.textures.addCanvas(chave, final);
      }
      ef.objetos.push(this.add.image(0, 0, chave).setOrigin(0, 0).setDepth(1.5));

      // 2) sombra embaixo de cada personagem (segue os pés)
      [this.jogador, ...this.npcs.getChildren()].forEach(s => {
        const e = this.add.ellipse(s.x, s.y + 24, 36, 12, 0x000000, 0.28).setDepth(2);
        ef.sombras.push({ s, e });
      });

      // 3) sombras de nuvens passando devagar por cima de tudo
      if (!this.textures.exists('nuvem')) {
        const cv = document.createElement('canvas'); cv.width = 480; cv.height = 300;
        const c = cv.getContext('2d');
        [[170, 150, 140], [290, 140, 120], [230, 110, 110], [330, 180, 90], [120, 180, 90]].forEach(([x, y, r]) => {
          const g = c.createRadialGradient(x, y, 0, x, y, r);
          g.addColorStop(0, 'rgba(0,0,0,0.5)'); g.addColorStop(1, 'rgba(0,0,0,0)');
          c.fillStyle = g; c.fillRect(0, 0, 480, 300);
        });
        this.textures.addCanvas('nuvem', cv);
      }
      for (let i = 0; i < 3; i++) {
        const n = this.add.image(Phaser.Math.Between(0, W), Phaser.Math.Between(0, H), 'nuvem')
          .setScale(1.2 + Math.random() * 0.8).setAlpha(0.18).setDepth(8000);
        n.velocidade = 8 + Math.random() * 8;   // px por segundo
        ef.nuvens.push(n);
      }

      // 4) pétalas amarelas caindo do ipê (partículas do Phaser)
      if (!this.textures.exists('petala')) {
        const cv = document.createElement('canvas'); cv.width = 6; cv.height = 4;
        const c = cv.getContext('2d'); c.fillStyle = '#f6c628'; c.fillRect(0, 0, 6, 4); c.fillStyle = '#fff07a'; c.fillRect(0, 0, 3, 2);
        this.textures.addCanvas('petala', cv);
      }
      (b.arvores || []).filter(a => a.tipo === 'ipe').forEach(a => {
        const pe = { x: (a.x + 0.5) * T, y: (a.y + 0.85) * T };
        const em = this.add.particles(pe.x, pe.y - 140, 'petala', {
          emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(-70, -50, 140, 70) },
          lifespan: { min: 4000, max: 7000 }, speedX: { min: -18, max: 6 }, speedY: { min: 10, max: 24 },
          rotate: { min: 0, max: 360 }, alpha: { start: 1, end: 0 }, frequency: 450, quantity: 1
        }).setDepth(pe.y + 2);
        ef.emissores.push(em);
      });

      // 5) luz do dia: uma película colorida por cima de tudo, multiplicando as cores
      ef.luz = this.add.rectangle(0, 0, 4000, 3000, 0xffffff, 0).setOrigin(0, 0)
        .setScrollFactor(0).setDepth(9000).setBlendMode(Phaser.BlendModes.MULTIPLY);

      this.ligarEfeitos(efeitosVisuais);
    }

    // Liga ou desliga todos os efeitos (menu de pausa).
    ligarEfeitos(ligado) {
      const ef = this.efeitos;
      [...ef.objetos, ...ef.nuvens, ef.luz, ...ef.sombras.map(o => o.e)].forEach(o => o.setVisible(ligado));
      ef.emissores.forEach(em => { em.setVisible(ligado); if (ligado) em.start(); else em.stop(); });
      // acabamento de câmera (só no WebGL): cantos escurecidos e cores um pouco mais vivas
      const cam = this.cameras.main;
      if (cam.postFX) {
        cam.postFX.clear();
        if (ligado && this.game.renderer.type === Phaser.WEBGL) {
          cam.postFX.addVignette(0.5, 0.5, 0.9, 0.18);
          cam.postFX.addColorMatrix().saturate(0.18);
        }
      }
      if (ligado) this.atualizarEfeitos(0);
    }

    // A cada quadro: sombras seguem os personagens, nuvens andam, a luz acompanha a hora.
    atualizarEfeitos(delta) {
      const ef = this.efeitos;
      ef.sombras.forEach(({ s, e }) => {
        e.setPosition(s.x, s.y + 24);
        e.setVisible(s.visible);
        e.setAlpha(s.alpha);
      });
      const W = this.physics.world.bounds.width;
      ef.nuvens.forEach(n => {
        n.x += n.velocidade * delta / 1000;
        if (n.x - n.displayWidth / 2 > W) n.x = -n.displayWidth / 2;
      });
      const { cor, forca } = luzDoMomento(relogio.min);
      // multiplicar por branco não muda nada; a força mistura a cor da luz com o branco
      const mistura = cor.map(v => Math.round(255 - (255 - v) * forca));
      ef.luz.setFillStyle(Phaser.Display.Color.GetColor(...mistura.map(v => Math.max(0, Math.min(255, v)))), forca > 0 ? 1 : 0);
    }

    // Com a grade ligada, o canto mostra em que quadrado (coluna,linha) estão os pés do estudante.
    mostrarOndeEsta(forcar) {
      const p = pes(this.jogador), onde = Math.floor(p.x / T) + ',' + Math.floor(p.y / T);
      const t = this.bloco.nome + (mostrarGrade ? ' · você está em ' + onde : '');
      if (forcar || ui.hudBloco.textContent !== t) ui.hudBloco.textContent = t;
    }

    update(tempo, delta) {
      if (this.trocando) return;
      this.passarHora(delta);
      if (mostrarGrade) this.mostrarOndeEsta();
      this.moverJogador();
      this.npcs.getChildren().forEach(n => this.moverNpc(n, tempo));
      [this.jogador, ...this.npcs.getChildren()].forEach(s => s.setDepth(s.y));
      this.atualizarBalao();
      this.posicionarFala();
      this.conferirSaidas();
      this.conferirPortoes(tempo);
      if (efeitosVisuais) this.atualizarEfeitos(delta);
    }

    // Avança o relógio do jogo e avisa quando chega a hora da saída.
    passarHora(delta) {
      relogio.min += Math.min(delta, 100) / 1000 * MINUTOS_POR_SEGUNDO * relogio.vel;   // trava saltos (aba escondida)
      if (!relogio.avisouSaida && podeSair()) {
        relogio.avisouSaida = true;
        if (relogio.entrou) mostrarAviso(hora(FIM_AULAS) + ' · Hora da saída!', 'Fale com o porteiro para sair.');
      }
      mostrarRelogio();
    }

    // Portões: marca quando o estudante entra, não deixa voltar antes da saída,
    // fecha o portão depois que ele entra e termina o dia quando ele sai depois da saída.
    conferirPortoes(tempo) {
      const ESPERA_FECHAR = 1500;
      Object.values(this.portoes).forEach(p => {
        const pe = pes(this.jogador), y0 = p.dados.y * T;
        const passouDoMuro = pe.y < y0 - T / 2, naCalcada = pe.y > y0 + T * 3 / 4;
        if (passouDoMuro) relogio.entrou = true;
        // saiu depois do horário: acabou o dia
        if (relogio.entrou && podeSair() && naCalcada) return this.fimDoDia();
        // já entrou e ainda não é hora: o vão fica tapado mesmo com a folha aberta
        if (relogio.entrou && !podeSair() && passouDoMuro) p.trava.body.enable = true;

        // porteiro fecha o portão depois que o estudante entra (não na hora da saída)
        const n = p.porteiro;
        if (!p.aberto || p.fechando || !n || n.animando || this.ocupado || podeSair()) return;
        if (this.conversa && this.conversa.npc === n) return;
        const dentro = passouDoMuro && Math.hypot(pe.x - (p.dados.x + 1) * T, pe.y - y0) > 1.5 * T;
        if (!dentro) { p.dentroDesde = null; return; }
        p.dentroDesde = p.dentroDesde || tempo;
        if (tempo - p.dentroDesde >= ESPERA_FECHAR) this.fecharPortao(p);
      });
    }

    // O estudante saiu depois do horário: tela de "fim do dia" e o dia seguinte
    // começa já dentro da escola (bloco.inicioDentro), às INICIO_DIA.
    fimDoDia() {
      if (this.trocando) return;
      this.trocando = true;
      som.passos(null);
      this.fecharDialogo();
      this.jogador.setVelocity(0, 0);
      const b = this.bloco, cam = this.cameras.main;
      cam.fadeOut(500, 0, 0, 0);
      cam.once('camerafadeoutcomplete', () => {
        ui.carregandoTitulo.textContent = 'Fim do Dia ' + relogio.dia + ' — até amanhã, ' + nomeAluno + '!';
        ui.carregandoDica.hidden = true;
        ui.carregando.hidden = false;
        relogio.dia++;
        relogio.min = INICIO_DIA;
        relogio.entrou = true;
        relogio.avisouSaida = false;
        // NPCs voltam aos lugares de origem e os portões começam fechados
        const mem = memoria[b.id];
        if (mem) { mem.npcs = {}; mem.portoes = {}; }
        setTimeout(() => {
          ui.carregando.hidden = true;
          this.scene.restart({ bloco: b.id, chegada: b.inicioDentro || b.inicio });
        }, 3000);
      });
    }

    // O estudante está com os pés na grama? (para o som dos passos)
    pisandoNaGrama() {
      const p = pes(this.jogador), t = this.camada.getTileAtWorldXY(p.x, p.y);
      const nome = t ? VilaArte.TILES[t.index] : '';
      return /^grama|^flores$/.test(nome);
    }

    moverJogador() {
      const j = this.jogador, k = this.teclas;
      let vx = 0, vy = 0;
      if (!this.conversa && !this.ocupado) {
        if (k.A.isDown || k.LEFT.isDown) vx -= 1;
        if (k.D.isDown || k.RIGHT.isDown) vx += 1;
        if (k.W.isDown || k.UP.isDown) vy -= 1;
        if (k.S.isDown || k.DOWN.isDown) vy += 1;
      }
      const vel = k.SHIFT.isDown ? VEL_CORRENDO : VEL_JOGADOR;
      const v = new Phaser.Math.Vector2(vx, vy).normalize().scale(vel);
      j.setVelocity(v.x, v.y);
      som.passos(vx || vy ? (k.SHIFT.isDown ? 'correr' : this.pisandoNaGrama() ? 'grama' : 'passos') : null);
      if (vx || vy) {
        j.direcao = vx ? (vx < 0 ? 'esquerda' : 'direita') : (vy < 0 ? 'cima' : 'baixo');
        j.anims.play('jogador-andar-' + j.direcao, true);
        j.anims.timeScale = vel / VEL_JOGADOR;
      } else {
        j.anims.stop();
        j.setFrame(quadroParado(j.direcao));
      }
    }

    // NPC: fica parado um tempo, escolhe uma direção, anda um pouco, para de novo.
    // Se já se afastou demais de casa (raio, em tiles), tende a voltar.
    moverNpc(n, tempo) {
      const ia = n.ia;
      if (n.animando) return;   // está numa cena (ex.: abrindo o portão)
      if (n.dados.porta && tempo > n.proximaPorta && n !== (this.conversa && this.conversa.npc) && n !== this.npcDaAula) {
        if (this.entrarNaPorta(n)) return;
      }
      // NPC "fixo" (ex.: o porteiro) fica no posto; só se vira para conversar.
      if (n.dados.fixo || n === (this.conversa && this.conversa.npc) || n === this.npcDaAula) {
        n.setVelocity(0, 0); n.anims.stop(); n.setFrame(quadroParado(n.direcao));
        return;
      }
      const bloqueado = n.body.blocked.left || n.body.blocked.right || n.body.blocked.up || n.body.blocked.down ||
        n.body.touching.left || n.body.touching.right || n.body.touching.up || n.body.touching.down;
      if (ia.estado === 'andando' && (tempo > ia.ate || bloqueado)) {
        ia.estado = 'parado';
        ia.ate = tempo + Phaser.Math.Between(800, 2800);
      } else if (ia.estado === 'parado' && tempo > ia.ate) {
        const raio = (n.dados.raio || 6) * T;
        const dx = n.casa.x - n.x, dy = n.casa.y - n.y;
        n.direcao = Math.hypot(dx, dy) > raio && Math.random() < 0.8
          ? direcaoPara(dx, dy)
          : Phaser.Utils.Array.GetRandom(['baixo', 'cima', 'esquerda', 'direita']);
        ia.estado = 'andando';
        ia.ate = tempo + Phaser.Math.Between(400, 1500);
      }
      if (ia.estado === 'andando') {
        const [x, y] = VETOR[n.direcao];
        n.setVelocity(x * VEL_NPC, y * VEL_NPC);
        n.anims.play('npc-' + n.dados.id + '-andar-' + n.direcao, true);
        n.anims.timeScale = 0.7;
      } else {
        n.setVelocity(0, 0);
        n.anims.stop();
        n.setFrame(quadroParado(n.direcao));
      }
    }

    npcPerto() {
      const p = pes(this.jogador);
      // `alcance` (px) deixa falar de mais longe — o porteiro fala por trás do portão.
      let melhor = null, menor = Infinity;
      this.npcs.getChildren().forEach(n => {
        if (n.animando) return;   // ocupado numa cena (ex.: fechando o portão)
        const q = pes(n), d = Math.hypot(q.x - p.x, q.y - p.y);
        if (d < (n.dados.alcance || DIST_CONVERSA) && d < menor) { menor = d; melhor = n; }
      });
      return melhor;
    }

    atualizarBalao() {
      const n = this.conversa || this.ocupado ? null : this.npcPerto();
      this.balao.setVisible(!!n);
      if (n) this.balao.setPosition(n.x, n.y - 36);
    }

    // ---------- diálogo ----------
    apertouE() {
      if (this.trocando || this.ocupado) return;
      if (this.conversa) return this.avancarDialogo();
      const n = this.npcPerto();
      if (!n) return;
      // Quem cuida de um portão fechado: fala `antesDeAbrir`, vai até o
      // portão, abre com as mãos e, de volta ao posto, fala `depoisDeAbrir`.
      // De dentro da escola, só abre a partir da hora da saída (com `antesDeSair`
      // e `depoisDeSair`); antes disso, conversa normalmente.
      const portao = n.dados.abre && this.portoes[n.dados.abre];
      const dentro = portao && pes(this.jogador).y < portao.dados.y * T;
      if (portao && !portao.aberto && !portao.fechando && (!dentro || podeSair())) {
        const antes = dentro ? n.dados.antesDeSair : n.dados.antesDeAbrir;
        const depois = dentro ? n.dados.depoisDeSair : n.dados.depoisDeAbrir;
        this.abrirDialogo(n, antes || [], () =>
          this.abrirPortao(portao, n, () => this.abrirDialogo(n, depois || [])));
      } else this.abrirDialogo(n, null, n.dados.aulas ? () => this.abrirAulas(n) : undefined);
    }

    // ---------- aulas e perguntas (NPC com `aulas: true`) ----------
    // Usa conteudo/conteudos_<série>ano/<série>-ano-completo.json:
    // escolhe a matéria, lê as aulas e responde às questões.
    async abrirAulas(n) {
      if (this.trocando) return;
      this.ocupado = true;
      this.npcDaAula = n;
      this.jogador.setVelocity(0, 0);
      som.passos(null);
      const mem = memoria.aulas = memoria.aulas || {};
      const quem = nomeDe(n.dados);
      try {
        if (!serie) await escolherSerie(false);
        const dados = await carregarConteudo(serie);
        if (!dados) {
          await mostrarMenu({ titulo: quem, opcoes: ['OK'],
            texto: serie ? 'Não consegui abrir as aulas do ' + nomeSerie(serie) + '. Abra o jogo por um servidor (npx serve .).'
              : 'Escolha a sua série (ESC → Série) para estudar comigo.' });
          return;
        }
        let quer = await mostrarMenu({ titulo: quem, texto: 'Quer estudar uma matéria do ' + nomeSerie(serie) + ' comigo?', opcoes: ['Quero!', 'Agora não'] });
        if (quer === 0) som.musica(true, 'missao');   // música de missão durante as aulas
        while (quer === 0 && !this.trocando) {
          const materias = dados.materias.filter(m => (m.conteudos || []).length || (m.questoes || []).length);
          const opcoes = materias.map(m => {
            const p = mem[serie + '|' + m.nome];
            return m.nome + (p ? '  ✔ ' + p.acertos + '/' + p.total : '');
          });
          const i = await mostrarMenu({ titulo: 'Aulas do ' + nomeSerie(serie), texto: 'Escolha a matéria:', opcoes: [...opcoes, 'Sair'] });
          if (i < 0 || i === materias.length) break;
          const fim = await this.estudar(materias[i], mem);
          if (fim !== 0) break;
        }
      } finally {
        som.parar('errou');
        som.musica(false, 'missao');
        this.npcDaAula = null;
        this.ocupado = false;
        n.ia.estado = 'parado';
        n.ia.ate = this.time.now + 1500;
      }
    }

    // Uma matéria: as aulas, uma por tela, e depois as perguntas.
    // Devolve 0 para voltar à lista de matérias, outro número para sair.
    async estudar(m, mem) {
      const aulas = (m.conteudos || []).filter(c => c && c.aula);
      for (let k = 0; k < aulas.length; k++) {
        const ultima = k === aulas.length - 1;
        const r = await mostrarMenu({ titulo: m.nome + ' · ' + (aulas[k].titulo || 'Aula ' + (k + 1)), texto: aulas[k].aula,
          opcoes: [ultima ? 'Ir para as perguntas ▶' : 'Próximo ▶'] });
        if (r < 0) return 0;
      }
      const questoes = (m.questoes || []).filter(q => q && q.pergunta && Array.isArray(q.alternativas) && q.alternativas.length);
      if (!questoes.length) return 0;
      let acertos = 0;
      for (let k = 0; k < questoes.length; k++) {
        const q = questoes[k];
        const r = await mostrarMenu({ titulo: m.nome + ' · Pergunta ' + (k + 1) + ' de ' + questoes.length, texto: q.pergunta,
          opcoes: q.alternativas.map(a => a.id + ') ' + a.texto) });
        if (r < 0) return 0;
        const certa = q.alternativas.find(a => a.id === q.resposta_correta);
        const acertou = q.alternativas[r].id === q.resposta_correta;
        if (acertou) acertos++;
        else { som.segurar('missao', true); som.tocar('errou'); }   // a música para e toca a vinheta de erro
        await mostrarMenu({
          titulo: acertou ? '✔ Certo!' : '✘ Não foi dessa vez',
          texto: (acertou || !certa ? '' : 'A resposta é ' + certa.id + ') ' + certa.texto + '.\n\n') + (q.explicacao || ''),
          opcoes: ['Continuar']
        });
        if (!acertou) { som.parar('errou'); som.segurar('missao', false); }
      }
      const chave = serie + '|' + m.nome, antes = mem[chave];
      if (!antes || acertos > antes.acertos) mem[chave] = { acertos, total: questoes.length };
      return mostrarMenu({
        titulo: m.nome + ': ' + acertos + ' de ' + questoes.length,
        texto: acertos === questoes.length ? 'Gabaritou, ' + nomeAluno + '! Mandou muito bem.'
          : acertos ? 'Bom trabalho! Dá para tentar de novo quando quiser.' : 'Releia as aulas e tente outra vez. Errar faz parte!',
        opcoes: ['Escolher outra matéria', 'Sair']
      });
    }

    // Anda até (x, y) em linha reta: primeiro na vertical, depois na horizontal.
    andarAte(n, x, y, pronto) {
      const passos = [];
      if (Math.round(n.y) !== Math.round(y)) passos.push({ y, dir: y < n.y ? 'cima' : 'baixo', d: Math.abs(y - n.y) });
      if (Math.round(n.x) !== Math.round(x)) passos.push({ x, dir: x < n.x ? 'esquerda' : 'direita', d: Math.abs(x - n.x) });
      const proximo = () => {
        const p = passos.shift();
        if (!p) { n.anims.stop(); n.setFrame(quadroParado(n.direcao)); return pronto(); }
        n.direcao = p.dir;
        n.anims.play('npc-' + n.dados.id + '-andar-' + p.dir, true);
        n.anims.timeScale = 0.8;
        const alvo = p.x !== undefined ? { x: p.x } : { y: p.y };
        this.tweens.add({ targets: n, ...alvo, duration: p.d / 160 * 1000, onComplete: proximo });
      };
      proximo();
    }

    // Liga/desliga as barreiras e acerta a profundidade da folha da direita conforme o portão.
    ajustarPortao(portao) {
      const y0 = portao.dados.y * T;
      portao.trava.body.enable = !portao.aberto;
      portao.aberta.body.enable = portao.aberto;
      // fechada fica na linha do muro; aberta avança pela calçada
      portao.movel.setDepth(portao.aberto ? y0 + 2 * T : y0 + T * 3 / 4);
    }

    // O porteiro vai até o meio do portão (por dentro), destrava e empurra a
    // folha da direita, que gira para fora; depois volta ao posto.
    abrirPortao(portao, n, pronto) {
      this.ocupado = true;
      this.jogador.setVelocity(0, 0);
      n.animando = true;
      n.setVelocity(0, 0);
      n.body.enable = false;
      const posto = { x: n.x, y: n.y };
      const meio = { x: (portao.dados.x + 1) * T, y: portao.dados.y * T - T / 4 };   // logo atrás do trinco
      this.andarAte(n, meio.x, meio.y, () => {
        n.direcao = 'baixo'; n.setFrame(quadroParado('baixo'));
        this.time.delayedCall(350, () => {           // destrava...
          this.cameras.main.shake(80, 0.0015);
          n.anims.play('npc-' + n.dados.id + '-andar-baixo', true);
          n.anims.timeScale = 0.5;
          // ...e empurra: o porteiro dá um passo para a frente e a folha da direita gira para fora
          this.tweens.add({ targets: n, y: '+=' + T / 4, duration: 500, yoyo: true, hold: 500, ease: 'Sine.easeInOut' });
          portao.movel.setDepth(portao.dados.y * T + T);
          som.tocar('portao');
          const giro = { q: 0 };
          this.tweens.add({ targets: giro, q: VilaArte.QUADROS_PORTAO - 1, duration: 1200, ease: 'Sine.easeOut',
            onUpdate: () => portao.movel.setFrame(Math.round(giro.q)),
            onComplete: () => {
              portao.aberto = true;
              memoria[this.bloco.id].portoes[portao.dados.id] = true;
              this.ajustarPortao(portao);
              n.anims.stop(); n.setFrame(quadroParado('baixo'));
              this.time.delayedCall(500, () => this.andarAte(n, posto.x, posto.y, () => {
                n.body.reset(n.x, n.y);
                n.body.enable = true;
                n.animando = false;
                this.ocupado = false;
                pronto();
              }));
            } });
        });
      });
    }

    // Depois que o estudante entra: o porteiro vai até o meio do portão, puxa a
    // folha da direita de volta, tranca e volta ao posto. O estudante continua
    // andando enquanto isso (só o porteiro fica ocupado).
    fecharPortao(portao) {
      const n = portao.porteiro;
      portao.fechando = true;
      n.animando = true;
      n.setVelocity(0, 0);
      n.body.enable = false;
      if (this.conversa && this.conversa.npc === n) this.fecharDialogo();
      const posto = { x: n.x, y: n.y };
      const meio = { x: (portao.dados.x + 1) * T, y: portao.dados.y * T - T / 4 };
      this.andarAte(n, meio.x, meio.y, () => {
        n.direcao = 'baixo'; n.setFrame(quadroParado('baixo'));
        this.time.delayedCall(250, () => {
          // estica o braço para a frente e puxa de volta: a folha gira para dentro do vão
          this.tweens.add({ targets: n, y: '+=' + T / 4, duration: 400, yoyo: true, hold: 600, ease: 'Sine.easeInOut' });
          portao.movel.setDepth(portao.dados.y * T + T);
          som.tocar('portao');
          const giro = { q: VilaArte.QUADROS_PORTAO - 1 };
          this.tweens.add({ targets: giro, q: 0, delay: 300, duration: 1200, ease: 'Sine.easeIn',
            onUpdate: () => portao.movel.setFrame(Math.round(giro.q)),
            onComplete: () => {
              this.cameras.main.shake(80, 0.0015);   // bate e tranca
              portao.aberto = false;
              portao.dentroDesde = null;
              memoria[this.bloco.id].portoes[portao.dados.id] = false;
              this.ajustarPortao(portao);
              this.time.delayedCall(400, () => this.andarAte(n, posto.x, posto.y, () => {
                n.body.reset(n.x, n.y);
                n.body.enable = true;
                n.animando = false;
                portao.fechando = false;
              }));
            } });
        });
      });
    }

    // Onde parar diante de uma porta, para que lado olhar e como entrar.
    // Porta comum (na parede da frente): para embaixo dela, olha para cima e entra subindo.
    // Porta lateral (`lado: 'direita'`, na parede do lado direito do prédio): para à
    // direita dela, olha para a esquerda e entra andando para a esquerda.
    comoEntrar(pt) {
      if (pt.lado === 'direita') return {
        frente: { x: (pt.x + 1) * T + T * 0.4, y: pt.y * T + T / 4 }, olhar: 'esquerda', sair: 'direita',
        passo: { x: -T * 0.6, y: 0 }, textura: 'porta-aberta-lateral', profundidade: (pt.y + 1) * T - 1 };
      return {
        frente: { x: (pt.x + 0.5) * T, y: (pt.y + 1) * T + T / 4 }, olhar: 'cima', sair: 'baixo',
        passo: { x: 0, y: -T * 0.55 }, textura: 'porta-aberta', profundidade: (pt.y + 1) * T - 1 };
    }

    // Toca um som só se o estudante estiver perto de onde ele acontece.
    somPerto(k, x, y, alcance = 8 * T) {
      if (Math.hypot(this.jogador.x - x, this.jogador.y - y) <= alcance) som.tocar(k);
    }

    // NPC com `porta` (uma porta { x, y, lado? } ou uma lista delas): sorteia uma porta
    // perto, anda até a frente dela, a porta abre, ele dá um passo para dentro sumindo
    // aos poucos e a porta fecha. Depois de um tempo a porta abre de novo e ele sai.
    // Devolve false se nenhuma porta estiver perto (tenta de novo daqui a pouco).
    entrarNaPorta(n) {
      const PERTO = 8 * T;
      const opcoes = [].concat(n.dados.porta).map(pt => ({ pt, ...this.comoEntrar(pt) }))
        .filter(o => Math.hypot(n.x - o.frente.x, n.y - o.frente.y) <= PERTO);
      if (!opcoes.length) { n.proximaPorta = this.time.now + 3000; return false; }
      const { pt, frente, olhar, sair, passo, textura, profundidade } = Phaser.Utils.Array.GetRandom(opcoes);
      // porta aberta por cima do tile da porta; quem entra passa por trás dela
      const aberta = this.add.image(pt.x * T, pt.y * T, textura).setOrigin(0, 0).setDepth(profundidade).setVisible(false);
      const id = n.dados.id;
      n.animando = true;
      n.setVelocity(0, 0);
      n.body.enable = false;
      this.andarAte(n, frente.x, frente.y, () => {
        n.direcao = olhar; n.setFrame(quadroParado(olhar));
        aberta.setVisible(true);                                   // abre a porta
        this.somPerto('porta', frente.x, frente.y);
        this.time.delayedCall(300, () => {
          n.anims.play('npc-' + id + '-andar-' + olhar, true);
          this.tweens.add({ targets: n, x: frente.x + passo.x, y: frente.y + passo.y, alpha: 0, duration: 700,   // entra e some
            onComplete: () => {
              n.anims.stop();
              n.setVisible(false);
              this.time.delayedCall(300, () => aberta.setVisible(false));              // fecha a porta
              this.time.delayedCall(Phaser.Math.Between(10000, 25000), () => {        // fica lá dentro
                aberta.setVisible(true);                                               // abre de novo
                this.somPerto('porta', frente.x, frente.y);
                n.setVisible(true);
                n.direcao = sair;
                n.anims.play('npc-' + id + '-andar-' + sair, true);
                this.tweens.add({ targets: n, x: frente.x, y: frente.y, alpha: 1, duration: 700, delay: 300,   // sai
                  onComplete: () => {
                    n.anims.stop(); n.setFrame(quadroParado(sair));
                    this.time.delayedCall(300, () => aberta.destroy());                // fecha
                    n.body.reset(n.x, n.y);
                    n.body.enable = true;
                    n.animando = false;
                    n.ia.estado = 'parado'; n.ia.ate = this.time.now + 1500;
                    n.proximaPorta = this.time.now + Phaser.Math.Between(20000, 45000);
                  } });
              });
            } });
        });
      });
      return true;
    }

    // falas/aoFim são opcionais: sem elas, usa a próxima lista de `conversas`.
    abrirDialogo(n, falas, aoFim) {
      if (!falas) {
        const mem = memoria[this.bloco.id];
        mem.conversas = mem.conversas || {};
        const vez = mem.conversas[n.dados.id] || 0;
        mem.conversas[n.dados.id] = vez + 1;
        const lista = falasDe(n.dados);
        falas = lista[vez % lista.length];
      }
      if (!falas.length) return aoFim && aoFim();
      this.conversa = { npc: n, falas, i: 0, aoFim };

      // o NPC para e olha para o jogador; o jogador olha para o NPC
      n.direcao = direcaoPara(this.jogador.x - n.x, this.jogador.y - n.y);
      this.jogador.direcao = direcaoPara(n.x - this.jogador.x, n.y - this.jogador.y);

      ui.dialogoNome.textContent = nomeDe(n.dados);
      ui.dialogo.hidden = false;
      this.escreverFala();
    }

    // Põe o balão de fala em cima da cabeça de quem está falando (sem sair da
    // tela). Se não couber em cima (NPC no alto da tela), vai para baixo dos pés.
    posicionarFala() {
      if (!this.conversa) return;
      const n = this.conversa.npc, el = ui.dialogo, view = this.cameras.main.worldView;
      const tela = this.game.canvas.getBoundingClientRect(), esc = tela.width / this.scale.width;
      const x = tela.left + (n.x - view.x) * esc;
      const cabeca = tela.top + (n.y - T / 2 + 4 - view.y) * esc, pe = tela.top + (n.y + T / 2 - view.y) * esc;
      const w = el.offsetWidth, h = el.offsetHeight, MARGEM = 8, CAUDA = 14, TOPO_LIVRE = 48;   // HUD em cima
      const left = Math.max(MARGEM, Math.min(innerWidth - w - MARGEM, x - w / 2));
      let top = cabeca - h - CAUDA;
      const embaixo = top < TOPO_LIVRE;
      if (embaixo) top = pe + CAUDA;
      el.style.left = Math.round(left) + 'px';
      el.style.top = Math.round(top) + 'px';
      el.style.setProperty('--cauda', Math.round(Math.max(16, Math.min(w - 16, x - left))) + 'px');
      el.classList.toggle('embaixo', embaixo);
    }

    escreverFala() {
      const conv = this.conversa, texto = preencher(conv.falas[conv.i]);
      let n = 0;
      conv.escrevendo = true;
      ui.dialogoSeta.hidden = true;
      // fixa largura e altura do balão pela fala inteira, para ele não ficar
      // mudando de tamanho enquanto as letras aparecem
      ui.dialogo.style.width = '';
      ui.dialogoTexto.style.minHeight = '';
      ui.dialogoTexto.textContent = texto;
      ui.dialogo.style.width = Math.ceil(ui.dialogo.getBoundingClientRect().width) + 'px';
      ui.dialogoTexto.style.minHeight = ui.dialogoTexto.offsetHeight + 'px';
      ui.dialogoTexto.textContent = '';
      this.posicionarFala();
      som.laco('dialogo', true);   // som de diálogo enquanto as letras aparecem
      if (this.maquina) this.maquina.remove();
      this.maquina = this.time.addEvent({
        delay: 28, repeat: texto.length - 1, callback: () => {
          n++;
          ui.dialogoTexto.textContent = texto.slice(0, n);
          if (n >= texto.length) this.terminouFala();
        }
      });
    }
    terminouFala() {
      if (this.maquina) this.maquina.remove();
      som.laco('dialogo', false);
      this.conversa.escrevendo = false;
      ui.dialogoTexto.textContent = preencher(this.conversa.falas[this.conversa.i]);
      ui.dialogoSeta.hidden = false;
    }
    avancarDialogo() {
      const conv = this.conversa;
      if (conv.escrevendo) return this.terminouFala();
      conv.i++;
      if (conv.i >= conv.falas.length) return this.fecharDialogo();
      this.escreverFala();
    }
    fecharDialogo() {
      if (this.maquina) this.maquina.remove();
      som.laco('dialogo', false);
      const conv = this.conversa;
      if (conv) {
        conv.npc.ia.estado = 'parado';
        conv.npc.ia.ate = this.time.now + 1500;   // fica um pouquinho parado antes de voltar a andar
      }
      this.conversa = null;
      ui.dialogo.hidden = true;
      // aoFim só quando a conversa termina de verdade (não na troca de bloco)
      if (conv && conv.aoFim && !this.trocando) conv.aoFim();
    }

    // ---------- troca de bloco ----------
    conferirSaidas() {
      const p = pes(this.jogador), tx = p.x / T, ty = p.y / T;
      const s = (this.bloco.saidas || []).find(s => tx >= s.x && tx < s.x + s.w && ty >= s.y && ty < s.y + s.h);
      if (s) this.irPara(s);
    }

    irPara(saida) {
      this.trocando = true;
      som.passos(null);
      this.fecharDialogo();
      this.jogador.setVelocity(0, 0);
      this.npcs.getChildren().forEach(n => n.setVelocity(0, 0));
      // guarda onde cada NPC estava, para ele continuar lá na volta
      const mem = memoria[this.bloco.id];
      this.npcs.getChildren().forEach(n => { mem.npcs[n.dados.id] = { x: n.x, y: n.y, direcao: n.direcao }; });

      const cam = this.cameras.main;
      cam.fadeOut(250, 0, 0, 0);
      cam.once('camerafadeoutcomplete', () => {
        telaCarregando(saida.para)
          .then(() => this.scene.restart({ bloco: saida.para, chegada: saida.chegada }))
          .catch(err => { ui.carregandoTitulo.textContent = '⚠ ' + err.message; console.error(err); });
      });
    }
  }

  // Ampliação sempre inteira (1x, 2x, 3x...): com ampliação quebrada (ex.: 2,9x)
  // uns pixels viram 2 pixels da tela e outros 3, e tudo tremeluz ao andar.
  // A área de jogo se ajusta à janela, mostrando por volta de LARGURA x ALTURA.
  function zoomInteiro() {
    return Math.max(1, Math.round(Math.min(innerWidth / LARGURA, innerHeight / ALTURA)));
  }
  function tamanhoDaTela() {
    const z = zoomInteiro();
    return { z, w: Math.ceil(innerWidth / z), h: Math.ceil(innerHeight / z) };
  }

  function iniciar(elemento) {
    prepararUI();
    const tela = tamanhoDaTela();
    jogo = new Phaser.Game({
      type: Phaser.AUTO,
      parent: elemento,
      width: tela.w,
      height: tela.h,
      pixelArt: true,
      roundPixels: true,
      backgroundColor: '#000000',
      physics: { default: 'arcade', arcade: { debug: false } },
      scale: { mode: Phaser.Scale.NONE, zoom: tela.z },
      scene: [Inicio, Mundo, Som]
    });
    addEventListener('resize', () => {
      const t = tamanhoDaTela();
      jogo.scale.resize(t.w, t.h);
      jogo.scale.setZoom(t.z);
    });
    return jogo;
  }

  return { registrarBloco, carregarBloco, iniciar, zoomInteiro, blocos, memoria, pngs, dialogos, conteudos: conteudoPronto, som, relogio,
    get jogo() { return jogo; } };
})();
