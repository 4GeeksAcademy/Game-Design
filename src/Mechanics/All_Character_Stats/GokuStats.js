import GokuImage from "../../assets/img/Goku.jpeg";

import Attack1 from "../../assets/img/Attack_IMAGES/GokuKamekameha.jpeg";
import TabascoStarImage from "../../assets/img/Attack_IMAGES/TabascoStar.jpeg";
import FireBirdStarImage from "../../assets/img/Attack_IMAGES/FireBirdStar.jpeg";
import GasStarImage from "../../assets/img/Attack_IMAGES/GasStar.jpeg";
import FakeHammerImage from "../../assets/img/Attack_IMAGES/FakeHammer.jpeg";




const Goku = {
  name: "Goku",
image: GokuImage,
  // Base Stats
  health: 170,
  maximumHealth: 170,

  mana: 130,
  maximumMana: 130,
  manaRegen: 12,

  defense: {
    amount: 12,
  },

  agility: 28,

  cooldown: 4,
  maximumCooldown: 4,
  recovery: 2,

  attacks: [

    {
      name: "One Inch Punch",
      damage: 58,
      speed: 10,
      cost: 5,
      state: true,
    },
    
    {
      name: "Kamehameha",
      image: Attack1,
      damage: 55,
      speed: 30,
      cost: 18,
      state: true,
    },
    {
      name: "Kaio-ken Rush",
      damage: 65,
      speed: 34,
      cost: 25,
      state: true,
    },
    {
      name: "Meteor Combination",
      damage: 75,
      speed: 30,
      cost: 28,
      state: true,
    },
    {
      name: "Dragon Fist",
      damage: 82,
      speed: 27,
      cost: 45,
      state: true,
    },
    
    

    {
      name: "Spirit Bomb",
      damage: 110,
      speed: 20,
      cost: 130,
      state: true,
      debuff: {
        Cooldown: 2,
        maximumCooldown: 1,
        manaRegen: 7,
      }
    },
  ],
};

export default Goku;
