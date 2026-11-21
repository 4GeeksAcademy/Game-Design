// Festival-exclusive attacks are registered here so the character stat
// files, Festival reward track, Inventory, and battle loadouts all use the
// exact same attack IDs and balance values.

export const FESTIVAL_ATTACKS_BY_CHARACTER = {
  mina: [
    {
      id: "mina-festival-acidman",
      name: "Acidman: Alma",
      description: "Mina coats herself in a resilient layer of acid, trading offense for a short defensive boost.",
      festivalExclusive: true,
      locked: true,
      damage: 0,
      speed: 0,
      cost: 32,
      uses: 2,
      turnCooldown: 3,
      duration: 2,
      state: true,
      buff: {
        defense: 12,
        agility: 5,
      },
    },
  ],
  luffy: [
    {
      id: "luffy-festival-elephant-gun",
      name: "Gum-Gum Elephant Gun",
      description: "Luffy enlarges and hardens his arm with Haki before delivering a heavy, crushing punch.",
      festivalExclusive: true,
      locked: true,
      damage: 70,
      speed: 25,
      cost: 35,
      turnCooldown: 2,
      state: true,
    },
  ],
  naruto: [
    {
      id: "naruto-festival-big-ball-rasengan",
      name: "Big Ball Rasengan",
      description: "Naruto forms an enlarged Rasengan that hits harder than his standard version at a greater chakra cost.",
      festivalExclusive: true,
      locked: true,
      damage: 68,
      speed: 42,
      cost: 42,
      state: true,
      debuff: {
        defense: 8,
      },
      debuffRequiresHit: true,
    },
  ],
  goku: [
    {
      id: "goku-festival-super-kamehameha",
      name: "Super Kamehameha",
      description: "Goku gathers a much larger amount of ki to unleash a devastating Kamehameha.",
      festivalExclusive: true,
      locked: true,
      damage: 100,
      speed: 28,
      cost: 85,
      uses: 1,
      turnCooldown: 4,
      state: true,
    },
  ],
  ichigo: [
    {
      id: "ichigo-festival-mugetsu",
      name: "Mugetsu",
      description: "Ichigo releases the power of the Final Getsuga Tenshō in one overwhelming strike, at a severe personal cost.",
      festivalExclusive: true,
      locked: true,
      damage: 125,
      speed: 25,
      cost: 150,
      uses: 1,
      turnCooldown: 6,
      state: true,
      sacrifice: {
        health: 35,
      },
    },
  ],
};

export function getFestivalAttack(characterId, attackId) {
  return FESTIVAL_ATTACKS_BY_CHARACTER[characterId]?.find(
    (attack) => attack.id === attackId,
  ) ?? null;
}
