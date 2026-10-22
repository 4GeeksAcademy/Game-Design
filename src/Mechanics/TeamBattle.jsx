// TeamBattle.jsx
import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { roster } from "./Main Page/CharacterSelection";
import { attackCharacter, evadeAttack } from "./Health.js";
import VictoryScreen from "./VictoryScreen.jsx";
import GameOverScreen from "./GameOverScreen.jsx";
import TeamAttackOptions from "./TeamAttackOptions.jsx";
import "./Teambattle.css";

function createBattleFighter(id) {
  const selected = roster.find((fighter) => fighter.id === id);
  if (!selected?.data) return null;

  const data = selected.data;

  return {
    ...data,
    id: selected.id,
    image: selected.image ?? data.image,
    health: data.health,
    maximumHealth: data.maximumHealth ?? data.health,
    mana: data.mana,
    maximumMana: data.maximumMana ?? data.mana,
    defense:
      typeof data.defense === "object" && data.defense
        ? { ...data.defense }
        : data.defense,
    attacks: (data.attacks ?? []).map((attack) => ({
      ...attack,
      state: true,
      buff: attack.buff ? { ...attack.buff } : attack.buff,
      debuff: attack.debuff ? { ...attack.debuff } : attack.debuff,
    })),
    turnFinished: false,
    blocked: false,
  };
}

function FighterPreview({
  fighter,
  team,
  isSelected,
  onClick,
  canSelect = false,
}) {
  const getDefense = (fighter) =>
    typeof fighter.defense === "object" && fighter.defense
      ? (fighter.defense.amount ?? 0)
      : (fighter.defense ?? 0);

      const percent = (value, maximum) =>
    maximum > 0
      ? Math.max(0, Math.min(100, (Number(value) / maximum) * 100))
      : 0;

  return (
    <button
      type="button"
      className={`fighter-card fighter-${team} ${
        isSelected ? "is-selected" : ""
      } ${fighter.health <= 0 ? "is-defeated" : ""} ${
        fighter.blocked ? "is-blocking" : ""
      }`}
      onClick={onClick}
      disabled={fighter.health <= 0 || (team === "opponent" && !canSelect)}
      aria-label={`${fighter.name}, ${fighter.health} health`}
    >
      <div className="fighter-card-heading">
        <h3>{fighter.name}</h3>
        {isSelected && <span className="selected-mark">ACTIVE</span>}
      </div>

      {fighter.image && (
        <img className="fighter-portrait" src={fighter.image} alt="" />
      )}

      <div className="fighter-bars">
        <ResourceBar
          label="HP"
          value={Math.max(0, fighter.health)}
          maximum={fighter.maximumHealth}
          percent={percent(Math.max(0, fighter.health), fighter.maximumHealth)}
          type="health"
        />
        <ResourceBar
          label="MP"
          value={fighter.mana}
          maximum={fighter.maximumMana}
          percent={percent(fighter.mana, fighter.maximumMana)}
          type="mana"
        />
      </div>

      <div className="fighter-stat-bars">
        <StatBar
          label="DEF"
          value={getDefense(fighter)}
          maximum={fighter.maximumDefense ?? 100}
          color="defense"
        />
        <StatBar
          label="AGI"
          value={fighter.agility ?? 0}
          maximum={fighter.maximumAgility ?? 100}
          color="agility"
        />
        <StatBar
          label="REGEN"
          value={fighter.manaRegen ?? 0}
          maximum={fighter.maximumManaRegen ?? 100}
          color="regen"
        />
        <StatBar
          label="REC"
          value={fighter.recovery ?? 0}
          maximum={fighter.maximumRecovery ?? 10}
          color="recovery"
        />
        <StatBar
          label="CD"
          value={fighter.cooldown ?? 0}
          maximum={fighter.maximumCooldown ?? 10}
          color="cooldown"
        />
      </div>
    </button>
  );
}

function ResourceBar({ label, value, maximum, percent, type }) {
  return (
    <div className="resource-row">
      <span className="resource-label">{label}</span>
      <div className="resource-track">
        <div
          className={`resource-fill ${type}-fill`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="resource-value">
        {value}/{maximum}
      </span>
    </div>
  );
}

function StatBar({ label, value, maximum, color }) {
  const amount = Number(value) || 0;
  const max = Number(maximum) || 1;
  const percent = Math.max(0, Math.min(100, (amount / max) * 100));

  return (
    <div
      className={`stat-bar-row stat-${color}`}
      title={`${label}: ${amount}/${max}`}
    >
      <span>{label}</span>
      <div className="stat-bar-track">
        <div className="stat-bar-fill" style={{ width: `${percent}%` }} />
      </div>
      <b>
        {amount}/{max}
      </b>
    </div>
  );
}

export default function TeamBattle() {
  const location = useLocation();
  const {
    playerTeamIds = [],
    opponentTeamIds = [],
    // Set this from difficulty selection: Easy 1, Normal as appropriate.
    cpuAttacksPerTurn = 1,
  } = location.state ?? {};

  const [teams, setTeams] = useState(() => ({
    player: playerTeamIds.map(createBattleFighter),
    opponent: opponentTeamIds.map(createBattleFighter),
  }));

  const [phase, setPhase] = useState("selecting");
  const [roundNumber, setRoundNumber] = useState(1);
  const [roundTargets, setRoundTargets] = useState({});
  const [cpuTargets, setCpuTargets] = useState({});
  const [activePlayerId, setActivePlayerId] = useState(
    playerTeamIds[0] ?? null,
  );

  const [pendingDefense, setPendingDefense] = useState(null);
  const [playerAttackDefense, setPlayerAttackDefense] = useState(null);
  const [cpuActionQueue, setCpuActionQueue] = useState(null);
  const [cpuActionIndex, setCpuActionIndex] = useState(0);
  const [defenseTimeLeft, setDefenseTimeLeft] = useState(10);
  const [combatMessage, setCombatMessage] = useState(
    "Choose your fighters' targets.",
  );
  const [combatLog, setCombatLog] = useState([
    "Choose your fighters' targets.",
  ]);
  const [damageDealt, setDamageDealt] = useState(0);
  const [attacksUsed, setAttacksUsed] = useState(0);

  const defenseResolvedRef = useRef(false);
  const cpuTurnRunningRef = useRef(false);

  const hasValidTeams =
    teams.player.length === 2 &&
    teams.opponent.length === 2 &&
    teams.player.every(Boolean) &&
    teams.opponent.every(Boolean);

  const addLog = (message) => {
    setCombatMessage(message);
    setCombatLog((current) => [...current.slice(-5), message]);
  };

  const livingPlayers = teams.player.filter((fighter) => fighter.health > 0);
  const livingOpponents = teams.opponent.filter(
    (fighter) => fighter.health > 0,
  );

  const selectRoundTarget = (fighterId, opponentId) => {
    const player = teams.player.find((fighter) => fighter.id === fighterId);
    const opponent = teams.opponent.find(
      (fighter) => fighter.id === opponentId,
    );
    if (!player || !opponent || player.health <= 0 || opponent.health <= 0)
      return;

    const alreadyAssigned = Object.entries(roundTargets).some(
      ([assignedPlayer, assignedOpponent]) =>
        assignedPlayer !== fighterId && assignedOpponent === opponentId,
    );

    if (alreadyAssigned) {
      addLog(`${opponent.name} is already assigned to your teammate.`);
      return;
    }

    setRoundTargets((current) => ({ ...current, [fighterId]: opponentId }));
    addLog(`${player.name} will fight ${opponent.name}.`);
  };

  const confirmPlayerTargets = () => {
    if (livingOpponents.length === 0) {
      setPhase("victory");
      return;
    }

    // A CPU can only be assigned once. Other players without a target skip.
    const assignedOpponentIds = new Set(Object.values(roundTargets));
    const validAssignments = livingPlayers.every((player) => {
      const targetId = roundTargets[player.id];

      // Unassigned players are allowed to skip if all CPUs are assigned.
      if (!targetId) return true;

      return (
        livingOpponents.some((opponent) => opponent.id === targetId) &&
        !livingPlayers.some(
          (other) =>
            other.id !== player.id && roundTargets[other.id] === targetId,
        )
      );
    });

    if (!validAssignments) {
      addLog("Each opponent can only be assigned to one teammate.");
      return;
    }

    // Require assignments for as many players as there are available CPUs,
    // but don't require players to target a CPU already assigned to a teammate.
    const assignedCount = [...assignedOpponentIds].filter((id) =>
      livingOpponents.some((opponent) => opponent.id === id),
    ).length;

    if (
      assignedCount < Math.min(livingPlayers.length, livingOpponents.length)
    ) {
      addLog("Assign a target to each available opponent.");
      return;
    }

    const playersWithTargets = teams.player.map((player) => ({
      ...player,
      // Living players without a valid target automatically skip this round.
      turnFinished:
        player.health <= 0 ||
        !livingOpponents.some(
          (opponent) => roundTargets[player.id] === opponent.id,
        ),
    }));

    const availablePlayers = [...livingPlayers];
    const newCpuTargets = {};

    [...livingOpponents]
      .sort(() => Math.random() - 0.5)
      .forEach((cpu) => {
        if (!availablePlayers.length) return;
        const index = Math.floor(Math.random() * availablePlayers.length);
        newCpuTargets[cpu.id] = availablePlayers.splice(index, 1)[0].id;
      });

    setTeams((current) => ({ ...current, player: playersWithTargets }));
    setCpuTargets(newCpuTargets);
    addLog("Targets locked. Unassigned teammates will skip their turns.");

    if (
      playersWithTargets.every(
        (player) => player.health <= 0 || player.turnFinished,
      )
    ) {
      setPhase("cpu-fighting");
    } else {
      setPhase("fighting");
    }
  };

  const finishPlayerTurn = (fighterId) => {
    const player = teams.player.find((fighter) => fighter.id === fighterId);
    if (!player || player.health <= 0 || player.turnFinished) return;

    const updatedPlayers = teams.player.map((fighter) =>
      fighter.id === fighterId ? { ...fighter, turnFinished: true } : fighter,
    );

    const allFinished = updatedPlayers.every(
      (fighter) => fighter.health <= 0 || fighter.turnFinished,
    );

    setTeams((current) => ({ ...current, player: updatedPlayers }));

    if (allFinished) {
      addLog("Your team is finished. The CPU is preparing its attacks.");
      setPhase("cpu-fighting");
    } else {
      addLog(`${player.name} finished their turn.`);
    }
  };

  const useAttack = (fighterId, attackIndex) => {
    if (phase !== "fighting") return;

    const updatedPlayers = teams.player.map((fighter) => ({
      ...fighter,
      defense:
        typeof fighter.defense === "object" && fighter.defense
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
        typeof fighter.defense === "object" && fighter.defense
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
    if (!attacker || !defender || attacker.health <= 0 || attacker.turnFinished)
      return;

    if (defender.health <= 0) {
      addLog("That opponent has already been defeated.");
      return;
    }

    const attack = attacker.attacks[attackIndex];
    if (!attack || attack.state !== true) {
      addLog("That attack has already been used.");
      return;
    }

    const healthBefore = defender.health;
    const result = attackCharacter(attack, attacker, defender);
    if (!result) {
      addLog("Not enough mana to use that attack.");
      return;
    }

    setDamageDealt(
      (value) =>
        value + Math.max(0, healthBefore - Math.max(0, defender.health)),
    );
    setAttacksUsed((value) => value + 1);

    const playersAfter = updatedPlayers.map((fighter) => {
      if (fighter.health <= 0) return { ...fighter, turnFinished: true };
      const target = updatedOpponents.find(
        (opponent) =>
          opponent.id === roundTargets[fighter.id] && opponent.health > 0,
      );
      return target ? fighter : { ...fighter, turnFinished: true };
    });

    setTeams({ player: playersAfter, opponent: updatedOpponents });

    if (updatedOpponents.every((fighter) => fighter.health <= 0)) {
      addLog("Victory! The opposing team has been defeated.");
      setPhase("victory");
      return;
    }

    const allFinished = playersAfter.every(
      (fighter) => fighter.health <= 0 || fighter.turnFinished,
    );

    addLog(`${attacker.name} used ${attack.name} on ${defender.name}.`);

    if (allFinished) {
      setPhase("cpu-fighting");
      addLog(
        "Your team has no remaining actions. The CPU is preparing to attack.",
      );
    }
  };

  // Build one ordered list containing each living CPU's permitted attacks.
  useEffect(() => {
    if (phase !== "cpu-fighting" || pendingDefense || cpuActionQueue !== null)
      return;

    const limit = Math.max(1, Number(cpuAttacksPerTurn) || 1);
    const queue = [];

    teams.opponent.forEach((cpu) => {
      if (cpu.health <= 0) return;

      const targetId = cpuTargets[cpu.id];
      const target = teams.player.find(
        (player) => player.id === targetId && player.health > 0,
      );
      if (!target) return;

      const usableAttacks = cpu.attacks
        .map((attack, attackIndex) => ({ attack, attackIndex }))
        .filter(
          ({ attack }) =>
            attack.state === true && cpu.mana >= (attack.cost ?? 0),
        )
        .slice(0, limit);

      usableAttacks.forEach(({ attackIndex }) => {
        queue.push({ cpuId: cpu.id, targetId: target.id, attackIndex });
      });
    });

    setCpuActionQueue(queue);
    setCpuActionIndex(0);
    if (queue.length) addLog("CPU attacks are queued.");
  }, [
    phase,
    pendingDefense,
    cpuActionQueue,
    cpuAttacksPerTurn,
    cpuTargets,
    teams.opponent,
    teams.player,
  ]);

  // Reveal exactly one queued attack at a time.
  useEffect(() => {
    if (phase !== "cpu-fighting" || pendingDefense || cpuActionQueue === null)
      return;

    if (cpuActionIndex >= cpuActionQueue.length) {
      if (livingPlayers.length === 0) {
        setPhase("defeat");
        addLog("Defeat. Your entire team has been defeated.");
        return;
      }

      if (livingOpponents.length === 0) {
        setPhase("victory");
        addLog("Victory! The opposing team has been defeated.");
        return;
      }

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
          blocked: false,
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
      setCpuActionQueue(null);
      setCpuActionIndex(0);
      setRoundNumber((round) => round + 1);
      setPhase("selecting");
      addLog("A new round begins. Choose your targets.");
      return;
    }

    const action = cpuActionQueue[cpuActionIndex];
    const cpu = teams.opponent.find((fighter) => fighter.id === action.cpuId);
    const target = teams.player.find(
      (fighter) => fighter.id === action.targetId,
    );

    if (!cpu || cpu.health <= 0 || !target || target.health <= 0) {
      setCpuActionIndex((index) => index + 1);
      return;
    }

    const attack = cpu.attacks[action.attackIndex];
    if (!attack || attack.state !== true || cpu.mana < (attack.cost ?? 0)) {
      setCpuActionIndex((index) => index + 1);
      return;
    }

    defenseResolvedRef.current = false;
    setPendingDefense({
      cpuId: cpu.id,
      targetId: target.id,
      attackIndex: action.attackIndex,
    });
    addLog(`${cpu.name} is preparing ${attack.name}. Defend or evade!`);
  }, [
    phase,
    pendingDefense,
    cpuActionQueue,
    cpuActionIndex,
    teams.opponent,
    teams.player,
    livingPlayers.length,
    livingOpponents.length,
  ]);

  useEffect(() => {
    if (phase !== "cpu-fighting" || !pendingDefense) {
      setDefenseTimeLeft(10);
      return undefined;
    }

    let remaining = 10;
    setDefenseTimeLeft(remaining);

    const timer = setInterval(() => {
      remaining -= 1;
      setDefenseTimeLeft(Math.max(0, remaining));
      if (remaining <= 0) {
        clearInterval(timer);
        resolveCPUDefense("timeout");
      }
    }, 1000);

    return () => clearInterval(timer);
    // resolveCPUDefense reads the current pending action and teams.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingDefense, phase]);

  const resolveCPUDefense = (choice) => {
    if (
      !pendingDefense ||
      phase !== "cpu-fighting" ||
      defenseResolvedRef.current
    )
      return;

    const attacker = teams.opponent.find(
      (fighter) => fighter.id === pendingDefense.cpuId,
    );
    const defender = teams.player.find(
      (fighter) => fighter.id === pendingDefense.targetId,
    );

    if (
      !attacker ||
      !defender ||
      attacker.health <= 0 ||
      defender.health <= 0
    ) {
      defenseResolvedRef.current = true;
      setPendingDefense(null);
      setCpuActionIndex((index) => index + 1);
      return;
    }

    const updatedPlayers = teams.player.map((fighter) => ({
      ...fighter,
      defense:
        typeof fighter.defense === "object" && fighter.defense
          ? { ...fighter.defense }
          : fighter.defense,
    }));
    const updatedCPU = teams.opponent.map((fighter) => ({
      ...fighter,
      defense:
        typeof fighter.defense === "object" && fighter.defense
          ? { ...fighter.defense }
          : fighter.defense,
      attacks: fighter.attacks.map((attack) => ({
        ...attack,
        buff: attack.buff ? { ...attack.buff } : attack.buff,
        debuff: attack.debuff ? { ...attack.debuff } : attack.debuff,
      })),
    }));

    const currentAttacker = updatedCPU.find(
      (fighter) => fighter.id === pendingDefense.cpuId,
    );
    const currentDefender = updatedPlayers.find(
      (fighter) => fighter.id === pendingDefense.targetId,
    );
    const attack = currentAttacker?.attacks[pendingDefense.attackIndex];

    if (!attack || attack.state !== true) {
      defenseResolvedRef.current = true;
      setPendingDefense(null);
      setCpuActionIndex((index) => index + 1);
      return;
    }

    defenseResolvedRef.current = true;
    let result;

    if (choice === "defend") {
      const defense =
        typeof currentDefender.defense === "object"
          ? (currentDefender.defense?.amount ?? 0)
          : (currentDefender.defense ?? 0);
      result = attackCharacter(
        attack,
        currentAttacker,
        currentDefender,
        defense,
      );
    } else if (choice === "evade") {
      result = evadeAttack(attack, currentAttacker, currentDefender);
    } else {
      result = attackCharacter(attack, currentAttacker, currentDefender);
    }

    if (!result) {
      addLog("The defensive action could not be completed.");
    } else {
      if (choice === "defend" || choice === "evade") {
        currentDefender.cooldown = Math.max(
          0,
          (currentDefender.cooldown ?? 0) - 1,
        );
        currentDefender.blocked = true;
      }

      if (choice === "defend") {
        addLog(
          `${currentDefender.name} defended ${currentAttacker.name}'s ${attack.name}.`,
        );
      } else if (choice === "evade") {
        addLog(
          result.evaded
            ? `${currentDefender.name} evaded ${attack.name}.`
            : `${currentDefender.name} failed to evade ${attack.name}.`,
        );
      } else {
        addLog(`Time ran out. ${attack.name} hit ${currentDefender.name}.`);
      }
    }

    setTeams({ player: updatedPlayers, opponent: updatedCPU });
    setPendingDefense(null);
    setCpuActionIndex((index) => index + 1);
  };

  const resetBattle = () => {
    setTeams({
      player: playerTeamIds.map(createBattleFighter),
      opponent: opponentTeamIds.map(createBattleFighter),
    });
    setRoundNumber(1);
    setRoundTargets({});
    setCpuTargets({});
    setActivePlayerId(playerTeamIds[0] ?? null);
    setPendingDefense(null);
    setCpuActionQueue(null);
    setCpuActionIndex(0);
    setDefenseTimeLeft(10);
    setDamageDealt(0);
    setAttacksUsed(0);
    setCombatLog(["Choose your fighters' targets."]);
    setCombatMessage("Choose your fighters' targets.");
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
      <main className="team-battle error-screen">
        <h2>Unable to load the 2v2 teams</h2>
        <p>Return to character selection and choose two fighters per team.</p>
      </main>
    );
  }

  if (phase === "victory") {
    return (
      <VictoryScreen
        damageDealt={damageDealt}
        attacksUsed={attacksUsed}
        message="Your team has defeated the opposing team!"
        onRematch={resetBattle}
      />
    );
  }

  if (phase === "defeat") {
    return (
      <GameOverScreen
        damageDealt={damageDealt}
        attacksUsed={attacksUsed}
        message="Your entire team has been defeated."
        onRematch={resetBattle}
      />
    );
  }

  return (
    <main className="team-battle">
      <header className="battle-header">
        <div className="header-team-label cpu-label">CPU TEAM</div>
        <h1>
          TEAM BATTLE <span>ROUND {roundNumber}</span>
        </h1>
        <div className="header-team-label player-label">PLAYER TEAM</div>
      </header>

      {phase === "selecting" && (
        <div className="target-modal-backdrop">
          <section className="target-modal">
            <p className="eyebrow">ROUND {roundNumber}</p>
            <h2>Choose your opponents</h2>
            <p>
              Assign each opponent to one teammate. Any remaining teammate skips
              this round.
            </p>

            {livingPlayers.map((player) => (
              <div className="target-choice-group" key={player.id}>
                <h3>{player.name}</h3>
                {livingOpponents
                  .filter((opponent) => {
                    const assignedToAnotherPlayer = Object.entries(
                      roundTargets,
                    ).some(
                      ([assignedPlayer, assignedOpponent]) =>
                        assignedPlayer !== player.id &&
                        assignedOpponent === opponent.id,
                    );

                    return !assignedToAnotherPlayer;
                  })
                  .map((opponent) => {
                    const selected = roundTargets[player.id] === opponent.id;

                    return (
                      <button
                        key={opponent.id}
                        type="button"
                        className={`target-choice-button ${selected ? "is-selected" : ""}`}
                        onClick={() =>
                          selectRoundTarget(player.id, opponent.id)
                        }
                      >
                        {opponent.name}
                        {selected ? " ✓" : ""}
                      </button>
                    );
                  })}
              </div>
            ))}

            <button
              type="button"
              className="confirm-target-button"
              onClick={confirmPlayerTargets}
            >
              Confirm targets
            </button>
            <p className="modal-message">{combatMessage}</p>
          </section>
        </div>
      )}

      <section className="battlefield">
        <div className="battle-team cpu-team">
          <div className="team-heading">
            <span className="team-indicator" />
            <h2>CPU TEAM</h2>
          </div>
          <div className="fighter-grid">
            {teams.opponent.map((fighter) => (
              <FighterPreview
                key={fighter.id}
                fighter={fighter}
                team="opponent"
                isSelected={false}
                canSelect={phase === "fighting"}
                onClick={() =>
                  setPlayerAttackDefense({
                    cpuId: fighter.id,
                    playerId: activePlayerId,
                  })
                }
              />
            ))}
          </div>
        </div>

        <div className="battle-center">
          <div className="versus-mark">VS</div>
          <p>{combatMessage}</p>
        </div>

        <div className="battle-team player-team">
          <div className="team-heading">
            <h2>PLAYER TEAM</h2>
            <span className="team-indicator" />
          </div>
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
                }}
              />
            ))}
          </div>
        </div>

        {pendingDefense &&
          pendingAttacker &&
          pendingTarget &&
          pendingAttack && (
            <section className="incoming-attack" aria-live="assertive">
              <div className="incoming-topline">
                <span>⚠ INCOMING ATTACK</span>
                <span className={defenseTimeLeft <= 3 ? "timer-urgent" : ""}>
                  {defenseTimeLeft}s
                </span>
              </div>

              <div className="incoming-matchup">
                <div className="incoming-fighter">
                  {pendingAttacker.image && (
                    <img src={pendingAttacker.image} alt="" />
                  )}
                  <strong>{pendingAttacker.name}</strong>
                  <small>ATTACKER</small>
                </div>
                <span className="incoming-arrow">➜</span>
                <div className="incoming-fighter">
                  {pendingTarget.image && (
                    <img src={pendingTarget.image} alt="" />
                  )}
                  <strong>{pendingTarget.name}</strong>
                  <small>TARGET</small>
                </div>
              </div>

              <h3>{pendingAttack.name}</h3>
              <p>
                DAMAGE {pendingAttack.damage ?? 0}
                <span> · </span>
                SPEED {pendingAttack.speed ?? 0}
                <span> · </span>
                MANA {pendingAttack.cost ?? 0}
              </p>

              <div className="defense-actions">
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
            </section>
          )}
      </section>

      <section className="battle-bottom">
        <div className="combat-log">
          <header>
            <span className="log-dot" /> COMBAT LOG
          </header>
          <div className="combat-log-messages" aria-live="polite">
            {combatLog.map((message, index) => (
              <p key={`${index}-${message}`}>{message}</p>
            ))}
          </div>
        </div>

        {teams.player.map((fighter) => (
          <TeamAttackOptions
            key={fighter.id}
            fighter={fighter}
            isActive={fighter.id === activePlayerId}
            phase={phase}
            onAttack={useAttack}
            onFinishTurn={finishPlayerTurn}
          />
        ))}
      </section>
    </main>
  );
}
