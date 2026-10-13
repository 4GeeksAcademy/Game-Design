import RockLeeArena from "../assets/img/RockLeeArena.jpg";

const rockLee = {
    name: "Rock Lee",
    image: RockLeeArena,

    health: 100,
    mana: 50,
    maximumMana: 50,
    manaRegen: 10,
    cooldown: 5,
    maximumCooldown: 3,
    recovery: 2,
    agility: 35,
    defense: {
    amount: 12,
    active: true
},

    attacks: [
        {
            name: "Leaf Hurricane",
            damage: 35,
            speed: 45,
            cost: 22,
            buff: {
              agility: 3,
            },
            state: true
        },

        {
            name: "Youthful Burst",
            damage: 30,
            speed: 70,
            cost: 30,
            buff: {
        agility: 5,
        mana: 10,
            },
            state: true
        },

        {
            name: "Rapid Fists",
            damage: 15,
            speed: 60,
            cost: 5,
            buff: {
        agility: 10,
        mana: 20,
            },
            state: true
        },
        {
            name: "Barrier Breaker Kick",
            damage: 30,
            speed: 55,
            cost: 45,
            buff: {
        agility: 2,
        mana: 5,
            },
            debuff: {
                defense: 20,
                cooldown: 1,
            },
            state: true
        },

        {
            name: "Hidden Lotus Awakening",
            damage: 0,
            speed: 0,
            cost: 40,
            buff: {
        agility: 5,
        mana: 50,
        defense: 10,
        cooldown: 1,
        maximumCooldown: 1,
        recovery: 1,
            },
            state: true
        },
        {
            name: "Ultra Wind Wave",
            damage: 70,
            speed: 70,
            cost: 50,
            buff: {
                agility: 10,
                maximumCooldown: 1,
                recovery: 1,
                defense: 5, 
            },
            debuff: {
                defense: 5,
                agility: 10,
                maximumCooldown: 2,
                recovery: 1,
            },
            state: true,
        }
    ]
};

export default rockLee;