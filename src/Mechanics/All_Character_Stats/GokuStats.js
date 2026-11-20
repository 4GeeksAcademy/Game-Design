import GokuImage from "../../assets/img/Goku.jpeg";

import Attack1 from "../../assets/img/Attack_IMAGES/GokuKamekameha.jpeg";
import TabascoStarImage from "../../assets/img/Attack_IMAGES/TabascoStar.jpeg";
import FireBirdStarImage from "../../assets/img/Attack_IMAGES/FireBirdStar.jpeg";
import Attack4 from "../../assets/img/Attack_IMAGES/Meteor Knuckle";
import FakeHammerImage from "../../assets/img/Attack_IMAGES/FakeHammer.jpeg";




const Goku = {
  name: "Goku",
image: GokuImage,
  // Base Stats
  health: 170,
  maximumHealth: 170,

  mana: 130,
  maximumMana: 130,
  manaRegen: 41,

  defense: {
    amount: 40,
  },

  agility: 40,

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
      damage: 61,
      speed: 30,
      cost: 14,
      state: true,
    },
    {
      name: "Kaio-ken",
      damage: 65,
      speed: 34,
      cost: 17,
      state: true,
    },
    {
      name: "Meteor Knuckle",
      damage: 55,
      speed: 40,
      cost: 20,
      state: true,
    },
    {
      name: "Meteor Knuckle",
      damage: 55,
      speed: 40,
      cost: 20,
      state: true,
    },
    {
      name: "Dragon Fist",
      damage: 92,
      speed: 57,
      cost: 25,
      state: true,
    },
    
    

    {
      name: "Spirit Bomb",
      damage: 110,
      speed: 20,
      cost: 130,
      uses: 1,
      state: true,
      buff: {
        manaRegen: -12,
      }
    },
  ],
};

export default Goku;
