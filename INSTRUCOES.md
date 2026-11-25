# Instruções para os alunos — CEPI JRM

# Grupos

- Frases
  > Juliano\
  > Yasmin\
  > Gabriella

- Pesquisas (Musicas, efeitos sonoros, fases, enigmas, conteudo das aulas)
  > Maycon\
  > Leon\
  > Iago\
  > Tiago

- Personagens
  > João\
  > Miguel\
  > Engel\
  > Breno\
  > Josuel

Cada parte do jogo tem a sua pasta. Leia a seção da sua tarefa antes de começar.

| O que você vai fazer | Pasta | Formato |
|---|---|---|
| Chão do mapa (grama, terra, cimento) | `sprites/tiles/` | PNG 64 × 64 |
| Personagem | `sprites/personagens/` | PNG 448 × 64 (7 frames de 64 × 64) |
| Música ou efeito sonoro | `sons/musicas/` ou `sons/efeitos/` | OGG + MP3 |
| Falas de um personagem | `dialogos/professores/` ou `dialogos/coordenacao/` | JSON |
| Conteúdo das aulas e enigmas | `conteudo/conteudos_1ano/`, `conteudo/conteudos_2ano/`, `conteudo/conteudos_3ano/` (enigmas em `enigmas/`) | JSON |

**Como entregar:** coloque cada arquivo na pasta indicada na tabela acima e entregue ao professor. Ele passa tudo pelo verificador. Se algo estiver errado, o relatório mostra o que precisa ser corrigido.

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
- **Resize** (painel da direita): o tamanho de cada frame é **64 x 64**. Arquivos antigos em 32 × 32 ou 16 × 16 ainda são aceitos, mas ficam com pixels maiores;
- **Export → PNG**, sempre com **Scale 1x**. Não aumente: o jogo amplia sozinho;
- **Save** também o projeto **.piskel** e entregue junto. Ele serve de reserva e permite editar depois.
- **Nunca** entregue em JPG: ele borra o pixel art.

---

## 1. Chão — `sprites/tiles/`
O cenario deve ser feito em tilemap.

Um tile é uma peça de **64 × 64 px** que se repete para formar o chão. O jogo usa só 3 tipos:

| Arquivo | O que é |
|---|---|
| `grama.png` | grama (pode ter variações: `grama1`, `grama2`, `grama3`) |
| `terra.png` | terra |
| `cimento.png` | caminho de cimento |

**Regras:**
1. Exatamente **64 x 64 px**, com **1 frame só**.
2. **Pinte todos os pixels.** Pixel transparente vira um buraco preto no jogo.
3. **Tem que emendar.** O tile se repete lado a lado, então a borda da esquerda precisa combinar com a da direita, e a de cima com a de baixo.
   - Para testar: crie um canvas de 192 × 192, cole o seu tile 9 vezes (3 × 3) e veja se aparece uma "costura".
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
3. **Pés embaixo**: os pés ficam perto da linha 58, e o corpo centralizado no quadro.
   A colisão do jogo fica nos pés, então um boneco "flutuando" atravessa as paredes.
4. O **frame 1** (de frente, parado) é o que aparece na caixa de diálogo.
5. Para combinar com o resto do jogo, use o contorno escuro `#2a1d1a`.

**Exportar:** Export → PNG → **Spritesheet** com **Columns = 7** e **Rows = 1**, Scale **1x** → Download.
O arquivo final deve ter **448 × 64 px** (7 frames lado a lado).

**Nome:** o id do personagem. Use `jogador` para o personagem principal ou o id de um NPC:

| id | Personagem | Onde fica |
|---|---|---|
| `jogador` | o estudante (personagem principal) | — |
| `seuZe` | Seu Zé, o porteiro | Bloco A |
| `tiaSuzana` | Tia Suzana | Bloco A |
| `cida` | Dona Cida | Bloco A |
| `teo` | Téo | Bloco A |
| `josimar` | Diretor Josimar (falas em `dialogos/coordenacao/`) | anda pela escola |
| `jose` | Prof. José Moreira, de inglês (falas em `dialogos/professores/`) | anda pela escola |

Na entrega: `seu-nome_jogador.png`.

---

## 3. Sons — `sons/`

| Pasta | O que vai | Tamanho máximo |
|---|---|---|
| `sons/musicas/` | música de fundo, em loop (ex.: `bloco-a.ogg`) | 5 MB |
| `sons/efeitos/` | sons curtos: `passo` em `sons/efeitos/passos/`, `dialogo` em `sons/efeitos/dialogos/`, `portao` em `sons/efeitos/portas/` … | 300 KB |

**Regras:**
1. Entregue **duas cópias** de cada som: **.ogg** e **.mp3**, com o mesmo nome (`passo.ogg` + `passo.mp3`). O iPhone não toca .ogg.
2. Coloque cada arquivo na pasta correspondente: músicas em `sons/musicas/` e efeitos sonoros em `sons/efeitos/`. Não misture os dois tipos.
3. **Não entregue .wav**: é pesado demais para o site. Para converter, use o Audacity (Arquivo → Exportar).
4. Efeitos devem ser **curtos**, com menos de 1 segundo. A música precisa **emendar** no fim para repetir sem corte.
   Ponha **musica** no nome de uma música (`seu-nome_musica-bloco-a.ogg`). Assim ela não é confundida com um efeito.
5. **Só use sons feitos por você ou com licença livre** (por exemplo, CC0). Junto com o arquivo, informe **de onde veio** e **quem fez**, para registrar no `sons/LEIA-ME.md`.

---

## 4. Diálogos — `dialogos/`

Organize cada arquivo **.json** na subpasta do grupo do personagem:

| Pasta | Quem fica nela |
|---|---|
| `dialogos/professores/` | professores |
| `dialogos/coordenacao/` | equipe da coordenação |

O nome do arquivo deve ser o **id** do personagem (`teo.json`, `cida.json`…). Veja a lista de ids na seção de Personagens. Por exemplo: `dialogos/professores/<id>.json` ou `dialogos/coordenacao/seuZe.json`.

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
- `{nome}` (ou `{estudante}`) vira o primeiro nome do estudante que está jogando, `{horario}` vira a hora do jogo (ex.: 07:30) e `{dia}` vira o número do dia (ex.: 2).
  Outras palavras entre `{ }` aparecem do jeito que estão na tela.

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

Na entrega, comece o nome do arquivo com o seu nome, por exemplo `seu-nome_seuZe.json`. Ao organizar os arquivos do jogo, deixe apenas o id no nome e coloque-o na subpasta correspondente, por exemplo `dialogos/coordenacao/seuZe.json`.

---

## 5. Conteúdos — `conteudos_1ano/`, `conteudos_2ano/`, `conteudos_3ano/`

Cada série tem a sua própria pasta para guardar os resumos das aulas, dicas e enigmas que vão aparecer no jogo:

| Pasta | O que vai |
|---|---|
| `conteudos_1ano/` | matérias, revisões e enigmas do 1º ano |
| `conteudos_2ano/` | matérias, revisões e enigmas do 2º ano |
| `conteudos_3ano/` | matérias, revisões e enigmas do 3º ano |

*(Caso existam outras turmas, siga a mesma progressão: `conteudos_4ano/`, etc.)*

**Regras:**
1. **Separe por série:** coloque o arquivo na pasta correspondente ao ano daquela matéria. Não misture conteúdos de séries diferentes no mesmo arquivo.
2. **Formato do arquivo:** use **`.md`** (ou `.txt`) para textos e explicações, e **`.json`** para perguntas, quizzes e enigmas (seguindo as mesmas regras de aspas e vírgulas da seção de Diálogos).
3. **Textos curtos e objetivos:** adapte o conteúdo para a leitura dentro do jogo, evitando blocos gigantes de texto.
4. **Revise antes de enviar:** confira se as informações e os gabaritos dos enigmas estão corretos e sem erros de português.
5. **Informe a fonte:** se basear o conteúdo em algum livro, apostila ou site, registre a referência no final do arquivo.

Na entrega: `seu-nome_tema-da-aula.md` ou `seu-nome_enigma-materia.json`.

---

## Antes de entregar: checklist

- [ ] O nome do arquivo está em minúsculas, sem espaço e sem acento, e começa com o meu nome?
- [ ] É do tamanho certo? (tile 64 × 64 · personagem 448 × 64, 7 frames de 64 × 64)
- [ ] Exportei em **Scale 1x**?
- [ ] Entreguei o **.piskel** junto com o PNG?
- [ ] Diálogo: o JSON passou no validador?
- [ ] Conteúdo: está na pasta da série certa (`conteudos_1ano`, `2ano`...) e no formato (json) correto? 
