import HinataImage from "../../assets/img/Hinata.png";

import ExplodingPineconeImage from "../../assets/img/Attack_IMAGES/ExplodingPinecone.jpeg";
import TabascoStarImage from "../../assets/img/Attack_IMAGES/TabascoStar.jpeg";
import FireBirdStarImage from "../../assets/img/Attack_IMAGES/FireBirdStar.jpeg";
import GasStarImage from "../../assets/img/Attack_IMAGES/GasStar.jpeg";
import FakeHammerImage from "../../assets/img/Attack_IMAGES/FakeHammer.jpeg";

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
      damage: 47,
      speed: 42,
      cost: 13,
      state: true,
    },

    // 4. Eight Trigrams: Thirty-Two Palms
    {
      name: "Thirty-Two Palms",
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
      name: "Protective Eight Trigrams",
      damage: 20,
      speed: 27,
      cost: 9,
      state: true,
    },

    // 6. Eight Trigrams: Sixty-Four Palms
    {
      name: "Sixty-Four Palms",
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
