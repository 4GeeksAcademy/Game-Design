import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { roster } from "./Main Page/CharacterSelection";
import { attackCharacter, evadeAttack } from "./Health.js";
import VictoryScreen from "./VictoryScreen.jsx";
import GameOverScreen from "./GameOverScreen.jsx";
import "./Teambattle.css";

// Give each fighter independent stats and attack objects.
function createBattleFighter(id) {
  const selectedFighter = roster.find((fighter) => fighter.id === id);

  if (!selectedFighter?.data) {
    return null;
  }

  const data = selectedFighter.data;

  return {
    ...data,

    id: selectedFighter.id,
    image: selectedFighter.image ?? data.image,

    // Give this fighter independent health and mana values.
    health: data.health,
    maximumHealth: data.maximumHealth ?? data.health,
    mana: data.mana,
    maximumMana: data.maximumMana ?? data.mana,

    // Copy the defense object so it cannot be shared.
    defense:
      typeof data.defense === "object" && data.defense !== null
        ? { ...data.defense }
        : data.defense,

    // Create new attack objects for this specific fighter.
    attacks: (data.attacks ?? []).map((attack) => ({
      ...attack,
      state: true,
      buff: attack.buff ? { ...attack.buff } : attack.buff,
      debuff: attack.debuff ? { ...attack.debuff } : attack.debuff,
    })),

    // Initialize battle-specific state.
    turnFinished: false,
    blocked: false,
  };
}

function FighterPreview({ fighter, isSelected, onClick, team }) {
  const isPlayer = team === "player";

  const defense =
    typeof fighter.defense === "object" && fighter.defense !== null
      ? (fighter.defense.amount ?? 0)
      : (fighter.defense ?? 0);

  const agility = fighter.agility ?? 0;

  const defensePercent = Math.min(100, Math.max(0, defense));
  const agilityPercent = Math.min(100, Math.max(0, agility));

  const healthPercent =
    fighter.maximumHealth > 0
      ? (Math.max(0, fighter.health) / fighter.maximumHealth) * 100
      : 0;

  const manaPercent =
    fighter.maximumMana > 0
      ? (Math.max(0, fighter.mana) / fighter.maximumMana) * 100
      : 0;

  return (
    <button
      type="button"
      className={[
        "fighter-card",
        `fighter-${team}`,
        isSelected ? "is-selected" : "",
        fighter.health <= 0 ? "is-defeated" : "",
        fighter.blocked ? "is-blocking" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={onClick}
      disabled={fighter.health <= 0 || team === "opponent"}
      aria-label={`${fighter.name}, ${fighter.health} health remaining`}
    >
      <h3 className="fighter-name">
        {fighter.name}
        {isSelected ? " ✓" : ""}
      </h3>

      {fighter.image && (
        <img
          className="fighter-portrait"
          src={fighter.image}
          alt={fighter.name}
        />
      )}

      <div className="fighter-resource">
        <span className="resource-label">HP</span>

        <div className="resource-track">
          <div
            className="resource-fill health-fill"
            style={{ width: `${healthPercent}%` }}
          />
        </div>

        <span>
          {Math.max(0, fighter.health)}/{fighter.maximumHealth}
        </span>
      </div>

      <div className="fighter-resource">
        <span className="resource-label">MP</span>

        <div className="resource-track">
          <div
            className="resource-fill mana-fill"
            style={{ width: `${manaPercent}%` }}
          />
        </div>

        <span>
          {fighter.mana}/{fighter.maximumMana}
        </span>
      </div>

      <div className="fighter-stat">
        <span>DEF</span>

        <div className="resource-track">
          <div
            className="resource-fill defense-fill"
            style={{ width: `${defensePercent}%` }}
          />
        </div>

        <span>{defense}</span>
      </div>

      <div className="fighter-stat">
        <span>AGI</span>

        <div className="resource-track">
          <div
            className="resource-fill agility-fill"
            style={{ width: `${agilityPercent}%` }}
          />
        </div>

        <span>{agility}</span>
      </div>

      <div className="fighter-detail">
        <span>Cooldown</span>
        <strong>{fighter.cooldown ?? 0}</strong>
      </div>

      <div className="fighter-detail">
        <span>Recovery</span>
        <strong>{fighter.recovery ?? 0}</strong>
      </div>

      <div className="fighter-detail">
        <span>Mana Regen</span>
        <strong>{fighter.manaRegen ?? 0}</strong>
      </div>
    </button>
  );
}

function PlayerAttackPanel({
  fighter,
  isActive,
  phase,
  onSelect,
  onAttack,
  onFinishTurn,
}) {
  if (!fighter) return null;

  const canAct =
    phase === "fighting" && fighter.health > 0 && !fighter.turnFinished;

  return (
    <section className={`player-attack-panel ${isActive ? "" : "is-inactive"}`}>
      <h3 className="attack-panel-title">
        {fighter.name}'s Attacks
        {isActive ? " ★" : ""}
      </h3>

      <div className="attack-grid">
        {fighter.attacks.map((attack, index) => {
          const canUseAttack =
            canAct &&
            attack.state === true &&
            fighter.mana >= (attack.cost ?? 0);

          return (
            <button
              key={`${fighter.id}-${index}`}
              type="button"
              className="attack-button"
              disabled={!canUseAttack}
              onClick={() => {
                onSelect(fighter.id);
                onAttack(fighter.id, index);
              }}
            >
              <strong>{attack.name}</strong>

              <span>DMG: {attack.damage ?? 0}</span>

              <span>MP: {attack.cost ?? 0}</span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className="finish-turn-button"
        disabled={!canAct}
        onClick={() => {
          onSelect(fighter.id);
          onFinishTurn(fighter.id);
        }}
      >
        {fighter.turnFinished ? "TURN FINISHED" : "FINISH TURN"}
      </button>
    </section>
  );
}

export default function TeamBattle() {
  const [pendingDefense, setPendingDefense] = useState(null);
  const [cpuActionQueue, setCpuActionQueue] = useState(null);
  const [cpuActionIndex, setCpuActionIndex] = useState(0);
  const [defenseTimeLeft, setDefenseTimeLeft] = useState(10);
  const [damageDealt, setDamageDealt] = useState(0);
  const [attacksUsed, setAttacksUsed] = useState(0);
  const [combatMessage, setCombatMessage] = useState(
    "Choose your fighter and target.",
  );
  const [combatPopups, setCombatPopups] = useState([]);
  const popupIdRef = useRef(0);
  const location = useLocation();
  const [targetAssignments, setTargetAssignments] = useState({});

  const { playerTeamIds = [], opponentTeamIds = [] } = location.state ?? {};

  const [teams, setTeams] = useState(() => ({
    player: playerTeamIds.map(createBattleFighter),
    opponent: opponentTeamIds.map(createBattleFighter),
  }));

  const [activePlayerId, setActivePlayerId] = useState(
    () => playerTeamIds[0] ?? null,
  );

  const [targetOpponentId, setTargetOpponentId] = useState(
    () => opponentTeamIds[0] ?? null,
  );

  const hasValidTeams =
    teams.player.length === 2 &&
    teams.opponent.length === 2 &&
    teams.player.every(Boolean) &&
    teams.opponent.every(Boolean);

  const bothOpponentsAlive = teams.opponent.every(
    (fighter) => fighter.health > 0,
  );

  const [phase, setPhase] = useState("selecting");
  const [roundTargets, setRoundTargets] = useState({});
  const [cpuTargets, setCpuTargets] = useState({});
  const [roundNumber, setRoundNumber] = useState(1);

  const cpuTurnRunning = useRef(false);
  const defenseResolvedRef = useRef(false);

  const getTargetAssignedToOtherFighter = (fighterId) => {
    return Object.entries(targetAssignments).find(
      ([assignedFighterId, assignedTargetId]) =>
        assignedFighterId !== fighterId &&
        assignedTargetId === targetOpponentId,
    );
  };
  const showCombatMessage = (message) => {
    setCombatMessage(message);

    if (!message) return;

    const popup = {
      id: ++popupIdRef.current,
      message,
    };

    setCombatPopups((current) => [...current, popup]);
  };

  
useEffect(() => {
  if (combatPopups.length === 0) return;

  const oldestPopupId = combatPopups[0].id;

  const timeout = setTimeout(() => {
    setCombatPopups((current) =>
      current.filter((popup) => popup.id !== oldestPopupId),
    );
  }, 1800);

  return () => clearTimeout(timeout);
}, [combatPopups[0]?.id]);


  useEffect(() => {
    if (!pendingDefense || phase !== "cpu-fighting") {
      setDefenseTimeLeft(10);
      return;
    }

    let remaining = 10;
    setDefenseTimeLeft(remaining);

    const timer = setInterval(() => {
      remaining -= 1;
      setDefenseTimeLeft(Math.max(remaining, 0));

      if (remaining <= 0) {
        clearInterval(timer);
        resolveCPUDefense("timeout");
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [pendingDefense, phase]);

  useEffect(() => {
    if (phase !== "cpu-fighting" || pendingDefense) return;

    // STEP A: Build the CPU's action queue once per turn.
    if (cpuActionQueue === null) {
      const queue = [];

      teams.opponent.forEach((cpu) => {
        if (cpu.health <= 0) return;

        const targetId = cpuTargets[cpu.id];
        const target = teams.player.find(
          (player) => player.id === targetId && player.health > 0,
        );

        if (!target) return;

        const availableAttacks = cpu.attacks
          .map((attack, attackIndex) => ({ attack, attackIndex }))
          .filter(
            ({ attack }) =>
              attack.state === true && cpu.mana >= (attack.cost ?? 0),
          );

        if (availableAttacks.length === 0) return;

        const choice =
          availableAttacks[Math.floor(Math.random() * availableAttacks.length)];

        queue.push({
          cpuId: cpu.id,
          targetId: target.id,
          attackIndex: choice.attackIndex,
        });
      });

      setCpuActionQueue(queue);
      setCpuActionIndex(0);
      showCombatMessage("The CPU team is preparing its attacks!");
      return;
    }

    // STEP B: If every queued action is finished, end the CPU turn.
    if (cpuActionIndex >= cpuActionQueue.length) {
      const livingPlayers = teams.player.filter(
        (fighter) => fighter.health > 0,
      );

      const livingCPU = teams.opponent.filter((fighter) => fighter.health > 0);

      if (livingPlayers.length === 0) {
        setCombatMessage("Defeat! Your entire team has been defeated.");
        setPhase("defeat");
        return;
      }

      if (livingCPU.length === 0) {
        setCombatMessage("Victory! The entire CPU team has been defeated!");
        setPhase("victory");
        return;
      }

      // Regenerate mana and refresh attacks for the next round.
      const resetFighters = (fighters) =>
        fighters.map((fighter) => ({
          ...fighter,
          mana:
            fighter.health > 0
              ? Math.min(
                  fighter.maximumMana ?? fighter.mana,
                  fighter.mana + (fighter.manaRegen ?? 0),
                )
              : fighter.mana,
          turnFinished: false,
          attacks: fighter.attacks.map((attack) => ({
            ...attack,
            state: true,
            buff: attack.buff ? { ...attack.buff } : attack.buff,
            debuff: attack.debuff ? { ...attack.debuff } : attack.debuff,
          })),
        }));

      setTeams({
        player: resetFighters(teams.player),
        opponent: resetFighters(teams.opponent),
      });

      setRoundTargets({});
      setCpuTargets({});
      setTargetAssignments({});
      setCpuActionQueue(null);
      setCpuActionIndex(0);
      setRoundNumber((previous) => previous + 1);

      setCombatMessage("A new round begins! Choose your targets.");
      setPhase("selecting");
      return;
    }

    // STEP C: Reveal the next CPU attack and wait for your response.
    const action = cpuActionQueue[cpuActionIndex];

    const cpu = teams.opponent.find((fighter) => fighter.id === action.cpuId);

    const target = teams.player.find(
      (fighter) => fighter.id === action.targetId,
    );

    // Skip actions if a fighter or their target has been defeated.
    if (!cpu || cpu.health <= 0 || !target || target.health <= 0) {
      setCpuActionIndex((previous) => previous + 1);
      return;
    }

    const attack = cpu.attacks[action.attackIndex];

    if (!attack || attack.state !== true || cpu.mana < (attack.cost ?? 0)) {
      setCpuActionIndex((previous) => previous + 1);
      return;
    }

    defenseResolvedRef.current = false;

    setPendingDefense({
      cpuId: cpu.id,
      targetId: target.id,
      attackIndex: action.attackIndex,
    });

    showCombatMessage(
      `${cpu.name} is preparing ${attack.name}! Choose Defend or Evade.`,
    );
  }, [
    phase,
    pendingDefense,
    cpuActionQueue,
    cpuActionIndex,
    teams.player,
    teams.opponent,
    cpuTargets,
    setTargetAssignments,
  ]);

  const selectRoundTarget = (fighterId, opponentId) => {
    const fighter = teams.player.find((fighter) => fighter.id === fighterId);

    const opponent = teams.opponent.find(
      (fighter) => fighter.id === opponentId,
    );

    if (!fighter || !opponent) return;
    if (fighter.health <= 0 || opponent.health <= 0) return;

    const anotherFighterHasTarget = Object.entries(roundTargets).some(
      ([assignedFighterId, assignedOpponentId]) =>
        assignedFighterId !== fighterId && assignedOpponentId === opponentId,
    );

    if (anotherFighterHasTarget) {
      showCombatMessage(
        `${opponent.name} is already assigned to your teammate this round.`,
      );
      return;
    }

    setRoundTargets((previous) => ({
      ...previous,
      [fighterId]: opponentId,
    }));

    showCombatMessage(
      `${fighter.name} will fight ${opponent.name} this round.`,
    );
  };

  const confirmPlayerTargets = () => {
    const livingPlayers = teams.player.filter((fighter) => fighter.health > 0);

    const livingOpponents = teams.opponent.filter(
      (fighter) => fighter.health > 0,
    );

    // Make sure each living player has a valid target.
    const selectedTargets = livingPlayers.filter((player) =>
      livingOpponents.some(
        (opponent) => opponent.id === roundTargets[player.id],
      ),
    ).length;

    const requiredTargets = Math.min(
      livingPlayers.length,
      livingOpponents.length,
    );

    if (selectedTargets < requiredTargets) {
      setCombatMessage("Choose your available targets before continuing.");
      return;
    }

    // Give each living CPU a different living player to target.
    const newCpuTargets = {};
    const availablePlayers = [...livingPlayers];

    // Shuffle the CPU order so the same CPU doesn't always attack first.
    const shuffledCPUs = [...livingOpponents];

    for (let i = shuffledCPUs.length - 1; i > 0; i--) {
      const randomIndex = Math.floor(Math.random() * (i + 1));

      [shuffledCPUs[i], shuffledCPUs[randomIndex]] = [
        shuffledCPUs[randomIndex],
        shuffledCPUs[i],
      ];
    }

    shuffledCPUs.forEach((cpu) => {
      if (availablePlayers.length === 0) return;

      const randomIndex = Math.floor(Math.random() * availablePlayers.length);

      const chosenPlayer = availablePlayers.splice(randomIndex, 1)[0];

      newCpuTargets[cpu.id] = chosenPlayer.id;
    });

    setCpuTargets(newCpuTargets);
    showCombatMessage("Targets locked! The battle begins!");
    setPhase("fighting");
  };

  const resolvePlayerTurnStatus = (players, opponents, targets) => {
    const updatedPlayers = players.map((player) => {
      // Defeated fighters are automatically finished.
      if (player.health <= 0) {
        return { ...player, turnFinished: true };
      }

      const targetId = targets[player.id];

      const livingTarget = opponents.find(
        (opponent) => opponent.id === targetId && opponent.health > 0,
      );

      // Skip this fighter if they have no living opponent to attack.
      if (!livingTarget) {
        return { ...player, turnFinished: true };
      }

      return player;
    });

    const allLivingPlayersFinished = updatedPlayers.every(
      (player) => player.health <= 0 || player.turnFinished,
    );

    return { updatedPlayers, allLivingPlayersFinished };
  };

  const finishPlayerTurn = (fighterId) => {
    const fighter = teams.player.find((player) => player.id === fighterId);

    if (!fighter || fighter.health <= 0 || fighter.turnFinished) {
      return;
    }

    const playersAfterFinishing = teams.player.map((player) =>
      player.id === fighterId ? { ...player, turnFinished: true } : player,
    );

    const { updatedPlayers, allLivingPlayersFinished } =
      resolvePlayerTurnStatus(
        playersAfterFinishing,
        teams.opponent,
        roundTargets,
      );

    setTeams((previous) => ({
      ...previous,
      player: updatedPlayers,
    }));

    if (allLivingPlayersFinished) {
      showCombatMessage(
        "Your team has finished its turn! The CPU team is preparing to attack.",
      );
      setPhase("cpu-fighting");
    } else {
      showCombatMessage(
        `${fighter.name} has finished their turn. Your teammate can keep fighting!`,
      );
    }
  };

  const useAttack = (fighterId, attackIndex) => {
    if (phase !== "fighting") return;

    // Copy fighters and their attacks before combat changes their stats.
    const updatedPlayers = teams.player.map((fighter) => ({
      ...fighter,
      defense:
        typeof fighter.defense === "object" && fighter.defense !== null
          ? { ...fighter.defense }
          : fighter.defense,
      attacks: fighter.attacks.map((attack) => ({
        ...attack,
        buff: attack.buff ? { ...attack.buff } : attack.buff,
        debuff: attack.debuff ? { ...attack.debuff } : attack.debuff,
      })),
    }));

    const updatedOpponents = teams.opponent.map((fighter) => ({
      ...fighter,
      defense:
        typeof fighter.defense === "object" && fighter.defense !== null
          ? { ...fighter.defense }
          : fighter.defense,
      attacks: fighter.attacks.map((attack) => ({
        ...attack,
        buff: attack.buff ? { ...attack.buff } : attack.buff,
        debuff: attack.debuff ? { ...attack.debuff } : attack.debuff,
      })),
    }));

    const attacker = updatedPlayers.find((fighter) => fighter.id === fighterId);

    const defender = updatedOpponents.find(
      (fighter) => fighter.id === roundTargets[fighterId],
    );

    if (!attacker || !defender) return;

    if (attacker.health <= 0 || attacker.turnFinished) {
      return;
    }

    if (defender.health <= 0) {
      setCombatMessage("That opponent has already been defeated.");
      return;
    }

    const attack = attacker.attacks[attackIndex];

    if (!attack || attack.state !== true) {
      setCombatMessage("That attack has already been used.");
      return;
    }

    const defenderHealthBefore = defender.health;

    const result = attackCharacter(attack, attacker, defender);

    if (!result) {
      setCombatMessage("Not enough mana to use that attack!");
      return;
    }

    const actualDamage = Math.max(
      0,
      defenderHealthBefore - Math.max(0, defender.health),
    );

    setDamageDealt((previous) => previous + actualDamage);
    setAttacksUsed((previous) => previous + 1);

    // If every CPU fighter is defeated, finish the battle immediately.
    const livingOpponents = updatedOpponents.filter(
      (fighter) => fighter.health > 0,
    );

    if (livingOpponents.length === 0) {
      setTeams({
        player: updatedPlayers,
        opponent: updatedOpponents,
      });
      setCombatMessage("Victory! The entire CPU team has been defeated!");
      setPhase("victory");
      return;
    }

    // Automatically finish fighters who no longer have a living target.
    const { updatedPlayers: playersAfterSkips, allLivingPlayersFinished } =
      resolvePlayerTurnStatus(updatedPlayers, updatedOpponents, roundTargets);

    setTeams({
      player: playersAfterSkips,
      opponent: updatedOpponents,
    });

    const automaticallySkipped = playersAfterSkips.some((player) => {
      const previousPlayer = teams.player.find(
        (previous) => previous.id === player.id,
      );

      const hasLivingTarget = updatedOpponents.some(
        (opponent) =>
          opponent.id === roundTargets[player.id] && opponent.health > 0,
      );

      return (
        player.health > 0 &&
        player.turnFinished &&
        !previousPlayer?.turnFinished &&
        !hasLivingTarget
      );
    });

    showCombatMessage(
      `${attacker.name} used ${attack.name} on ${defender.name}!${
        automaticallySkipped
          ? " Fighters without a living target have been automatically skipped."
          : ""
      }`,
    );

    // Start the CPU phase only after every living player is finished.
    if (allLivingPlayersFinished) {
      showCombatMessage(
        `${attacker.name} used ${attack.name}! Your team has no remaining actions. The CPU team is preparing to attack.`,
      );
      setPhase("cpu-fighting");
    }
  };

  const resolveCPUDefense = (choice) => {
    if (
      !pendingDefense ||
      phase !== "cpu-fighting" ||
      defenseResolvedRef.current
    ) {
      return;
    }

    // Copy both teams so React receives updated fighter objects.
    const updatedPlayers = teams.player.map((fighter) => ({
      ...fighter,
      defense:
        typeof fighter.defense === "object" && fighter.defense !== null
          ? { ...fighter.defense }
          : fighter.defense,
    }));

    const updatedCPU = teams.opponent.map((fighter) => ({
      ...fighter,
      defense:
        typeof fighter.defense === "object" && fighter.defense !== null
          ? { ...fighter.defense }
          : fighter.defense,
      attacks: fighter.attacks.map((attack) => ({
        ...attack,
        buff: attack.buff ? { ...attack.buff } : attack.buff,
        debuff: attack.debuff ? { ...attack.debuff } : attack.debuff,
      })),
    }));

    const attacker = updatedCPU.find(
      (fighter) => fighter.id === pendingDefense.cpuId,
    );

    const defender = updatedPlayers.find(
      (fighter) => fighter.id === pendingDefense.targetId,
    );

    if (!attacker || !defender) return;

    if (attacker.health <= 0 || defender.health <= 0) {
      setPendingDefense(null);
      setCpuActionIndex((previous) => previous + 1);
      return;
    }

    const attack = attacker.attacks[pendingDefense.attackIndex];

    if (!attack || attack.state !== true) {
      setPendingDefense(null);
      setCpuActionIndex((previous) => previous + 1);
      return;
    }
    defenseResolvedRef.current = true;

    let result;

    if (choice === "defend") {
      const defenseAmount =
        typeof defender.defense === "object"
          ? (defender.defense?.amount ?? 0)
          : (defender.defense ?? 0);

      result = attackCharacter(attack, attacker, defender, defenseAmount);
    } else if (choice === "evade") {
      result = evadeAttack(attack, attacker, defender);
    } else {
      // The timer expired, so the attack lands without defensive protection.
      result = attackCharacter(attack, attacker, defender);
    }

    if (!result) {
      showCombatMessage("The defensive action could not be completed.");

      setPendingDefense(null);
      setCpuActionIndex((previous) => previous + 1);
      return;
    }

    // Only an actual defensive choice uses cooldown and marks the fighter blocked.
    if (choice === "defend" || choice === "evade") {
      defender.cooldown = Math.max(0, (defender.cooldown ?? 0) - 1);
      defender.blocked = true;
    }

    if (choice === "defend") {
      showCombatMessage(
        `${defender.name} defended ${attacker.name}'s ${attack.name}!`,
      );
    } else if (choice === "evade") {
      showCombatMessage(
        result.evaded
          ? `${defender.name} evaded ${attacker.name}'s ${attack.name}!`
          : `${defender.name} failed to evade ${attacker.name}'s ${attack.name}!`,
      );
    } else {
      showCombatMessage(
        `Time ran out! ${attacker.name}'s ${attack.name} hit ${defender.name}!`,
      );
    }

    setTeams({
      player: updatedPlayers,
      opponent: updatedCPU,
    });

    // Clear the prompt and allow the next CPU action to proceed.
    setPendingDefense(null);
    setCpuActionIndex((previous) => previous + 1);
  };

  const resetBattle = () => {
    setTeams({
      player: playerTeamIds.map(createBattleFighter),
      opponent: opponentTeamIds.map(createBattleFighter),
    });

    setActivePlayerId(playerTeamIds[0] ?? null);
    setTargetOpponentId(opponentTeamIds[0] ?? null);

    setTargetAssignments({});
    setRoundTargets({});
    setCpuTargets({});
    setRoundNumber(1);
    setPendingDefense(null);
    setCpuActionQueue(null);
    setCpuActionIndex(0);

    setDamageDealt(0);
    setAttacksUsed(0);

    setCombatMessage("Choose your fighter and target.");
    setPhase("selecting");
  };

  const pendingAttacker = pendingDefense
    ? teams.opponent.find((fighter) => fighter.id === pendingDefense.cpuId)
    : null;

  const pendingTarget = pendingDefense
    ? teams.player.find((fighter) => fighter.id === pendingDefense.targetId)
    : null;

  const pendingAttack = pendingAttacker?.attacks[pendingDefense?.attackIndex];

  if (!hasValidTeams) {
    return (
      <div style={{ color: "white", padding: "24px" }}>
        <h2>Unable to load the 2v2 teams</h2>
        <p>
          Return to character selection and choose two fighters for each team.
        </p>
        <p>Player team: {playerTeamIds.join(", ") || "No fighters selected"}</p>
        <p>
          Opponent team: {opponentTeamIds.join(", ") || "No fighters selected"}
        </p>
      </div>
    );
  }

  if (phase === "victory") {
    return (
      <VictoryScreen
        damageDealt={damageDealt}
        attacksUsed={attacksUsed}
        message="Your team has defeated the entire opposing team!"
        onRematch={resetBattle}
      />
    );
  }

  if (phase === "defeat") {
    return (
      <GameOverScreen
        damageDealt={damageDealt}
        attacksUsed={attacksUsed}
        message="Your entire team has been defeated. Fight again!"
        onRematch={resetBattle}
      />
    );
  }

  return (
    <main className="team-battle">
      <h1 className="team-battle-title">
        2v2 Team Battle — Round {roundNumber}
      </h1>

      {(phase === "selecting" || phase === "cpu-selecting") && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.8)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "#191919",
              color: "white",
              border: "2px solid #13d5ff",
              borderRadius: "16px",
              padding: "28px",
              width: "min(90%, 500px)",
              maxHeight: "85vh",
              overflowY: "auto",
              textAlign: "center",
            }}
          >
            <h2>Choose Your Opponents</h2>
            <p>Select one opponent for each living teammate.</p>

            {teams.player
              .filter((fighter) => fighter.health > 0)
              .map((fighter) => (
                <div
                  key={fighter.id}
                  style={{
                    marginBottom: "20px",
                    padding: "12px",
                    border: "1px solid #444",
                    borderRadius: "10px",
                  }}
                >
                  <h3>{fighter.name}</h3>

                  {teams.opponent
                    .filter((opponent) => opponent.health > 0)
                    .map((opponent) => {
                      const claimedByTeammate = Object.entries(
                        roundTargets,
                      ).some(
                        ([assignedFighterId, assignedOpponentId]) =>
                          assignedFighterId !== fighter.id &&
                          assignedOpponentId === opponent.id,
                      );

                      const selected = roundTargets[fighter.id] === opponent.id;

                      return (
                        <button
                          key={opponent.id}
                          type="button"
                          disabled={claimedByTeammate}
                          onClick={() =>
                            selectRoundTarget(fighter.id, opponent.id)
                          }
                          style={{
                            display: "block",
                            width: "100%",
                            marginTop: "8px",
                            padding: "12px",
                            borderRadius: "8px",
                            border: selected
                              ? "2px solid #13d5ff"
                              : "1px solid #555",
                            background: selected ? "#163746" : "#252525",
                            color: "white",
                            cursor: claimedByTeammate
                              ? "not-allowed"
                              : "pointer",
                            opacity: claimedByTeammate ? 0.45 : 1,
                          }}
                        >
                          {opponent.name}
                          {selected ? " ✓ Selected" : ""}
                          {claimedByTeammate ? " — Teammate's target" : ""}
                        </button>
                      );
                    })}
                </div>
              ))}

            <button
              type="button"
              disabled={phase !== "selecting"}
              onClick={confirmPlayerTargets}
            >
              {phase === "selecting"
                ? "Confirm Targets"
                : "CPU is selecting..."}
            </button>

            <p>{combatMessage}</p>
          </div>
        </div>
      )}

      {/* CPU TEAM */}
      {/* MAIN BATTLEFIELD */}
      <section className="battlefield">
        {/* CPU TEAM — LEFT SIDE */}
        <div className="battle-team cpu-team">
          <h2 className="battle-team-title">CPU TEAM</h2>

          <div className="fighter-grid">
            {teams.opponent.map((fighter) => (
              <FighterPreview
                key={fighter.id}
                fighter={fighter}
                team="opponent"
                isSelected={cpuTargets[fighter.id] != null}
                onClick={() => {}}
              />
            ))}
          </div>
        </div>

        {/* CENTER — BATTLE MESSAGE */}
        <div className="battle-center">
          <h2>ROUND {roundNumber}</h2>
          <p>{combatMessage}</p>
        </div>

        {/* PLAYER TEAM — RIGHT SIDE */}
        <div className="battle-team player-team">
          <h2 className="battle-team-title">PLAYER TEAM</h2>

          <div className="fighter-grid">
            {teams.player.map((fighter) => (
              <FighterPreview
                key={fighter.id}
                fighter={fighter}
                team="player"
                isSelected={fighter.id === activePlayerId}
                onClick={() => {
                  if (fighter.health <= 0) return;

                  setActivePlayerId(fighter.id);

                  const assignedTarget = roundTargets[fighter.id];

                  if (assignedTarget) {
                    setTargetOpponentId(assignedTarget);
                  }
                }}
              />
            ))}
          </div>
        </div>

        {/* INCOMING CPU ATTACK — OVER THE BATTLEFIELD */}
        {pendingDefense &&
          pendingAttacker &&
          pendingTarget &&
          pendingAttack && (
            <section className="incoming-attack">
              <h2 className="incoming-title">⚠ INCOMING ATTACK</h2>

              <div className="incoming-fighters">
                <div className="incoming-fighter">
                  {pendingAttacker.image && (
                    <img
                      src={pendingAttacker.image}
                      alt={pendingAttacker.name}
                    />
                  )}

                  <strong>{pendingAttacker.name}</strong>
                  <span>ATTACKER</span>
                </div>

                <span className="incoming-arrow">➜</span>

                <div className="incoming-fighter">
                  {pendingTarget.image && (
                    <img src={pendingTarget.image} alt={pendingTarget.name} />
                  )}

                  <strong>{pendingTarget.name}</strong>
                  <span>TARGET</span>
                </div>
              </div>

              <h3 className="incoming-attack-name">{pendingAttack.name}</h3>

              <p className="incoming-attack-details">
                Damage: {pendingAttack.damage ?? 0}
                {" · "}
                Speed: {pendingAttack.speed ?? 0}
                {" · "}
                Mana: {pendingAttack.cost ?? 0}
              </p>

              <div
                className={`defense-timer ${
                  defenseTimeLeft <= 3 ? "is-urgent" : ""
                }`}
              >
                DEFENSE WINDOW: {defenseTimeLeft}s
              </div>

              <div className="incoming-defense-buttons">
                <button
                  type="button"
                  className="defend-button"
                  disabled={
                    defenseTimeLeft <= 0 || (pendingTarget.cooldown ?? 0) <= 0
                  }
                  onClick={() => resolveCPUDefense("defend")}
                >
                  🛡 DEFEND
                </button>

                <button
                  type="button"
                  className="evade-button"
                  disabled={defenseTimeLeft <= 0}
                  onClick={() => resolveCPUDefense("evade")}
                >
                  💨 EVADE
                </button>
              </div>

              {(pendingTarget.cooldown ?? 0) <= 0 && (
                <p className="incoming-attack-details">
                  Defend is unavailable because this fighter has no cooldown
                  remaining. You can still evade!
                </p>
              )}
            </section>
          )}

        <div className="combat-popup-stack" aria-live="polite">
          {combatPopups.slice(-4).map((popup, index) => (
            <div
              key={popup.id}
              className="combat-popup"
              style={{ "--popup-index": index }}
            >
              {popup.message}
            </div>
          ))}
        </div>
      </section>

      {/* BOTTOM HUD — COMBAT LOG + BOTH PLAYERS' ATTACKS */}
      <div className="battle-bottom">
        <section className="combat-log">
          <h2 className="combat-log-title">COMBAT LOG</h2>

          <div className="combat-log-messages">
            <p>{combatMessage}</p>
          </div>
        </section>

        {teams.player.map((fighter) => (
          <PlayerAttackPanel
            key={fighter.id}
            fighter={fighter}
            isActive={fighter.id === activePlayerId}
            phase={phase}
            onSelect={setActivePlayerId}
            onAttack={useAttack}
            onFinishTurn={finishPlayerTurn}
          />
        ))}
      </div>
    </main>
  );
}
