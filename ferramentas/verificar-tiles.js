#!/usr/bin/env node
// Vila Pixel — verifica e corrige os tiles de chão entregues pelos alunos.
//
// Uso:   node ferramentas/verificar-tiles.js [pasta]      (padrão: entregas/)
//
// Coloque na pasta os .png e/ou .piskel dos alunos (pode ter subpastas, por
// turma ou por aluno). Nome sugerido: nome-do-aluno_grama.png
//
// O script:
//   - conserta o que dá: escala 2x/4x, folha com vários frames, nome bagunçado,
//     tile que só veio em .piskel;
//   - avisa o que precisa de olho humano: transparência, borda que não emenda,
//     desenho feito no tamanho errado;
//   - recusa o que precisa refazer: tamanho fora de 16, JPG, arquivo quebrado.
//
// Saída (apagada e recriada a cada vez que o script roda):
//   <pasta>/corrigidos/<tile>/<aluno>.png   tiles prontos, 16x16
//   <pasta>/relatorio.html                  abra no navegador
//
// Depois de escolher o melhor de cada tile, copie para tiles/<tile>.png.
const fs = require('fs'), path = require('path'), zlib = require('zlib');

const TAM = 16;
// Tiles de chão aceitos (o mais longo é procurado primeiro: grama1 antes de grama).
const TILES = ['grama', 'grama1', 'grama2', 'grama3', 'terra', 'cimento'];
// Outros nomes que os alunos podem usar para o mesmo tile.
const SINONIMOS = { concreto: 'cimento', calcada: 'cimento', cimentado: 'cimento', grass: 'grama', chao: 'terra', barro: 'terra' };

// ================= PNG (leitura e escrita, sem bibliotecas) =================
const CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; }
  return t;
})();
function crc32(buf) { let c = -1; for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; }

function lerPNG(buf) {
  if (buf.length < 8 || buf.slice(0, 8).toString('hex') !== '89504e470d0a1a0a') {
    const jpg = buf[0] === 0xff && buf[1] === 0xd8;
    throw new Error(jpg ? 'é um JPG renomeado para .png (JPG estraga o pixel art): exporte em PNG pelo Piskel'
      : 'o arquivo não é um PNG válido');
  }
  let pos = 8, ihdr, plte, trns; const idat = [];
  while (pos + 8 <= buf.length) {
    const len = buf.readUInt32BE(pos), tipo = buf.toString('ascii', pos + 4, pos + 8), dados = buf.slice(pos + 8, pos + 8 + len);
    if (tipo === 'IHDR') ihdr = dados; else if (tipo === 'PLTE') plte = dados;
    else if (tipo === 'tRNS') trns = dados; else if (tipo === 'IDAT') idat.push(dados); else if (tipo === 'IEND') break;
    pos += 12 + len;
  }
  if (!ihdr || !idat.length) throw new Error('PNG incompleto ou corrompido');
  const w = ihdr.readUInt32BE(0), h = ihdr.readUInt32BE(4), prof = ihdr[8], cor = ihdr[9];
  if (ihdr[12]) throw new Error('PNG entrelaçado (interlaced) não é suportado: exporte de novo pelo Piskel');
  const canais = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[cor];
  if (!canais || ![1, 2, 4, 8, 16].includes(prof)) throw new Error('formato de PNG não suportado');
  if (w > 4096 || h > 4096) throw new Error(`imagem grande demais (${w}×${h})`);

  let raw;
  try { raw = zlib.inflateSync(Buffer.concat(idat)); } catch { throw new Error('PNG corrompido'); }
  const bpl = Math.ceil(w * canais * prof / 8), bpp = Math.max(1, canais * prof / 8);
  const linhas = []; let ant = Buffer.alloc(bpl), off = 0;
  for (let y = 0; y < h; y++) {
    const f = raw[off], l = Buffer.from(raw.slice(off + 1, off + 1 + bpl)); off += bpl + 1;
    for (let i = 0; i < bpl; i++) {
      const a = i >= bpp ? l[i - bpp] : 0, b = ant[i], c = i >= bpp ? ant[i - bpp] : 0;
      let v = 0;
      if (f === 1) v = a; else if (f === 2) v = b; else if (f === 3) v = (a + b) >> 1;
      else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v = pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      else if (f !== 0) throw new Error('PNG corrompido');
      l[i] = (l[i] + v) & 255;
    }
    linhas.push(l); ant = l;
  }
  const max = (1 << Math.min(prof, 8)) - 1;
  const amostra = (l, x, ch) => {
    if (prof === 8) return l[x * canais + ch];
    if (prof === 16) return l[(x * canais + ch) * 2];
    const bit = x * prof, v = (l[bit >> 3] >> (8 - prof - (bit & 7))) & max;
    return cor === 3 ? v : Math.round(v * 255 / max);
  };
  const d = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const l = linhas[y], o = (y * w + x) * 4;
    let r, g, b, a = 255;
    if (cor === 3) {
      const i = amostra(l, x, 0);
      r = plte[i * 3]; g = plte[i * 3 + 1]; b = plte[i * 3 + 2];
      if (trns && i < trns.length) a = trns[i];
    } else if (cor === 0 || cor === 4) {
      r = g = b = amostra(l, x, 0);
      if (cor === 4) a = amostra(l, x, 1);
      else if (trns && prof <= 8 && r === Math.round((trns.readUInt16BE(0) & max) * 255 / max)) a = 0;
    } else {
      r = amostra(l, x, 0); g = amostra(l, x, 1); b = amostra(l, x, 2);
      if (cor === 6) a = amostra(l, x, 3);
      else if (trns && prof === 8 && r === trns.readUInt16BE(0) && g === trns.readUInt16BE(2) && b === trns.readUInt16BE(4)) a = 0;
    }
    d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = a;
  }
  return { w, h, d };
}

function escreverPNG(img) {
  const bloco = (tipo, dados) => {
    const t = Buffer.from(tipo, 'ascii'), len = Buffer.alloc(4), crc = Buffer.alloc(4);
    len.writeUInt32BE(dados.length); crc.writeUInt32BE(crc32(Buffer.concat([t, dados])));
    return Buffer.concat([len, t, dados, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(img.w, 0); ihdr.writeUInt32BE(img.h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc((img.w * 4 + 1) * img.h);
  for (let y = 0; y < img.h; y++) Buffer.from(img.d.buffer, img.d.byteOffset + y * img.w * 4, img.w * 4).copy(raw, y * (img.w * 4 + 1) + 1);
  return Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), bloco('IHDR', ihdr), bloco('IDAT', zlib.deflateSync(raw)), bloco('IEND', Buffer.alloc(0))]);
}

// ================= .piskel =================
// O .piskel é um JSON; cada camada guarda seus frames num PNG em base64.
// Pegamos o primeiro frame e juntamos as camadas (de baixo para cima).
function lerPiskel(texto) {
  let j;
  try { j = JSON.parse(texto); } catch { throw new Error('o .piskel está corrompido'); }
  const p = j.piskel;
  if (!p || !p.layers || !p.width || !p.height) throw new Error('o .piskel não tem desenho');
  const W = p.width, H = p.height, saida = { w: W, h: H, d: new Uint8Array(W * H * 4) };
  let quadros = 1;
  for (const bruta of p.layers) {
    const L = typeof bruta === 'string' ? JSON.parse(bruta) : bruta;
    quadros = Math.max(quadros, L.frameCount || 1);
    let b64 = L.base64PNG, fx = 0, fy = 0;
    if (L.chunks) {
      const ch = L.chunks.find(c => (c.layout || []).some(col => col.includes(0))) || L.chunks[0];
      b64 = ch.base64PNG;
      (ch.layout || []).forEach((col, ci) => col.forEach((f, ri) => { if (f === 0) { fx = ci; fy = ri; } }));
    }
    if (!b64) continue;
    const img = lerPNG(Buffer.from(b64.replace(/^data:image\/png;base64,/, ''), 'base64'));
    compor(saida, img, fx * W, fy * H, L.opacity === undefined ? 1 : L.opacity);
  }
  return { img: saida, quadros };
}
function compor(dest, src, ox, oy, opacidade) {
  for (let y = 0; y < dest.h; y++) for (let x = 0; x < dest.w; x++) {
    const sx = ox + x, sy = oy + y;
    if (sx >= src.w || sy >= src.h) continue;
    const s = (sy * src.w + sx) * 4, o = (y * dest.w + x) * 4;
    const as = src.d[s + 3] / 255 * opacidade, ad = dest.d[o + 3] / 255, ao = as + ad * (1 - as);
    if (!ao) continue;
    for (let c = 0; c < 3; c++) dest.d[o + c] = Math.round((src.d[s + c] * as + dest.d[o + c] * ad * (1 - as)) / ao);
    dest.d[o + 3] = Math.round(ao * 255);
  }
}

// ================= correções e verificações =================
const pixel = (img, x, y) => (y * img.w + x) * 4;
function recortar(img, x0, y0, w, h) {
  const out = { w, h, d: new Uint8Array(w * h * 4) };
  for (let y = 0; y < h; y++) out.d.set(img.d.subarray(pixel(img, x0, y0 + y), pixel(img, x0, y0 + y) + w * 4), y * w * 4);
  return out;
}
// Reduz pegando um pixel de cada bloco s×s (sem borrar).
function reduzir(img, s) {
  const w = Math.floor(img.w / s), h = Math.floor(img.h / s), out = { w, h, d: new Uint8Array(w * h * 4) };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) out.d.set(img.d.subarray(pixel(img, x * s, y * s), pixel(img, x * s, y * s) + 4), (y * w + x) * 4);
  return out;
}
// Cada bloco s×s tem uma cor só? (= foi exportado com Scale maior que 1x)
function ehAmpliado(img, s) {
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
    const a = pixel(img, x, y), b = pixel(img, x - x % s, y - y % s);
    for (let c = 0; c < 4; c++) if (img.d[a + c] !== img.d[b + c]) return false;
  }
  return true;
}
const diferenca = (img, x1, y1, x2, y2) => {
  const a = pixel(img, x1, y1), b = pixel(img, x2, y2);
  return (Math.abs(img.d[a] - img.d[b]) + Math.abs(img.d[a + 1] - img.d[b + 1]) + Math.abs(img.d[a + 2] - img.d[b + 2])) / 3;
};
// Compara o "salto" de cor na emenda com o salto normal entre vizinhos do desenho.
function emenda(img) {
  let internoH = 0, bordaH = 0, internoV = 0, bordaV = 0;
  for (let i = 0; i < TAM; i++) {
    for (let k = 0; k < TAM - 1; k++) { internoH += diferenca(img, k, i, k + 1, i); internoV += diferenca(img, i, k, i, k + 1); }
    bordaH += diferenca(img, TAM - 1, i, 0, i); bordaV += diferenca(img, i, TAM - 1, i, 0);
  }
  internoH /= TAM * (TAM - 1); internoV /= TAM * (TAM - 1); bordaH /= TAM; bordaV /= TAM;
  const ruim = (borda, interno) => borda > 12 && borda > 2.2 * Math.max(interno, 4);
  return { horizontal: ruim(bordaH, internoH), vertical: ruim(bordaV, internoV) };
}

function verificar(img, quadrosPiskel) {
  const r = { correcoes: [], avisos: [], erro: null, img: null };
  const tamOriginal = `${img.w}×${img.h}`;
  if (img.w % TAM || img.h % TAM) { r.erro = `tamanho ${tamOriginal}: precisa ser 16×16 (Resize no Piskel)`; return r; }

  const s = img.h / TAM;
  if (s > 1) {
    if (img.w % s === 0 && ehAmpliado(img, s)) {
      img = reduzir(img, s);
      r.correcoes.push(`exportado em escala ${s}x (${tamOriginal}): reduzido para 1x`);
    } else if (img.w === img.h) {
      img = reduzir(img, s);
      r.avisos.push(`desenhado em ${tamOriginal} em vez de 16×16: foi encolhido e perdeu detalhes — confira ou peça para refazer em 16×16`);
    } else {
      img = recortar(img, 0, 0, TAM, TAM);
      r.correcoes.push(`folha de ${tamOriginal} com vários frames: usado só o primeiro`);
    }
  }
  if (img.w > TAM) {
    r.correcoes.push(`folha com ${img.w / TAM} frames: usado só o primeiro`);
    img = recortar(img, 0, 0, TAM, TAM);
  }
  if (quadrosPiskel > 1) r.correcoes.push(`o .piskel tem ${quadrosPiskel} frames: usado só o primeiro`);

  let transp = 0, vazios = 0;
  for (let i = 3; i < img.d.length; i += 4) { if (img.d[i] < 255) transp++; if (img.d[i] === 0) vazios++; }
  if (vazios === TAM * TAM) { r.erro = 'a imagem está vazia (toda transparente)'; return r; }
  if (transp) r.avisos.push(`${transp} pixel(s) transparente(s): no jogo aparecem como buraco preto — pinte todos os pixels`);

  const e = emenda(img);
  if (e.horizontal) r.avisos.push('a borda esquerda não emenda com a direita (veja a prévia 3×3)');
  if (e.vertical) r.avisos.push('a borda de cima não emenda com a de baixo (veja a prévia 3×3)');
  r.img = img;
  return r;
}

// ================= nomes dos arquivos =================
const normalizar = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
function identificar(arquivo, pastaRaiz) {
  const base = normalizar(path.parse(arquivo).name)
    .replace(/\(\d+\)/g, ' ')
    .replace(/\b(final|copia|copy|versao|novo|nova|v\d+)\b/g, ' ');
  const tokens = base.split(/[^a-z0-9]+/).filter(Boolean);
  const alvo = t => SINONIMOS[t] || t;
  const nomes = [...TILES].sort((a, b) => b.length - a.length);
  let tile = null, usados = [];
  // 1) palavra exata ("grama1") ou separada ("grama 1")
  for (const n of nomes) {
    for (let i = 0; i < tokens.length && !tile; i++) {
      if (alvo(tokens[i]) === n) { tile = n; usados = [i]; }
      else if (i + 1 < tokens.length && alvo(tokens[i]) + tokens[i + 1] === n) { tile = n; usados = [i, i + 1]; }
    }
    if (tile) break;
  }
  let aluno = tokens.filter((_, i) => !usados.includes(i)).join('-');
  // 2) colado no nome ("joaograma")
  if (!tile) {
    const junto = tokens.join('');
    const todos = [...nomes, ...Object.keys(SINONIMOS)].sort((a, b) => b.length - a.length);
    const achado = todos.find(n => junto.includes(n));
    if (achado) { tile = alvo(achado); aluno = junto.replace(achado, ''); }
  }
  // sem nome de aluno no arquivo: usa o nome da subpasta, se houver
  if (!aluno) {
    const pasta = path.relative(pastaRaiz, path.dirname(arquivo));
    if (pasta) aluno = normalizar(path.basename(pasta)).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
  return { tile, aluno: aluno || 'sem-nome' };
}

// ================= programa =================
function listar(pasta, ignorar) {
  return fs.readdirSync(pasta, { withFileTypes: true }).flatMap(e => {
    const p = path.join(pasta, e.name);
    if (e.isDirectory()) return p === ignorar ? [] : listar(p, ignorar);
    return e.name === 'relatorio.html' || e.name.startsWith('.') ? [] : [p];
  });
}

function main() {
  const raiz = path.resolve(process.argv[2] || path.join(__dirname, '..', 'entregas'));
  if (!fs.existsSync(raiz)) {
    fs.mkdirSync(raiz, { recursive: true });
    console.log(`Criei a pasta ${raiz}\nColoque nela os .png/.piskel dos alunos e rode de novo.`);
    return;
  }
  const saida = path.join(raiz, 'corrigidos');
  fs.rmSync(saida, { recursive: true, force: true });

  const arquivos = listar(raiz, saida);
  // PNG primeiro: o .piskel do mesmo aluno/tile só é usado se o PNG falhar.
  const ordem = f => /\.png$/i.test(f) ? 0 : /\.piskel$/i.test(f) ? 1 : 2;
  arquivos.sort((a, b) => ordem(a) - ordem(b) || a.localeCompare(b));

  const resultados = [], aproveitados = new Set(), nomesUsados = new Set();
  for (const arq of arquivos) {
    const rel = path.relative(raiz, arq), ext = path.extname(arq).toLowerCase();
    const { tile, aluno } = identificar(arq, raiz);
    const r = { arquivo: rel, tile, aluno, correcoes: [], avisos: [], erro: null, img: null };
    resultados.push(r);
    try {
      if (!tile) throw new Error(`não achei o nome do tile no arquivo — use: ${aluno}_grama.png (tiles: ${TILES.join(', ')})`);
      const chave = tile + '|' + aluno;
      let img, quadros = 1;
      if (ext === '.png') img = lerPNG(fs.readFileSync(arq));
      else if (ext === '.piskel') {
        if (aproveitados.has(chave)) { r.reserva = true; continue; }
        ({ img, quadros } = lerPiskel(fs.readFileSync(arq, 'utf8')));
        r.correcoes.push('PNG extraído do .piskel');
      } else throw new Error(`formato ${ext || 'sem extensão'} não aceito: exporte em PNG pelo Piskel`);

      const v = verificar(img, quadros);
      r.correcoes.push(...v.correcoes);
      r.avisos = v.avisos; r.erro = v.erro; r.img = v.img;
      if (r.erro) continue;

      let nome = aluno, n = 2;
      while (nomesUsados.has(tile + '/' + nome)) nome = `${aluno}-${n++}`;
      nomesUsados.add(tile + '/' + nome);
      const destino = path.join(saida, tile, nome + '.png');
      fs.mkdirSync(path.dirname(destino), { recursive: true });
      fs.writeFileSync(destino, escreverPNG(r.img));
      r.destino = path.relative(raiz, destino);
      aproveitados.add(chave);
    } catch (err) { r.erro = err.message; }
  }

  for (const r of resultados) {
    r.status = r.reserva ? 'reserva' : r.erro ? 'refazer' : r.avisos.length ? 'atencao' : r.correcoes.length ? 'corrigido' : 'ok';
  }
  fs.writeFileSync(path.join(raiz, 'relatorio.html'), relatorio(resultados));

  const conta = s => resultados.filter(r => r.status === s).length;
  console.log(`${resultados.length} arquivo(s) verificados em ${raiz}`);
  console.log(`  ok: ${conta('ok')}   corrigidos: ${conta('corrigido')}   atenção: ${conta('atencao')}   refazer: ${conta('refazer')}   reserva: ${conta('reserva')}`);
  for (const r of resultados.filter(r => r.status === 'refazer')) console.log(`  ✗ ${r.arquivo}: ${r.erro}`);
  console.log(`Relatório: ${path.join(raiz, 'relatorio.html')}`);
}

// ================= relatório HTML =================
function relatorio(resultados) {
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const ROTULO = { ok: 'OK', corrigido: 'Corrigido', atencao: 'Atenção', refazer: 'Refazer', reserva: 'Reserva' };
  const cartao = r => {
    const uri = r.img ? 'data:image/png;base64,' + escreverPNG(r.img).toString('base64') : '';
    const itens = [
      ...r.correcoes.map(t => `<li class="c">✔ ${esc(t)}</li>`),
      ...r.avisos.map(t => `<li class="a">⚠ ${esc(t)}</li>`),
      ...(r.erro ? [`<li class="e">✗ ${esc(r.erro)}</li>`] : []),
      ...(r.reserva ? ['<li>guardado como reserva: o PNG deste aluno já foi aproveitado</li>'] : [])
    ].join('');
    return `<article class="cartao ${r.status}">
      <header><strong>${esc(r.aluno)}</strong><span class="selo">${ROTULO[r.status]}</span></header>
      ${uri ? `<div class="previas">
        <figure><img src="${uri}" alt="tile"><figcaption>tile</figcaption></figure>
        <figure><div class="mosaico" style="background-image:url(${uri})"></div><figcaption>emenda 3×3</figcaption></figure>
      </div>` : ''}
      <p class="arq">${esc(r.arquivo)}${r.destino ? ` → <code>${esc(r.destino)}</code>` : ''}</p>
      ${itens ? `<ul>${itens}</ul>` : ''}
    </article>`;
  };
  const grupos = [...TILES, null].map(t => {
    const lista = resultados.filter(r => r.tile === t);
    if (!lista.length) return '';
    return `<section><h2>${t ? esc(t) : 'Nome não reconhecido'} <small>${lista.length}</small></h2><div class="grade">${lista.map(cartao).join('')}</div></section>`;
  }).join('');
  const conta = s => resultados.filter(r => r.status === s).length;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Relatório dos tiles</title>
<style>
  :root { --fundo:#f4f1ea; --cartao:#fff; --texto:#2a1d1a; --suave:#6b625d; --borda:#ddd5c8;
    --ok:#2e7d32; --corrigido:#1565c0; --atencao:#b26a00; --refazer:#c62828; --reserva:#757575; }
  @media (prefers-color-scheme: dark) { :root { --fundo:#16120f; --cartao:#221c18; --texto:#f2ebe1; --suave:#a89f97; --borda:#3a312b;
    --ok:#66bb6a; --corrigido:#64b5f6; --atencao:#ffb74d; --refazer:#ef5350; --reserva:#9e9e9e; } }
  * { box-sizing:border-box; } body { margin:0; padding:24px 16px; background:var(--fundo); color:var(--texto); font:15px/1.45 system-ui, sans-serif; }
  main { max-width:1100px; margin:0 auto; } h1 { margin:0 0 4px; } .resumo { color:var(--suave); margin:0 0 24px; }
  .resumo b { color:var(--texto); } h2 { margin:28px 0 10px; } h2 small { color:var(--suave); font-weight:normal; }
  .grade { display:grid; grid-template-columns:repeat(auto-fill, minmax(300px, 1fr)); gap:12px; }
  .cartao { background:var(--cartao); border:1px solid var(--borda); border-left:5px solid var(--cor); border-radius:8px; padding:12px; }
  .ok{--cor:var(--ok)} .corrigido{--cor:var(--corrigido)} .atencao{--cor:var(--atencao)} .refazer{--cor:var(--refazer)} .reserva{--cor:var(--reserva)}
  header { display:flex; justify-content:space-between; align-items:center; gap:8px; }
  .selo { background:var(--cor); color:#fff; font-size:12px; font-weight:bold; padding:2px 8px; border-radius:99px; }
  .previas { display:flex; gap:16px; margin:10px 0; } figure { margin:0; } figcaption { font-size:12px; color:var(--suave); }
  .previas img { width:96px; height:96px; image-rendering:pixelated; display:block; }
  .mosaico { width:144px; height:144px; background-size:48px 48px; image-rendering:pixelated; }
  .arq { font-size:12px; color:var(--suave); word-break:break-all; margin:6px 0; } code { color:var(--texto); }
  ul { margin:6px 0 0; padding-left:0; list-style:none; font-size:13px; } li { margin:3px 0; }
  li.c { color:var(--corrigido); } li.a { color:var(--atencao); } li.e { color:var(--refazer); font-weight:600; }
</style></head><body><main>
<h1>Relatório dos tiles</h1>
<p class="resumo">${resultados.length} arquivo(s) · <b>${conta('ok')}</b> ok · <b>${conta('corrigido')}</b> corrigidos ·
<b>${conta('atencao')}</b> atenção · <b>${conta('refazer')}</b> refazer${conta('reserva') ? ` · <b>${conta('reserva')}</b> reserva` : ''}
<br>Gerado em ${new Date().toLocaleString('pt-BR')}. Escolha o melhor de cada tile e copie para <code>tiles/&lt;tile&gt;.png</code>.</p>
${grupos || '<p>Nenhum arquivo encontrado.</p>'}
</main></body></html>`;
}

if (require.main === module) main();
module.exports = { lerPNG, escreverPNG, lerPiskel, verificar, identificar };
