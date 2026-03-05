// Fix Deck System — remove wiki screenshots, keep only source-accurate text/tables
// Run: mongosh mongodb://localhost:27017/dmo-kb scripts/fix-deck-no-screenshots.js

function h2(t){return{type:'h2',children:[{text:t}]};}
function h3(t){return{type:'h3',children:[{text:t}]};}
function p(){var a=Array.prototype.slice.call(arguments);return{children:a.map(function(x){return typeof x==='string'?{text:x}:x;})};}
function B(t){return{text:t,bold:true};}
function I(t){return{text:t,italic:true};}
function empty(){return{children:[{text:''}]};}
function ul(){var items=Array.prototype.slice.call(arguments);return{type:'ul',children:items.map(function(item){return{type:'li',children:[{children:typeof item==='string'?[{text:item}]:(Array.isArray(item)?item:[item])}]};})};}
function richText(c){return{blockType:'richText',content:c};}
function callout(type,c){return{blockType:'callout',type:type,content:c};}
function tbl(title,headers,rows){return{blockType:'table',title:title,headers:headers.map(function(h){return{label:h};}),rows:rows.map(function(cells){return{cells:cells.map(function(v){return{value:String(v)};})};})};} 

var now=new Date();

var layout = [
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
  ]),
  tbl('Star Color Chart', ['Color', 'Scale'], [
    ['White', '111-115%'],
    ['Yellow', '116-120%'],
    ['Brown', '121-125%'],
    ['Blue', '126-128%'],
    ['Red', '129-130%'],
  ]),
  tbl('Star Count Chart', ['Count', 'Scale'], [
    ['\u2605', 'More than 2 kind of stat are reached 3 times enchanting'],
    ['\u2605\u2605', 'More than 2 kind of stat are reached 4~6 times enchanting'],
    ['\u2605\u2605\u2605', 'More than 2 kind of stat are reached 7~9 times enchanting'],
    ['\u2605\u2605\u2605\u2605', 'More than 2 kind of stat are reached 10~11 times enchanting'],
    ['\u2605\u2605\u2605\u2605\u2605', 'More than 2 kind of stat are reached 12 times enchanting'],
  ]),
  richText([
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
    ['Burst Ultimate Wings II','15% Chance when Skill Used / Always Active','15% Additional Normal Damage / Attack Speed 15%','10 Sec / Permanent'],
    ['Sharp Blue Sword Wave','6% Chance per Normal Hit','10% Additional Normal Damage','10 Seconds'],
    ['Instant Red Gun Fire','7% Chance when Skill Used','Skill Damage +8%','12 Seconds'],
    ['So cute','Always Active','Critical Damage +15%','Permanent'],
    ['Four Dark Masters','5% Chance when Skill Used','Skill Damage +12%','10 Seconds'],
    ['Ego of the Darkness','70% per Normal Hit / Always Active','12% Additional Normal Damage / HP +15%','5 Sec / Permanent'],
    ['Trick Or Treat!! (KDMO)','Always Active','HP +15%','Permanent'],
    ['Hyper Spirit Evolution','50% per Normal Hit / Always Active / Always Active','15% Additional Normal Damage / HP +10% / Critical Damage +2%','5 Sec / Permanent / Permanent'],
    ['Ancient Spirit Evolution','40% per Normal Hit / Always Active / Always Active','25% Additional Normal Damage / HP +15% / Critical Damage +5%','5 Sec / Permanent / Permanent'],
    ['Seafood Stew','Always Active','HP +10%','Permanent'],
    ['Legendary Knights of Vaccine','Always Active / Always Active / 30% per Normal Hit','Attack Speed 15% / HP +15% / 20% Additional Normal Damage','Permanent / Permanent / 7 Sec'],
    ['OMEGA','Always Active','Skill Damage +12%','Permanent'],
    ['MEGA-OMEGA','Always Active / Always / 3% per Normal Hit','Skill Damage +15% / Attack Speed 15% / Critical Damage +100%','Permanent / Permanent / 10 Sec'],
    ['Royal Knights X','Always Active / Always Active / 5% per Normal Hit','HP +20% / Attack Speed 17% / Critical Damage +100%','Permanent / Permanent / 10 Sec'],
  ]),
  callout('tip', [
    p('The cooldown reset from "Fusion to evolve into the higher" does not work on skills that have a cooldown of 30 seconds or higher (March 21st 2023 Update).'),
  ]),
];

var doc = db.systems.findOne({slug: 'deck-system'});
if (doc) {
  db.systems.updateOne({_id: doc._id}, {$set: {layout: layout, updatedAt: now}});
  print('+ deck-system updated with ' + layout.length + ' blocks (no screenshots)');
} else {
  print('x deck-system not found');
}
