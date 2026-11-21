import IchigoArenaImage from "../../assets/img/Ichigo.png";

// Attack Images
import Attack1 from "../../assets/img/Attack_IMAGES/Flash Step.jpeg";
import Attack2 from "../../assets/img/Attack_IMAGES/Zangetsu Slash.jpeg";
import Attack3 from "../../assets/img/Attack_IMAGES/Getsuga Tensho.jpeg";
import Attack4 from "../../assets/img/Attack_IMAGES/Getsuga Jūjishō.jpeg";
import Attack5 from "../../assets/img/Attack_IMAGES/Ichigo's Bankai.jpeg";

const Ichigo = {
  name: "Ichigo Kurosaki",
  image: IchigoArenaImage,

  slot: 5, // Maximum attacks this character can equip.

  // Stats
  health: 115,
  mana: 200,
  maximumMana: 200,
  manaRegen: 70,
  cooldown: 3,
  maximumCooldown: 3,
  recovery: 1,
  agility: 50,

  defense: {
    amount: 25,
    active: true,
  },

  // Attacks
  attacks: [
    {
      name: "Flash Step",
      image: Attack1,
      damage: 5,
      speed: 50,
      cost: 14,
      state: true,
      buff: {
        agility: 15,
      },
      debuff: {
        agility: 6,
      },
    },

    {
      name: "Zangetsu Slash",
      image: Attack2,
      damage: 55,
      speed: 40,
      cost: 21,
      state: true,
      buff: {
        agility: 3,
      },
      debuff: {
        defense: 3,
      },
    },

    {
      name: "Getsuga Tenshō",
      image: Attack3,
      damage: 60,
      speed: 40,
      cost: 35,
      state: true,
      buff: {
        mana: 15,
      },
      debuff: {
        health: 5,
        agility: 3,
      },
    },

    {
      name: "Getsuga Jūjishō",
      image: Attack4,
      damage: 65,
      speed: 75,
      cost: 45,
      state: true,
      debuff: {
        defense: 10,
      },
    },

    {
      name: "Bankai: Tensa Zangetsu",
      locked: true,
      unlockCost: 40000,
      image: Attack5,
      damage: 10,
      speed: 40,
      cost: 130,
      state: true,
      turnCooldown: 5,
      buff: {
        health: 40,
        mana: 200,
        agility: 50,
        defense: 5,
        maximumCooldown: 2,
        cooldown: 2,
        recovery: 2,
      },
    },
    {
      id: "ichigo-hollowfication",
      name: "Hollowfication",
      description:
        "Ichigo manifests his Hollow mask, drawing on his inner Hollow to amplify his combat abilities.",
      locked: true,
      unlockCost: 70000,
      damage: 0,
      speed: 0,
      cost: 70,
      uses: 1,
      duration: 3,
      state: true,
      buff: {
        agility: 20,
        defense: 12,
        recovery: 2,
      },
      attackModifiers: {
        targetAttackIds: null,
        stats: {
          damage: { multiplier: 1.2 },
          speed: { multiplier: 1.3 },
        },
      },
    },
    {
      id: "ichigo-festival-mugetsu",
      name: "Mugetsu",
      description:
        "Ichigo releases his ultimate form as an overwhelming wave of darkness.",
      festivalExclusive: true,
      locked: true,
      damage: 180,
      speed: 90,
      uses: 1,
      duration: 1,
      state: true,
      buff: {
        health: 170,
        mana: 100,
        defense: -20,
        agility: -70,
        cooldown: -2,
        recovery: -3,
        maximumCooldown: 2,
        maximumHealth: 60,
      },
      attackModifiers: {
        targetAttackIds: null,
        stats: {
          damage: { multiplier: 1.5 },
          speed: { amount: 140 },
        },
      },
      characterModifiers: {
        agility: {
          multiplier: 1.7,
        },
        defense: {
          multiplier: 1.15,
        },
        manaRegen: {
          multiplier: 1.2,
        },
        cooldown: {
          amount: 4,
        },
        recovery: {
          amount: 1,
        },
      },
      sacrifice: { health: 50 },
    },
  ],
};

export default Ichigo;
