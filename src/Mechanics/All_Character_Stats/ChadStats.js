import ChadImage from "../../assets/img/Chad.jpeg";

import HeavyBlow from "../../assets/img/Attack_IMAGES/HeavyBlow.jpeg";
import GiantArmSmash from "../../assets/img/Attack_IMAGES/ChadArm.jpeg";
import ElDirecto from "../../assets/img/Attack_IMAGES/ElDirecto.jpeg";
import LaMuerte from "../../assets/img/Attack_IMAGES/LaMuerte.jpeg";





const Chad = {
  name: "Yasutora Sado",
  image: ChadImage,

  health: 120,
  mana: 85,
  maximumMana: 85,
  manaRegen: 20,
  cooldown: 3,
  maximumCooldown: 3,
  recovery: 1,
  agility: 10,
  defense: {
    amount: 65,
    active: true,
  },

  attacks: [
  {
    name: "Heavy Blow",
    image: HeavyBlow,
    damage: 60,
    speed: 15,
    cost: 20,
    state: true,
    buff: {
      defense: 5,
      recovery: 1,
    },
  },

  {
    name: "Giant Arm Smash",
    image: GiantArmSmash,
    damage: 80,
    speed: 10,
    cost: 28,
    state: true,
    buff: {
      mana: 10,
      cooldown: 1,
    },
  },

  {
    name: "El Directo",
    image: ElDirecto,
    damage: 70,
    speed: 30,
    cost: 32,
    state: true,
    buff: {
      defense: 10,
      recovery: 1,
      cooldown: 1,
    },
  },

  {
    name: "La Muerte",
    image: LaMuerte,
    damage: 125,
    speed: 30,
    cost: 45,
    state: true,
    buff: {
      defense: 20,
      maximumCooldown: 5,
      cooldown: 5,
      recovery: 1,
    },
  },


],
};

export default Chad;