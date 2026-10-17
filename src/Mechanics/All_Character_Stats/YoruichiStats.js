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
            cost: 10,
            speed: 45,
            state: true,

            buff: {
                agility: 10
            }
        },

        {
            name: "Hakuda Combo",
            damage: 28,
            cost: 18,
            speed: 35,
            state: true
        },

        {
            name: "Shunko: Lightning Release",
            damage: 12,
            cost: 25,
            speed: 40,
            state: true,

            buff: {
                agility: 15,
                defense: 5
            }
        },

        {
            name: "Raijin Senkei",
            damage: 42,
            cost: 40,
            speed: 25,
            state: true,

            debuff: {
                agility: 10
            }
        }
    ]
};

export default Yoruichi;