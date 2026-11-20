import KirishimaArenaImage from "../../assets/img/Kirishima.png";

import Attack1 from "../../assets/img/Attack_IMAGES/Quirk Awakening.jpeg";
import Attack2 from "../../assets/img/Attack_IMAGES/Red Gauntlet.jpeg";
import Attack3 from "../../assets/img/Attack_IMAGES/Red Counter.jpeg";
import Attack4 from "../../assets/img/Attack_IMAGES/Hardening Strike.jpeg";
import Attack5 from "../../assets/img/Attack_IMAGES/Red Riot Rush.jpeg";
import Attack6 from "../../assets/img/Attack_IMAGES/Crimson Crush.jpeg";
import Attack7 from "../../assets/img/Attack_IMAGES/Red Riot Unbreakable.jpeg";
import Attack8 from "../../assets/img/Attack_IMAGES/Unbreakable Smash.jpeg";


const Kirishima = {
  name: "Kirishima Eijiro",
  image: KirishimaArenaImage,

  slot: 8, // Maximum attacks this character can equip.

  health: 125,
  maximumHealth: 125,

  mana: 110,
  maximumMana: 110,
  manaRegen: 20,

  cooldown: 3,
  maximumCooldown: 3,
  recovery: 1,

  agility: 16,

  defense: {
    amount: 41,
  },

  attacks: [

{
      name: "Quirk: Hardening",
      image: Attack1,
      damage: 0,
      speed: 0,
      cost: 8,
      turnCooldown: 4,
      state: true,
      buff: {
        defense: 20,
        maximumCooldown: 3,
        cooldown: 3,
        recovery: 1,
        manaRegen: 14,
      },

       duration: 4, // this modifies the attackModifiers and characterModifiers where it temporarily increases/decreases the stats for each attack applied.
      // Not to be confused with turnCooldown where it disables the attack after use.

      attackModifiers: {
        targetAttackIds: null, // or attack id
        stats: {
          damage: {
            multiplier: 1.15, // or amount: 25
          },
          speed: {
            multiplier: 1.2, // you can add amount along with multiplier too for aditional effect
          },
        
        },

        characterModifiers: {
        agility: {
          multiplier: 1.2,
        },
        defense: {
          multiplier: 1.35,
        },
        manaRegen: {
          multiplier: 1.1,
        },
        
      },
      },
    },

    {
      name: "Red Gauntlet",
      image: Attack2,
      damage: 35,
      speed: 40,
      cost: 10,
      state: true,
      buff: {
        defense: 3,
      },
    },

    {
      name: "Red Counter",
      image: Attack3,
      damage: 30,
      speed: 35,
      cost: 13,
      state: true,
      buff: {
        defense: 7,
      },
    },

    {
      name: "Hardening Strike",
      image: Attack4,
      damage: 48,
      speed: 50,
      cost: 15,
      state: true,
      buff: {
        defense: 8,
        cooldown: 1,
      },
    },
    
    {
      name: "Red Riot Rush",
      image: Attack5,
      damage: 35,
      speed: 42,
      cost: 18,
      state: true,
      buff: {
        agility: 6,
        cooldown: 1,
        mana: 25,
      },
    },
    {
      name: "Crimson Crush",
      image: Attack6,
      damage: 42,
      speed: 25,
      cost: 21,
      state: true,
      buff: {
        defense: 7,
      },
      debuff: {defense: 12, agility: 6,},
         // STUN CONFIGURATION
      stun: {
        type: "random", // "selected" | "random" | "all"
        amount: 2, // attacks affected
        duration: 2, // how long it will last
      },

      // Only apply stun if the attack successfully hits.
      stunRequiresHit: true, 
      
    },
    {
      name: "Red Riot Unbreakable",
      image: Attack7,
      damage: 0,
      speed: 0,
      cost: 50,
      state: true,
      uses: 1,
      buff: {
        health: 155,
        maximumHealth: 30,
        defense: 50,
        maximumCooldown: 5,
        cooldown: 5, 
        recovery: 2, 
      },
       duration: 2, // this modifies the attackModifiers and characterModifiers where it temporarily increases/decreases the stats for each attack applied.
      // Not to be confused with turnCooldown where it disables the attack after use.

      attackModifiers: {
        targetAttackIds: null, // or attack id
        stats: {
          damage: {
            multiplier: 1.6, // or amount: 25
          },
          speed: {
            multiplier: 0.8, // you can add amount along with multiplier too for aditional effect
          },
        cost: {
            multiplier: 1.35,
          },
        },

        characterModifiers: {
        agility: {
          multiplier: 0.8,
        },
        defense: {
          multiplier: 2.1,
        },
        manaRegen: {
          multiplier: 0.7,
        },
        
      },
      },
    },
    {
      name: "Red Riot: Unbreakable Smash",
      locked: true,
      unlockCost: 300,
      image: Attack8,
      damage: 81,
      speed: 53,
      uses: 1,
      cost: 53,
      state: true,
      buff: {
        defense: 12,
      },
      debuff: {
        health: 10,
        defense: 25,
        recovery: 3,
        maximumHealth: 50,
      },
       
      sacrifice: {
        health: 20,
      },
    },
  ],
};

export default Kirishima;
