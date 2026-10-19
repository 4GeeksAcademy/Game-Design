import PicoloArenaImage from "../../assets/img/picolo.jpg";

import ExplodingPineconeImage from "../../assets/img/Attack_IMAGES/ExplodingPinecone.jpeg";
import TabascoStarImage from "../../assets/img/Attack_IMAGES/TabascoStar.jpeg";
import FireBirdStarImage from "../../assets/img/Attack_IMAGES/FireBirdStar.jpeg";
import GasStarImage from "../../assets/img/Attack_IMAGES/GasStar.jpeg";
import FakeHammerImage from "../../assets/img/Attack_IMAGES/FakeHammer.jpeg";

const Picolo = {
  name: "Piccolo",
  image: PicoloArenaImage,

  health: 150,
  mana: 90,
  maximumMana: 90,
  manaRegen: 30,
  cooldown: 3,
  maximumCooldown: 3,
  recovery: 1,
  agility: 25,

  defense: {
    amount: 28,
  },

  attacks: [
    {
      id: "regeneration",
      name: "Namekian Regeneration",
      image: TabascoStarImage,
      damage: 0,
      speed: 0,
      cost: 35,
      state: true,
      buff: {
        health: 30,
      },
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
        mana: 30,
      },
    },

    


    {
      id: "light-grenade",
      name: "Light Grenade",
      image: TabascoStarImage,
      damage: 20,
      speed: 38,
      cost: 10,
      state: true,
      debuff: {
        health: 4,
      },
    },
    
    {
      id: "hellzone-grenade",
      name: "Hellzone Grenade",
      image: FireBirdStarImage,
      damage: 40,
      speed: 48,
      cost: 13,
      state: true,
      debuff: {
        health: 12,
      },
    },

    {
      id: "special-beam-cannon",
      name: "Special Beam Cannon",
      image: ExplodingPineconeImage,
      damage: 45,
      speed: 60,
      cost: 15,
      state: true,
    },
    
    {
      id: "explosive-wave",
      name: "Explosive Wave",
      image: GasStarImage,
      damage: 40,
      speed: 40,
      cost: 20,
      state: true,
      debuff: {
        agility: 10,
        defense: 5,
        maximumCooldown: 2,
      },
    },
    {
      id: "masenko",
      name: "Masenko",
      image: FireBirdStarImage,
      damage: 25,
      speed: 70,
      cost: 27,
      state: true,
    },
  ],
};

export default Picolo;
