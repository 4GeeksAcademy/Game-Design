// TeamBattle.jsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { roster } from "./Main Page/CharacterSelection";
import FestivalChallengePopup from "./Main Page/Festival/FestivalChallengePopup";
import { recordFestivalEvent } from "./Main Page/Festival/FestivalChallenges";
import { recordDailyObjectiveEvent } from "./Main Page/Festival/FestivalDailyObjectives";
import {
  attackCharacter,
  evadeAttack,
  canUseAttack,
  applyHeal,
  consumeAttack,
} from "./Health.js";
import {
  getModifiedAttackStat,
  getModifiedCharacterStat,
  tickSelfModifiers,
} from "./Modifiers.js";
import { getCharacterImage } from "./SkinManager.js";
import { getEquippedAttacks, getBotEquippedAttacks, getAttackDisplayName, getAttackKey } from "./AttackLoadouts.js";
import { addCoins } from "./Currency.js";
import { playGameSound } from "../audio/audioManager.js";
import { resetAttacks } from "./Turns.js";
import TeamAttackOptions from "./TeamAttackOptions.jsx";
import { getDamageThreat, getSpeedThreat } from "./AttackThreat.js";
import { loadKeybinds, normalizeKey } from "./Main Page/keybinds.js";
import useKeybinds from "./Main Page/useKeybinds.js";
import { storyBackgrounds } from "./Main Page/Story/StoryBackgrounds.js";
import {
  aiChooseAttack,
  aiChooseHealTarget,
  aiDefendOrEvade,
  aiChooseStunTargets,
} from "./AI.js";
import {
  chooseNormalTeamAction,
  normalDefendOrEvade,
} from "./AI_NormalDifficulty.js";
import StoryResultsScreen from "./Main Page/Story/StoryResultScreen.jsx";
import BattlePauseMenu from "./BattlePauseMenu.jsx";
import ComboPopup, { ComboBreakPopup } from "./ComboPopup.jsx";
import BattleResultScreen from "./BattleResultScreen.jsx";
import RoundIntroOverlay from "./RoundIntroOverlay.jsx";
import KnockoutOverlay from "./KnockoutOverlay.jsx";
import "./Teambattle.css";

function createBattleFighter(id, isCpuControlled = false) {
  const selected = roster.find((fighter) => fighter.id === id);
  if (!selected?.data) return null;

  const data = selected.data;

  return {
    ...data,
    id: selected.id,
    activeModifiers: (data.activeModifiers ?? []).map((modifier) => ({
      ...modifier,
    })),
    image: getCharacterImage(selected.id, selected.image ?? data.image),
    health: data.health,
    maximumHealth: data.maximumHealth ?? data.health,
    mana: data.mana,
    maximumMana: data.maximumMana ?? data.mana,
    defense:
      typeof data.defense === "object" && data.defense
        ? { ...data.defense }
        : data.defense,
    // CPU fighters use their independent Bot Simulator build.
    attacks: (isCpuControlled
      ? getBotEquippedAttacks(selected.id, data.attacks ?? [], data.slot)
      : getEquippedAttacks(selected.id, data.attacks ?? [], data.slot)
    ).map((attack) => ({ ...attack, name: getAttackDisplayName(attack) })).map((attack) => {
      const remainingUses = Number.isInteger(attack.uses)
        ? attack.uses
        : attack.remainingUses;

      const cooldownRemaining = attack.cooldownRemaining ?? 0;

      return {
        ...attack,
        remainingUses,
        cooldownRemaining,
        cooldownStartedThisRound: false,
        state:
          (remainingUses == null || remainingUses > 0) &&
          cooldownRemaining <= 0,
        buff: attack.buff ? { ...attack.buff } : attack.buff,
        debuff: attack.debuff ? { ...attack.debuff } : attack.debuff,

        heal: attack.heal
          ? {
              ...attack.heal,
              buff: attack.heal.buff
                ? { ...attack.heal.buff }
                : attack.heal.buff,
            }
          : attack.heal,

        activeEffects: (attack.activeEffects ?? []).map((effect) => ({
          ...effect,
          effects: { ...effect.effects },
        })),
      };
    }),
    turnFinished: false,
    blocked: false,
  };
}

// function createTeammateFighter(id) {
//   const fighter = createBattleFighter(id, true);
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

function FighterPreview({
  fighter,
  team,
  isSelected,
  onClick,
  canSelect = false,
  combatEffect = null,
}) {
  const percent = (value, maximum) =>
    maximum > 0
      ? Math.max(0, Math.min(100, (Number(value) / maximum) * 100))
      : 0;
  const stunnedAttackCount = fighter.attacks?.filter(
    (attack) => (attack.stunned?.remainingRounds ?? 0) > 0,
  ).length ?? 0;
  const hasStunnedAttacks = stunnedAttackCount > 0;
  const cooldownMaximum = Math.max(0, Number(fighter.maximumCooldown) || 0);
  const cooldownCurrent = Math.max(
    0,
    Math.min(
      cooldownMaximum,
      Number(getModifiedCharacterStat(fighter, "cooldown")) || 0,
    ),
  );
  const recoveryMaximum = Math.max(1, Number(fighter.maximumRecovery) || 10);
  const recoveryCurrent = Math.max(
    0,
    Math.min(
      recoveryMaximum,
      Number(getModifiedCharacterStat(fighter, "recovery")) || 0,
    ),
  );
  const activeModifiers = fighter.activeModifiers ?? [];
  const slotCount = Number.isFinite(Number(fighter.slot))
    ? Number(fighter.slot)
    : fighter.attacks?.length ?? 0;

  return (
    <div
      className={`fighter-unit fighter-${team} ${isSelected ? "is-selected" : ""} ${fighter.health <= 0 ? "is-defeated" : ""} ${fighter.blocked ? "is-blocking" : ""}`}
    >
      <div className="fighter-hud">
        <div className="fighter-hud-heading">
          <h3>{fighter.name}</h3>
          {isSelected && <span className="selected-mark">ACTIVE</span>}
          {fighter.isCpuTeammate && <span className="fighter-control-tag">CPU ALLY</span>}
        </div>

        <ResourceBar
          label="HP"
          value={Math.max(0, fighter.health)}
          maximum={fighter.maximumHealth}
          percent={percent(Math.max(0, fighter.health), fighter.maximumHealth)}
          type="health"
        />
        <ResourceBar
          label="MP"
          value={Math.max(0, fighter.mana)}
          maximum={fighter.maximumMana}
          percent={percent(Math.max(0, fighter.mana), fighter.maximumMana)}
          type="mana"
        />

        <div className="fighter-charge-row" aria-label="Cooldown and recovery">
          <SegmentedMeter
            label="CD"
            value={cooldownCurrent}
            maximum={cooldownMaximum}
            type="cooldown"
            title={`Cooldown charges: ${cooldownCurrent}/${cooldownMaximum}`}
          />
          <SegmentedMeter
            label="REC"
            value={recoveryCurrent}
            maximum={recoveryMaximum}
            type="recovery"
            title={`Recovery: ${recoveryCurrent}/${recoveryMaximum}`}
          />
        </div>
      </div>
      <div className="fighter-hud-pointer" aria-hidden="true" />

      <button
        type="button"
        className={`fighter-card fighter-art-button ${isSelected ? "is-selected" : ""} ${fighter.health <= 0 ? "is-defeated" : ""} ${fighter.blocked ? "is-blocking" : ""} ${hasStunnedAttacks ? "has-stunned-attacks" : ""}`}
        onClick={onClick}
        disabled={fighter.health <= 0 || (team === "opponent" && !canSelect)}
        aria-label={`${fighter.name}, ${fighter.health} of ${fighter.maximumHealth} health, ${fighter.mana} of ${fighter.maximumMana} mana. Hover or focus for fighter stats.`}
      >
        <div className="fighter-portrait-stage">
          {fighter.image && (
            <div className={`fighter-portrait-wrapper ${hasStunnedAttacks ? "fighter-stunned" : ""}`}>
              <img key={combatEffect?.id ?? "idle"} className="fighter-portrait" src={fighter.image} alt="" />
              {hasStunnedAttacks && <span className="team-stun-status"><strong>STUNNED!</strong><small key={stunnedAttackCount}>{stunnedAttackCount} ATTACK{stunnedAttackCount === 1 ? "" : "S"} DISABLED</small></span>}
            </div>
          )}
          {combatEffect && (
            <div key={combatEffect.id} className={`fighter-impact-overlay impact-${combatEffect.type}`}>
              {combatEffect.damage > 0 && (
                <strong className={`fighter-impact-number damage-tier-${combatEffect.tier}`}>
                  {combatEffect.tier === "light" ? `+${combatEffect.damage}` : combatEffect.tier === "effective" ? `!${combatEffect.damage}` : combatEffect.tier === "heavy" ? `!!${combatEffect.damage}` : `FATAL ${combatEffect.damage}`}
                </strong>
              )}
              {combatEffect.message && <span className={combatEffect.message === "STUNNED!" ? "team-stunned-callout" : ""}>{combatEffect.message}</span>}
              {(combatEffect.effects ?? []).map((effect, index) => (
                <b key={index} className={`fighter-impact-status effect-${effect.stat}`} style={{ animationDelay: `${index * 650}ms` }}>{effect.label}</b>
              ))}
            </div>
          )}
          {fighter.health <= 0 && (
            <span className="fighter-ko-badge" aria-label="Knocked out">K.O.</span>
          )}
          {isSelected && fighter.health > 0 && (
            <span className="fighter-active-indicator">ACTIVE FIGHTER</span>
          )}
        </div>

        <div className="fighter-info-popup" role="tooltip">
          <div className="fighter-info-popup-heading">
            <strong>{fighter.name}</strong>
            <span>FIGHTER STATUS</span>
          </div>
          <div className="fighter-info-stat-grid">
            <div><span>DEFENSE</span><b>{getModifiedCharacterStat(fighter, "defense")}</b></div>
            <div><span>AGILITY</span><b>{getModifiedCharacterStat(fighter, "agility")}</b></div>
            <div><span>MANA REGEN</span><b>{getModifiedCharacterStat(fighter, "manaRegen")}</b></div>
            <div><span>RECOVERY</span><b>{getModifiedCharacterStat(fighter, "recovery")}</b></div>
            <div><span>MAX HEALTH</span><b>{fighter.maximumHealth}</b></div>
            <div><span>MAX MANA</span><b>{fighter.maximumMana}</b></div>
            <div><span>ATTACK SLOTS</span><b>{fighter.attacks?.length ?? 0}/{slotCount}</b></div>
            <div><span>COOLDOWN</span><b>{cooldownCurrent}/{cooldownMaximum}</b></div>
          </div>

          {activeModifiers.length > 0 && (
            <div className="fighter-info-effects">
              <strong>ACTIVE EFFECTS</strong>
              {activeModifiers.map((modifier, index) => (
                <span key={modifier.id ?? index}>
                  {modifier.sourceAttackName ?? modifier.id ?? "Active modifier"}
                  {modifier.remainingDuration != null ? ` · ${modifier.remainingDuration} turns` : ""}
                </span>
              ))}
            </div>
          )}
          {hasStunnedAttacks && (
            <div className="fighter-info-stun">STUNNED ATTACKS</div>
          )}
          <span className="fighter-info-hint">Hovering shows current modified stats</span>
        </div>
      </button>
    </div>
  );
}

function ResourceBar({ label, value, maximum, percent, type }) {
  return (
    <div className={`resource-row resource-${type}`}>
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

function SegmentedMeter({ label, value, maximum, type, title }) {
  const safeMaximum = Math.min(12, Math.max(0, Math.floor(maximum)));
  const filled = Math.min(safeMaximum, Math.max(0, Math.floor(value)));
  return (
    <div className={`fighter-segmented-meter meter-${type}`} title={title}>
      <span className="fighter-segmented-label">{label}</span>
      <div className="fighter-segments" aria-label={title}>
        {Array.from({ length: safeMaximum }, (_, index) => (
          <span
            key={index}
            className={index < filled ? "is-filled" : ""}
          />
        ))}
        {safeMaximum === 0 && <i className="fighter-no-segments">—</i>}
      </div>
      <b>{value}/{maximum}</b>
    </div>
  );
}

function createBattleTeams(playerTeamIds, opponentTeamIds, isCpuAssist, difficulty = "Normal") {
  const player = playerTeamIds.map((id, index) => {
    const isCpuTeammate = isCpuAssist && index === 1;
    const fighter = createBattleFighter(id, isCpuTeammate);

    if (!fighter) return null;

    return isCpuTeammate ? { ...fighter, isCpuTeammate: true } : fighter;
  });

  return {
    player,
    opponent: opponentTeamIds.map((id) => createBattleFighter(id, true)),
  };
}

function assignUniqueCpuTargets(opponents, players, previousCpuAttackers = []) {
  const livingPlayers = players.filter((player) => player && player.health > 0);

  const livingOpponents = opponents.filter(
    (opponent) => opponent && opponent.health > 0,
  );

  const targets = {};

  if (!livingPlayers.length || !livingOpponents.length) {
    return targets;
  }

  // Randomly shuffle an array.
  const shuffle = (items) => {
    const shuffled = [...items];

    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));

      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
  };

  const shuffledPlayers = shuffle(livingPlayers);

  let opponentPool = shuffle(livingOpponents);

  // If there are more opponents than players,
  // avoid selecting last round's attackers when possible.
  if (livingOpponents.length > livingPlayers.length) {
    const previousAttackers = new Set(previousCpuAttackers);

    const opponentsNotUsedLastRound = opponentPool.filter(
      (opponent) => !previousAttackers.has(opponent.id),
    );

    if (opponentsNotUsedLastRound.length >= livingPlayers.length) {
      opponentPool = opponentsNotUsedLastRound;
    }
  }

  // Only assign as many opponents as there are living players.
  const selectedOpponents = opponentPool.slice(
    0,
    Math.min(livingPlayers.length, livingOpponents.length),
  );

  selectedOpponents.forEach((opponent, index) => {
    targets[opponent.id] = shuffledPlayers[index].id;
  });

  return targets;
}

export default function TeamBattle() {
  const location = useLocation();
  const navigate = useNavigate();
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
  const [pendingHealSelection, setPendingHealSelection] = useState(null);
  const resolveLocalCoopDefenseRef = useRef(() => {});
  const [isIntroFadingOut, setIsIntroFadingOut] = useState(false);
  const [playerAttackPopup, setPlayerAttackPopup] = useState(null);
  const [localCoopDefenses, setLocalCoopDefenses] = useState([]);
  const [localCoopDefenseTimers, setLocalCoopDefenseTimers] = useState({});
  const previousCpuAttackersRef = useRef(new Set());
  const localCoopExpiredRef = useRef(new Set());
  const localCoopResolvedRef = useRef(new Set());
  const localCoopTimeoutsRef = useRef([]);
  const localCoopAttackQueuesRef = useRef({});
  const [cpuQueueReady, setCpuQueueReady] = useState(false);
  const isLocalCoop = teamControl === "local-coop";
  const isCpuAssist = teamControl === "cpu-assist";
  const teammateAttackLimit =
    difficulty === "Easy" ? 2 : Number.POSITIVE_INFINITY;

  const [teams, setTeams] = useState(() =>
    createBattleTeams(playerTeamIds, opponentTeamIds, isCpuAssist, difficulty),
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
  const [isPaused, setIsPaused] = useState(false);
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
    recordDailyObjectiveEvent("battle", 1);

    // Only victories count toward victory challenges.
    if (phase === "victory") {
      recordFestivalEvent("victory", 1);
      recordDailyObjectiveEvent("victory", 1);
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

  useEffect(() => {
    if (isFinalTeamPhase) return undefined;
    const handlePauseKey = (event) => {
      if (event.key === "Escape" && !event.repeat) { event.preventDefault(); setIsPaused((value) => !value); }
    };
    window.addEventListener("keydown", handlePauseKey);
    return () => window.removeEventListener("keydown", handlePauseKey);
  }, [isFinalTeamPhase]);

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
  const [combatEffects, setCombatEffects] = useState({});
  const popupTimerRef = useRef(null);
  const teammateTargetTimerRef = useRef(null);
  // Remember which opponents the CPU teammate has faced during this battle.
  const teammateOpponentHistoryRef = useRef(new Map());
  const allyAttackTimerRef = useRef(null);
  const [combatLog, setCombatLog] = useState([
    "Choose your fighters' targets.",
  ]);
  const [damageDealt, setDamageDealt] = useState(0);
  const [combatDefense, setCombatDefense] = useState(0);
  const [attacksUsed, setAttacksUsed] = useState(0);
  const [comboState, setComboState] = useState(null);
  const [comboBreakState, setComboBreakState] = useState(null);
  const [highestCombo, setHighestCombo] = useState(0);
  const comboStreakRef = useRef(0);
  const highestComboRef = useRef(0);
  const endComboStreak = useCallback(() => {
    const count = comboStreakRef.current;
    if (count >= 3) setComboBreakState({ count, id: Date.now() + Math.random() });
    comboStreakRef.current = 0;
    setComboState(null);
  }, []);

  const recordComboOutcome = useCallback((successful) => {
    if (!successful) {
      endComboStreak();
      return;
    }
    const nextCount = Math.min(10, comboStreakRef.current + 1);
    comboStreakRef.current = nextCount;
    if (nextCount >= 3) {
      const stage = nextCount >= 10 ? 10 : nextCount >= 8 ? 8 : nextCount;
      setComboState({ count: nextCount, stage, id: Date.now() + Math.random() });
      if (nextCount > highestComboRef.current) {
        highestComboRef.current = nextCount;
        setHighestCombo(nextCount);
      }
    }
  }, [endComboStreak]);

  useEffect(() => {
    if (phase !== "fighting") endComboStreak();
  }, [phase, endComboStreak]);

  const teamRewardPaidRef = useRef(false);
  useEffect(() => {
    if (!isStoryMode && (phase === "victory" || phase === "defeat") && !teamRewardPaidRef.current) {
      teamRewardPaidRef.current = true;
      const multiplier = ({ Easy: 1, Normal: 2, Hard: 3 })[difficulty] ?? 1;
      addCoins(Math.floor((damageDealt + combatDefense) * multiplier * Math.max(1, highestCombo)));
    }
  }, [phase, isStoryMode, difficulty, damageDealt, combatDefense, highestCombo]);

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
      recordDailyObjectiveEvent("damage", newDamage);
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
    // The individual K.O. cutscene must finish before the team face-off begins.
    if (!isFinalTeamPhase || knockout) {
      setTeamFinishComplete(false);
      setIsTeamFinishFadingOut(false);
      return undefined;
    }

    setTeamFinishComplete(false);
    setIsTeamFinishFadingOut(false);

    // Give the winner/defeated showcase a full 3.2 seconds, then transition
    // into the points/results screen.
    const fadeTimer = setTimeout(() => {
      setIsTeamFinishFadingOut(true);
    }, 3200);

    const completeTimer = setTimeout(() => {
      setTeamFinishComplete(true);
    }, 3800);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [isFinalTeamPhase, phase, knockout]);

  useEffect(() => {
    if (!combatPopups.length) return undefined;

    const displayedCount = Math.min(combatPopups.length, 3);

    const timer = setTimeout(() => {
      setPendingAllyAttack(null);
      setCombatPopups((current) => current.slice(displayedCount));
    }, 3400);

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

    // Clicking the currently selected opponent again deselects that target.
    if (roundTargets[fighterId] === opponentId) {
      setRoundTargets((current) => {
        const updated = { ...current };
        delete updated[fighterId];
        return updated;
      });
      if (player.isCpuTeammate && teammateTargetTimerRef.current) {
        clearTimeout(teammateTargetTimerRef.current);
        teammateTargetTimerRef.current = null;
      }
      addLog(`${player.name} is no longer assigned to ${opponent.name}.`);
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
    if (!showRoundIntro || isPaused) return;

    setIsIntroFadingOut(false);

    const fadeTimer = setTimeout(() => {
      setIsIntroFadingOut(true);
    }, 2400);

    const removeTimer = setTimeout(() => {
      setShowRoundIntro(false);
      setIsIntroFadingOut(false);
    }, 7000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, [showRoundIntro, roundNumber, isPaused]);

  useEffect(() => {
    if (isPaused || !isCpuAssist || phase !== "selecting") return;

    const teammate = teams.player.find((fighter) => fighter.isCpuTeammate);

    // A defeated teammate must never receive a target.
    if (!teammate || teammate.health <= 0 || roundTargets[teammate.id]) {
      return;
    }

    teammateTargetTimerRef.current = setTimeout(() => {
      const availableOpponents = teams.opponent.filter(
        (opponent) =>
          opponent.health > 0 &&
          !Object.entries(roundTargets).some(
            ([fighterId, opponentId]) =>
              fighterId !== teammate.id && opponentId === opponent.id,
          ),
      );

      if (availableOpponents.length > 0) {
        let selectedOpponent;

        if (difficulty === "Easy" || difficulty === "Normal") {
          const facedOpponents =
            teammateOpponentHistoryRef.current.get(teammate.id) ?? new Set();

          const opponentsNotFaced = availableOpponents.filter(
            (opponent) => !facedOpponents.has(opponent.id),
          );

          // Prefer an opponent the teammate has never faced.
          const selectionPool =
            opponentsNotFaced.length > 0
              ? opponentsNotFaced
              : availableOpponents;

          selectedOpponent =
            selectionPool[Math.floor(Math.random() * selectionPool.length)];
        } else {
          // Preserve the existing selection behavior on Hard.
          selectedOpponent = availableOpponents[0];
        }

        if (selectedOpponent) {
          setRoundTargets((current) => {
            // Don't overwrite a target that was already assigned.
            if (current[teammate.id]) return current;

            return {
              ...current,
              [teammate.id]: selectedOpponent.id,
            };
          });

          if (difficulty === "Easy" || difficulty === "Normal") {
            const history =
              teammateOpponentHistoryRef.current.get(teammate.id) ?? new Set();

            history.add(selectedOpponent.id);
            teammateOpponentHistoryRef.current.set(teammate.id, history);
          }
        }
      }

      teammateTargetTimerRef.current = null;
    }, 3000);

    return () => {
      clearTimeout(teammateTargetTimerRef.current);
      teammateTargetTimerRef.current = null;
    };
  }, [
    isCpuAssist,
    phase,
    teams.player,
    teams.opponent,
    roundTargets,
    difficulty,
  ]);

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

    const playersWithTargets = teams.player.map((player) => {
      const hasTarget = livingOpponents.some(
        (opponent) => targetsForRound[player.id] === opponent.id,
      );

      const hasUsableHeal =
        player.isCpuTeammate &&
        player.attacks.some(
          (attack) =>
            attack.heal &&
            canUseAttack(attack) &&
            player.mana >= (attack.cost ?? 0),
        );

      return {
        ...player,
        turnFinished: player.health <= 0 || (!hasTarget && !hasUsableHeal),
      };
    });

    setRoundTargets(targetsForRound);

    const newCpuTargets = assignUniqueCpuTargets(teams.opponent, teams.player, [
      ...previousCpuAttackersRef.current,
    ]);

    previousCpuAttackersRef.current = new Set(Object.keys(newCpuTargets));

    setCpuTargets(newCpuTargets);



    setTeams((current) => ({ ...current, player: playersWithTargets }));
    
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
    if (isPaused || phase !== "fighting" || pendingDefense || pendingAllyAttack) return;
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

  const handleTeamAttack = (fighterId, attackIndex) => {
    const fighter = teams.player.find((member) => member.id === fighterId);

    const attack = fighter?.attacks?.[attackIndex];

    if (!attack) return;

    // Normal attacks and attacks without healing
    // continue through the existing combat system.
    if (!attack.heal) {
      useAttack(fighterId, attackIndex);
      return;
    }

    // Healing everyone requires no target selection.
    if (attack.heal.target === "all") {
      useAttack(fighterId, attackIndex);
      return;
    }

    // Selected healing requires choosing a teammate.
    if (attack.heal.target === "selected") {
      setPendingHealSelection({
        fighterId,
        attackIndex,
      });
    }
  };
  const confirmHealTarget = (targetId) => {
    if (!pendingHealSelection) return;

    const { fighterId, attackIndex } = pendingHealSelection;

    // Close the teammate-selection interface.
    setPendingHealSelection(null);

    // Pass the selected teammate into the healing logic.
    useAttack(fighterId, attackIndex, null, targetId);
  };

  const useAttack = (
    fighterId,
    attackIndex,
    targetOverrideId = null,
    healTargetId = null,
  ) => {
    if (isPaused || phase !== "fighting") return;

    const updatedPlayers = teams.player.map((fighter) => ({
      ...fighter,
      activeModifiers: (fighter.activeModifiers ?? []).map((modifier) => ({
        ...modifier,
      })),
      defense:
        typeof fighter.defense === "object" && fighter.defense
          ? { ...fighter.defense }
          : fighter.defense,
      attacks: (fighter.attacks ?? []).map((attack) => ({
        ...attack,
        buff: attack.buff ? { ...attack.buff } : attack.buff,
        debuff: attack.debuff ? { ...attack.debuff } : attack.debuff,

        heal: attack.heal
          ? {
              ...attack.heal,
              buff: attack.heal.buff
                ? { ...attack.heal.buff }
                : attack.heal.buff,
            }
          : attack.heal,

        activeEffects: (attack.activeEffects ?? []).map((effect) => ({
          ...effect,
          effects: { ...effect.effects },
        })),
      })),
    }));

    const updatedOpponents = teams.opponent.map((fighter) => ({
      ...fighter,
      activeModifiers: (fighter.activeModifiers ?? []).map((modifier) => ({
        ...modifier,
      })),
      defense:
        typeof fighter.defense === "object" && fighter.defense
          ? { ...fighter.defense }
          : fighter.defense,
      attacks: (fighter.attacks ?? []).map((attack) => ({
        ...attack,
        buff: attack.buff ? { ...attack.buff } : attack.buff,
        debuff: attack.debuff ? { ...attack.debuff } : attack.debuff,

        heal: attack.heal
          ? {
              ...attack.heal,
              buff: attack.heal.buff
                ? { ...attack.heal.buff }
                : attack.heal.buff,
            }
          : attack.heal,

        activeEffects: (attack.activeEffects ?? []).map((effect) => ({
          ...effect,
          effects: { ...effect.effects },
        })),
      })),
    }));
    const allFighters = [...updatedPlayers, ...updatedOpponents];
    const targetId = targetOverrideId ?? roundTargets[fighterId];

    const attacker = updatedPlayers.find((fighter) => fighter.id === fighterId);
    const defender = updatedOpponents.find(
      (fighter) => fighter.id === targetId,
    );

    if (!attacker || attacker.health <= 0 || attacker.turnFinished) {
      return;
    }

    const attack = attacker.attacks[attackIndex];
    const rosterFighter = roster.find((entry) => entry.id === attacker.id);
    const cpuControlled = attacker.isCpuTeammate ||
      teams.opponent.some((fighter) => fighter.id === attacker.id);
    const allowedAttackKeys = new Set(
      (cpuControlled
        ? getBotEquippedAttacks(attacker.id, rosterFighter?.data?.attacks ?? [], rosterFighter?.data?.slot)
        : getEquippedAttacks(attacker.id, rosterFighter?.data?.attacks ?? [], rosterFighter?.data?.slot)
      ).map(getAttackKey),
    );

    // Never trust an AI-selected index alone: validate the actual move against
    // this fighter's saved, unlocked, equipped loadout immediately before use.
    if (!attack || !allowedAttackKeys.has(getAttackKey(attack))) {
      addLog(`${attacker.name} tried to use an attack outside its equipped loadout.`);
      return;
    }

    if (!canUseAttack(attack)) {
      addLog("That attack is unavailable or still on cooldown.");
      return;
    }

    const modifiedCost = getModifiedAttackStat(attack, attacker, "cost");

    if (attacker.mana < modifiedCost) {
      addLog(`${attacker.name} does not have enough mana.`);
      return;
    }

    const attacksUsedThisTurn = attacker.attacks.filter(
      (move) => move.state === false,
    ).length;

    if (roundNumber === 1 && attacksUsedThisTurn >= 4) {
      addLog(`${attacker.name} has reached the 4-attack opening limit.`);
      return;
    }

    // ==========================================
    // TEAM HEALING ATTACK
    // ==========================================

    if (attack.heal) {
      // A healing action does not connect with an opponent, so it ends the hit streak.
      recordComboOutcome(false);
      let recipients = [];

      if (attack.heal.target === "all") {
        // Heal every living teammate, including the caster.
        recipients = updatedPlayers.filter((fighter) => fighter.health > 0);
      } else if (attack.heal.target === "selected") {
        // Heal only the selected living teammate.
        const target = updatedPlayers.find(
          (fighter) => fighter.id === healTargetId,
        );

        if (!target || target.id === attacker.id || target.health <= 0) {
          addLog("Choose a living teammate to heal.");
          return;
        }

        recipients = [target];
      } else {
        addLog("This healing attack has an invalid target type.");
        return;
      }

      if (recipients.length === 0) {
        addLog("There are no available teammates to heal.");
        return;
      }

      // Pay the mana cost once, regardless of recipient count.
      attacker.mana -= attack.cost ?? 0;

      // Apply healing and buffs to each recipient.
      recipients.forEach((recipient) => {
        const result = applyHeal(attack, recipient);

        addLog(
          `💚 ${attacker.name} healed ${recipient.name} for ${result.healed} HP!`,
          "buff",
        );

        describeEffects(result.buffsApplied, recipient.name, "buff").forEach(
          (message) => addLog(message, "buff"),
        );
      });

      // Consume the healing attack exactly once.
      consumeAttack(attack);
      setAttacksUsed((value) => value + 1);

      // Determine whether the CPU teammate can act again.
      const isCpuAttacker = attacker.isCpuTeammate;

      const attacksUsedAfter = attacker.attacks.filter(
        (move) => move.state === false,
      ).length;

      const hasUsableAttack = attacker.attacks.some(
        (move) => canUseAttack(move) && attacker.mana >= (move.cost ?? 0),
      );

      const cpuMustFinish =
        !hasUsableAttack ||
        (difficulty === "Easy" && attacksUsedAfter >= 2) ||
        (roundNumber === 1 && attacksUsedAfter >= 4);

      // Save the updated resources and attacks on the actual team fighter.
      const playersAfter = updatedPlayers.map((fighter) => {
        if (fighter.id !== attacker.id) return fighter;

        return {
          ...fighter,
          attacks: attacker.attacks,
          mana: attacker.mana,
          health: attacker.health,
          activeModifiers: attacker.activeModifiers ?? [],
          turnFinished: isCpuAttacker ? cpuMustFinish : fighter.turnFinished,
        };
      });

      setTeams({
        player: playersAfter,
        opponent: updatedOpponents,
      });

      // Release the CPU teammate's pending action so Normal can continue
      // if it still has usable attacks.
      if (isCpuAttacker) {
        setPendingAllyAttack(null);
      }

      if (
        playersAfter.every(
          (fighter) => fighter.health <= 0 || fighter.turnFinished,
        )
      ) {
        setPhase("cpu-fighting");
        addLog("Your team is finished. The CPU is preparing its attacks.");
      }

      return;
    }

    // Normal attacks still require an enemy target.
    if (!defender) return;

    if (defender.health <= 0) {
      addLog("That opponent has already been defeated.");
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

    const stunOptions = {
      fighters: allFighters,
    };

    const result =
      difficulty === "Easy"
        ? attackCharacter(attack, attacker, defender, 0, stunOptions)
        : difficulty === "Normal"
          ? normalDefendOrEvade(attack, attacker, defender, stunOptions)
          : aiDefendOrEvade(attack, attacker, defender, stunOptions);

    if (!result) {
      addLog(`${attack.name} could not be used.`);
      return;
    }

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

    const damageActuallyDealt = Math.max(0, healthBefore - Math.max(0, defender.health));
    setDamageDealt((value) => value + damageActuallyDealt);

    const appliedBuffs = Object.entries(result.buffsApplied ?? {})
      .filter(([, amount]) => Number(amount) !== 0)
      .map(([stat, amount]) => ({ stat, label: `↑ ${stat.toUpperCase()} ${amount > 0 ? "+" : ""}${amount}` }));
    const appliedDebuffs = Object.entries(result.debuffsApplied ?? {})
      .filter(([, amount]) => Number(amount) !== 0)
      .map(([stat, amount]) => ({ stat, label: `↓ ${stat.toUpperCase()} ${amount > 0 ? "+" : ""}${amount}` }));
    if (result.stunnedAttacks?.length) {
      appliedDebuffs.push({ stat: "stun", label: "STUN APPLIED" });
    }
    recordComboOutcome(damageActuallyDealt > 0 || appliedDebuffs.length > 0);
    const impactTier = damageActuallyDealt >= 70 ? "fatal" : damageActuallyDealt >= 45 ? "heavy" : damageActuallyDealt >= 20 ? "effective" : "light";
    const impactType = result.evaded ? "evaded" : result.action === "defend" ? "blocked" : damageActuallyDealt > 0 ? "damage" : "status";
    const attackerEffectId = Date.now() + Math.random();
    const defenderEffectId = Date.now() + Math.random();
    setCombatEffects((current) => ({
      ...current,
      [attacker.id]: {
        id: attackerEffectId,
        type: damageActuallyDealt > 0 ? "attack" : "status",
        damage: 0,
        tier: "light",
        message: "",
        effects: appliedBuffs,
      },
      [defender.id]: {
        id: defenderEffectId,
        type: impactType,
        damage: damageActuallyDealt,
        tier: impactTier,
        message: result.evaded ? "EVADED!" : result.action === "defend" ? "BLOCKED!" : "",
        effects: appliedDebuffs,
      },
    }));
    [[attacker.id, attackerEffectId], [defender.id, defenderEffectId]].forEach(([fighterId, effectId]) => {
      setTimeout(() => {
        setCombatEffects((current) =>
          current[fighterId]?.id === effectId
            ? { ...current, [fighterId]: null }
            : current,
        );
      }, 3000);
    });
    if (!attacker.isCpuTeammate && damageActuallyDealt > 0) playGameSound("attack");
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
            canUseAttack(candidate) && attacker.mana >= (candidate.cost ?? 0),
        );

        return {
          ...fighter,
          attacks: attacker.attacks,
          mana: attacker.mana,
          health: attacker.health,
          activeModifiers: attacker.activeModifiers ?? [],
          turnFinished:
            !hasUsableAttack ||
            (difficulty === "Easy" && attacksUsedThisTurn >= 2),
        };
      }

      // If this is the human attacker, save their own updated attacks/resources.
      if (fighter.id === attacker.id) {
        return {
          ...fighter,
          attacks: attacker.attacks,
          mana: attacker.mana,
          health: attacker.health,
          activeModifiers: attacker.activeModifiers ?? [],
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
          canUseAttack(candidate) && attacker.mana >= (candidate.cost ?? 0),
      );

      const canAttackAgain =
        nextAttackIndex !== -1 &&
        assignedTargetAlive &&
        !(difficulty === "Easy" && attacksUsedThisTurn >= 2);

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
    phase === "fighting" && !pendingDefense && !pendingAllyAttack && !isPaused,
  );

  useEffect(() => {
    if (isPaused || phase !== "fighting" || pendingAllyAttack) return;

    const playersAfter = teams.player.map((player) => {
      const targetId = roundTargets[player.id];
      const targetAlive = teams.opponent.some(
        (opponent) => opponent.id === targetId && opponent.health > 0,
      );

      const hasUsableHeal =
        player.isCpuTeammate &&
        player.attacks.some(
          (attack) =>
            attack.heal &&
            canUseAttack(attack) &&
            player.mana >= (attack.cost ?? 0),
        );

      return (player.health <= 0 || (!targetAlive && !hasUsableHeal)) &&
        !player.turnFinished
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
    if (isPaused || !isCpuAssist || phase !== "fighting" || pendingAllyAttack) return;

    const ally = teams.player.find(
      (fighter) => fighter.isCpuTeammate && fighter.health > 0,
    );

    if (!ally || ally.turnFinished) return;

    const targetId = roundTargets[ally.id];

    const target = teams.opponent.find(
      (fighter) => fighter.id === targetId && fighter.health > 0,
    );

    const attacksUsedThisTurn = ally.attacks.filter(
      (attack) => attack.state === false,
    ).length;

    if (roundNumber === 1 && attacksUsedThisTurn >= 4) {
      finishPlayerTurn(ally.id);
      return;
    }

    if (difficulty === "Easy" && attacksUsedThisTurn >= 2) {
      finishPlayerTurn(ally.id);
      return;
    }

    let selectedAttack = null;
    let healTargetId = null;

    if (difficulty === "Easy") {
      // If there is no opponent, Easy can only choose a healing attack.
      const availableAttacks = target
        ? ally.attacks
        : ally.attacks.filter((attack) => attack.heal);

      selectedAttack = aiChooseAttack({
        ...ally,
        attacks: availableAttacks,
      });

      // Easy randomly chooses a living teammate for selected healing.
      if (selectedAttack?.heal?.target === "selected") {
        const healTarget = aiChooseHealTarget(ally, teams.player);
        healTargetId = healTarget?.id ?? null;
      }
    } else {
      // Normal evaluates healing value and chooses the best recipient.
      // Without an opponent, it considers healing attacks only.
      const fighterToEvaluate = target
        ? ally
        : {
            ...ally,
            attacks: ally.attacks.filter((attack) => attack.heal),
          };

      const action = chooseNormalTeamAction(fighterToEvaluate, teams.player);

      selectedAttack = action?.attack ?? null;
      healTargetId = action?.healTargetId ?? null;
    }

    const attackIndex = selectedAttack
      ? ally.attacks.indexOf(selectedAttack)
      : -1;

    if (attackIndex === -1) {
      finishPlayerTurn(ally.id);
      return;
    }

    // Ordinary attacks still require an assigned living opponent.
    if (!selectedAttack.heal && !target) {
      finishPlayerTurn(ally.id);
      return;
    }

    // A selected-target heal must have a valid living teammate.
    if (selectedAttack.heal?.target === "selected" && !healTargetId) {
      finishPlayerTurn(ally.id);
      return;
    }

    setDefenseOutcome(null);
    setAllyAttackOutcome(null);

    setPendingAllyAttack({
      fighterId: ally.id,
      targetId: target?.id ?? null,
      attackIndex,
      healTargetId,
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
        attackToRun.healTargetId,
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
      isPaused ||
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
              canUseAttack(attack) && cpu.mana >= (attack.cost ?? 0),
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
            canUseAttack(attack) && cpu.mana >= (attack.cost ?? 0),
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
    isPaused,
    pendingDefense,
    cpuActionQueue,
    cpuAttacksPerTurn,
    cpuTargets,
    teams.opponent,
    teams.player,
  ]);

  useEffect(() => {
    if (
      isPaused ||
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

      // Clone both teams first so temporary effects can find their targets.
      const allFighters = [...teams.player, ...teams.opponent].map(
        (fighter) => ({
          ...fighter,
          activeModifiers: (fighter.activeModifiers ?? []).map((modifier) => ({
            ...modifier,
          })),
          attacks: fighter.attacks.map((attack) => ({
            ...attack,
            buff: attack.buff ? { ...attack.buff } : attack.buff,
            debuff: attack.debuff ? { ...attack.debuff } : attack.debuff,
            activeEffects: attack.activeEffects
              ? [...attack.activeEffects]
              : [],
          })),
        }),
      );

      // Reset attack cooldowns and reverse expired effects.
      allFighters.forEach((fighter) => {
        fighter.attacks = resetAttacks(fighter.attacks, allFighters);
      });

      // Restore each fighter's normal round resources.
      const resetFighters = (fighters) =>
        fighters.map((fighter) => {
          const updatedFighter = {
            ...fighter,

            mana:
              fighter.health > 0
                ? Math.min(
                    getModifiedCharacterStat(fighter, "maximumMana"),
                    fighter.mana +
                      getModifiedCharacterStat(fighter, "manaRegen"),
                  )
                : fighter.mana,

            cooldown:
              fighter.health > 0
                ? Math.round(
                    Math.min(
                      fighter.maximumCooldown == null
                        ? (fighter.cooldown ?? 0)
                        : getModifiedCharacterStat(fighter, "maximumCooldown"),
                      (fighter.cooldown ?? 0) +
                        (fighter.recovery == null
                          ? 1
                          : getModifiedCharacterStat(fighter, "recovery")),
                    ),
                  )
                : fighter.cooldown,

            turnFinished: false,
            blocked: false,
            attacks: fighter.attacks,
          };

          // Expire one duration only after this round's recovery is complete.
          tickSelfModifiers(updatedFighter);

          return updatedFighter;
        });

      const playerCount = teams.player.length;

      setTeams({
        player: resetFighters(allFighters.slice(0, playerCount)),
        opponent: resetFighters(allFighters.slice(playerCount)),
      });
      setRoundTargets({});
      setCpuQueueReady(false);
      setCpuTargets({});
      setCpuActionQueue(null);
      setCpuActionIndex(0);
      setRoundNumber((round) => round + 1);
      setShowRoundIntro(true);
      setPhase("selecting");
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
    if (!attack || !canUseAttack(attack) || cpu.mana < (attack.cost ?? 0)) {
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
  }, [
    phase,
    isPaused,
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
    if (isPaused || phase !== "cpu-fighting" || !pendingDefense) return;

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
    isPaused,
  ]);

  useEffect(() => {
    if (isPaused || phase !== "cpu-fighting" || !isLocalCoop || !localCoopDefenses.length) {
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
    if (isPaused || phase !== "cpu-fighting" || !isLocalCoop) return;

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
  }, [phase, isLocalCoop, isPaused]);

  // Resolve each card once when its own deadline expires.
  useEffect(() => {
    if (isPaused || phase !== "cpu-fighting" || !isLocalCoop) return;

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
  }, [phase, isLocalCoop, localCoopDefenses, isPaused]);

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

    if (choice === "defend" && getModifiedCharacterStat(defender, "cooldown") <= 0) {
      return;
    }

    localCoopResolvedRef.current.add(defenseId);

    const cloneFighter = (fighter) => ({
      ...fighter,
      defense:
        typeof fighter.defense === "object" && fighter.defense
          ? { ...fighter.defense }
          : fighter.defense,
      attacks: (fighter.attacks ?? []).map((item) => ({
        ...item,
        buff: item.buff ? { ...item.buff } : item.buff,
        debuff: item.debuff ? { ...item.debuff } : item.debuff,
        activeEffects: (item.activeEffects ?? []).map((effect) => ({
          ...effect,
          effects: { ...effect.effects },
        })),
      })),
    });

    const updatedPlayers = teams.player.map(cloneFighter);
    const updatedCPU = teams.opponent.map(cloneFighter);

    const allFighters = [...updatedPlayers, ...updatedCPU];

    const currentDefender = updatedPlayers.find(
      (fighter) => fighter.id === incoming.targetId,
    );
    const currentAttacker = updatedCPU.find(
      (fighter) => fighter.id === incoming.cpuId,
    );
    const currentAttack = currentAttacker.attacks[incoming.attackIndex];

    const stunOptions = {
      fighters: allFighters,
      selectedAttackIds: aiChooseStunTargets(
        currentDefender,
        currentAttack.stun,
      ),
    };

    const healthBefore = Number(currentDefender.health) || 0;

    let result;

    if (choice === "defend") {
      const defense = getModifiedCharacterStat(currentDefender, "defense");

      result = attackCharacter(
        currentAttack,
        currentAttacker,
        currentDefender,
        defense,
        {
          ...stunOptions,
          blocked: true,
        },
      );
    } else if (choice === "evade") {
      result = evadeAttack(
        currentAttack,
        currentAttacker,
        currentDefender,
        stunOptions,
      );
    } else {
      // Timeout and "take-damage": take the unblocked hit.
      result = attackCharacter(
        currentAttack,
        currentAttacker,
        currentDefender,
        0,
        {
          ...stunOptions,
          blocked: false,
        },
      );
    }

    if (result) {
      Object.assign(currentAttacker, result.attacker ?? {});
      Object.assign(currentDefender, result.defender ?? {});
    }

    if (result && (choice === "defend" || choice === "evade")) {
      // Defending consumes one cooldown charge here.
      // evadeAttack() already handles its own cooldown reduction.
      if (choice === "defend") {
        currentDefender.cooldown = Math.max(
          0,
          (currentDefender.cooldown ?? 0) - 1,
        );
      }

      currentDefender.blocked = true;
    }
    // Record successful defensive actions.
    if (result) {
      if (choice === "defend") {
        setCombatDefense((value) => value + 1);
        recordFestivalEvent("block", 1);
        recordDailyObjectiveEvent("defense", 1);
      } else if (choice === "evade" && result.evaded) {
        setCombatDefense((value) => value + 1);
        recordFestivalEvent("evade", 1);
        recordDailyObjectiveEvent("defense", 1);
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
          fighters.map((fighter) => {
            const updatedFighter = {
              ...fighter,

              mana:
                fighter.health > 0
                  ? Math.min(
                      getModifiedCharacterStat(fighter, "maximumMana"),
                      fighter.mana +
                        getModifiedCharacterStat(fighter, "manaRegen"),
                    )
                  : fighter.mana,

              cooldown:
                fighter.health > 0
                  ? Math.round(
                      Math.min(
                        fighter.maximumCooldown == null
                          ? (fighter.cooldown ?? 0)
                          : getModifiedCharacterStat(
                              fighter,
                              "maximumCooldown",
                            ),
                        (fighter.cooldown ?? 0) +
                          (fighter.recovery == null
                            ? 1
                            : getModifiedCharacterStat(fighter, "recovery")),
                      ),
                    )
                  : fighter.cooldown,

              turnFinished: false,
              blocked: false,

              attacks: resetAttacks(
                fighter.attacks.map((attack) => ({
                  ...attack,
                  buff: attack.buff ? { ...attack.buff } : attack.buff,
                  debuff: attack.debuff ? { ...attack.debuff } : attack.debuff,
                })),
              ),
            };

            // Tick modifiers after this round's resource recovery.
            tickSelfModifiers(updatedFighter);

            return updatedFighter;
          });

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
    if (isPaused || phase !== "cpu-fighting") return;

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
        if (choice === "defend" && (!defender || getModifiedCharacterStat(defender, "cooldown") <= 0)) {
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
      if (choice === "defend" && (!defender || getModifiedCharacterStat(defender, "cooldown") <= 0)) {
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
        (!defendingFighter || getModifiedCharacterStat(defendingFighter, "cooldown") <= 0)
      ) {
        return;
      }

      const cloneFighter = (fighter) => ({
        ...fighter,
        defense:
          typeof fighter.defense === "object" && fighter.defense
            ? { ...fighter.defense }
            : fighter.defense,
        attacks: (fighter.attacks ?? []).map((attack) => ({
          ...attack,
          buff: attack.buff ? { ...attack.buff } : attack.buff,
          debuff: attack.debuff ? { ...attack.debuff } : attack.debuff,
          activeEffects: (attack.activeEffects ?? []).map((effect) => ({
            ...effect,
            effects: { ...effect.effects },
          })),
        })),
      });

      const updatedPlayers = teams.player.map(cloneFighter);
      const updatedCPU = teams.opponent.map(cloneFighter);

      const allFighters = [...updatedPlayers, ...updatedCPU];

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
      const defenderHealthBefore = Math.max(0, Number(currentDefender.health) || 0);
      const stunOptions = {
        fighters: allFighters,
        selectedAttackIds: aiChooseStunTargets(currentDefender, attack.stun),
      };

      let result;

      if (choice === "defend") {
        const defense = getModifiedCharacterStat(currentDefender, "defense");

        result = attackCharacter(
          attack,
          currentAttacker,
          currentDefender,
          defense,
          {
            ...stunOptions,
            blocked: true,
          },
        );
      } else if (choice === "evade") {
        result = evadeAttack(
          attack,
          currentAttacker,
          currentDefender,
          stunOptions,
        );
      } else {
        // Includes "take-damage" and the 10-second timeout.
        result = attackCharacter(attack, currentAttacker, currentDefender, 0, {
          ...stunOptions,
          blocked: false,
        });
      }

      defenseResolvedRef.current = true;

      if (result) {
        const actualDamage = Math.max(
          0,
          defenderHealthBefore - Math.max(0, Number(currentDefender.health) || 0),
        );
        const cpuAttackerEffectId = Date.now() + Math.random();
        const playerDefenderEffectId = Date.now() + Math.random();
        setCombatEffects((current) => ({
          ...current,
          [currentAttacker.id]: {
            id: cpuAttackerEffectId,
            type: "attack",
            damage: 0,
            tier: "light",
            message: "",
            effects: [],
          },
          [currentDefender.id]: {
            id: playerDefenderEffectId,
            type: choice === "defend" ? "blocked" : choice === "evade" && result.evaded ? "evaded" : actualDamage > 0 ? "damage" : "status",
            damage: actualDamage,
            tier: actualDamage >= 70 ? "fatal" : actualDamage >= 45 ? "heavy" : actualDamage >= 20 ? "effective" : "light",
            message: choice === "defend" ? "BLOCKED!" : choice === "evade" && result.evaded ? "EVADED!" : "",
            effects: Object.entries(result.debuffsApplied ?? {}).filter(([, amount]) => Number(amount) !== 0).map(([stat, amount]) => ({ stat, label: `↓ ${stat.toUpperCase()} ${amount > 0 ? "+" : ""}${amount}` })),
          },
        }));
        [[currentAttacker.id, cpuAttackerEffectId], [currentDefender.id, playerDefenderEffectId]].forEach(([fighterId, effectId]) => {
          setTimeout(() => {
            setCombatEffects((current) =>
              current[fighterId]?.id === effectId
                ? { ...current, [fighterId]: null }
                : current,
            );
          }, 3000);
        });
      }

      if (!result) {
        addLog("The defensive action could not be completed.");
      } else {
        // Record successful defensive actions.
        if (choice === "defend" || choice === "evade") {
          if (choice === "defend") {
            currentDefender.cooldown = Math.max(
              0,
              (currentDefender.cooldown ?? 0) - 1,
            );
          }

          currentDefender.blocked = true;
        }

        if (choice === "defend") {
          setCombatDefense((value) => value + 1);
          recordDailyObjectiveEvent("defense", 1);
          
        } else if (choice === "evade") {
          if (result.evaded) { setCombatDefense((value) => value + 1); recordDailyObjectiveEvent("defense", 1); }
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
    if (isPaused || !pendingDefense || phase !== "cpu-fighting") return;

    const defender = teams.player.find(
      (fighter) => fighter.id === pendingDefense.targetId,
    );

    // Human-controlled fighters keep using the defense buttons.
    if (!defender?.isCpuTeammate) return;

    const timer = setTimeout(() => {
      const cloneFighter = (fighter) => ({
        ...fighter,
        defense:
          typeof fighter.defense === "object" && fighter.defense
            ? { ...fighter.defense }
            : fighter.defense,
        attacks: (fighter.attacks ?? []).map((attack) => ({
          ...attack,
          buff: attack.buff ? { ...attack.buff } : attack.buff,
          debuff: attack.debuff ? { ...attack.debuff } : attack.debuff,
          activeEffects: (attack.activeEffects ?? []).map((effect) => ({
            ...effect,
            effects: { ...effect.effects },
          })),
        })),
      });

      const updatedPlayers = teams.player.map(cloneFighter);
      const updatedOpponents = teams.opponent.map(cloneFighter);

      const allFighters = [...updatedPlayers, ...updatedOpponents];

      const currentAttacker = updatedOpponents.find(
        (fighter) => fighter.id === pendingDefense.cpuId,
      );

      const currentDefender = updatedPlayers.find(
        (fighter) => fighter.id === pendingDefense.targetId,
      );

      const incomingAttack =
        currentAttacker?.attacks[pendingDefense.attackIndex];

      if (!currentAttacker || !currentDefender || !incomingAttack) {
        resolveCPUDefense("timeout");
        return;
      }

      const defenseController =
        difficulty === "Normal" ? normalDefendOrEvade : aiDefendOrEvade;

      const stunOptions = {
        fighters: allFighters,
        selectedAttackIds: aiChooseStunTargets(
          currentDefender,
          incomingAttack.stun,
        ),
      };

      const result = defenseController(
        incomingAttack,
        currentAttacker,
        currentDefender,
        stunOptions,
      );

      if (result) {
        if (result.action === "defend") {
          setCombatDefense((value) => value + 1);
          recordFestivalEvent("block", 1);
          recordDailyObjectiveEvent("defense", 1);
        } else if (result.evaded) {
          setCombatDefense((value) => value + 1);
          recordFestivalEvent("evade", 1);
          recordDailyObjectiveEvent("defense", 1);
        }

        defenseResolvedRef.current = true;

        setTeams({
          player: updatedPlayers,
          opponent: updatedOpponents,
        });

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
  }, [pendingDefense, phase, teams.player, teams.opponent, isPaused]);

  resolveCPUDefenseRef.current = resolveCPUDefense;

  const resetBattle = () => {
    setIsPaused(false);
    setKnockout(null);
    setIsKnockoutFadingOut(false);
    setTeamFinishComplete(false);
    setIsTeamFinishFadingOut(false);
    setPendingHealSelection(null);
    setPendingAllyAttack(null);
    setAllyAttackOutcome(null);
    setDefenseOutcome(null);
    setLocalCoopDefenses([]);
    setLocalCoopDefenseTimers({});
    setCpuQueueReady(false);
    localCoopTimeoutsRef.current.forEach(clearTimeout);
    localCoopTimeoutsRef.current = [];
    if (popupTimerRef.current) clearTimeout(popupTimerRef.current);
    if (teammateTargetTimerRef.current) clearTimeout(teammateTargetTimerRef.current);
    if (allyAttackTimerRef.current) clearTimeout(allyAttackTimerRef.current);
    setTeams(createBattleTeams(playerTeamIds, opponentTeamIds, isCpuAssist, difficulty));
    setRoundNumber(1);
    setRoundTargets({});
    setCpuTargets({});
    setActivePlayerId(playerTeamIds[0] ?? null);
    setPendingDefense(null);
    setCpuActionQueue(null);
    setCpuActionIndex(0);
    setDefenseTimeLeft(10);
    setDamageDealt(0);
    setCombatDefense(0);
    setAttacksUsed(0);
    comboStreakRef.current = 0; highestComboRef.current = 0;
    setComboState(null); setComboBreakState(null); setHighestCombo(0);
    teamRewardPaidRef.current = false;
    setCombatLog(["Choose your fighters' targets."]);
    setCombatMessage("Choose your fighters' targets.");
    setPhase("selecting");
    setShowRoundIntro(true);
    setIsIntroFadingOut(false);
    setCombatPopups([]);
    setCombatEffects({});
    lastFestivalDamage.current = 0;
    lastFestivalAttacks.current = 0;
    defenseResolvedRef.current = false;
    festivalBattleRecorded.current = false;
    teammateOpponentHistoryRef.current.clear();
    previousCpuAttackersRef.current.clear();
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
          onRematch={resetBattle}
        />
      );
    }

    return (
      <BattleResultScreen
        won={won}
        defeated={defeatedTeam}
        winner={winningTeam}
        damageDealt={damageDealt}
        combatDefense={combatDefense}
        attacksUsed={attacksUsed}
        difficulty={difficulty}
        comboMultiplier={Math.max(1, highestCombo)}
        onRematch={resetBattle}
        onMainMenu={() => navigate("/")}
      />
    );
  }

  return (
    <main className={`team-battle ${comboState ? "team-combo-active" : ""}`}>
      <FestivalChallengePopup />
      <ComboPopup combo={comboState} />
      <ComboBreakPopup combo={comboBreakState ? { ...comboBreakState, onDismiss: () => setComboBreakState(null) } : null} />
      <button type="button" className="battle-pause-trigger" onClick={() => setIsPaused(true)} aria-label="Pause match"><span className="battle-pause-icon">Ⅱ</span><span>PAUSE</span></button>
      {isPaused && <BattlePauseMenu onResume={() => setIsPaused(false)} onRestart={resetBattle} onCharacterSelect={() => navigate("/character-select", { state: levelConfig })} onMainMenu={() => navigate("/")} />}

      {isFinalTeamPhase && !knockout && (
<div
          className={`team-finish-overlay ${
            phase === "victory" ? "finish-victory" : "finish-defeat"
          } ${isTeamFinishFadingOut ? "is-fading-out" : ""}`}
          role="alert"
          aria-live="assertive"
        >
          <div className="team-finish-flash" />

          <p className="team-finish-eyebrow">Wild Cards</p>

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
        <KnockoutOverlay
          fighter={knockout}
          defeatedTeam={knockout.defeatedTeam}
          isFadingOut={isKnockoutFadingOut}
        />
      )}
      {(showRoundIntro || isIntroFadingOut) && (
        <RoundIntroOverlay
          roundNumber={roundNumber}
          opponentTeam={teams.opponent}
          playerTeam={teams.player}
          isFadingOut={isIntroFadingOut}
        />
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
          <section className="target-modal battle-pause-panel">
            <header className="battle-pause-header target-modal-header">
              <span>WILD CARDS · ROUND {roundNumber}</span>
              <h2>SELECT YOUR TARGETS</h2>
            </header>
            <p className="target-modal-instructions">
              Assign each available opponent to one teammate. Select an active target again to clear it.
            </p>

            {livingPlayers.map((player) => (
              <div className="target-choice-group" key={player.id}>
                <div className="target-player-heading">
                  {player.image && <img src={player.image} alt="" />}
                  <div>
                    <h3>{player.name}</h3>
                    <span>{player.isCpuTeammate ? "CPU ALLY" : "YOUR FIGHTER"}</span>
                  </div>
                  {roundTargets[player.id] && (
                    <button
                      type="button"
                      className="target-clear-button"
                      onClick={() => {
                        const target = teams.opponent.find((item) => item.id === roundTargets[player.id]);
                        if (target) selectRoundTarget(player.id, target.id);
                      }}
                    >
                      CLEAR ×
                    </button>
                  )}
                </div>
                <div className="target-opponent-grid">
                  {livingOpponents
                    .filter((opponent) => {
                      const assignedToAnotherPlayer = Object.entries(roundTargets).some(
                        ([assignedPlayer, assignedOpponent]) =>
                          assignedPlayer !== player.id && assignedOpponent === opponent.id,
                      );
                      return !assignedToAnotherPlayer;
                    })
                    .map((opponent) => {
                      const selected = roundTargets[player.id] === opponent.id;
                      const hp = Math.max(0, Math.floor(opponent.health));
                      const mp = Math.max(0, Math.floor(opponent.mana));
                      return (
                        <button
                          key={opponent.id}
                          type="button"
                          className={`target-choice-button ${selected ? "is-selected" : ""}`}
                          onClick={() => selectRoundTarget(player.id, opponent.id)}
                          aria-pressed={selected}
                        >
                          <span className="target-choice-art">
                            {opponent.image && <img src={opponent.image} alt="" />}
                            {selected && <b>✓ TARGET LOCKED</b>}
                          </span>
                          <span className="target-choice-copy">
                            <strong>{opponent.name}</strong>
                            <small>HP {hp}/{opponent.maximumHealth} · MP {mp}/{opponent.maximumMana}</small>
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>
            ))}

            <button
              type="button"
              className="confirm-target-button battle-pause-close"
              onClick={confirmPlayerTargets}
            >
              CONFIRM TARGETS <span>▶</span>
            </button>
            <p className="modal-message">{combatMessage}</p>
          </section>
        </div>
      )}

      {pendingHealSelection &&
        (() => {
          const healer = teams.player.find(
            (fighter) => fighter.id === pendingHealSelection.fighterId,
          );

          if (!healer) return null;

          const availableTeammates = teams.player.filter(
            (fighter) => fighter.id !== healer.id && fighter.health > 0,
          );

          const attack = healer.attacks[pendingHealSelection.attackIndex];

          return (
            <div className="target-modal-backdrop">
              <section className="target-modal">
                <p className="eyebrow">TEAM HEALING</p>

                <h2>Choose a teammate to heal</h2>

                <p>
                  {healer.name} is preparing <strong>{attack?.name}</strong>.
                  Select a living teammate to receive the healing.
                </p>

                {availableTeammates.length > 0 ? (
                  <div className="target-choice-group">
                    {availableTeammates.map((teammate) => (
                      <button
                        key={teammate.id}
                        type="button"
                        className="target-choice-button"
                        onClick={() => confirmHealTarget(teammate.id)}
                      >
                        {teammate.image && (
                          <img
                            src={teammate.image}
                            alt=""
                            className="heal-target-portrait"
                          />
                        )}

                        {teammate.name}
                        <span>
                          {Math.max(0, teammate.health)} /{" "}
                          {teammate.maximumHealth} HP
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p>No living teammates are available to heal.</p>
                )}

                <button
                  type="button"
                  className="confirm-target-button"
                  onClick={() => setPendingHealSelection(null)}
                >
                  Cancel
                </button>
              </section>
            </div>
          );
        })()}

      <section className="battlefield">
        {isStoryMode && (
          <div
            className="team-battle-story-background"
            style={{
              backgroundImage: `url("${storyBackgrounds[levelConfig.background] || storyBackgrounds.arena}")`,
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
                combatEffect={combatEffects[fighter.id]}
                onClick={() => {}}
              />
            ))}
          </div>
        </div>

        <div className="battle-center" aria-live="polite">
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
                combatEffect={combatEffects[fighter.id]}
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
                        getModifiedCharacterStat(target, "cooldown") <= 0 ||
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
                    (!pendingTarget || getModifiedCharacterStat(pendingTarget, "cooldown") <= 0)
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
              onAttack={handleTeamAttack}
              onFinishTurn={finishPlayerTurn}
            />
          ))}
      </section>
    </main>
  );
}
