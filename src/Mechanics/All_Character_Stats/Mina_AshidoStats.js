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
      speed: 45,
      cost: 12,
      state: true,

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
      speed: 20,
      cost: 40,

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
      cost: 25,
      debuff: { health: 10, defense: 10, agility: 10, cooldown: 1, recovery: 1 },
      state: true,
      // STUN CONFIGURATION
      stun: {
        type: "random", // "selected" | "random" | "all"
        amount: 1, // attacks affected
        duration: 2, // how long it will last
      },

      // Only apply stun if the attack successfully hits.
      stunRequiresHit: true,
    },
  ],
};

export default mina;
