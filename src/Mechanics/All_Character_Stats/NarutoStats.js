import NarutoArenaImage from "../../assets/img/Naruto.png";

import ExplodingPineconeImage from "../../assets/img/Attack_IMAGES/ExplodingPinecone.jpeg";
import TabascoStarImage from "../../assets/img/Attack_IMAGES/TabascoStar.jpeg";
import FireBirdStarImage from "../../assets/img/Attack_IMAGES/FireBirdStar.jpeg";
import GasStarImage from "../../assets/img/Attack_IMAGES/GasStar.jpeg";
import FakeHammerImage from "../../assets/img/Attack_IMAGES/FakeHammer.jpeg";

const Naruto = {
  name: "Naruto Uzumaki",
  image: NarutoArenaImage,

  health: 120,
  mana: 170,
  maximumMana: 170,
  manaRegen: 55,
  cooldown: 3,
  maximumCooldown: 3,
  recovery: 1,
  agility: 35,
  defense: {
    amount: 25,
    active: true,
  },

 attacks: [


  {
      name: "Rasengan",
      image: null,
      damage: 45,
      speed: 30,
      cost: 15,
      state: true,
      debuff: {
        defense: 15,
      }
    },

    {
      name: "Shadow Clone Barrage",
      image: null,
      damage: 25,
      speed: 75,
      cost: 20,
      state: true,
      buff: {
        cooldown: 2,
        maximumCooldown: 3,
        recovery: 1,
      }
    },

    {
      name: "Multiple Shadow Clone Jutsu",
      image: null,
      damage: 35,
      speed: 65,
      cost: 25,
      state: true,
      buff: {
        cooldown: 3,
        maximumCooldown: 5,
        recovery: 2,
      }
    },
    
    {
      name: "Wind Style: Rasenshuriken",
      image: null,
      damage: 65,
      speed: 40,
      cost: 40,
      state: true,
      debuff: {
        health: 50,
        defense: 30,
        agility: 13,
      },
    },
    {
      name: "Sage Mode",
      image: null,
      damage: 0,
      speed: 0,
      cost: 60,
      state: true,
      buff: {
        agility: 10,
        mana: 100,
        defense: 40,
        agility: 15,
      },
    },
    {
      name: "Tailed Beast Bomb",
      image: null,
      damage: 95,
      speed: 50,
      cost: 70,
      state: true,
    },
  ],
};


export default Naruto;
