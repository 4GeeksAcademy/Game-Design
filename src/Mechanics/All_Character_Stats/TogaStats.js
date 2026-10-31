import TogaImage from "/workspaces/Game-Design/src/assets/img/Toga.png";

import Attack1 from "/workspaces/Game-Design/src/assets/img/Attack_IMAGES/Jagged_Spinning_Knife.jpg";
import Attack2 from "/workspaces/Game-Design/src/assets/img/Attack_IMAGES/Sting Dance.jpg";
import Attack3 from "/workspaces/Game-Design/src/assets/img/Attack_IMAGES/Blood Sucker.png";
import Attack4 from "/workspaces/Game-Design/src/assets/img/Attack_IMAGES/Close-Quarters Knife Combo.jpeg";
import Attack5 from "/workspaces/Game-Design/src/assets/img/Attack_IMAGES/Crimson Scythe.png";
import Attack6 from "/workspaces/Game-Design/src/assets/img/Attack_IMAGES/Deadly Waltz.png"



const Toga = {
  name: "Himiko Toga",
  image: TogaImage,
  // Base Stats
  health: 65,
  maximumHealth: 65,

  mana: 150,
  maximumMana: 150,
  manaRegen: 27,

  defense: {
    amount: 10,
  },

  agility: 47,

  cooldown: 5,
  maximumCooldown: 5,
  recovery: 3,

  attacks: [
    {
      // Official move name
      name: "Jagged Spinning Knife",
      image: Attack1,
      damage: 32,
      speed: 38,
      cost: 12,
      state: true,

      buff: {
        health: 6,
        agility: 3,
      },
    },

    {
      // Official move name
      name: "Sting Dance",
      image: Attack2,
      damage: 48,
      speed: 42,
      cost: 20,
      state: true,

      buff: {
        health: 9,
        agility: 4,
      },
    },

    {
      // Official move name
      name: "Blood Sucker",
      image: Attack3,
      damage: 40,
      speed: 35,
      cost: 18,
      state: true,

      buff: {
        health: 16,
        agility: 2,
      },
    },

    {
      // Descriptive gameplay name, not an official named technique
      name: "Close-Quarters Knife Combo",
      image: Attack4,
      damage: 55,
      speed: 45,
      cost: 25,
      state: true,

      buff: {
        health: 11,
        agility: 5,
      },
    },

    {
      // Official ultimate move
      name: "Vampiric Flurry: Crimson Scythe",
      image: Attack5,
      damage: 72,
      speed: 32,
      cost: 38,
      state: true,

      buff: {
        health: 18,
        agility: 3,
      },
    },

    {
      // Official ultimate move
      name: "Deadly Waltz: Arterial Rain",
      image: Attack6,
      damage: 85,
      speed: 30,
      cost: 48,
      state: true,

      buff: {
        health: 22,
        agility: 5,
      },
    },
  ],
};

export default Toga;
