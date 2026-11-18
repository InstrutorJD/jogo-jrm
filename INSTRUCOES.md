# Instruções para os alunos — Vila Pixel

Cada parte do jogo tem a sua pasta. Leia a seção da sua tarefa antes de começar.

| O que você vai fazer | Pasta | Formato |
|---|---|---|
| Chão do mapa (grama, terra, cimento) | `sprites/tiles/` | PNG 32 × 32 |
| Personagem | `sprites/personagens/` | PNG 224 × 32 (7 frames) |
| Música ou efeito sonoro | `sons/musicas/` ou `sons/efeitos/` | OGG + MP3 |
| Falas de um personagem | `dialogos/` | JSON |

**Como entregar:** entregue o arquivo ao professor. Ele passa tudo pelo verificador e coloca na pasta certa.
Se algo estiver errado, o relatório mostra o que precisa ser corrigido.

---

## Regras que valem para tudo

**Nome do arquivo:**
- só **letras minúsculas**, **sem espaço** e **sem acento**;
- para separar palavras, use `-` (hífen) ou `_` (sublinhado);
- na entrega, comece pelo **seu nome**: `maria-souza_grama.png`.

| ✔ Certo | ✗ Errado |
|---|---|
| `maria-souza_grama.png` | `gramaFinal(2).PNG` |
| `joao_cimento.png` | `cimento.png` |
| `ana_teo.json` | `falasTeo.txt` |

**Configuração do Piskel**, para toda arte:
- **Resize** (painel da direita): o tamanho de cada frame é **64 x 64**. Arquivos antigos em 16 × 16 ainda são aceitos, mas ficam com pixels maiores;
- **Export → PNG**, sempre com **Scale 1x**. Não aumente: o jogo amplia sozinho;
- **Save** também o projeto **.piskel** e entregue junto. Ele serve de reserva e permite editar depois.
- **Nunca** entregue em JPG: ele borra o pixel art.

---

## 1. Chão — `sprites/tiles/`

Um tile é uma peça de **32 × 32 px** que se repete para formar o chão. O jogo usa só 3 tipos:

| Arquivo | O que é |
|---|---|
| `grama.png` | grama (pode ter variações: `grama1`, `grama2`, `grama3`) |
| `terra.png` | terra |
| `cimento.png` | caminho de cimento |

**Regras:**
1. Exatamente **64 x 64 px**, com **1 frame só**.
2. **Pinte todos os pixels.** Pixel transparente vira um buraco preto no jogo.
3. **Tem que emendar.** O tile se repete lado a lado, então a borda da esquerda precisa combinar com a da direita, e a de cima com a de baixo.
   - Para testar: crie um canvas de 96 × 96, cole o seu tile 9 vezes (3 × 3) e veja se aparece uma "costura".
4. Use cores parecidas com as da turma. Combine a paleta antes de começar.

**Exportar:** Export → PNG → Scale **1x** → Download.
**Nome:** `seu-nome_grama.png`, `seu-nome_terra.png` ou `seu-nome_cimento.png`.

---

## 2. Personagens — `sprites/personagens/`

Cada personagem tem **7 frames de 64 × 64 px**, todos numa linha só.

| Frame | O que desenhar |
|---|---|
| 1 | de frente (baixo), parado |
| 2 | de frente (baixo), dando um passo |
| 3 | de costas (cima), parado |
| 4 | de costas (cima), dando um passo |
| 5 | de lado, olhando para a **direita**, parado |
| 6 | de lado (direita), passo A |
| 7 | de lado (direita), passo B |

O jogo cria sozinho o lado esquerdo, espelhando a direita, e o segundo passo de frente e de costas.
Por isso o personagem precisa ser **simétrico**, sem mochila ou franja de um lado só.

**Regras:**
1. Cada frame com **64 × 64 px**. Nenhum frame pode ficar vazio.
2. **Fundo transparente**: pinte só o personagem.
3. **Pés embaixo**: os pés ficam perto da linha 29, e o corpo centralizado no quadro.
   A colisão do jogo fica nos pés, então um boneco "flutuando" atravessa as paredes.
4. O **frame 1** (de frente, parado) é o que aparece na caixa de diálogo.
5. Para combinar com o resto do jogo, use o contorno escuro `#2a1d1a`.

**Exportar:** Export → PNG → **Spritesheet** com **Columns = 7** e **Rows = 1**, Scale **1x** → Download.
O arquivo final deve ter **64 × 64 px**.

**Nome:** o id do personagem. Use `jogador` para o personagem principal ou o id de um NPC:

| id | Personagem | Onde fica |
|---|---|---|
| `jogador` | o aluno (personagem principal) | — |
| `porteiro` | Seu Bento, o porteiro | Bloco A |
| `cida` | Dona Cida | Bloco A |
| `teo` | Téo | Bloco A |
| `bit` | Mestre Bit | Bloco B |
| `lia` | Lia | Bloco B |
| `ze` | Seu Zé | Bloco C |
| `nina` | Nina | Bloco C |

Na entrega: `seu-nome_jogador.png`.

---

## 3. Sons — `sons/`

| Pasta | O que vai | Tamanho máximo |
|---|---|---|
| `sons/musicas/` | música de fundo, em loop (ex.: `bloco-a.ogg`) | 5 MB |
| `sons/efeitos/` | sons curtos: `passo`, `dialogo`, `portao`… | 300 KB |

**Regras:**
1. Entregue **duas cópias** de cada som: **.ogg** e **.mp3**, com o mesmo nome (`passo.ogg` + `passo.mp3`). O iPhone não toca .ogg.
2. **Não entregue .wav**: é pesado demais para o site. Para converter, use o Audacity (Arquivo → Exportar).
3. Efeitos devem ser **curtos**, com menos de 1 segundo. A música precisa **emendar** no fim para repetir sem corte.
   Na entrega, ponha **musica** no nome de uma música (`seu-nome_musica-bloco-a.ogg`). Assim ela não é confundida com um efeito.
4. **Só use sons feitos por você ou com licença livre** (por exemplo, CC0). Junto com o arquivo, informe **de onde veio** e **quem fez**, para registrar no `sons/LEIA-ME.md`.

---

## 4. Diálogos — `dialogos/`

Cada personagem tem um arquivo **.json** com o **id** dele no nome (`teo.json`, `cida.json`…).
Veja a lista de ids na seção de Personagens.

```json
{
  "nome": "Téo",
  "conversas": [
    ["Ei! Aposto que eu corro mais rápido que você!", "Segura o SHIFT e tenta me alcançar."],
    ["Você sabia que dá para andar na diagonal?"],
    ["Bom estudo, {nome}!"]
  ]
}
```

**Como funciona:**
- Cada linha de `conversas` é **uma conversa**. Na primeira vez que o jogador fala com o personagem, sai a 1ª conversa; na segunda vez, a 2ª, e assim por diante. Depois da última, volta para a primeira.
- Dentro de cada conversa, cada frase entre aspas é **uma caixa de diálogo**. O jogador aperta **E** para passar para a próxima.
- `{nome}` vira o primeiro nome do aluno que está jogando.

**Regras:**
1. Frases **curtas**: até umas 100 letras por caixa.
2. Todo texto vai entre **aspas duplas** `" "`.
3. **Vírgula entre os itens, mas não depois do último.** É o erro mais comum:

   ```
   ✔  ["Oi!", "Tudo bem?"]
   ✗  ["Oi!", "Tudo bem?",]
   ```
4. Para testar, cole o arquivo em um validador de JSON (por exemplo, jsonlint.com) antes de entregar.
5. A fala precisa combinar com o personagem e com a escola, e não pode ter ofensa nem piada com colegas.

Na entrega: `seu-nome_teo.json`.

---

## Antes de entregar: checklist

- [ ] O nome do arquivo está em minúsculas, sem espaço e sem acento, e começa com o meu nome?
- [ ] É do tamanho certo? (tile 32 × 32 · personagem 224 × 32)
- [ ] Exportei em **Scale 1x**?
- [ ] Entreguei o **.piskel** junto com o PNG?
- [ ] Som: mandei o **.ogg** e o **.mp3**, e informei a fonte?
- [ ] Diálogo: o JSON passou no validador?
