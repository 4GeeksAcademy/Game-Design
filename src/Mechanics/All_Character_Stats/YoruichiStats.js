import YoruichiArenaImage from "../../assets/img/Yoruichi.png";

import Attack1 from "../../assets/img/Attack_IMAGES/Shunpo_Strike.png";
import Attack2 from "../../assets/img/Attack_IMAGES/Hakuda_Combo.png";
import Attack3 from "../../assets/img/Attack_IMAGES/Shunko:_Lightning_Release.png";
import Attack4 from "../../assets/img/Attack_IMAGES/Raijin_Senkei.png";
import Attack5 from "../../assets/img/Attack_IMAGES/Afterimage_Strike.png";
import Attack6 from "../../assets/img/Attack_IMAGES/Raiju_Senkei.png";
const Yoruichi = {
  name: "Yoruichi Shihōin",
  image: YoruichiArenaImage,

  health: 70,
  maximumHealth: 70,

  mana: 60,
  maximumMana: 60,
  manaRegen: 20,

  cooldown: 5,
  maximumCooldown: 5,
  recovery: 1,

  agility: 40,
  defense: {
    amount: 15,
  },

  attacks: [
    // {
    //   name: "Shunpo Strike",
    //   image: Attack1,
    //   damage: 18,
    //   cost: 5,
    //   speed: 80,
    //   state: true,
    //   buffRequiresHit: true,
    //   buff: {
    //     agility: 7,
    //     mana: 10,
    //     manaRegen: 3,
    //   },
    // },

    // {
    //   name: "Hakuda Combo",
    //   image: Attack2,
    //   damage: 28,
    //   cost: 9,
    //   speed: 70,
    //   state: true,
    //   buffRequiresHit: true,
    //   buff: {
    //     agility: 7,
    //     mana: 4,
    //     manaRegen: 3,
    //     cooldown: 1,
    //   },
    // },

    // {
    //   name: "Shunko: Lightning Release",
    //   image: Attack3,
    //   damage: 12,
    //   cost: 13,
    //   speed: 80,
    //   state: true,
    //   buffRequiresHit: true,
    //   buff: {
    //     agility: 7,
    //     defense: 3,
    //     mana: 2,
    //     manaRegen: 3,
    //   },
    // },

    // {
    //   name: "Raijin Senkei",
    //   image: Attack4,
    //   damage: 42,
    //   cost: 20,
    //   speed: 50,
    //   state: true,
    //   buff: {
    //     agility: 7,
    //     defense: 3,
    //     mana: 5,
    //     manaRegen: 3,
    //     cooldown: 1,
    //   },

    //   debuff: {
    //     agility: 10,
    //   },
    // },

    // {
    //   name: "Utsusemi: Afterimage Strike",
    //   image: Attack5,
    //   damage: 24,
    //   cost: 24,
    //   speed: 50,
    //   state: true,

    //   buff: {
    //     agility: 5,
    //     cooldown: 1,
    //   },
    // },
    // {
    //   name: "Shunko: Raiju Senkei",
    //   image: Attack6,
    //   damage: 35,
    //   cost: 30,
    //   speed: 38,
    //   state: true,
    //   turnCooldown: 3,
    //   uses: 3,

    //   buff: {
    //     recovery: 1,
    //     cooldown: 1,
    //   },
    // },

{
  name: "Shunko: Thunderclap Lock",
  image: Attack6,
  damage: 20,
  cost: 18,
  speed: 65,
  state: true,

  // STUN CONFIGURATION
  stun: {
    type: "selected", // "selected" | "random" | "all"
    amount: 6,
    duration: 5,
  },

  // Only apply stun if the attack successfully hits.
  stunRequiresHit: false,
},

  ],
};

export default Yoruichi;
