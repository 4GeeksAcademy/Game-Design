import KenpachiImage from "/workspaces/Game-Design/src/assets/img/Kenpachi.png";

import ExplodingPineconeImage from "../../assets/img/Attack_IMAGES/ExplodingPinecone.jpeg";
import TabascoStarImage from "../../assets/img/Attack_IMAGES/TabascoStar.jpeg";
import FireBirdStarImage from "../../assets/img/Attack_IMAGES/FireBirdStar.jpeg";
import GasStarImage from "../../assets/img/Attack_IMAGES/GasStar.jpeg";
import FakeHammerImage from "../../assets/img/Attack_IMAGES/FakeHammer.jpeg";



const Kenpachi = {
  name: "Kenpachi Zaraki",
  image: KenpachiImage,
  health: 300,
  maximumHealth: 300,

  mana: 250,
  maximumMana: 250,
  manaRegen: 12,

  defense: {
    amount: 5,
  },

  agility: 35,

  cooldown: 2,
  maximumCooldown: 2,

  recovery: 2,

  attacks: [

    // 1. Overwhelming Slash
    {
      name: "Overwhelming Slash",
      damage: 40,
      speed: 35,
      cost: 20,
      state: true,
    },

    // 2. Head-On Assault
    {
      name: "Head-On Assault",
      damage: 45,
      speed: 60,
      cost: 30,
      state: true,
    },

    // 3. Nozarashi
    {
      name: "Nozarashi",
      damage: 90,
      speed: 25,
      cost: 80,
      state: true,
      debuff: {
        defense: 5,
      },
    },

    // 4. Battle Lust
    {
      name: "Battle Lust",
      damage: 0,
      speed: 45,
      cost: 35,
      state: true,
      buff: {
        agility: 20,
        manaRegen: 5,
      },
    },

    // 5. Kendo Strike
    {
      name: "Kendo Strike",
      damage: 70,
      speed: 20,
      cost: 60,
      state: true,
    },

    // 6. Uncontrollable Power
    {
      name: "Uncontrollable Power",
      damage: 115,
      speed: 15,
      cost: 120,
      state: true,
      debuff: {
        defense: 5,
        agility: 5,
      },
    },

  ],
};

export { Kenpachi };
