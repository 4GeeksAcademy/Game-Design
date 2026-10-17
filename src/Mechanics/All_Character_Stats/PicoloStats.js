import PicoloArenaImage from "../../assets/img/picolo.jpg";

import ExplodingPineconeImage from "../../assets/img/Attack_IMAGES/ExplodingPinecone.jpeg";
import TabascoStarImage from "../../assets/img/Attack_IMAGES/TabascoStar.jpeg";
import FireBirdStarImage from "../../assets/img/Attack_IMAGES/FireBirdStar.jpeg";
import GasStarImage from "../../assets/img/Attack_IMAGES/GasStar.jpeg";
import FakeHammerImage from "../../assets/img/Attack_IMAGES/FakeHammer.jpeg";

const Picolo = {
  name: "Piccolo",
  image: PicoloArenaImage,

  health: 100,
  mana: 65,
  maximumMana: 65,
  manaRegen: 15,
  cooldown: 4,
  maximumCooldown: 4,
  recovery: 1,
  agility: 15,

  defense: {
    amount: 15,
  },

  attacks: [
    {
      id: "special-beam-cannon",
      name: "Special Beam Cannon",
      image: ExplodingPineconeImage,
      damage: 45,
      speed: 35,
      cost: 30,
      state: true,
    },
    {
      id: "hellzone-grenade",
      name: "Hellzone Grenade",
      image: FireBirdStarImage,
      damage: 35,
      speed: 30,
      cost: 25,
      state: true,
    },
    {
      id: "light-grenade",
      name: "Light Grenade",
      image: TabascoStarImage,
      damage: 30,
      speed: 25,
      cost: 20,
      state: true,
    },
    {
      id: "explosive-wave",
      name: "Explosive Wave",
      image: GasStarImage,
      damage: 20,
      speed: 20,
      cost: 15,
      state: true,
      debuff: {
        agility: -10,
      },
    },
    {
      id: "masenko",
      name: "Masenko",
      image: FireBirdStarImage,
      damage: 25,
      speed: 30,
      cost: 15,
      state: true,
    },
    {
      id: "ki-control",
      name: "Ki Control",
      image: GasStarImage,
      damage: 0,
      speed: 0,
      cost: 10,
      state: true,
      buff: {
        defense: 10,
        agility: 5,
      },
    },
    {
      id: "regeneration",
      name: "Namekian Regeneration",
      image: TabascoStarImage,
      damage: 0,
      speed: 0,
      cost: 20,
      state: true,
      buff: {
        health: 20,
      },
    },
  ],
};

export default Picolo;
