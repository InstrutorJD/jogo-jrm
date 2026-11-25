# dialogos/

Falas dos personagens, um arquivo por personagem: `dialogos/<id>.json` (ids na seção de Personagens do
`INSTRUCOES.md`). Quando o arquivo existe e está certo, o jogo usa as falas dele; senão, usa as
`conversas` escritas em `blocos/<bloco>.js`.

- Cada lista de falas é uma conversa; a cada vez que o jogador fala com o NPC, ele usa a próxima.
- O `"nome"` do arquivo é o que aparece na caixa de diálogo (vazio = usa o nome do bloco).
- Variáveis: `{nome}` e `{estudante}` (ou `{aluno}`, nas falas antigas) viram o primeiro nome do estudante; `{horario}` vira a hora do jogo (ex.: 07:30) e `{dia}` o número do dia.
  Outras variáveis aparecem escritas assim na tela.
- `"notas"` (opcional): anotações para quem edita, por exemplo em que momento cada conversa acontece. O jogo ignora.
- Frases curtas: a caixa de diálogo mostra umas 2–3 linhas por vez.
