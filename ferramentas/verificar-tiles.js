#!/usr/bin/env node
// Vila Pixel — confere as entregas dos alunos contra o INSTRUCOES.md e corrige
// o que dá para corrigir SEM PERDER QUALIDADE.
//
// Uso:   node ferramentas/verificar-tiles.js [pasta]      entregas (padrão: entregas/)
//        node ferramentas/verificar-tiles.js --pastas     confere sprites/, sons/ e dialogos/ do jogo
//                                                          (só aponta problemas, não altera nada)
//
// Entregas: coloque na pasta o que os alunos mandaram (pode ter subpastas por
// turma/aluno). Nome pedido no INSTRUCOES.md: seu-nome_item.ext
//   tiles        seu-nome_grama.png / .piskel        32x32
//   personagens  seu-nome_teo.png / .piskel          224x32 (7 frames de 32x32)
//   diálogos     seu-nome_teo.json
//   sons         seu-nome_passo.ogg + .mp3           (músicas: ponha "musica" no nome ou na pasta)
//
// Correções automáticas (todas sem perda): escala 2x/4x, frames em grade ou
// com células vazias, PNG dentro do .piskel, nome do arquivo, tamanho antigo
// 16x16 (ampliado 2x, com aviso), JSON com vírgula sobrando ou aspas curvas,
// extensão de áudio trocada. O que exigiria perder qualidade (encolher um
// desenho, converter áudio) vai para "refazer".
//
// Saída (apagada e recriada a cada vez):
//   <pasta>/corrigidos/<tipo>/<item>/<aluno>.<ext>   prontos para o jogo
//   <pasta>/relatorio.html                           abra no navegador
// Depois de escolher o melhor de cada item, copie para a pasta do jogo
// (sprites/tiles/, sprites/personagens/, dialogos/, sons/...).
const fs = require('fs'), path = require('path'), zlib = require('zlib');

const TAM = 32;                                      // lado de um tile / frame (px)
const TAM_ANTIGO = 16;                               // tamanho anterior, ainda aceito (ampliado 2x)
const QUADROS_PERSONAGEM = 7;
const ROTULOS = ['baixo parado', 'baixo passo A', 'cima parado', 'cima passo A', 'direita parado', 'direita passo A', 'direita passo B'];
// Tiles de chão aceitos e outros nomes que os alunos podem usar para eles.
const TILES = ['grama', 'grama1', 'grama2', 'grama3', 'terra', 'cimento'];
const SINONIMOS = { concreto: 'cimento', calcada: 'cimento', cimentado: 'cimento', grass: 'grama', chao: 'terra', barro: 'terra' };
const EXT_IMAGEM = ['.png', '.piskel', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.ase', '.aseprite', '.psd'];
const EXT_SOM = ['.ogg', '.mp3', '.wav', '.flac', '.m4a', '.aac', '.wma', '.opus'];
const EXT_TEXTO = ['.json', '.txt', '.doc', '.docx', '.odt', '.js'];
const LIMITE_FALA = 100;
const LIMITE_EFEITO = 300 * 1024, LIMITE_MUSICA = 5 * 1024 * 1024;

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
// O .piskel é um JSON; cada camada guarda seus frames num PNG em base64
// (layout[coluna][linha] = número do frame). Junta as camadas de cada frame.
function lerPiskel(texto) {
  let j;
  try { j = JSON.parse(texto); } catch { throw new Error('o .piskel está corrompido'); }
  const p = j.piskel;
  if (!p || !p.layers || !p.width || !p.height) throw new Error('o .piskel não tem desenho');
  const W = p.width, H = p.height, camadas = [];
  let total = 1;
  const png = b64 => lerPNG(Buffer.from(b64.replace(/^data:image\/png;base64,/, ''), 'base64'));
  for (const bruta of p.layers) {
    const L = typeof bruta === 'string' ? JSON.parse(bruta) : bruta;
    total = Math.max(total, L.frameCount || 1);
    const pedacos = L.chunks ? L.chunks.map(c => ({ img: png(c.base64PNG), layout: c.layout || [[0]] }))
      : L.base64PNG ? [{ img: png(L.base64PNG), layout: null }] : [];
    camadas.push({ pedacos, opacidade: L.opacity === undefined ? 1 : L.opacity });
  }
  const quadros = [];
  for (let f = 0; f < total; f++) {
    const q = { w: W, h: H, d: new Uint8Array(W * H * 4) };
    for (const c of camadas) for (const ped of c.pedacos) {
      let pos = null;
      if (!ped.layout) pos = [f, 0];
      else ped.layout.forEach((col, ci) => col.forEach((v, ri) => { if (v === f) pos = [ci, ri]; }));
      if (pos) compor(q, ped.img, pos[0] * W, pos[1] * H, c.opacidade);
    }
    quadros.push(q);
  }
  return { w: W, h: H, quadros };
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

// ================= imagens: recorte, escala, frames =================
const pixel = (img, x, y) => (y * img.w + x) * 4;
const nova = (w, h) => ({ w, h, d: new Uint8Array(w * h * 4) });
function recortar(img, x0, y0, w, h) {
  const out = nova(w, h);
  for (let y = 0; y < h; y++) out.d.set(img.d.subarray(pixel(img, x0, y0 + y), pixel(img, x0, y0 + y) + w * 4), y * w * 4);
  return out;
}
// Reduz pegando um pixel de cada bloco s×s. Só é usado quando o bloco inteiro
// tem uma cor só (ehAmpliado), então não se perde nada.
function reduzir(img, s) {
  const out = nova(img.w / s, img.h / s);
  for (let y = 0; y < out.h; y++) for (let x = 0; x < out.w; x++) out.d.set(img.d.subarray(pixel(img, x * s, y * s), pixel(img, x * s, y * s) + 4), (y * out.w + x) * 4);
  return out;
}
// Amplia repetindo cada pixel s×s vezes (sem borrar, sem inventar cor).
function ampliar(img, s) {
  const out = nova(img.w * s, img.h * s);
  for (let y = 0; y < out.h; y++) for (let x = 0; x < out.w; x++) out.d.set(img.d.subarray(pixel(img, x / s | 0, y / s | 0), pixel(img, x / s | 0, y / s | 0) + 4), (y * out.w + x) * 4);
  return out;
}
function ehAmpliado(img, s) {
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
    const a = pixel(img, x, y), b = pixel(img, x - x % s, y - y % s);
    for (let c = 0; c < 4; c++) if (img.d[a + c] !== img.d[b + c]) return false;
  }
  return true;
}
const mdc = (a, b) => b ? mdc(b, a % b) : a;
const contarAlfa = (img, teste) => { let n = 0; for (let i = 3; i < img.d.length; i += 4) if (teste(img.d[i])) n++; return n; };
const vazio = img => contarAlfa(img, a => a > 0) === 0;
// grade → lista de frames TAM×TAM, lendo linha por linha
function dividir(img) {
  const q = [];
  for (let y = 0; y < img.h; y += TAM) for (let x = 0; x < img.w; x += TAM) q.push(recortar(img, x, y, TAM, TAM));
  return q;
}
// frames (todos do mesmo tamanho) → uma linha só
function juntar(quadros) {
  const W = quadros[0].w, H = quadros[0].h, out = nova(W * quadros.length, H);
  quadros.forEach((q, i) => { for (let y = 0; y < H; y++) out.d.set(q.d.subarray(y * W * 4, (y + 1) * W * 4), (y * out.w + i * W) * 4); });
  return out;
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

const novoResultado = () => ({ correcoes: [], avisos: [], erro: null });

// Tamanho e escala, comum a tiles e personagens.
//  - exportado com Scale 2x/4x → reduz (cada bloco tem uma cor só: sem perda)
//  - feito no tamanho antigo (base 16) → amplia 2x (sem perda, mas com aviso)
function prepararImagem(img, r) {
  const orig = `${img.w}×${img.h}`;
  if (img.w % TAM_ANTIGO || img.h % TAM_ANTIGO) { r.erro = `tamanho ${orig}: cada frame precisa ter ${TAM}×${TAM} (Resize no Piskel)`; return null; }
  for (let s = mdc(img.w, img.h) / TAM; s > 1; s--) {
    if (Number.isInteger(s) && img.w % (TAM * s) === 0 && img.h % (TAM * s) === 0 && ehAmpliado(img, s)) {
      img = reduzir(img, s);
      r.correcoes.push(`exportado em escala ${s}x (${orig}): reduzido para 1x — nenhum pixel do desenho foi perdido`);
      break;
    }
  }
  if (img.w % TAM || img.h % TAM) {
    img = ampliar(img, TAM / TAM_ANTIGO);
    r.avisos.push(`feito no tamanho antigo (frames de ${TAM_ANTIGO}×${TAM_ANTIGO}): ampliado 2x sem perder nada, mas os pixels ficam maiores que os dos outros — se der, peça para redesenhar em ${TAM}×${TAM}`);
  }
  return img;
}

// ---------- tile de chão: 32×32, 1 frame, opaco, emendando ----------
function verificarTile(entrada) {
  const r = novoResultado();
  let img = entrada.img;
  if (entrada.quadros) {
    img = entrada.quadros[0];
    if (entrada.quadros.length > 1) r.correcoes.push(`o .piskel tem ${entrada.quadros.length} frames: usado só o primeiro (tile tem 1 frame)`);
  }
  img = prepararImagem(img, r); if (!img) return r;
  if (img.w === img.h && img.w > TAM) { r.erro = `desenhado em ${img.w}×${img.h}: precisa ser ${TAM}×${TAM}. Refazer — encolher perderia detalhes`; return r; }
  if (img.w > TAM || img.h > TAM) {
    r.correcoes.push(`folha com ${(img.w / TAM) * (img.h / TAM)} frames: usado só o primeiro (tile tem 1 frame)`);
    img = recortar(img, 0, 0, TAM, TAM);
  }
  if (vazio(img)) { r.erro = 'a imagem está vazia (toda transparente)'; return r; }
  const transp = contarAlfa(img, a => a < 255);
  if (transp) r.avisos.push(`${transp} pixel(s) transparente(s): no jogo viram buraco preto — pinte todos os pixels`);
  const e = emenda(img);
  if (e.horizontal) r.avisos.push('a borda esquerda não emenda com a direita (veja a prévia 3×3)');
  if (e.vertical) r.avisos.push('a borda de cima não emenda com a de baixo (veja a prévia 3×3)');
  r.img = img;
  return r;
}

// ---------- personagem: 7 frames de 32×32 numa linha (224×32) ----------
function verificarPersonagem(entrada) {
  const r = novoResultado();
  let img = entrada.quadros ? juntar(entrada.quadros) : entrada.img;
  img = prepararImagem(img, r); if (!img) return r;
  const cols = img.w / TAM, linhas = img.h / TAM;
  let q = dividir(img);
  let sobra = 0;
  while (q.length && vazio(q[q.length - 1])) { q.pop(); sobra++; }
  if (q.length === 12) {
    // formato completo antigo: baixo(3) esquerda(3) direita(3) cima(3)
    q = [0, 1, 9, 10, 6, 7, 8].map(i => q[i]);
    r.avisos.push('veio com 12 frames (baixo, esquerda, direita, cima): usei baixo, cima e direita, sem mexer nos desenhos — a esquerda será espelhada, confira se o personagem é simétrico');
  } else if (q.length !== QUADROS_PERSONAGEM) {
    r.erro = `tem ${q.length} frame(s), precisa de ${QUADROS_PERSONAGEM} (ver INSTRUCOES.md, seção Personagens)`;
    return r;
  } else if (linhas > 1) r.correcoes.push(`frames estavam numa grade de ${cols} colunas × ${linhas} linhas: colocados numa linha só (${TAM * 7}×${TAM})`);
  else if (sobra) r.correcoes.push(`removido(s) ${sobra} frame(s) vazio(s) no fim da folha`);

  const vazios = ROTULOS.filter((_, i) => vazio(q[i]));
  if (vazios.length) { r.erro = `frame(s) vazio(s): ${vazios.join(', ')}`; return r; }
  img = juntar(q);
  if (!contarAlfa(img, a => a === 0)) r.avisos.push('o fundo não é transparente: o personagem vai aparecer dentro de um quadrado');

  // pés embaixo e corpo centralizado (no frame 1, de frente parado)
  const f = q[0];
  let baixo = -1, esq = TAM, dir = -1;
  for (let y = 0; y < TAM; y++) for (let x = 0; x < TAM; x++) if (f.d[pixel(f, x, y) + 3] > 0) { baixo = y; esq = Math.min(esq, x); dir = Math.max(dir, x); }
  const linhaPes = Math.round(TAM * 0.9);
  if (baixo < TAM * 0.75) r.avisos.push(`os pés estão na linha ${baixo + 1}: devem ficar perto da linha ${linhaPes} (senão o personagem "flutua" e atravessa paredes)`);
  const centro = (esq + dir) / 2;
  if (Math.abs(centro - (TAM - 1) / 2) > TAM * 0.15) r.avisos.push('o personagem não está centralizado no quadro');
  r.img = img;
  return r;
}

// ---------- diálogo: { "nome": "...", "conversas": [["fala", ...], ...] } ----------
function verificarDialogo(texto, id, personagens) {
  const r = novoResultado();
  if (!personagens.has(id)) { r.erro = `não existe personagem com o id "${id}" — ids: ${[...personagens.keys()].join(', ')}`; return r; }
  texto = texto.replace(/^﻿/, '');
  let dados;
  try { dados = JSON.parse(texto); } catch {
    let t = texto; const feitas = [];
    const t1 = t.replace(/[“”„‟″]/g, '"'); if (t1 !== t) { feitas.push('aspas curvas “ ” trocadas por aspas retas "'); t = t1; }
    const t2 = t.replace(/,(\s*[\]}])/g, '$1'); if (t2 !== t) { feitas.push('vírgula depois do último item removida'); t = t2; }
    try { dados = JSON.parse(t); r.correcoes.push(...feitas); }
    catch (e) { r.erro = `JSON com erro (${e.message}) — teste no jsonlint.com`; return r; }
  }
  if (Array.isArray(dados)) { dados = { conversas: dados }; r.correcoes.push('faltava o { "conversas": ... } em volta da lista: acrescentado'); }
  if (!dados || typeof dados !== 'object') { r.erro = 'o arquivo precisa ter { "nome": ..., "conversas": [...] }'; return r; }
  let conv = dados.conversas;
  if (!Array.isArray(conv) || !conv.length) { r.erro = 'falta a lista "conversas" (ou ela está vazia)'; return r; }
  if (conv.every(c => typeof c === 'string')) {
    conv = [conv];
    r.avisos.push('as falas estavam soltas, sem [ ] de conversa: juntei tudo numa conversa só — confira se era isso');
  }
  const limpas = [];
  for (let i = 0; i < conv.length; i++) {
    const c = conv[i];
    if (!Array.isArray(c) || c.some(f => typeof f !== 'string')) { r.erro = `a conversa ${i + 1} precisa ser uma lista de frases entre aspas`; return r; }
    const falas = c.map(f => {
      const g = f.replace(/\{\s*(nome|name)\s*\}/gi, '{nome}');
      if (g !== f) r.correcoes.push(`conversa ${i + 1}: "${f.match(/\{[^}]*\}/)[0]}" trocado por {nome}`);
      return g.trim();
    }).filter(f => {
      if (!f) r.correcoes.push(`conversa ${i + 1}: fala vazia removida`);
      return f;
    });
    if (!falas.length) { r.correcoes.push(`conversa ${i + 1} estava vazia: removida`); continue; }
    falas.forEach((f, k) => {
      const tam = f.replace('{nome}', '').length;
      if (tam > LIMITE_FALA) r.avisos.push(`conversa ${i + 1}, fala ${k + 1}: ${tam} letras (máx. ~${LIMITE_FALA}) — divida em duas caixas`);
    });
    limpas.push(falas);
  }
  if (!limpas.length) { r.erro = 'todas as conversas estão vazias'; return r; }
  const oficial = personagens.get(id);
  if (!dados.nome) r.correcoes.push(`faltava "nome": preenchido com "${oficial}"`);
  else if (dados.nome !== oficial) r.avisos.push(`"nome" é "${dados.nome}", mas o personagem se chama "${oficial}" no jogo`);
  const extras = Object.keys(dados).filter(k => !['nome', 'conversas'].includes(k));
  if (extras.length) r.avisos.push(`campo(s) que o jogo não usa: ${extras.join(', ')}`);
  r.conversas = limpas;
  r.texto = JSON.stringify({ nome: dados.nome || oficial, conversas: limpas }, null, 2) + '\n';
  return r;
}

// ---------- som: .ogg e .mp3 ----------
function tipoDeAudio(buf) {
  const s = (a, b) => buf.slice(a, b).toString('latin1');
  if (s(0, 4) === 'OggS') return '.ogg';
  if (s(0, 3) === 'ID3' || (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0)) return '.mp3';
  if (s(0, 4) === 'RIFF' && s(8, 12) === 'WAVE') return '.wav';
  if (s(0, 4) === 'fLaC') return '.flac';
  if (s(4, 8) === 'ftyp') return '.m4a';
  return null;
}
function verificarSom(buf, ext, tipo) {
  const r = novoResultado(), real = tipoDeAudio(buf);
  if (!real) { r.erro = 'não é um arquivo de áudio reconhecido'; return r; }
  if (!['.ogg', '.mp3'].includes(real)) { r.erro = `é ${real.slice(1).toUpperCase()}: exporte em .ogg e .mp3 pelo Audacity (Arquivo → Exportar)`; return r; }
  if (real !== ext) r.correcoes.push(`era um ${real} com extensão ${ext}: extensão corrigida (o som não mudou)`);
  const limite = tipo === 'efeitos' ? LIMITE_EFEITO : LIMITE_MUSICA;
  if (buf.length > limite) r.avisos.push(`${(buf.length / 1024 / 1024).toFixed(1)} MB é grande demais para ${tipo === 'efeitos' ? 'um efeito' : 'uma música'} (limite ${(limite / 1024 / 1024).toFixed(1)} MB): encurte ou comprima`);
  r.ext = real; r.bytes = buf;
  return r;
}

// ================= personagens do jogo =================
// id → nome, a partir dos NPCs declarados em blocos/*.js (+ o jogador)
function idsDosPersonagens(raizJogo) {
  const ids = new Map([['jogador', 'Jogador']]), pasta = path.join(raizJogo, 'blocos');
  if (!fs.existsSync(pasta)) return ids;
  const vm = require('vm');
  for (const f of fs.readdirSync(pasta).filter(f => f.endsWith('.js'))) {
    const ctx = { VilaPixel: { registrarBloco: b => (b.npcs || []).forEach(n => ids.set(n.id, n.nome)) } };
    try { vm.runInNewContext(fs.readFileSync(path.join(pasta, f), 'utf8'), ctx); } catch { /* bloco com erro: ignora */ }
  }
  return ids;
}
// apelidos: palavras do nome do NPC ("Seu Bento, o porteiro" → bento, porteiro)
function apelidos(personagens) {
  const m = {}, ignorar = ['seu', 'dona', 'o', 'a', 'mestre', 'do', 'da', 'de'];
  for (const [id, nome] of personagens) normalizar(nome).split(/[^a-z0-9]+/).filter(t => t && !ignorar.includes(t)).forEach(t => { m[t] = m[t] || id; });
  return m;
}

// ================= nomes dos arquivos =================
const normalizar = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const slug = s => normalizar(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const tokens = s => s.split(/[^a-z0-9]+/).filter(Boolean);
// procura um dos nomes nos tokens: palavra exata ("grama1"), separada ("grama 1") ou apelido
function acharNome(toks, nomes, alias) {
  const alvo = t => alias[t] || t;
  for (const n of [...nomes].sort((a, b) => b.length - a.length)) {
    for (let i = 0; i < toks.length; i++) {
      if (alvo(toks[i]) === n) return { nome: n, usados: [i] };
      if (i + 1 < toks.length && alvo(toks[i]) + toks[i + 1] === n) return { nome: n, usados: [i, i + 1] };
    }
  }
  return null;
}
// → { categoria: tiles|personagens|dialogos|sons|null, item, aluno, tipo (sons) }
function identificar(arquivo, raiz, personagens) {
  const ext = path.extname(arquivo).toLowerCase(), caminho = normalizar(path.relative(raiz, arquivo));
  const base = normalizar(path.basename(arquivo, path.extname(arquivo)))
    .replace(/\(\d+\)/g, ' ').replace(/\b(final|copia|copy|versao|novo|nova|v\d+)\b/g, ' ').trim();
  // padrão pedido: aluno_item
  const corte = base.lastIndexOf('_');
  const parteAluno = corte > 0 ? base.slice(0, corte) : null, parteItem = corte > 0 ? base.slice(corte + 1) : base;
  const ids = [...personagens.keys()], aliasNpc = apelidos(personagens);
  let categoria = EXT_SOM.includes(ext) ? 'sons' : EXT_TEXTO.includes(ext) ? 'dialogos' : EXT_IMAGEM.includes(ext) ? 'imagem' : null;
  let item = null, usados = [], toks = tokens(parteItem), tipo = null, restoJunto = null;

  if (categoria === 'sons') {
    item = toks.join('-') || null;
    tipo = /musica|music|tema|trilha/.test(caminho) ? 'musicas' : 'efeitos';
  } else if (categoria === 'dialogos') {
    let a = acharNome(toks, ids, aliasNpc);
    if (!a && parteAluno) { toks = tokens(base); a = acharNome(toks, ids, aliasNpc); }
    if (a) { item = a.nome; usados = a.usados; }
  } else if (categoria === 'imagem') {
    const alias = { ...aliasNpc, ...SINONIMOS };
    let a = acharNome(toks, [...TILES, ...ids], alias);
    if (!a && parteAluno) { toks = tokens(base); a = acharNome(toks, [...TILES, ...ids], alias); }
    if (a) { item = a.nome; usados = a.usados; }
    else {
      // tile colado no nome ("joaograma"); ids curtos (ze, bit) não, para não achar "ze" em "jose"
      const junto = tokens(base).join(''), todos = [...TILES, ...Object.keys(SINONIMOS)].sort((x, y) => y.length - x.length);
      const achado = todos.find(n => junto.includes(n));
      if (achado) { item = SINONIMOS[achado] || achado; toks = []; usados = []; restoJunto = junto.replace(achado, ''); }
    }
    categoria = TILES.includes(item) ? 'tiles' : ids.includes(item) ? 'personagens' : null;
  }
  let aluno = parteAluno ? slug(parteAluno) : (restoJunto !== null ? restoJunto : toks.filter((_, i) => !usados.includes(i)).join('-'));
  if (categoria === 'sons' && !parteAluno) aluno = '';
  if (!aluno) {
    const pasta = path.relative(raiz, path.dirname(arquivo));
    const ultima = pasta ? slug(path.basename(pasta)) : '';
    if (ultima && !/^(musicas?|efeitos?|sons?|tiles|personagens|dialogos)$/.test(ultima)) aluno = ultima;
  }
  return { categoria, item, aluno: aluno || 'sem-nome', tipo };
}

// ================= programa =================
function listar(pasta, ignorar) {
  return fs.readdirSync(pasta, { withFileTypes: true }).flatMap(e => {
    const p = path.join(pasta, e.name);
    if (e.isDirectory()) return p === ignorar ? [] : listar(p, ignorar);
    return e.name === 'relatorio.html' || e.name.startsWith('.') ? [] : [p];
  });
}

const RAIZ_JOGO = path.join(__dirname, '..');
const ORDEM_CATEGORIAS = ['tiles', 'personagens', 'dialogos', 'sons', null];
const NOME_CATEGORIA = { tiles: 'Chão (tiles)', personagens: 'Personagens', dialogos: 'Diálogos', sons: 'Sons', null: 'Não reconhecidos' };

function main() {
  const args = process.argv.slice(2), pasta = args.find(a => !a.startsWith('--'));
  if (args.includes('--pastas')) return verificarPastas(path.resolve(pasta || RAIZ_JOGO));
  const raiz = path.resolve(pasta || path.join(RAIZ_JOGO, 'entregas'));
  if (!fs.existsSync(raiz)) {
    fs.mkdirSync(raiz, { recursive: true });
    console.log(`Criei a pasta ${raiz}\nColoque nela as entregas dos alunos e rode de novo.`);
    return;
  }
  const saida = path.join(raiz, 'corrigidos');
  fs.rmSync(saida, { recursive: true, force: true });
  const personagens = idsDosPersonagens(RAIZ_JOGO);

  // PNG primeiro: o .piskel do mesmo aluno/item só é usado se o PNG não servir.
  const ordem = f => /\.png$/i.test(f) ? 0 : /\.piskel$/i.test(f) ? 1 : 2;
  const arquivos = listar(raiz, saida).sort((a, b) => ordem(a) - ordem(b) || a.localeCompare(b));

  const resultados = [], aproveitados = new Set(), usados = new Set();
  for (const arq of arquivos) {
    const rel = path.relative(raiz, arq).split(path.sep).join('/'), ext = path.extname(arq).toLowerCase();
    const id = identificar(arq, raiz, personagens);
    const r = { arquivo: rel, ...id, correcoes: [], avisos: [], erro: null };
    resultados.push(r);
    try {
      if (!id.categoria) throw new Error(`não reconheci o que é este arquivo — use seu-nome_item (tiles: ${TILES.join(', ')}; personagens: ${[...personagens.keys()].join(', ')})`);
      if (!id.item) throw new Error(`não achei de qual personagem é — use seu-nome_<id>${ext} (ids: ${[...personagens.keys()].join(', ')})`);
      const chave = [id.categoria, id.tipo, id.item, id.aluno].join('|');
      let v, extFinal = ext;

      if (id.categoria === 'tiles' || id.categoria === 'personagens') {
        let entrada;
        if (ext === '.png') entrada = { img: lerPNG(fs.readFileSync(arq)) };
        else if (ext === '.piskel') {
          if (aproveitados.has(chave)) { r.reserva = true; continue; }
          entrada = { quadros: lerPiskel(fs.readFileSync(arq, 'utf8')).quadros };
          r.correcoes.push('PNG exportado a partir do .piskel (faltava o .png ou ele não servia)');
        } else throw new Error(`formato ${ext} não aceito: exporte em PNG pelo Piskel${/\.jpe?g/.test(ext) ? ' (JPG borra o pixel art)' : ''}`);
        v = id.categoria === 'tiles' ? verificarTile(entrada) : verificarPersonagem(entrada);
        extFinal = '.png';
      } else if (id.categoria === 'dialogos') {
        if (ext !== '.json') throw new Error(`diálogo em ${ext}: entregue em .json, no formato do INSTRUCOES.md (seção Diálogos)`);
        v = verificarDialogo(fs.readFileSync(arq, 'utf8'), id.item, personagens);
      } else {
        v = verificarSom(fs.readFileSync(arq), ext, id.tipo);
        extFinal = v.ext || ext;
      }
      r.correcoes.push(...v.correcoes); r.avisos.push(...v.avisos); r.erro = v.erro;
      Object.assign(r, { img: v.img, conversas: v.conversas });
      if (r.erro) continue;

      if (id.aluno === 'sem-nome') r.avisos.push('o nome do arquivo não tem o nome do aluno (use seu-nome_item)');
      const esperado = `${id.aluno}_${id.item}${extFinal}`;
      if (ext !== '.piskel' && path.basename(arq) !== esperado && id.aluno !== 'sem-nome') r.correcoes.push(`nome padronizado: "${path.basename(arq)}" → "${esperado}"`);

      const dir = path.join(saida, id.categoria, ...(id.tipo ? [id.tipo] : []), id.item);
      let nome = id.aluno, n = 2;
      while (usados.has(path.join(dir, nome + extFinal))) nome = `${id.aluno}-${n++}`;
      const destino = path.join(dir, nome + extFinal);
      usados.add(destino);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(destino, v.img ? escreverPNG(v.img) : v.texto !== undefined ? v.texto : v.bytes);
      r.destino = path.relative(raiz, destino).split(path.sep).join('/');
      aproveitados.add(chave);
    } catch (err) { r.erro = err.message; }
  }

  // sons: cada som precisa da dupla .ogg + .mp3
  const sons = resultados.filter(r => r.categoria === 'sons' && r.destino);
  for (const r of sons) {
    const par = sons.filter(o => o.item === r.item && o.aluno === r.aluno && o.tipo === r.tipo).map(o => path.extname(o.destino));
    const falta = ['.ogg', '.mp3'].filter(e => !par.includes(e));
    if (falta.length) r.avisos.push(`falta a cópia ${falta.join(' e ')} (o INSTRUCOES.md pede .ogg e .mp3)`);
  }

  for (const r of resultados) r.status = r.reserva ? 'reserva' : r.erro ? 'refazer' : r.avisos.length ? 'atencao' : r.correcoes.length ? 'corrigido' : 'ok';
  fs.writeFileSync(path.join(raiz, 'relatorio.html'), relatorio(resultados));

  // resumo no terminal: tudo que foi corrigido vem listado, para avisar os alunos
  const conta = s => resultados.filter(r => r.status === s).length;
  console.log(`${resultados.length} arquivo(s) verificados em ${raiz}`);
  console.log(`  ok: ${conta('ok')}   corrigidos: ${conta('corrigido')}   atenção: ${conta('atencao')}   refazer: ${conta('refazer')}   reserva: ${conta('reserva')}`);
  const comCorrecao = resultados.filter(r => r.correcoes.length && !r.erro);
  if (comCorrecao.length) {
    console.log('\nCORREÇÕES FEITAS (sem perda de qualidade):');
    for (const r of comCorrecao) console.log(`  ✔ ${r.arquivo}\n      ${r.correcoes.join('\n      ')}`);
  }
  const atencao = resultados.filter(r => r.status === 'atencao');
  if (atencao.length) {
    console.log('\nPRECISAM DE ATENÇÃO:');
    for (const r of atencao) console.log(`  ⚠ ${r.arquivo}\n      ${r.avisos.join('\n      ')}`);
  }
  const refazer = resultados.filter(r => r.status === 'refazer');
  if (refazer.length) {
    console.log('\nREFAZER:');
    for (const r of refazer) console.log(`  ✗ ${r.arquivo}: ${r.erro}`);
  }
  console.log(`\nRelatório: ${path.join(raiz, 'relatorio.html')}`);
}

// ================= relatório HTML =================
function relatorio(resultados) {
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const ROTULO = { ok: 'OK', corrigido: 'Corrigido', atencao: 'Atenção', refazer: 'Refazer', reserva: 'Reserva' };
  const previa = r => {
    if (r.img && r.categoria === 'tiles') {
      const uri = 'data:image/png;base64,' + escreverPNG(r.img).toString('base64');
      return `<div class="previas"><figure><img class="tile" src="${uri}" alt=""><figcaption>tile</figcaption></figure>
        <figure><div class="mosaico" style="background-image:url(${uri})"></div><figcaption>emenda 3×3</figcaption></figure></div>`;
    }
    if (r.img) return `<figure class="folha"><img src="data:image/png;base64,${escreverPNG(r.img).toString('base64')}" alt="">
      <figcaption>${ROTULOS.join(' · ')}</figcaption></figure>`;
    if (r.conversas) return `<div class="falas">${r.conversas.slice(0, 3).map((c, i) => `<p><b>${i + 1}.</b> ${c.map(esc).join(' <span>▸</span> ')}</p>`).join('')}${r.conversas.length > 3 ? `<p>… +${r.conversas.length - 3} conversa(s)</p>` : ''}</div>`;
    if (r.categoria === 'sons' && r.destino) return `<audio controls preload="none" src="${esc(r.destino)}"></audio>`;
    return '';
  };
  const cartao = r => {
    const itens = [
      ...r.correcoes.map(t => `<li class="c">✔ ${esc(t)}</li>`),
      ...r.avisos.map(t => `<li class="a">⚠ ${esc(t)}</li>`),
      ...(r.erro ? [`<li class="e">✗ ${esc(r.erro)}</li>`] : []),
      ...(r.reserva ? ['<li>guardado como reserva: o PNG deste aluno já foi aproveitado</li>'] : [])
    ].join('');
    return `<article class="cartao ${r.status}">
      <header><strong>${esc(r.aluno)}</strong><span class="selo">${ROTULO[r.status]}</span></header>
      ${previa(r)}
      <p class="arq">${esc(r.arquivo)}${r.destino ? ` → <code>${esc(r.destino)}</code>` : ''}</p>
      ${itens ? `<ul>${itens}</ul>` : ''}
    </article>`;
  };
  const secoes = ORDEM_CATEGORIAS.map(cat => {
    const lista = resultados.filter(r => r.categoria === cat);
    if (!lista.length) return '';
    const itens = [...new Set(lista.map(r => (r.tipo ? r.tipo + ' / ' : '') + (r.item || '?')))];
    const nota = cat === 'sons' ? '<p class="nota">Lembre de confirmar a fonte e a licença de cada som e anotar em <code>sons/LEIA-ME.md</code>.</p>' : '';
    return `<section><h2>${NOME_CATEGORIA[cat]} <small>${lista.length}</small></h2>${nota}` + itens.map(it => {
      const grupo = lista.filter(r => (r.tipo ? r.tipo + ' / ' : '') + (r.item || '?') === it);
      return `<h3>${esc(it)}</h3><div class="grade">${grupo.map(cartao).join('')}</div>`;
    }).join('') + '</section>';
  }).join('');
  const comCorrecao = resultados.filter(r => r.correcoes.length && !r.erro);
  const blocoCorrecoes = comCorrecao.length ? `<section class="aviso-correcoes"><h2>Correções feitas <small>${comCorrecao.length}</small></h2>
    <p>Tudo abaixo foi corrigido automaticamente <b>sem perder qualidade</b>. Vale avisar os alunos para não repetirem.</p>
    <ul>${comCorrecao.map(r => `<li><b>${esc(r.aluno)}</b> · <code>${esc(r.arquivo)}</code>: ${r.correcoes.map(esc).join('; ')}</li>`).join('')}</ul></section>` : '';
  const conta = s => resultados.filter(r => r.status === s).length;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Relatório das entregas</title>
<style>
  :root { --fundo:#f4f1ea; --cartao:#fff; --texto:#2a1d1a; --suave:#6b625d; --borda:#ddd5c8;
    --ok:#2e7d32; --corrigido:#1565c0; --atencao:#b26a00; --refazer:#c62828; --reserva:#757575; }
  @media (prefers-color-scheme: dark) { :root { --fundo:#16120f; --cartao:#221c18; --texto:#f2ebe1; --suave:#a89f97; --borda:#3a312b;
    --ok:#66bb6a; --corrigido:#64b5f6; --atencao:#ffb74d; --refazer:#ef5350; --reserva:#9e9e9e; } }
  * { box-sizing:border-box; } body { margin:0; padding:24px 16px; background:var(--fundo); color:var(--texto); font:15px/1.45 system-ui, sans-serif; }
  main { max-width:1100px; margin:0 auto; } h1 { margin:0 0 4px; } .resumo { color:var(--suave); margin:0 0 24px; }
  .resumo b { color:var(--texto); } h2 { margin:32px 0 6px; } h2 small { color:var(--suave); font-weight:normal; }
  h3 { margin:16px 0 8px; font-size:15px; color:var(--suave); } .nota { color:var(--suave); margin:0 0 8px; font-size:14px; }
  .aviso-correcoes { background:var(--cartao); border:1px solid var(--borda); border-left:5px solid var(--corrigido); border-radius:8px; padding:4px 16px 12px; }
  .aviso-correcoes ul { list-style:disc; padding-left:20px; }
  .grade { display:grid; grid-template-columns:repeat(auto-fill, minmax(300px, 1fr)); gap:12px; }
  .cartao { background:var(--cartao); border:1px solid var(--borda); border-left:5px solid var(--cor); border-radius:8px; padding:12px; min-width:0; }
  .ok{--cor:var(--ok)} .corrigido{--cor:var(--corrigido)} .atencao{--cor:var(--atencao)} .refazer{--cor:var(--refazer)} .reserva{--cor:var(--reserva)}
  header { display:flex; justify-content:space-between; align-items:center; gap:8px; }
  .selo { background:var(--cor); color:#fff; font-size:12px; font-weight:bold; padding:2px 8px; border-radius:99px; }
  .previas { display:flex; gap:16px; margin:10px 0; } figure { margin:10px 0; } .previas figure { margin:0; }
  figcaption { font-size:12px; color:var(--suave); }
  img { image-rendering:pixelated; display:block; } img.tile { width:96px; height:96px; }
  .mosaico { width:144px; height:144px; background-size:48px 48px; image-rendering:pixelated; }
  .folha img { width:100%; height:auto; background:repeating-conic-gradient(#0001 0 25%, transparent 0 50%) 0 0/8px 8px; }
  .falas { font-size:13px; margin:10px 0; } .falas p { margin:4px 0; } .falas span { color:var(--suave); }
  audio { width:100%; margin:10px 0; }
  .arq { font-size:12px; color:var(--suave); word-break:break-all; margin:6px 0; } code { color:var(--texto); }
  .cartao ul { margin:6px 0 0; padding-left:0; list-style:none; font-size:13px; } li { margin:3px 0; }
  li.c { color:var(--corrigido); } li.a { color:var(--atencao); } li.e { color:var(--refazer); font-weight:600; }
</style></head><body><main>
<h1>Relatório das entregas</h1>
<p class="resumo">${resultados.length} arquivo(s) · <b>${conta('ok')}</b> ok · <b>${conta('corrigido')}</b> corrigidos ·
<b>${conta('atencao')}</b> atenção · <b>${conta('refazer')}</b> refazer${conta('reserva') ? ` · <b>${conta('reserva')}</b> reserva` : ''}
<br>Gerado em ${new Date().toLocaleString('pt-BR')}. Conferido contra o <code>INSTRUCOES.md</code>. Escolha o melhor de cada item
e copie de <code>corrigidos/</code> para a pasta do jogo.</p>
${blocoCorrecoes}
${secoes || '<p>Nenhum arquivo encontrado.</p>'}
</main></body></html>`;
}

// ================= verificação das pastas do jogo (--pastas) =================
// Confere o que já está em sprites/, sons/ e dialogos/ com as mesmas regras
// das entregas. Não altera nada: o que precisaria de correção vira erro.
// Termina com código 1 se houver algum erro.
function verificarPastas(raizJogo) {
  const saida = []; let erros = 0, avisos = 0, problemasDoArquivo = 0;
  const rel = p => path.relative(raizJogo, p).split(path.sep).join('/');
  const erro = (f, msg) => { erros++; problemasDoArquivo++; saida.push(`  ✗ ${rel(f)}: ${msg}`); };
  const aviso = (f, msg) => { avisos++; problemasDoArquivo++; saida.push(`  ⚠ ${rel(f)}: ${msg}`); };
  const info = msg => saida.push(`  · ${msg}`);
  const secao = t => saida.push('', t);
  const conferir = (f, checar) => { problemasDoArquivo = 0; checar(); if (!problemasDoArquivo) saida.push(`  ✔ ${rel(f)}`); };
  // resultado de um verificador: aqui nada é corrigido, então correção pendente = erro
  const aplicar = (f, v) => {
    if (v.erro) erro(f, v.erro);
    v.correcoes.forEach(c => erro(f, 'fora do padrão — ' + c + ' (passe pelas entregas para gerar a versão certa)'));
    v.avisos.forEach(a => aviso(f, a));
  };
  const conteudo = pasta => {
    if (!fs.existsSync(pasta)) { erro(pasta, 'a pasta não existe'); return null; }
    return listar(pasta).filter(f => path.basename(f) !== 'LEIA-ME.md');
  };
  const nomeSeguro = f => {
    const n = path.basename(f);
    if (!/^[a-z0-9._-]+$/.test(n)) aviso(f, `use nome em minúsculas, sem espaço nem acento (ex.: ${slug(path.parse(n).name)}${path.extname(n).toLowerCase()})`);
  };
  const abrirPNG = f => { try { return lerPNG(fs.readFileSync(f)); } catch (e) { erro(f, e.message); return null; } };
  const ehPiskel = (f, ext) => {
    if (ext !== '.piskel') return false;
    if (!fs.existsSync(f.replace(/\.piskel$/i, '.png'))) aviso(f, 'tem o .piskel mas falta o .png (exporte em PNG pelo Piskel)');
    return true;
  };
  const personagens = idsDosPersonagens(raizJogo);

  // ---------- sprites/tiles ----------
  secao('sprites/tiles/');
  const tiles = conteudo(path.join(raizJogo, 'sprites', 'tiles'));
  if (tiles) {
    const achados = new Set();
    for (const f of tiles) conferir(f, () => {
      const ext = path.extname(f).toLowerCase(), nome = path.basename(f, path.extname(f));
      if (ehPiskel(f, ext)) return;
      if (ext !== '.png') return aviso(f, 'o jogo não usa este arquivo (só .png e .piskel)');
      nomeSeguro(f);
      if (!TILES.includes(nome)) aviso(f, `nome não reconhecido — use: ${TILES.join(', ')}`);
      const img = abrirPNG(f); if (!img) return;
      if (img.w !== TAM || img.h !== TAM) return erro(f, `tem ${img.w}×${img.h}, precisa ter ${TAM}×${TAM} — passe pelas entregas para corrigir`);
      aplicar(f, verificarTile({ img }));
      achados.add(nome);
    });
    const faltam = ['terra', 'cimento'].filter(t => !achados.has(t));
    if (!['grama', 'grama1', 'grama2', 'grama3'].some(t => achados.has(t))) faltam.unshift('grama');
    if (faltam.length) info(`ainda faltam (o jogo usa a arte do código): ${faltam.join(', ')}`);
  }

  // ---------- sprites/personagens ----------
  secao('sprites/personagens/');
  const sprites = conteudo(path.join(raizJogo, 'sprites', 'personagens'));
  if (sprites) {
    const achados = new Set();
    for (const f of sprites) conferir(f, () => {
      const ext = path.extname(f).toLowerCase(), nome = path.basename(f, path.extname(f));
      if (ehPiskel(f, ext)) return;
      if (ext !== '.png') return aviso(f, 'o jogo não usa este arquivo (só .png e .piskel)');
      nomeSeguro(f);
      if (!personagens.has(nome)) aviso(f, `não existe personagem com o id "${nome}" — ids: ${[...personagens.keys()].join(', ')}`);
      const img = abrirPNG(f); if (!img) return;
      aplicar(f, verificarPersonagem({ img }));
      achados.add(nome);
    });
    const semSprite = [...personagens.keys()].filter(id => !achados.has(id));
    if (semSprite.length) info(`usam a arte do código por enquanto: ${semSprite.join(', ')}`);
  }

  // ---------- sons ----------
  secao('sons/');
  const sons = conteudo(path.join(raizJogo, 'sons'));
  if (sons) {
    for (const f of sons) conferir(f, () => {
      const ext = path.extname(f).toLowerCase(), tipo = path.basename(path.dirname(f));
      nomeSeguro(f);
      if (!['musicas', 'efeitos'].includes(tipo)) aviso(f, 'coloque dentro de sons/musicas/ ou sons/efeitos/');
      if (!EXT_SOM.includes(ext)) return aviso(f, 'o jogo não usa este arquivo (só .ogg e .mp3)');
      aplicar(f, verificarSom(fs.readFileSync(f), ext, tipo === 'musicas' ? 'musicas' : 'efeitos'));
      const outra = ext === '.ogg' ? '.mp3' : '.ogg';
      if (['.ogg', '.mp3'].includes(ext) && !fs.existsSync(f.slice(0, -ext.length) + outra)) aviso(f, `falta a cópia ${outra} (o INSTRUCOES.md pede .ogg e .mp3)`);
    });
    if (!sons.length) info('nenhum som ainda');
  }

  // ---------- dialogos ----------
  secao('dialogos/');
  const dialogos = conteudo(path.join(raizJogo, 'dialogos'));
  if (dialogos) {
    for (const f of dialogos) conferir(f, () => {
      const ext = path.extname(f).toLowerCase();
      nomeSeguro(f);
      if (ext !== '.json') return aviso(f, 'o jogo não usa este arquivo (diálogos são .json)');
      aplicar(f, verificarDialogo(fs.readFileSync(f, 'utf8'), path.basename(f, ext), personagens));
    });
    if (!dialogos.length) info('nenhum diálogo ainda (as falas continuam em blocos/*.js)');
  }

  console.log(`Verificando as pastas do jogo em ${raizJogo}` + saida.join('\n'));
  console.log(`\n${erros} erro(s), ${avisos} aviso(s).`);
  process.exitCode = erros ? 1 : 0;
}

if (require.main === module) main();
module.exports = { lerPNG, escreverPNG, lerPiskel, verificarTile, verificarPersonagem, verificarDialogo, verificarSom, identificar, idsDosPersonagens };
