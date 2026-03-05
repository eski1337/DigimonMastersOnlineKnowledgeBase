// Fix game systems with ONLY source-accurate wiki data
// Run: mongosh mongodb://localhost:27017/dmo-kb scripts/fix-systems-accurate.js

function h2(t){return{type:'h2',children:[{text:t}]};}
function h3(t){return{type:'h3',children:[{text:t}]};}
function h4(t){return{type:'h4',children:[{text:t}]};}
function p(){var a=Array.prototype.slice.call(arguments);return{children:a.map(function(x){return typeof x==='string'?{text:x}:x;})};}
function B(t){return{text:t,bold:true};}
function I(t){return{text:t,italic:true};}
function empty(){return{children:[{text:''}]};}
function ul(){var items=Array.prototype.slice.call(arguments);return{type:'ul',children:items.map(function(item){return{type:'li',children:[{children:typeof item==='string'?[{text:item}]:(Array.isArray(item)?item:[item])}]};})};}
function richText(c){return{blockType:'richText',content:c};}
function callout(type,c){return{blockType:'callout',type:type,content:c};}
function img(url,caption,size){return{blockType:'image',imageUrl:url,caption:caption||'',size:size||'large'};}
function imageGrid(title,cols,images){return{blockType:'imageGrid',title:title,columns:cols,images:images.map(function(i){return{imageUrl:i[0],caption:i[1]||''};})};}
function tbl(title,headers,rows){return{blockType:'table',title:title,headers:headers.map(function(h){return{label:h};}),rows:rows.map(function(cells){return{cells:cells.map(function(v){if(typeof v==='object'&&v.value!==undefined)return v;return{value:String(v)};})};})};} 
function cellIcon(value,iconUrl){return{value:value,iconUrl:iconUrl};}

var now=new Date();
var updated=0;

function updateSystem(slug,layout){
  var doc=db.systems.findOne({slug:slug});
  if(!doc){print('  MISSING: '+slug);return;}
  db.systems.updateOne({_id:doc._id},{$set:{layout:layout,updatedAt:now}});
  print('  + '+slug+' -> '+layout.length+' blocks');
  updated++;
}

// ═══════════════════════════════════════════════════════════════════
// DIGIMON ARENA — Source: Arena - Colosseum HTML (PvE challenge, NOT PvP)
// ═══════════════════════════════════════════════════════════════════
updateSystem('digimon-arena', [
  richText([
    h2('Digimon Arena'),
    p(B('The Colosseum Stadium is the perfect stage for a "Digimon Arena".'))
  ]),
  img('/guides/systems/arena/Colosseum_Entrance.png', 'The Colosseum Stadium entrance', 'large'),
  richText([
    p('The arena, also known as Colosseum Stadium, is located within the DATS Center, but the map itself is located in Western Village.'),
    empty(),
    p(B('Reward list'), {text:' — Digimon Arena Reward (NPC Mary)'}),
  ]),
  img('/guides/systems/arena/Colosseum_Map.png', 'Colosseum Stadium map overview', 'medium'),
  richText([
    h2('Guide to Digimon Arena'),
    ul(
      'Digimon level must be 110+ to participate in Normal mode and 140+ in Hard Mode.',
      'You receive Digimon Arena Admission Tickets after weekly maintenances.',
      'Digimon Arena Admission Tickets are stackable and are only deleted whenever you use them to enter the Digimon Arena.',
      'You can only enter by yourself in the Digimon Arena.',
      'Once you start, you can\'t change between Normal or Hard Mode.',
      'There are 10 levels in Normal Mode and 5 in Hard Mode.',
      'The opponents from each stage will gradually get stronger, as battle points per stage will increase.',
      'Once you enter the Digimon Arena, it is given 20 minutes for you to get through all the levels in Normal Mode and 15 minutes in Hard Mode.',
      'In Hard Mode, you get buffs and debuffs that strengthen every round.'
    ),
  ]),
  img('/guides/systems/arena/Arena_Admission.png', 'Digimon Arena Admission Ticket', 'small'),
  tbl('Digimon Arena (Hard) Buffs', ['Level','Buff'], [
    ['1','Attack +50%'],
    ['2','Skill Damage +100%'],
    ['3','Critical Damage +100%'],
    ['4','Defense +50%'],
    ['5','Max HP +50%'],
    ['Hidden','Max DS +50% Increase'],
  ]),
  tbl('Digimon Arena (Hard) Debuffs', ['Level','Movement Speed','Damage Output','Block','HP Decrease/5 Sec','Damage Taken Increase'], [
    ['1','-20%','-5%','-20%','250','5%'],
    ['2','-30%','-10%','-40%','500','10%'],
    ['3','-40%','-15%','-60%','1000','15%'],
    ['4','-50%','-20%','-80%','1500','20%'],
    ['5','-50%','-30%','-80%','2000','30%'],
    ['Hidden','-50%','-30%','-80%','2000','30%'],
  ]),
  richText([
    h3('Related NPCs'),
    ul(
      [B('Miki Kurosaki'), {text:' (in DATS): You can choose which Mode (Normal or Hard) you want to enter the Digimon Arena.'}],
      [B('Mary'), {text:' (in DATS): You can exchange your Arena Coin [Normal] or Arena Coin [Hard] to craft Items.'}]
    ),
  ]),
  richText([
    h2('Round Rewards'),
    h3('Arena Round Rewards (Normal)'),
  ]),
  tbl('Round Rewards (Normal)', ['Round','Earned','Total'], [
    ['1st Round','1','1'],
    ['2nd Round','1','2'],
    ['3rd Round','2','4'],
    ['4th Round','2','6'],
    ['5th Round','3','9'],
    ['6th Round','3','12'],
    ['7th Round','3','15'],
    ['8th Round','4','19'],
    ['9th Round','5','24'],
    ['10th Round','8','32'],
    ['Hidden Round*','4','36*'],
  ]),
  callout('info', [
    p('It is possible to get a Hidden Round after clearing the 10th Round.'),
  ]),
  richText([
    h3('Arena Round Rewards (Hard)'),
  ]),
  tbl('Round Rewards (Hard)', ['Round','Earned','Total'], [
    ['1st Round','2','2'],
    ['2nd Round','5','7'],
    ['3rd Round','8','15'],
    ['4th Round','9','24'],
    ['5th Round','10','34'],
    ['Hidden Round*','—**','34'],
  ]),
  callout('info', [
    p('It is possible to get a 6th Round after clearing the 5th Round — one tier higher round reward. When you defeat a normal monster in each round of Digimon Arena [Hard], you have a certain rate to obtain more Arena Coin [Hard]. When you defeat a hidden monster, you can obtain the reward of a round one tier higher than the current round. Example: If you defeat a hidden monster in Round 2, you will obtain the Round 3 reward.'),
  ]),
]);

// ═══════════════════════════════════════════════════════════════════
// DIGIMON ATTRIBUTE ARENA — Source: Attribute Arena HTML (KDMO exclusive, released Sep 20 2023)
// ═══════════════════════════════════════════════════════════════════
updateSystem('digimon-attribute-arena', [
  richText([
    h2('Digimon Attribute Arena'),
    p('The ', B('Digimon Attribute Arena'), {text:' was released in KDMO in the September 20, 2023 update.'}),
    empty(),
    p(B('Reward list'), {text:' — Digimon Attribute Arena Reward (NPC PawnChessmon White).'}),
    empty(),
    p(B('The Attribute Colosseum Stadium is the perfect stage for a "Digimon Attribute Arena".')),
  ]),
  img('/guides/systems/attribute-arena/Colosseum_Entrance.png', 'The Colosseum Stadium', 'large'),
  richText([
    p('The Attribute Arena, also known as Natural Attribute Arena, is located within the DATS Center at the right side of the Digimon Arena podium. The map itself is located in Western Village.'),
  ]),
  img('/guides/systems/attribute-arena/Colosseum_Map.png', 'Colosseum Stadium map overview', 'medium'),
  richText([
    h2('Guide to Digimon Attribute Arena'),
    ul(
      'You can enter Digimon Attribute Arena as many times as you want per day, until you register your points to the Board.',
      'Once you invest your points, you won\'t be able to enter the Attribute Arena for one day.',
      'Only the Party Leader is able to start or finish the battle in Digimon Attribute Arena.',
      'You obtain Battle Points for each stage of the Digimon Attribute Arena that you complete.',
      'Battle Points can be invested through the NPC Greymon inside Digimon Attribute Arena and you can receive rewards according to the number of points invested per week.',
      'There are 20 levels and all of the monsters you face are max leveled (140 at time of release).',
      'The monsters you face are random (if you die or leave and enter again, the digimon foes may be different), whether you enter Alone or as a Team.',
      'There is only one enemy Digimon for each stage.',
      'The opponents from each stage will gradually get stronger, as battle points per stage will increase.',
      'Each week the Attribute of the monsters will be changed and the points invested rewarded as Attribute Arena Coins.'
    ),
  ]),
  callout('warning', [
    p(B('ARENA BUFF: '), {text:'If you have Attribute advantage against the enemies, you give 50% more damage to them.'}),
    p(B('ARENA DEBUFF: '), {text:'If you have Attribute disadvantage against the enemies, you receive 50% more damage from them.'}),
    p({text:'You can check the Board for the next and this week\'s enemies attributes.'}),
  ]),
  richText([
    h3('Related NPCs'),
    ul(
      [B('Terriermon'), {text:' (in DATS): You can enter Digimon Attribute Arena.'}],
      [B('NPC Board'), {text:': You can check your invested points, weekly Ranking, the week and the upcoming week Attributes.'}],
      [B('PawnChessmon (White)'), {text:': You can claim your rewards using your Attribute Arena Coins with this NPC.'}],
      [B('NPC Greymon'), {text:' (inside Attribute Arena): You can begin, continue challenges, leave or invest your Digimon Attribute Arena Points.'}]
    ),
  ]),
  callout('warning', [
    p(B('IMPORTANT: '), {text:'You\'ll have two options for leaving the Digimon Attribute Arena:'}),
    p(B('Abandonment: '), {text:'Your points will be reset and won\'t be calculated — this way you can keep trying to defeat the bosses.'}),
    p(B('Settlement: '), {text:'You invest your gained points and won\'t be able to enter the Digimon Attribute Arena for the day.'}),
  ]),
  img('/guides/systems/attribute-arena/Attribute_Arena_Coin.png', 'Attribute Arena Coin', 'small'),
  richText([
    h2('Ranking System'),
    p('When you invest the Battle Points, you can obtain daily rewards and you will be registered in the ', I('Weekly Ranking'), {text:' system.'}),
    empty(),
    p('The rank will be refreshed periodically (approximately each 48 minutes) and you can check rank, guild, tamer name, changes and current rank reward.'),
    empty(),
    p('When there are tamers with the same amount of Battle Points, the first one to invest the Points will be in the lead of the rank.'),
    empty(),
    h3('Weekly Ranking'),
    p('You will receive Attribute Arena Coins depending on your rank of Weekly Ranking. Weekly Ranking expires every Wednesday from 5 AM to 7 AM (GMT +9), and will be refreshed during this time for the next attribute.'),
  ]),
  tbl('Weekly Arena Voucher List', ['Reward','Weekly Ranking'], [
    ['Attribute Arena Coin x100','1st Rank'],
    ['Attribute Arena Coin x90','2nd Rank'],
    ['Attribute Arena Coin x85','3rd Rank'],
    ['Attribute Arena Coin x80','4th ~ 5th Rank'],
    ['Attribute Arena Coin x75','6th ~ 10th Rank'],
    ['Attribute Arena Coin x50','11th ~ 10% Rank'],
    ['Attribute Arena Coin x40','10% ~ 20% Rank'],
    ['Attribute Arena Coin x30','20% ~ 30% Rank'],
    ['Attribute Arena Coin x15','30% ~ 40% Rank'],
    ['Attribute Arena Coin x10','40% ~ 50% Rank'],
    ['Attribute Arena Coin x7','50% ~ 60% Rank'],
    ['Attribute Arena Coin x5','60% ~ 70% Rank'],
    ['Attribute Arena Coin x3','70% ~ 80% Rank'],
    ['Attribute Arena Coin x2','80% ~ 90% Rank'],
    ['Attribute Arena Coin x1','90% ~ 100% Rank'],
  ]),
  richText([
    h2('Round Rewards'),
    h3('Attribute Arena Round Rewards'),
  ]),
  tbl('Attribute Arena Round Rewards', ['Round','Earned','Total'], [
    ['1st Round','+1','1'],
    ['2nd Round','+2','3'],
    ['3rd Round','+3','6'],
    ['4th Round','+4','10'],
    ['5th Round','+5','15'],
    ['6th Round','+6','21'],
    ['7th Round','+7','28'],
    ['8th Round','+8','36'],
    ['9th Round','+9','45'],
    ['10th Round','+11','56'],
    ['11th Round','+13','69'],
    ['12th Round','+16','85'],
    ['13th Round','+20','105'],
    ['14th Round','+24','129'],
    ['15th Round','+28','157'],
    ['16th Round','+34','191'],
    ['17th Round','+39','230'],
    ['18th Round','+46','276'],
    ['19th Round','+52','328'],
    ['20th Round','+60','388'],
  ]),
  callout('info', [
    p('Starting and ending of each Ranking can be changed regarding to the service conditions.'),
  ]),
]);

// ═══════════════════════════════════════════════════════════════════
// DECK SYSTEM — Source: Encyclopedia & Deckbuffs HTML
// ═══════════════════════════════════════════════════════════════════
updateSystem('deck-system', [
  richText([
    h2('Deck System / Digimon Encyclopedia'),
    p('When you click the DATA button in the menu, you get access to the Deck System / Digimon Encyclopedia.'),
    empty(),
    p('If you unlock a Digimon evolution line, the Digimon line icon will be activated (shown by a Green Box). If you didn\'t unlock a Digimon evolution line, the icon will be deactivated (shown by a Red Box).'),
    empty(),
    h3('Achievement Information'),
    p('According to the scale of Digimon and Clone Level, you can get some "Stars":'),
    ul(
      'The Stars\' color will be changed according to your Digimon\'s Size (%)',
      'The Stars\' number will be changed according to your Digimon\'s Clone Level'
    ),
    empty(),
    h3('Statistics Information'),
    p('You can check the statistics of your owned Digimon:'),
    ul(
      'Digimon owned',
      'Achievement rate',
      'Average Level',
      'Total Level',
      'Average Scale',
      'Number of stars'
    ),
    empty(),
    h3('Rewards Information'),
    p('If you get all the evolution line, the Digimon name will be activated. If you click the Digimon name, you can receive some rewards randomly.'),
  ]),
  callout('warning', [
    p('You can get rewards only once per Digimon (even if you delete the Digimon and hatch it again, you cannot get the encyclopedia rewards).'),
  ]),
  richText([
    h3('Make Certain Decks'),
    p('As you unlock specific Digimon, different Deck Buffs will be available to you.'),
  ]),
  callout('info', [
    p(B('Note: '), {text:'You can only have one Deck Buff active at one time! The deck buffs that directly influence your stats number will be incorporated into your base stats. This means that every other buff will be stacked on top of the deck buff. (For instance, using a +15% HP deck buff on a Digimon with 10,000 base HP will raise the HP value to 11,500. If you activate a 50% HP buff item on top of this, you will gain 5,750 HP instead of 5,000.)'}),
  ]),
  richText([
    h2('List of All Deck Buffs'),
  ]),
  tbl('Deck Buffs', ['Deck Name','Activation Condition','Activation Effect','Duration'], [
    ['Four Holy Beasts','Always Active','Critical Damage +30% (25% in KDMO)','Permanent'],
    ['Fusion to evolve into the higher','9% Chance per Normal Hit','Reset skill\'s cooldown time','Instantly Activated'],
    ['Three Archangels','3% Chance per Normal Hit','15% Additional Normal Damage','5 Seconds'],
    ['Main characters of the adventure','Always Active','Attack Speed 8% Increase','Permanent'],
    ['Burst Ultimate Wings','Always Active','Attack Speed 15% Increase','Permanent'],
    ['Burst Ultimate Wings II','15% Chance when a Skill is Used / Always Active','15% Additional Normal Damage / Attack Speed 15% Increase','10 Sec / Permanent'],
    ['Sharp Blue Sword Wave','6% Chance per Normal Hit','10% Additional Normal Damage','10 Seconds'],
    ['Instant Red Gun Fire','7% Chance when a Skill is Used','Skill Damage +8%','12 Seconds'],
    ['So cute','Always Active','Critical Damage +15%','Permanent'],
    ['Four Dark Masters','5% Chance when a Skill is Used','Skill Damage +12%','10 Seconds'],
    ['Ego of the Darkness','70% per Normal Hit / Always Active','12% Additional Normal Damage / HP +15%','5 Sec / Permanent'],
    ['Hyper Spirit Evolution','50% per Normal Hit / Always Active / Always Active','15% Additional Normal Damage / HP +10% / Critical Damage +2%','5 Sec / Permanent / Permanent'],
    ['Ancient Spirit Evolution','40% per Normal Hit / Always Active / Always Active','25% Additional Normal Damage / HP +15% / Critical Damage +5%','5 Sec / Permanent / Permanent'],
    ['Legendary Knights of Vaccine','Always Active / Always Active / 30% per Normal Hit','Attack Speed 15% / HP +15% / 20% Additional Normal Damage','Permanent / Permanent / 7 Sec'],
    ['OMEGA','Always Active','Skill Damage +12%','Permanent'],
    ['MEGA-OMEGA','Always Active / Always / 3% per Normal Hit','Skill Damage +15% / Attack Speed 15% / Critical Damage +100%','Permanent / Permanent / 10 Sec'],
    ['Royal Knights X','Always Active / Always Active / 5% per Normal Hit','HP +20% / Attack Speed 17% / Critical Damage +100%','Permanent / Permanent / 10 Sec'],
  ]),
  callout('tip', [
    p('Note: The cooldown reset from "Fusion to evolve into the higher" does not work on skills that have a cooldown of 30 seconds or higher (March 21st 2023 Update).'),
  ]),
]);

print('\nTotal updated: ' + updated + ' systems');
