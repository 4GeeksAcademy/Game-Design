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
import minaArenaImage from "../assets/img/MinaAshidoArena.jpg";

const mina = {
  name: "Mina Ashido",
  image: minaArenaImage,

  health: 100,
  mana: 70,
  maximumMana: 70,
  manaRegen: 25,
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
      damage: 25,
      speed: 40,
      cost: 10,
      state: true,
      debuff: {
        health: 3,
        mana: 20,
        agility: 5,

    },
  },

    {
      name: "Acid Blast",
      damage: 30,
      speed: 30,
      cost: 22,
      buff: {
        defense: 3,
      },
      debuff: {
        health: 5,
        },
      state: true,
    },
    

    {
      name: "Acid Bomb",
      damage: 60,
      speed: 10,
      cost: 40,
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
      damage: 25,
      speed: 20,
      cost: 35,
      debuff: { health: 3, defense: 10, agility: 10, cooldown: 1, recovery: 1, },
      state: true,
    },

   
  ],
};

export default mina;
