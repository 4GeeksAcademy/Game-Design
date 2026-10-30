// TeamBattle.jsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { roster } from "./Main Page/CharacterSelection";
import { recordFestivalEvent } from "./Main Page/Festival/FestivalChallenges";
import { recordDailyObjectiveEvent } from "./Main Page/Festival/FestivalDailyObjectives";
import { attackCharacter, evadeAttack } from "./Health.js";
import VictoryScreen from "./VictoryScreen.jsx";
import GameOverScreen from "./GameOverScreen.jsx";
import TeamAttackOptions from "./TeamAttackOptions.jsx";
import { getDamageThreat, getSpeedThreat } from "./AttackThreat.js";
import { aiDefendOrEvade } from "./AI.js";
import { loadKeybinds, normalizeKey } from "./Main Page/keybinds.js";
import useKeybinds from "./Main Page/useKeybinds.js";
import { storyBackgrounds } from "./Main Page/Story/StoryBackgrounds.js";
import {
  chooseNormalAttack,
  normalDefendOrEvade,
} from "./AI_NormalDifficulty.js";
import StoryResultsScreen from "./Main Page/Story/StoryResultScreen.jsx";
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

// function createTeammateFighter(id) {
//   const fighter = createBattleFighter(id);
//   if (!fighter) return null;

//   return {
//     ...fighter,
//     id: `ally-${fighter.id}`,
//     isCpuTeammate: true,
//   };
// }

function describeEffects(effects, targetName, kind) {
  return Object.entries(effects ?? {})
    .filter(([, amount]) => Number(amount) !== 0)
    .map(([stat, amount]) => {
      const verb = kind === "buff" ? "increased" : "reduced";
      const signedAmount = `${amount > 0 ? "+" : ""}${amount}`;
      return `${targetName}'s ${stat} ${verb} by ${signedAmount}`;
    });
}

function RoundIntroHealthBar({ fighter }) {
  const maximumHealth = Number(fighter.maximumHealth) || 1;
  const health = Math.max(0, Number(fighter.health) || 0);

  const percent = Math.max(0, Math.min(100, (health / maximumHealth) * 100));

  const healthLevel =
    percent <= 10
      ? "critical"
      : percent <= 30
        ? "danger"
        : percent <= 50
          ? "warning"
          : "healthy";

  return (
    <div
      className={`team-round-intro__healthbar health-${healthLevel}`}
      role="img"
      aria-label={`${health} of ${maximumHealth} health remaining`}
    >
      <div
        className="team-round-intro__healthbar-fill"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

function FighterPreview({
  fighter,
  team,
  isSelected,
  onClick,
  canSelect = false,
}) {
  const getDefense = (currentFighter) =>
    typeof currentFighter.defense === "object" && currentFighter.defense
      ? (currentFighter.defense.amount ?? 0)
      : (currentFighter.defense ?? 0);

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
      {fighter.health <= 0 && (
        <span className="fighter-ko-badge" aria-label="Knocked out">
          K.O.
        </span>
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

function createBattleTeams(playerTeamIds, opponentTeamIds, isCpuAssist) {
  const player = playerTeamIds.map((id, index) => {
    const fighter = createBattleFighter(id);

    if (!fighter) return null;

    return isCpuAssist && index === 1
      ? { ...fighter, isCpuTeammate: true }
      : fighter;
  });

  return {
    player,
    opponent: opponentTeamIds.map(createBattleFighter),
  };
}

function assignUniqueCpuTargets(opponents, players) {
  const availablePlayers = players
    .filter((player) => player.health > 0)
    .map((player) => player.id);

  // Shuffle living players so the CPU target assignment is random.
  for (let i = availablePlayers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [availablePlayers[i], availablePlayers[j]] = [
      availablePlayers[j],
      availablePlayers[i],
    ];
  }

  const targets = {};
  const livingOpponents = opponents.filter((cpu) => cpu.health > 0);

  livingOpponents.forEach((cpu, index) => {
    const targetId = availablePlayers[index];
    if (targetId) targets[cpu.id] = targetId;
  });

  return targets;
}

export default function TeamBattle() {
  const location = useLocation();
  const levelConfig = location.state ?? {};
  const isStoryMode = levelConfig.gameMode === "story";
  const {
    playerTeamIds = [],
    opponentTeamIds = [],
    cpuAttacksPerTurn = 1,
    teamControl = "single-player",
    difficulty = "Normal",
  } = location.state ?? {};
  const isStory1v2 =
    isStoryMode && playerTeamIds.length === 1 && opponentTeamIds.length === 2;

  const resolveLocalCoopDefenseRef = useRef(() => {});
  const [isIntroFadingOut, setIsIntroFadingOut] = useState(false);
  const [playerAttackPopup, setPlayerAttackPopup] = useState(null);
  const [localCoopDefenses, setLocalCoopDefenses] = useState([]);
  const [localCoopDefenseTimers, setLocalCoopDefenseTimers] = useState({});
  const localCoopExpiredRef = useRef(new Set());
  const localCoopResolvedRef = useRef(new Set());
  const localCoopTimeoutsRef = useRef([]);
  const localCoopAttackQueuesRef = useRef({});
  const [cpuQueueReady, setCpuQueueReady] = useState(false);
  const isLocalCoop = teamControl === "local-coop";
  const isCpuAssist = teamControl === "cpu-assist";
  const teammateAttackLimit =
    difficulty === "Easy" ? 1 : Number.POSITIVE_INFINITY;

  const [teams, setTeams] = useState(() =>
    createBattleTeams(playerTeamIds, opponentTeamIds, isCpuAssist),
  );
  const [knockout, setKnockout] = useState(null);
  const [isKnockoutFadingOut, setIsKnockoutFadingOut] = useState(false);
  const previousTeamsRef = useRef(teams);
  const [teamFinishComplete, setTeamFinishComplete] = useState(false);
  const [isTeamFinishFadingOut, setIsTeamFinishFadingOut] = useState(false);

  const [allyAttackOutcome, setAllyAttackOutcome] = useState(null);
  const [pendingAllyAttack, setPendingAllyAttack] = useState(null);
  const [defenseOutcome, setDefenseOutcome] = useState(null);
  const [phase, setPhase] = useState("selecting");
  const festivalBattleRecorded = useRef(false);

useEffect(() => {
  if (
    (phase !== "victory" && phase !== "defeat") ||
    festivalBattleRecorded.current
  ) {
    return;
  }

  // Make sure the match is recorded only once.
  festivalBattleRecorded.current = true;

  // Both victories and defeats count as completed battles.
  recordFestivalEvent("battle", 1);
  recordDailyObjectiveEvent("battle", 1)

  // Only victories count toward victory challenges.
  if (phase === "victory") {
    recordFestivalEvent("victory", 1);
    recordDailyObjectiveEvent("victory", 1)
  }
}, [phase]);
  const [roundNumber, setRoundNumber] = useState(1);
  const [showRoundIntro, setShowRoundIntro] = useState(true);
  const [roundTargets, setRoundTargets] = useState({});
  const [cpuTargets, setCpuTargets] = useState({});
  const [activePlayerId, setActivePlayerId] = useState(
    playerTeamIds[0] ?? null,
  );

  const isFinalTeamPhase = phase === "victory" || phase === "defeat";

  const winningTeam = phase === "victory" ? teams.player : teams.opponent;

  const defeatedTeam = phase === "defeat" ? teams.player : teams.opponent;

  const [pendingDefense, setPendingDefense] = useState(null);
  const [cpuActionQueue, setCpuActionQueue] = useState(null);
  const [cpuActionIndex, setCpuActionIndex] = useState(0);
  const [defenseTimeLeft, setDefenseTimeLeft] = useState(10);
  const [combatMessage, setCombatMessage] = useState(
    "Choose your fighters' targets.",
  );
  const [combatPopups, setCombatPopups] = useState([]);
  const popupTimerRef = useRef(null);
  const teammateTargetTimerRef = useRef(null);
  const allyAttackTimerRef = useRef(null);
  const [combatLog, setCombatLog] = useState([
    "Choose your fighters' targets.",
  ]);
  const [damageDealt, setDamageDealt] = useState(0);
  const [attacksUsed, setAttacksUsed] = useState(0);
  // Prevent previously recorded damage from being counted again.
  const lastFestivalDamage = useRef(0);

  // Prevent previously recorded attacks from being counted again.
  const lastFestivalAttacks = useRef(0);

  // Track damage dealt by the player team.
  useEffect(() => {
    const newDamage = damageDealt - lastFestivalDamage.current;

    lastFestivalDamage.current = damageDealt;

    if (newDamage > 0) {
      recordFestivalEvent("damage", newDamage);
      recordDailyObjectiveEvent("damage", newDamage)
    }
  }, [damageDealt]);

  // Track attacks executed by the player team.
  useEffect(() => {
    const newAttacks = attacksUsed - lastFestivalAttacks.current;

    lastFestivalAttacks.current = attacksUsed;

    if (newAttacks > 0) {
      recordFestivalEvent("attack", newAttacks);
    }
  }, [attacksUsed]);

  const defenseResolvedRef = useRef(false);

  useEffect(() => {
    if (!knockout) {
      setIsKnockoutFadingOut(false);
      return undefined;
    }

    // Start the fade-out after the K.O. message has been visible.
    setIsKnockoutFadingOut(false);

    const fadeTimer = setTimeout(() => {
      setIsKnockoutFadingOut(true);
    }, 2100);

    // Remove the overlay after the fade-out finishes.
    const removeTimer = setTimeout(() => {
      setKnockout(null);
      setIsKnockoutFadingOut(false);
    }, 2600);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, [knockout]);

  useEffect(() => {
    if (!isFinalTeamPhase) {
      setTeamFinishComplete(false);
      setIsTeamFinishFadingOut(false);
      return undefined;
    }

    setTeamFinishComplete(false);
    setIsTeamFinishFadingOut(false);

    const fadeTimer = setTimeout(() => {
      setIsTeamFinishFadingOut(true);
    }, 2600);

    const completeTimer = setTimeout(() => {
      setTeamFinishComplete(true);
    }, 3200);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [isFinalTeamPhase, phase]);

  useEffect(() => {
    if (!combatPopups.length) return undefined;

    const displayedCount = Math.min(combatPopups.length, 3);

    const timer = setTimeout(() => {
      setPendingAllyAttack(null);
      setCombatPopups((current) => current.slice(displayedCount));
    }, 2800);

    return () => clearTimeout(timer);
  }, [combatPopups]);

  const hasValidStandardTeams =
    teams.player.length === 2 &&
    teams.opponent.length === 2 &&
    teams.player.every(Boolean) &&
    teams.opponent.every(Boolean) &&
    teams.player[0].id === playerTeamIds[0] &&
    teams.player[1].id === playerTeamIds[1] &&
    teams.opponent.every(
      (fighter, index) => fighter.id === opponentTeamIds[index],
    ) &&
    (!isCpuAssist || teams.player[1].isCpuTeammate);

  const hasValidStory1v2 =
    isStory1v2 &&
    teams.player.length === 1 &&
    teams.opponent.length === 2 &&
    teams.player.every(Boolean) &&
    teams.opponent.every(Boolean) &&
    teams.player[0].id === playerTeamIds[0] &&
    teams.opponent.every(
      (fighter, index) => fighter.id === opponentTeamIds[index],
    );

  const hasValidTeams = hasValidStandardTeams || hasValidStory1v2;

  const addLog = (message, type = "hit") => {
    const entry = {
      id: Date.now() + Math.random(),
      text: message,
      type,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    };

    setCombatMessage(message);
    setCombatLog((current) => [...current.slice(-5), entry]);
    setCombatPopups((current) => [...current, entry]);
  };

  const livingPlayers = teams.player.filter((fighter) => fighter.health > 0);
  const livingOpponents = teams.opponent.filter(
    (fighter) => fighter.health > 0,
  );

  useEffect(() => {
    const previousTeams = previousTeamsRef.current;

    const defeatedPlayer = teams.player.find((fighter) => {
      const previous = previousTeams.player.find(
        (oldFighter) => oldFighter.id === fighter.id,
      );

      return previous?.health > 0 && fighter.health <= 0;
    });

    const defeatedOpponent = teams.opponent.find((fighter) => {
      const previous = previousTeams.opponent.find(
        (oldFighter) => oldFighter.id === fighter.id,
      );

      return previous?.health > 0 && fighter.health <= 0;
    });

    // Save the current health for the next comparison.
    previousTeamsRef.current = teams;

    const defeatedFighter = defeatedOpponent ?? defeatedPlayer;

    if (defeatedFighter) {
      setKnockout({
        ...defeatedFighter,
        defeatedTeam: defeatedOpponent ? "opponent" : "player",
      });
    }
  }, [teams]);

  const selectRoundTarget = (fighterId, opponentId) => {
    const player = teams.player.find((fighter) => fighter.id === fighterId);
    const opponent = teams.opponent.find(
      (fighter) => fighter.id === opponentId,
    );

    if (!player || !opponent || player.health <= 0 || opponent.health <= 0) {
      return;
    }

    const alreadyAssigned = Object.entries(roundTargets).some(
      ([assignedPlayer, assignedOpponent]) =>
        assignedPlayer !== fighterId && assignedOpponent === opponentId,
    );

    if (alreadyAssigned) {
      addLog(`${opponent.name} is already assigned to your teammate.`);
      return;
    }

    if (player.isCpuTeammate && teammateTargetTimerRef.current) {
      clearTimeout(teammateTargetTimerRef.current);
      teammateTargetTimerRef.current = null;
    }

    setRoundTargets((current) => ({ ...current, [fighterId]: opponentId }));
    addLog(`${player.name} will fight ${opponent.name}.`);
  };

  useEffect(() => {
    if (!showRoundIntro) return;

    setIsIntroFadingOut(false);

    const fadeTimer = setTimeout(() => {
      setIsIntroFadingOut(true);
    }, 2400);

    const removeTimer = setTimeout(() => {
      setShowRoundIntro(false);
      setIsIntroFadingOut(false);
    }, 3000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, [showRoundIntro, roundNumber]);

  useEffect(() => {
    if (!isCpuAssist || phase !== "selecting") return;

    const teammate = teams.player.find((fighter) => fighter.isCpuTeammate);
    if (!teammate || roundTargets[teammate.id]) return;

    teammateTargetTimerRef.current = setTimeout(() => {
      const availableOpponent = teams.opponent.find(
        (opponent) =>
          opponent.health > 0 &&
          !Object.entries(roundTargets).some(
            ([fighterId, opponentId]) =>
              fighterId !== teammate.id && opponentId === opponent.id,
          ),
      );

      if (availableOpponent) {
        setRoundTargets((current) => {
          // Keep a target the player selected before the timer fired.
          if (current[teammate.id]) return current;

          return { ...current, [teammate.id]: availableOpponent.id };
        });
      }

      teammateTargetTimerRef.current = null;
    }, 3000);

    return () => {
      clearTimeout(teammateTargetTimerRef.current);
      teammateTargetTimerRef.current = null;
    };
  }, [isCpuAssist, phase, teams.player, teams.opponent, roundTargets]);

  const confirmPlayerTargets = () => {
    if (livingOpponents.length === 0) {
      setPhase("victory");
      return;
    }

    const assignedOpponentIds = new Set(Object.values(roundTargets));

    const validAssignments = livingPlayers.every((player) => {
      const targetId = roundTargets[player.id];
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

    const assignedCount = [...assignedOpponentIds].filter((id) =>
      livingOpponents.some((opponent) => opponent.id === id),
    ).length;

    const humanPlayers = livingPlayers.filter(
      (player) => !player.isCpuTeammate,
    );

    if (assignedCount < Math.min(humanPlayers.length, livingOpponents.length)) {
      addLog("Assign a target to each available opponent.");
      return;
    }

    const targetsForRound = { ...roundTargets };

    // const playersWithTargets = teams.player.map((player) => {
    //   if (player.isCpuTeammate) {
    //     return {
    //       ...player,
    //       turnFinished: player.health <= 0 || livingOpponents.length === 0,
    //     };
    //   }

    //   return {
    //     ...player,
    //     turnFinished:
    //       player.health <= 0 ||
    //       !livingOpponents.some(
    //         (opponent) => targetsForRound[player.id] === opponent.id,
    //         setRoundTargets(targetsForRound)
    //       ),
    //   };
    // });

    const playersWithTargets = teams.player.map((player) => {
      const hasTarget = livingOpponents.some(
        (opponent) => targetsForRound[player.id] === opponent.id,
      );

      return {
        ...player,
        turnFinished: player.health <= 0 || !hasTarget,
      };
    });

    setRoundTargets(targetsForRound);

    const newCpuTargets = assignUniqueCpuTargets(teams.opponent, teams.player);
    setCpuTargets(newCpuTargets);

    setCpuTargets(newCpuTargets);

    setTeams((current) => ({ ...current, player: playersWithTargets }));
    setCpuTargets(newCpuTargets);
    addLog(
      isLocalCoop
        ? "Targets locked. Both players can act during this phase."
        : "Targets locked. Unassigned teammates will skip their turns.",
    );

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
    if (phase !== "fighting" || pendingDefense || pendingAllyAttack) return;
    setTeams((current) => {
      const player = current.player.find((fighter) => fighter.id === fighterId);

      if (!player || player.health <= 0 || player.turnFinished) {
        return current;
      }

      const updatedPlayers = current.player.map((fighter) =>
        fighter.id === fighterId ? { ...fighter, turnFinished: true } : fighter,
      );

      const allFinished = updatedPlayers.every(
        (fighter) => fighter.health <= 0 || fighter.turnFinished,
      );

      if (allFinished) {
        setPhase("cpu-fighting");
        addLog("Your team is finished. The CPU is preparing its attacks.");
      } else {
        addLog(`${player.name} finished their turn.`);
      }

      return { ...current, player: updatedPlayers };
    });
  };

  const useAttack = (fighterId, attackIndex, targetOverrideId = null) => {
    if (phase !== "fighting") return;

    const updatedPlayers = teams.player.map((fighter) => ({
      ...fighter,
      defense:
        typeof fighter.defense === "object" && fighter.defense
          ? { ...fighter.defense }
          : fighter.defense,
      attacks: (fighter.attacks ?? []).map((attack) => ({
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
      attacks: (fighter.attacks ?? []).map((attack) => ({
        ...attack,
        buff: attack.buff ? { ...attack.buff } : attack.buff,
        debuff: attack.debuff ? { ...attack.debuff } : attack.debuff,
      })),
    }));

    const targetId = targetOverrideId ?? roundTargets[fighterId];

    const attacker = updatedPlayers.find((fighter) => fighter.id === fighterId);
    const defender = updatedOpponents.find(
      (fighter) => fighter.id === targetId,
    );

    if (
      !attacker ||
      !defender ||
      attacker.health <= 0 ||
      attacker.turnFinished
    ) {
      return;
    }

    if (defender.health <= 0) {
      addLog("That opponent has already been defeated.");
      return;
    }

    const attack = attacker.attacks[attackIndex];

    if (!attack || attack.state !== true) {
      addLog("That attack has already been used.");
      return;
    }

    const attacksUsedThisTurn = attacker.attacks.filter(
      (move) => move.state === false,
    ).length;

    if (roundNumber === 1 && attacksUsedThisTurn >= 3) {
      addLog(`${attacker.name} has reached the 3-attack opening limit.`);
      return;
    }

    const healthBefore = defender.health;

    if (!attacker.isCpuTeammate) {
      setPlayerAttackPopup({
        attackerId: attacker.id,
        targetId: defender.id,
        attackName: attack.name,
        outcome: "",
      });
    }

    // The selected difficulty can control which CPU defense behavior is used.
    // AI.js contains the existing random defend/evade behavior.

    const result =
      difficulty === "Easy"
        ? attackCharacter(attack, attacker, defender)
        : difficulty === "Normal"
          ? normalDefendOrEvade(attack, attacker, defender)
          : aiDefendOrEvade(attack, attacker, defender);

    const outcome = result.evaded
      ? `${defender.name} evaded ${attack.name}.`
      : `${attacker.name} hit ${defender.name}.`;

    if (!attacker.isCpuTeammate) {
      setPlayerAttackPopup((current) =>
        current ? { ...current, outcome } : current,
      );
    }

    if (!attacker.isCpuTeammate) {
      setTimeout(() => setPlayerAttackPopup(null), 2000);
    }

    if (typeof result === "object") {
      Object.assign(attacker, result.attacker ?? {});
      Object.assign(defender, result.defender ?? {});
    }

    setDamageDealt(
      (value) =>
        value + Math.max(0, healthBefore - Math.max(0, defender.health)),
    );
    setAttacksUsed((value) => value + 1);

    const playersAfter = updatedPlayers.map((fighter) => {
      if (fighter.health <= 0) {
        return { ...fighter, turnFinished: true };
      }

      const hasTarget = updatedOpponents.some(
        (opponent) =>
          opponent.id === roundTargets[fighter.id] && opponent.health > 0,
      );

      if (!hasTarget) return { ...fighter, turnFinished: true };

      // Preserve this fighter's own updated state. Only evaluate the teammate's
      // remaining attacks when the teammate is the attacker.
      if (fighter.id === attacker.id && fighter.isCpuTeammate) {
        const attacksUsedThisTurn = attacker.attacks.filter(
          (candidate) => candidate.state === false,
        ).length;

        const hasUsableAttack = attacker.attacks.some(
          (candidate) =>
            candidate.state === true && attacker.mana >= (candidate.cost ?? 0),
        );

        return {
          ...fighter,
          attacks: attacker.attacks,
          mana: attacker.mana,
          health: attacker.health,
          turnFinished:
            !hasUsableAttack ||
            (difficulty === "Easy" && attacksUsedThisTurn >= 1),
        };
      }

      // If this is the human attacker, save their own updated attacks/resources.
      if (fighter.id === attacker.id) {
        return {
          ...fighter,
          attacks: attacker.attacks,
          mana: attacker.mana,
          health: attacker.health,
        };
      }

      return fighter;
    });

    setTeams({ player: playersAfter, opponent: updatedOpponents });
    if (
      playersAfter.every(
        (fighter) => fighter.health <= 0 || fighter.turnFinished,
      )
    ) {
      setPhase("cpu-fighting");
      addLog("Your team is finished. The CPU is preparing its attacks.");
    }

    if (attacker.isCpuTeammate) {
      const attacksUsedThisTurn = attacker.attacks.filter(
        (candidate) => candidate.state === false,
      ).length;

      const assignedTargetId = roundTargets[attacker.id];
      const assignedTargetAlive = updatedOpponents.some(
        (opponent) => opponent.id === assignedTargetId && opponent.health > 0,
      );

      const nextAttackIndex = attacker.attacks.findIndex(
        (candidate) =>
          candidate.state === true && attacker.mana >= (candidate.cost ?? 0),
      );

      const canAttackAgain =
        nextAttackIndex !== -1 &&
        assignedTargetAlive &&
        !(difficulty === "Easy" && attacksUsedThisTurn >= 1);

      if (canAttackAgain) {
        setDefenseOutcome(null);
        setAllyAttackOutcome(null);
        setPendingAllyAttack(null);
      } else {
        setPendingAllyAttack(null);

        const finalPlayers = playersAfter.map((fighter) =>
          fighter.id === attacker.id
            ? { ...fighter, turnFinished: true }
            : fighter,
        );

        setTeams((current) => ({
          ...current,
          player: finalPlayers,
        }));

        if (
          finalPlayers.every(
            (fighter) => fighter.health <= 0 || fighter.turnFinished,
          )
        ) {
          setPhase("cpu-fighting");
        }
      }
    }
    if (attacker.isCpuTeammate) {
      const outcomeText = result.evaded
        ? `${defender.name} evaded ${attack.name}.`
        : `${attacker.name} used ${attack.name} on ${defender.name}.`;

      setAllyAttackOutcome(outcomeText);
    }
    addLog(`${attacker.name} used ${attack.name} on ${defender.name}.`);

    describeEffects(result.buffsApplied, attacker.name, "buff").forEach(
      (message) => addLog(message, "buff"),
    );

    describeEffects(result.debuffsApplied, defender.name, "debuff").forEach(
      (message) => addLog(message, "debuff"),
    );

    if (updatedOpponents.every((fighter) => fighter.health <= 0)) {
      addLog("Victory! The opposing team has been defeated.");
      setPhase("victory");
      return;
    }

    //   const allFinished = playersAfter.every(
    //     (fighter) => fighter.health <= 0 || fighter.turnFinished,
    //   );

    //   if (allFinished) {
    //     setPhase("cpu-fighting");
    //     addLog(
    //       "Your team has no remaining actions. The CPU is preparing to attack.",
    //     );
    //   }
    // };
  };

  useKeybinds(
    {
      attacks: phase === "fighting",
      finishTurn: phase === "fighting",
    },
    (action, index, playerId) => {
      console.log("Battle key:", { action, index, playerId });
      const playerIndex = playerId === "player1" ? 0 : 1;
      const fighter = teams.player[playerIndex];

      if (!fighter || fighter.isCpuTeammate) return;

      if (action === "attack") {
        if (
          fighter.health <= 0 ||
          fighter.turnFinished ||
          pendingAllyAttack ||
          phase !== "fighting"
        ) {
          return;
        }

        useAttack(fighter.id, index);
      } else if (action === "finishTurn") {
        finishPlayerTurn(fighter.id);
      }
    },
    phase === "fighting" && !pendingDefense && !pendingAllyAttack,
  );

  useEffect(() => {
    if (phase !== "fighting" || pendingAllyAttack) return;

    const playersAfter = teams.player.map((player) => {
      const targetId = roundTargets[player.id];
      const targetAlive = teams.opponent.some(
        (opponent) => opponent.id === targetId && opponent.health > 0,
      );

      return (player.health <= 0 || !targetAlive) && !player.turnFinished
        ? { ...player, turnFinished: true }
        : player;
    });

    const changed = playersAfter.some(
      (player, index) =>
        player.turnFinished !== teams.player[index].turnFinished,
    );

    if (!changed) return;

    setTeams((current) => ({ ...current, player: playersAfter }));

    if (
      playersAfter.every((player) => player.health <= 0 || player.turnFinished)
    ) {
      setPhase("cpu-fighting");
      addLog(
        "Your team has no remaining targets. The CPU is preparing its attacks.",
      );
    }
  }, [phase, pendingAllyAttack, teams.player, teams.opponent, roundTargets]);

  const runCpuTeammateTurn = () => {
    if (!isCpuAssist || phase !== "fighting" || pendingAllyAttack) return;

    const ally = teams.player.find(
      (fighter) => fighter.isCpuTeammate && fighter.health > 0,
    );

    if (!ally || ally.turnFinished) return;

    const targetId = roundTargets[ally.id];
    const target = teams.opponent.find(
      (fighter) => fighter.id === targetId && fighter.health > 0,
    );

    if (!target) {
      finishPlayerTurn(ally.id);
      return;
    }

    const attacksUsedThisTurn = ally.attacks.filter(
      (attack) => attack.state === false,
    ).length;
    if (roundNumber === 1 && attacksUsedThisTurn >= 3) {
      finishPlayerTurn(ally.id);
      return;
    }

    if (difficulty === "Easy" && attacksUsedThisTurn >= 1) {
      finishPlayerTurn(ally.id);
      return;
    }

    const selectedAttack =
      difficulty === "Easy"
        ? ally.attacks.find(
            (attack) =>
              attack.state === true && ally.mana >= (attack.cost ?? 0),
          )
        : chooseNormalAttack(ally);

    const attackIndex = selectedAttack
      ? ally.attacks.indexOf(selectedAttack)
      : -1;

    if (attackIndex === -1) {
      finishPlayerTurn(ally.id);
      return;
    }

    setDefenseOutcome(null);

    setAllyAttackOutcome(null);
    setPendingAllyAttack({
      fighterId: ally.id,
      targetId: target.id,
      attackIndex,
    });
  };

  useEffect(() => {
    if (!pendingAllyAttack || phase !== "fighting") return;

    const attackToRun = pendingAllyAttack;

    const timer = setTimeout(() => {
      useAttack(
        attackToRun.fighterId,
        attackToRun.attackIndex,
        attackToRun.targetId,
      );
    }, 2000);

    return () => clearTimeout(timer);
  }, [pendingAllyAttack, phase]);

  useEffect(() => {
    if (!isCpuAssist || phase !== "fighting" || pendingAllyAttack) return;

    const ally = teams.player.find(
      (fighter) => fighter.isCpuTeammate && fighter.health > 0,
    );

    if (!ally || ally.turnFinished) return;

    const timer = setTimeout(runCpuTeammateTurn, 500);
    return () => clearTimeout(timer);
  }, [
    isCpuAssist,
    phase,
    teams.player,
    teams.opponent,
    roundTargets,
    pendingAllyAttack,
    difficulty,
  ]);
  // useEffect(() => {
  // if (!isCpuAssist || phase !== "fighting" || pendingAllyAttack) {
  //   return undefined;
  // }

  //   const ally = teams.player.find(
  //     (fighter) => fighter.isCpuTeammate && fighter.health > 0,
  //   );

  //   if (!ally || ally.turnFinished) return undefined;

  //   const timer = setTimeout(runCpuTeammateTurn, 500);
  //   return () => clearTimeout(timer);
  // }, [isCpuAssist, phase, teams.player, pendingAllyAttack]);

  useEffect(() => {
    if (
      phase !== "cpu-fighting" ||
      pendingDefense ||
      cpuActionQueue !== null ||
      localCoopDefenses.length > 0
    ) {
      return;
    }
    if (isLocalCoop) {
      const attacksByTarget = {};

      teams.opponent.forEach((cpu) => {
        if (cpu.health <= 0) return;

        const target = teams.player.find(
          (player) => player.id === cpuTargets[cpu.id] && player.health > 0,
        );

        if (!target) return;

        const attacks = cpu.attacks
          .map((attack, attackIndex) => ({ attack, attackIndex }))
          .filter(
            ({ attack }) =>
              attack.state === true && cpu.mana >= (attack.cost ?? 0),
          )
          .map(({ attackIndex }) => ({
            id: `${cpu.id}-${attackIndex}-${target.id}`,
            cpuId: cpu.id,
            targetId: target.id,
            attackIndex,
          }));

        attacksByTarget[target.id] = [
          ...(attacksByTarget[target.id] ?? []),
          ...attacks,
        ];
      });

      const firstCards = [];
      const remainingQueues = {};

      Object.entries(attacksByTarget).forEach(([targetId, attacks]) => {
        if (attacks.length) {
          firstCards.push(attacks[0]);
          remainingQueues[targetId] = attacks.slice(1);
        }
      });

      localCoopAttackQueuesRef.current = remainingQueues;

      if (firstCards.length) {
        localCoopResolvedRef.current = new Set();
        localCoopExpiredRef.current.clear();
        setLocalCoopDefenses(firstCards);
        setCpuQueueReady(true);
        setCombatMessage("The CPU team is preparing its attacks.");
      } else {
        setLocalCoopDefenses([]);
        setCpuActionQueue([]);
        setCpuActionIndex(0);
        setCpuQueueReady(true);
      }

      return;
    }

    const limit = Number.POSITIVE_INFINITY;
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

    if (queue.length === 0) {
      // No CPU actions: let the queue-processing effect advance the round.
      setCpuActionQueue([]);
      setCpuActionIndex(0);
      setCpuQueueReady(true);
      return;
    }

    setCpuActionQueue(queue);
    setCpuActionIndex(0);
    setCpuQueueReady(true);
    addLog("CPU attacks are queued.");
  }, [
    phase,
    pendingDefense,
    cpuActionQueue,
    cpuAttacksPerTurn,
    cpuTargets,
    teams.opponent,
    teams.player,
  ]);

  useEffect(() => {
    if (
      phase !== "cpu-fighting" ||
      pendingDefense ||
      cpuActionQueue === null ||
      !cpuQueueReady
    ) {
      return;
    }

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

          // Restore cooldown based on this fighter's recovery stat.
          cooldown:
            fighter.health > 0
              ? Math.min(
                  fighter.maximumCooldown ?? fighter.cooldown ?? 0,
                  (fighter.cooldown ?? 0) + (fighter.recovery ?? 1),
                )
              : fighter.cooldown,

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
      setCpuQueueReady(false);
      setCpuTargets({});
      setCpuActionQueue(null);
      setCpuActionIndex(0);
      setRoundNumber((round) => round + 1);
      setShowRoundIntro(true);
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
    setDefenseOutcome(null);
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
    cpuQueueReady,
    teams.opponent,
    teams.player,
    livingPlayers.length,
    livingOpponents.length,
  ]);

  useEffect(() => {
    if (phase !== "cpu-fighting" || !pendingDefense) return;

    setDefenseTimeLeft(10);

    const interval = setInterval(() => {
      setDefenseTimeLeft((time) => Math.max(0, time - 1));
    }, 1000);

    const timeout = setTimeout(() => {
      resolveCPUDefenseRef.current("timeout");
    }, 10_000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [
    pendingDefense?.cpuId,
    pendingDefense?.targetId,
    pendingDefense?.attackIndex,
    phase,
  ]);

  useEffect(() => {
    if (phase !== "cpu-fighting" || !isLocalCoop || !localCoopDefenses.length) {
      return;
    }

    const timeouts = [];

    localCoopDefenses.forEach((defense, index) => {
      timeouts.push(
        setTimeout(() => {
          setLocalCoopDefenses((current) =>
            current.map((item) =>
              item.id === defense.id
                ? { ...item, visible: true, timeLeft: 10 }
                : item,
            ),
          );
        }, 0),
      );
    });

    localCoopTimeoutsRef.current.push(...timeouts);

    return () => {
      timeouts.forEach(clearTimeout);
      localCoopTimeoutsRef.current = localCoopTimeoutsRef.current.filter(
        (timer) => !timeouts.includes(timer),
      );
    };
  }, [phase, isLocalCoop, localCoopDefenses.length, roundNumber]);

  // Display countdown only.
  useEffect(() => {
    if (phase !== "cpu-fighting" || !isLocalCoop) return;

    const interval = setInterval(() => {
      setLocalCoopDefenses((current) =>
        current.map((defense) =>
          defense.visible && !defense.outcome
            ? { ...defense, timeLeft: Math.max(0, defense.timeLeft - 1) }
            : defense,
        ),
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, isLocalCoop]);

  // Resolve each card once when its own deadline expires.
  useEffect(() => {
    if (phase !== "cpu-fighting" || !isLocalCoop) return;

    const timers = localCoopDefenses
      .filter((defense) => defense.visible && !defense.outcome)
      .map((defense) =>
        setTimeout(
          () => {
            resolveLocalCoopDefenseRef.current(defense.id, "timeout");
          },
          Math.max(0, defense.timeLeft) * 1000,
        ),
      );

    return () => timers.forEach(clearTimeout);
  }, [phase, isLocalCoop, localCoopDefenses]);

  const resolveLocalCoopDefense = (defenseId, choice) => {
    console.log("[LocalCoop resolve] Called:", { defenseId, choice });
    const incoming = localCoopDefenses.find((item) => item.id === defenseId);
    if (!incoming) {
      console.warn("[LocalCoop resolve] Defense not found:", {
        defenseId,
        currentDefenseIds: localCoopDefenses.map((item) => item.id),
      });
      return;
    }
    if (localCoopResolvedRef.current.has(defenseId)) {
      console.warn("[LocalCoop resolve] Already resolved:", defenseId);
      return;
    }
    const defender = teams.player.find(
      (fighter) => fighter.id === incoming.targetId,
    );
    const attacker = teams.opponent.find(
      (fighter) => fighter.id === incoming.cpuId,
    );
    const attack = attacker?.attacks[incoming.attackIndex];

    if (!attacker || !defender || !attack) return;

    if (choice === "defend" && (Number(defender.cooldown) || 0) <= 0) {
      return;
    }

    localCoopResolvedRef.current.add(defenseId);

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
      attacks: fighter.attacks.map((item) => ({
        ...item,
        buff: item.buff ? { ...item.buff } : item.buff,
        debuff: item.debuff ? { ...item.debuff } : item.debuff,
      })),
    }));

    const currentDefender = updatedPlayers.find(
      (fighter) => fighter.id === incoming.targetId,
    );
    const currentAttacker = updatedCPU.find(
      (fighter) => fighter.id === incoming.cpuId,
    );
    const currentAttack = currentAttacker.attacks[incoming.attackIndex];

    const healthBefore = Number(currentDefender.health) || 0;

    let result;

    if (choice === "defend") {
      const defense =
        typeof currentDefender.defense === "object"
          ? (currentDefender.defense?.amount ?? 0)
          : (currentDefender.defense ?? 0);

      result = attackCharacter(
        currentAttack,
        currentAttacker,
        currentDefender,
        defense,
      );
    } else if (choice === "evade") {
      result = evadeAttack(currentAttack, currentAttacker, currentDefender);
    } else {
      // Timeout and "take-damage": take the unblocked hit.
      result = attackCharacter(
        currentAttack,
        currentAttacker,
        currentDefender,
        0,
      );
    }

    if (result) {
      Object.assign(currentAttacker, result.attacker ?? {});
      Object.assign(currentDefender, result.defender ?? {});
    }
    // Record successful defensive actions.
    if (result) {
      if (choice === "defend") {
        recordFestivalEvent("block", 1);
      } else if (choice === "evade" && result.evaded) {
        recordFestivalEvent("evade", 1);
      }
    }

    const healthAfter = Number(currentDefender.health) || 0;

    console.log("[LocalCoop damage]", {
      attacker: currentAttacker.name,
      defender: currentDefender.name,
      choice,
      attack: currentAttack.name,
      damage: healthBefore - Number(currentDefender.health),
      healthBefore,
      healthAfter: currentDefender.health,
      result,
    });

    const outcome =
      choice === "defend"
        ? `${currentDefender.name} defended ${currentAttacker.name}'s ${currentAttack.name}.`
        : choice === "evade"
          ? result?.evaded
            ? `${currentDefender.name} evaded ${currentAttack.name}.`
            : `${currentDefender.name} failed to evade ${currentAttack.name}.`
          : choice === "timeout"
            ? `Time ran out. ${currentAttack.name} hit ${currentDefender.name}.`
            : `${currentDefender.name} took the full damage from ${currentAttack.name}.`;

    setTeams({ player: updatedPlayers, opponent: updatedCPU });
    setLocalCoopDefenses((current) =>
      current.map((item) =>
        item.id === defenseId ? { ...item, outcome } : item,
      ),
    );

    addLog(outcome);

    console.log("[LocalCoop resolve] Applying result:", {
      defenseId,
      choice,
      outcome,
    });

    setTimeout(() => {
      console.log("[LocalCoop resolve] Removing prompt:", defenseId);
      setLocalCoopDefenses((current) => {
        const resolvedDefense = current.find((item) => item.id === defenseId);
        const remaining = current.filter((item) => item.id !== defenseId);

        if (resolvedDefense) {
          const queue =
            localCoopAttackQueuesRef.current[resolvedDefense.targetId] ?? [];

          if (queue.length > 0) {
            const [nextAttack, ...rest] = queue;
            localCoopAttackQueuesRef.current[resolvedDefense.targetId] = rest;

            // Show this player's next attack, while keeping the other player's card.
            return [
              ...remaining,
              { ...nextAttack, visible: true, timeLeft: 10 },
            ];
          }
        }

        if (remaining.length > 0) return remaining;

        // Clear local-co-op batch state before advancing.
        localCoopResolvedRef.current.clear();
        localCoopTimeoutsRef.current.forEach(clearTimeout);
        localCoopTimeoutsRef.current = [];

        if (updatedPlayers.every((fighter) => fighter.health <= 0)) {
          setPhase("defeat");
          return [];
        }

        if (updatedCPU.every((fighter) => fighter.health <= 0)) {
          setPhase("victory");
          return [];
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

            // Restore cooldown based on this fighter's recovery stat.
            cooldown:
              fighter.health > 0
                ? Math.min(
                    fighter.maximumCooldown ?? fighter.cooldown ?? 0,
                    (fighter.cooldown ?? 0) + (fighter.recovery ?? 1),
                  )
                : fighter.cooldown,

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
          player: resetFighters(updatedPlayers),
          opponent: resetFighters(updatedCPU),
        });

        setRoundTargets({});
        setCpuTargets({});
        setCpuActionQueue(null);
        setCpuActionIndex(0);
        setCpuQueueReady(false);
        setRoundNumber((round) => round + 1);
        setShowRoundIntro(true);
        setPhase("selecting");
        addLog("A new round begins. Choose your targets.");

        return [];
      });
    }, 1000);
  };

  resolveLocalCoopDefenseRef.current = resolveLocalCoopDefense;

  useEffect(() => {
    if (phase !== "cpu-fighting") return;

    const handleDefenseKeyDown = (event) => {
      const target = event.target;

      // Don't capture keys while the user is typing.
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      ) {
        return;
      }

      const key = normalizeKey(event.key);
      if (!key) return;

      const keybinds = loadKeybinds();

      if (isLocalCoop) {
        // Find a visible, unresolved prompt targeted at the player
        // whose defense keys match this key.
        const defense = localCoopDefenses.find((item) => {
          if (!item.visible || item.outcome || item.timeLeft <= 0) return false;

          const playerIndex = teams.player.findIndex(
            (fighter) => fighter.id === item.targetId,
          );
          if (playerIndex < 0) return false;

          const playerId = playerIndex === 0 ? "player1" : "player2";
          const binds = keybinds[playerId];

          return [binds.defend, binds.evade, binds.takeDamage].some(
            (boundKey) => normalizeKey(boundKey) === key,
          );
        });

        if (!defense) return;

        const playerIndex = teams.player.findIndex(
          (fighter) => fighter.id === defense.targetId,
        );
        const playerId = playerIndex === 0 ? "player1" : "player2";
        const binds = keybinds[playerId];

        let choice = null;
        if (key === normalizeKey(binds.defend)) choice = "defend";
        else if (key === normalizeKey(binds.evade)) choice = "evade";
        else if (key === normalizeKey(binds.takeDamage)) {
          choice = "take-damage";
        }

        const defender = teams.player[playerIndex];
        if (choice === "defend" && (Number(defender?.cooldown) || 0) <= 0) {
          return;
        }

        event.preventDefault();
        resolveLocalCoopDefenseRef.current(defense.id, choice);
        return;
      }

      // Non-local-co-op: one incoming attack at a time.
      if (!pendingDefense) return;

      const playerIndex = teams.player.findIndex(
        (fighter) => fighter.id === pendingDefense.targetId,
      );
      if (playerIndex < 0) return;

      const playerId = playerIndex === 0 ? "player1" : "player2";
      const binds = keybinds[playerId];

      let choice = null;
      if (key === normalizeKey(binds.defend)) choice = "defend";
      else if (key === normalizeKey(binds.evade)) choice = "evade";
      else if (key === normalizeKey(binds.takeDamage)) {
        choice = "take-damage";
      }

      if (!choice) return;

      const defender = teams.player[playerIndex];
      if (choice === "defend" && (Number(defender?.cooldown) || 0) <= 0) {
        return;
      }

      event.preventDefault();
      resolveCPUDefenseRef.current(choice);
    };

    window.addEventListener("keydown", handleDefenseKeyDown);
    return () => window.removeEventListener("keydown", handleDefenseKeyDown);
  }, [phase, isLocalCoop, localCoopDefenses, pendingDefense, teams.player]);

  const resolveCPUDefense = useCallback(
    (choice) => {
      if (
        !pendingDefense ||
        phase !== "cpu-fighting" ||
        defenseResolvedRef.current
      ) {
        return;
      }

      const defendingFighter = teams.player.find(
        (fighter) => fighter.id === pendingDefense.targetId,
      );

      if (
        choice === "defend" &&
        (!defendingFighter || (Number(defendingFighter.cooldown) || 0) <= 0)
      ) {
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

      if (!currentAttacker || !currentDefender) {
        defenseResolvedRef.current = true;
        setPendingDefense(null);
        setCpuActionIndex((index) => index + 1);
        return;
      }

      const attack = currentAttacker.attacks[pendingDefense.attackIndex];

      if (!attack || attack.state !== true) {
        defenseResolvedRef.current = true;
        setTimeout(() => {
          setDefenseOutcome(null);
          setPendingDefense(null);
          setCpuActionIndex((index) => index + 1);
        }, 1000);
        return;
      }

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
        // Includes "take-damage" and the 10-second timeout.
        result = attackCharacter(attack, currentAttacker, currentDefender);
      }

      defenseResolvedRef.current = true;

      if (!result) {
        addLog("The defensive action could not be completed.");
      } else {
        // Record successful defensive actions.
        if (choice === "defend") {
          recordFestivalEvent("block", 1);
        } else if (choice === "evade" && result.evaded) {
          recordFestivalEvent("evade", 1);
        }
        if (choice === "defend") {
          currentDefender.cooldown = Math.max(
            0,
            (currentDefender.cooldown ?? 0) - 1,
          );
          currentDefender.blocked = true;
        } else if (choice === "evade") {
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
        } else if (choice === "timeout") {
          addLog(`Time ran out. ${attack.name} hit ${currentDefender.name}.`);
        } else {
          addLog(`${currentDefender.name} chose to take the full damage.`);
        }

        describeEffects(
          result.buffsApplied,
          currentAttacker.name,
          "buff",
        ).forEach((message) => addLog(message, "buff"));

        describeEffects(
          result.debuffsApplied,
          currentDefender.name,
          "debuff",
        ).forEach((message) => addLog(message, "debuff"));
      }

      const outcomeText =
        choice === "defend"
          ? `${currentDefender.name} defended the attack.`
          : choice === "evade"
            ? result?.evaded
              ? `${currentDefender.name} evaded the attack.`
              : `${currentDefender.name} failed to evade and took damage.`
            : `${currentDefender.name} took the full damage.`;

      setDefenseOutcome(outcomeText);

      setTeams({ player: updatedPlayers, opponent: updatedCPU });

      setTimeout(() => {
        setDefenseOutcome(null);
        setPendingDefense(null);
        setCpuActionIndex((index) => index + 1);
      }, 1000);
    },
    [pendingDefense, phase, teams.player, teams.opponent, addLog],
  );

  const resolveCPUDefenseRef = useRef(resolveCPUDefense);
  resolveCPUDefenseRef.current = resolveCPUDefense;

  useEffect(() => {
    if (!pendingDefense || phase !== "cpu-fighting") return;

    const defender = teams.player.find(
      (fighter) => fighter.id === pendingDefense.targetId,
    );

    // Human-controlled fighters keep using the defense buttons.
    if (!defender?.isCpuTeammate) return;

    const timer = setTimeout(() => {
      const currentAttacker = teams.opponent.find(
        (fighter) => fighter.id === pendingDefense.cpuId,
      );
      const currentDefender = teams.player.find(
        (fighter) => fighter.id === pendingDefense.targetId,
      );
      const incomingAttack =
        currentAttacker?.attacks[pendingDefense.attackIndex];

      if (!currentAttacker || !currentDefender || !incomingAttack) {
        resolveCPUDefense("timeout");
        return;
      }

      // Use the same AI decision function used for normal-difficulty defense.
      // If it returns a result, apply its updated fighter data below.
      const defenseController =
        difficulty === "Normal"
          ? normalDefendOrEvade // It would select normal difficulty,
          : aiDefendOrEvade; // or else it selects easy mode

      const result = defenseController(
        incomingAttack,
        currentAttacker,
        currentDefender,
      );

      if (result) {
        if (result.action === "defend") {
          recordFestivalEvent("block", 1);
        } else if (result.evaded) {
          recordFestivalEvent("evade", 1);
        }
        defenseResolvedRef.current = true;

        const updatedPlayers = teams.player.map((fighter) =>
          fighter.id === currentDefender.id
            ? { ...fighter, ...(result.defender ?? {}) }
            : fighter,
        );

        const updatedOpponents = teams.opponent.map((fighter) =>
          fighter.id === currentAttacker.id
            ? { ...fighter, ...(result.attacker ?? {}) }
            : fighter,
        );

        setTeams({ player: updatedPlayers, opponent: updatedOpponents });
        const outcomeText = result.evaded
          ? `${currentDefender.name} evaded the attack.`
          : `${currentDefender.name} defended the attack.`;

        setDefenseOutcome(outcomeText);

        setTimeout(() => {
          setDefenseOutcome(null);
          setPendingDefense(null);
          setCpuActionIndex((index) => index + 1);
        }, 2000);

        addLog(
          `${currentDefender.name} automatically responded to ${incomingAttack.name}.`,
        );
      } else {
        resolveCPUDefense("timeout");
      }
    }, 700);

    return () => clearTimeout(timer);
  }, [pendingDefense, phase, teams.player, teams.opponent]);

  resolveCPUDefenseRef.current = resolveCPUDefense;

  const resetBattle = () => {
    setTeams(createBattleTeams(playerTeamIds, opponentTeamIds, isCpuAssist));
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
    festivalBattleRecorded.current = false;
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
        <section className="error-card" role="alert">
          <div className="error-icon" aria-hidden="true">
            !
          </div>

          <p className="error-eyebrow">BATTLE SETUP ERROR</p>
          <h2>Unable to load your teams</h2>

          <p className="error-message">
            {isStory1v2
              ? "A Story Mode 1v2 battle needs one valid player fighter and two valid opponents. Return to character selection and check your fighters."
              : "A 2v2 battle needs two valid fighters on each team. Return to character selection and choose two fighters per side."}
          </p>

          <button
            className="error-back-button"
            type="button"
            onClick={() => window.history.back()}
          >
            Return to character selection
          </button>
        </section>
      </main>
    );
  }

  if (
    (phase === "victory" || phase === "defeat") &&
    !knockout &&
    teamFinishComplete
  ) {
    const won = phase === "victory";

    if (isStoryMode) {
      return (
        <StoryResultsScreen
          won={won}
          playerName={teams.player.map((fighter) => fighter.name).join(" & ")}
          opponentName={teams.opponent
            .map((fighter) => fighter.name)
            .join(" & ")}
          damageDealt={damageDealt}
          attacksUsed={attacksUsed}
          levelConfig={levelConfig}
          battlePath="/team-battle"
        />
      );
    }

    return won ? (
      <VictoryScreen
        damageDealt={damageDealt}
        attacksUsed={attacksUsed}
        message="Your team has defeated the opposing team!"
        onRematch={resetBattle}
      />
    ) : (
      <GameOverScreen
        damageDealt={damageDealt}
        attacksUsed={attacksUsed}
        message="Your entire team has been defeated."
        onRematch={resetBattle}
      />
    );
  }

  if (phase === "defeat" && !knockout && teamFinishComplete) {
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
      <FestivalChallengePopup />
      {isFinalTeamPhase && (
        <div
          className={`team-finish-overlay ${
            phase === "victory" ? "finish-victory" : "finish-defeat"
          } ${isTeamFinishFadingOut ? "is-fading-out" : ""}`}
          role="alert"
          aria-live="assertive"
        >
          <div className="team-finish-flash" />

          <p className="team-finish-eyebrow">FIGHTER'S ARENA</p>

          <h1 className="team-finish-title">TEAM K.O.!</h1>

          <p className="team-finish-message">
            {phase === "victory"
              ? "THE OPPOSING TEAM HAS BEEN DEFEATED"
              : "YOUR ENTIRE TEAM HAS BEEN DEFEATED"}
          </p>

          <div className="team-finish-versus">
            <div className="team-finish-side defeated-side">
              <h2>DEFEATED</h2>

              <div className="team-finish-cards">
                {defeatedTeam.map((fighter, index) => (
                  <div
                    className="team-finish-card"
                    key={fighter.id}
                    style={{ "--card-index": index }}
                  >
                    {fighter.image && <img src={fighter.image} alt="" />}

                    <strong>{fighter.name}</strong>
                    <span>K.O.</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="team-finish-vs">VS</div>

            <div className="team-finish-side winning-side">
              <h2>WINNERS</h2>

              <div className="team-finish-cards">
                {winningTeam.map((fighter, index) => (
                  <div
                    className="team-finish-card"
                    key={fighter.id}
                    style={{ "--card-index": index }}
                  >
                    {fighter.image && <img src={fighter.image} alt="" />}

                    <strong>{fighter.name}</strong>
                    <span>{Math.max(0, fighter.health)} HP</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <p className="team-finish-footer">
            {teamFinishComplete ? "RESULT CONFIRMED" : "MATCH COMPLETE"}
          </p>
        </div>
      )}

      {knockout && (
        <div
          className={`team-ko-overlay ko-${knockout.defeatedTeam} ${
            isKnockoutFadingOut ? "is-fading-out" : ""
          }`}
          role="alert"
          aria-live="assertive"
        >
          <div className="team-ko-flash" />

          <div className="team-ko-content">
            <p className="team-ko-eyebrow">FIGHTER DEFEATED</p>

            {knockout.image && (
              <img
                className="team-ko-portrait"
                src={knockout.image}
                alt={knockout.name}
              />
            )}

            <h1 className="team-ko-title">K.O.!</h1>

            <p className="team-ko-name">{knockout.name}</p>

            <p className="team-ko-subtitle">
              {knockout.defeatedTeam === "opponent"
                ? "OPPONENT DOWN"
                : "PLAYER DOWN"}
            </p>
          </div>
        </div>
      )}
      {(showRoundIntro || isIntroFadingOut) && (
        <div
          className={`team-round-intro ${
            isIntroFadingOut ? "is-hiding" : "is-visible"
          }`}
          role="status"
          aria-hidden={isIntroFadingOut}
        >
          <div className="team-round-intro__eyebrow">FIGHTER'S ARENA</div>

          <h1 className="team-round-intro__round">ROUND {roundNumber}</h1>

          <div className="team-round-intro__matchup">
            <div className="team-round-intro__team team-round-intro__team--cpu">
              <div className="team-round-intro__label">CPU TEAM</div>

              <div className="team-round-intro__fighters">
                {teams.opponent.map((fighter) => {
                  const isKO = fighter.health <= 0;

                  return (
                    <div
                      className={`team-round-intro__fighter ${
                        isKO ? "is-defeated" : "is-alive"
                      }`}
                      key={fighter.id}
                    >
                      {fighter.image && <img src={fighter.image} alt="" />}

                      <RoundIntroHealthBar fighter={fighter} />

                      <span className="team-round-intro__name">
                        {fighter.name}
                      </span>

                      <span
                        className={`team-round-intro__status ${
                          isKO ? "status-ko" : "status-alive"
                        }`}
                      >
                        {isKO
                          ? "K.O."
                          : `HP ${Math.max(0, fighter.health)} / ${fighter.maximumHealth}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="team-round-intro__vs">VS</div>

            <div className="team-round-intro__team team-round-intro__team--player">
              <div className="team-round-intro__label">PLAYER TEAM</div>

              <div className="team-round-intro__fighters">
                {teams.player.map((fighter) => {
                  const isKO = fighter.health <= 0;

                  return (
                    <div
                      className={`team-round-intro__fighter ${
                        isKO ? "is-defeated" : "is-alive"
                      }`}
                      key={fighter.id}
                    >
                      {fighter.image && <img src={fighter.image} alt="" />}

                      <RoundIntroHealthBar fighter={fighter} />

                      <span className="team-round-intro__name">
                        {fighter.name}
                      </span>

                      <span
                        className={`team-round-intro__status ${
                          isKO ? "status-ko" : "status-alive"
                        }`}
                      >
                        {isKO
                          ? "K.O."
                          : `HP ${Math.max(0, fighter.health)} / ${fighter.maximumHealth}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="team-round-intro__footer">GET READY</div>
        </div>
      )}
      {combatPopups.length > 0 && (
        <div id="combatPopupContainer" aria-live="polite">
          {combatPopups.slice(0, 3).map((entry, index) => (
            <div
              key={entry.id}
              className={`combat-popup ${entry.type}`}
              style={{ animationDelay: `${index * 0.15}s` }}
            >
              {entry.text}
            </div>
          ))}
        </div>
      )}

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
                        className={`target-choice-button ${
                          selected ? "is-selected" : ""
                        }`}
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
        {isStoryMode && (
          <div
            className="team-battle-story-background"
            style={{
              backgroundImage: `url("${storyBackgrounds.arena}")`,
            }}
            aria-hidden="true"
          />
        )}
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
                onClick={() => {}}
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
                  if (fighter.health > 0) setActivePlayerId(fighter.id);
                }}
              />
            ))}
          </div>
        </div>

        {pendingAllyAttack &&
          (() => {
            const ally = teams.player.find(
              (fighter) => fighter.id === pendingAllyAttack.fighterId,
            );
            const target = teams.opponent.find(
              (fighter) => fighter.id === pendingAllyAttack.targetId,
            );
            const attack = ally?.attacks[pendingAllyAttack.attackIndex];

            if (!ally || !target || !attack) return null;

            return (
              <section
                className="ally-attack-popup"
                aria-live="polite"
                aria-label={`${ally.name} is attacking ${target.name}`}
              >
                <div className="ally-popup-label">⚔ ALLY ATTACK</div>

                <div className="ally-popup-matchup">
                  <div className="ally-popup-fighter">
                    {ally.image && (
                      <img
                        className="ally-popup-portrait"
                        src={ally.image}
                        alt=""
                      />
                    )}
                    <strong>{ally.name}</strong>
                    <small>YOUR ALLY</small>
                  </div>

                  <span className="ally-popup-arrow">➜</span>

                  <div className="ally-popup-fighter">
                    {target.image && (
                      <img
                        className="ally-popup-portrait"
                        src={target.image}
                        alt=""
                      />
                    )}
                    <strong>{target.name}</strong>
                    <small>OPPONENT</small>
                  </div>
                </div>

                <div className="ally-popup-attack-name">{attack.name}</div>
                {allyAttackOutcome && (
                  <div className="ally-popup-outcome" role="status">
                    {allyAttackOutcome}
                  </div>
                )}
                <div
                  className="ally-popup-timer"
                  key={`${pendingAllyAttack.fighterId}-${pendingAllyAttack.attackIndex}`}
                >
                  <span />
                </div>
              </section>
            );
          })()}

        {isLocalCoop &&
          localCoopDefenses
            .filter((defense) => defense.visible)
            .slice(0, 2)
            .map((defense) => {
              const target = teams.player.find(
                (fighter) => fighter.id === defense.targetId,
              );
              const playerIndex = teams.player.findIndex(
                (fighter) => fighter.id === defense.targetId,
              );
              const attacker = teams.opponent.find(
                (fighter) => fighter.id === defense.cpuId,
              );
              const attack = attacker?.attacks[defense.attackIndex];

              if (!target || !attacker || !attack) return null;

              const damageThreat = getDamageThreat(Number(attack.damage) || 0);
              const speedThreat = getSpeedThreat(Number(attack.speed) || 0);

              return (
                <section
                  key={defense.id}
                  className={`incoming-attack local-coop-incoming ${
                    playerIndex === 0 ? "is-first" : "is-second"
                  }`}
                >
                  <div className="incoming-topline">
                    <span>⚠ INCOMING ATTACK</span>
                    <span>{defense.timeLeft}s</span>
                  </div>

                  <div className="incoming-matchup">
                    <strong>{attacker.name}</strong>
                    <span className="incoming-arrow">➜</span>
                    <strong>{target.name}</strong>
                  </div>

                  {attack.image && (
                    <img
                      className="incoming-attack-image"
                      src={attack.image}
                      alt={attack.name}
                    />
                  )}

                  <h3>{attack.name}</h3>

                  <div className="incoming-threats">
                    <span className={damageThreat.className}>
                      DAMAGE: {damageThreat.label} ({attack.damage ?? 0})
                    </span>
                    <span className={speedThreat.className}>
                      SPEED: {speedThreat.label} ({attack.speed ?? 0})
                    </span>
                  </div>

                  <div className="defense-actions">
                    <button
                      type="button"
                      className="defend-button"
                      disabled={
                        defense.timeLeft <= 0 ||
                        (Number(target.cooldown) || 0) <= 0 ||
                        Boolean(defense.outcome)
                      }
                      onClick={() =>
                        resolveLocalCoopDefense(defense.id, "defend")
                      }
                    >
                      🛡 DEFEND
                    </button>
                    <button
                      type="button"
                      className="evade-button"
                      disabled={
                        defense.timeLeft <= 0 || Boolean(defense.outcome)
                      }
                      onClick={() =>
                        resolveLocalCoopDefense(defense.id, "evade")
                      }
                    >
                      💨 EVADE
                    </button>

                    <button
                      type="button"
                      className="take-damage-button"
                      disabled={
                        defense.timeLeft <= 0 || Boolean(defense.outcome)
                      }
                      onClick={() =>
                        resolveLocalCoopDefense(defense.id, "take-damage")
                      }
                    >
                      Take full damage
                    </button>
                  </div>

                  {defense.outcome && (
                    <div className="incoming-outcome" role="status">
                      {defense.outcome}
                    </div>
                  )}
                </section>
              );
            })}

        {!isLocalCoop &&
          pendingDefense &&
          pendingAttacker &&
          pendingTarget &&
          pendingAttack && (
            <section
              className={`incoming-attack ${
                isLocalCoop ? "local-coop-incoming is-first" : ""
              }`}
              aria-live="assertive"
            >
              <div className="incoming-topline">
                <span>⚠ INCOMING ATTACK</span>
                <span className={defenseTimeLeft <= 3 ? "timer-urgent" : ""}>
                  {defenseTimeLeft}s
                </span>
              </div>

              <div className="incoming-matchup">
                <strong>{pendingAttacker.name}</strong>
                <span className="incoming-arrow">➜</span>
                <strong>{pendingTarget.name}</strong>
              </div>

              {pendingAttack.image && (
                <img
                  className="incoming-attack-image"
                  src={pendingAttack.image}
                  alt={pendingAttack.name}
                />
              )}

              <h3>{pendingAttack.name}</h3>

              <div className="incoming-threats">
                {(() => {
                  const damageThreat = getDamageThreat(
                    Number(pendingAttack.damage) || 0,
                  );
                  const speedThreat = getSpeedThreat(
                    Number(pendingAttack.speed) || 0,
                  );

                  return (
                    <>
                      <span className={damageThreat.className}>
                        DAMAGE: {damageThreat.label} (
                        {pendingAttack.damage ?? 0})
                      </span>
                      <span className={speedThreat.className}>
                        SPEED: {speedThreat.label} ({pendingAttack.speed ?? 0})
                      </span>
                    </>
                  );
                })()}
              </div>

              <div className="defense-actions">
                <button
                  type="button"
                  className="defend-button"
                  disabled={
                    defenseTimeLeft <= 0 ||
                    (Number(pendingTarget?.cooldown) || 0) <= 0
                  }
                  onClick={() => resolveCPUDefense("defend")}
                >
                  🛡 DEFEND
                </button>

                <button
                  type="button"
                  className="evade-button"
                  disabled={defenseTimeLeft <= 0 || Boolean(defenseOutcome)}
                  onClick={() => resolveCPUDefense("evade")}
                >
                  💨 EVADE
                </button>

                <button
                  type="button"
                  className="take-damage-button"
                  disabled={defenseTimeLeft <= 0 || Boolean(defenseOutcome)}
                  onClick={() => resolveCPUDefense("take-damage")}
                >
                  Take full damage
                </button>
              </div>

              {defenseOutcome && (
                <div className="incoming-outcome" role="status">
                  {defenseOutcome}
                </div>
              )}
            </section>
          )}

        {playerAttackPopup &&
          (() => {
            const attacker = teams.player.find(
              (fighter) => fighter.id === playerAttackPopup.attackerId,
            );
            const target = teams.opponent.find(
              (fighter) => fighter.id === playerAttackPopup.targetId,
            );

            if (!attacker || !target) return null;

            return (
              <section className="player-attack-popup" aria-live="polite">
                <div className="ally-popup-label">⚔ PLAYER ATTACK</div>

                <div className="ally-popup-matchup">
                  <div className="ally-popup-fighter">
                    {attacker.image && (
                      <img
                        className="ally-popup-portrait"
                        src={attacker.image}
                        alt=""
                      />
                    )}
                    <strong>{attacker.name}</strong>
                    <small>ATTACKER</small>
                  </div>

                  <span className="ally-popup-arrow">➜</span>

                  <div className="ally-popup-fighter">
                    {target.image && (
                      <img
                        className="ally-popup-portrait"
                        src={target.image}
                        alt=""
                      />
                    )}
                    <strong>{target.name}</strong>
                    <small>OPPONENT</small>
                  </div>
                </div>

                <div className="ally-popup-attack-name">
                  {playerAttackPopup.attackName}
                </div>

                {playerAttackPopup.outcome && (
                  <div className="ally-popup-outcome" role="status">
                    {playerAttackPopup.outcome}
                  </div>
                )}
              </section>
            );
          })()}
      </section>
      <section className="battle-bottom">
        <div className="combat-log">
          <header>
            <span className="log-dot" /> COMBAT LOG
          </header>

          <div className="combat-log-messages" aria-live="polite">
            {combatLog.map((entry) => (
              <p key={entry.id} className={`combat-log-entry ${entry.type}`}>
                <span className="combat-log-time">{entry.time}</span>
                <span>{entry.text}</span>
              </p>
            ))}
          </div>
        </div>

        {teams.player
          .filter((fighter) => !fighter.isCpuTeammate)
          .map((fighter) => (
            <TeamAttackOptions
              key={fighter.id}
              fighter={fighter}
              isActive={fighter.id === activePlayerId}
              phase={phase}
              lockDuringAllyAttack={isCpuAssist && Boolean(pendingAllyAttack)}
              allowSimultaneousActions={isLocalCoop}
              onAttack={useAttack}
              onFinishTurn={finishPlayerTurn}
            />
          ))}
      </section>
    </main>
  );
}
