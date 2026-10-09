const rockLee = {
    name: "Rock Lee",

    health: 100,
    mana: 50,
    maximumMana: 50,
    manaRegen: 10,
    cooldown: 5,
    recovery: 2,
    agility: 40,
    defense: {
    amount: 12,
    active: true
},

    attacks: [
        {
            name: "Leaf Hurricane",
            damage: 25,
            speed: 45,
            cost: 12,
            state: true
        },

        {
            name: "Rapid Fists",
            damage: 10,
            speed: 60,
            cost: 5,
            state: true
        },
        {
            name: "Ultra Wave",
            damage: 70,
            speed: 50,
            cost: 50,
            state: true
        }
    ]
};

export default rockLee;