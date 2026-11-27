const {test} = require('node:test');
const a = require('node:assert/strict');
const fs = require('fs');
const p = require('path');
const {pathToFileURL} = require('url');

const loadClient = () => import(pathToFileURL(p.resolve(__dirname, '../dist/prod/assets/act-ui/institutional-editor-client.mjs')));
const loadEditor = () => import(pathToFileURL(p.resolve(__dirname, '../dist/prod/assets/act-ui/public-admin-editor.mjs')));

function createEditorFixture() {
  return {
    schemaVersion: 'editorial-admin-view-v1',
    controlRevision: 4,
    epoch: 1,
    canManagePages: true,
    canManageTimeline: true,
    pages: {
      home: {
        schemaVersion: 'geapa-public-v2.1',
        id: 'home',
        revision: 2,
        draftRevision: 2,
        publishedRevision: 1,
        hasDraft: true,
        published: true,
        draft: {
          title: 'Destaques Iniciais',
          subtitle: 'Subtítulo rascunho privado',
          sourceHash: 'hash-draft',
          sections: [
            {
              id: 'sec-1',
              type: 'HERO',
              title: 'Jornada de Agroecologia',
              subtitle: 'UFMT Cuiabá',
              text: 'Descrição detalhada da jornada.',
              imageUrl: 'https://firebasestorage.googleapis.com/v0/b/geapa/o/jornada.jpg',
              buttonText: 'Ver eixos',
              buttonUrl: '#/eixos-tematicos',
              order: 1,
              published: true
            },
            {
              id: 'sec-2',
              type: 'TEXT',
              title: 'Bloco Secundário',
              subtitle: '',
              text: 'Segundo bloco editorial.',
              imageUrl: '',
              buttonText: '',
              buttonUrl: '',
              order: 2,
              published: true
            }
          ]
        },
        publishedSnapshot: {
          title: 'Versão Pública Anterior',
          subtitle: 'Publicada antes',
          sourceHash: 'hash-pub',
          sections: []
        },
        updatedAt: 1764000000000,
        updatedByPersonId: 'SYN_COM_01'
      },
      about: {
        schemaVersion: 'geapa-public-v2.1',
        id: 'about',
        revision: 1,
        draftRevision: 1,
        publishedRevision: 0,
        hasDraft: true,
        published: false,
        draft: {
          title: 'Sobre o GEAPA',
          subtitle: 'Apresentação institucional',
          sourceHash: 'about-hash',
          sections: [
            {
              id: 'about-1',
              type: 'TEXT',
              title: 'Missão',
              subtitle: '',
              text: 'Ensino, pesquisa e extensão em agroecologia.',
              imageUrl: '',
              buttonText: '',
              buttonUrl: '',
              order: 1,
              published: true
            }
          ]
        },
        publishedSnapshot: null,
        updatedAt: 1764000000000,
        updatedByPersonId: 'SYN_COM_01'
      }
    },
    timeline: {
      revision: 3,
      items: [
        {
          schemaVersion: 'geapa-public-v2.1',
          id: 'MARCO_2022',
          revision: 2,
          draftRevision: 2,
          publishedRevision: 2,
          hasDraft: false,
          published: true,
          draft: {
            year: 2022,
            date: '2022-05-10',
            title: 'Fundação do GEAPA',
            description: 'Primeiro ciclo de estudos na UFMT.',
            imageUrl: '',
            order: 1
          },
          publishedSnapshot: {
            year: 2022,
            date: '2022-05-10',
            title: 'Fundação do GEAPA',
            description: 'Primeiro ciclo de estudos na UFMT.',
            imageUrl: '',
            order: 1
          },
          updatedAt: 1764000000000,
          updatedByPersonId: 'SYN_COM_01'
        }
      ]
    },
    history: {
      home: [
        {
          operationId: 'op-home-1',
          action: 'PAGE_PUBLISH',
          targetId: 'home',
          revisionBefore: 0,
          revisionAfter: 1,
          actorPersonId: 'SYN_COM_01',
          actorUid: 'uid-com',
          at: 1763900000000,
          summary: 'Publicação inicial da Home',
          snapshotHash: 'hash-pub'
        }
      ],
      about: [],
      timeline: []
    },
    validUntil: Date.now() + 120000
  };
}

test('editorial transport uses editorial namespace and recovers interrupted operations via editorialStatus', async () => {
  const {createInstitutionalEditor} = await loadClient();
  const map = new Map();
  const storage = {getItem: k => map.get(k) || null, setItem: (k, v) => map.set(k, v), removeItem: k => map.delete(k)};
  const calls = [];
  const state = {uid: 'SYN_EDITOR', generation: 1};
  const auth = {
    pending: new Set(),
    capture: () => ({...state}),
    assert: t => {
      if (t.uid !== state.uid || t.generation !== state.generation) throw Error('STALE_AUTHORIZATION');
    },
    token: async () => 'synthetic-editorial-token'
  };

  let failExecute = true;
  const editorial = createInstitutionalEditor({
    auth,
    storage,
    config: {projectId: 'test', endpoint: 'https://test.invalid/command', siteKey: 'k'},
    projectId: 'test',
    endpoint: 'https://test.invalid/command',
    mode: 'editorial',
    attest: async () => 'synthetic-check',
    fetchImpl: async (_url, options) => {
      const body = JSON.parse(options.body);
      calls.push(body);
      if (body.action === 'editorialExecute' && failExecute) throw Error('network-drop');
      if (body.action === 'editorialStatus') return {ok: true, json: async () => ({result: {state: 'COMPLETED', action: 'PAGE_PUBLISH', revision: 3}})};
      return {ok: true, json: async () => ({result: {request: {operationId: 'e'.repeat(32), digest: 'd'.repeat(64), validUntil: Date.now() + 60000, epoch: 1, controlRevision: 4}}})};
    }
  });

  const contactCalls = [];
  const contact = createInstitutionalEditor({
    auth,
    storage,
    config: {projectId: 'test', endpoint: 'https://test.invalid/command', siteKey: 'k'},
    projectId: 'test',
    endpoint: 'https://test.invalid/command',
    mode: 'contact',
    attest: async () => 'synthetic-check',
    fetchImpl: async (_url, options) => {
      contactCalls.push(JSON.parse(options.body));
      return {ok: true, json: async () => ({result: {state: 'NOT_ADMITTED'}})};
    }
  });

  const prep = await editorial.run('preview', {action: 'PAGE_SAVE_DRAFT', pageId: 'home'});
  await a.rejects(editorial.run('execute', prep.request), /network-drop/);
  a([...map.keys()].some(k => k.startsWith('geapa.editorial.pending.v1.')));
  a.equal((await contact.run('status', {})).state, 'NOT_ADMITTED');

  const recovered = await editorial.run('status', {});
  a.equal(recovered.state, 'COMPLETED');
  a.deepEqual(calls.map(c => c.action), ['editorialPreview', 'editorialExecute', 'editorialStatus']);
});

test('DEV and PROD act-browser-client and act-session expose editorial endpoints and dispatch public update events', () => {
  for (const rel of ['src/services/act-browser-client.mjs', 'config/variants/dev/src/services/act-browser-client.mjs']) {
    const code = fs.readFileSync(p.resolve(__dirname, '..', rel), 'utf8');
    a(code.includes("mode:'editorial'"), rel);
    a(code.includes("route==='/admin/conteudo-publico/editar'"), rel);
    a(code.includes('portal:public-content-updated'), rel);
  }

  for (const rel of ['src/services/specialized-readers-config.mjs', 'config/variants/dev/src/services/specialized-readers-config.mjs']) {
    const code = fs.readFileSync(p.resolve(__dirname, '..', rel), 'utf8');
    a(code.includes('/admin/conteudo-publico'), rel);
  }

  const asset = require('../config/assets.json').assets.find(r => r.source === 'src/session/act-session.mjs');
  for (const env of ['dev', 'prod']) {
    const built = fs.readFileSync(p.join(__dirname, '../dist', env, asset.url), 'utf8');
    a(/['"]\/admin\/conteudo-publico['"]/.test(built), env);
    a(/['"]\/admin\/conteudo-publico\/editar['"]/.test(built), env);
  }
});

test('public admin editor renders home/about/timeline/history shells and escapes malicious values', async () => {
  const originalWindow = global.window;
  global.window = {
    PortalDevContext: {
      authenticated: true,
      accessPending: false,
      act: {
        available: true,
        navigation: {
          routes: {'admin-conteudo-publico': true},
          validUntil: Date.now() + 60000
        }
      }
    }
  };

  try {
    const mod = await loadEditor();
    mod.resetEditorialStateForTest();
    const view = createEditorFixture();
    view.pages.home.draft.title = 'Início <script>alert(1)</script>';
    mod.setEditorialViewForTest(view);

    const html = mod.renderEditorialShell();
    a(html.includes('data-editor-tab="home"'));
    a(html.includes('data-editor-tab="about"'));
    a(html.includes('data-editor-tab="timeline"'));
    a(html.includes('data-editor-tab="history"'));
    a(html.includes('value="Início &lt;script&gt;alert(1)&lt;/script&gt;"'));
    a(!html.includes('<script>alert(1)</script>'));
    a(html.includes('data-editor-action="section-add"'));
    a(html.includes('data-editor-action="section-up"'));
    a(html.includes('data-editor-action="section-down"'));
    a(html.includes('data-editor-action="section-remove"'));
    a(html.includes('data-editor-action="preview"'));
    a(html.includes('data-editor-action="publish"'));
    a(html.includes('data-editor-action="unpublish"'));
    a(html.includes('A identidade visual fixa do Portal'));
  } finally {
    global.window = originalWindow;
  }
});
