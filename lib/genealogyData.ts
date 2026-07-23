/**
 * Données généalogiques bibliques statiques.
 * Source : Genèse 5, 11, Ruth 4, 1 Chroniques 1-2, Matthieu 1, Luc 3.
 * Ces données sont fixes et ne nécessitent pas d'appel IA.
 */

export interface GenealogyPerson {
  id: string;
  name: string;
  hebrewName: string;
  lifespan: string;
  ageAtFirstSon: number | null;
  role: string;
  reference: string;
  isMessianicLine: boolean;
  keyFact: string;
  spouseNames?: string[];
}

export interface Generation {
  generationNumber: number;
  people: GenealogyPerson[];
}

export interface LineageData {
  lineageName: string;
  reference: string;
  totalGenerations: number;
  context: string;
  generations: Generation[];
}

// ─────────────────────────────────────────────────────────────────────────────
// ADAM → NOÉ (Genèse 5)
// ─────────────────────────────────────────────────────────────────────────────
const ADAM_TO_NOAH: LineageData = {
  lineageName: "Adam → Noé",
  reference: "Genèse 5",
  totalGenerations: 10,
  context: "Les dix patriarches antédiluviens. Cette lignée couvre environ 1 656 ans, de la création jusqu'au déluge. Elle témoigne de la longévité exceptionnelle des premiers hommes.",
  generations: [
    { generationNumber: 1, people: [{ id: "adam", name: "Adam", hebrewName: "אָדָם", lifespan: "930 ans", ageAtFirstSon: 130, role: "Premier homme", reference: "Genèse 5:1-5", isMessianicLine: true, keyFact: "Créé à l'image de Dieu", spouseNames: ["Ève"] }] },
    { generationNumber: 2, people: [{ id: "seth", name: "Seth", hebrewName: "שֵׁת", lifespan: "912 ans", ageAtFirstSon: 105, role: "Troisième fils d'Adam", reference: "Genèse 5:6-8", isMessianicLine: true, keyFact: "Donné en remplacement d'Abel", spouseNames: [] }, { id: "cain", name: "Caïn", hebrewName: "קַיִן", lifespan: "Non précisée", ageAtFirstSon: null, role: "Premier-né d'Adam", reference: "Genèse 4:1", isMessianicLine: false, keyFact: "Premier meurtrier, tua son frère Abel" }, { id: "abel", name: "Abel", hebrewName: "הֶבֶל", lifespan: "Non précisée", ageAtFirstSon: null, role: "Deuxième fils d'Adam", reference: "Genèse 4:2", isMessianicLine: false, keyFact: "Premier martyr, son sacrifice fut agréé par Dieu" }] },
    { generationNumber: 3, people: [{ id: "enos", name: "Enos", hebrewName: "אֱנוֹשׁ", lifespan: "905 ans", ageAtFirstSon: 90, role: "Fils de Seth", reference: "Genèse 5:9-11", isMessianicLine: true, keyFact: "Sous lui, on commença à invoquer le nom de l'Éternel" }] },
    { generationNumber: 4, people: [{ id: "cainan", name: "Caïnan", hebrewName: "קֵינָן", lifespan: "910 ans", ageAtFirstSon: 70, role: "Fils d'Enos", reference: "Genèse 5:12-14", isMessianicLine: true, keyFact: "Patriarche antédiluvien de la lignée de Seth" }] },
    { generationNumber: 5, people: [{ id: "mahalaleel", name: "Mahalaléel", hebrewName: "מַהֲלַלְאֵל", lifespan: "895 ans", ageAtFirstSon: 65, role: "Fils de Caïnan", reference: "Genèse 5:15-17", isMessianicLine: true, keyFact: "Son nom signifie : qui loue Dieu" }] },
    { generationNumber: 6, people: [{ id: "jared", name: "Jared", hebrewName: "יָרֶד", lifespan: "962 ans", ageAtFirstSon: 162, role: "Fils de Mahalaléel", reference: "Genèse 5:18-20", isMessianicLine: true, keyFact: "L'un des plus vieux patriarches bibliques" }] },
    { generationNumber: 7, people: [{ id: "enoch", name: "Énoch", hebrewName: "חֲנוֹךְ", lifespan: "365 ans", ageAtFirstSon: 65, role: "Fils de Jared", reference: "Genèse 5:21-24", isMessianicLine: true, keyFact: "Marcha avec Dieu et fut enlevé sans mourir" }] },
    { generationNumber: 8, people: [{ id: "methuselah", name: "Mathusalem", hebrewName: "מְתוּשֶׁלַח", lifespan: "969 ans", ageAtFirstSon: 187, role: "Fils d'Énoch", reference: "Genèse 5:25-27", isMessianicLine: true, keyFact: "L'homme le plus vieux de toute la Bible" }] },
    { generationNumber: 9, people: [{ id: "lamech", name: "Lamech", hebrewName: "לֶמֶךְ", lifespan: "777 ans", ageAtFirstSon: 182, role: "Fils de Mathusalem", reference: "Genèse 5:28-31", isMessianicLine: true, keyFact: "Prophétisa que Noé apporterait le repos", spouseNames: [] }] },
    { generationNumber: 10, people: [{ id: "noah", name: "Noé", hebrewName: "נֹחַ", lifespan: "950 ans", ageAtFirstSon: 500, role: "Juste et intègre, constructeur de l'arche", reference: "Genèse 5:32 ; 6–9", isMessianicLine: true, keyFact: "Seul sauvé du déluge avec sa famille", spouseNames: [] }] },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// NOÉ → ABRAHAM (Genèse 11)
// ─────────────────────────────────────────────────────────────────────────────
const NOAH_TO_ABRAHAM: LineageData = {
  lineageName: "Noé → Abraham",
  reference: "Genèse 11:10-26",
  totalGenerations: 11,
  context: "La lignée de Sem (fils de Noé) jusqu'à Abraham. Elle traverse la confusion de Babel et couvre environ 390 ans après le déluge, menant au père des croyants.",
  generations: [
    { generationNumber: 1, people: [{ id: "noah2", name: "Noé", hebrewName: "נֹחַ", lifespan: "950 ans", ageAtFirstSon: 500, role: "Père de Sem, Ham et Japhet", reference: "Genèse 9:28-29", isMessianicLine: true, keyFact: "Trois fils dont Sem porta la lignée messianique" }] },
    { generationNumber: 2, people: [{ id: "shem", name: "Sem", hebrewName: "שֵׁם", lifespan: "600 ans", ageAtFirstSon: 100, role: "Fils aîné de Noé", reference: "Genèse 11:10-11", isMessianicLine: true, keyFact: "Ancêtre des peuples sémitiques", spouseNames: [] }, { id: "ham", name: "Ham", hebrewName: "חָם", lifespan: "Non précisée", ageAtFirstSon: null, role: "Deuxième fils de Noé", reference: "Genèse 9:22", isMessianicLine: false, keyFact: "Vit la nudité de son père et fut maudit" }, { id: "japheth", name: "Japhet", hebrewName: "יֶפֶת", lifespan: "Non précisée", ageAtFirstSon: null, role: "Troisième fils de Noé", reference: "Genèse 10:2-5", isMessianicLine: false, keyFact: "Ancêtre des peuples indo-européens" }] },
    { generationNumber: 3, people: [{ id: "arphaxad", name: "Arpacshad", hebrewName: "אַרְפַּכְשַׁד", lifespan: "438 ans", ageAtFirstSon: 35, role: "Fils de Sem", reference: "Genèse 11:12-13", isMessianicLine: true, keyFact: "Né 2 ans après le déluge" }] },
    { generationNumber: 4, people: [{ id: "shelah", name: "Shélah", hebrewName: "שֶׁלַח", lifespan: "433 ans", ageAtFirstSon: 30, role: "Fils d'Arpacshad", reference: "Genèse 11:14-15", isMessianicLine: true, keyFact: "Chaîne généalogique post-déluvienne" }] },
    { generationNumber: 5, people: [{ id: "eber", name: "Héber", hebrewName: "עֵבֶר", lifespan: "464 ans", ageAtFirstSon: 34, role: "Fils de Shélah, ancêtre des Hébreux", reference: "Genèse 11:16-17", isMessianicLine: true, keyFact: "Le peuple hébreu tire son nom de lui" }] },
    { generationNumber: 6, people: [{ id: "peleg", name: "Péleg", hebrewName: "פֶּלֶג", lifespan: "239 ans", ageAtFirstSon: 30, role: "Fils d'Héber", reference: "Genèse 11:18-19", isMessianicLine: true, keyFact: "La terre fut divisée de son temps (confusion de Babel)" }] },
    { generationNumber: 7, people: [{ id: "reu", name: "Réu", hebrewName: "רְעוּ", lifespan: "239 ans", ageAtFirstSon: 32, role: "Fils de Péleg", reference: "Genèse 11:20-21", isMessianicLine: true, keyFact: "Patriarche post-déluvien de la lignée d'Abraham" }] },
    { generationNumber: 8, people: [{ id: "serug", name: "Séroug", hebrewName: "שְׂרוּג", lifespan: "230 ans", ageAtFirstSon: 30, role: "Fils de Réu", reference: "Genèse 11:22-23", isMessianicLine: true, keyFact: "Patriarche de Mésopotamie dans la lignée d'Abram" }] },
    { generationNumber: 9, people: [{ id: "nahor", name: "Nahor", hebrewName: "נָחוֹר", lifespan: "148 ans", ageAtFirstSon: 29, role: "Fils de Séroug", reference: "Genèse 11:24-25", isMessianicLine: true, keyFact: "Grand-père d'Abraham" }] },
    { generationNumber: 10, people: [{ id: "terah", name: "Térah", hebrewName: "תֶּרַח", lifespan: "205 ans", ageAtFirstSon: 70, role: "Père d'Abraham, Nahor et Haran", reference: "Genèse 11:26-32", isMessianicLine: true, keyFact: "Quitta Our des Chaldéens pour Canaan mais mourut à Haran", spouseNames: [] }] },
    { generationNumber: 11, people: [{ id: "abraham2", name: "Abraham", hebrewName: "אַבְרָהָם", lifespan: "175 ans", ageAtFirstSon: 86, role: "Père des croyants, ami de Dieu", reference: "Genèse 12 ; 17 ; 21", isMessianicLine: true, keyFact: "Père d'Isaac, d'Ismaël et ancêtre du Messie", spouseNames: ["Sara", "Agar", "Qetura"] }] },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// ABRAHAM → DAVID (Matthieu 1:2-6 ; Ruth 4:18-22)
// ─────────────────────────────────────────────────────────────────────────────
const ABRAHAM_TO_DAVID: LineageData = {
  lineageName: "Abraham → David",
  reference: "Matthieu 1:2-6 ; Ruth 4:18-22 ; 1 Chroniques 2:1-15",
  totalGenerations: 14,
  context: "De l'appel d'Abraham à la royauté davidique. Cette lignée passe par les patriarches, l'Égypte, l'Exode et s'enracine dans la tribu de Juda jusqu'au roi David.",
  generations: [
    { generationNumber: 1, people: [{ id: "abraham", name: "Abraham", hebrewName: "אַבְרָהָם", lifespan: "175 ans", ageAtFirstSon: 86, role: "Père des croyants, ami de Dieu", reference: "Genèse 12 ; 17 ; Matthieu 1:2", isMessianicLine: true, keyFact: "Appelé d'Our ; la promesse messianique lui fut donnée", spouseNames: ["Sara", "Agar", "Qetura"] }] },
    { generationNumber: 2, people: [{ id: "isaac", name: "Isaac", hebrewName: "יִצְחָק", lifespan: "180 ans", ageAtFirstSon: 60, role: "Fils de la promesse", reference: "Genèse 21 ; Matthieu 1:2", isMessianicLine: true, keyFact: "Offert en sacrifice et épargné par Dieu", spouseNames: ["Rébecca"] }] },
    { generationNumber: 3, people: [{ id: "jacob", name: "Jacob", hebrewName: "יַעֲקֹב", lifespan: "147 ans", ageAtFirstSon: null, role: "Père des 12 tribus d'Israël", reference: "Genèse 25 ; Matthieu 1:2", isMessianicLine: true, keyFact: "Lutta avec Dieu et fut renommé Israël", spouseNames: ["Léa", "Rachel", "Bilha", "Zilpa"] }] },
    { generationNumber: 4, people: [{ id: "judah", name: "Juda", hebrewName: "יְהוּדָה", lifespan: "Non précisée", ageAtFirstSon: null, role: "4e fils de Jacob, ancêtre de la royauté", reference: "Genèse 29:35 ; Matthieu 1:3", isMessianicLine: true, keyFact: "Le sceptre ne s'éloignera pas de Juda (Genèse 49:10)", spouseNames: ["Tamar"] }] },
    { generationNumber: 5, people: [{ id: "perez", name: "Pérets", hebrewName: "פֶּרֶץ", lifespan: "Non précisée", ageAtFirstSon: null, role: "Fils de Juda et Tamar", reference: "Genèse 38:29 ; Matthieu 1:3", isMessianicLine: true, keyFact: "Né le premier bien que son frère Zérah tendit la main" }] },
    { generationNumber: 6, people: [{ id: "hezron", name: "Hetsron", hebrewName: "חֶצְרֹון", lifespan: "Non précisée", ageAtFirstSon: null, role: "Fils de Pérets", reference: "Ruth 4:18 ; Matthieu 1:3", isMessianicLine: true, keyFact: "Descendant de Juda mentionné dans la généalogie davidique" }] },
    { generationNumber: 7, people: [{ id: "ram", name: "Ram", hebrewName: "רָם", lifespan: "Non précisée", ageAtFirstSon: null, role: "Fils d'Hetsron", reference: "Ruth 4:19 ; Matthieu 1:3", isMessianicLine: true, keyFact: "Chaîne reliant les patriarches à la période des Juges" }] },
    { generationNumber: 8, people: [{ id: "amminadab", name: "Aminadab", hebrewName: "עַמִּינָדָב", lifespan: "Non précisée", ageAtFirstSon: null, role: "Prince de Juda sous Moïse", reference: "Exode 6:23 ; Matthieu 1:4", isMessianicLine: true, keyFact: "Son fils Nahshon était prince de Juda au désert" }] },
    { generationNumber: 9, people: [{ id: "nahshon", name: "Nashon", hebrewName: "נַחְשׁוֹן", lifespan: "Non précisée", ageAtFirstSon: null, role: "Chef de la tribu de Juda au désert", reference: "Nombres 1:7 ; Matthieu 1:4", isMessianicLine: true, keyFact: "Premier à offrir son offrande lors de la dédicace du Tabernacle" }] },
    { generationNumber: 10, people: [{ id: "salmon", name: "Salmon", hebrewName: "שַׂלְמוֹן", lifespan: "Non précisée", ageAtFirstSon: null, role: "Fils de Nashon", reference: "Ruth 4:20 ; Matthieu 1:4-5", isMessianicLine: true, keyFact: "Épousa Rahab de Jéricho, convertie à la foi d'Israël", spouseNames: ["Rahab"] }] },
    { generationNumber: 11, people: [{ id: "boaz", name: "Boaz", hebrewName: "בֹּعַז", lifespan: "Non précisée", ageAtFirstSon: null, role: "Homme de valeur, rédempteur de Ruth", reference: "Ruth 2–4 ; Matthieu 1:5", isMessianicLine: true, keyFact: "Exemplairement fidèle à la loi du lévirat avec Ruth la Moabite", spouseNames: ["Ruth"] }] },
    { generationNumber: 12, people: [{ id: "obed", name: "Obed", hebrewName: "עוֹבֵד", lifespan: "Non précisée", ageAtFirstSon: null, role: "Fils de Boaz et Ruth", reference: "Ruth 4:21-22 ; Matthieu 1:5", isMessianicLine: true, keyFact: "Sa naissance réjouit Naomi après ses épreuves" }] },
    { generationNumber: 13, people: [{ id: "jesse", name: "Isaï", hebrewName: "יִשַׁי", lifespan: "Non précisée", ageAtFirstSon: null, role: "Père des huit fils dont David", reference: "1 Samuel 16 ; Matthieu 1:5-6", isMessianicLine: true, keyFact: "Le rejeton d'Isaï : prophétie messianique d'Ésaïe 11:1" }] },
    { generationNumber: 14, people: [{ id: "david", name: "David", hebrewName: "דָּוִד", lifespan: "70 ans", ageAtFirstSon: null, role: "Roi d'Israël, homme selon le cœur de Dieu", reference: "1 Samuel 16 ; 2 Samuel 7 ; Matthieu 1:6", isMessianicLine: true, keyFact: "L'alliance davidique : son trône durera éternellement", spouseNames: ["Bethsabée", "Mikal", "Abigaïl", "Ahinoam"] }] },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// DAVID → JÉSUS (Matthieu 1:6-16)
// ─────────────────────────────────────────────────────────────────────────────
const DAVID_TO_JESUS: LineageData = {
  lineageName: "David → Jésus",
  reference: "Matthieu 1:6-16 ; Luc 3:23-31",
  totalGenerations: 28,
  context: "La lignée royale et messianique de David à Jésus-Christ, selon Matthieu 1. Elle traverse la royauté divisée, la captivité babylonienne et la restauration, avant de mener au Messie.",
  generations: [
    { generationNumber: 1, people: [{ id: "david2", name: "David", hebrewName: "דָּוִד", lifespan: "70 ans", ageAtFirstSon: null, role: "Roi d'Israël, ancêtre du Messie", reference: "2 Samuel 7 ; Matthieu 1:6", isMessianicLine: true, keyFact: "Alliance de Dieu : son trône durera éternellement", spouseNames: ["Bethsabée", "Mikal", "Abigaïl"] }] },
    { generationNumber: 2, people: [{ id: "solomon", name: "Salomon", hebrewName: "שְׁלֹמֹה", lifespan: "Non précisée", ageAtFirstSon: null, role: "Roi le plus sage d'Israël", reference: "1 Rois 1–11 ; Matthieu 1:6-7", isMessianicLine: true, keyFact: "Bâtit le Temple de Jérusalem ; sa sagesse était sans pareille", spouseNames: ["Fille du Pharaon"] }] },
    { generationNumber: 3, people: [{ id: "rehoboam", name: "Roboam", hebrewName: "רְחַבְعָם", lifespan: "Non précisée", ageAtFirstSon: null, role: "Premier roi de Juda après le schisme", reference: "1 Rois 12 ; Matthieu 1:7", isMessianicLine: true, keyFact: "Refusa d'alléger le joug, provoquant la division du royaume" }] },
    { generationNumber: 4, people: [{ id: "abijah", name: "Abias", hebrewName: "אֲבִיָּה", lifespan: "Non précisée", ageAtFirstSon: null, role: "Roi de Juda", reference: "2 Chroniques 13 ; Matthieu 1:7", isMessianicLine: true, keyFact: "Vainquit Jéroboam en se confiant à l'Éternel" }] },
    { generationNumber: 5, people: [{ id: "asa", name: "Asa", hebrewName: "אָסָא", lifespan: "Non précisée", ageAtFirstSon: null, role: "Roi réformateur de Juda", reference: "1 Rois 15 ; Matthieu 1:7-8", isMessianicLine: true, keyFact: "Enleva les idoles et chercha l'Éternel de tout son cœur" }] },
    { generationNumber: 6, people: [{ id: "jehoshaphat", name: "Josaphat", hebrewName: "יְהוֹשָׁפָט", lifespan: "Non précisée", ageAtFirstSon: null, role: "Roi pieux de Juda", reference: "1 Rois 22 ; Matthieu 1:8", isMessianicLine: true, keyFact: "Instaura des juges et des lévites pour enseigner la Loi" }] },
    { generationNumber: 7, people: [{ id: "joram", name: "Joram", hebrewName: "יְהוֹרָם", lifespan: "Non précisée", ageAtFirstSon: null, role: "Roi de Juda, fils de Josaphat", reference: "2 Rois 8 ; Matthieu 1:8", isMessianicLine: true, keyFact: "Épousa Athalie et marcha dans la voie d'Achab" }] },
    { generationNumber: 8, people: [{ id: "uzziah", name: "Ozias (Uzziah)", hebrewName: "עֻזִּיָּהוּ", lifespan: "Non précisée", ageAtFirstSon: null, role: "Roi puissant de Juda", reference: "2 Chroniques 26 ; Matthieu 1:8-9", isMessianicLine: true, keyFact: "Frappé de lèpre pour avoir usurpé le rôle des sacrificateurs" }] },
    { generationNumber: 9, people: [{ id: "jotham", name: "Joatham", hebrewName: "יוֹתָם", lifespan: "Non précisée", ageAtFirstSon: null, role: "Roi de Juda", reference: "2 Rois 15 ; Matthieu 1:9", isMessianicLine: true, keyFact: "Fit ce qui est droit aux yeux de l'Éternel" }] },
    { generationNumber: 10, people: [{ id: "ahaz", name: "Achaz", hebrewName: "אָחָז", lifespan: "Non précisée", ageAtFirstSon: null, role: "Roi idolâtre de Juda", reference: "2 Rois 16 ; Matthieu 1:9", isMessianicLine: true, keyFact: "Fit brûler ses fils dans le feu selon les coutumes des nations" }] },
    { generationNumber: 11, people: [{ id: "hezekiah", name: "Ézéchias", hebrewName: "חִזְקִיָּהוּ", lifespan: "Non précisée", ageAtFirstSon: null, role: "Grand réformateur de Juda", reference: "2 Rois 18–20 ; Matthieu 1:9-10", isMessianicLine: true, keyFact: "Dieu lui accorda 15 ans de vie supplémentaires après sa prière" }] },
    { generationNumber: 12, people: [{ id: "manasseh", name: "Manassé", hebrewName: "מְנַשֶּׁה", lifespan: "Non précisée", ageAtFirstSon: null, role: "Le roi le plus impie de Juda", reference: "2 Rois 21 ; Matthieu 1:10", isMessianicLine: true, keyFact: "Se rentit en captivité et fut restauré par Dieu" }] },
    { generationNumber: 13, people: [{ id: "amon", name: "Amon", hebrewName: "אָמוֹן", lifespan: "Non précisée", ageAtFirstSon: null, role: "Roi impie de Juda", reference: "2 Rois 21:18-26 ; Matthieu 1:10", isMessianicLine: true, keyFact: "Assassiné par ses serviteurs après 2 ans de règne" }] },
    { generationNumber: 14, people: [{ id: "josiah", name: "Josias", hebrewName: "יֹאשִׁיָּהוּ", lifespan: "Non précisée", ageAtFirstSon: null, role: "Grand réformateur de Juda", reference: "2 Rois 22–23 ; Matthieu 1:10-11", isMessianicLine: true, keyFact: "Redécouvrit le livre de la Loi et célébra la plus grande Pâque" }] },
    { generationNumber: 15, people: [{ id: "jeconiah", name: "Jéchonias", hebrewName: "יְכָנְיָה", lifespan: "Non précisée", ageAtFirstSon: null, role: "Dernier roi de Juda avant l'exil", reference: "2 Rois 24 ; Matthieu 1:11-12", isMessianicLine: true, keyFact: "Déporté à Babylone par Nabuchodonosor" }] },
    { generationNumber: 16, people: [{ id: "shealtiel", name: "Salathiel", hebrewName: "שְׁאַלְתִּיאֵל", lifespan: "Non précisée", ageAtFirstSon: null, role: "Fils de Jéchonias, en exil babylonien", reference: "Matthieu 1:12", isMessianicLine: true, keyFact: "Première génération de la lignée en exil babylonien" }] },
    { generationNumber: 17, people: [{ id: "zerubbabel", name: "Zorobabel", hebrewName: "זְרֻבָּבֶל", lifespan: "Non précisée", ageAtFirstSon: null, role: "Gouverneur au retour d'exil", reference: "Esdras 2–3 ; Matthieu 1:12-13", isMessianicLine: true, keyFact: "Dirigea le retour de Babylone et posa les fondations du Second Temple" }] },
    { generationNumber: 18, people: [{ id: "abiud", name: "Abiud", hebrewName: "אֲבִיהוּד", lifespan: "Non précisée", ageAtFirstSon: null, role: "Fils de Zorobabel", reference: "Matthieu 1:13", isMessianicLine: true, keyFact: "Génération post-exilique dans la lignée royale davidique" }] },
    { generationNumber: 19, people: [{ id: "eliakim", name: "Eliakim", hebrewName: "אֶלְיָקִים", lifespan: "Non précisée", ageAtFirstSon: null, role: "Fils d'Abiud", reference: "Matthieu 1:13", isMessianicLine: true, keyFact: "Descendant royal de David en période perse" }] },
    { generationNumber: 20, people: [{ id: "azor", name: "Azor", hebrewName: "עָזוֹר", lifespan: "Non précisée", ageAtFirstSon: null, role: "Fils d'Eliakim", reference: "Matthieu 1:13-14", isMessianicLine: true, keyFact: "Lignée davidique maintenue pendant la domination perse puis grecque" }] },
    { generationNumber: 21, people: [{ id: "zadok", name: "Sadoc", hebrewName: "צָדוֹק", lifespan: "Non précisée", ageAtFirstSon: null, role: "Fils d'Azor", reference: "Matthieu 1:14", isMessianicLine: true, keyFact: "Garde de la promesse davidique en période hellénistique" }] },
    { generationNumber: 22, people: [{ id: "achim", name: "Achim", hebrewName: "אָחִים", lifespan: "Non précisée", ageAtFirstSon: null, role: "Fils de Sadoc", reference: "Matthieu 1:14", isMessianicLine: true, keyFact: "Descendant du roi David sous la domination grecque" }] },
    { generationNumber: 23, people: [{ id: "eliud", name: "Eliud", hebrewName: "אֱלִיהוּד", lifespan: "Non précisée", ageAtFirstSon: null, role: "Fils d'Achim", reference: "Matthieu 1:14-15", isMessianicLine: true, keyFact: "Lignée davidique pendant la période maccabéenne" }] },
    { generationNumber: 24, people: [{ id: "eleazar", name: "Éléazar", hebrewName: "אֶלְעָזָר", lifespan: "Non précisée", ageAtFirstSon: null, role: "Fils d'Eliud", reference: "Matthieu 1:15", isMessianicLine: true, keyFact: "Descendant royal de David préservé jusqu'à l'époque romaine" }] },
    { generationNumber: 25, people: [{ id: "matthan", name: "Matthan", hebrewName: "מַתָּן", lifespan: "Non précisée", ageAtFirstSon: null, role: "Fils d'Éléazar", reference: "Matthieu 1:15", isMessianicLine: true, keyFact: "Grand-père de Joseph, père nourricier de Jésus" }] },
    { generationNumber: 26, people: [{ id: "jacob2", name: "Jacob", hebrewName: "יַעֲקֹב", lifespan: "Non précisée", ageAtFirstSon: null, role: "Père de Joseph", reference: "Matthieu 1:15-16", isMessianicLine: true, keyFact: "Père de Joseph, époux de Marie" }] },
    { generationNumber: 27, people: [{ id: "joseph", name: "Joseph", hebrewName: "יוֹסֵף", lifespan: "Non précisée", ageAtFirstSon: null, role: "Père légal et nourricier de Jésus", reference: "Matthieu 1:16 ; Luc 1:27", isMessianicLine: true, keyFact: "Fils de David, époux de Marie mère de Jésus", spouseNames: ["Marie"] }] },
    { generationNumber: 28, people: [{ id: "jesus", name: "Jésus-Christ", hebrewName: "יֵשׁוּעַ הַמָּשִׁיחַ", lifespan: "Éternel", ageAtFirstSon: null, role: "Messie, Fils de Dieu, Sauveur du monde", reference: "Matthieu 1:16 ; Luc 1:31-33", isMessianicLine: true, keyFact: "Né de la Vierge Marie par l'Esprit Saint, accomplissement de toutes les promesses" }] },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// 12 FILS DE JACOB (Genèse 29–35 ; 49)
// ─────────────────────────────────────────────────────────────────────────────
const JACOB_12_TRIBES: LineageData = {
  lineageName: "12 fils de Jacob",
  reference: "Genèse 29-35 ; 49",
  totalGenerations: 2,
  context: "Jacob (Israël) eut 12 fils de quatre femmes : Léa, Rachel, Bilha et Zilpa. Ces 12 fils sont les ancêtres des 12 tribus d'Israël.",
  generations: [
    { generationNumber: 1, people: [{ id: "jacob3", name: "Jacob (Israël)", hebrewName: "יַעֲקֹב / יִשְׂרָאֵל", lifespan: "147 ans", ageAtFirstSon: null, role: "Père des 12 tribus, patriarche d'Israël", reference: "Genèse 25:26 ; 49:33", isMessianicLine: true, keyFact: "Lutta avec Dieu à Peniel et reçut le nom Israël", spouseNames: ["Léa", "Rachel", "Bilha", "Zilpa"] }] },
    {
      generationNumber: 2,
      people: [
        { id: "reuben", name: "Ruben", hebrewName: "רְאוּבֵן", lifespan: "Non précisée", ageAtFirstSon: null, role: "1er fils — Tribu de Ruben", reference: "Genèse 29:32 ; 49:3-4", isMessianicLine: false, keyFact: "Premier-né, perdit sa prérogative pour sa faute avec Bilha" },
        { id: "simeon", name: "Siméon", hebrewName: "שִׁמְעוֹن", lifespan: "Non précisée", ageAtFirstSon: null, role: "2e fils — Tribu de Siméon", reference: "Genèse 29:33 ; 49:5-7", isMessianicLine: false, keyFact: "Détruisit Sichem avec Lévi en vengeance de Dina" },
        { id: "levi", name: "Lévi", hebrewName: "לֵוִי", lifespan: "137 ans", ageAtFirstSon: null, role: "3e fils — Tribu de Lévi", reference: "Genèse 29:34 ; Exode 6:16", isMessianicLine: false, keyFact: "Sa tribu fut choisie pour le service du Tabernacle" },
        { id: "judah2", name: "Juda", hebrewName: "יְהוּדָה", lifespan: "Non précisée", ageAtFirstSon: null, role: "4e fils — Tribu royale et messianique", reference: "Genèse 29:35 ; 49:8-12", isMessianicLine: true, keyFact: "Le sceptre ne s'éloignera pas de Juda jusqu'au Shiloh" },
        { id: "dan", name: "Dan", hebrewName: "דָּן", lifespan: "Non précisée", ageAtFirstSon: null, role: "5e fils (Bilha) — Tribu de Dan", reference: "Genèse 30:6 ; 49:16-18", isMessianicLine: false, keyFact: "Dan jugera son peuple comme l'une des tribus d'Israël" },
        { id: "naphtali", name: "Nephtali", hebrewName: "נַפְתָּלִי", lifespan: "Non précisée", ageAtFirstSon: null, role: "6e fils (Bilha) — Tribu de Nephtali", reference: "Genèse 30:8 ; 49:21", isMessianicLine: false, keyFact: "Biche en liberté, il emploie de belles paroles" },
        { id: "gad", name: "Gad", hebrewName: "גָּד", lifespan: "Non précisée", ageAtFirstSon: null, role: "7e fils (Zilpa) — Tribu de Gad", reference: "Genèse 30:11 ; 49:19", isMessianicLine: false, keyFact: "Une troupe l'attaquera mais il la poursuivra" },
        { id: "asher", name: "Aser", hebrewName: "אָשֵׁר", lifespan: "Non précisée", ageAtFirstSon: null, role: "8e fils (Zilpa) — Tribu d'Aser", reference: "Genèse 30:13 ; 49:20", isMessianicLine: false, keyFact: "Sa nourriture sera excellente, il fournira les délices d'un roi" },
        { id: "issachar", name: "Issacar", hebrewName: "יִשָּׂשכָר", lifespan: "Non précisée", ageAtFirstSon: null, role: "9e fils — Tribu d'Issacar", reference: "Genèse 30:18 ; 49:14-15", isMessianicLine: false, keyFact: "Un âne robuste, couché entre les étables" },
        { id: "zebulun", name: "Zabulon", hebrewName: "זְבוּלוּן", lifespan: "Non précisée", ageAtFirstSon: null, role: "10e fils — Tribu de Zabulon", reference: "Genèse 30:20 ; 49:13", isMessianicLine: false, keyFact: "Habitera sur le bord de la mer, côté de Sidon" },
        { id: "joseph2", name: "Joseph", hebrewName: "יוֹסֵף", lifespan: "110 ans", ageAtFirstSon: null, role: "11e fils — Vice-roi d'Égypte", reference: "Genèse 30:24 ; 49:22-26", isMessianicLine: false, keyFact: "Vendu par ses frères, devint le sauveur de toute la famille" },
        { id: "benjamin", name: "Benjamin", hebrewName: "בִּנְיָ民", lifespan: "Non précisée", ageAtFirstSon: null, role: "12e fils (Rachel) — Tribu de Benjamin", reference: "Genèse 35:18 ; 49:27", isMessianicLine: false, keyFact: "Né sur la route d'Ephrata lors de la mort de Rachel" },
      ],
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Export principal
// ─────────────────────────────────────────────────────────────────────────────
export const GENEALOGY_DATA: Record<string, LineageData> = {
  "adam-noah": ADAM_TO_NOAH,
  "noah-abraham": NOAH_TO_ABRAHAM,
  "abraham-david": ABRAHAM_TO_DAVID,
  "david-jesus": DAVID_TO_JESUS,
  "jacob-12-tribes": JACOB_12_TRIBES,
};
