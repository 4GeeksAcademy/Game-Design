import TogaMedicSkin from "../assets/Skins/Mischievous Anime Medic with Syringe.png";
import GokuElegantSkin from "../assets/Skins/Elegant Drip Goku.jpeg";
import HinataWeddingSkin from "../assets/Skins/Hinata’s Enchanted Bridal Portrait.png"
import NarutoHokageSkin from "../assets/Skins/Naruto’s Hokage Sunset Charge.png"
import UsoppGangstaSkin from "../assets/Skins/Usopp in a Golden Graffiti Alley.png"
import MinaMaidSkin from "../assets/Skins/Mina Ashido’s Playful Maid Card.png"





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
{
  id: "usopp-gangsta-pirate",
  characterId: "usopp",
  name: "The Gangsta Snippaaa",
  image: UsoppGangstaSkin,
  rarity: "epic",
  unlockSource: "festival",
  description: "Usopp isn't just sniping from the bushes anymore; he's rolling up to Sabaody Archipelago or Egghead Island looking like a true grand-line menace",
},
{
  id: "mina-cheerful-maid",
  characterId: "mina",
  name: "Cheerful Maid",
  image: MinaMaidSkin,
  rarity: "common",
  unlockSource: "festival",
  description: "A cheerful maid outfit that brings out Mina's playful and energetic personality.",
},
];
