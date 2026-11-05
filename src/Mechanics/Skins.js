
import TogaMedicSkin from "../assets/Skins/Mischievous Anime Medic with Syringe.png";
import GokuElegantSkin from "/workspaces/Game-Design/src/assets/Skins/Elegant Drip Goku.jpeg";


// RARITY: common, uncommon, rare, epic, legendary, mythic
export const skins = [
  {
    id: "toga-mischievous-medic",
    characterId: "toga",
    name: "Mischievous Medic",
    image: TogaMedicSkin,
    rarity: "rare",
    unlockSource: "festival",
    description: "A mischievous alternate look for Himiko Toga.",
  },
  {
    id: "goku-elegant-drip",
    characterId: "goku",
    name: "Elegant Drip",
    image: GokuElegantSkin,
    rarity: "legendary",
    unlockSource: "festival",
    description: "Goku flexing with style--uncomprehensible drip.",
  },
];
