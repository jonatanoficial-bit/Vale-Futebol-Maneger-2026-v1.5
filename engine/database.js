/* =======================================================
   VALE FUTEBOL MANAGER 2026
   engine/database.js – Times, jogadores e competições
   =======================================================*/

// -------------------------------------------------------
// TIMES – Série A e Série B
// -------------------------------------------------------

const teams = [
  // Série A
  { id: "FLA", name: "Flamengo",        shortName: "Flamengo",    division: "A" },
  { id: "PAL", name: "Palmeiras",       shortName: "Palmeiras",   division: "A" },
  { id: "BOT", name: "Botafogo",        shortName: "Botafogo",    division: "A" },
  { id: "INT", name: "Internacional",   shortName: "Inter",       division: "A" },
  { id: "AMG", name: "Atlético-MG",     shortName: "Atl-MG",      division: "A" },
  { id: "COR", name: "Corinthians",     shortName: "Corinthians", division: "A" },
  { id: "SAO", name: "São Paulo",       shortName: "São Paulo",   division: "A" },
  { id: "FLU", name: "Fluminense",      shortName: "Fluminense",  division: "A" },
  { id: "GRE", name: "Grêmio",          shortName: "Grêmio",      division: "A" },
  { id: "SAN", name: "Santos",          shortName: "Santos",      division: "A" },
  { id: "CRU", name: "Cruzeiro",        shortName: "Cruzeiro",    division: "A" },
  { id: "VAS", name: "Vasco",           shortName: "Vasco",       division: "A" },
  { id: "BAH", name: "Bahia",           shortName: "Bahia",       division: "A" },
  { id: "FOR", name: "Fortaleza",       shortName: "Fortaleza",   division: "A" },
  { id: "RBB", name: "RB Bragantino",   shortName: "Bragantino",  division: "A" },
  { id: "CEA", name: "Ceará",           shortName: "Ceará",       division: "A" },
  { id: "SPT", name: "Sport",           shortName: "Sport",       division: "A" },
  { id: "JUV", name: "Juventude",       shortName: "Juventude",   division: "A" },
  { id: "VIT", name: "Vitória",         shortName: "Vitória",     division: "A" },
  { id: "MIR", name: "Mirassol",        shortName: "Mirassol",    division: "A" },

  // Série B
  { id: "CFC", name: "Coritiba",        shortName: "Coritiba",    division: "B" },
  { id: "CAP", name: "Athletico-PR",    shortName: "Athletico-PR",division: "B" },
  { id: "CHA", name: "Chapecoense",     shortName: "Chapecoense", division: "B" },
  { id: "REM", name: "Remo",            shortName: "Remo",        division: "B" },
  { id: "GOI", name: "Goiás",           shortName: "Goiás",       division: "B" },
  { id: "NOV", name: "Novorizontino",   shortName: "Novorizontino",division: "B" },
  { id: "CRB", name: "CRB",             shortName: "CRB",         division: "B" },
  { id: "AVA", name: "Avaí",            shortName: "Avaí",        division: "B" },
  { id: "CUI", name: "Cuiabá",          shortName: "Cuiabá",      division: "B" },
  { id: "ACG", name: "Atlético-GO",     shortName: "Atlético-GO", division: "B" },
  { id: "OPE", name: "Operário",        shortName: "Operário",    division: "B" },
  { id: "VNO", name: "Vila Nova",       shortName: "Vila Nova",   division: "B" },
  { id: "AME", name: "América-MG",      shortName: "América-MG",  division: "B" },
  { id: "ATC", name: "Athletic",        shortName: "Athletic",    division: "B" },
  { id: "BFS", name: "Botafogo-SP",     shortName: "Botafogo-SP", division: "B" },
  { id: "FER", name: "Ferroviária",     shortName: "Ferroviária", division: "B" },
  { id: "AMZ", name: "Amazonas",        shortName: "Amazonas",    division: "B" },
  { id: "VRD", name: "Volta Redonda",   shortName: "Volta Redonda",division: "B" },
  { id: "PAY", name: "Paysandu",        shortName: "Paysandu",    division: "B" },
  { id: "TOM", name: "Tombense",        shortName: "Tombense",    division: "B" }
];

// -------------------------------------------------------
// Função auxiliar para criar jogadores
// -------------------------------------------------------

function makePlayer(
  id,
  teamId,
  name,
  position,
  overall,
  value,
  age = 27,
  morale = 75,
  face = null
) {
  return {
    id,
    teamId,
    name,
    position,   // "GOL", "ZAG", "LD", "LE", "VOL", "MEI", "ATA"
    overall,    // 0–99
    age,
    morale,
    value,      // em "milhões"
    face        // ex: "assets/faces/FLA_PEDRO.png"
  };
}

// -------------------------------------------------------
// JOGADORES – aqui vamos colar todos os makePlayer(...)
// -------------------------------------------------------

const players = [
   // =====================
// FLAMENGO – SÉRIE A 2025
// =====================
makePlayer("FLA_ROSSI","FLA","Agustín Rossi","GOL",83,22),
makePlayer("FLA_MATHEUS_CUNHA","FLA","Matheus Cunha","GOL",76,5),

makePlayer("FLA_VARELA","FLA","Guillermo Varela","LD",79,6),
makePlayer("FLA_WESLEY","FLA","Wesley","LD",75,4),
makePlayer("FLA_LEO_PEREIRA","FLA","Léo Pereira","ZAG",82,15),
makePlayer("FLA_FABRICIO_BRUNO","FLA","Fabrício Bruno","ZAG",84,22),
makePlayer("FLA_DAVID_LUIZ","FLA","David Luiz","ZAG",76,1.5),
makePlayer("FLA_Ayrton","FLA","Ayrton Lucas","LE",82,18),

makePlayer("FLA_THIAGO_MAIA","FLA","Thiago Maia","VOL",78,7),
makePlayer("FLA_PULGAR","FLA","Erick Pulgar","VOL",80,10),
makePlayer("FLA_GERSON","FLA","Gerson","MEI",85,32),
makePlayer("FLA_ARRASCA","FLA","Giorgian de Arrascaeta","MEI",87,38),
makePlayer("FLA_EV_CEB","FLA","Everton Cebolinha","ATA",83,24),
makePlayer("FLA_MATHEUS_FRANCA","FLA","Matheus França","MEI",76,10),

makePlayer("FLA_GABIGOL","FLA","Gabigol","ATA",84,30),
makePlayer("FLA_PEDRO","FLA","Pedro","ATA",86,45),
makePlayer("FLA_BRUNO_HEN","FLA","Bruno Henrique","ATA",82,10),
makePlayer("FLA_CARLINHOS","FLA","Carlinhos","ATA",74,2),
makePlayer("FLA_LORRAN","FLA","Lorran","MEI",74,6),
makePlayer("FLA_IGOR_JESUS","FLA","Igor Jesus","VOL",74,3),
makePlayer("FLA_ALLAN","FLA","Allan","VOL",80,12),

// =====================
// INTERNACIONAL – SÉRIE A 2025
// =====================
makePlayer("INT_ROCHET","INT","Sergio Rochet","GOL",82,18),
makePlayer("INT_KEILLER","INT","Keiller","GOL",75,4),

makePlayer("INT_BUSTOS","INT","Fabricio Bustos","LD",79,12),
makePlayer("INT_RENE","INT","René","LE",78,6),
makePlayer("INT_VITAO","INT","Vitão","ZAG",81,10),
makePlayer("INT_ROBERT_RENAN","INT","Robert Renan","ZAG",82,15),
makePlayer("INT_MERCADO","INT","Gabriel Mercado","ZAG",77,2),

makePlayer("INT_ARANGUIZ","INT","Charles Aránguiz","VOL",82,3),
makePlayer("INT_BRUNO_HEN","INT","Bruno Henrique","VOL",78,4),
makePlayer("INT_MAURICIO","INT","Maurício","MEI",81,12),
makePlayer("INT_ALAN_PATRICK","INT","Alan Patrick","MEI",83,18),
makePlayer("INT_THIAGO_MAIA","INT","Thiago Maia","VOL",79,9),

makePlayer("INT_WANDERSON","INT","Wanderson","ATA",80,9),
makePlayer("INT_PEDRO_HEN","INT","Pedro Henrique","ATA",78,5),
makePlayer("INT_LUCCA","INT","Lucca","ATA",75,2),
makePlayer("INT_ENNER","INT","Enner Valencia","ATA",84,22),
makePlayer("INT_BRUNO_RODRIGUES","INT","Bruno Rodrigues","ATA",78,6),
makePlayer("INT_GABRIEL","INT","Gabriel","VOL",77,2),
makePlayer("INT_LUIZ_ADRIANO","INT","Luiz Adriano","ATA",75,1.8),
// =====================
// PALMEIRAS – SÉRIE A 2025
// =====================
makePlayer("PAL_WEVERTON","PAL","Weverton","GOL",85,25),
makePlayer("PAL_MARCELO_LOMBA","PAL","Marcelo Lomba","GOL",74,1),

makePlayer("PAL_MAYKE","PAL","Mayke","LD",80,7),
makePlayer("PAL_MARCO_ROCHA","PAL","Marcos Rocha","LD",77,2),
makePlayer("PAL_MURILO","PAL","Murilo","ZAG",81,12),
makePlayer("PAL_GOMEZ","PAL","Gustavo Gómez","ZAG",85,22),
makePlayer("PAL_VANDERLAN","PAL","Vanderlan","LE",76,3),
makePlayer("PAL_PIQUEREZ","PAL","Piquerez","LE",83,18),

makePlayer("PAL_ZE_RAF","PAL","Zé Rafael","VOL",83,10),
makePlayer("PAL_RIOS","PAL","Richard Ríos","VOL",81,8),
makePlayer("PAL_GAB_MENINO","PAL","Gabriel Menino","MEI",78,7),
makePlayer("PAL_ANIBAL","PAL","Aníbal Moreno","VOL",82,14),
makePlayer("PAL_VEIGA","PAL","Raphael Veiga","MEI",85,28),

makePlayer("PAL_ENDRICK","PAL","Endrick","ATA",86,45),
makePlayer("PAL_RONY","PAL","Rony","ATA",81,12),
makePlayer("PAL_DUDU","PAL","Dudu","ATA",84,20),
makePlayer("PAL_FLACO","PAL","Flaco López","ATA",80,9),
makePlayer("PAL_LAZARO","PAL","Lázaro","ATA",76,6),
makePlayer("PAL_LUIZ_GUILH","PAL","Luis Guilherme","MEI",75,7),
// =====================
// CORINTHIANS – SÉRIE A 2025
// =====================
makePlayer("COR_CASSIO","COR","Cássio","GOL",82,3),
makePlayer("COR_CARLOS_MIGUEL","COR","Carlos Miguel","GOL",80,12),

makePlayer("COR_FAGNER","COR","Fagner","LD",78,2),
makePlayer("COR_FELIPE_AUGUSTO","COR","Felipe Augusto","LD",72,1),
makePlayer("COR_GIL","COR","Gil","ZAG",76,1),
makePlayer("COR_CAETANO","COR","Caetano","ZAG",74,3),
makePlayer("COR_MURILLO","COR","Murillo","ZAG",78,10),

makePlayer("COR_FAUSTO_VERA","COR","Fausto Vera","VOL",80,9),
makePlayer("COR_MAYCON","COR","Maycon","VOL",79,8),
makePlayer("COR_BIDON","COR","Breno Bidon","VOL",74,1),
makePlayer("COR_RENATO","COR","Renato Augusto","MEI",83,3),
makePlayer("COR_ROJAS","COR","Matías Rojas","MEI",81,8),

makePlayer("COR_ROMERO","COR","Ángel Romero","ATA",79,4),
makePlayer("COR_ADSON","COR","Adson","ATA",76,5),
makePlayer("COR_WESLEY","COR","Wesley","ATA",75,6),
makePlayer("COR_YURI","COR","Yuri Alberto","ATA",82,16),
makePlayer("COR_PEDRO","COR","Pedro","ATA",73,2),
makePlayer("COR_GIOVANE","COR","Giovane","ATA",72,1.5),
// =====================
// SÃO PAULO – SÉRIE A 2025
// =====================
makePlayer("SAO_RAFINHA","SAO","Rafinha","LD",78,1),
makePlayer("SAO_IGOR_VIN","SAO","Igor Vinícius","LD",80,9),

makePlayer("SAO_ARBOLEDA","SAO","Arboleda","ZAG",82,11),
makePlayer("SAO_DIEGO_COSTA","SAO","Diego Costa","ZAG",79,7),
makePlayer("SAO_BERALDO","SAO","Beraldo","ZAG",81,16),
makePlayer("SAO_JALEX","SAO","Jalex","ZAG",72,1.2),

makePlayer("SAO_WELL_RATO","SAO","Wellington Rato","MEI",77,6),
makePlayer("SAO_PABLO_MAIA","SAO","Pablo Maia","VOL",82,18),
makePlayer("SAO_LUCAS","SAO","Lucas Moura","ATA",84,20),
makePlayer("SAO_LUCAS_PERRI","SAO","Lucas Perri","GOL",81,14),
makePlayer("SAO_JANDREI","SAO","Jandrei","GOL",76,5),

makePlayer("SAO_LUCIA","SAO","Luciano","ATA",82,10),
makePlayer("SAO_CALLERI","SAO","Jonathan Calleri","ATA",84,18),
makePlayer("SAO_JAMES","SAO","James Rodríguez","MEI",82,8),

makePlayer("SAO_NESTOR","SAO","Rodrigo Nestor","MEI",80,12),
makePlayer("SAO_MICHEL","SAO","Michel Araújo","MEI",78,6),

makePlayer("SAO_MOREIRA","SAO","Moreira","LE",75,3),
makePlayer("SAO_WELLINGTON","SAO","Wellington","LE",78,8),

makePlayer("SAO_RATO","SAO","Wellington Rato","MEI",77,5),
makePlayer("SAO_NIKAO","SAO","Nikão","MEI",76,3),
makePlayer("SAO_JUAN","SAO","Juan","ATA",74,2),
// =====================
// SANTOS – SÉRIE A 2025
// =====================
makePlayer("SAN_JOAO_PAULO","SAN","João Paulo","GOL",82,12),
makePlayer("SAN_VEGA","SAN","Gabriel Vega","GOL",73,1.1),

makePlayer("SAN_JOAQUIM","SAN","Joaquim","ZAG",80,9),
makePlayer("SAN_BASSO","SAN","João Basso","ZAG",78,8),
makePlayer("SAN_MESSIAS","SAN","Messias","ZAG",76,3),

makePlayer("SAN_DODO","SAN","Dodô","LE",78,8),
makePlayer("SAN_GAB_INOC","SAN","Gabriel Inocêncio","LD",75,2),

makePlayer("SAN_RODRIGO_F","SAN","Rodrigo Fernández","VOL",79,6),
makePlayer("SAN_ALISON","SAN","Alison","VOL",76,4),

makePlayer("SAN_SOTELDO","SAN","Soteldo","ATA",82,15),
makePlayer("SAN_MAR_LEO","SAN","Marcos Leonardo","ATA",84,20),
makePlayer("SAN_MORELOS","SAN","Morelos","ATA",78,7),
makePlayer("SAN_Patati","SAN","Weslley Patati","ATA",76,4),

makePlayer("SAN_NONATO","SAN","Nonato","MEI",77,5),
makePlayer("SAN_IVONEI","SAN","Ivonei","MEI",74,2),

makePlayer("SAN_CAMILO","SAN","Camilo","MEI",76,3.3),
makePlayer("SAN_SANDRY","SAN","Sandry","VOL",74,2.5),
makePlayer("SAN_FURMAN","SAN","Furman","VOL",75,3),
makePlayer("SAN_RINCON","SAN","Rincón","VOL",76,4),
// =====================
// GRÊMIO – SÉRIE A 2025
// =====================
makePlayer("GRE_GRANDO","GRE","Gabriel Grando","GOL",79,6),
makePlayer("GRE_Rafael_Cabral","GRE","Rafael Cabral","GOL",77,4),

makePlayer("GRE_KANNEMANN","GRE","Kannemann","ZAG",82,5),
makePlayer("GRE_GEROMEL","GRE","Geromel","ZAG",80,1),
makePlayer("GRE_GUSTAVO_MARTINS","GRE","Gustavo Martins","ZAG",76,4),
makePlayer("GRE_RODRIGO_ELY","GRE","Rodrigo Ely","ZAG",77,3),

makePlayer("GRE_REINALDO","GRE","Reinaldo","LE",79,4),
makePlayer("GRE_CUIABANO","GRE","Cuiabano","LE",76,3),
makePlayer("GRE_JOAO_PEDRO","GRE","João Pedro","LD",78,4),

makePlayer("GRE_VILLASANTI","GRE","Villasanti","VOL",82,10),
makePlayer("GRE_PEPÊ","GRE","Pepê","VOL",81,8),
makePlayer("GRE_CRISTALDO","GRE","Franco Cristaldo","MEI",80,6),

makePlayer("GRE_GALDINO","GRE","Galdino","ATA",76,3),
makePlayer("GRE_FERREIRA","GRE","Ferreira","ATA",79,8),
makePlayer("GRE_NATHAN","GRE","Nathan Fernandes","ATA",74,2.2),

makePlayer("GRE_GUSTAVO_NUNES","GRE","Gustavo Nunes","ATA",75,3.5),
makePlayer("GRE_EDENILSON","GRE","Edenilson","MEI",78,4),
makePlayer("GRE_SUAREZ","GRE","Luis Suárez","ATA",84,10), // fim do contrato? você decide se mantém
makePlayer("GRE_ANDRE","GRE","André Henrique","ATA",74,1.8),
// ======================
// ATLÉTICO-MG – SÉRIE A 2025
// ======================
makePlayer("AMG_EVERSON","AMG","Everson","GOL",82,10),
makePlayer("AMG_MATHEUS_MEND","AMG","Matheus Mendes","GOL",73,1),

makePlayer("AMG_G_ARANA","AMG","Guilherme Arana","LE",85,22),
makePlayer("AMG_MARIANO","AMG","Mariano","LD",77,1),
makePlayer("AMG_SARAVIA","AMG","Saravia","LD",78,4),
makePlayer("AMG_JEMERSON","AMG","Jemerson","ZAG",79,4),
makePlayer("AMG_BRUNO_F","AMG","Bruno Fuchs","ZAG",78,5),
makePlayer("AMG_NATHAN_SILVA","AMG","Nathan Silva","ZAG",80,7),

makePlayer("AMG_OTAVIO","AMG","Otávio","VOL",80,12),
makePlayer("AMG_BATTAGLIA","AMG","Battaglia","VOL",82,9),
makePlayer("AMG_ALAN_FRANCO","AMG","Alan Franco","VOL",79,5),

makePlayer("AMG_ZARACHO","AMG","Zaracho","MEI",84,18),
makePlayer("AMG_IGOR_GOMES","AMG","Igor Gomes","MEI",80,10),
makePlayer("AMG_PALACIOS","AMG","Palacios","MEI",74,3),

makePlayer("AMG_HULK","AMG","Hulk","ATA",85,8),
makePlayer("AMG_PAULINHO","AMG","Paulinho","ATA",84,25),
makePlayer("AMG_PAVON","AMG","Pavón","ATA",81,10),
makePlayer("AMG_VARGAS","AMG","Vargas","ATA",79,4),
makePlayer("AMG_CADU","AMG","Cadu","ATA",75,2),
// =====================
// BAHIA – SÉRIE A 2025
// =====================
makePlayer("BAH_MARCOS_FELIPE","BAH","Marcos Felipe","GOL",78,6),
makePlayer("BAH_DANILO_FERNANDES","BAH","Danilo Fernandes","GOL",75,2.5),

makePlayer("BAH_KANU","BAH","Kanu","ZAG",77,4),
makePlayer("BAH_GABRIEL_XAVIER","BAH","Gabriel Xavier","ZAG",76,3.5),
makePlayer("BAH_VITOR_HUGO_ZAG","BAH","Vitor Hugo","ZAG",76,3.5),

makePlayer("BAH_LUCAS_ESTEVES","BAH","Lucas Esteves","LE",75,3),
makePlayer("BAH_LUC_JUBA","BAH","Luciano Juba","LE",78,5.5),
makePlayer("BAH_CICINHO","BAH","Cicinho","LD",76,3),

makePlayer("BAH_REZENDE","BAH","Rezende","VOL",76,3.5),
makePlayer("BAH_ACEVEDO","BAH","Acevedo","VOL",77,4.5),
makePlayer("BAH_YAGO_FELIPE","BAH","Yago Felipe","VOL",77,4),

makePlayer("BAH_CAULY","BAH","Cauly","MEI",80,8),
makePlayer("BAH_JEAN_LUCAS","BAH","Jean Lucas","MEI",79,7),
makePlayer("BAH_THACIANO","BAH","Thaciano","MEI",77,4.5),
makePlayer("BAH_LUAN","BAH","Luan","MEI",76,3),

makePlayer("BAH_BIEL","BAH","Biel","ATA",78,5),
makePlayer("BAH_EVERALDO","BAH","Everaldo","ATA",78,5.5),
makePlayer("BAH_RAF_RATAO","BAH","Rafael Ratão","ATA",77,4),
makePlayer("BAH_ADEMIR","BAH","Ademir","ATA",79,6),
makePlayer("BAH_VINICIUS_MINGOTTI","BAH","Vinícius Mingotti","ATA",75,2.8),

// =====================
// FORTALEZA – SÉRIE A 2025
// =====================
makePlayer("FOR_JOAO_RICARDO","FOR","João Ricardo","GOL",79,5),
makePlayer("FOR_SANTOS","FOR","Santos","GOL",76,3),

makePlayer("FOR_TITI","FOR","Titi","ZAG",79,4.5),
makePlayer("FOR_BENEVENTO","FOR","Benevenuto","ZAG",78,4),
makePlayer("FOR_TINGA","FOR","Tinga","ZAG",77,3.5),

makePlayer("FOR_BRUNO_PACHECO","FOR","Bruno Pacheco","LE",77,4),
makePlayer("FOR_DODO","FOR","Dodo","LE",75,3),
makePlayer("FOR_DUARTE","FOR","Dudu","LD",76,3.2),

makePlayer("FOR_ZE_WELISON","FOR","Zé Welison","VOL",78,4.5),
makePlayer("FOR_HERCULES","FOR","Hércules","VOL",77,4.5),
makePlayer("FOR_LUCAS_SASHA","FOR","Sasha","VOL",76,3.5),

makePlayer("FOR_POCCHETINO","FOR","Pochettino","MEI",79,5.5),
makePlayer("FOR_CALEX","FOR","Calebe","MEI",76,3),
makePlayer("FOR_KERVIN","FOR","Kervin Andrade","MEI",75,3),
makePlayer("FOR_ROMARINHO","FOR","Romarinho","MEI",78,4.5),
makePlayer("FOR_CRISPIM","FOR","Crispim","MEI",77,4),

makePlayer("FOR_LUCERO","FOR","Lucero","ATA",80,7),
makePlayer("FOR_YAGO_PIKACHU","FOR","Yago Pikachu","ATA",79,6),
makePlayer("FOR_MARINHO","FOR","Marinho","ATA",78,5.5),
makePlayer("FOR_MOISES","FOR","Moisés","ATA",79,6),
makePlayer("FOR_PEDRO_ROCHA","FOR","Pedro Rocha","ATA",77,4.5),
makePlayer("FOR_KAYZER","FOR","Kayzer","ATA",76,4),
makePlayer("FOR_SAMUEL","FOR","Samuel","ATA",75,3),

// =====================
// RB BRAGANTINO – SÉRIE A 2025
// =====================
makePlayer("RBB_CLEITON","RBB","Cleiton","GOL",78,5),
makePlayer("RBB_MAYCON_CEZAR","RBB","Maycon Cezar","GOL",73,1.5),

makePlayer("RBB_REALPE","RBB","Léo Realpe","ZAG",76,3.5),
makePlayer("RBB_LUCAS_CUNHA","RBB","Lucas Cunha","ZAG",77,4),
makePlayer("RBB_DOUGLAS_MENDES","RBB","Douglas Mendes","ZAG",74,2.2),

makePlayer("RBB_JUN_CAPIXABA","RBB","Juninho Capixaba","LE",79,5.5),
makePlayer("RBB_LUAN_CANDIDO","RBB","Luan Cândido","LE",78,5),
makePlayer("RBB_NATHAN_MENDES","RBB","Nathan Mendes","LD",77,4),
makePlayer("RBB_ANDRES_HURTADO","RBB","Andrés Hurtado","LD",76,3.5),

makePlayer("RBB_JADSOM","RBB","Jadsom","VOL",77,4),
makePlayer("RBB_MATHEUS_FERNANDES","RBB","Matheus Fernandes","VOL",76,3.5),
makePlayer("RBB_ERICK_RAMIREZ","RBB","Eric Ramires","MEI",78,5),
makePlayer("RBB_LUCAS_EVANGELISTA","RBB","Lucas Evangelista","MEI",80,7),
makePlayer("RBB_BRUNINHO","RBB","Bruninho","MEI",76,3.5),
makePlayer("RBB_GUSTAVINHO","RBB","Gustavinho","MEI",75,3),

makePlayer("RBB_HELINHO","RBB","Helinho","ATA",79,6),
makePlayer("RBB_VITINHO","RBB","Vitinho","ATA",78,5.5),
makePlayer("RBB_THIAGO_BORBAS","RBB","Thiago Borbas","ATA",80,7),
makePlayer("RBB_SASHA","RBB","Eduardo Sasha","ATA",78,5),
makePlayer("RBB_HENRY_MOSQUERA","RBB","Henry Mosquera","ATA",77,4.2),
makePlayer("RBB_LINCOLN","RBB","Lincoln","ATA",75,3),
makePlayer("RBB_MIGUEL","RBB","Miguel","ATA",74,2),

// =====================
// VASCO – SÉRIE A 2025
// =====================
makePlayer("VAS_LEO_JARDIM","VAS","Léo Jardim","GOL",79,5),
makePlayer("VAS_HALLSWORTH","VAS","Halls","GOL",73,1.5),

makePlayer("VAS_MEDEL","VAS","Medel","ZAG",80,3.5),
makePlayer("VAS_ROBSON_BAMBU","VAS","Robson Bambu","ZAG",76,3),
makePlayer("VAS_JOAO_VICTOR","VAS","João Victor","ZAG",77,4),

makePlayer("VAS_LUCAS_PITON","VAS","Lucas Piton","LE",79,6),
makePlayer("VAS_PAULO_HENRIQUE","VAS","Paulo Henrique","LD",76,3.5),
makePlayer("VAS_PUMA_RODRIGUEZ","VAS","Puma Rodríguez","LD",77,4),

makePlayer("VAS_HUGO_MOURA","VAS","Hugo Moura","VOL",77,4.5),
makePlayer("VAS_JAIR","VAS","Jair","VOL",78,5),
makePlayer("VAS_ZE_GABRIEL","VAS","Zé Gabriel","VOL",75,3),

makePlayer("VAS_PRAXEDES","VAS","Praxedes","MEI",78,5),
makePlayer("VAS_GALDAMES","VAS","Galdames","MEI",77,4),
makePlayer("VAS_PAYET","VAS","Payet","MEI",82,7),

makePlayer("VAS_GABRIEL_PEC","VAS","Gabriel Pec","ATA",81,9),
makePlayer("VAS_VEGETTI","VAS","Vegetti","ATA",80,7),
makePlayer("VAS_ERICK_MARCUS","VAS","Erick Marcus","ATA",76,3.5),
makePlayer("VAS_RAYAN","VAS","Rayan","ATA",75,3),
makePlayer("VAS_PAULINHO","VAS","Paulinho","ATA",77,4),
makePlayer("VAS_ROSSI","VAS","Rossi","ATA",78,5),
makePlayer("VAS_DAVID","VAS","David","ATA",77,4.5),
// =====================
// CEARÁ – SÉRIE A 2025
// =====================
makePlayer("CEA_RICHARD","CEA","Richard","GOL",76,3),
makePlayer("CEA_JOAO_RICARDO","CEA","João Ricardo","GOL",74,2),

makePlayer("CEA_LEO_SANTOS","CEA","Léo Santos","ZAG",75,2.8),
makePlayer("CEA_TIAGO_PAG","CEA","Tiago Pagnussat","ZAG",76,3),
makePlayer("CEA_DAVID_RICARDO","CEA","David Ricardo","ZAG",74,2),

makePlayer("CEA_BRUNO_FERREIRA","CEA","Bruno Ferreira","LD",74,2),
makePlayer("CEA_MICHEL_MACEDO","CEA","Michel Macedo","LD",75,2.5),
makePlayer("CEA_ALAN_RODRIGUES","CEA","Alan Rodrigues","LE",73,1.8),

makePlayer("CEA_RENATO_RICHARDSON","CEA","Richardson","VOL",76,3),
makePlayer("CEA_GUILHERME_CASTILHO","CEA","Guilherme Castilho","VOL",76,3),
makePlayer("CEA_GEOVANE","CEA","Geovane","VOL",74,2),

makePlayer("CEA_VINA","CEA","Vina","MEI",79,5),
makePlayer("CEA_JEAN_CARLOS","CEA","Jean Carlos","MEI",77,3.5),
makePlayer("CEA_CHAY","CEA","Chay","MEI",75,2.5),
makePlayer("CEA_ANDRE_LUIZ","CEA","André Luiz","MEI",74,2),

makePlayer("CEA_ERICK","CEA","Erick","ATA",78,4.5),
makePlayer("CEA_SAULO_MINEIRO","CEA","Saulo Mineiro","ATA",77,4),
makePlayer("CEA_JANDERSON","CEA","Janderson","ATA",76,3.5),
makePlayer("CEA_LUVANNOR","CEA","Luvannor","ATA",75,3),
makePlayer("CEA_CLEBER","CEA","Cléber","ATA",75,3),

// =====================
// SPORT – SÉRIE A 2025
// =====================
makePlayer("SPT_JORDAN","SPT","Jordan","GOL",74,2),
makePlayer("SPT_RENNAN","SPT","Renan","GOL",73,1.5),

makePlayer("SPT_RAF_THYERE","SPT","Rafael Thyere","ZAG",77,3.5),
makePlayer("SPT_SABINO","SPT","Sabino","ZAG",77,3.5),
makePlayer("SPT_CHICO_ZAG","SPT","Chico","ZAG",75,2.5),

makePlayer("SPT_LUCAS_HERNANDES","SPT","Lucas Hernandes","LE",75,2.8),
makePlayer("SPT_DALBERT","SPT","Dalbert","LE",76,3),
makePlayer("SPT_RENZO","SPT","Renzo","LD",74,2),
makePlayer("SPT_PEDRO_LIMA","SPT","Pedro Lima","LD",76,3.2),

makePlayer("SPT_FABIO_MATHEUS","SPT","Fábio Matheus","VOL",75,2.5),
makePlayer("SPT_DENILSON_VOL","SPT","Denílson","VOL",75,2.5),
makePlayer("SPT_RONALDO","SPT","Ronaldo","VOL",76,3),

makePlayer("SPT_ALAN_RUIZ","SPT","Alan Ruiz","MEI",77,3.5),
makePlayer("SPT_LUC_JUBA_MEI","SPT","Luciano Juba","MEI",79,5),
makePlayer("SPT_FABRICIO_DANIEL","SPT","Fabrício Daniel","MEI",76,3),
makePlayer("SPT_ALISSON_FARIAS","SPT","Alisson Farias","MEI",75,2.5),

makePlayer("SPT_GUSTAVO_COUTINHO","SPT","Gustavo Coutinho","ATA",78,4),
makePlayer("SPT_GABRIEL_SANTOS","SPT","Gabriel Santos","ATA",76,3),
makePlayer("SPT_EDINHO","SPT","Edinho","ATA",76,3),
makePlayer("SPT_WANDERSON","SPT","Wanderson","ATA",75,2.8),

// =====================
// JUVENTUDE – SÉRIE A 2025
// =====================
makePlayer("JUV_CESAR","JUV","César","GOL",76,2.8),
makePlayer("JUV_RENNAN","JUV","Renan","GOL",73,1.5),

makePlayer("JUV_VITOR_MENDES","JUV","Vitor Mendes","ZAG",76,3),
makePlayer("JUV_RODRIGO_SAM","JUV","Rodrigo Sam","ZAG",74,2.2),
makePlayer("JUV_RAFAEL_FORSTER","JUV","Rafael Forster","ZAG",75,2.5),

makePlayer("JUV_ALAN_RUSCHEL","JUV","Alan Ruschel","LE",75,2.5),
makePlayer("JUV_PAULO_HENRIQUE","JUV","Paulo Henrique","LD",75,2.5),

makePlayer("JUV_JEAN_IRMER","JUV","Jean Irmer","VOL",76,3),
makePlayer("JUV_JADSON","JUV","Jadson","VOL",75,2.8),

makePlayer("JUV_MATHEUS_VARGAS","JUV","Matheus Vargas","MEI",76,3),
makePlayer("JUV_GABRIEL_TOTA","JUV","Gabriel Tota","MEI",74,2),
makePlayer("JUV_CHICO_MEI","JUV","Chico","MEI",74,2),
makePlayer("JUV_LUCAS_BARBOSA","JUV","Lucas Barbosa","MEI",75,2.5),

makePlayer("JUV_NENE","JUV","Nenê","ATA",79,4),
makePlayer("JUV_GILBERTO","JUV","Gilberto","ATA",77,3.5),
makePlayer("JUV_ELTON","JUV","Elton","ATA",76,3),
makePlayer("JUV_RICARDO_BUENO","JUV","Ricardo Bueno","ATA",75,2.5),
makePlayer("JUV_CAPIXABA","JUV","Capixaba","ATA",76,3),
makePlayer("JUV_KELVI","JUV","Kelvi","ATA",73,1.8),

// =====================
// VITÓRIA – SÉRIE A 2025
// =====================
makePlayer("VIT_LUCAS_ARCANJO","VIT","Lucas Arcanjo","GOL",76,2.8),
makePlayer("VIT_THIAGO_RODRIGUES","VIT","Thiago Rodrigues","GOL",73,1.5),

makePlayer("VIT_WAGNER_LEONARDO","VIT","Wagner Leonardo","ZAG",76,3),
makePlayer("VIT_CAMUTANGA","VIT","Camutanga","ZAG",75,2.5),
makePlayer("VIT_DUDU_ZAG","VIT","Dudu","ZAG",74,2.2),

makePlayer("VIT_FELIPE_VIEIRA","VIT","Felipe Vieira","LE",74,2),
makePlayer("VIT_JOAO_LUCAS","VIT","João Lucas","LD",75,2.5),
makePlayer("VIT_RAILAN","VIT","Railan","LD",73,1.8),

makePlayer("VIT_WILLIAN_OLIVEIRA","VIT","Willian Oliveira","VOL",75,2.5),
makePlayer("VIT_RODRIGO_ANDRADE","VIT","Rodrigo Andrade","VOL",76,3),
makePlayer("VIT_GEGÊ","VIT","Gegê","VOL",74,2),

makePlayer("VIT_DANIEL","VIT","Daniel","MEI",76,3),
makePlayer("VIT_BRUNO_OLIVEIRA","VIT","Bruno Oliveira","MEI",75,2.5),
makePlayer("VIT_MATHEUSINHO","VIT","Matheusinho","MEI",75,2.5),
makePlayer("VIT_MARCO_ANTONIO","VIT","Marco Antônio","MEI",74,2),

makePlayer("VIT_LEO_GAMALHO","VIT","Léo Gamalho","ATA",77,3),
makePlayer("VIT_ZE_HUGO","VIT","Zé Hugo","ATA",75,2.5),
makePlayer("VIT_OSVALDO","VIT","Osvaldo","ATA",75,2.5),
makePlayer("VIT_RODRIGO_CARIOCA","VIT","Rodrigo Carioca","ATA",74,2.2),
makePlayer("VIT_IURY_CASTILHO","VIT","Iury Castilho","ATA",76,3),

// =====================
// MIRASSOL – SÉRIE A 2025
// =====================
makePlayer("MIR_JOAO_PAULO","MIR","João Paulo","GOL",74,2),
makePlayer("MIR_MATHEUS_OLIVEIRA_GOL","MIR","Matheus Oliveira","GOL",72,1.2),

makePlayer("MIR_LUIZ_OTAVIO","MIR","Luiz Otávio","ZAG",75,2.5),
makePlayer("MIR_RODRIGO_SAM_MIR","MIR","Rodrigo Sam","ZAG",74,2.2),
makePlayer("MIR_ROBSON","MIR","Robson","ZAG",73,1.8),

makePlayer("MIR_MORAES","MIR","Moraes","LE",74,2),
makePlayer("MIR_LUCAS_RAMON","MIR","Lucas Ramon","LD",74,2),
makePlayer("MIR_RODRIGO_FERREIRA","MIR","Rodrigo Ferreira","LD",73,1.8),

makePlayer("MIR_DANIELZINHO","MIR","Danielzinho","VOL",75,2.5),
makePlayer("MIR_CRISTIAN","MIR","Cristian","VOL",74,2),
makePlayer("MIR_PAULINHO","MIR","Paulinho","VOL",74,2),

makePlayer("MIR_CAMILO","MIR","Camilo","MEI",78,3),
makePlayer("MIR_FABRICIO","MIR","Fabrício","MEI",75,2.5),
makePlayer("MIR_KAUAN","MIR","Kauan","MEI",73,1.8),

makePlayer("MIR_ZE_ROBERTO","MIR","Zé Roberto","ATA",76,3),
makePlayer("MIR_NEQUEBA","MIR","Negueba","ATA",75,2.5),
makePlayer("MIR_RAF_SILVA","MIR","Rafael Silva","ATA",74,2.2),
makePlayer("MIR_GABRIEL","MIR","Gabriel","ATA",73,1.8),
makePlayer("MIR_VINICIUS","MIR","Vinícius","ATA",73,1.8),

  // Aqui você cola TODOS os blocos que eu estou te mandando
  // Exemplo:
  // makePlayer("FLA_ROSSI","FLA","Agustín Rossi","GOL",83,22),
  // makePlayer("FLA_MATHEUS_CUNHA","FLA","Matheus Cunha","GOL",76,5),
];

// -------------------------------------------------------
// COMPETIÇÕES
// -------------------------------------------------------

const competitions = [
  {
    id: "BRA-A",
    name: "Campeonato Brasileiro Série A",
    type: "league",
    pointsForWin: 3,
    pointsForDraw: 1,
    pointsForLoss: 0,
    doubleRoundRobin: true
  },
  {
    id: "BRA-B",
    name: "Campeonato Brasileiro Série B",
    type: "league",
    pointsForWin: 3,
    pointsForDraw: 1,
    pointsForLoss: 0,
    doubleRoundRobin: true
  }
];

// -------------------------------------------------------
// HELPERS
// -------------------------------------------------------

function getTeamById(teamId) {
  return teams.find(t => t.id === teamId) || null;
}

function calcularValorPorOVR(ovr) {
  if (ovr >= 85) return 60;
  if (ovr >= 80) return 35;
  if (ovr >= 75) return 20;
  if (ovr >= 70) return 10;
  if (ovr >= 65) return 5;
  return 2;
}

// Se não houver elenco real cadastrado, gera um elenco padrão
function gerarElencoPadrao(team) {
  const baseOVR = team.division === "A" ? 76 : 70;
  const positions = [
    "GOL",
    "ZAG", "ZAG",
    "LE", "LD",
    "VOL", "VOL",
    "MEI", "MEI",
    "ATA", "ATA",
    "ATA", "MEI", "VOL", "ZAG", "ATA", "MEI", "GOL"
  ];

  return positions.map((pos, idx) => {
    const ovr = baseOVR + (Math.floor(Math.random() * 7) - 3); // variação -3 a +3
    return {
      id: `${team.id}_GEN_${idx + 1}`,
      teamId: team.id,
      name: `Jogador ${idx + 1}`,
      position: pos,
      overall: ovr,
      age: 20 + (idx % 10),
      morale: 75,
      value: calcularValorPorOVR(ovr),
      face: `assets/faces/${team.id}_GEN_${idx + 1}.png`
    };
  });
}

// Função usada pelo jogo para carregar elenco do time
function carregarElencoDoTime(teamId) {
  const team = getTeamById(teamId);
  if (!team) return [];

  const elencoReal = players.filter(p => p.teamId === teamId);
  if (elencoReal.length > 0) return elencoReal;

  // se não tiver jogadores reais cadastrados, gera elenco padrão
  return gerarElencoPadrao(team);
}

// Expor em um objeto global
window.Database = {
  teams,
  players,
  competitions,
  getTeamById,
  carregarElencoDoTime
};
