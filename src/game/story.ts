import type { StarterLineName } from "./creatureFactory";
import type { TrainerCreature } from "./trainers";
import { getStage } from "./zoneProgression";

/**
 * The story of A Maltese Tale.
 *
 * Deep under Paola, in the Ħal Saflieni Hypogeum, the temple builders left something behind:
 * the Crux, the old power of the islands, sleeping in the stones. The four Keepers — the gym
 * leaders — each guard one of its seals. Now the Crux Lens has been stolen from the
 * Hypogeum's Oracle Room, and the megaliths are going dim. Behind it is the Black Lantern, a
 * ring of relic smugglers led by the Baron Valerju Montalto, who means to drain the Crux and
 * wake the islands' three guardians for himself.
 *
 * The player crosses the islands, and seven thousand years of their history, to stop him:
 *   I   The Temple Builders   (stages 1–5)  Hypogeum, cart ruts, Mdina
 *   II  Shipwreck and Siege   (stages 6–10) Phoenician Marsaxlokk, St Paul, the Great Siege
 *   III The Oracle's Warning  (stages 11–15) Blue Grotto, Comino, Mnajdra's sunrise
 *   IV  The Grand Harbour     (stages 16–20) Għar Dalam, Ġgantija, the Santa Marija convoy
 *
 * Every line is written in English and Maltese side by side. Everything here is data; the
 * rules for what plays when are the functions at the bottom, kept free of React.
 */

export type CharacterId =
  | "narrator"
  | "abela"
  | "luca"
  | "baron"
  | "carmela"
  | "lantern"
  | "ganni"
  | "pawl"
  | "fra_anton"
  | "kaptan"
  | "dun_gorg"
  | "brimlu"
  | "sansuna"
  | "xprunara";

export interface PortraitLook {
  skin: string;
  hair: string;
  top: string;
  accent: string;
  hat?: "cap" | "hood" | "tricorn" | "veil" | "beret" | "mitre";
  beard?: boolean;
  glasses?: boolean;
}

export interface Character {
  id: CharacterId;
  name: { en: string; mt: string };
  role: { en: string; mt: string };
  look: PortraitLook;
}

export interface Line {
  who: CharacterId;
  en: string;
  mt: string;
}

const L = (who: CharacterId, en: string, mt: string): Line => ({ who, en, mt });

export const CHARACTERS: Record<CharacterId, Character> = {
  narrator: { id: "narrator", name: { en: "", mt: "" }, role: { en: "", mt: "" }, look: { skin: "#e8d9b8", hair: "#e8d9b8", top: "#e8d9b8", accent: "#e8d9b8" } },
  abela: {
    id: "abela",
    name: { en: "Dr Tereża Abela", mt: "Dr Tereża Abela" },
    role: { en: "Archaeologist at the Hypogeum", mt: "Arkeologa fl-Ipoġew" },
    look: { skin: "#e3b48c", hair: "#4a2e1e", top: "#2e6f8f", accent: "#e0a53a", glasses: true },
  },
  luca: {
    id: "luca",
    name: { en: "Luca", mt: "Luca" },
    role: { en: "Your oldest friend, from Żebbuġ", mt: "L-eqdem ħabib tiegħek, minn Ħaż-Żebbuġ" },
    look: { skin: "#f0c8a0", hair: "#2a1a10", top: "#c8423a", accent: "#f0c94a", hat: "cap" },
  },
  baron: {
    id: "baron",
    name: { en: "Baron Valerju Montalto", mt: "Il-Barun Valerju Montalto" },
    role: { en: "Master of the Black Lantern", mt: "Sid il-Fanal l-Iswed" },
    look: { skin: "#e8c4a0", hair: "#9a9a9a", top: "#1d1d26", accent: "#b88a2a", beard: true, hat: "tricorn" },
  },
  carmela: {
    id: "carmela",
    name: { en: "Carmela, il-Kaptana", mt: "Carmela, il-Kaptana" },
    role: { en: "Smuggler captain of the Black Lantern", mt: "Kaptana kuntrabandista tal-Fanal l-Iswed" },
    look: { skin: "#d9a67a", hair: "#1d1d1d", top: "#2f4f6a", accent: "#c8423a", hat: "beret" },
  },
  lantern: {
    id: "lantern",
    name: { en: "Lantern Hand", mt: "Id tal-Fanal" },
    role: { en: "Black Lantern smuggler", mt: "Kuntrabandist tal-Fanal l-Iswed" },
    look: { skin: "#d9b08a", hair: "#2a2a2a", top: "#26262e", accent: "#b88a2a", hat: "hood" },
  },
  ganni: {
    id: "ganni",
    name: { en: "Nannu Ġanni", mt: "Nannu Ġanni" },
    role: { en: "Farmer and storyteller", mt: "Bidwi u rakkontatur" },
    look: { skin: "#d9a67a", hair: "#e8e8e8", top: "#6b5a3a", accent: "#e8d9b8", hat: "cap", beard: true },
  },
  pawl: {
    id: "pawl",
    name: { en: "Fr Pawl", mt: "Patri Pawl" },
    role: { en: "Friar of Rabat", mt: "Patri minn Ħal Rabat" },
    look: { skin: "#f0c8a0", hair: "#6b4a2a", top: "#f4f0e6", accent: "#1d1d1d", hat: "hood" },
  },
  fra_anton: {
    id: "fra_anton",
    name: { en: "Fra Anton", mt: "Fra Anton" },
    role: { en: "Keeper of the Knights' records", mt: "Kustodju tar-rekords tal-Kavallieri" },
    look: { skin: "#e8c4a0", hair: "#5a4a3a", top: "#b8202a", accent: "#ffffff", beard: true },
  },
  kaptan: {
    id: "kaptan",
    name: { en: "Kaptan Ġużi", mt: "Il-Kaptan Ġużi" },
    role: { en: "Old harbour pilot", mt: "Pilota qadim tal-port" },
    look: { skin: "#c89670", hair: "#d8d8d8", top: "#1f3a5a", accent: "#f0c94a", hat: "cap", beard: true },
  },
  dun_gorg: {
    id: "dun_gorg",
    name: { en: "Dun Ġorġ", mt: "Dun Ġorġ" },
    role: { en: "Keeper of the Silent City", mt: "Għassies tal-Belt Siekta" },
    look: { skin: "#e8c4a0", hair: "#3a3a3a", top: "#1d1d1d", accent: "#ffffff", glasses: true },
  },
  brimlu: {
    id: "brimlu",
    name: { en: "Castellan Brimlu", mt: "Il-Kastellan Brimlu" },
    role: { en: "Warden of the Harbour Forts", mt: "Gwardjan tal-Fortizzi tal-Port" },
    look: { skin: "#d9a67a", hair: "#4a3a2a", top: "#6a6f7a", accent: "#b8202a", beard: true },
  },
  sansuna: {
    id: "sansuna",
    name: { en: "Oracle Sansuna", mt: "L-Oraklu Sansuna" },
    role: { en: "Voice of the Temple Builders", mt: "Leħen il-Bennejja tat-Tempji" },
    look: { skin: "#c8906a", hair: "#1d1d1d", top: "#8a4a8f", accent: "#e0a53a", hat: "veil" },
  },
  xprunara: {
    id: "xprunara",
    name: { en: "Admiral Xprunara", mt: "L-Ammirall Xprunara" },
    role: { en: "Master of the Grand Harbour", mt: "Sid il-Port il-Kbir" },
    look: { skin: "#e3b48c", hair: "#f4f4f4", top: "#1f3a6a", accent: "#f0c94a", hat: "tricorn" },
  },
};

export interface StoryScene {
  id: string;
  chapter: number;
  lines: Line[];
}

export const CHAPTERS: { number: number; title: { en: string; mt: string } }[] = [
  { number: 1, title: { en: "I · The Temple Builders", mt: "I · Il-Bennejja tat-Tempji" } },
  { number: 2, title: { en: "II · Shipwreck and Siege", mt: "II · Nawfraġju u Assedju" } },
  { number: 3, title: { en: "III · The Oracle's Warning", mt: "III · It-Twissija tal-Oraklu" } },
  { number: 4, title: { en: "IV · The Grand Harbour", mt: "IV · Il-Port il-Kbir" } },
  { number: 5, title: { en: "Epilogue", mt: "Epilogu" } },
];

/** Plays the first time the player stands on the map, straight after choosing a partner. */
export const PROLOGUE: StoryScene = {
  id: "prologue",
  chapter: 1,
  lines: [
    L("narrator", "Ħal Saflieni Hypogeum, Paola. Five thousand years ago the temple builders carved these halls out of the living rock, and laid their dead to rest in them.", "L-Ipoġew ta' Ħal Saflieni, Raħal Ġdid. Ħamest elef sena ilu l-bennejja tat-tempji qatgħu dawn is-swali mill-blat ħaj, u fihom difnu l-mejtin tagħhom."),
    L("abela", "Good, you came. And you brought your partner — it chose you well. Listen: last night someone got into the Oracle Room.", "Tajjeb, ġejt. U ġibt lil sieħbek — għażlek tajjeb. Isma': ilbieraħ filgħaxija xi ħadd daħal fil-Kamra tal-Oraklu."),
    L("abela", "They took the Crux Lens: a disc of polished stone the temple builders left here. It focuses the Crux — the old power that sleeps in every megalith on these islands.", "Ħadu l-Lenti tal-Crux: diska ta' ġebla illustrata li ħallew hawn il-bennejja. Tiffoka l-Crux — il-qawwa l-qadima li torqod f'kull megalitu ta' dawn il-gżejjer."),
    L("abela", "Since it vanished, the stones have been going dim. And at the door, this was left behind — a lantern, painted black.", "Minn meta sparixxiet, il-ġebel qed jiċċajpar. U fil-bieb, ħallew dan warajhom — fanal, miżbugħ iswed."),
    L("abela", "The four Keepers of the islands each guard one of the Crux's seals. Earn their medals, and they'll trust you with what they know. Find who took the Lens.", "L-erba' Għassiesa tal-gżejjer kull wieħed jgħasses siġill tal-Crux. Irbaħ il-midalji tagħhom, u jafdawk b'dak li jafu. Sib min ħa l-Lenti."),
    L("luca", "Hey! You're not going without me. I've got a partner too now — and I've been waiting all my life for an adventure like this.", "Ejja! M'intix sejjer mingħajri. Issa għandi sieħeb jien ukoll — u ilni nistenna ħajti kollha avventura bħal din."),
    L("luca", "Race you to Mdina. Whoever gets the first medal buys the pastizzi.", "Nisfidak sal-Imdina. Min jieħu l-ewwel midalja jħallas il-pastizzi."),
  ],
};

/** The first time the player walks into certain zones: a local, and a piece of history. */
export const ENTRY_SCENES: Record<string, StoryScene> = {
  melita_woods: {
    id: "enter:melita_woods",
    chapter: 1,
    lines: [
      L("ganni", "Ah, a young one with a partner. These are old woods — the Knights planted them for their hunting, by Verdala Palace. Buskett, we call them.", "Ah, żagħżugħ b'sieħbu. Dawn imsaġar qodma — il-Kavallieri ħawluhom għall-kaċċa, ħdejn il-Palazz Verdala. Il-Buskett, insejħulhom."),
      L("ganni", "But the stones are older than any Knight. The temple builders were farming these fields before anyone had heard of Rome.", "Imma l-ġebel eqdem minn kull kavallier. Il-bennejja tat-tempji kienu jaħdmu dawn l-għelieqi qabel ma xi ħadd kien sema' b'Ruma."),
      L("ganni", "Keep to the road if you want to make time. The long grass is where the creatures sleep.", "Żomm mat-triq jekk trid tgħaġġel. Il-ħaxix twil huwa fejn jorqdu l-kreaturi."),
    ],
  },
  dingli_cliffs: {
    id: "enter:dingli_cliffs",
    chapter: 1,
    lines: [
      L("narrator", "Near the cliffs, grooves run through the bare rock in pairs, crossing and splitting like a railway junction — the cart ruts of Misraħ Għar il-Kbir.", "Qrib l-irdumijiet, kanali jgħaddu mill-blat mikxuf f'pari, jaqsmu u jinfirdu bħal salib ta' ferrovija — il-binarji ta' Misraħ Għar il-Kbir."),
      L("ganni", "Nobody knows for sure who cut them, or how. Some say sledges, some say carts. I say the stones remember, even if we don't.", "Ħadd ma jaf żgur min qatagħhom, jew kif. Uħud jgħidu slitti, oħrajn karrettuni. Jien ngħid li l-ġebel jiftakar, anki jekk aħna ma niftakrux."),
    ],
  },
  mdina_bastions: {
    id: "enter:mdina_bastions",
    chapter: 1,
    lines: [
      L("narrator", "Mdina — the Silent City. The Romans called it Melite; the Arabs walled it off from Rabat and gave it the name it still carries.", "L-Imdina — il-Belt Siekta. Ir-Rumani sejħulha Melite; l-Għarab issiġġillawha minn Ħal Rabat u tawha l-isem li għadha ġġorr."),
      L("dun_gorg", "Every stone of these bastions has heard three thousand years of footsteps. The first seal of the Crux lies under this city. Show me you're worthy of it.", "Kull ġebla ta' dawn is-swar semgħet tlett elef sena ta' passi. L-ewwel siġill tal-Crux jinsab taħt din il-belt. Urini li jistħoqqlok."),
    ],
  },
  marsaxlokk_bay: {
    id: "enter:marsaxlokk_bay",
    chapter: 2,
    lines: [
      L("narrator", "Marsaxlokk. Phoenician sailors put in here nearly three thousand years ago and built a sanctuary to Astarte on the hill at Tas-Silġ. The painted luzzi still carry the eye they brought.", "Marsaxlokk. Baħrin Feniċi daħlu hawn kważi tlett elef sena ilu u bnew santwarju lil Astarte fuq l-għolja ta' Tas-Silġ. Il-luzzijiet miżbugħa għadhom iġorru l-għajn li ġabu magħhom."),
      L("abela", "The Black Lantern has been seen moving crates through the fish market at night. Be careful — they're not just thieves. They know what they're looking for.", "Il-Fanal l-Iswed deher iġorr kaxxi mis-suq tal-ħut bil-lejl. Oqgħod attent — mhumiex sempliċement ħallelin. Jafu x'qed ifittxu."),
    ],
  },
  wied_ghasel: {
    id: "enter:wied_ghasel",
    chapter: 2,
    lines: [
      L("narrator", "Wied il-Għasel — the Valley of Honey. Over the ridge rises the great dome of the Mosta Rotunda.", "Wied il-Għasel. Fuq ix-xifer jitla' l-koppla kbira tar-Rotunda tal-Mosta."),
      L("kaptan", "In April 1942 a bomb came straight through that dome while the church was full. It rolled across the floor and never went off. Nobody was hurt. We don't forget a thing like that.", "F'April tal-1942 bomba daħlet dritt minn dik il-koppla waqt li l-knisja kienet mimlija. Iddawret mal-art u qatt ma splodiet. Ħadd ma weġġa'. Ħaġa bħal dik ma ninsewhiex."),
    ],
  },
  simar_wetlands: {
    id: "enter:simar_wetlands",
    chapter: 2,
    lines: [
      L("pawl", "Look out past the bay — those little islands are Selmunett, St Paul's Islands. In the year 60, a ship taking Paul to Rome as a prisoner ran aground there in a storm.", "Ħares lil hinn mill-bajja — dawk il-gżejjer iż-żgħar huma Selmunett, il-Gżejjer ta' San Pawl. Fis-sena 60, vapur li kien qed jieħu lil Pawlu Ruma bħala priġunier inkalja hemmhekk f'maltempata."),
      L("pawl", "\"The islanders showed us unusual kindness,\" he wrote. They lit a fire for two hundred and seventy-six soaked strangers. That's who we are, at our best.", "\"In-nies tal-gżira ġiebu ruħhom magħna bi ħlewwa kbira,\" kiteb. Qabbdu nar għal mitejn u sitta u sebgħin barrani mxarrbin. Dawk aħna, meta nkunu l-aħjar tagħna."),
    ],
  },
  fort_st_angelo: {
    id: "enter:fort_st_angelo",
    chapter: 2,
    lines: [
      L("fra_anton", "Fort St Angelo. In 1565 the Ottoman fleet came with some forty thousand men. The Knights and the Maltese held these walls for nearly four months under Grand Master de Valette.", "Il-Forti Sant'Anġlu. Fl-1565 il-flotta Ottomana waslet b'xi erbgħin elf raġel. Il-Kavallieri u l-Maltin żammew dawn il-ħitan għal kważi erba' xhur taħt il-Gran Mastru de Valette."),
      L("fra_anton", "Relief came on the eighth of September. We still ring the bells for it — Il-Vittorja. The second seal is here, and the Castellan guards it like the siege never ended.", "L-għajnuna waslet fit-8 ta' Settembru. Għadna nsawtu l-qniepen għaliha — Il-Vittorja. It-tieni siġill jinsab hawn, u l-Kastellan jgħassu daqs li kieku l-assedju qatt ma spiċċa."),
    ],
  },
  azure_caverns: {
    id: "enter:azure_caverns",
    chapter: 3,
    lines: [
      L("narrator", "The Blue Grotto at Wied iż-Żurrieq. In the morning, sunlight comes in under the arches and turns the whole sea to lit glass.", "Il-Blue Grotto f'Wied iż-Żurrieq. Filgħodu, id-dawl tax-xemx jidħol taħt l-arkati u jibdel il-baħar kollu fi ħġieġ imdawwal."),
      L("abela", "The Lantern are using the caves to hide what they've taken. If they have the Lens here, it'll be near the water — the old stories say the Crux runs with the sea.", "Il-Fanal qed juża l-għerien biex jaħbi dak li ħadu. Jekk għandhom il-Lenti hawn, tkun qrib l-ilma — l-istejjer qodma jgħidu li l-Crux jiġri mal-baħar."),
    ],
  },
  comino_lagoon: {
    id: "enter:comino_lagoon",
    chapter: 3,
    lines: [
      L("narrator", "Comino. Grand Master Wignacourt raised St Mary's Tower here in 1618 to keep the corsairs out. For centuries after, it was a smugglers' island all the same.", "Kemmuna. Il-Gran Mastru Wignacourt bena t-Torri ta' Santa Marija hawn fl-1618 biex iżomm il-kursari 'l barra. Għal sekli wara, xorta baqgħet gżira tal-kuntrabandisti."),
    ],
  },
  hagar_qim: {
    id: "enter:hagar_qim",
    chapter: 3,
    lines: [
      L("sansuna", "Ħaġar Qim, and Mnajdra below it, on the cliff. The builders set Mnajdra's doorway so that on the equinox the rising sun shines straight through it, onto the altar.", "Ħaġar Qim, u l-Imnajdra taħtu, fuq l-irdum. Il-bennejja poġġew il-bieb tal-Imnajdra b'mod li fl-ekwinozju x-xemx titla' u tiddi dritt minnu, fuq l-artal."),
      L("sansuna", "That is what your Baron wants. With the Lens held in that light, and the seals broken, the whole Crux of the islands can be poured into one vessel. Into him.", "Dak li jrid il-Barun tiegħek. Bil-Lenti miżmuma f'dak id-dawl, u bis-siġilli mkissra, il-Crux kollu tal-gżejjer jista' jitferra' f'reċipjent wieħed. Fih."),
    ],
  },
  ggantija_terrace: {
    id: "enter:ggantija_terrace",
    chapter: 4,
    lines: [
      L("ganni", "Ġgantija — the giants' tower. Older than the pyramids of Egypt. In Gozo they say a giantess called Sansuna carried these stones here on her head, with her baby on her hip.", "Il-Ġgantija — it-torri tal-ġganti. Eqdem mill-piramidi tal-Eġittu. Għawdex jgħidu li ġgantessa jisimha Sansuna ġarret dan il-ġebel fuq rasha, bit-tarbija fuq ġenbha."),
      L("ganni", "The Oracle carries her name for a reason. The stones here feel thin now. Hurry.", "L-Oraklu jġorr isimha għal xi raġuni. Il-ġebel hawn issa jinħass irqiq. Għaġġel."),
    ],
  },
  ghar_dalam: {
    id: "enter:ghar_dalam",
    chapter: 4,
    lines: [
      L("abela", "Għar Dalam — the Cave of Darkness. The oldest bones in Malta: dwarf elephants and hippos, from when the islands were joined to Sicily by land.", "Għar Dalam. L-eqdem għadam f'Malta: iljunfanti u ippopotami nani, minn meta l-gżejjer kienu magħqudin ma' Sqallija bl-art."),
      L("abela", "And the first people. Farmers who crossed from Sicily nearly eight thousand years ago. Everything the Baron wants to own started with them.", "U l-ewwel nies. Bdiewa li qasmu minn Sqallija kważi tmint elef sena ilu. Kull ma jrid il-Barun jippossjedi beda magħhom."),
    ],
  },
  grand_harbour: {
    id: "enter:grand_harbour",
    chapter: 4,
    lines: [
      L("kaptan", "The Grand Harbour. On the fifteenth of August 1942 I watched the tanker Ohio come in here, her decks awash, lashed between two destroyers. The Santa Marija convoy. She kept the island alive.", "Il-Port il-Kbir. Fil-15 ta' Awwissu 1942 rajt it-tanker Ohio dieħla hawn, il-gverta taħt l-ilma, marbuta bejn żewġ destrojers. Il-konvoj ta' Santa Marija. Żammet il-gżira ħajja."),
      L("kaptan", "That spring the King gave the whole island the George Cross. Whatever the Baron's planning, he'll find we're not easy to break.", "Dik ir-rebbiegħa s-Sultan ta l-gżira kollha l-George Cross. Ikun x'ikun il-pjan tal-Barun, jara li mhux faċli jkissirna."),
    ],
  },
};

/** After each medal, back on the map: what the Keeper tells you. */
export const MEDAL_SCENES: Record<string, StoryScene> = {
  silent_city: {
    id: "medal:silent_city",
    chapter: 1,
    lines: [
      L("dun_gorg", "You fight with your partner, not through it. Good. Then hear this: someone came to the cathedral archive last week asking about the seals. Grey beard, black coat. He signed as \"V. Montalto\".", "Tiġġieled ma' sieħbek, mhux permezz tiegħu. Tajjeb. Mela isma': xi ħadd ġie fl-arkivju tal-katidral il-ġimgħa l-oħra jistaqsi fuq is-siġilli. Daqna griża, kowt iswed. Iffirma \"V. Montalto\"."),
      L("baron", "The Abela girl's little courier. Keep your medal, child. Seals are only locks — and I have been collecting keys for thirty years.", "Il-kurrier żgħir tat-tfajla Abela. Żomm il-midalja tiegħek, tifel. Is-siġilli huma biss serraturi — u jien ilni tletin sena niġbor iċ-ċwievet."),
      L("abela", "Montalto. An old collector — he's been banned from every museum on the island. If he's leading the Black Lantern, the Lens is the least of what he's after.", "Montalto. Kollettur qadim — ilu pprojbit minn kull mużew fil-gżira. Jekk hu qed imexxi l-Fanal l-Iswed, il-Lenti hija l-inqas minn dak li jrid."),
    ],
  },
  great_siege: {
    id: "medal:great_siege",
    chapter: 2,
    lines: [
      L("brimlu", "Four hundred years this fort has stood between the harbour and whoever wanted it. You've earned the second medal.", "Erba' mitt sena ilu dan il-forti jinsab bejn il-port u kull min ried jiħdu. Qlajt it-tieni midalja."),
      L("brimlu", "But while you fought me, the Lantern broke into the fort's lower vault. The second seal is cracked. Whatever he's doing, he's doing it seal by seal.", "Imma waqt li kont qed tiġġieled miegħi, il-Fanal daħal fil-kantina t'isfel tal-forti. It-tieni siġill inqasam. Ikun x'ikun qed jagħmel, qed jagħmlu siġill b'siġill."),
      L("abela", "Then we go to the Oracle. If anyone knows what he's building towards, it's Sansuna at Ħaġar Qim.", "Mela mmorru għand l-Oraklu. Jekk xi ħadd jaf lejn xiex qed jibni, hija Sansuna f'Ħaġar Qim."),
    ],
  },
  solstice: {
    id: "medal:solstice",
    chapter: 3,
    lines: [
      L("sansuna", "The third seal holds, for now, because you held. Take the Solstice Medal.", "It-tielet siġill iżomm, għalissa, għax żammejt int. Ħu l-Midalja tas-Solstizju."),
      L("sansuna", "He will not wait for the equinox now. There is another way: where the most Crux has ever gathered — where the whole island once stood together. The Grand Harbour.", "Issa mhux se jistenna l-ekwinozju. Hemm mod ieħor: fejn inġabar l-iktar Crux qatt — fejn il-gżira kollha darba qagħdet flimkien. Il-Port il-Kbir."),
    ],
  },
  grand_harbour: {
    id: "medal:grand_harbour",
    chapter: 4,
    lines: [
      L("xprunara", "Four medals. The Keepers stand behind you. And look — the harbour lights are going out, one by one.", "Erba' midalji. L-Għassiesa warajk. U ħares — id-dwal tal-port qed jintfew, wieħed wieħed."),
      L("baron", "Too late, all of you. The Lens is lit and the last seal is mine. Come and watch the islands kneel.", "Tard wisq, ilkoll kemm intom. Il-Lenti mixgħula u l-aħħar siġill tiegħi. Ejjew araw il-gżejjer jinżlu għarkobbtejhom."),
    ],
  },
};

/** The story's own fights. Each stands on its map until beaten; the ids double as trainer ids. */
export interface StoryBattle {
  id: string;
  zoneId: string;
  who: CharacterId;
  chapter: number;
  requiresMedals?: string[];
  /** Other story battles to finish first. */
  after?: string[];
  /** The party, which for Luca depends on which partner you chose. */
  party: (line: StarterLineName) => TrainerCreature[];
  before: Line[];
  win: Line[];
  reward?: { itemId?: string; quantity?: number };
  /** The last battle of the story. */
  finale?: boolean;
}

/** Luca always picks the starter line strong against yours. */
const RIVAL_LINE: Record<StarterLineName, StarterLineName> = { Grass: "Fire", Fire: "Water", Water: "Grass" };
const STARTER_STAGES: Record<StarterLineName, [string, number, string, number, string]> = {
  Grass: ["calfleaf", 16, "vinehorn", 36, "mosstaur"],
  Fire: ["pharawoof", 17, "infernux", 34, "pyrollis"],
  Water: ["duckling", 15, "platyflow", 33, "marinedge"],
};
export function rivalStarter(playerLine: StarterLineName, level: number): TrainerCreature {
  const [one, first, two, second, three] = STARTER_STAGES[RIVAL_LINE[playerLine]];
  return { speciesId: level >= second ? three : level >= first ? two : one, level };
}

export const STORY_BATTLES: StoryBattle[] = [
  {
    id: "story-luca-1",
    zoneId: "dingli_cliffs",
    who: "luca",
    chapter: 1,
    party: (line) => [{ speciesId: "hamiemu", level: 10 }, rivalStarter(line, 12)],
    before: [
      L("luca", "There you are! I've been training on the cliffs all morning. Let's see whose partner is ready for the Keepers.", "Hawn int! Ilni nitħarreġ fuq l-irdumijiet mill-għodu. Ejja naraw is-sieħeb ta' min lest għall-Għassiesa."),
    ],
    win: [
      L("luca", "Ugh. Fine — you're buying yourself the pastizzi, then. But I'll get you next time. I need to be somebody on this trip, you know?", "Uff. Tajjeb — mela tixtrihom int il-pastizzi. Imma darb'oħra naqbdek. Għandi bżonn inkun xi ħadd f'dan il-vjaġġ, taf?"),
    ],
  },
  {
    id: "story-lantern-1",
    zoneId: "ramla_dunes",
    who: "lantern",
    chapter: 1,
    party: () => [{ speciesId: "sirokk", level: 14 }, { speciesId: "hilalux", level: 15 }],
    before: [
      L("lantern", "Oi. This dune's closed, kid. The Baron's got people digging here and he doesn't like an audience.", "Ejja. Din id-duna magħluqa, tifel. Il-Barun għandu nies iħaffru hawn u ma jħobbx min jara."),
    ],
    win: [
      L("lantern", "Tch. Doesn't matter. The Lens is already safe with the Baron. You'll never even see it.", "Ċċ. Ma jimpurtax. Il-Lenti diġà sigura għand il-Barun. Qatt m'hu se tarah."),
    ],
  },
  {
    id: "story-carmela-1",
    zoneId: "marsaxlokk_bay",
    who: "carmela",
    chapter: 2,
    requiresMedals: ["silent_city"],
    party: () => [{ speciesId: "murexil", level: 20 }, { speciesId: "marsupp", level: 21 }],
    before: [
      L("carmela", "So you're the one Dun Ġorġ gave a medal to. I run the boats for the Black Lantern. Everything that leaves this bay at night leaves because I say so.", "Mela int dak li tah midalja Dun Ġorġ. Jien immexxi d-dgħajjes tal-Fanal l-Iswed. Kull ma joħroġ minn din il-bajja bil-lejl joħroġ għax ngħid jien."),
    ],
    win: [
      L("carmela", "Hm. You're not bad. The Baron pays well, kid, but he doesn't pay enough to lose to children. We'll meet again.", "Hm. M'intix ħażin. Il-Barun iħallas tajjeb, tifel, imma mhux biżżejjed biex nitlef kontra t-tfal. Nerġgħu niltaqgħu."),
    ],
  },
  {
    id: "story-lantern-2",
    zoneId: "sirocco_flats",
    who: "lantern",
    chapter: 2,
    requiresMedals: ["silent_city"],
    party: () => [{ speciesId: "sirokk", level: 25 }, { speciesId: "xrobbog", level: 26 }],
    before: [
      L("lantern", "The sirocco covers our tracks out here. Or it did, until you turned up.", "Ix-xlokk jaħbi l-passi tagħna hawn barra. Jew kien, sakemm ġejt int."),
    ],
    win: [
      L("lantern", "You're wasting your time. We've got a new recruit — someone who knows exactly how you fight.", "Qed taħli ħinek. Għandna rekluta ġdida — xi ħadd li jaf eżattament kif tiġġieled."),
    ],
  },
  {
    id: "story-luca-2",
    zoneId: "simar_wetlands",
    who: "luca",
    chapter: 2,
    requiresMedals: ["silent_city"],
    after: ["story-luca-1"],
    party: (line) => [{ speciesId: "hilalux", level: 27 }, rivalStarter(line, 29)],
    before: [
      L("luca", "Don't look at me like that. The Baron came to Żebbuġ himself. He said I could be part of history instead of just reading about it.", "Tħarisx lejja hekk. Il-Barun ġie Ħaż-Żebbuġ hu stess. Qalli li nista' nkun parti mill-istorja minflok naqra fuqha biss."),
      L("luca", "He gave me this Hilalux. And he says when the Crux is his, there'll be a place for me. So I'm not letting you stop him.", "Tani dan il-Hilalux. U jgħid li meta l-Crux ikun tiegħu, ikun hemm post għalija. Għalhekk mhux se nħallik twaqqfu."),
    ],
    win: [
      L("luca", "...Why does it feel worse to lose now than it did at Dingli?", "...Għaliex jinħass agħar nitlef issa milli fid-Dingli?"),
      L("pawl", "Paul was shipwrecked right there, you know, and it was the islanders' kindness he remembered. Think about whose side you want to be remembered on, son.", "Pawlu ġarrab nawfraġju eżatt hemmhekk, taf, u kienet il-ħlewwa tan-nies tal-gżira li ftakar. Aħseb fuq in-naħa ta' min trid li jiftakruk, ibni."),
    ],
  },
  {
    id: "story-lantern-3",
    zoneId: "azure_caverns",
    who: "lantern",
    chapter: 3,
    requiresMedals: ["great_siege"],
    party: () => [{ speciesId: "marsuppjun", level: 37 }, { speciesId: "bornaduru", level: 38 }],
    before: [
      L("lantern", "The Lens was here this morning. It's gone to Comino now — Carmela's boat. You're always one step behind.", "Il-Lenti kienet hawn dalgħodu. Issa marret Kemmuna — fuq id-dgħajsa ta' Carmela. Dejjem pass lura int."),
    ],
    win: [
      L("lantern", "Go on, then. Comino. See how far you get past the tower.", "Mela mur. Kemmuna. Ara kemm tasal wara t-torri."),
    ],
  },
  {
    id: "story-luca-3",
    zoneId: "comino_lagoon",
    who: "luca",
    chapter: 3,
    requiresMedals: ["great_siege"],
    after: ["story-luca-2"],
    party: (line) => [{ speciesId: "falkun", level: 42 }, { speciesId: "hilaluna", level: 43 }, rivalStarter(line, 44)],
    before: [
      L("luca", "I saw what's in Carmela's hold. It isn't just the Lens. He's been draining the megaliths into jars. The stones at Ġgantija are almost dark.", "Rajt x'hemm fl-istiva ta' Carmela. Mhijiex biss il-Lenti. Ilu jbattal il-megaliti f'vażetti. Il-ġebel tal-Ġgantija kważi spiċċa mingħajr dawl."),
      L("luca", "I don't know whose side I'm on anymore. So let's settle it the only way we know. Properly, this time.", "Ma nafx aktar fuq in-naħa ta' min jien. Mela ejja nsolvuha bl-uniku mod li nafu. Sewwa, din id-darba."),
    ],
    win: [
      L("luca", "You didn't win because you're stronger. You won because you're fighting for something. I want that back.", "Ma rbaħtx għax int iktar b'saħħtek. Rbaħt għax qed tiġġieled għal xi ħaġa. Irrid dak lura."),
      L("luca", "Here — the Baron gave me these for the job. They'll be better used by you.", "Ħa — il-Barun tahomli għax-xogħol. Jintużaw aħjar minnek."),
    ],
    reward: { itemId: "melitan_ball", quantity: 3 },
  },
  {
    id: "story-carmela-2",
    zoneId: "delimara_point",
    who: "carmela",
    chapter: 4,
    requiresMedals: ["solstice"],
    after: ["story-carmela-1"],
    party: () => [{ speciesId: "tirjanu", level: 49 }, { speciesId: "bastimenta", level: 49 }, { speciesId: "sirokkjun", level: 50 }],
    before: [
      L("carmela", "Delimara. Good place for a last stand — the British built a whole fort on this point to watch the sea. I've watched it all my life.", "Delimara. Post tajjeb għall-aħħar difiża — l-Ingliżi bnew forti sħiħ fuq din il-ponta biex jgħassu l-baħar. Jien ilni ngħassu ħajti kollha."),
      L("carmela", "The Baron thinks the islands belong to whoever's strongest. Let's see if he's right.", "Il-Barun jaħseb li l-gżejjer huma ta' min hu l-iktar b'saħħtu. Ejja naraw jekk għandux raġun."),
    ],
    win: [
      L("carmela", "Then he's wrong. And I've been wrong to carry his crates. Listen: he'll be at the Grand Harbour when the fourth seal breaks. He means to pour the Crux into Siroccus — the wind guardian — and ride it.", "Mela għandu żball. U kont żbaljata nġorrlu l-kaxxi. Isma': ikun fil-Port il-Kbir meta jinkiser ir-raba' siġill. Irid ixerred il-Crux f'Siroccus — l-għassies tar-riħ — u jirkbu."),
      L("carmela", "I'm done with the Lantern. Take these; you'll need them more than I will.", "Spiċċajt mal-Fanal. Ħu dawn; għandek bżonnhom iktar minni."),
    ],
    reward: { itemId: "helwa_tat_tork", quantity: 3 },
  },
  {
    id: "story-lantern-4",
    zoneId: "ghar_dalam",
    who: "lantern",
    chapter: 4,
    requiresMedals: ["solstice"],
    party: () => [{ speciesId: "ossijark", level: 54 }, { speciesId: "bornaduru", level: 55 }],
    before: [
      L("lantern", "The Baron's orders: nobody leaves Għar Dalam until the harbour goes dark. Nothing personal.", "L-ordnijiet tal-Barun: ħadd ma joħroġ minn Għar Dalam sakemm il-port jidlam. Mhux personali."),
    ],
    win: [
      L("lantern", "Forget it. I didn't sign up to fight kids in a cave full of hippo bones.", "Insiha. Ma dħaltx biex niġġieled tfal f'għar mimli għadam tal-ippopotami."),
    ],
  },
  {
    id: "story-luca-4",
    zoneId: "wied_babu",
    who: "luca",
    chapter: 4,
    requiresMedals: ["solstice"],
    after: ["story-luca-3"],
    party: (line) => [{ speciesId: "falkunjier", level: 57 }, { speciesId: "hilaluna", level: 57 }, rivalStarter(line, 58)],
    before: [
      L("luca", "One more round before the harbour. Not as enemies — as the two kids from Żebbuġ who said they'd see the whole island. Don't hold back.", "Round ieħor qabel il-port. Mhux bħala għedewwa — bħala ż-żewġ tfal minn Ħaż-Żebbuġ li qalu li se jaraw il-gżira kollha. Iżżommx lura."),
    ],
    win: [
      L("luca", "That's the partner I want next to me at the harbour. Go get your fourth medal. I'll be right behind you.", "Dak is-sieħeb li rrid ħdejja fil-port. Mur ħu r-raba' midalja tiegħek. Inkun eżatt warajk."),
    ],
  },
  {
    id: "story-baron",
    zoneId: "grand_harbour",
    who: "baron",
    chapter: 4,
    requiresMedals: ["grand_harbour"],
    party: () => [
      { speciesId: "bombardun", level: 63 },
      { speciesId: "granmastru", level: 64 },
      { speciesId: "konvojarma", level: 64 },
      { speciesId: "siroccalis", level: 66 },
    ],
    before: [
      L("baron", "Look at them, these islands. Phoenicians, Romans, Arabs, Normans, Knights, French, British — everyone has owned Malta except the Maltese.", "Arahom, dawn il-gżejjer. Feniċi, Rumani, Għarab, Normanni, Kavallieri, Franċiżi, Ingliżi — kulħadd kellu lil Malta ħlief il-Maltin."),
      L("baron", "So I will. With the Crux poured into Siroccus, no fleet will ever sail into this harbour again unless I allow it.", "Mela se jkolliha jien. Bil-Crux imferra' f'Siroccus, l-ebda flotta qatt ma terġa' tidħol f'dan il-port jekk ma nħallihiex jien."),
      L("luca", "You've got it backwards, old man. It's never belonged to one person. That's the whole point. Go on — show him!", "Qlibtha ta' taħt fuq, xiħ. Qatt ma kienet ta' persuna waħda. Dak hu l-punt kollu. Ejja — urih!"),
    ],
    win: [
      L("baron", "No... the light is leaving the Lens. It's going back — back into the stones.", "Le... id-dawl qed jitlaq mil-Lenti. Qed jerġa' lura — lura fil-ġebel."),
    ],
    reward: { itemId: "crux_lens", quantity: 1 },
    finale: true,
  },
];

/** After the Baron falls. */
export const ENDING: StoryScene = {
  id: "ending",
  chapter: 5,
  lines: [
    L("narrator", "Across the harbour, the lights of Valletta, Birgu, Senglea and Kalkara come back on one by one. On a hill in Gozo, the stones of Ġgantija glow warm again in the dark.", "Madwar il-port, id-dwal tal-Belt, il-Birgu, l-Isla u Kalkara jerġgħu jinxtegħlu wieħed wieħed. Fuq għolja f'Għawdex, il-ġebel tal-Ġgantija jerġa' jiddi sħun fid-dlam."),
    L("abela", "You did it. The Crux is back where it belongs — in every stone, not in one man's hand. Keep the Lens. The Hypogeum has kept enough secrets.", "Għamiltha. Il-Crux reġa' lura fejn hu postu — f'kull ġebla, mhux f'id raġel wieħed. Żomm il-Lenti. L-Ipoġew żamm biżżejjed sigrieti."),
    L("carmela", "The Baron's boats are tied up in the harbour, and he's talking to the police. I'll be taking tourists round Comino from now on. Honest work. Mostly.", "Id-dgħajjes tal-Barun marbuta fil-port, u hu qed ikellem il-pulizija. Minn issa se nieħu t-turisti madwar Kemmuna. Xogħol onest. L-iktar."),
    L("luca", "So. Every stage, every Keeper. What now? ...There are creatures on this island neither of us has even seen yet. Race you?", "Mela. Kull stadju, kull Għassies. Issa x'se nagħmlu? ...Hemm kreaturi f'din il-gżira li l-ebda wieħed minna għadu lanqas biss rahom. Nisfidak?"),
    L("narrator", "The islands are yours to explore. Beat every trainer, fill the Codex, and find what still hides at Filfla and in the Ċittadella Ruins.", "Il-gżejjer huma tiegħek biex tesplorahom. Irbaħ kull trainer, imla l-Codex, u sib x'għad hemm moħbi f'Filfla u fil-Fdalijiet taċ-Ċittadella."),
  ],
};

// ─── Rules ───────────────────────────────────────────────────────────────────────────────────

export interface StoryWorld {
  storyFlags: readonly string[];
  medals: readonly string[];
  defeatedTrainerIds: readonly string[];
}

export function getStoryBattle(id: string): StoryBattle | undefined {
  return STORY_BATTLES.find((b) => b.id === id);
}

/** Whether a story battle's character is standing on their map, waiting. */
export function storyBattleActive(battle: StoryBattle, world: StoryWorld): boolean {
  if (world.defeatedTrainerIds.includes(battle.id)) return false;
  if (!world.storyFlags.includes(PROLOGUE.id)) return false;
  if (battle.requiresMedals?.some((m) => !world.medals.includes(m))) return false;
  if (battle.after?.some((id) => !world.defeatedTrainerIds.includes(id))) return false;
  return true;
}

export function storyBattlesIn(zoneId: string): StoryBattle[] {
  return STORY_BATTLES.filter((b) => b.zoneId === zoneId);
}

/**
 * What the story has to say as the player arrives on a map (or comes back to it from a
 * battle), oldest news first: the prologue, anything a newly-won medal unlocked, what a beaten
 * story character says afterwards, and the zone's own introduction.
 */
export function scenesOnArrival(zoneId: string, world: StoryWorld): StoryScene[] {
  const seen = (id: string) => world.storyFlags.includes(id);
  const scenes: StoryScene[] = [];
  if (!seen(PROLOGUE.id)) scenes.push(PROLOGUE);
  for (const battle of STORY_BATTLES) {
    const id = `${battle.id}:win`;
    if (world.defeatedTrainerIds.includes(battle.id) && !seen(id)) scenes.push({ id, chapter: battle.chapter, lines: battle.win });
  }
  for (const medalId of world.medals) {
    const scene = MEDAL_SCENES[medalId];
    if (scene && !seen(scene.id)) scenes.push(scene);
  }
  const entry = ENTRY_SCENES[zoneId];
  if (entry && !seen(entry.id)) scenes.push(entry);
  const finale = STORY_BATTLES.find((b) => b.finale);
  if (finale && world.defeatedTrainerIds.includes(finale.id) && !seen(ENDING.id)) scenes.push(ENDING);
  return scenes;
}

/** The chapter the player is in: by medals, and the epilogue once the Baron is beaten. */
export function currentChapter(world: StoryWorld): number {
  const finale = STORY_BATTLES.find((b) => b.finale);
  if (finale && world.defeatedTrainerIds.includes(finale.id)) return 5;
  return Math.min(4, world.medals.length + 1);
}

export type StoryObjective =
  | { kind: "battle"; battle: StoryBattle }
  | { kind: "gym"; zoneId: string; medalId: string }
  | { kind: "done" };

/** The next thing the story wants: the earliest unbeaten story fight you can reach, or the next gym. */
export function nextObjective(world: StoryWorld, gyms: { zoneId: string; medalId: string }[]): StoryObjective {
  const stageOf = (zoneId: string) => getStage(zoneId)?.stage ?? 99;
  const open = STORY_BATTLES.filter((b) => storyBattleActive(b, world)).sort((a, b) => stageOf(a.zoneId) - stageOf(b.zoneId));
  const gym = gyms.find((g) => !world.medals.includes(g.medalId));
  if (open.length && (!gym || stageOf(open[0].zoneId) <= stageOf(gym.zoneId) || open[0].finale)) return { kind: "battle", battle: open[0] };
  if (gym) return { kind: "gym", zoneId: gym.zoneId, medalId: gym.medalId };
  return { kind: "done" };
}
