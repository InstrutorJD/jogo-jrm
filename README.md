# jogo-jrm — CEPI JRM

RPG de exploração em pixel art (Phaser 3) ambientado no CEPI João Roberto Moreira.

**Alunos:** as instruções de como fazer e entregar tiles, personagens, sons e diálogos estão em [INSTRUCOES.md](INSTRUCOES.md).

## Como jogar

Sirva a pasta e abra no navegador. Precisa de internet para baixar o Phaser.

```
npx serve .
```

Abrir o `index.html` direto também funciona, mas assim o navegador não deixa o jogo usar os PNGs de
`sprites/`, e o jogo mostra só a arte do `arte.js`.

**Tela inicial:** o estudante digita o nome e escolhe a série (1º, 2º ou 3º ano). Os NPCs chamam o estudante
pelo primeiro nome (`{nome}` nas falas), e as aulas usam a série escolhida. Os dois ficam lembrados no navegador
e já aparecem preenchidos na próxima vez. Pelo endereço dá para preencher antes: `index.html?name=Maria`
(o nome já vem escrito) ou `index.html?name=Maria&ano=2` (pula a tela, como faz o portal).

**Controles:** WASD/setas andam · SHIFT corre · E conversa · Espaço/Enter/clique avançam o diálogo ·
ESC ou P pausa · M liga/desliga o som · T acelera o tempo (1x, 2x, 5x, 10x, 30x) · G mostra a grade com o número (coluna,linha) de cada quadrado do mapa — os mesmos números de `blocos/<bloco>.js`, contando do 0; com a grade ligada, o canto mostra em que quadrado o estudante está. Nos menus: setas e Enter (ou os números 1–9).

**Controle (gamepad):** analógico ou direcional anda · **A** fala/avança/confirma · **B** segurado corre (nos menus, volta) ·
**Start** pausa. Na tela inicial, esquerda/direita escolhem a série e A começa (o nome precisa ser digitado).

**Celular e tablet:** em aparelhos com toque aparecem um analógico (esquerda) e os botões **E** (falar/avançar),
**CORRER** (segurar) e **pausa** (direita). Melhor jogar com o aparelho deitado. Para testar no computador:
`index.html?toque=1` (e `?toque=0` esconde os botões).

**Horário e dias:** o relógio do jogo aparece no alto da tela. O Dia 1 começa às 06:55, com o estudante do
lado de fora; das 07:00 às 14:00 passam 15 minutos reais (o relógio para na pausa; a tecla T ou o menu de pausa aceleram o tempo). Depois de entrar, o
estudante só sai a partir das 14:00: o Seu Zé abre o portão quando ele pede. Ao sair, termina o dia, e
do Dia 2 em diante o estudante já começa dentro da escola, às 07:00. Os horários ficam no começo do
`motor.js` (`INICIO_DIA1`, `INICIO_DIA`, `FIM_AULAS`, `DURACAO_AULAS`).

**Mapa:** por enquanto o jogo tem só o Bloco A (a entrada da escola). Os Blocos B e C e os prédios das
salas foram removidos (continuam no histórico do git).

**Aulas:** um NPC com `aulas: true` mostra as aulas e as perguntas da série escolhida, tiradas de
`conteudo/conteudos_<n>ano/<n>-ano-completo.json`. Hoje nenhum NPC do mapa tem isso (era o Mestre Bit, do Bloco B).

## Estrutura

- `index.html` — página do jogo (interface de diálogo, carregamento e faixas)
- `motor.js` — motor (cenas, física, NPCs, diálogos, troca de blocos)
- `arte.js` — arte gerada por código (64 × 64), usada quando falta o PNG em `sprites/`
- `curiosidades.js` — frases "Você sabia?" da tela de carregamento
- `blocos/` — um arquivo por área do mapa, carregado sob demanda
- `sprites/` — arte em PNG 64 × 64 feita no Piskel (`personagens/`, `tiles/`), usada pelo jogo quando existe
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
   do .piskel, nome do arquivo, arte nos tamanhos antigos 32 × 32 e 16 × 16 (ampliada 2x/4x, com aviso), JSON com vírgula
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


