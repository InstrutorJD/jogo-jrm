// Vila Pixel — motor do protótipo (Phaser 3).
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
//   portoes: [{ id, x, y }]  portão de grade de 2 tiles, começa fechado
//
// Arte: tiles e quadros de 32x32. Os PNGs de sprites/ (feitos pelos alunos)
// são usados quando existem; o que falta vem do arte.js — ver carregarPng().
window.VilaPixel = (function () {
  const T = VilaArte.T;                        // 32
  const LARGURA = 768, ALTURA = 432;           // área de jogo de referência (24 x 13,5 tiles)
  const VEL_JOGADOR = 160, VEL_CORRENDO = 260, VEL_NPC = 56;
  const DIST_CONVERSA = 44;                    // px entre os pés

  // Legenda do mapa → nome do tile (ver VilaArte.TILES).
  const LEGENDA = {
    '.': 'grama', ',': 'gramaAlta', '"': 'flores', '=': 'caminho', '#': 'arvore',
    '~': 'agua', 'F': 'cerca', 'r': 'pedra', 'R': 'telhado', 'W': 'parede',
    'w': 'janela', 'D': 'porta', 'p': 'piso', 'o': 'fonte', 'b': 'banco',
    'a': 'areia', 'x': 'ponte', 'M': 'muro', 'P': 'pilar', 'G': 'trilho',
    'c': 'calcada', 'e': 'asfalto', 'k': 'bicicletaVermelha', 'K': 'bicicletaAzul'
  };
  const SOLIDOS = ['arvore', 'agua', 'cerca', 'pedra', 'telhado', 'parede', 'janela', 'porta',
    'banco', 'fonteTL', 'fonteTR', 'fonteBL', 'fonteBR', 'muro', 'pilar',
    'bicicletaVermelha', 'bicicletaAzul'];

  // Primeiro nome do aluno (o portal abre o jogo com ?name=...); vira {nome} nas falas.
  const PARAMS = new URLSearchParams(location.search);
  const NOME_ALUNO = (PARAMS.get('name') || '').trim().split(/\s+/)[0] || 'aluno';
  // Variáveis que podem aparecer nas falas. Uma variável desconhecida fica como está na tela.
  const VARIAVEIS = {
    nome: () => NOME_ALUNO,
    aluno: () => NOME_ALUNO,
    horario: () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
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
  function carregarDialogos(ids) {
    return Promise.all(ids.filter(id => !(id in dialogos)).map(id => {
      dialogos[id] = null;
      return fetch(BASE + 'dialogos/' + id + '.json')
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (!d) return;
          const conversas = Array.isArray(d.conversas) ? d.conversas.filter(conversaValida) : [];
          if (!conversas.length) return console.warn('[VilaPixel] dialogos/' + id + '.json não tem conversas válidas — usando as falas do bloco.');
          dialogos[id] = { nome: typeof d.nome === 'string' && d.nome.trim() ? d.nome.trim() : null, conversas };
          console.log('[VilaPixel] usando dialogos/' + id + '.json');
        })
        .catch(e => console.warn('[VilaPixel] dialogos/' + id + '.json: ' + e.message));
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
  const SONS = {
    menu:   { arquivos: ['sons/musicas/pause_ou_menu.mp3'], volume: 0.45, loop: true },
    passos: { arquivos: ['sons/efeitos/passos.mp3'], volume: 0.3, loop: true },
    correr: { arquivos: ['sons/efeitos/passos2.mp3'], volume: 0.3, loop: true }
  };
  let jogo = null;
  let mudo = lembrar('vilaPixelMudo') === '1';
  const som = {
    sons: {}, querMusica: false, passo: null,
    item(k) {
      if (!jogo || !jogo.cache.audio.exists(k)) return null;
      return this.sons[k] || (this.sons[k] = jogo.sound.add(k, { loop: SONS[k].loop, volume: SONS[k].volume }));
    },
    musica(ligar) {
      this.querMusica = ligar;
      const s = this.item('menu');
      if (!s) return;
      if (ligar) { if (!s.isPlaying) s.play(); } else if (s.isPlaying) s.stop();
    },
    // tipo: 'passos' (andando), 'correr' (com SHIFT) ou null (parado)
    passos(tipo) {
      if (tipo === this.passo) return;
      this.passo = tipo;
      ['passos', 'correr'].forEach(k => {
        const s = this.item(k);
        if (!s) return;
        if (k === tipo) { if (!s.isPlaying) s.play(); } else if (s.isPlaying) s.stop();
      });
    },
    // chamado quando os arquivos terminam de baixar
    carregou() { this.musica(this.querMusica); const p = this.passo; this.passo = null; this.passos(p); }
  };
  function alternarSom() {
    mudo = !mudo;
    guardar('vilaPixelMudo', mudo ? '1' : '0');
    if (jogo) jogo.sound.mute = mudo;
    ui.hudSom.textContent = mudo ? '🔇' : '🔊';
    ui.hudSom.title = mudo ? 'Ligar o som (M)' : 'Desligar o som (M)';
  }

  // Cena sem imagem que fica rodando o jogo inteiro só para baixar os sons,
  // sem atrasar o começo (a música tem uns 5 MB).
  class Som extends Phaser.Scene {
    constructor() { super('Som'); }
    preload() {
      this.load.setPath(BASE);
      Object.keys(SONS).forEach(k => this.load.audio(k, SONS[k].arquivos));
      this.load.on('loaderror', f => console.warn('[VilaPixel] não deu para carregar o som ' + f.key + ' (abra o jogo por um servidor: npx serve .)'));
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
  function montarDados(mapa) {
    const alt = mapa.length, larg = Math.max(...mapa.map(l => l.length));
    const ch = (x, y) => (mapa[y] || '')[x] || '.';
    const dados = [];
    for (let y = 0; y < alt; y++) {
      const linha = [];
      for (let x = 0; x < larg; x++) {
        let nome = LEGENDA[ch(x, y)] || 'grama';
        if (nome === 'grama') nome = 'grama' + (1 + ((x * 7 + y * 13 + x * y) % 3));
        if (nome === 'fonte') nome = 'fonte' + (ch(x, y - 1) === 'o' ? 'B' : 'T') + (ch(x - 1, y) === 'o' ? 'R' : 'L');
        linha.push(idx(nome));
      }
      dados.push(linha);
    }
    return dados;
  }

  // ---------- telas HTML por cima do jogo (diálogo, nome do bloco) ----------
  const ui = {};
  function prepararUI() {
    ['dialogo', 'dialogoNome', 'dialogoTexto', 'dialogoRetrato', 'dialogoSeta',
      'faixaBloco', 'faixaNome', 'faixaSub', 'hudBloco', 'carregando', 'carregandoTitulo',
      'carregandoFrase', 'carregandoDica', 'menu', 'menuTitulo', 'menuTexto', 'menuOpcoes',
      'hudSom'].forEach(id => ui[id] = document.getElementById(id));
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
      texto: 'As aulas do Mestre Bit são da série que você escolher.',
      opcoes: ['1º ano', '2º ano', '3º ano'],
      cancelar: obrigatorio ? null : -1
    });
    if (i < 0) return;
    serie = String(i + 1);
    guardar('vilaPixelSerie', serie);
    await carregarConteudo(serie);
  }

  // tela inicial: espera um clique/tecla (o navegador só deixa tocar som depois disso)
  async function telaInicial() {
    ui.carregando.hidden = true;
    som.musica(true);
    await mostrarMenu({ titulo: 'Vila Pixel', texto: 'CEPI João Roberto Moreira', opcoes: ['▶ Jogar'], cancelar: null });
    if (!serie) await escolherSerie(true);
    else await carregarConteudo(serie);
    som.musica(false);
  }

  // pausa (ESC ou P): o mundo para e toca a música do menu
  async function pausar() {
    const cena = jogo && jogo.scene.getScene('Mundo');
    if (!cena || !cena.scene.isActive() || cena.trocando) return;
    cena.scene.pause();
    som.passos(null);
    som.musica(true);
    for (;;) {
      const opcoes = ['Continuar', 'Som: ' + (mudo ? 'desligado' : 'ligado')];
      if (!SERIE_DA_URL) opcoes.push('Série: ' + nomeSerie(serie));
      const i = await mostrarMenu({ titulo: 'Pausado', opcoes });
      if (i === 1) { alternarSom(); continue; }
      if (i === 2) { await escolherSerie(false); continue; }
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
  });
  function mostrarFaixa(bloco) {
    ui.faixaNome.textContent = bloco.nome;
    ui.faixaSub.textContent = bloco.subtitulo || '';
    ui.hudBloco.textContent = bloco.nome;
    ui.faixaBloco.classList.remove('ativa'); void ui.faixaBloco.offsetWidth; ui.faixaBloco.classList.add('ativa');
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
          this.textures.addCanvas('seta', VilaArte.gerarSeta());
          this.textures.addCanvas('grade', VilaArte.gerarGrade());
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
    sprite.body.setSize(20, 12).setOffset(6, 18);
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
      const dados = montarDados(b.mapa);
      const mapa = this.make.tilemap({ data: dados, tileWidth: T, tileHeight: T });
      const tileset = mapa.addTilesetImage('tiles', 'tiles', T, T, 0, 0);
      this.camada = mapa.createLayer(0, tileset, 0, 0);
      this.camada.setCollision(SOLIDOS.map(idx));
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
        corpoNosPes(n);
        n.body.pushable = false;
        n.setFrame(quadroParado(n.direcao));
      });
      this.physics.add.collider(this.npcs, this.camada);
      this.physics.add.collider(this.npcs, this.npcs);
      this.physics.add.collider(this.jogador, this.npcs);

      // portões de grade: a folha é uma imagem com corpo físico que bloqueia
      // a passagem enquanto está fechada; ao abrir, desliza para o lado (sobre
      // o muro) e o corpo é desligado. Um portão aberto continua aberto.
      mem.portoes = mem.portoes || {};
      this.portoes = {};
      (b.portoes || []).forEach(p => {
        const aberto = !!mem.portoes[p.id];
        const x = p.x * T + T, y = p.y * T + T / 2;
        const folha = this.physics.add.staticImage(x + (aberto ? 2 * T : 0), y, 'grade').setDepth(y + T / 4);
        folha.body.enable = !aberto;
        this.physics.add.collider(this.jogador, folha);
        this.physics.add.collider(this.npcs, folha);
        this.portoes[p.id] = { dados: p, folha, aberto };
      });

      // letreiros pintados no muro (ex.: o nome da escola).
      // x = centro (em tiles), y = linha do tile de muro onde fica a pintura.
      (b.letreiros || []).forEach((l, i) => {
        const chave = 'letreiro-' + b.id + '-' + i;
        if (!this.textures.exists(chave)) this.textures.addCanvas(chave, VilaArte.gerarLetreiro(l.texto, l.cor || '#1f4f8f'));
        const larg = this.textures.get(chave).getSourceImage().width;
        this.add.image(Math.round(l.x * T - larg / 2), l.y * T + 2, chave).setOrigin(0, 0).setDepth(l.y * T + T - 2);
      });

      // setas nas saídas
      (b.saidas || []).forEach(s => {
        const leste = s.x * T >= largPx / 2;
        const seta = this.add.image((s.x + s.w / 2) * T + (leste ? -20 : 20), (s.y + s.h / 2) * T, 'seta').setFlipX(!leste).setDepth(9999);
        this.tweens.add({ targets: seta, x: seta.x + (leste ? 6 : -6), duration: 450, yoyo: true, repeat: -1 });
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

      mostrarFaixa(b);
    }

    update(tempo) {
      if (this.trocando) return;
      this.moverJogador();
      this.npcs.getChildren().forEach(n => this.moverNpc(n, tempo));
      [this.jogador, ...this.npcs.getChildren()].forEach(s => s.setDepth(s.y));
      this.atualizarBalao();
      this.conferirSaidas();
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
      som.passos(vx || vy ? (k.SHIFT.isDown ? 'correr' : 'passos') : null);
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
        const q = pes(n), d = Math.hypot(q.x - p.x, q.y - p.y);
        if (d < (n.dados.alcance || DIST_CONVERSA) && d < menor) { menor = d; melhor = n; }
      });
      return melhor;
    }

    atualizarBalao() {
      const n = this.conversa || this.ocupado ? null : this.npcPerto();
      this.balao.setVisible(!!n);
      if (n) this.balao.setPosition(n.x, n.y - 18);
    }

    // ---------- diálogo ----------
    apertouE() {
      if (this.trocando || this.ocupado) return;
      if (this.conversa) return this.avancarDialogo();
      const n = this.npcPerto();
      if (!n) return;
      // Quem cuida de um portão fechado: fala `antesDeAbrir`, vai até o
      // portão, abre com as mãos e, de volta ao posto, fala `depoisDeAbrir`.
      const portao = n.dados.abre && this.portoes[n.dados.abre];
      if (portao && !portao.aberto) {
        this.abrirDialogo(n, n.dados.antesDeAbrir || [], () =>
          this.abrirPortao(portao, n, () => this.abrirDialogo(n, n.dados.depoisDeAbrir || [])));
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
        await mostrarMenu({
          titulo: acertou ? '✔ Certo!' : '✘ Não foi dessa vez',
          texto: (acertou || !certa ? '' : 'A resposta é ' + certa.id + ') ' + certa.texto + '.\n\n') + (q.explicacao || ''),
          opcoes: ['Continuar']
        });
      }
      const chave = serie + '|' + m.nome, antes = mem[chave];
      if (!antes || acertos > antes.acertos) mem[chave] = { acertos, total: questoes.length };
      return mostrarMenu({
        titulo: m.nome + ': ' + acertos + ' de ' + questoes.length,
        texto: acertos === questoes.length ? 'Gabaritou, ' + NOME_ALUNO + '! Mandou muito bem.'
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
        this.tweens.add({ targets: n, ...alvo, duration: p.d / 80 * 1000, onComplete: proximo });
      };
      proximo();
    }

    // O porteiro vai até a grade, segura o trinco e anda puxando o portão
    // até ele correr por cima do muro; depois volta ao posto.
    abrirPortao(portao, n, pronto) {
      const f = portao.folha;
      this.ocupado = true;
      this.jogador.setVelocity(0, 0);
      n.animando = true;
      n.setVelocity(0, 0);
      n.body.enable = false;
      const posto = { x: n.x, y: n.y };
      const trinco = { x: f.x + 20, y: f.y - 24 };   // logo atrás da grade, no trinco
      this.andarAte(n, trinco.x, trinco.y, () => {
        n.direcao = 'baixo'; n.setFrame(quadroParado('baixo'));
        this.time.delayedCall(350, () => {           // destrava...
          this.cameras.main.shake(80, 0.0015);
          n.anims.play('npc-' + n.dados.id + '-andar-direita', true);
          n.anims.timeScale = 0.5;
          n.direcao = 'direita';
          this.tweens.add({ targets: [f, n], x: '+=' + 2 * T, duration: 1500, ease: 'Sine.easeInOut',   // ...e puxa
            onComplete: () => {
              f.body.enable = false;
              portao.aberto = true;
              memoria[this.bloco.id].portoes[portao.dados.id] = true;
              n.anims.stop(); n.setFrame(quadroParado('direita'));
              this.time.delayedCall(300, () => this.andarAte(n, posto.x, posto.y, () => {
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
      const r = ui.dialogoRetrato, ctx = r.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, r.width, r.height);
      ctx.drawImage(this.textures.get('npc-' + n.dados.id).getSourceImage(), 0, 0, T, T, 0, 0, r.width, r.height);
      ui.dialogo.hidden = false;
      this.escreverFala();
    }

    escreverFala() {
      const conv = this.conversa, texto = preencher(conv.falas[conv.i]);
      let n = 0;
      conv.escrevendo = true;
      ui.dialogoSeta.hidden = true;
      ui.dialogoTexto.textContent = '';
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

  return { registrarBloco, carregarBloco, iniciar, zoomInteiro, blocos, memoria, pngs, dialogos, conteudos: conteudoPronto, som,
    get jogo() { return jogo; } };
})();
