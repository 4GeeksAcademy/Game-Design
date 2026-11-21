import GokuImage from "../../assets/img/Goku.jpeg";

import Attack1 from "../../assets/img/Attack_IMAGES/kamekameha.jpeg";
import Attack2 from "../../assets/img/Attack_IMAGES/One inch punch.jpeg";
import Attack3 from "../../assets/img/Attack_IMAGES/Kaio Ken 20x.jpeg";
import Attack4 from "../../assets/img/Attack_IMAGES/Meteor Knuckle.jpeg";
import Attack5 from "../../assets/img/Attack_IMAGES/Meteor Barrage.jpeg";
import Attack6 from "../../assets/img/Attack_IMAGES/Dragon Fists.jpeg";
import Attack7 from "../../assets/img/Attack_IMAGES/Goku's Super Saiyan.jpeg";
import Attack8 from "../../assets/img/Attack_IMAGES/Spirit Bomb.jpeg";
import SuperKamehamehaImage from "../../assets/img/Attack_IMAGES/Super Kamekameha.jpeg";

const Goku = {
  name: "Goku",
  image: GokuImage,

  slot: 8, // Maximum attacks this character can equip.
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
      id: "goku-one-inch-punch",
      name: "One Inch Punch",
      image: Attack2,
      damage: 68,
      speed: 10,
      cost: 5,
      state: true,
    },
    {
      id: "goku-kamehameha",
      name: "Kamehameha",
      image: Attack1,
      damage: 61,
      speed: 40,
      cost: 14,
      state: true,
    },
    {
      id: "goku-meteor-knuckle",
      name: "Meteor Knuckle",
      image: Attack4,
      damage: 55,
      speed: 30,
      cost: 21,
      state: true,
    },
    {
      id: "goku-punching-barrage",
      name: "Punching Barrage",
      image: Attack5,
      damage: 55,
      speed: 55,
      cost: 30,
      state: true,
    },
    {
      id: "goku-dragon-fist",
      name: "Dragon Fist",
      image: Attack6,
      damage: 92,
      speed: 47,
      cost: 34,
      state: true,
    },
    {
      name: "Kaio-ken 20x",
      id: "goku-kaio-ken-20x",
      locked: true,
      unlockCost: 20000,
      image: Attack3,
      damage: 0,
      speed: 0,
      cost: 40,
      state: true,
      turnCooldown: 6,
      duration: 3,
      buff: {
        agility: 40,
        manaRegen: 12,
        defense: 20,
        recovery: 2,
      },
      attackModifiers: {
        targetAttackIds: [
          "goku-one-inch-punch",
          "goku-kamehameha",
          "goku-meteor-knuckle",
           "goku-punching-barrage",
           "goku-dragon-fist",
        ],
        stats: {
          damage: {
            multiplier: 1.2,
            amount: 20,
          },
          speed: {
            multiplier: 1.1, // you can add amount along with multiplier too for aditional effect
          },
          cost: {
            multiplier: 0.8,
          },
        },
      },
    },
    {
      name: "Super Saiyan",
      id: "goku-super-saiyan",
      locked: true,
      unlockCost: 45000,
      image: Attack7,
      damage: 0,
      speed: 0,
      cost: 70,
      uses: 2,
      turnCooldown: 5,
      state: true,
      duration: 4,
      buff: {
        health: 130,
        mana: 130,
        agility: 40,
        defense: 20,
        cooldown: 3,
        maximumCooldown: 3,
      },
      attackModifiers: {
        targetAttackIds: [
          "goku-one-inch-punch",
          "goku-kamehameha",
          "goku-meteor-knuckle",
           "goku-punching-barrage",
           "goku-dragon-fist",
           "Spirit-Bomb",
        ],
        stats: {
          damage: {
            multiplier: 1.2,
            amount: 5,
          },
          speed: {
            multiplier: 1.3,
          },
        },
      },
    },

    {
      name: "Spirit Bomb",
      locked: true,
      unlockCost: 300,
      locked: true,
      unlockCost: 300,
      id: "Spirit-Bomb",
      image: Attack8,
      damage: 110,
      speed: 20,
      cost: 130,
      uses: 1,
      state: true,
      buff: {
        manaRegen: -12,
      },
    },
    {
      id: "goku-festival-super-kamehameha",
      name: "Super Kamehameha",
      image: SuperKamehamehaImage,
      description: "Goku gathers a greater amount of ki to unleash a devastating Kamehameha.",
      festivalExclusive: true,
      locked: true,
      damage: 100,
      speed: 28,
      cost: 85,
      uses: 1,
      turnCooldown: 4,
      state: true,
    },
  ],
};

export default Goku;
