import RockLeeArena from "../../assets/img/RockLeeArena.jpg";

import Attack1 from "/workspaces/Game-Design/src/assets/img/Attack_IMAGES/Hidden Lotus Awakening.png"
import Attack2 from "/workspaces/Game-Design/src/assets/img/Attack_IMAGES/Rapid Fists.jpeg"
import Attack3 from "/workspaces/Game-Design/src/assets/img/Attack_IMAGES/Leaf Hurricane.jpeg"
// import Attack4 from ""
import Attack5 from "/workspaces/Game-Design/src/assets/img/Attack_IMAGES/Barrier Breaker Kick.jpeg"
import Attack6 from "/workspaces/Game-Design/src/assets/img/Attack_IMAGES/Ultra Wind Wave.png"





const rockLee = {
  name: "Rock Lee",
  image: RockLeeArena,

  health: 80,
  mana: 50,
  maximumMana: 50,
  manaRegen: 10,
  cooldown: 4,
  maximumCooldown: 4,
  recovery: 2,
  agility: 40,
  defense: {
    amount: 12,
    active: true,
  },

  attacks: [

    {
      name: "Hidden Lotus Awakening",
      image: Attack1,
      damage: 0,
      speed: 0,
      cost: 40,
      uses: 1,
      turnCooldown: 5,
      buff: {
        agility: 5,
        mana: 50,
        defense: 10,
        cooldown: 1,
        maximumCooldown: 1,
        recovery: 1,
      },
      state: true,
    },

    {
      name: "Rapid Fists",
      image: Attack2,
      damage: 15,
      speed: 45,
      cost: 5,
    buffRequiresHit: true,
      buff: {
        agility: 5,
        mana: 15,
      },
      state: true,
    },

    {
      name: "Leaf Hurricane",
      image: Attack3,
      damage: 35,
      speed: 45,
      cost: 11,
      buff: {
        agility: 3,
        mana: 3,
      },
      state: true,
    },

    {
      name: "Youthful Burst",
      // image: Attack4,
      damage: 30,
      speed: 70,
      cost: 15,
      buff: {
        agility: 5,
        mana: 10,
      },
      state: true,
    },

    {
      name: "Barrier Breaker Kick",
      image: Attack5,
      damage: 20,
      speed: 55,
      cost: 20,
      buff: {
        agility: 2,
        mana: 5,
      },
      debuff: {
        defense: 20,
        cooldown: 1,
      },
      state: true,
    },

    
    {
      name: "Ultra Wind Wave",
      image: Attack6,
      uses: 2,
      turnCooldown: 5,
      damage: 140,
      speed: 90,
      cost: 50,
      buff: {
        agility: 10,
        maximumCooldown: 1,
        recovery: 1,
        defense: 5,
      },
      debuff: {
        defense: 5,
        agility: 10,
        maximumCooldown: 2,
        recovery: 1,
      },
      state: true,
    },
  ],
};

export default rockLee;
