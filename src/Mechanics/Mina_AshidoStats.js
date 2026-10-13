import { acidShot, acidBomb, acidRain, acidStorm } from "./Attack(list)";

// const mina = {
//     name: "Mina Ashido",

//     health: 100,

//     maximumMana: 50,

//     regenMana: 5,

//     attacks: [
//         acidShot,
//         acidBomb,
//         acidRain,
//         acidStorm
//     ]
// };

const mina = {
  name: "Mina Ashido",

  health: 100,
  mana: 70,
  maximumMana: 70,
  manaRegen: 20,
  cooldown: 3,
  maximumCooldown: 3,
  recovery: 1,
  agility: 30,
  defense: {
    amount: 25,
    active: true,
  },

  attacks: [
    {
      name: "Acid Shot",
      damage: 20,
      speed: 40,
      cost: 10,
      state: true,
    },

    {
      name: "Acid Blast",
      damage: 30,
      speed: 30,
      cost: 25,
      buff: {
        defense: 3,
      },
      state: true,
    },

    {
      name: "Acid Bomb",
      damage: 60,
      speed: 10,
      cost: 40,
      state: true,
    },

    {
      name: "Acid Surge",
      damage: 0,
      speed: 0,
      cost: 0,

      buff: {
        health: 10,
        mana: 10,
        defense: 5,
        agility: 5,
        cooldown: 2,
        maximumCooldown: 2,
        recovery: 1,
      },

      state: true,
    },

    {
      name: "Acid Corrosion",
      damage: 25,
      speed: 30,
      cost: 20,
      debuff: { defense: 5, agility: 5 },
      state: true,
    },

    {
      name: "Ultimate Acid Overload",
      damage: 25,
      speed: 30,
      cost: 10,
      buff: {
        health: 10,
        mana: 10,
        defense: 5,
        agility: 5,
        cooldown: 2,
        maximumCooldown: 2,
        recovery: 1,
      },
      debuff: {
        health: 10,
        mana: 10,
        defense: 5,
        agility: 5,
        cooldown: 2,
        maximumCooldown: 2,
        recovery: 1,
      },
      state: true,
    },
  ],
};

export default mina;
