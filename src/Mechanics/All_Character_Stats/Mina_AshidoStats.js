import { acidShot, acidBomb, acidRain, acidStorm } from "../Attack(list)";

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
import minaArenaImage from "../../assets/img/MinaAshidoArena.jpg";

const mina = {
  name: "Mina Ashido",
  image: minaArenaImage,

  health: 95,
  mana: 80,
  maximumMana: 80,
  manaRegen: 30,
  cooldown: 3,
  maximumCooldown: 3,
  recovery: 1,
  agility: 20,
  defense: {
    amount: 25,
    active: true,
  },

  attacks: [
    {
      name: "Acid Shot",
      damage: 15,
      speed: 40,
      cost: 12,
      state: true,
      buff: {
        mana: 20,
      },
      debuff: {
        health: 2,
        mana: 5,
        agility: 2,

    },
  },

    {
      name: "Acid Blast",
      damage: 25,
      speed: 30,
      cost: 17,
      buff: {
        defense: 3,
      },
      debuff: {
        health: 3,
        },
      state: true,
    },
    

    {
      name: "Acid Bomb",
      damage: 40,
      speed: 10,
      cost: 55,
      buff: {
        
        defense: 6,
      },
      debuff: {
        health: 10,
        defense: 5, agility: 6, cooldown: 2, recovery: 1,
      },
      state: true,
    },


    {
      name: "Acid Corrosion",
      damage: 10,
      speed: 20,
      cost: 35,
      debuff: { health: 3, defense: 10, agility: 10, cooldown: 1, recovery: 1, },
      state: true,
    },

   
  ],
};

export default mina;
