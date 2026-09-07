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
test('catalog pagination covers more than one server page and fails closed',async()=>{const {loadVisibleCatalog}=load('lib/data/catalog-pagination');const ranges=[];const client={from(){return {select(){return this},order(){return this},async range(a,b){ranges.push([a,b]);return {data:Array.from({length:a<1000?500:23},(_,i)=>({id:a+i})),error:null}}}}};const r=await loadVisibleCatalog(client);assert.equal(r.data.length,1023);assert.deepEqual(ranges,[[0,499],[500,999],[1000,1499]]);client.from=()=>({select(){return this},order(){return this},async range(){return {data:null,error:{message:'failed'}}}});assert.equal((await loadVisibleCatalog(client)).data,null);});
