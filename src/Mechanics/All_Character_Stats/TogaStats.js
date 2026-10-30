import TogaImage from "/workspaces/Game-Design/src/assets/img/Toga.png";

import ExplodingPineconeImage from "../../assets/img/Attack_IMAGES/ExplodingPinecone.jpeg";
import TabascoStarImage from "../../assets/img/Attack_IMAGES/TabascoStar.jpeg";
import FireBirdStarImage from "../../assets/img/Attack_IMAGES/FireBirdStar.jpeg";
import GasStarImage from "../../assets/img/Attack_IMAGES/GasStar.jpeg";
import FakeHammerImage from "../../assets/img/Attack_IMAGES/FakeHammer.jpeg";




const Toga = {
  name: "Himiko Toga",
  image: TogaImage,
  // Base Stats
  health: 65,
  maximumHealth: 65,

  mana: 150,
  maximumMana: 150,
  manaRegen: 27,

  defense: {
    amount: 10,
  },

  agility: 47,

  cooldown: 5,
  maximumCooldown: 5,
  recovery: 3,

  attacks: [
    {
      // Official move name
      name: "Jagged Spinning Knife",
      damage: 32,
      speed: 38,
      cost: 12,
      state: true,

      buff: {
        health: 6,
        agility: 3,
      },
    },

    {
      // Official move name
      name: "Sting Dance",
      damage: 48,
      speed: 42,
      cost: 20,
      state: true,

      buff: {
        health: 9,
        agility: 4,
      },
    },

    {
      // Official move name
      name: "Blood Sucker",
      damage: 40,
      speed: 35,
      cost: 18,
      state: true,

      buff: {
        health: 16,
        agility: 2,
      },
    },

    {
      // Descriptive gameplay name, not an official named technique
      name: "Close-Quarters Knife Combo",
      damage: 55,
      speed: 45,
      cost: 25,
      state: true,

      buff: {
        health: 11,
        agility: 5,
      },
    },

    {
      // Official ultimate move
      name: "Sad Man's Parade",
      damage: 72,
      speed: 32,
      cost: 38,
      state: true,

      buff: {
        health: 18,
        agility: 3,
      },
    },

    {
      // Official ultimate move
      name: "Sad Man's Death Parade",
      damage: 85,
      speed: 30,
      cost: 48,
      state: true,

      buff: {
        health: 22,
        agility: 5,
      },
    },
  ],
};

export default Toga;
