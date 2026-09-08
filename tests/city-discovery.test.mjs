import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";
const cache = new Map();
function load(path) {
 if(cache.has(path)) return cache.get(path);
 const m={exports:{}};cache.set(path,m.exports);
 const source=fs.readFileSync(new URL('../'+path+'.ts',import.meta.url),'utf8');
 new Function('exports','require','module',ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(m.exports,s=>load(s.replace('@/','')),m);
 return m.exports;
}
const {filterRestaurants,geographyOptions}=load('lib/search');
const sample=(id,city,neighborhood='Centro',extra={})=>({id,name:'Casa '+id,city,neighborhood,cuisine:['Japonesa'],category:'restaurant',chef:'',status:'published',tags:[],...extra});
const rows=[sample('a','Cuiabá'),sample('b','Belo Horizonte'),sample('c','Nova Lima'),sample('d','São Paulo'),sample('e','João Pessoa'),sample('hidden','Outra cidade','Centro',{status:'pending_review'})];
const search=(q,params={})=>filterRestaurants(rows,{q,...params},[],null).map(x=>x.id);
test('accent insensitive city search including future cities',()=>{for(const [q,id] of [['cuiaba','a'],['Cuiabá','a'],['sao paulo','d'],['joao pessoa','e'],['Belo Horizonte','b'],['Nova Lima','c']])assert.deepEqual(search(q),[id]);});
test('name cuisine neighborhood Duo and combined terms remain deterministic',()=>{assert.deepEqual(search('Casa a'),['a']);assert.equal(search('japonesa').length,6);assert.equal(search('centro').length,6);assert.deepEqual(search('japonesa cuiaba'),['a']);assert.deepEqual(search('',{city:'nova-lima'}),['c']);assert.deepEqual(search('',{duo:'true'}),[]);assert.equal(filterRestaurants([sample('duo','Cuiabá','Centro',{acceptsDuoGourmet:true})],{duo:'true'},[],null).length,1);});
test('published catalog drives cities; neighborhoods are city scoped',()=>{const options=geographyOptions([...rows,sample('f','Cuiabá','Duque de Caxias')],'cuiaba');assert.equal(options.cities.length,5);assert.deepEqual(options.neighborhoods.map(x=>x.label),['Centro','Duque de Caxias']);assert.equal(geographyOptions(rows).neighborhoods.length,0);assert.deepEqual(search('',{city:'cuiaba',neighborhood:'centro'}),['a']);});
test('all 22 imported candidates are searchable and filterable without name exceptions',()=>{const b=JSON.parse(fs.readFileSync(new URL('../docs/catalog/duo-cuiaba-batch-2026-09-rev2.json',import.meta.url),'utf8'));const catalog=b.candidates.map(c=>({...sample(c.sourceId,c.proposedPayload.city),...c.proposedPayload,cuisine:c.proposedPayload.cuisines}));assert.equal(filterRestaurants(catalog,{q:'Cuiabá'},[],null).length,22);assert.equal(filterRestaurants(catalog,{city:'cuiaba'},[],null).length,22);});
test('national search pages 5001 IDs and fetches only missing details in batches',async()=>{const {loadSearchCatalog,searchCatalogView}=load('lib/data/catalog-pagination');const {selectDiscoverFallback}=load('lib/data/discover-selection');const base=Array.from({length:1000},(_,i)=>sample(String(i),'Nova Lima','Vila da Serra'));const before=selectDiscoverFallback(base).map(x=>x.id);const ids=Array.from({length:5001},(_,i)=>String(5000-i));let indexCalls=0,detailCalls=0;const orders=[];const client={from(){return {select(value){this.projection=value;return this},order(field){orders.push(field);return this},async range(a,b){indexCalls++;return {data:ids.slice(a,b+1).map(id=>({id})),error:null}},async in(field,values){assert.equal(field,'id');assert.ok(values.length<=500);assert.ok(values.every(id=>Number(id)>=1000));detailCalls++;return {data:values.map(id=>sample(id,'Cuiabá')),error:null}}}}};const loaded=await loadSearchCatalog(client,new Set(base.map(x=>x.id)));assert.equal(loaded.ids.length,5001);assert.equal(loaded.extraRows.length,4001);assert.equal(indexCalls,11);assert.equal(detailCalls,9);assert.deepEqual(orders.slice(0,2),['created_at','id']);const search=searchCatalogView(loaded.ids,base,loaded.extraRows);assert.equal(search.length,5001);assert.equal(search[0].id,'5000');assert.equal(search.find(x=>x.id==='0'),base[0]);assert.deepEqual(selectDiscoverFallback(base).map(x=>x.id),before);assert.deepEqual(base.slice(0,6).map(x=>x.id),['0','1','2','3','4','5']);});
test('search index fails closed on page errors',async()=>{const {loadSearchCatalog}=load('lib/data/catalog-pagination');const client={from(){return{select(){return this},order(){return this},async range(){return{data:null,error:{message:'failed'}}}}}};await assert.rejects(loadSearchCatalog(client,new Set()));});
test('Discover context remains legacy read; both Search entry points opt in',()=>{const context=fs.readFileSync(new URL('../context/app-context.tsx',import.meta.url),'utf8');const home=fs.readFileSync(new URL('../app/page.tsx',import.meta.url),'utf8');const explorer=fs.readFileSync(new URL('../components/search/search-explorer.tsx',import.meta.url),'utf8');assert.ok(!context.includes('loadSearchCatalog('));assert.ok(!context.includes('loadVisibleCatalog('));assert.ok(context.includes('client.from("restaurants").select("*").order("created_at", { ascending: false })'));assert.ok(home.includes('useSearchCatalog(hasSearch)'));assert.ok(home.includes('selectDiscoverFallback(restaurants)'));assert.ok(explorer.includes('useSearchCatalog(true)'));});

test('458 and exactly 1000 known records complete without duplicate detail payload', async () => {
  const { loadSearchCatalog } = load('lib/data/catalog-pagination');
  for (const count of [458, 1000]) {
    const ids = Array.from({ length: count }, (_, i) => String(i));
    let calls = 0;
    const client = { from() { return {
      select(value) { assert.equal(value, 'id'); return this; },
      order() { return this; },
      async range(start, end) {
        calls++;
        return { data: ids.slice(start, end + 1).map(id => ({ id })), error: null };
      },
      async in() { assert.fail('Known records must not be fetched twice'); },
    }; } };
    const result = await loadSearchCatalog(client, new Set(ids));
    assert.deepEqual(result.ids, ids);
    assert.deepEqual(result.extraRows, []);
    assert.equal(calls, Math.floor(count / 500) + 1);
  }
});

test('duplicate index IDs and missing detail rows fail closed', async () => {
  const { loadSearchCatalog } = load('lib/data/catalog-pagination');
  for (const ids of [['a', 'a'], ['a']]) {
    const client = { from() { return {
      select() { return this; }, order() { return this; },
      async range() { return { data: ids.map(id => ({ id })), error: null }; },
      async in() { return { data: [], error: null }; },
    }; } };
    await assert.rejects(loadSearchCatalog(client, new Set()));
  }
});

test('individual profile read uses exact slug and published status, preserving RLS', async () => {
  const { loadPublishedRestaurant } = load('lib/data/restaurant-profile');
  const batch = JSON.parse(fs.readFileSync(new URL('../docs/catalog/duo-cuiaba-batch-2026-09-rev2.json', import.meta.url), 'utf8'));
  const candidate = batch.candidates[0].proposedPayload;
  for (const size of [458, 1000, 5001]) {
    const initial = Array.from({ length: Math.min(size - 1, 1000) }, (_, i) => ({ slug: `initial-${i}` }));
    assert.equal(initial.find(row => row.slug === candidate.slug), undefined);
    let calls = 0;
    const conditions = [];
    const client = { from(table) { calls++; assert.equal(table, 'restaurants'); return {
      select(value) { assert.equal(value, '*'); return this; },
      eq(field, value) { conditions.push([field, value]); return this; },
      async maybeSingle() { return { data: candidate, error: null }; },
    }; } };
    const found = await loadPublishedRestaurant(client, candidate.slug);
    assert.equal(found, candidate);
    assert.equal(calls, 1);
    assert.deepEqual(conditions, [['slug', candidate.slug], ['status', 'published']]);
  }
});

test('profile read distinguishes inaccessible or missing rows from temporary errors', async () => {
  const { loadPublishedRestaurant } = load('lib/data/restaurant-profile');
  for (const error of [null, { message: 'network or duplicate identity' }]) {
    const client = { from() { return { select() { return this; }, eq() { return this; }, async maybeSingle() { return { data: null, error }; } }; } };
    if (error) await assert.rejects(loadPublishedRestaurant(client, 'missing'));
    else assert.equal(await loadPublishedRestaurant(client, 'missing'), null);
  }
});

test('profile route cache and fallback lifecycle: no duplicate read, loading, retry, not-found', async () => {
  const source = fs.readFileSync(new URL('../components/restaurant/restaurant-route-client.tsx', import.meta.url), 'utf8');
  const existing = { id: 'cached', slug: 'cached', status: 'published' };
  let context = { restaurants: [existing], currentUserId: null, isLoading: false, dataError: null, dataMode: 'supabase' };
  let slots = [], cursor = 0, effect, cleanup, calls = 0, resolveRead, rejectRead;
  const react = {
    useState(initial) { const index = cursor++; if (!(index in slots)) slots[index] = initial; return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }]; },
    useRef(initial) { const index = cursor++; if (!(index in slots)) slots[index] = { current: initial }; return slots[index]; },
    useEffect(callback) { effect = callback; },
  };
  const jsx = (type, props, key) => ({ type, props, key });
  const testModule = { exports: {} };
  const requireMock = name => {
    if (name === 'react') return react;
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (name === 'next/navigation') return { notFound() { throw new Error('NOT_FOUND'); } };
    if (name.endsWith('use-app-context')) return { useAppContext: () => context };
    if (name.endsWith('supabase/browser')) return { createSupabaseBrowserClient: () => ({}) };
    if (name.endsWith('supabase/mappers')) return { mapRestaurant: row => row };
    if (name.endsWith('data/restaurant-profile')) return { loadPublishedRestaurant() { calls++; return new Promise((resolve, reject) => { resolveRead = resolve; rejectRead = reject; }); } };
    if (name.endsWith('error-state')) return { ErrorState: 'ErrorState' };
    if (name.endsWith('loading-skeleton')) return { LoadingSkeleton: 'LoadingSkeleton' };
    if (name === './restaurant-profile') return { RestaurantProfile: 'RestaurantProfile' };
    throw Error(name);
  };
  new Function('exports', 'require', 'module', ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText)(testModule.exports, requireMock, testModule);
  const Route = testModule.exports.RestaurantRouteClient;
  assert.equal(Route({ slug: 'cached' }).props.restaurant, existing);
  assert.equal(calls, 0);
  const missing = Route({ slug: 'outside' });
  const render = () => { cursor = 0; return missing.type(missing.props); };
  assert.equal(render().type.name, 'ProfileLoading');
  cleanup = effect();
  cleanup(); // Strict Mode cleanup and effect replay must share the request.
  cleanup = effect();
  assert.equal(calls, 1);
  assert.equal(render().type.name, 'ProfileLoading');
  rejectRead(new Error('temporary'));
  await new Promise(resolve => setImmediate(resolve));
  const failure = render();
  assert.equal(failure.props.children.type, 'ErrorState');
  failure.props.children.props.onRetry();
  assert.equal(render().type.name, 'ProfileLoading');
  cleanup(); cleanup = effect();
  assert.equal(calls, 2);
  resolveRead({ slug: 'outside', name: 'Cuiabá fixture', status: 'published' });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(render().props.restaurant.slug, 'outside');
  assert.equal(calls, 2);
  cleanup();
  slots = []; render(); cleanup = effect(); resolveRead(null);
  await new Promise(resolve => setImmediate(resolve));
  assert.throws(render, /NOT_FOUND/);
  cleanup();
  slots = []; render(); cleanup = effect(); cleanup(); resolveRead(existing);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(render().type.name, 'ProfileLoading', 'unmounted request must not publish stale data');
  context = { ...context, currentUserId: 'another-viewer' };
  assert.notEqual(Route({ slug: 'outside' }).key, missing.key);
});
