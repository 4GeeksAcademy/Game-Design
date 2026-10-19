import LuffyArenaImage from "../../assets/img/Luffy.png";

import ExplodingPineconeImage from "../../assets/img/Attack_IMAGES/ExplodingPinecone.jpeg";
import TabascoStarImage from "../../assets/img/Attack_IMAGES/TabascoStar.jpeg";
import FireBirdStarImage from "../../assets/img/Attack_IMAGES/FireBirdStar.jpeg";
import GasStarImage from "../../assets/img/Attack_IMAGES/GasStar.jpeg";
import FakeHammerImage from "../../assets/img/Attack_IMAGES/FakeHammer.jpeg";

const Luffy = {
  name: "Monkey D. Luffy",
  image: LuffyArenaImage,

  health: 140,
  mana: 120,
  maximumMana: 120,
  manaRegen: 40,
  cooldown: 4,
  maximumCooldown: 4,
  recovery: 1,
  agility: 35,
  defense: {
    amount: 28,
    active: true,
  },

  attacks: [

    {
      name: "Second Gear",
      image: null,
      damage: 0,
      speed: 0,
      cost: 10,
      state: true,
      buff: {
        agility: 10,
        mana: 50,
      }
    },

    {
      name: "Gum-Gum Pistol",
      image: null,
      damage: 35,
      speed: 55,
      cost: 15,
      state: true,
    },
    {
      name: "Gum-Gum Gatling",
      image: null,
      damage: 52,
      speed: 50,
      cost: 20,
      state: true,
    },
    {
      name: "Gum-Gum Bazooka",
      image: null,
      damage: 70,
      speed: 25,
      cost: 30,
      state: true,
    },
    {
      name: "Gum-Gum Red Hawk",
      image: null,
      damage: 80,
      speed: 55,
      cost: 40,
      state: true,
      buff: {
        agility: 8,
      },
    },
  ],
};


export default Luffy;
