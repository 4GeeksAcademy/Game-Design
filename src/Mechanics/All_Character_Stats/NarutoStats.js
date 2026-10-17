import NarutoArenaImage from "../../assets/img/Naruto.png";

import ExplodingPineconeImage from "../../assets/img/Attack_IMAGES/ExplodingPinecone.jpeg";
import TabascoStarImage from "../../assets/img/Attack_IMAGES/TabascoStar.jpeg";
import FireBirdStarImage from "../../assets/img/Attack_IMAGES/FireBirdStar.jpeg";
import GasStarImage from "../../assets/img/Attack_IMAGES/GasStar.jpeg";
import FakeHammerImage from "../../assets/img/Attack_IMAGES/FakeHammer.jpeg";

const Naruto = {
  name: "Naruto Uzumaki",
  image: NarutoArenaImage,

  health: 110,
  mana: 75,
  maximumMana: 75,
  manaRegen: 18,
  cooldown: 4,
  maximumCooldown: 4,
  recovery: 1,
  agility: 35,
  defense: {
    amount: 25,
    active: true,
  },

 attacks: [
    {
      name: "Shadow Clone Barrage",
      image: null,
      damage: 25,
      speed: 75,
      cost: 10,
      state: true,
    },
    {
      name: "Multiple Shadow Clone Jutsu",
      image: null,
      damage: 35,
      speed: 65,
      cost: 20,
      state: true,
    },
    {
      name: "Rasengan",
      image: null,
      damage: 45,
      speed: 60,
      cost: 25,
      state: true,
    },
    {
      name: "Wind Style: Rasenshuriken",
      image: null,
      damage: 65,
      speed: 40,
      cost: 40,
      state: true,
      debuff: {
        agility: -5,
      },
    },
    {
      name: "Sage Mode Strike",
      image: null,
      damage: 55,
      speed: 50,
      cost: 35,
      state: true,
      buff: {
        agility: 10,
      },
    },
    {
      name: "Kurama Chakra Strike",
      image: null,
      damage: 95,
      speed: 50,
      cost: 65,
      state: true,
      buff: {
        agility: 5,
      },
    },
  ],
};


export default Naruto;
