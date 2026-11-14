import TenTenArenaImage from "../../assets/img/Tenten.jpg";

import Attack1 from "../../assets/img/Attack_IMAGES/Kunai Throw.jpg";
import Attack2 from "../../assets/img/Attack_IMAGES/Jidanda.png";
import Attack3 from "../../assets/img/Attack_IMAGES/Explosive Tags.png";
import Attack4 from "../../assets/img/Attack_IMAGES/Segmented Iron Dome.png";
import Attack5 from "../../assets/img/Attack_IMAGES/Twin Rising Dragons.png";
import Attack6 from "../../assets/img/Attack_IMAGES/Bashosen: Scroll Of Fire.png";
import Attack7 from "../../assets/img/Attack_IMAGES/Bashōsen: Coil of Wind.png";

const TenTen = {
  name: "Tenten",
  image: TenTenArenaImage,

  health: 95,
  mana: 100,
  maximumMana: 100,
  manaRegen: 25,
  cooldown: 3,
  maximumCooldown: 3,
  recovery: 1,
  agility: 35,

  defense: {
    amount: 15,
  },

  attacks: [
    {
      id: "tenten-kunai-throw",
      name: "Kunai Throw",
      image: Attack1,
      description: "Throws a kunai at the opponent with quick precision.",
      damage: 15,
      speed: 40,
      cost: 3,
      state: true,
    },

    {
      name: "Unsealing Jutsu - Jidanda",

      image: Attack2,
      damage: 30,
      speed: 45,
      cost: 10,
      state: true,
      debuff: {
        cooldown: 1,
      },
    },

    {
      id: "tenten-explosive-tags",
      name: "Explosive Tags",
      image: Attack3,
      description:
        "Throws explosive tags that damage the opponent and reduce their agility.",
      damage: 25,
      speed: 25,
      cost: 12,
      state: true,
      debuff: {
        health: 5,
        agility: 10,
      },
    },

    {
      name: "Unsealing Technique: Segmented Iron Dome",
      image: Attack4,
      damage: 0,
      speed: 0,
      cost: 30,
      state: true,
      buff: {
        defense: 20,
      },
    },

    {
      name: "Twin Rising Dragons",
      image: Attack5,
      description:
        "Uses her scrolls to unleash a large wave of weapons against the opponent.",
      damage: 42,
      speed: 30,
      cost: 25,
      state: true,
      debuff: {
        agility: 20,
        cooldown: 1,
      },
    },

    {
      name: "Bashosen: Scroll Of Fire",
      image: Attack6,

      damage: 70,
      speed: 40,
      cost: 45,
      state: true,
      debuff: {
        health: 10,
        defense: 3,
        mana: 20,
        maximumCooldown: 1,
      },
    },

    {
      name: "Bashōsen: Coil of Wind",
      image: Attack7,
      description:
        "Attacks with a chained sickle, dealing damage and weakening the opponent's defense.",
      damage: 70,
      speed: 41,
      cost: 45,
      state: true,
      debuff: {
        health: 3,
        defense: 7,
        manaRegen: 7,
        cooldown: 1,
      },
    },
  ],
};

export default TenTen;
