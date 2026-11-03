import PicoloArenaImage from "../../assets/img/picolo.jpg";

import Attack1 from "/workspaces/Game-Design/src/assets/img/Attack_IMAGES/Namekian Regeneration.jpeg";
import Attack2 from "/workspaces/Game-Design/src/assets/img/Attack_IMAGES/Ki Control.png";
import Attack3 from "/workspaces/Game-Design/src/assets/img/Attack_IMAGES/Light Grenade.png";
import Attack4 from "/workspaces/Game-Design/src/assets/img/Attack_IMAGES/Hellzone Grenade.png";
import Attack5 from "../../assets/img/Attack_IMAGES/FakeHammer.jpeg";
import Attack6 from "/workspaces/Game-Design/src/assets/img/Attack_IMAGES/Special Beam Cannon.png"
import Attack7 from "/workspaces/Game-Design/src/assets/img/Attack_IMAGES/Masenko.jpg"

const Picolo = {
  name: "Piccolo",
  image: PicoloArenaImage,

  health: 150,
  mana: 90,
  maximumMana: 90,
  manaRegen: 30,
  cooldown: 3,
  maximumCooldown: 3,
  recovery: 1,
  agility: 25,

  defense: {
    amount: 28,
  },

  attacks: [
    {
      id: "regeneration",
      name: "Namekian Regeneration",
      image: Attack1,
      damage: 0,
      speed: 0,
      cost: 35,
      state: true,
      buff: {
        health: 30,
      },
    },

    {
      id: "ki-control",
      name: "Ki Control",
      image: Attack2,
      damage: 0,
      speed: 0,
      cost: 10,
      state: true,
      buff: {
        defense: 10,
        agility: 5,
        mana: 30,
      },
    },

    


    {
      id: "light-grenade",
      name: "Light Grenade",
      image: Attack3,
      damage: 20,
      speed: 38,
      cost: 10,
      state: true,
      debuff: {
        health: 4,
      },
    },
    
    {
      id: "hellzone-grenade",
      name: "Hellzone Grenade",
      image: Attack4,
      damage: 40,
      speed: 48,
      cost: 13,
      state: true,
      debuff: {
        health: 12,
        defense: 8,
      },
    },

    {
      id: "special-beam-cannon",
      name: "Special Beam Cannon",
      image: Attack5,
      damage: 45,
      speed: 60,
      cost: 15,
      state: true,
    },
    
    {
      id: "explosive-wave",
      name: "Explosive Wave",
      image: Attack6,
      damage: 40,
      speed: 40,
      cost: 20,
      state: true,
      debuff: {
        agility: 10,
        defense: 5,
        maximumCooldown: 2,
      },
    },
    {
      id: "masenko",
      name: "Masenko",
      image: Attack7,
      damage: 25,
      speed: 70,
      cost: 27,
      state: true,
    },
  ],
};

export default Picolo;
