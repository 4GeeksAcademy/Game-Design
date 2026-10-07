import {
    acidShot,
    acidBomb,
    acidRain,
    acidStorm
} from "./Attack";

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
    mana: 50,
    maximumMana: 50,
    manaRegen: 5,

    attacks: [
        {
            name: "Acid Shot",
            damage: 20,
            cost: 10,
            state: true
        },

        {
            name: "Acid Blast",
            damage: 30,
            cost: 25,
            state: true
        }
    ]
};


export default mina;