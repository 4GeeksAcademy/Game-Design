import GokuImage from "/workspaces/Game-Design/src/assets/img/Goku.jpeg";

import ExplodingPineconeImage from "../../assets/img/Attack_IMAGES/ExplodingPinecone.jpeg";
import TabascoStarImage from "../../assets/img/Attack_IMAGES/TabascoStar.jpeg";
import FireBirdStarImage from "../../assets/img/Attack_IMAGES/FireBirdStar.jpeg";
import GasStarImage from "../../assets/img/Attack_IMAGES/GasStar.jpeg";
import FakeHammerImage from "../../assets/img/Attack_IMAGES/FakeHammer.jpeg";




const Goku = {
  name: "Goku",
image: GokuImage,
  // Base Stats
  health: 170,
  maximumHealth: 170,

  mana: 130,
  maximumMana: 130,
  manaRegen: 12,

  defense: {
    amount: 12,
  },

  agility: 28,

  cooldown: 0,
  maximumCooldown: 0,
  recovery: 0,

  attacks: [
    {
      name: "Kamehameha",
      damage: 55,
      speed: 30,
      cost: 18,
      state: true,
    },
    {
      name: "Kaio-ken Rush",
      damage: 65,
      speed: 34,
      cost: 25,
      state: true,
    },
    {
      name: "Meteor Combination",
      damage: 75,
      speed: 30,
      cost: 28,
      state: true,
    },
    {
      name: "Super Kamehameha",
      damage: 82,
      speed: 27,
      cost: 35,
      state: true,
    },
    {
      name: "Spirit Bomb",
      damage: 90,
      speed: 25,
      cost: 45,
      state: true,
    },
    {
      name: "Dragon Fist",
      damage: 88,
      speed: 29,
      cost: 42,
      state: true,
    },
  ],
};

export default Goku;
