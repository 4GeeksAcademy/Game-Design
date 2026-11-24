import Opponent from "./Opponent.jsx";
import { getModifiedCharacterStat } from "./Modifiers.js";
import { roster } from "./Main Page/CharacterSelection.jsx";
import { getCharacterImage } from "./SkinManager.js";
import { useLocation, useNavigate } from "react-router-dom";
import { recordFestivalEvent } from "./Main Page/Festival/FestivalChallenges";
import { recordDailyObjectiveEvent } from "./Main Page/Festival/FestivalDailyObjectives";
import FestivalChallengePopup from "./Main Page/Festival/FestivalChallengePopup";
import Character from "./Character.jsx";
import AttackOptions from "./AttackOptions.jsx";
import BattleResultScreen from "./BattleResultScreen.jsx";
import { attackCharacter, evadeAttack } from "./Health.js";
import { turn } from "./Turns.js";
import { storyBackgrounds } from "./Main Page/Story/StoryBackgrounds.js";
import { getDamageThreat, getSpeedThreat } from "./AttackThreat.js";
import { aiDefendOrEvade, aiTurn, aiChooseStunTargets } from "./AI.js";
import { createNormalAIController } from "./AI_NormalDifficulty.js";
import { addCoins } from "./Currency.js";
import { getEquippedAttacks, getAttackDisplayName } from "./AttackLoadouts.js";
import StoryResultsScreen from "./Main Page/Story/StoryResultScreen.jsx";
import BattlePauseMenu from "./BattlePauseMenu.jsx";
import { loadKeybinds, normalizeKey } from "./Main Page/keybinds.js";
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";

function createBattleFighter(characterId, battleId) {
  const selected = roster.find((fighter) => fighter.id === characterId);
  if (!selected?.data) return null;

  const data = selected.data;
  // Every fighter must obey their saved, unlocked attack loadout.
// Previously only the human player used this filter, allowing the AI to
// access the character's entire attack list (including locked moves).
const sourceAttacks = getEquippedAttacks(selected.id, data.attacks ?? [], data.slot);
  const attacks = sourceAttacks.map((attack) => ({ ...attack, name: getAttackDisplayName(attack) })).map((attack) => {
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
            buff: attack.heal.buff ? { ...attack.heal.buff } : attack.heal.buff,
          }
        : attack.heal,
      activeEffects: (attack.activeEffects ?? []).map((effect) => ({
        ...effect,
        effects: { ...effect.effects },
      })),
    };
  });

  return {
    ...data,
    id: battleId,
    image: getCharacterImage(selected.id, selected.image ?? data.image),
    activeModifiers: (data.activeModifiers ?? []).map((modifier) => ({
      ...modifier,
    })),
    health: data.health,
    maximumHealth: data.maximumHealth ?? data.health,
    mana: data.mana,
    maximumMana: data.maximumMana ?? data.mana,
    manaRegen: data.manaRegen,
    defense:
      typeof data.defense === "object" && data.defense
        ? { ...data.defense }
        : data.defense,
    attacks,
    turnFinished: false,
    blocked: false,
  };
}

function cloneBattleAttackForPreview(attack) {
  return {
    ...attack,
    buff: attack.buff ? { ...attack.buff } : attack.buff,
    debuff: attack.debuff ? { ...attack.debuff } : attack.debuff,
    heal: attack.heal
      ? {
          ...attack.heal,
          buff: attack.heal.buff ? { ...attack.heal.buff } : attack.heal.buff,
        }
      : attack.heal,
    activeEffects: (attack.activeEffects ?? []).map((effect) => ({
      ...effect,
      effects: { ...effect.effects },
    })),
    stunned: attack.stunned ? { ...attack.stunned } : attack.stunned,
  };
}

function cloneBattleFighterForPreview(fighter) {
  return {
    ...fighter,
    defense:
      typeof fighter?.defense === "object" && fighter.defense
        ? { ...fighter.defense }
        : fighter?.defense,
    activeModifiers: (fighter?.activeModifiers ?? []).map((modifier) => ({
      ...modifier,
    })),
    attacks: (fighter?.attacks ?? []).map(cloneBattleAttackForPreview),
  };
}

function IncomingResourceBar({ label, value, maximum, kind, before }) {
  const safeMaximum = Math.max(1, Number(maximum) || 1);
  const safeValue = Math.max(0, Number(value) || 0);
  const percentage = Math.max(0, Math.min(100, (safeValue / safeMaximum) * 100));
  const difference =
    before === undefined ? null : safeValue - (Number(before) || 0);

  return (
    <div className={`incoming-resource incoming-resource-${kind}`}>
      <div className="incoming-resource-heading">
        <span>{label}</span>
        <strong>
          {safeValue}
          <small> / {safeMaximum}</small>
          {difference !== null && difference !== 0 && (
            <em className={difference < 0 ? "resource-loss" : "resource-gain"}>
              {difference > 0 ? "+" : ""}
              {difference}
            </em>
          )}
        </strong>
      </div>
      <div
        className="incoming-resource-track"
        role="img"
        aria-label={`${label}: ${safeValue} of ${safeMaximum}`}
      >
        <div
          className="incoming-resource-fill"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function getIncomingResourceSnapshot(fighter) {
  return {
    health: Math.max(0, Number(fighter?.health) || 0),
    maximumHealth: Math.max(1, Number(fighter?.maximumHealth) || Number(fighter?.health) || 1),
    cooldown: Math.max(0, Number(fighter?.cooldown) || 0),
    maximumCooldown: Math.max(
      1,
      Number(fighter?.maximumCooldown) || Number(fighter?.cooldown) || 1,
    ),
    mana: Math.max(0, Number(fighter?.mana) || 0),
    maximumMana: Math.max(1, Number(fighter?.maximumMana) || Number(fighter?.mana) || 1),
  };
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
      className={`battle-intro-healthbar health-${healthLevel}`}
      role="img"
      aria-label={`${health} of ${maximumHealth} health remaining`}
    >
      <div
        className="battle-intro-healthbar-fill"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const levelConfig = location.state ?? {};
  const isStoryMode = levelConfig.gameMode === "story";

  // Resolve both fighters directly from CharacterSelection's shared roster.
  const requestedPlayerId = location.state?.playerId;
  const playerId = roster.some((fighter) => fighter.id === requestedPlayerId)
    ? requestedPlayerId
    : "mina";

  const requestedOpponentId = location.state?.opponentId;
  const opponentId = roster.some((fighter) => fighter.id === requestedOpponentId)
    ? requestedOpponentId
    : playerId === "mina"
      ? "rockLee"
      : "mina";

  const [character, setCharacter] = useState(() =>
    createBattleFighter(playerId, "player"),
  );

  const [opponent, setOpponent] = useState(() =>
    createBattleFighter(opponentId, "opponent"),
  );

  const [damageDealt, setDamageDealt] = useState(0);
  const [combatDefense, setCombatDefense] = useState(0);
  const lastRewardedDamage = useRef(0);
  const rewardPaidRef = useRef(false);

  const aiControllerRef = useRef(null);
  const aiAttackHealthBeforeRef = useRef(null);

  useEffect(() => {
    const damageSinceLastUpdate = damageDealt - lastRewardedDamage.current;

    // Update the tracker before recording rewards.
    lastRewardedDamage.current = damageDealt;

    if (damageSinceLastUpdate > 0) {
      if (isStoryMode) addCoins(Math.floor(damageSinceLastUpdate));

      // Update Festival damage challenges.
      recordFestivalEvent("damage", damageSinceLastUpdate);
      recordDailyObjectiveEvent("damage", damageSinceLastUpdate);
    }
  }, [damageDealt, isStoryMode]);

  const [attacksUsed, setAttacksUsed] = useState(0);
  const lastRecordedAttacks = useRef(0);

  useEffect(() => {
    const newAttacks = attacksUsed - lastRecordedAttacks.current;

    lastRecordedAttacks.current = attacksUsed;

    if (newAttacks > 0) {
      recordFestivalEvent("attack", newAttacks);
    }
  }, [attacksUsed]);
  const [defenseTimeLeft, setDefenseTimeLeft] = useState(10);
  const [currentTurn, setCurrentTurn] = useState("intro");
  const [showIncomingAttack, setShowIncomingAttack] = useState(false);
  const [roundNumber, setRoundNumber] = useState(1);
  const [showRoundIntro, setShowRoundIntro] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  const [knockout, setKnockout] = useState(null);
  const [showResults, setShowResults] = useState(false);

  const [isRoundIntroFadingOut, setIsRoundIntroFadingOut] = useState(false);

  const [showFinishOverlay, setShowFinishOverlay] = useState(false);

  const [isFinishFadingOut, setIsFinishFadingOut] = useState(false);
  // Temporary popup queue and permanent combat history.
  const [combatMessages, setCombatMessages] = useState([]);
  const [combatLog, setCombatLog] = useState([]);
  const [aiAttack, setAiAttack] = useState(null);
  const [combatEffects, setCombatEffects] = useState({});

  const resetBattle = useCallback(() => {
    aiControllerRef.current?.stop();
    aiControllerRef.current = null;
    setCharacter(createBattleFighter(playerId, "player"));
    setOpponent(createBattleFighter(opponentId, "opponent"));
    setDamageDealt(0); setCombatDefense(0); setAttacksUsed(0);
    lastRewardedDamage.current = 0; lastRecordedAttacks.current = 0;
    rewardPaidRef.current = false;
    festivalBattleRecorded.current = false;
    setDefenseTimeLeft(10); setCurrentTurn("intro"); setShowIncomingAttack(false);
    setRoundNumber(1); setShowRoundIntro(true); setKnockout(null); setShowResults(false);
    setIsRoundIntroFadingOut(false); setShowFinishOverlay(false); setIsFinishFadingOut(false);
    setCombatMessages([]); setCombatLog([]); setAiAttack(null); setCombatEffects({}); setIsPaused(false);
  }, [playerId, opponentId]);

  useEffect(() => {
    if (isPaused || knockout) return undefined;
    const handlePauseKey = (event) => {
      if (event.key === "Escape" && !event.repeat) { event.preventDefault(); setIsPaused(true); }
    };
    window.addEventListener("keydown", handlePauseKey);
    return () => window.removeEventListener("keydown", handlePauseKey);
  }, [isPaused, knockout]);

  // Preview each response on cloned fighters so the card never mutates live combat state.
  const incomingAttackPreviews = useMemo(() => {
    if (!aiAttack) return null;

    const selectedAttackIds = aiChooseStunTargets(character, aiAttack.stun);
    const createPreview = (choice) => {
      const previewAttacker = cloneBattleFighterForPreview(opponent);
      const previewDefender = cloneBattleFighterForPreview(character);
      const stunOptions = {
        fighters: [previewAttacker, previewDefender],
        selectedAttackIds,
      };

      const result =
        choice === "defend"
          ? attackCharacter(
              cloneBattleAttackForPreview(aiAttack),
              previewAttacker,
              previewDefender,
              getModifiedCharacterStat(previewDefender, "defense"),
              { ...stunOptions, blocked: true },
            )
          : choice === "evade"
            ? evadeAttack(
                cloneBattleAttackForPreview(aiAttack),
                previewAttacker,
                previewDefender,
                stunOptions,
              )
            : attackCharacter(
                cloneBattleAttackForPreview(aiAttack),
                previewAttacker,
                previewDefender,
                0,
                { ...stunOptions, blocked: false },
              );

      if (!result) return null;

      // Match the extra cooldown reduction applied by the live block handler.
      if (choice === "defend") {
        result.defender.cooldown = Math.max(
          0,
          (result.defender.cooldown ?? 0) - 1,
        );
      }

      return getIncomingResourceSnapshot(result.defender);
    };

    return {
      current: getIncomingResourceSnapshot(character),
      defend: character.cooldown > 0 ? createPreview("defend") : null,
      evade: createPreview("evade"),
      takeDamage: createPreview("take-damage"),
    };
  }, [aiAttack, character, opponent]);

  const characterRef = useRef(character);
  const opponentRef = useRef(opponent);
  const knockoutRef = useRef(knockout);
  const festivalBattleRecorded = useRef(false);

  useEffect(() => {
    if (!knockout || festivalBattleRecorded.current) return;

    // Prevent the same match from being counted twice.
    festivalBattleRecorded.current = true;

    // Every completed match counts, including defeats.
    recordFestivalEvent("battle", 1);
    recordDailyObjectiveEvent("battle", 1);

    // Only victories count toward victory challenges.
    if (knockout.defeatedTeam === "opponent") {
      recordFestivalEvent("victory", 1);
      recordDailyObjectiveEvent("victory", 1);
    }
  }, [knockout]);

  useEffect(() => {
    characterRef.current = character;
    opponentRef.current = opponent;
    knockoutRef.current = knockout;
  }, [character, opponent, knockout]);

  // Display one queued message at a time.
  const firstMessageId = combatMessages[0]?.id;

  useEffect(() => {
    if (firstMessageId === undefined) return;

    const timer = setTimeout(() => {
      setCombatMessages((messages) => messages.slice(3));
    }, 2800);

    return () => clearTimeout(timer);
  }, [firstMessageId]);

  // Advance to the next round after both fighters finish.
  useEffect(() => {
    if (
      character.turnFinished &&
      opponent.turnFinished &&
      character.health > 0 &&
      opponent.health > 0 &&
      !knockout
    ) {
      turn(character, opponent);

      setCharacter({ ...character });
      setOpponent({ ...opponent });

      setRoundNumber((round) => round + 1);
      setShowRoundIntro(true);
      setCurrentTurn("intro");
    }
  }, [character, opponent, knockout]);

  // Show the individual K.O. cutscene, then the final results cards.
  useEffect(() => {
    if (!knockout) return;

    setShowFinishOverlay(false);
    setIsFinishFadingOut(false);
    setShowResults(false);

    // Let the individual K.O. cutscene play first.
    const finishTimer = setTimeout(() => {
      setShowFinishOverlay(true);
    }, 2600);

    // Fade the final cards out before showing the original result screen.
    const fadeTimer = setTimeout(() => {
      setIsFinishFadingOut(true);
    }, 5000);

    const resultsTimer = setTimeout(() => {
      setShowResults(true);
    }, 5600);

    return () => {
      clearTimeout(finishTimer);
      clearTimeout(fadeTimer);
      clearTimeout(resultsTimer);
    };
  }, [knockout]);

  // Detect a knockout only once and save the fighters for the animations.
  useEffect(() => {
    if (knockout) return;

    if (character.health <= 0) {
      setKnockout({
        defeated: character.name,
        winner: opponent.name,
        defeatedImage: character.image,
        winnerImage: opponent.image,
        winnerHealth: Math.max(0, opponent.health),
        winnerMaximumHealth: opponent.maximumHealth,
        defeatedTeam: "player",
      });
    } else if (opponent.health <= 0) {
      setKnockout({
        defeated: opponent.name,
        winner: character.name,
        defeatedImage: opponent.image,
        winnerImage: character.image,
        winnerHealth: Math.max(0, character.health),
        winnerMaximumHealth: character.maximumHealth,
        defeatedTeam: "opponent",
      });
    }
  }, [
    character.health,
    opponent.health,
    character.name,
    opponent.name,
    character.image,
    opponent.image,
    character.maximumHealth,
    opponent.maximumHealth,
    knockout,
  ]);

  useEffect(() => {
    if (knockout || character.health <= 0 || opponent.health <= 0) {
      aiControllerRef.current?.stop();
      aiControllerRef.current = null;
      setAiAttack(null);
    }
  }, [knockout, character.health, opponent.health]);

  useEffect(() => {
    if (
      currentTurn !== "ai" ||
      knockout ||
      character.health <= 0 ||
      opponent.health <= 0
    ) {
      return;
    }

    // Keep your existing AI-turn logic here.
  }, [currentTurn, knockout, character.health, opponent.health]);

  // Run the AI turn.
  useEffect(() => {
    if (currentTurn !== "ai" || isPaused) return;

    const difficulty = location.state?.difficulty ?? "Easy";

    if (difficulty === "Normal" || difficulty === "Hard") {
      const controller = createNormalAIController({
        getAI: () => opponentRef.current,
        getPlayer: () => characterRef.current,

        onShowAttack: (attack) => {
          if (attack) aiAttackHealthBeforeRef.current = characterRef.current?.health ?? 0;
          setAiAttack(attack);
        },

        onResolveAttack: (attack, currentAI, currentPlayer, result) => {
          const before = Number(aiAttackHealthBeforeRef.current ?? currentPlayer.health);
          const damage = Math.max(0, before - Math.max(0, Number(currentPlayer.health) || 0));
          const targetEffects = Object.entries(result?.debuffsApplied ?? {})
            .filter(([, amount]) => Number(amount) !== 0)
            .map(([stat, amount]) => ({ stat, kind: "debuff", label: `↓ ${stat.toUpperCase()} ${amount > 0 ? "+" : ""}${amount}` }));
          if (result?.stunnedAttacks?.length || attack.stun) targetEffects.push({ stat: "stun", kind: "debuff", label: "STUN APPLIED" });
          const selfEffects = Object.entries(result?.buffsApplied ?? {})
            .filter(([, amount]) => Number(amount) !== 0)
            .map(([stat, amount]) => ({ stat, kind: "buff", label: `↑ ${stat.toUpperCase()} ${amount > 0 ? "+" : ""}${amount}` }));

          if (damage > 0 || targetEffects.length) {
            triggerCombatEffect({
              target: "player",
              type: damage > 0 ? "damage" : "status",
              damage,
              tier: damage >= 70 ? "fatal" : damage >= 45 ? "heavy" : damage >= 20 ? "effective" : "light",
              message: result?.stunnedAttacks?.length || attack.stun ? "STUNNED!" : "",
              effects: targetEffects,
            });
          }
          triggerCombatEffect({
            target: "opponent",
            type: selfEffects.length || attack.heal ? "status" : "attack",
            damage: 0,
            tier: "light",
            message: attack.heal ? "RECOVERED!" : selfEffects.length ? "POWER UP!" : "",
            effects: selfEffects,
          });
          showCombatMessage(`${currentAI.name} used ${attack.name}!`, damage > 0 ? "hit" : targetEffects.length ? "debuff" : selfEffects.length || attack.heal ? "buff" : "attack");
          if (damage > 0) showCombatMessage(`${damage} DAMAGE DEALT!`, "hit");
          if (targetEffects.length) showCombatMessage(`${currentPlayer.name} was affected by ${attack.name}!`, "debuff");
          if (selfEffects.length || attack.heal) showCombatMessage(`${currentAI.name} gained a status effect!`, "buff");
          setOpponent({ ...currentAI });
          setCharacter({ ...currentPlayer });
        },

        onFinish: (currentAI, currentPlayer) => {
          if (!currentAI || !currentPlayer) return;

          setOpponent({
            ...currentAI,
            turnFinished: true,
          });

          setCharacter({ ...currentPlayer });
          setAiAttack(null);
        },
      });

      aiControllerRef.current = controller;
      controller.start();

      return () => {
        controller.stop();

        if (aiControllerRef.current === controller) {
          aiControllerRef.current = null;
        }
      };
    }

    // Easy AI uses the same visible defense window, but can advance
    // immediately when the player blocks or evades.
    const controller = aiTurn(opponent, character, (attack) => { aiAttackHealthBeforeRef.current = characterRef.current?.health ?? 0; setAiAttack(attack); }, () => {
      setOpponent({ ...opponent });
      setCharacter({ ...character });
      setAiAttack(null);
    }, 2, (attack, currentAI, currentPlayer, result) => {
      const before = Number(aiAttackHealthBeforeRef.current ?? currentPlayer.health);
      const damage = Math.max(0, before - Math.max(0, Number(currentPlayer.health) || 0));
      const targetEffects = Object.entries(result?.debuffsApplied ?? {})
        .filter(([, amount]) => Number(amount) !== 0)
        .map(([stat, amount]) => ({ stat, kind: "debuff", label: `↓ ${stat.toUpperCase()} ${amount > 0 ? "+" : ""}${amount}` }));
      if (result?.stunnedAttacks?.length || attack.stun) targetEffects.push({ stat: "stun", kind: "debuff", label: "STUN APPLIED" });
      const selfEffects = Object.entries(result?.buffsApplied ?? {})
        .filter(([, amount]) => Number(amount) !== 0)
        .map(([stat, amount]) => ({ stat, kind: "buff", label: `↑ ${stat.toUpperCase()} ${amount > 0 ? "+" : ""}${amount}` }));
      if (damage > 0 || targetEffects.length) {
        triggerCombatEffect({
          target: "player",
          type: damage > 0 ? "damage" : "status",
          damage,
          tier: damage >= 70 ? "fatal" : damage >= 45 ? "heavy" : damage >= 20 ? "effective" : "light",
          message: result?.stunnedAttacks?.length || attack.stun ? "STUNNED!" : "",
          effects: targetEffects,
        });
      }
      triggerCombatEffect({
        target: "opponent",
        type: selfEffects.length || attack.heal ? "status" : "attack",
        damage: 0,
        tier: "light",
        message: attack.heal ? "RECOVERED!" : selfEffects.length ? "POWER UP!" : "",
        effects: selfEffects,
      });
      showCombatMessage(`${currentAI.name} used ${attack.name}!`, damage > 0 ? "hit" : targetEffects.length ? "debuff" : selfEffects.length || attack.heal ? "buff" : "attack");
      if (damage > 0) showCombatMessage(`${damage} DAMAGE DEALT!`, "hit");
      if (targetEffects.length) showCombatMessage(`${currentPlayer.name} was affected by ${attack.name}!`, "debuff");
      if (selfEffects.length || attack.heal) showCombatMessage(`${currentAI.name} gained a status effect!`, "buff");
      setOpponent({ ...currentAI });
      setCharacter({ ...currentPlayer });
    });
    aiControllerRef.current = controller;

    return () => {
      controller.stop();
      if (aiControllerRef.current === controller) {
        aiControllerRef.current = null;
      }
    };
  }, [currentTurn, isPaused]);

  useEffect(() => {
    if (!isStoryMode && showResults && knockout && !rewardPaidRef.current) {
      rewardPaidRef.current = true;
      const multiplier = ({ Easy: 1, Normal: 2, Hard: 3 })[levelConfig.difficulty ?? "Easy"] ?? 1;
      addCoins(Math.floor((damageDealt + combatDefense) * multiplier));
    }
  }, [showResults, knockout, isStoryMode, levelConfig.difficulty, damageDealt, combatDefense]);

  // Display the round announcement before allowing combat.
  useEffect(() => {
    if (!showRoundIntro || isPaused) return;

    setIsRoundIntroFadingOut(false);

    // Begin fading after the intro has been visible.
    const fadeTimer = setTimeout(() => {
      setIsRoundIntroFadingOut(true);
    }, 1800);

    // Remove the overlay after its fade-out transition.
    const finishTimer = setTimeout(() => {
      setShowRoundIntro(false);
      setIsRoundIntroFadingOut(false);
      setCurrentTurn("player");
    }, 2400);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
    };
  }, [showRoundIntro, isPaused]);

  // Countdown for the player's defensive window.
  useEffect(() => {
    if (
      !aiAttack ||
      knockout ||
      character.health <= 0 ||
      opponent.health <= 0
    ) {
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
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [aiAttack, knockout, character.health, opponent.health, isPaused]);

  // Route a short-lived impact/status animation to the fighter actually affected.
  function triggerCombatEffect(effect) {
    const id = Date.now() + Math.random();
    setCombatEffects((current) => ({
      ...current,
      [effect.target]: { ...effect, id },
    }));
    setTimeout(() => {
      setCombatEffects((current) =>
        current[effect.target]?.id === id
          ? { ...current, [effect.target]: null }
          : current,
      );
    }, 2200);
  }

  // Add messages to the popup queue and permanent combat log.
  function showCombatMessage(text, type) {
    const message = {
      id: Date.now() + Math.random(),
      text,
      type,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    };

    // Queue popups so they appear one after another.
    setCombatMessages((messages) => [...messages, message]);

    // Save every message immediately in the combat log.
    setCombatLog((log) => [...log, message]);
  }

  const resolveIncomingAttack = useCallback(
    (choice) => {
      if (isPaused || !aiAttack || defenseTimeLeft <= 0) return;

      if (choice === "defend" && getModifiedCharacterStat(character, "cooldown") <= 0) return;

      const selectedAttackIds = aiChooseStunTargets(
  character,
  aiAttack.stun,
);

const stunOptions = {
  fighters: [opponent, character],
  selectedAttackIds,
};

      const result =
        choice === "defend"
          ? attackCharacter(
              aiAttack,
              opponent,
              character,
              getModifiedCharacterStat(character, "defense"),
              {
                ...stunOptions,
                blocked: true,
              },
            )
          : choice === "evade"
            ? evadeAttack(aiAttack, opponent, character, stunOptions)
            : attackCharacter(aiAttack, opponent, character, 0, {
                ...stunOptions,
                blocked: false,
              });

      if (!result) return;
      // Record successful defensive actions for Festival challenges.
      if (choice === "defend") {
        setCombatDefense((value) => value + 1);
        recordFestivalEvent("block", 1);
        recordDailyObjectiveEvent("defense", 1);
      } else if (choice === "evade" && result.evaded) {
        setCombatDefense((value) => value + 1);
        recordFestivalEvent("evade", 1);
        recordDailyObjectiveEvent("defense", 1);
      }

     if (choice === "defend" || choice === "evade") {
  if (choice === "defend") {
    result.defender.cooldown = Math.max(
      0,
      (result.defender.cooldown ?? 0) - 1,
    );
  }

  result.defender.blocked = true;
}

      setOpponent({ ...result.attacker });
      setCharacter({ ...result.defender });
      const incomingDamage = Math.max(
        0,
        Math.max(0, Number(character.health) || 0) -
          Math.max(0, Number(result.defender?.health) || 0),
      );
      triggerCombatEffect({
        target: "opponent",
        type: "attack",
        damage: 0,
        tier: "light",
        message: "",
        effects: [],
      });
      triggerCombatEffect({
        target: "player",
        type: choice === "defend" ? "blocked" : choice === "evade" && result.evaded ? "evaded" : incomingDamage > 0 ? "damage" : "status",
        damage: incomingDamage,
        tier: incomingDamage >= 70 ? "fatal" : incomingDamage >= 45 ? "heavy" : incomingDamage >= 20 ? "effective" : "light",
        message: choice === "defend" ? "BLOCKED!" : choice === "evade" && result.evaded ? "EVADED!" : "",
        effects: [],
      });

      if (choice === "defend") {
        showCombatMessage("🛡️ BLOCKED!", "blocked");
      } else if (choice === "evade") {
        showCombatMessage(
          result.evaded ? "💨 EVADED!" : "💥 FAILED TO EVADE!",
          result.evaded ? "evaded" : "hit",
        );
      } else {
        showCombatMessage(
          `${character.name} took ${result.damageReceived ?? aiAttack.damage} full damage!`,
          "hit",
        );
      }

      if (aiControllerRef.current) {
        aiControllerRef.current.respondToDefense();
      } else {
        setAiAttack(null);
      }
    },
    [aiAttack, defenseTimeLeft, character, opponent, showCombatMessage],
  );

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!aiAttack || defenseTimeLeft <= 0) return;

      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      ) {
        return;
      }

      const key = normalizeKey(event.key);
      const binds = loadKeybinds().player1;

      let choice = null;

      if (key === normalizeKey(binds.defend)) {
        choice = "defend";
      } else if (key === normalizeKey(binds.evade)) {
        choice = "evade";
      } else if (key === normalizeKey(binds.takeDamage)) {
        choice = "take-damage";
      }

      if (!choice) return;

      // Don't consume the defend key when defending is unavailable.
      if (choice === "defend" && getModifiedCharacterStat(character, "cooldown") <= 0) return;

      event.preventDefault();
      resolveIncomingAttack(choice);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [aiAttack, defenseTimeLeft, character.cooldown, resolveIncomingAttack, isPaused]);

  useEffect(() => {
    if (!aiAttack) {
      setShowIncomingAttack(false);
      return;
    }

    const timer = setTimeout(() => {
      setShowIncomingAttack(true);
    }, 500);

    return () => clearTimeout(timer);
  }, [aiAttack]);

  return (
    <div className="container-fluid mt-3" id="gameContainer">
      <FestivalChallengePopup />
      {combatMessages.length > 0 && (
        <div id="combatPopupContainer" aria-live="polite">
          {combatMessages.slice(0, 3).map((entry, index) => (
            <div key={entry.id} className={`combat-popup ${entry.type}`} style={{ animationDelay: `${index * 0.15}s` }}>
              {entry.text}
            </div>
          ))}
        </div>
      )}
      {!knockout && <button type="button" className="battle-pause-trigger" onClick={() => setIsPaused(true)} aria-label="Pause match"><span className="battle-pause-icon">Ⅱ</span><span>PAUSE</span></button>}
      {isPaused && <BattlePauseMenu onResume={() => setIsPaused(false)} onRestart={resetBattle} onCharacterSelect={() => navigate("/character-select", { state: location.state })} onMainMenu={() => navigate("/")} />}
      {/* Full-screen round intro with both fighters and their health. */}
      {showRoundIntro && !knockout && (
        <div
          id="roundIntroOverlay"
          className={isRoundIntroFadingOut ? "is-fading-out" : ""}
          role="status"
          aria-live="polite"
        >
          <div id="roundIntroContent" className="battle-intro-enhanced">
            <span id="roundIntroEyebrow">Wild Cards</span>

            <h1 key={roundNumber}>ROUND {roundNumber}</h1>

            <div className="battle-intro-matchup">
              <div className="battle-intro-fighter battle-intro-opponent">
                <span className="battle-intro-label">CPU OPPONENT</span>

                {opponent.image && (
                  <img src={opponent.image} alt={opponent.name} />
                )}

                <strong>{opponent.name}</strong>

                <RoundIntroHealthBar fighter={opponent} />

                <span className="battle-intro-hp">
                  HP {Math.max(0, opponent.health)} / {opponent.maximumHealth}
                </span>
              </div>

              <div className="battle-intro-vs">VS</div>

              <div className="battle-intro-fighter battle-intro-player">
                <span className="battle-intro-label">PLAYER</span>

                {character.image && (
                  <img src={character.image} alt={character.name} />
                )}

                <strong>{character.name}</strong>

                <RoundIntroHealthBar fighter={character} />

                <span className="battle-intro-hp">
                  HP {Math.max(0, character.health)} / {character.maximumHealth}
                </span>
              </div>
            </div>

            <div id="roundIntroLine" />

            <p>GET READY</p>
          </div>
        </div>
      )}

      {/* Individual K.O. cutscene. */}
      {knockout && !showFinishOverlay && !showResults && (
        <div
          className={`battle-ko-overlay ko-${knockout.defeatedTeam} ${
            isFinishFadingOut ? "is-fading-out" : ""
          }`}
          role="alert"
          aria-live="assertive"
        >
          <div className="battle-ko-flash" />

          <div className="battle-ko-content">
            <p className="battle-ko-eyebrow">FIGHTER DEFEATED</p>

            {knockout.defeatedImage && (
              <img
                className="battle-ko-portrait"
                src={knockout.defeatedImage}
                alt={knockout.defeated}
              />
            )}

            <h1 className="battle-ko-title">K.O.!</h1>

            <p className="battle-ko-name">{knockout.defeated}</p>

            <p className="battle-ko-subtitle">
              {knockout.defeatedTeam === "opponent"
                ? "OPPONENT DOWN"
                : "PLAYER DOWN"}
            </p>
          </div>
        </div>
      )}

      {/* Final winner-versus-defeated cards. */}
      {knockout && showFinishOverlay && !showResults && (
        <div
          className={`battle-finish-overlay ${
            knockout.defeatedTeam === "player"
              ? "finish-defeat"
              : "finish-victory"
          } ${isFinishFadingOut ? "is-fading-out" : ""}`}
          role="alert"
          aria-live="assertive"
        >
          <div className="battle-finish-flash" />

          <p className="battle-finish-eyebrow">Wild Cards</p>

          <h1 className="battle-finish-title">
            {knockout.defeatedTeam === "player" ? "DEFEAT" : "VICTORY"}
          </h1>

          <p className="battle-finish-message">
            {knockout.winner} WINS THE MATCH
          </p>

          <div className="battle-finish-versus">
            <div className="battle-finish-side defeated-side">
              <h2>DEFEATED</h2>

              <div className="battle-finish-card">
                {knockout.defeatedImage && (
                  <img src={knockout.defeatedImage} alt="" />
                )}

                <strong>{knockout.defeated}</strong>
                <span>K.O.</span>
              </div>
            </div>

            <div className="battle-finish-vs">VS</div>

            <div className="battle-finish-side winning-side">
              <h2>WINNER</h2>

              <div className="battle-finish-card">
                {knockout.winnerImage && (
                  <img src={knockout.winnerImage} alt="" />
                )}

                <strong>{knockout.winner}</strong>
                <span>{knockout.winnerHealth} HP</span>
              </div>
            </div>
          </div>

          <p className="battle-finish-footer">MATCH COMPLETE</p>
        </div>
      )}

      {isStoryMode && knockout && showResults ? (
        <StoryResultsScreen
          won={knockout.defeatedTeam === "opponent"}
          onRematch={resetBattle}
          playerName={character.name}
          opponentName={opponent.name}
          damageDealt={damageDealt}
          attacksUsed={attacksUsed}
          levelConfig={levelConfig}
        />
      ) : !isStoryMode && knockout && showResults ? (
        <BattleResultScreen
          won={knockout.defeatedTeam === "opponent"}
          defeated={knockout.defeatedTeam === "player" ? character : opponent}
          winner={knockout.defeatedTeam === "player" ? opponent : character}
          damageDealt={damageDealt}
          combatDefense={combatDefense}
          attacksUsed={attacksUsed}
          difficulty={levelConfig.difficulty ?? "Easy"}
          onRematch={resetBattle}
        />
      ) : knockout ? null : (
        <>
          {/* Horizontal arcade HUD matching the 2v2 battle foundation. */}
          <div id="battleLayout">
            <header className="solo-battle-header">
              <div className="solo-team-label solo-opponent-label">CPU OPPONENT</div>
              <h1>WILD CARDS <span>ROUND {roundNumber}</span></h1>
              <div className="solo-team-label solo-player-label">PLAYER</div>
            </header>
            {/* Opponent's attack and defensive choices. */}
            {aiAttack && showIncomingAttack && (
              <div
                id="aiAttackSection"
                className="incoming-attack-card"
                key={aiAttack.id ?? aiAttack.name}
              >
                {/*
      The key helps React remount the card when the attack changes.
      This retriggers its entrance animation for queued attacks.
    */}
                <div id="aiAttackCard">
                  <div id="aiAttackHeader">
                    <span>⚠ INCOMING ATTACK</span>
                    <span className="attack-warning-dot" />
                  </div>

                  <div
                    id="defenseTimer"
                    className={
                      defenseTimeLeft <= 3
                        ? "timer-critical"
                        : defenseTimeLeft <= 5
                          ? "timer-warning"
                          : ""
                    }
                  >
                    <div id="defenseTimerText">
                      <span>DEFENSE WINDOW</span>
                      <strong>{defenseTimeLeft}s</strong>
                    </div>

                    <div id="defenseTimerTrack">
                      <div
                        id="defenseTimerFill"
                        style={{ width: `${defenseTimeLeft * 10}%` }}
                      />
                    </div>
                  </div>

                  <div id="aiAttackInfo">
                    <h5 id="aiAttackName">{aiAttack.name}</h5>
                    {aiAttack.image && (
                      <div className="incoming-attack-image">
                        <img src={aiAttack.image} alt={aiAttack.name} />
                      </div>
                    )}
                    <div id="aiAttackStats">
                      {/* Damage threat */}
                      <div
                        className={`attack-threat-badge ${
                          getDamageThreat(aiAttack.damage).className
                        }`}
                      >
                        <span className="threat-label">DAMAGE</span>

                        <strong>{aiAttack.damage}</strong>

                        <span className="threat-rating">
                          {getDamageThreat(aiAttack.damage).label}
                        </span>
                      </div>

                      {/* Speed threat */}
                      <div
                        className={`attack-threat-badge ${
                          getSpeedThreat(aiAttack.speed).className
                        }`}
                      >
                        <span className="threat-label">SPEED</span>

                        <strong>{aiAttack.speed}</strong>

                        <span className="threat-rating">
                          {getSpeedThreat(aiAttack.speed).label}
                        </span>
                      </div>

                      {/* Mana cost */}
                      <div className="attack-cost-badge">
                        <span className="threat-label">MANA COST</span>

                        <strong>◆ {aiAttack.cost}</strong>
                      </div>
                    </div>
                  </div>

                  <section className="incoming-player-status" aria-label="Your current health and mana">
                    <div className="incoming-resource-line">
                      <div className="incoming-status-heading">
                        <span>HEALTH</span>
                        <strong>{Math.max(0, character.health)} / {character.maximumHealth}</strong>
                      </div>
                      <div className="incoming-health-track">
                        <div
                          className="incoming-health-fill"
                          style={{
                            width: `${Math.max(0, Math.min(100, (character.health / Math.max(1, character.maximumHealth)) * 100))}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="incoming-resource-line">
                      <div className="incoming-status-heading incoming-mana-heading">
                        <span>MANA</span>
                        <strong>{Math.max(0, character.mana)} / {character.maximumMana}</strong>
                      </div>
                      <div className="incoming-health-track incoming-mana-track">
                        <div
                          className="incoming-mana-fill"
                          style={{
                            width: `${Math.max(0, Math.min(100, (character.mana / Math.max(1, character.maximumMana)) * 100))}%`,
                          }}
                        />
                      </div>
                    </div>
                  </section>

                  <div id="defensiveActions">
                    <button
                      id="defendButton"
                      disabled={character.cooldown <= 0 || defenseTimeLeft <= 0}
                      onClick={() => resolveIncomingAttack("defend")}
                    >
                      <span id="defendButtonIcon">🛡</span>
                      <span>DEFEND</span>
                    </button>

                    <button
                      id="evadeButton"
                      disabled={defenseTimeLeft <= 0}
                      onClick={() => resolveIncomingAttack("evade")}
                    >
                      <span id="evadeButtonIcon">💨</span>
                      <span>EVADE</span>
                    </button>

                    <button
                      id="takeDamageButton"
                      type="button"
                      disabled={!aiAttack || defenseTimeLeft <= 0}
                      onClick={() => resolveIncomingAttack("take-damage")}
                    >
                      <span>💥</span>
                      <span>TAKE FULL DAMAGE</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
            <div id="battleArena">
              {/* Story background behind both fighters. */}
              {isStoryMode && (
                <div
                  className="story-battle-background"
                  style={{
                    backgroundImage: `url("${storyBackgrounds[levelConfig.background] || storyBackgrounds.arena}")`,
                  }}
                  aria-hidden="true"
                />
              )}

              <Opponent
                opponent={opponent}
                setOpponent={setOpponent}
                combatEffect={combatEffects.opponent}
                isAttacking={Boolean(aiAttack)}
              />

              <Character
                character={character}
                setCharacter={setCharacter}
                currentTurn={currentTurn}
                combatEffect={combatEffects.player}
                setCurrentTurn={setCurrentTurn}
                showFinishTurnButton={false}
              />
            </div>

            {/* Bottom-left combat log, paired with the attack panel. */}
            <div id="combatLog">
              <div id="combatLogHeader">
                <h4>📜 Combat Log</h4>
                <span>{combatLog.length} events</span>
              </div>

              <div id="combatLogEntries">
                {combatLog.length === 0 ? (
                  <p id="emptyCombatLog">Waiting for combat...</p>
                ) : (
                  [...combatLog].reverse().map((message) => (
                    <div
                      className={`combat-log-entry ${message.type}`}
                      key={message.id}
                    >
                      <span className="combat-log-time">{message.time}</span>

                      <span className="combat-log-text">{message.text}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div id="battleAttackPanel">
            <AttackOptions
              character={character}
              opponent={opponent}
              setCharacter={setCharacter}
              setOpponent={setOpponent}
              setDamageDealt={setDamageDealt}
              setAttacksUsed={setAttacksUsed}
              currentTurn={currentTurn}
              showCombatMessage={showCombatMessage}
              openingTurnActive={roundNumber === 1}
              difficulty={location.state?.difficulty ?? "Easy"}
              onCombatEffect={triggerCombatEffect}
            />
              <button
                type="button"
                className="solo-finish-turn-button"
                disabled={currentTurn !== "player"}
                onClick={() => {
                  setCharacter({ ...character, turnFinished: true });
                  setCurrentTurn("ai");
                }}
              >
                FINISH TURN <span aria-hidden="true">➜</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
