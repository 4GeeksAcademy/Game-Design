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
  manaRegen: 15,

  cooldown: 3,
  maximumCooldown: 3,
  recovery: 1,

  agility: 20,

  defense: {
    amount: 25,
  },

  attacks: [
    {
      name: "Red Gauntlet",
      damage: 20,
      speed: 40,
      cost: 10,
      state: true,
    },
    {
      name: "Hardening Strike",
      damage: 28,
      speed: 30,
      cost: 15,
      state: true,
    },
    {
      name: "Red Counter",
      damage: 15,
      speed: 35,
      cost: 12,
      state: true,
      buff: {
        defense: 8,
      },
    },
    {
      name: "Unbreakable Guard",
      damage: 0,
      speed: 10,
      cost: 18,
      state: true,
      buff: {
        defense: 18,
      },
    },
    {
      name: "Red Riot Rush",
      damage: 35,
      speed: 35,
      cost: 22,
      state: true,
    },
    {
      name: "Crimson Crush",
      damage: 42,
      speed: 25,
      cost: 30,
      state: true,
      debuff: {
        agility: 5,
      },
    },
    {
      name: "Red Riot Unbreakable",
      damage: 0,
      speed: 5,
      cost: 25,
      state: true,
      buff: {
        defense: 25,
        agility: 5,
      },
    },
    {
      name: "Red Riot: Unbreakable Smash",
      damage: 55,
      speed: 20,
      cost: 40,
      state: true,
    },
  ],
};

export default Kirishima;
