import TogaMedicSkin from "../assets/Skins/Mischievous Anime Medic with Syringe.png";
import GokuElegantSkin from "../assets/Skins/Elegant Drip Goku.jpeg";
import HinataWeddingSkin from "../assets/Skins/Hinata’s Enchanted Bridal Portrait.png"
import NarutoHokageSkin from "../assets/Skins/Naruto’s Hokage Sunset Charge.png"












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
  {
    id: "hinata-blushing-bride",
    characterId: "hinata",
    name: "Blushing Bride",
    image: HinataWeddingSkin,
    rarity: "legendary",
    unlockSource: "festival",
    description:
      "An elegant bridal look for Hinata, adorned in a flowing white wedding gown.",
  },
  {
  id: "naruto-seventh-hokage",
  characterId: "naruto",
  name: "Seventh Hokage",
  image: NarutoHokageSkin,
  rarity: "mythic",
  unlockSource: "festival",
  description: "The Seventh Hokage. Naruto stands as the protector of the Hidden Leaf, wearing his iconic white flame-trimmed cloak.",
},
];
