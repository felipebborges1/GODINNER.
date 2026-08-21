import type { Follow, Restaurant, RestaurantList, Review, User } from "@/types";
import { mockRestaurantCoordinates } from "@/lib/distance";

const photo = (id: string, query: string) => ({ id, url: `https://images.unsplash.com/${query}?auto=format&fit=crop&w=1200&q=85`, alt: "Imagem ilustrativa para o protótipo GODINNER" });

const userRows: Array<[string, string, string, string | null, string, string, number, number]> = [
  ["u1","bia.fonseca","Bia Fonseca",null,"Café, vinho natural e mesas na calçada.","Vila da Serra",438,216],
  ["u2","caio.mattos","Caio Mattos",null,"Sempre em busca do próximo balcão.","Belvedere",281,174],
  ["u3","luma.freire","Luma Freire",null,"Amo almoço demorado e sobremesa dividida.","Vale do Sereno",692,301],
  ["u4","duda.costa","Duda Costa",null,"BH pelo prato e pelo copo.","Savassi",359,203],
  ["u5","nando.torres","Nando Torres",null,"Pizza, futebol e bons negronis.","Nova Lima",189,118],
  ["u6","clara.lima","Clara Lima",null,"Meu roteiro muda conforme o pão de queijo.","Funcionários",524,268],
  ["u7","leo.sena","Léo Sena",null,"Cozinha mineira, cafés e lugares tranquilos.","Serra",247,126],
  ["u8","marina.rosa","Marina Rosa",null,"Pequenos lugares, grandes histórias.","Lourdes",316,221],
];
export const CURRENT_USER_ID = "u1";
export const users: User[] = userRows.map(([id, username, name, avatar, bio, neighborhood, followers, following]) => ({ id, username, name, avatar, bio, neighborhood, followers, following, role: id === CURRENT_USER_ID ? "admin" : "user" }));

const restaurantRows: Array<[string,string,string,string,string,"Belo Horizonte"|"Nova Lima",number,number,number,string]> = [
  ["r1","cozinha-do-sereno","Cozinha do Sereno","Contemporânea","$$$","Nova Lima",8.8,9.1,124,"photo-1515003197210-e0cd71810b5f"],
  ["r2","forno-da-alameda","Forno da Alameda","Italiana","$$","Nova Lima",8.6,8.9,98,"photo-1579751626657-72bc17010498"],
  ["r3","bar-da-mata","Bar da Mata","Brasileira","$$","Belo Horizonte",8.4,8.7,231,"photo-1515003197210-e0cd71810b5f"],
  ["r4","nori-vila","Nori Vila","Japonesa","$$$","Nova Lima",8.9,9.3,162,"photo-1579584425555-c3ce17fd4351"],
  ["r5","cafe-janela","Café Janela","Café","$","Belo Horizonte",8.2,8.8,76,"photo-1501339847302-ac426a4a7cbb"],
  ["r6","brasa-vale","Brasa Vale","Carnes","$$$$","Nova Lima",9.0,9.2,185,"photo-1544025162-d76694265947"],
  ["r7","casa-nuvem","Casa Nuvem","Contemporânea","$$$","Belo Horizonte",8.7,9.0,113,"photo-1414235077428-338989a2e8c0"],
  ["r8","pao-e-prosa","Pão & Prosa","Padaria","$","Belo Horizonte",8.3,8.6,145,"photo-1509440159596-0249088772ff"],
  ["r9","quintal-belvedere","Quintal Belvedere","Brasileira","$$$","Belo Horizonte",8.5,8.9,104,"photo-1559339352-11d035aa65de"],
  ["r10","taqueria-oliva","Taqueria Oliva","Mexicana","$$","Belo Horizonte",8.1,8.5,88,"photo-1551504734-5ee1c4a1479b"],
  ["r11","mare-alta","Maré Alta","Frutos do mar","$$$$","Nova Lima",8.8,9.0,97,"photo-1547592180-85f173990554"],
  ["r12","pasta-fresca","Pasta Fresca","Italiana","$$$","Belo Horizonte",8.6,8.8,127,"photo-1551183053-bf91a1d81141"],
  ["r13","oriente-rua","Oriente Rua","Asiática","$$","Belo Horizonte",8.4,8.7,113,"photo-1547592180-85f173990554"],
  ["r14","vinho-e-pao","Vinho & Pão","Wine bar","$$$","Nova Lima",8.9,9.4,69,"photo-1473973916745-60839aebf06e"],
  ["r15","acompanha","Acompanha","Mineira","$$","Belo Horizonte",8.5,8.8,202,"photo-1601050690597-df0568f70950"],
  ["r16","katsu-casa","Katsu Casa","Japonesa","$$$","Belo Horizonte",8.7,9.1,81,"photo-1579871494447-9811cf80d66c"],
  ["r17","mini-mercado","Mini Mercado","Café","$$","Nova Lima",8.0,8.4,56,"photo-1495474472287-4d71bcdd2085"],
  ["r18","miso-bar","Miso Bar","Asiática","$$$","Belo Horizonte",8.6,8.9,72,"photo-1515003197210-e0cd71810b5f"],
  ["r19","sol-da-serra","Sol da Serra","Brasileira","$$","Nova Lima",8.3,8.7,91,"photo-1515003197210-e0cd71810b5f"],
  ["r20","torta-de-vo","Torta de Vó","Confeitaria","$","Belo Horizonte",8.1,8.6,63,"photo-1551024506-0bccd828d307"],
];
export const restaurants: Restaurant[] = restaurantRows.map(([id,slug,name,cuisine,priceRange,city,godinnerRating,friendsRating,reviewCount,image],i) => { const coverPhoto = photo(`${id}-cover`, image); const tags = ["r2", "r4", "r7", "r11", "r12", "r14", "r16", "r18"].includes(id) ? ["date"] : []; const category = ["r3", "r14", "r18"].includes(id) ? "bar" : "restaurant"; if (category === "bar") tags.push("bar"); if (i >= 15) tags.push("new"); return {id,slug,name,cuisine:[cuisine],tags,category,chef:["Ana","Rafa","Luiz","Maya"][i%4],occasions:[tags.includes("date")?"date":"friends",i%3===0?"family":"business"],isOpenNow:i%4!==0,distanceKm:Number((0.5+i*.28).toFixed(1)),coordinates:mockRestaurantCoordinates(i, city),priceRange:priceRange as Restaurant["priceRange"],neighborhood:i%3===0?"Vila da Serra":i%3===1?"Belvedere":"Vale do Sereno",city,address:`Endereço ilustrativo, ${i+10}`,godinnerRating,friendsRating,reviewCount,coverPhoto,photos:[coverPhoto]}; });

const galleryImages = ["photo-1414235077428-338989a2e8c0", "photo-1547592180-85f173990554", "photo-1551183053-bf91a1d81141", "photo-1473973916745-60839aebf06e"];
restaurants.forEach((restaurant) => {
  restaurant.photos = [restaurant.coverPhoto, ...galleryImages.map((image, index) => photo(`${restaurant.id}-gallery-${index}`, image))];
});

const comments = ["Volto pelo ambiente e pelo atendimento gentil.","Mesa bonita, comida precisa e clima ótimo para ir sem pressa.","Um dos meus favoritos na região. Vale dividir as entradas.","Gostei muito da carta e da energia do salão.","Experiência gostosa e sem firulas — quero repetir logo."];
export const reviews: Review[] = Array.from({ length: 30 }, (_, i) => ({ id:`rev-${i+1}`, userId:users[i%users.length].id, restaurantId:restaurants[i%restaurants.length].id, rating:Number((8 + (i%20)/10).toFixed(1)), comment:comments[i%comments.length], photos:i%3===0?[restaurants[i%restaurants.length].coverPhoto]:[], amountPerPerson:55+(i%8)*25, visitDate:`2026-0${(i%6)+2}-${String((i%24)+1).padStart(2,"0")}`, createdAt:`2026-08-${String((i%10)+1).padStart(2,"0")}` }));

const restaurantListRows: Array<[string, string, string, string, boolean, string, NonNullable<RestaurantList["type"]>]> = [
  ["l1","u1","Quero conhecer","Para a próxima saída.",true,"r1","want"],["l2","u1","Já fui","Memórias boas pela cidade.",true,"r3","visited"],["l3","u1","Favoritos","Lugares que sempre indico.",true,"r4","favorites"],["l4","u3","Date night","Luz baixa e bons drinks.",true,"r14","custom"],["l5","u4","Almoços de sexta","Para esticar a conversa.",true,"r7","custom"],["l6","u6","Cafés para trabalhar","Wi-fi e café de verdade.",false,"r5","custom"]
];
export const restaurantLists: RestaurantList[] = restaurantListRows.map(([id, ownerId, name, description, isPublic, coverId, type], i) => ({ id, ownerId, name, description, isPublic, coverPhoto: restaurants.find((restaurant) => restaurant.id === coverId)!.coverPhoto.url, restaurantIds: restaurants.slice(i * 3, i * 3 + 4).map((restaurant) => restaurant.id), type }));

restaurantLists.push(
  { id: "l7", ownerId: CURRENT_USER_ID, name: "🍷 Date em BH", description: "Para uma noite especial.", isPublic: true, coverPhoto: restaurants[1].coverPhoto.url, restaurantIds: ["r2", "r14"], type: "custom" },
  { id: "l8", ownerId: CURRENT_USER_ID, name: "🍣 Japoneses", description: "Sushi e balcões favoritos.", isPublic: true, coverPhoto: restaurants[3].coverPhoto.url, restaurantIds: ["r4", "r16"], type: "custom" },
  { id: "l9", ownerId: CURRENT_USER_ID, name: "🥩 Carnes", description: "Para matar a vontade.", isPublic: false, coverPhoto: restaurants[5].coverPhoto.url, restaurantIds: ["r6"], type: "custom" },
);

export const follows: Follow[] = users.slice(1,5).map((user,i) => ({followerId:CURRENT_USER_ID,followingId:user.id,createdAt:`2026-0${i+1}-12`}));
export const mockData = { users, restaurants, reviews, restaurantLists, follows };
