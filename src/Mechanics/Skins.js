import TogaMedicSkinGIF from "../assets/Skins/Animated/Mischievous Anime Medic with Syringe.gif";
import TogaMedicSkin from "../assets/Skins/Mischievous Anime Medic with Syringe.png";
import GokuElegantSkin from "../assets/Skins/Animated/Elegant Drip Goku.gif";
import HinataWeddingSkin from "../assets/Skins/Animated/Hinata’s Enchanted Bridal Portrait.gif"
import NarutoHokageSkin from "../assets/Skins/Animated/Naruto’s Hokage Sunset Charge.gif"
import UsoppGangstaSkin from "../assets/Skins/Animated/Usopp in a Golden Graffiti Alley.gif"
import MinaMaidSkin from "../assets/Skins/Animated/Mina Ashido’s Playful Maid Card.gif"





// RARITY: common, uncommon, rare, epic, legendary, mythic
export const skins = [
  {
    id: "toga-mischievous-medic",
    characterId: "toga",
    name: "Mischievous Medic",
    image:  TogaMedicSkinGIF,
    rarity: "rare",
    unlockSource: "festival",
    description: "A mischievous alternate look for Himiko Toga. Who knows what she might do to you...",
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
