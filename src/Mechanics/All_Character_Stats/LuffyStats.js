import LuffyArenaImage from "../../assets/img/Luffy.png";

import Attack2 from "../../assets/img/Attack_IMAGES/third gear.jpeg";
import Attack1 from "../../assets/img/Attack_IMAGES/Second Gear.jpeg";
import Attack3 from "../../assets/img/Attack_IMAGES/gum gum pistol.jpeg";
import Attack4 from "../../assets/img/Attack_IMAGES/Gum Gum gatling.jpeg";
import Attack5 from "../../assets/img/Attack_IMAGES/gum gum bazooka.jpeg";
import Attack6 from "../../assets/img/Attack_IMAGES/gum gum red halk.jpeg"

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
      image: Attack1,
      damage: 0,
      speed: 0,
      cost: 15,
      turnCooldown: 5,
      uses: 2,
      sacrifice: {
        health: 5,
      },
      state: true,
      buff: {
        agility: 10,
        mana: 50,
      },
    },
    {
      id: "luffy-third-gear",
      name: "Third Gear",
      image: Attack2,
      damage: 0,
      speed: 0,
      cost: 30,
      state: true,
      uses: 4,
      turnCooldown: 3,
      duration: 3,

      attackModifiers: {
        targetAttackIds: null,
        stats: {
          damage: {
            multiplier: 1.8, 
          },
          speed: {
            multiplier: 0.75,
          },
          cost: {
            multiplier: 1.3,

            
          },
        },
      },

      characterModifiers: {
        agility: {
          multiplier: 0.6,
        },
        defense: {
          multiplier: 1.15,
          amount: 10,
        },
        manaRegen: {
          multiplier: 0.8,
        },
      },
    },

    {
      id: "Gum-Gum Pistol",
      name: "Gum-Gum Pistol",
      image: Attack3,
      damage: 35,
      speed: 55,
      cost: 15,
      state: true,
    },
    {
      id: "Gum-Gum Gatling",
      name: "Gum-Gum Gatling",
      image: Attack4,
      damage: 52,
      speed: 50,
      cost: 20,
      state: true,
    },
    {
      id: "Gum-Gum Bazooka",
      name: "Gum-Gum Bazooka",
      image: Attack5,
      damage: 70,
      speed: 25,
      cost: 30,
      state: true,
    },
    {
      id: "Gum-Gum Red Hawk",
      name: "Gum-Gum Red Hawk",
      image: Attack6,
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
