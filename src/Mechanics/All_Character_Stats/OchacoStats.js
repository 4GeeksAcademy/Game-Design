import OchacoArenaImage from "../../assets/img/Ochaco.png";

import ExplodingPineconeImage from "../../assets/img/Attack_IMAGES/ExplodingPinecone.jpeg";
import TabascoStarImage from "../../assets/img/Attack_IMAGES/TabascoStar.jpeg";
import FireBirdStarImage from "../../assets/img/Attack_IMAGES/FireBirdStar.jpeg";
import GasStarImage from "../../assets/img/Attack_IMAGES/GasStar.jpeg";
import FakeHammerImage from "../../assets/img/Attack_IMAGES/FakeHammer.jpeg";

const Ochaco = {
  name: "Ochaco Uraraka",
  image: OchacoArenaImage,

  health: 90,
  mana: 120,
  maximumMana: 120,
  manaRegen: 25,
  cooldown: 2,
  maximumCooldown: 2,
  recovery: 2,
  agility: 20,
  defense: {
    amount: 17,
    active: true,
  },

  attacks: [
    {
      name: "Zero Gravity",
      image: ExplodingPineconeImage,
      damage: 15,
      speed: 45,
      cost: 7,
      state: true,
      debuff: {
        agility: 20,
        defense: 20,
        cooldown: 1,
      },
    },

    {
      name: "Release!",
      image: TabascoStarImage,
      damage: 35,
      speed: 45,
      cost: 7,
      state: true,
      debuff: {
        health: 5,
        defense: 8,
        recovery: 1,
      },
    },

    {
      name: "Gunhead Martial Arts",
      image: FakeHammerImage,
      damage: 25,
      speed: 55,
      cost: 12,
      state: true,
      buff:{
        mana: 20,
      },

      debuff: {
        defense: 8,
      },
    },

    {
      name: "Meteor Fafrotskies",
      image: FireBirdStarImage,
      damage: 55,
      speed: 40,
      cost: 15,
      state: true,
      debuff: {
        agility: 10,
        defense: 10,
      },
    },

    {
      name: "Zero Gravity: Floating Combo",
      image: GasStarImage,
      damage: 20,
      speed: 50,
      cost: 18,
      state: true,
      debuff: {
        agility: 30,
        cooldown: 2,
      },
    },

    
  ],
};

export default Ochaco;