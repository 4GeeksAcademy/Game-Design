import {
    acidShot,
    acidBomb,
    acidRain,
    acidStorm
} from "./Attack";

const mina = {
    name: "Mina Ashido",

    health: 100,

    maximumMana: 50,

    regenMana: 5,

    attacks: [
        acidShot,
        acidBomb,
        acidRain,
        acidStorm
    ]
};

export default mina;