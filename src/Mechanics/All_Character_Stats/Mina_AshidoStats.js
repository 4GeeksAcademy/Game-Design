

import minaArenaImage from "../../assets/img/MinaAshidoArena.jpg";

const mina = {
  name: "Mina Ashido",
  image: minaArenaImage,

  health: 95,
  mana: 80,
  maximumMana: 80,
  manaRegen: 30,
  cooldown: 3,
  maximumCooldown: 3,
  recovery: 1,
  agility: 20,
  defense: {
    amount: 25,
    active: true,
  },

  attacks: [
    {
      name: "Acid Shot",
      damage: 15,
      speed: 40,
      cost: 12,
      state: true,
      uses: 1,
      buff: {
        mana: 20,
      },
      debuff: {
        health: 5,
        mana: 5,
        agility: 2,
      },
    },

    {
      name: "Acid Blast",
      damage: 25,
      speed: 30,
      cost: 15,
      buff: {
        defense: 3,
      },
      debuff: {
        health: 7,
      },
      state: true,
    },

    {
      name: "Acid Bomb",
      damage: 40,
      speed: 10,
      cost: 40,
      
      turnCooldown: 2,
      buffRequiresHit: true,
      buff: {
        defense: 6,
      },
      debuff: {
        health: 15,
        defense: 5,
        agility: 6,
        cooldown: 2,
        recovery: 1,
      },
      state: true,
    },

    {
      name: "Acid Corrosion",
      damage: 10,
      speed: 20,
      cost: 20,
      sacrifice: {
    health: 25,
  },
      debuff: { health: 5, defense: 10, agility: 10, cooldown: 1, recovery: 1 },
      state: true,
    },
    {
  name: "Divine Restoration",
  damage: 0,
  speed: 0,
  cost: 60,
  state: true,

  heal: {
    amount: 25,
    target: "all",

    buff: {
      defense: 5,
      agility: 3,
      mana: 15,
      manaRegen: 2,
      cooldown: 1,
      recovery: 1
    }
  }
},
{
  name: "Healing Pulse",
  damage: 0,
  speed: 0,
  cost: 35,
  state: true,

  heal: {
    amount: 45,
    target: "selected",

    buff: {
      defense: 10,
      agility: 5,
      mana: 20,
      manaRegen: 3,
      cooldown: 1,
      recovery: 2
    }
  }
}
  ],
};

export default mina;
