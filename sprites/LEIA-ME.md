# sprites/

Arte do jogo em PNG, feita no Piskel. Exporte sempre em **PNG, escala 1x, fundo transparente**.
Guarde também o `.piskel` ao lado do PNG, para poder editar depois.

## personagens/
Um arquivo por personagem, com o id dele: `jogador.png`, `teo.png`…
- Frames de **32 × 32 px**, 7 frames numa linha só (**224 × 32 px**), nesta ordem:
  1. baixo, parado · 2. baixo, passo A · 3. cima, parado · 4. cima, passo A
  5. direita, parado · 6. direita, passo A · 7. direita, passo B
- O jogo gera sozinho a esquerda (espelhando a direita) e o passo B de baixo/cima.

## tiles/
Chão do mapa, **32 × 32 px**, um arquivo por tile: `grama.png` (ou `grama1`–`grama3`), `terra.png`, `cimento.png`.
- Sem transparência, e as bordas precisam emendar quando o tile se repete.
- As entregas dos alunos passam antes pelo `ferramentas/verificar-tiles.js` (ver README).

**Ainda não usado pelo jogo:** por enquanto a arte vem de `arte.js`. O motor vai passar a carregar
estes PNGs; o que estiver faltando continua desenhado por código.
