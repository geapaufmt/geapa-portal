## Escopo

Descreva a alteracao e o ambiente usado nos testes.

## Checklist

- [ ] Nao altera producao sem flag.
- [ ] Nao adiciona segredo no front-end.
- [ ] Nao escreve em Firestore pelo navegador.
- [ ] Nao troca endpoint PROD sem aprovacao.
- [ ] Nao usa base DEV em PROD sem aviso explicito de PILOTO.
- [ ] Fallback Apps Script foi mantido.
- [ ] Rollback foi revisado/documentado.
- [ ] Preview Firebase foi testado.
- [ ] `npm run check:configs` passou.
