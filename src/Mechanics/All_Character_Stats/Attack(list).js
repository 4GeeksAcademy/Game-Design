const attacklist = {
  attacks: [
    {
      name: "All buff and debuff list",
      damage: 25,
      speed: 30,
      cost: 10,
      uses: 1,
      turnCooldown: 5,
      buffRequiresHit: true,
      heal: {
        amount: 45,
        target: "ally", // target: "allAllies",
      },
      sacrifice: {
        health: 25,
      },

      buff: {
        health: 10,
        mana: 10,
        defense: 5,
        agility: 5,
        cooldown: 2,
        maximumCooldown: 2,
        recovery: 1,
        manaRegen: 5,
        maximumHealth: 50,
        maximumMana: 50,
      },
      debuff: {
        health: 10,
        mana: 10,
        defense: 5,
        agility: 5,
        cooldown: 2,
        maximumCooldown: 2,
        recovery: 1,
        manaRegen: 5,
        maximumHealth: 50,
        maximumMana: 50,
      },
    },
  ],
};
