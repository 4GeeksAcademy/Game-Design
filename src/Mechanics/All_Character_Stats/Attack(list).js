const attacklist = {
  attacks: [
    {
      name: "All buff and debuff list",
      damage: 25,
      speed: 30,
      cost: 10,
      uses: 1,
      turnCooldown: 5,
      debuffRequiresHit: true,
      buffRequiresHit: true,
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
      heal: {
        amount: 45,
        target: "selected", // or "all"

        buff: {
          defense: 10,
          agility: 5,
          mana: 20,
          manaRegen: 3,
          cooldown: 1,
          recovery: 2,
        },
      },
      duration: 1, // this modifies the attackModifiers and characterModifiers where it temporarily increases/decreases the stats for each attack applied. 
                  // Not to be confused with turnCooldown where it disables the attack after use.


      attackModifiers: {
        targetAttackIds: null, // or attack id
        stats: {
          damage: {
            multiplier: 1.5, // or amount: 25
          },
          speed: {
            multiplier: 0.75, // you can add amount along with multiplier too for aditional effect 
          },
          cost: {
            multiplier: 1.3,
          },
        },
      },

      characterModifiers: {
        agility: {
          multiplier: 0.7,
        },
        defense: {
          multiplier: 1.15,
        },
        manaRegen: {
          multiplier: 0.8,
        },
        recovery: {
          multiplier: 0.75,
        },

        // maximumCooldown
        // cooldown
      },

      stunRequiresHit: true,
    },
  ],
};
