import KirishimaArenaImage from "../../assets/img/Kirishima.png";

import ExplodingPineconeImage from "../../assets/img/Attack_IMAGES/ExplodingPinecone.jpeg";
import TabascoStarImage from "../../assets/img/Attack_IMAGES/TabascoStar.jpeg";
import FireBirdStarImage from "../../assets/img/Attack_IMAGES/FireBirdStar.jpeg";
import GasStarImage from "../../assets/img/Attack_IMAGES/GasStar.jpeg";
import FakeHammerImage from "../../assets/img/Attack_IMAGES/FakeHammer.jpeg";

const Kirishima = {
  name: "Kirishima Eijiro",
  image: KirishimaArenaImage,

  health: 125,
  maximumHealth: 125,

  mana: 70,
  maximumMana: 70,
  manaRegen: 20,

  cooldown: 3,
  maximumCooldown: 3,
  recovery: 1,

  agility: 16,

  defense: {
    amount: 40,
  },

  attacks: [

{
      name: "Quirk: Hardening",
      damage: 0,
      speed: 0,
      cost: 5,
      state: true,
      buff: {
        defense: 4,
        maximumCooldown: 1,
        cooldown: 1,
      },
    },

    {
      name: "Red Gauntlet",
      damage: 20,
      speed: 40,
      cost: 10,
      state: true,
      buff: {
        defense: 4,
      },
    },

    {
      name: "Red Counter",
      damage: 15,
      speed: 35,
      cost: 13,
      state: true,
      buff: {
        defense: 2,
      },
    },

    {
      name: "Hardening Strike",
      damage: 28,
      speed: 30,
      cost: 15,
      state: true,
      buff: {
        defense: 8,
      },
    },
    
    {
      name: "Red Riot Rush",
      damage: 35,
      speed: 42,
      cost: 18,
      state: true,
      buff: {
        defense: 6,
      },
    },
    {
      name: "Crimson Crush",
      damage: 42,
      speed: 25,
      cost: 21,
      state: true,
      buff: {
        defense: 7,
      },
      debuff: {
        defense: 12,
      },
    },
    {
      name: "Red Riot Unbreakable",
      damage: 0,
      speed: 5,
      cost: 30,
      state: true,
      buff: {
        defense: 30,
        agility: 5,
        maximumCooldown: 5,
        cooldown: 5,  
      },
    },
    {
      name: "Red Riot: Unbreakable Smash",
      damage: 55,
      speed: 20,
      cost: 33,
      state: true,
      buff: {
        defense: 12,
      },
    },
  ],
};

export default Kirishima;
