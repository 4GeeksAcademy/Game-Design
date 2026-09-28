


const character = {
    health: 100,
    mana: 50
};

const attack = {
    state: false,
    damage: 10
};

function attackCharacter() {
    attack.state = true;

    currentHealth(attack, character);

    attack.state = false;
}

function currentHealth(ATK, HP) {
    if (ATK.state == true && ATK.damage > 0 && HP.health > 0) {
        HP.health = HP.health - ATK.damage;

        if (HP.health <= 0) {
            HP.health = 0;
            console.log("Game over");
        }
    }