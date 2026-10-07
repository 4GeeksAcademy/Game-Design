import { attackCharacter } from "./Health.js";

function aiChooseAttack(ai) {
  let availableAttacks = ai.attacks.filter((attack) => {
    return attack.state === true && ai.mana >= attack.cost;
  });

  if (availableAttacks.length === 0) {
    console.log("AI has no available attacks!");
    return null;
  }

  let randomAttack =
    availableAttacks[Math.floor(Math.random() * availableAttacks.length)];

  return randomAttack;
}

function aiTurn(ai, player, showAttack, hideAttack) {
  let attack = aiChooseAttack(ai);

  if (attack) {
    showAttack(attack);

    setTimeout(() => {
      attackCharacter(attack, ai, player);
      aiFinishTurn(ai);
      hideAttack();
    }, 3000);
  }
}

function aiFinishTurn(ai) {
  ai.turnFinished = true;
}

export { aiChooseAttack, aiTurn, aiFinishTurn };
