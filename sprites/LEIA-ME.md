# sprites/

Arte do jogo em PNG, feita no Piskel. Exporte sempre em **PNG, escala 1x, fundo transparente**.
Guarde também o `.piskel` ao lado do PNG, para poder editar depois.

## personagens/
Um arquivo por personagem, com o id dele: `jogador.png`, `teo.png`…
- Frames de **64 × 64 px**, 7 frames numa linha só (**448 × 64 px**), nesta ordem:
  1. baixo, parado · 2. baixo, passo A · 3. cima, parado · 4. cima, passo A
  5. direita, parado · 6. direita, passo A · 7. direita, passo B
- O jogo gera sozinho a esquerda (espelhando a direita) e o passo B de baixo/cima.

## tiles/
Chão do mapa, **64 × 64 px**, um arquivo por tile: `grama.png` (ou `grama1`–`grama3`), `terra.png`, `cimento.png`.
- Sem transparência, e as bordas precisam emendar quando o tile se repete.
- As entregas dos alunos passam antes pelo `ferramentas/verificar-tiles.js` (ver README).

## Como o jogo usa estes arquivos
O motor procura os PNGs ao abrir o jogo, e os dos NPCs ao entrar em cada bloco. Se um PNG não existir
ou estiver no tamanho errado, o jogo continua com a arte desenhada pelo `arte.js`, ampliada 4x.

| PNG | Onde aparece no mapa |
|---|---|
| `tiles/grama.png` (ou `grama1`–`grama3`) | grama, e também embaixo de árvores, cercas, pedras e flores |
| `tiles/terra.png` | caminhos de terra |
| `tiles/cimento.png` | piso, calçada, piso do portão, e embaixo dos bancos, das bicicletas e da fonte — **desligado por enquanto**: o entregue é uma cor só, azulada; precisa de um cinza neutro com textura (juntas, pontinhos). Para religar, ponha `cimento` de volta em `PNG_TILES` no `arte.js` |
| `personagens/<id>.png` | o personagem com aquele id (`jogador`, `teo`…) |

Os PNGs só aparecem com o jogo aberto por um servidor (`npx serve .`). Aberto direto do arquivo,
o navegador bloqueia os PNGs e o jogo usa a arte padrão. No console, os erros 404 dos PNGs que ainda
não existem são normais.
