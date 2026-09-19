// Reproducible import from the official filmography; no remote data at runtime.
import { readFileSync, writeFileSync } from 'node:fs';
const translated = {
 nausicaa: ['Nausicaä del Valle del Viento','Hayao Miyazaki','Una joven explora el vínculo entre su pueblo y un bosque que parece amenazarlo.'],
 laputa: ['El castillo en el cielo','Hayao Miyazaki','Dos jóvenes siguen la pista de una isla flotante y de los secretos que guarda.'],
 hotarunohaka: ['La tumba de las luciérnagas','Isao Takahata','Dos hermanos intentan cuidarse en el Japón de la Segunda Guerra Mundial. Una historia sobre pérdida y supervivencia.'],
 totoro: ['Mi vecino Totoro','Hayao Miyazaki','Dos hermanas descubren vecinos extraordinarios entre los árboles de su nuevo hogar.'],
 majo: ['Nicky, la aprendiz de bruja','Hayao Miyazaki','Una joven bruja y su gato llegan a una ciudad junto al mar para encontrar su propio camino.'],
 omoide: ['Recuerdos del ayer','Isao Takahata','Un viaje al campo invita a Taeko a escuchar los recuerdos de su infancia y sus deseos de hoy.'],
 porco: ['Porco Rosso','Hayao Miyazaki','Un singular piloto sobrevuela el Adriático entre viejas amistades y aventuras aéreas.'],
 umi: ['Puedo escuchar el mar','Tomomi Mochizuki','La llegada de una estudiante cambia la amistad de dos chicos en una ciudad costera.'],
 tanuki: ['Pompoko','Isao Takahata','Un grupo de tanukis recurre a sus poderes de transformación para proteger el bosque donde vive.'],
 mimi: ['Susurros del corazón','Yoshifumi Kondō','Una lectora curiosa sigue pequeñas coincidencias que la acercan a la música y a sus propias historias.'],
 mononoke: ['La princesa Mononoke','Hayao Miyazaki','Un joven viajero se encuentra entre los habitantes de una ciudad del hierro y los guardianes del bosque.'],
 yamada: ['Mis vecinos los Yamada','Isao Takahata','Los pequeños enredos de una familia se convierten en viñetas llenas de humor y ternura.'],
 chihiro: ['El viaje de Chihiro','Hayao Miyazaki','Una niña entra en un mundo de espíritus donde deberá reunir valor y encontrar aliados.'],
 baron: ['Haru en el reino de los gatos','Hiroyuki Morita','Un gesto amable lleva a una estudiante hasta un extraño reino habitado por gatos.'],
 howl: ['El castillo ambulante','Hayao Miyazaki','Sophie se cruza con un mago y un castillo viajero en una aventura sobre los cambios y la confianza.'],
 ged: ['Cuentos de Terramar','Gorō Miyazaki','Un príncipe y un mago recorren un mundo cuyo delicado equilibrio comienza a romperse.'],
 ponyo: ['Ponyo en el acantilado','Hayao Miyazaki','Una pequeña criatura del mar desea vivir en tierra junto al niño que la ha ayudado.'],
 karigurashi: ['Arrietty y el mundo de los diminutos','Hiromasa Yonebayashi','Una diminuta joven vive bajo el suelo de una casa, hasta que un encuentro transforma su rutina.'],
 kokurikozaka: ['La colina de las amapolas','Gorō Miyazaki','Dos estudiantes unen esfuerzos para conservar un viejo edificio lleno de recuerdos.'],
 kazetachinu: ['El viento se levanta','Hayao Miyazaki','Un joven apasionado por los aviones persigue su vocación en tiempos de grandes cambios.'],
 kaguyahime: ['El cuento de la princesa Kaguya','Isao Takahata','Una niña encontrada en un tallo de bambú crece entre la sencillez del campo y las expectativas de otros.'],
 marnie: ['El recuerdo de Marnie','Hiromasa Yonebayashi','Una estancia junto al mar y una misteriosa amistad abren nuevas preguntas para Anna.'],
 'red-turtle': ['La tortuga roja','Michael Dudok de Wit','Un náufrago y una tortuga se encuentran en una isla donde el tiempo sigue el ritmo de la naturaleza.'],
 aya: ['Earwig y la bruja','Gorō Miyazaki','Una niña ingeniosa llega a una casa de magia y decide descubrir las reglas de su nuevo hogar.'],
 kimitachi: ['El chico y la garza','Hayao Miyazaki','Después de una pérdida, Mahito sigue a una garza hacia un mundo de encuentros inesperados.']
};
const html=readFileSync('data/works-source.html','utf8');
const chunks=html.split(/<h1 id="/).slice(1), movies=[];
for(const chunk of chunks){
 const id=chunk.split('"')[0]; if(!translated[id])continue;
 const [title,director,synopsis]=translated[id];
 const year=Number(chunk.match(/（(\d{4})）/)[1]);
 const duration=Number(chunk.match(/上映時間<\/dt>\s*<dd>約(\d+)分/)[1]);
 const international=chunk.match(/<p class="mb15">([\s\S]*?)<\/p>/)[1].replace(/<[^>]+>/g,'').trim();
 const posterSource=chunk.match(/<img itemprop="image" src="([^"]+)"/)[1];
 const credit=chunk.match(/<p class="mt3 small">([\s\S]*?)<\/p>/)[1].replace('&copy;','©').replace(/<[^>]+>/g,'').trim();
 movies.push({id,title,international,year,director,duration,synopsis,poster:`/assets/posters/${id}.jpg`,posterSource,credit,dataSource:`https://www.ghibli.jp/works/${id}/`,category:id==='nausicaa'?'Antecedente · Topcraft (1984)':id==='red-turtle'?'Coproducción':id==='umi'?'Largometraje de televisión':id==='aya'?'Estreno televisivo (2020)':'Largometraje',verifiedAt:'2026-09-19'});
}
if(movies.length!==25)throw new Error(`Expected 25 films, got ${movies.length}`);
writeFileSync('data/movies.json',JSON.stringify(movies.sort((a,b)=>a.year-b.year),null,2)+'\n');
console.log(`Verified ${movies.length} films using official years and approximate runtimes.`);
