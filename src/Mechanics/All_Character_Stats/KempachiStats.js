import KenpachiImage from "../../assets/img/Kenpachi.png";

import Attack1 from "../../assets/img/Attack_IMAGES/Overwhelming Slash.webp";
import Attack2 from "../../assets/img/Attack_IMAGES/Head-on Assault.jpeg";
import Attack3 from "../../assets/img/Attack_IMAGES/Battle Lust.jpeg";
import Attack4 from "../../assets/img/Attack_IMAGES/GasStar.jpeg";
import Attack5 from "../../assets/img/Attack_IMAGES/Kendo Strike.jpeg";
import Attack6 from "../../assets/img/Attack_IMAGES/Relentless Cleeve.jpeg";




const Kenpachi = {
  name: "Kenpachi Zaraki",
  image: KenpachiImage,

  slot: 6, // Maximum attacks this character can equip.
  health: 300,
  maximumHealth: 300,

  mana: 250,
  maximumMana: 250,
  manaRegen: 32,

  defense: {
    amount: 5,
  },

  agility: 41,

  cooldown: 2,
  maximumCooldown: 2,

  recovery: 2,

  attacks: [

    // 1. Overwhelming Slash
    {
      name: "Overwhelming Slash",
      image: Attack1,
      damage: 50,
      speed: 35,
      cost: 20,
      state: true,
      debuffRequiresHit: true,
      debuff: {
        health: 30,
      }
    },

    // 2. Head-On Assault
    {
      name: "Head-On Assault",
      image: Attack2,
      damage: 65,
      speed: 60,
      cost: 30,
      debuffRequiresHit: true,
      debuff: {
        defense: 20,
        mana: 10,

      },
      state: true,
    },

    {
      name: "Relentless Cleave",
      image: Attack6,
      damage: 60,
      speed: 40,
      cost: 31,
      state: true,
      debuffRequiresHit: true,
      debuff: {
        defense: 15,
      },
    },

    

    // 3. Battle Lust
    {
      name: "Battle Lust",
      image: Attack3,
      damage: 0,
      speed: 0,
      cost: 35,
      state: true,
      duration: 2,
      buff: {
        agility: 20,
        manaRegen: 15,
        cooldown: 1,
      },
      characterModifiers: {
        agility: {
          multiplier: 1.2,
        },
        
        manaRegen: {
          multiplier: 1.4,
        },
        recovery: {
          amount: 1
        },

       maximumCooldown: {
        amount: 1
       },
        cooldown: {
          amount: 1,
        }
      },
    },

    // 5. Kendo Strike
    {
      name: "Kendo Strike",
      image: Attack4,
      damage: 70,
      speed: 30,
      cost: 60,
      state: true,
    },

  // 6. Nozarashi
    {
      name: "Nozarashi",
      locked: true,
      unlockCost: 50000,
      locked: true,
      unlockCost: 300,
      image: Attack5,
      damage: 0,
      speed: 0,
      cost: 80,
      uses: 1,
      state: true,
      duration: 3, // this modifies the attackModifiers and characterModifiers where it temporarily increases/decreases the stats for each attack applied.
      // Not to be confused with turnCooldown where it disables the attack after use.

      attackModifiers: {
        targetAttackIds: null, // or attack id
        stats: {
          damage: {
            multiplier: 2.2,
            amount: 25,
          },
          speed: {
            multiplier: 1.3, // you can add amount along with multiplier too for aditional effect
          },
          cost: {
            multiplier: 1.2,
          },
        },
      },
    },

  ],
};

export { Kenpachi };
