




function attackCharacter(ATK, attacker, defender) {

    if (attacker.mana >= ATK.cost) {

        attacker.mana = attacker.mana - ATK.cost;

        ATK.state = true;
        currentHealth(ATK, defender);
        ATK.state = false;

    } else {
        console.log("Not enough mana!");
    }
}


function currentHealth(ATK, HP) {

    if (ATK.state == true && ATK.damage > 0 && HP.health > 0) {

        HP.health = HP.health - ATK.damage;

        if (HP.health <= 0) {
            HP.health = 0;
            console.log("Game over");
        }
    }
}