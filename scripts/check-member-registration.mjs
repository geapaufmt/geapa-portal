import fs from 'node:fs';
import vm from 'node:vm';

const read = (file) => fs.readFileSync(file, 'utf8');
const required = (condition, message) => { if (!condition) throw new Error(message); };
const source = read('web/assets/js/admin-cadastro-membros.js');
const api = read('web/assets/js/api.js');
const bridge = read('apps-script/09_vinculo_solicitacoes.gs');
const router = read('apps-script/03_webapp.gs');
const homolog = read('web/assets/js/config.homolog.js');
const prod = read('web/assets/js/config.prod.js');

new vm.Script(source);
required(source.includes("hasPermissao('membros:cadastrar_novos_membros')"), 'Botao nao confere permissao resolvida.');
required(source.includes("apiGet('/admin/ingressos-membros/catalogos'"), 'Catalogo protegido nao e carregado.');
required(source.includes("apiPost('/admin/ingressos-membros/cadastrar'"), 'Cadastro nao usa o contrato unico.');
required(source.includes('modalidadeCadastro') && source.includes('RAPIDO') && source.includes('COMPLETO'), 'Modalidades nao usam o mesmo formulario.');
required(!/idPessoa|idVinculo|criadoPor|executadoPor/.test(source), 'Frontend envia identidade ou IDs internos.');
required(!/semestreAtualCursoCalculado|periodoIngressoCurso/.test(source), 'Frontend tenta definir campos academicos calculados.');
required(source.includes('button.disabled = true') && source.includes('chaveIdempotencia'), 'Clique duplo/idempotencia nao estao protegidos.');
required(source.includes('PortalGeapaLocalidades.serialize'), 'Cadastro completo nao usa o catalogo local oficial.');
required(api.includes('adminIngressosMembrosCadastrar') && api.includes('ACOES_CADASTRO_MEMBROS'), 'API nao possui gate proprio.');
required(bridge.includes("'membros:cadastrar_novos_membros'"), 'Ponte nao repete a permissao no backend.');
required(bridge.includes("ENABLE_MEMBER_REGISTRATION: acesso.contexto.ambienteDadosV2 === 'DEV'"), 'Backend nao restringe a feature a DEV.');
required(router.includes("acao === 'adminIngressosMembrosCadastrar'"), 'Roteador nao publica o contrato.');
required(/ENABLE_MEMBER_REGISTRATION:\s*true/.test(homolog), 'HOMOLOG deve habilitar a feature.');
required(/ENABLE_MEMBER_REGISTRATION:\s*false/.test(prod), 'PROD deve manter a feature desabilitada.');
process.stdout.write('Cadastro administrativo de membros aprovado: 14 verificacoes passaram.\n');
