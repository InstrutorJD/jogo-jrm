# jogo-jrm — Vila Pixel

RPG de exploração em pixel art (Phaser 3) ambientado no CEPI João Roberto Moreira.

**Alunos:** as instruções de como fazer e entregar tiles, personagens, sons e diálogos estão em [INSTRUCOES.md](INSTRUCOES.md).

## Como jogar

Sirva a pasta e abra no navegador. Precisa de internet para baixar o Phaser.

```
npx serve .
```

Abrir o `index.html` direto também funciona, mas assim o navegador não deixa o jogo usar os PNGs de
`sprites/`, e o jogo mostra só a arte do `arte.js`.

Para personalizar as falas com o nome do aluno: `index.html?name=Maria`. Para já abrir na série do aluno
(sem perguntar na tela inicial): `index.html?name=Maria&ano=2`.

**Controles:** WASD/setas andam · SHIFT corre · E conversa · Espaço/Enter/clique avançam o diálogo ·
ESC ou P pausa · M liga/desliga o som. Nos menus: setas e Enter (ou os números 1–9).

**Aulas:** o Mestre Bit (Bloco B) mostra as aulas e as perguntas da série escolhida, tiradas de
`conteudo/conteudos_<n>ano/<n>-ano-completo.json`.

## Estrutura

- `index.html` — página do jogo (interface de diálogo, carregamento e faixas)
- `motor.js` — motor (cenas, física, NPCs, diálogos, troca de blocos)
- `arte.js` — arte gerada por código (32 × 32), usada quando falta o PNG em `sprites/`
- `curiosidades.js` — frases "Você sabia?" da tela de carregamento
- `blocos/` — um arquivo por área do mapa, carregado sob demanda
- `sprites/` — arte em PNG 32 × 32 feita no Piskel (`personagens/`, `tiles/`), usada pelo jogo quando existe
- `dialogos/` — falas dos personagens (`<id>.json`; substituem as `conversas` do bloco)
- `sons/` — músicas e efeitos sonoros
- `conteudo/` — aulas e perguntas por série, usadas pelo Mestre Bit e nas telas de carregamento
- `ferramentas/` — scripts de apoio (verificação das entregas dos alunos)

Os blocos são buscados em `blocos/`, ao lado do `motor.js`, então a pasta inteira
pode ser copiada para dentro de outro site (ex.: `vila-pixel/`) sem mudar nada.

## Entregas dos alunos

As regras estão no [INSTRUCOES.md](INSTRUCOES.md) (arte em **64 × 64**). Para conferir as entregas:

1. Coloque o que os alunos mandaram na pasta `entregas/` (pode ter subpastas por turma ou aluno):
   tiles e personagens (`.png` / `.piskel`), diálogos (`.json`) e sons (`.ogg` / `.mp3`).
2. Rode `node ferramentas/verificar-tiles.js`. Ele confere cada arquivo contra o INSTRUCOES.md e
   **corrige só o que dá para corrigir sem perder qualidade**: escala 2x/4x, frames em grade, PNG dentro
   do .piskel, nome do arquivo, arte no tamanho antigo 16 × 16 (ampliada 2x, com aviso), JSON com vírgula
   sobrando ou aspas curvas, extensão de áudio trocada. O que exigiria perder qualidade (encolher um
   desenho, converter um .wav) vai para **refazer**.
3. O terminal lista todas as **correções feitas**, para avisar os alunos. O relatório
   `entregas/relatorio.html` mostra prévias (tile em 3 × 3, folha do personagem, falas, player de som).
4. Os arquivos aproveitáveis ficam em `entregas/corrigidos/<tipo>/<item>/<aluno>.<ext>`. Copie o escolhido
   para a pasta do jogo (`sprites/tiles/grama.png`, `sprites/personagens/teo.png`, `dialogos/teo.json`…).

A pasta `entregas/` não vai para o git (tem nomes de alunos).

## Conferir as pastas do jogo

`node ferramentas/verificar-tiles.js --pastas` confere o que já está em `sprites/`, `sons/` e `dialogos/`:
tamanho dos tiles e personagens, frames vazios, fundo transparente, nomes de arquivo, ids de
personagem que não existem, formato e tamanho dos sons, diálogos fora do formato. Usa as mesmas regras das entregas, mas não altera nada e
termina com código 1 se encontrar erro. Rode antes de cada commit.


