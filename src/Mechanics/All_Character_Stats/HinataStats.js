
import HinataImage from "../../assets/img/Hinata.png";

import ByakuganImage from "../../assets/img/Attack_IMAGES/Hinata's Byakugan.jpeg";
import GentleFistImage from "../../assets/img/Attack_IMAGES/Gentle Fists.jpeg";
import PalmRotationImage from "../../assets/img/Attack_IMAGES/Palm Rotation Strike.webp";
import TwinLionFistsImage from "../../assets/img/Attack_IMAGES/Twin Lion Fists.jpeg";
import ThirtyTwoPalmsImage from "../../assets/img/Attack_IMAGES/Thirty-Two Palms.jpeg";
import EightTrigramsVacuumPalm from "../../assets/img/Attack_IMAGES/Eight Trigrams Vacuum Palm.jpeg";
import SixtyFourPalmsImage from "../../assets/img/Attack_IMAGES/Sixty-Four Palms.jpeg";

const Hinata = {
  name: "Hinata Hyuga",
  image: HinataImage,
  // Base Stats
  health: 125,
  maximumHealth: 125,

  mana: 105,
  maximumMana: 105,
  manaRegen: 26,

  defense: {
    amount: 27,
  },

  agility: 20,

  cooldown: 4,
  maximumCooldown: 4,

  recovery: 1,

  attacks: [

    {
      name: "Byakugan",
      image: ByakuganImage,
      damage: 0,
      speed: 0,
      cost: 5,
      state: true,
      buff: {
        manaRegen: 11,
        mana: 25,
        cooldown: 2,
        maximumCooldown: 2,
      },
      debuff: {
        defense: 15,
      }
    },
    // 1. Gentle Fist
    {
      name: "Gentle Fist",
      image: GentleFistImage,
      damage: 19,
      speed: 44,
      cost: 9,
      state: true,
      debuffRequiresHit: true,
      debuff: {
        mana: 10,
        maximumMana: 3,
      }
    },

    // 2. Eight Trigrams: Palm Rotation Strike
    {
      name: "Palm Rotation Strike",
      image: PalmRotationImage,
      damage: 21,
      speed: 33,
      cost: 10,
      state: true,
      debuffRequiresHit: true,
      debuff: {
        mana: 15,
        maximumMana: 5,
      }
    },

    // 3. Twin Lion Fists
    {
      name: "Twin Lion Fists",
      image: TwinLionFistsImage,
      damage: 47,
      speed: 57,
      cost: 13,
      state: true,
      debuffRequiresHit: true,
      debuff: {
        health: 15,
        mana: 50,
        manaRegen: 15,
      }
    },

    // 4. Eight Trigrams: Thirty-Two Palms
    {
      name: "Thirty-Two Palms",
      image: ThirtyTwoPalmsImage,
      damage: 23,
      speed: 44,
      cost: 11,
      state: true,
      debuffRequiresHit: true,
      debuff: {
        mana: 23,
        maximumMana: 5,
      },
      // STUN CONFIGURATION
      stun: {
        type: "selected", // "selected" | "random" | "all"
        amount: 2, // attacks affected
        duration: 3, // how long it will last
      },

      // Only apply stun if the attack successfully hits.
      stunRequiresHit: true,
    },

    // 5. Protective Eight Trigrams
    {
      name: "Eight Trigrams Vacuum Palm",
      image: EightTrigramsVacuumPalm,
      damage: 20,
      speed: 27,
      cost: 9,
      state: true,
    },

    // 6. Eight Trigrams: Sixty-Four Palms
    {
      name: "Sixty-Four Palms",
      locked: true,
      unlockCost: 300,
      locked: true,
      unlockCost: 300,
      image: SixtyFourPalmsImage,
      damage: 29,
      speed: 30,
      cost: 17,
      state: true,
      debuffRequiresHit: true,
      debuff: {
        mana: 30,
        maximumMana: 9,
      },
      // STUN CONFIGURATION
      stun: {
        type: "selected", // "selected" | "random" | "all"
        amount: 4, // attacks affected
        duration: 3, // how long it will last
      },

      // Only apply stun if the attack successfully hits.
      stunRequiresHit: true,
    },
  ],
};

export default Hinata;
