# jogo-jrm — Vila Pixel

RPG de exploração em pixel art (Phaser 3) ambientado no CEPI João Roberto Moreira.

## Como jogar

Abra o `index.html` no navegador (com internet, para baixar o Phaser), ou sirva a pasta:

```
npx serve .
```

Para personalizar as falas com o nome do aluno: `index.html?name=Maria`.

**Controles:** WASD/setas andam · SHIFT corre · E conversa · Espaço/Enter/clique avançam o diálogo.

## Estrutura

- `index.html` — página do jogo (interface de diálogo, carregamento e faixas)
- `motor.js` — motor (cenas, física, NPCs, diálogos, troca de blocos)
- `arte.js` — toda a arte, gerada por código
- `curiosidades.js` — frases "Você sabia?" da tela de carregamento
- `blocos/` — um arquivo por área do mapa, carregado sob demanda
- `sprites/` — arte em PNG feita no Piskel (`personagens/`, `tiles/`)
- `dialogos/` — falas dos personagens
- `sons/` — músicas e efeitos sonoros
- `ferramentas/` — scripts de apoio (verificação dos tiles dos alunos)

Os blocos são buscados em `blocos/`, ao lado do `motor.js`, então a pasta inteira
pode ser copiada para dentro de outro site (ex.: `vila-pixel/`) sem mudar nada.

## Tiles dos alunos

1. Coloque os `.png` / `.piskel` dos alunos na pasta `entregas/` (pode ter subpastas).
   Nome sugerido: `nome-do-aluno_grama.png`. Tiles aceitos: `grama` (ou `grama1`–`grama3`), `terra`, `cimento`.
2. Rode `node ferramentas/verificar-tiles.js`
3. Abra `entregas/relatorio.html`: mostra cada tile, a prévia 3×3 da emenda e o que foi corrigido ou precisa refazer.
4. Os tiles aproveitáveis ficam em `entregas/corrigidos/<tile>/<aluno>.png`. Copie o escolhido para `sprites/tiles/<tile>.png`.

A pasta `entregas/` não vai para o git (tem nomes de alunos).
