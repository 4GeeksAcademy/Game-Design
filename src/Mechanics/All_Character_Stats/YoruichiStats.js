import YoruichiArenaImage from "../../assets/img/Yoruichi.png";

import ExplodingPineconeImage from "../../assets/img/Attack_IMAGES/ExplodingPinecone.jpeg";
import TabascoStarImage from "../../assets/img/Attack_IMAGES/TabascoStar.jpeg";
import FireBirdStarImage from "../../assets/img/Attack_IMAGES/FireBirdStar.jpeg";
import GasStarImage from "../../assets/img/Attack_IMAGES/GasStar.jpeg";
import FakeHammerImage from "../../assets/img/Attack_IMAGES/FakeHammer.jpeg";

const Yoruichi = {
  name: "Yoruichi Shihōin",
  image: YoruichiArenaImage,

  health: 70,
    maximumHealth: 70,

    mana: 60,
    maximumMana: 60,
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
                agility: 7,
                mana: 10,
                manaRegen: 1,
            }
        },

        {
            name: "Hakuda Combo",
            damage: 28,
            cost: 9,
            speed: 70,
            state: true,
            buff: {
                agility: 7,
                mana: 4,
                manaRegen: 1,
            },
        },

        {
            name: "Shunko: Lightning Release",
            damage: 12,
            cost: 13,
            speed: 80,
            state: true,

            buff: {
                agility: 7,
                defense: 3,
                mana: 2,
                manaRegen: 3,
            },
        },

        {
            name: "Raijin Senkei",
            damage: 42,
            cost: 20,
            speed: 50,
            state: true,
            buff: {
                agility: 7,
                defense: 3,
                mana: 5,
                manaRegen: 3,
            },

            debuff: {
                agility: 10
            }
        }
    ]
};

export default Yoruichi;