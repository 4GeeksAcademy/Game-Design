import NarutoArenaImage from "../../assets/img/Naruto.png";

import Attack1 from "/workspaces/Game-Design/src/assets/img/Attack_IMAGES/Rasengan.jpeg";
import Attack2 from "/workspaces/Game-Design/src/assets/img/Attack_IMAGES/Multiple Shadow Clone Jutsu.png";
import Attack3 from "/workspaces/Game-Design/src/assets/img/Attack_IMAGES/Wind Style: Rasenshuriken.jpeg";
import Attack4 from "/workspaces/Game-Design/src/assets/img/Attack_IMAGES/NarutoSageMode.webp";
import Attack5 from "/workspaces/Game-Design/src/assets/img/Attack_IMAGES/Tailed Beast Bomb Rasenshuriken.jpeg";

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
      image: Attack1,
      damage: 45,
      speed: 30,
      cost: 15,
      state: true,
      debuff: {
        defense: 15,
      }
    },

    {
      name: "Multiple Shadow Clone Jutsu",
      image: Attack2,
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
      name: "Wind Style: Rasenshuriken",
      image: Attack3,
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
      image: Attack4,
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
      name: "Tailed Beast Bomb Rasenshuriken",
      image: Attack5,
      damage: 95,
      speed: 50,
      cost: 70,
      state: true,
    },
  ],
};


export default Naruto;
