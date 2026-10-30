import HinataImage from "/workspaces/Game-Design/src/assets/img/Hinata.png";

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

    mana: 110,
    maximumMana: 110,
    manaRegen: 12,

    defense: {
        amount: 3,
    },

    agility: 8,

    cooldown: 4,
    maximumCooldown: 4,

    recovery: 5,

    attacks: [

        // 1. Gentle Fist
        {
            name: "Gentle Fist",
            damage: 19,
            speed: 4,
            cost: 8,
            state: true,
        },

        // 2. Eight Trigrams: Palm Rotation Strike
        {
            name: "Palm Rotation Strike",
            damage: 21,
            speed: 3,
            cost: 10,
            state: true,
        },

        // 3. Twin Lion Fists
        {
            name: "Twin Lion Fists",
            damage: 25,
            speed: 4,
            cost: 13,
            state: true,
        },

        // 4. Eight Trigrams: Thirty-Two Palms
        {
            name: "Thirty-Two Palms",
            damage: 23,
            speed: 3,
            cost: 11,
            state: true,
        },

        // 5. Protective Eight Trigrams
        {
            name: "Protective Eight Trigrams",
            damage: 20,
            speed: 3,
            cost: 9,
            state: true,
        },

        // 6. Eight Trigrams: Sixty-Four Palms
        {
            name: "Sixty-Four Palms",
            damage: 29,
            speed: 5,
            cost: 17,
            state: true,
        },

    ],
};

export default Hinata;