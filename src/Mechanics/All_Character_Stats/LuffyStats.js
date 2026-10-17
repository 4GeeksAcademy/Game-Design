import LuffyArenaImage from "../../assets/img/Luffy.png";

import ExplodingPineconeImage from "../../assets/img/Attack_IMAGES/ExplodingPinecone.jpeg";
import TabascoStarImage from "../../assets/img/Attack_IMAGES/TabascoStar.jpeg";
import FireBirdStarImage from "../../assets/img/Attack_IMAGES/FireBirdStar.jpeg";
import GasStarImage from "../../assets/img/Attack_IMAGES/GasStar.jpeg";
import FakeHammerImage from "../../assets/img/Attack_IMAGES/FakeHammer.jpeg";

const Luffy = {
  name: "Monkey D. Luffy",
  image: LuffyArenaImage,

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
      name: "Gum-Gum Pistol",
      image: null,
      damage: 25,
      speed: 70,
      cost: 10,
      state: true,
    },
    {
      name: "Gum-Gum Gatling",
      image: null,
      damage: 42,
      speed: 55,
      cost: 25,
      state: true,
    },
    {
      name: "Gum-Gum Bazooka",
      image: null,
      damage: 65,
      speed: 35,
      cost: 40,
      state: true,
    },
    {
      name: "Gum-Gum Red Hawk",
      image: null,
      damage: 95,
      speed: 45,
      cost: 65,
      state: true,
      buff: {
        agility: 5,
      },
    },
  ],
};


export default Luffy;
