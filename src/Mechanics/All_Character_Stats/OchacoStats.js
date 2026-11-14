import OchacoArenaImage from "../../assets/img/Ochaco.png";

import Attack1 from "../../assets/img/Attack_IMAGES/Zero Gravity.jpeg";
import Attack2 from "../../assets/img/Attack_IMAGES/Release!.png";
import Attack3 from "../../assets/img/Attack_IMAGES/Gunhead Martial Arts.jpeg";
import Attack4 from "../../assets/img/Attack_IMAGES/Meteor Fafrotskies.jpeg";
import Attack5 from "../../assets/img/Attack_IMAGES/Zero Gravity: Floating Combo.jpeg";

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
      image: Attack1,
      damage: 15,
      speed: 45,
      cost: 7,
      state: true,
      turnCooldown: 1,
      debuff: {
        agility: 20,
        defense: 20,
        cooldown: 1,
      },
    },

    {
      name: "Release!",
      image: Attack2,
      damage: 35,
      speed: 45,
      cost: 7,
      state: true,
      turnCooldown: 2,
      debuff: {
        health: 5,
        defense: 8,
        recovery: 1,
      },
    },

    {
      name: "Gunhead Martial Arts",
      image: Attack3,
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
      image: Attack4,
      damage: 55,
      speed: 40,
      cost: 15,
      uses: 2,
      state: true,
      debuff: {
        agility: 10,
        defense: 10,
      },
    },

    {
      name: "Zero Gravity: Floating Combo",
      image: Attack5,
      damage: 20,
      speed: 50,
      cost: 18,
      state: true,
      debuff: {
        agility: 15,
        cooldown: 2,
      },
    },

    
  ],
};

export default Ochaco;