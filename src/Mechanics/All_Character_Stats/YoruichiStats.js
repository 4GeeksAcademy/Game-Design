import YoruichiArenaImage from "../../assets/img/Yoruichi.png";

import ExplodingPineconeImage from "../../assets/img/Attack_IMAGES/ExplodingPinecone.jpeg";
import TabascoStarImage from "../../assets/img/Attack_IMAGES/TabascoStar.jpeg";
import FireBirdStarImage from "../../assets/img/Attack_IMAGES/FireBirdStar.jpeg";
import GasStarImage from "../../assets/img/Attack_IMAGES/GasStar.jpeg";
import FakeHammerImage from "../../assets/img/Attack_IMAGES/FakeHammer.jpeg";

const Yoruichi = {
  name: "Yoruichi Shihōin",
  image: YoruichiArenaImage,

  health: 100,
    maximumHealth: 100,

    mana: 75,
    maximumMana: 75,
    manaRegen: 20,

    cooldown: 3,
    maximumCooldown: 3,
    recovery: 1,

    agility: 40,
    defense: {
        amount: 15
    },

    attacks: [
        {
            name: "Shunpo Strike",
            damage: 18,
            cost: 5,
            speed: 90,
            state: true,

            buff: {
                agility: 10,
                mana: 10,
            }
        },

        {
            name: "Hakuda Combo",
            damage: 28,
            cost: 9,
            speed: 70,
            state: true,
            buff: {
                agility: 10,
                mana: 15
            },
        },

        {
            name: "Shunko: Lightning Release",
            damage: 12,
            cost: 13,
            speed: 80,
            state: true,

            buff: {
                agility: 10,
                defense: 3,
                mana: 5,
            },
        },

        {
            name: "Raijin Senkei",
            damage: 42,
            cost: 20,
            speed: 50,
            state: true,
            buff: {
                agility: 10,
                defense: 3,
                mana: 10,
            },

            debuff: {
                agility: 20
            }
        }
    ]
};

export default Yoruichi;