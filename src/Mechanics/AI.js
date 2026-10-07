import { attackCharacter } from "./Health.js";

function aiAttack(ai, player) {

  let availableAttacks = ai.attacks.filter((attack) => {
    return attack.state === true && ai.mana >= attack.cost;
  });

  if (availableAttacks.length === 0) {
    console.log("AI has no available attacks!");
    return;
  }

  let randomAttack =
    availableAttacks[
      Math.floor(Math.random() * availableAttacks.length)
    ];

  attackCharacter(randomAttack, ai, player);

  return randomAttack;
}

export { aiAttack };