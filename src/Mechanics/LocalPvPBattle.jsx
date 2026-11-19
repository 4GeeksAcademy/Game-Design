import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { roster } from "./Main Page/CharacterSelection.jsx";
import { getCharacterImage } from "./SkinManager.js";
import TeamAttackOptions from "./TeamAttackOptions.jsx";
import AttackOptions from "./AttackOptions.jsx";
import LocalPvPFighterPanel from "./LocalPvPFighterPanel.jsx";
import { aiChooseStunTargets } from "./AI.js";
import {
  attackCharacter,
  evadeAttack,
  applyHeal,
  consumeAttack,
  canUseAttack,
} from "./Health.js";
import {
  getModifiedAttackStat,
  getModifiedCharacterStat,
  tickSelfModifiers,
} from "./Modifiers.js";
import { regenerateMana, recoverCooldown, resetAttacks } from "./Turns.js";
import { loadKeybinds, normalizeKey } from "./Main Page/keybinds.js";
import { recordFestivalEvent } from "./Main Page/Festival/FestivalChallenges.js";
import { recordDailyObjectiveEvent } from "./Main Page/Festival/FestivalDailyObjectives.js";
import FestivalChallengePopup from "./Main Page/Festival/FestivalChallengePopup.jsx";
import "./Teambattle.css";
import "./LocalPvPBattle.css";

const TURN_SECONDS = 20;
const DEFENSE_SECONDS = 10;

function createFighter(id) {
  const selected = roster.find((entry) => entry.id === id);
  if (!selected?.data) return null;
  const data = selected.data;
  return {
    ...data,
    id: selected.id,
    image: getCharacterImage(selected.id, selected.image ?? data.image),
    health: data.health,
    maximumHealth: data.maximumHealth ?? data.health,
    mana: data.mana,
    maximumMana: data.maximumMana ?? data.mana,
    defense: typeof data.defense === "object" && data.defense
      ? { ...data.defense }
      : data.defense,
    activeModifiers: (data.activeModifiers ?? []).map((item) => ({ ...item })),
    attacks: (data.attacks ?? []).map((attack) => ({
      ...attack,
      remainingUses: Number.isInteger(attack.uses)
        ? (attack.remainingUses ?? attack.uses)
        : attack.remainingUses,
      cooldownRemaining: attack.cooldownRemaining ?? 0,
      cooldownStartedThisRound: false,
      state:
        (attack.remainingUses ?? attack.uses ?? 1) > 0 &&
        (attack.cooldownRemaining ?? 0) <= 0 &&
        (attack.stunned?.remainingRounds ?? 0) <= 0,
      buff: attack.buff ? { ...attack.buff } : attack.buff,
      debuff: attack.debuff ? { ...attack.debuff } : attack.debuff,
      heal: attack.heal ? {
        ...attack.heal,
        buff: attack.heal.buff ? { ...attack.heal.buff } : attack.heal.buff,
      } : attack.heal,
      activeEffects: (attack.activeEffects ?? []).map((effect) => ({
        ...effect,
        effects: { ...effect.effects },
      })),
    })),
    turnFinished: false,
    blocked: false,
  };
}

function cloneFighter(fighter) {
  return {
    ...fighter,
    defense: typeof fighter.defense === "object" && fighter.defense
      ? { ...fighter.defense }
      : fighter.defense,
    activeModifiers: (fighter.activeModifiers ?? []).map((item) => ({ ...item })),
    attacks: (fighter.attacks ?? []).map((attack) => ({
      ...attack,
      buff: attack.buff ? { ...attack.buff } : attack.buff,
      debuff: attack.debuff ? { ...attack.debuff } : attack.debuff,
      heal: attack.heal ? {
        ...attack.heal,
        buff: attack.heal.buff ? { ...attack.heal.buff } : attack.heal.buff,
      } : attack.heal,
      stunned: attack.stunned ? { ...attack.stunned } : attack.stunned,
      activeEffects: (attack.activeEffects ?? []).map((effect) => ({
        ...effect,
        effects: { ...effect.effects },
      })),
    })),
  };
}

export default function LocalPvPBattle() {
  const location = useLocation();
  const navigate = useNavigate();
  const config = location.state ?? {};
  const playerIds = config.playerTeamIds?.length
    ? config.playerTeamIds
    : [config.playerId].filter(Boolean);
  const opponentIds = config.opponentTeamIds?.length
    ? config.opponentTeamIds
    : [config.opponentId].filter(Boolean);
  const isTeamMatch = playerIds.length === 2 && opponentIds.length === 2;
  const [teams, setTeams] = useState(() => ({
    player: playerIds.map(createFighter),
    opponent: opponentIds.map(createFighter),
  }));
  const [activeSide, setActiveSide] = useState("player");
  const [phase, setPhase] = useState("fighting");
  const [round, setRound] = useState(1);
  const [turnTime, setTurnTime] = useState(TURN_SECONDS);
  const [defenseTime, setDefenseTime] = useState(DEFENSE_SECONDS);
  const [pendingAttack, setPendingAttack] = useState(null);
  const [combatLog, setCombatLog] = useState(["ROUND 1 — PLAYER 1'S TURN"]);
  const [targetIds, setTargetIds] = useState({});
  const [healTargetIds, setHealTargetIds] = useState({});
  const [showRoundIntro, setShowRoundIntro] = useState(true);
  const resolvedRef = useRef(false);
  const turnTimeRef = useRef(TURN_SECONDS);
  const defenseTimeRef = useRef(DEFENSE_SECONDS);

  const activeTeam = teams[activeSide];
  const defendingSide = activeSide === "player" ? "opponent" : "player";
  const opposingTeam = teams[defendingSide];
  const activeLiving = activeTeam.filter((fighter) => fighter && fighter.health > 0);
  const defendingLiving = opposingTeam.filter((fighter) => fighter && fighter.health > 0);
  const isFinal = phase === "victory" || phase === "defeat";

  const addLog = (message) => {
    setCombatLog((current) => [...current.slice(-7), message]);
  };

  useEffect(() => {
    if (showRoundIntro) {
      const timer = window.setTimeout(() => setShowRoundIntro(false), 1500);
      return () => window.clearTimeout(timer);
    }
  }, [showRoundIntro]);

  useEffect(() => {
    if (!playerIds.length || !opponentIds.length ||
        teams.player.some((fighter) => !fighter) ||
        teams.opponent.some((fighter) => !fighter)) {
      setPhase("error");
    }
  }, []);

  useEffect(() => {
    if (phase !== "fighting" || pendingAttack || isFinal) return;
    const timer = window.setInterval(() => {
      const remaining = turnTimeRef.current - 1;
      turnTimeRef.current = remaining;
      setTurnTime(Math.max(0, remaining));
      if (remaining <= 0) {
        window.clearInterval(timer);
        endTeamTurn(true);
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [phase, activeSide, pendingAttack, round]);

  useEffect(() => {
    if (phase !== "defending" || !pendingAttack) return;
    defenseTimeRef.current = DEFENSE_SECONDS;
    setDefenseTime(DEFENSE_SECONDS);
    const timer = window.setInterval(() => {
      const remaining = defenseTimeRef.current - 1;
      defenseTimeRef.current = remaining;
      setDefenseTime(Math.max(0, remaining));
      if (remaining <= 0) {
        window.clearInterval(timer);
        resolveAttack("take-damage");
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [phase, pendingAttack]);

  useEffect(() => {
    const handleKeys = (event) => {
      if (event.repeat || isFinal) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      ) return;
      const key = normalizeKey(event.key);
      const binds = loadKeybinds();
      if (phase === "defending" && pendingAttack) {
        const defenderIndex = teams[defendingSide].findIndex(
          (fighter) => fighter?.id === pendingAttack.targetId,
        );
        const playerKey = defendingSide === "player"
          ? (defenderIndex === 1 ? "player2" : "player1")
          : "player2";
        const defenseBinds = binds[playerKey];
        const defendingFighter = teams[defendingSide].find(
          (fighter) => fighter?.id === pendingAttack.targetId,
        );
        if (key === normalizeKey(defenseBinds.defend)) {
          if ((Number(defendingFighter?.cooldown) || 0) <= 0) return;
          event.preventDefault();
          resolveAttack("defend");
        } else if (key === normalizeKey(defenseBinds.evade)) {
          event.preventDefault();
          resolveAttack("evade");
        } else if (key === normalizeKey(defenseBinds.takeDamage)) {
          event.preventDefault();
          resolveAttack("take-damage");
        }
        return;
      }
      if (phase !== "fighting") return;
      if (!isTeamMatch) {
        const playerKey = activeSide === "player" ? "player1" : "player2";
        if (key === normalizeKey(binds[playerKey].finishTurn)) {
          event.preventDefault();
          const fighter = activeTeam.find((member) => member && member.health > 0);
          if (fighter) finishFighterTurn(fighter.id);
        }
        return;
      }
      const playerKey = activeSide === "player" ? "player1" : "player2";
      const playerBinds = binds[playerKey];
      const finishKey = normalizeKey(playerBinds.finishTurn);
      if (key === finishKey) {
        event.preventDefault();
        const nextFighter = activeTeam.find(
          (fighter) => fighter && fighter.health > 0 && !fighter.turnFinished,
        );
        if (nextFighter) finishFighterTurn(nextFighter.id);
        return;
      }
      const attackIndex = playerBinds.attacks.findIndex(
        (boundKey) => normalizeKey(boundKey) === key,
      );
      if (attackIndex >= 0) {
        const nextFighter = activeTeam.find(
          (fighter) => fighter && fighter.health > 0 && !fighter.turnFinished,
        );
        if (nextFighter) {
          event.preventDefault();
          startAttack(nextFighter.id, attackIndex);
        }
      }
    };
    window.addEventListener("keydown", handleKeys);
    return () => window.removeEventListener("keydown", handleKeys);
  }, [phase, pendingAttack, teams, activeSide, activeTeam, defendingSide, isFinal]);

  useEffect(() => {
    if (phase !== "fighting") return;
    const living = teams[activeSide].filter((fighter) => fighter?.health > 0);
    if (living.length && living.every((fighter) => fighter.turnFinished)) {
      endTeamTurn(false);
    }
  }, [teams, phase, activeSide]);

  useEffect(() => {
    if (isFinal) {
      recordFestivalEvent("battle", 1);
      recordDailyObjectiveEvent("battle", 1);
      if (phase === "victory") {
        recordFestivalEvent("victory", 1);
        recordDailyObjectiveEvent("victory", 1);
      }
    }
  }, [phase]);

  const finishFighterTurn = (fighterId) => {
    if (phase !== "fighting" || pendingAttack) return;
    setTeams((current) => ({
      ...current,
      [activeSide]: current[activeSide].map((fighter) =>
        fighter?.id === fighterId ? { ...fighter, turnFinished: true } : fighter,
      ),
    }));
    const fighter = activeTeam.find((member) => member?.id === fighterId);
    if (fighter) addLog(`${fighter.name} finished their turn.`);
  };

  const endTeamTurn = (timedOut) => {
    if (phase !== "fighting" || pendingAttack || isFinal) return;
    setTeams((current) => ({
      ...current,
      [activeSide]: current[activeSide].map((fighter) =>
        fighter && fighter.health > 0 ? { ...fighter, turnFinished: true } : fighter,
      ),
    }));
    addLog(timedOut
      ? `${activeSide === "player" ? "PLAYER 1" : "PLAYER 2"} ran out of time.`
      : `${activeSide === "player" ? "PLAYER 1" : "PLAYER 2"} ended their turn.`);
    const nextSide = activeSide === "player" ? "opponent" : "player";
    if (nextSide === "player") {
      setTeams((current) => {
        const next = { player: current.player.map(cloneFighter), opponent: current.opponent.map(cloneFighter) };
        [...next.player, ...next.opponent].forEach((fighter) => {
          if (!fighter || fighter.health <= 0) return;
          regenerateMana(fighter);
          recoverCooldown(fighter);
          tickSelfModifiers(fighter);
          fighter.turnFinished = false;
        });
        next.player = next.player.map((fighter) => fighter ? {
          ...fighter,
          attacks: resetAttacks(fighter.attacks, [...next.player, ...next.opponent]),
        } : fighter);
        next.opponent = next.opponent.map((fighter) => fighter ? {
          ...fighter,
          attacks: resetAttacks(fighter.attacks, [...next.player, ...next.opponent]),
        } : fighter);
        return next;
      });
      setRound((value) => value + 1);
      setShowRoundIntro(true);
      addLog(`ROUND ${round + 1} — PLAYER 1'S TURN`);
    } else {
      addLog("PLAYER 2'S TURN");
    }
    setActiveSide(nextSide);
    turnTimeRef.current = TURN_SECONDS;
    setTurnTime(TURN_SECONDS);
  };

  const chooseTarget = (fighterId, targetId) => {
    setTargetIds((current) => ({ ...current, [fighterId]: targetId }));
  };

  const startAttack = (fighterId, attackIndex, selectedAttackIds = []) => {
    if (phase !== "fighting" || pendingAttack) return;
    const attacker = teams[activeSide].find((fighter) => fighter?.id === fighterId);
    const attack = attacker?.attacks?.[attackIndex];
    if (!attacker || attacker.health <= 0 || attacker.turnFinished ||
        !attack || !canUseAttack(attack)) return;
    const attacksUsedThisRound = attacker.attacks.filter(
      (move) => move.state === false,
    ).length;
    if (round === 1 && attacksUsedThisRound >= 4) {
      addLog(`${attacker.name} has reached the 4-attack opening limit.`);
      return;
    }
    const cost = getModifiedAttackStat(attack, attacker, "cost");
    if (attacker.mana < cost) {
      addLog(`${attacker.name} does not have enough mana.`);
      return;
    }
    const modifiedDamage = getModifiedAttackStat(attack, attacker, "damage");
    if (attack.heal && modifiedDamage <= 0) {
      if (activeTeam.length === 1 && attack.heal.target !== "self") {
        addLog("This fighter has no teammate to receive that healing effect.");
        return;
      }
      setTeams((current) => {
        const next = {
          player: current.player.map(cloneFighter),
          opponent: current.opponent.map(cloneFighter),
        };
        const caster = next[activeSide].find((fighter) => fighter.id === fighterId);
        const otherLivingAlly = next[activeSide].find(
          (member) => member.id === healTargetIds[fighterId] && member.health > 0,
        ) ?? next[activeSide].find(
          (member) => member.id !== fighterId && member.health > 0,
        );
        const recipients = attack.heal.target === "all"
          ? next[activeSide].filter((fighter) => fighter.health > 0)
          : attack.heal.target === "selected"
            ? [otherLivingAlly].filter(Boolean)
            : [caster];
        if (!recipients.length) return current;
        caster.mana -= cost;
        recipients.forEach((recipient) => applyHeal(attack, recipient));
        consumeAttack(caster.attacks[attackIndex]);
        return next;
      });
      recordFestivalEvent("attack", 1);
      addLog(`${attacker.name} used ${attack.name}.`);
      return;
    }
    const selectedTarget = defendingLiving.some(
      (fighter) => fighter.id === targetIds[fighterId],
    ) ? targetIds[fighterId] : defendingLiving[0]?.id;
    const targetId = selectedTarget;
    const target = opposingTeam.find((fighter) => fighter?.id === targetId && fighter.health > 0);
    if (!target) {
      addLog("Choose a living opponent first.");
      return;
    }
    resolvedRef.current = false;
    setPendingAttack({
      attackerId: fighterId,
      targetId,
      attackIndex,
      attackName: attack.name,
      hasHeal: Boolean(attack.heal),
      selectedAttackIds,
    });
    setPhase("defending");
    addLog(`${attacker.name} used ${attack.name}. ${target.name}, defend!`);
  };

  const resolveAttack = (choice) => {
    if (phase !== "defending" || !pendingAttack || resolvedRef.current) return;
    resolvedRef.current = true;
    const attackerSide = activeSide;
    const defenderSide = attackerSide === "player" ? "opponent" : "player";
    const next = {
      player: teams.player.map(cloneFighter),
      opponent: teams.opponent.map(cloneFighter),
    };
    const attacker = next[attackerSide].find((fighter) => fighter.id === pendingAttack.attackerId);
    const defender = next[defenderSide].find((fighter) => fighter.id === pendingAttack.targetId);
    const attack = attacker?.attacks?.[pendingAttack.attackIndex];
    if (!attacker || !defender || !attack || !canUseAttack(attack) ||
        (choice === "defend" && (Number(defender.cooldown) || 0) <= 0)) {
      setPendingAttack(null);
      setPhase("fighting");
      return;
    }
    const allFighters = [...next.player, ...next.opponent];
    const selectedAttackIds = pendingAttack.selectedAttackIds?.length
      ? pendingAttack.selectedAttackIds
      : aiChooseStunTargets(defender, attack.stun);
    const stunOptions = { fighters: allFighters, selectedAttackIds };
    let result;
    if (choice === "defend") {
      const defense = getModifiedCharacterStat(defender, "defense");
      result = attackCharacter(attack, attacker, defender, defense, {
        blocked: true,
        ...stunOptions,
      });
      defender.cooldown = Math.max(0, (Number(defender.cooldown) || 0) - 1);
    } else if (choice === "evade") {
      result = evadeAttack(attack, attacker, defender, stunOptions);
    } else {
      result = attackCharacter(attack, attacker, defender, 0, {
        blocked: false,
        ...stunOptions,
      });
    }
    if (result) {
      if (attack.heal) {
        const livingAllies = next[attackerSide].filter(
          (fighter) => fighter.health > 0 && fighter.id !== attacker.id,
        );
        const selectedAlly = livingAllies.find(
          (fighter) => fighter.id === healTargetIds[attacker.id],
        ) ?? livingAllies[0];
        const recipients = attack.heal.target === "all"
          ? next[attackerSide].filter((fighter) => fighter.health > 0)
          : attack.heal.target === "selected"
            ? [selectedAlly].filter(Boolean)
            : [attacker];
        recipients.forEach((recipient) => applyHeal(attack, recipient));
      }
      setTeams(next);
      const damage = Math.max(0, result.damageReceived ?? 0);
      if (damage > 0 && attackerSide === "player") {
        recordFestivalEvent("damage", damage);
        recordDailyObjectiveEvent("damage", damage);
      }
      recordFestivalEvent("attack", 1);
      addLog(choice === "defend"
        ? `${defender.name} blocked ${attack.name}.`
        : choice === "evade"
          ? `${defender.name} ${result.evaded ? "evaded" : "failed to evade"} ${attack.name}.`
          : `${attack.name} dealt ${damage} damage.`);
      if (defender.health <= 0) addLog(`${defender.name} is K.O.!`);
    }
    setPendingAttack(null);
    const playerAlive = next.player.some((fighter) => fighter?.health > 0);
    const opponentAlive = next.opponent.some((fighter) => fighter?.health > 0);
    if (!playerAlive || !opponentAlive) {
      setPhase(playerAlive ? "victory" : "defeat");
      return;
    }
    setPhase("fighting");
  };

  const resetMatch = () => {
    setTeams({
      player: playerIds.map(createFighter),
      opponent: opponentIds.map(createFighter),
    });
    setActiveSide("player");
    setPhase("fighting");
    setRound(1);
    turnTimeRef.current = TURN_SECONDS;
    setTurnTime(TURN_SECONDS);
    setPendingAttack(null);
    setCombatLog(["ROUND 1 — PLAYER 1'S TURN"]);
    setShowRoundIntro(true);
  };

  if (phase === "error") {
    return <main className="local-pvp-screen"><h1>LOCAL MATCH COULD NOT START</h1><p>Return to character selection and choose fighters for both players.</p><button onClick={() => navigate("/character-select")}>BACK TO SELECTION</button></main>;
  }


  if (!isTeamMatch) {
    const playerOne = teams.player[0];
    const playerTwo = teams.opponent[0];
    const playerOneActive = activeSide === "player" && phase === "fighting";
    const playerTwoActive = activeSide === "opponent" && phase === "fighting";
    const noOp = () => {};
    const renderPlayerPane = (owner, rival, playerKey, isActive, sideClass) => (
      <section className={"local-pvp-player-screen " + sideClass + " " + (isActive ? "turn-active" : "turn-waiting")}>
        <header className="local-pvp-player-heading">
          <span>{playerKey === "player1" ? "PLAYER 1" : "PLAYER 2"}</span>
          <strong>{isActive ? "YOUR TURN" : "WAITING"}</strong>
          <b className={turnTime <= 5 && isActive ? "timer-danger" : ""}>{turnTime}s</b>
        </header>
        <div className="local-pvp-screen-fighters">
          <LocalPvPFighterPanel fighter={rival} side="opponent" />
          <LocalPvPFighterPanel fighter={owner} side="player" />
        </div>
        <div className="local-pvp-finish-row">
          <button id="finishTurnButton" disabled={!isActive || owner?.turnFinished || phase !== "fighting"} onClick={() => owner && finishFighterTurn(owner.id)}>
            <span>Finish</span><span>Turn</span><span id="finishTurnArrow">➜</span>
          </button>
        </div>
        <div className="local-pvp-existing-attacks">
          {owner && rival && (
            <AttackOptions
              character={owner}
              opponent={rival}
              setCharacter={noOp}
              setOpponent={noOp}
              setDamageDealt={noOp}
              setAttacksUsed={noOp}
              currentTurn="player"
              showCombatMessage={noOp}
              openingTurnActive={round === 1}
              localPvP
              playerKey={playerKey}
              canAttack={isActive && phase === "fighting" && !pendingAttack && !owner.turnFinished}
              onPvPAttack={(index, selectedIds) => startAttack(owner.id, index, selectedIds)}
            />
          )}
        </div>
        <section className="local-pvp-screen-log">
          <h3>📜 COMBAT LOG</h3>
          {combatLog.map((message, index) => <p key={index}>{message}</p>)}
        </section>
      </section>
    );

    return (
      <main className="local-pvp-screen local-pvp-1v1">
        <FestivalChallengePopup />
        <header className="local-pvp-header local-pvp-match-header">
          <button onClick={() => navigate("/character-select")}>← CHARACTER SELECT</button>
          <div><strong>ROUND {round}</strong><span>1 VS 1 LOCAL PVP</span></div>
          <div className="local-pvp-active-clock"><small>{activeSide === "player" ? "PLAYER 1 TURN" : "PLAYER 2 TURN"}</small><strong>{turnTime}s</strong></div>
        </header>
        <div className="local-pvp-split-screen">
          {renderPlayerPane(playerTwo, playerOne, "player2", playerTwoActive, "local-pvp-player-two")}
          <div className="local-pvp-split-divider"><span>VS</span></div>
          {renderPlayerPane(playerOne, playerTwo, "player1", playerOneActive, "local-pvp-player-one")}
        </div>
        {showRoundIntro && <div className="local-pvp-round-intro">ROUND {round}<span>PLAYER 1 VS PLAYER 2</span></div>}
        {phase === "defending" && pendingAttack && (
          <section className="local-pvp-defense" role="dialog" aria-live="assertive">
            <p>INCOMING ATTACK</p>
            <h2>{pendingAttack.attackName}</h2>
            <span>{teams[defendingSide].find((fighter) => fighter?.id === pendingAttack.targetId)?.name} — CHOOSE YOUR DEFENSE</span>
            <div className="local-pvp-defense-timer">{defenseTime}s</div>
            <div>
              <button onClick={() => resolveAttack("defend")} disabled={(Number(teams[defendingSide].find((fighter) => fighter?.id === pendingAttack.targetId)?.cooldown) || 0) <= 0}>DEFEND</button>
              <button onClick={() => resolveAttack("evade")}>EVADE</button>
              <button onClick={() => resolveAttack("take-damage")}>TAKE DAMAGE</button>
            </div>
          </section>
        )}
        {isFinal && <div className="local-pvp-result"><p>{phase === "victory" ? "PLAYER 1 WINS!" : "PLAYER 2 WINS!"}</p><button onClick={resetMatch}>REMATCH</button><button onClick={() => navigate("/")}>MAIN MENU</button></div>}
      </main>
    );
  }

  return (
    <main className="team-battle local-pvp-screen">
      <FestivalChallengePopup />
      <header className="local-pvp-header">
        <button onClick={() => navigate("/character-select")}>← CHARACTER SELECT</button>
        <div><strong>ROUND {round}</strong><span>{isTeamMatch ? "2 VS 2 LOCAL PVP" : "1 VS 1 LOCAL PVP"}</span></div>
        <div className={turnTime <= 5 ? "timer-danger" : ""}><small>{activeSide === "player" ? "PLAYER 1" : "PLAYER 2"} TURN</small><strong>{turnTime}s</strong></div>
      </header>

      {showRoundIntro && <div className="local-pvp-round-intro">ROUND {round}<span>PLAYER 1 VS PLAYER 2</span></div>}

      <div className="local-pvp-matchup">
        <section className="local-pvp-side local-pvp-player2">
          <h2>PLAYER 2 <span>TEAM</span></h2>
          {teams.opponent.map((fighter) => fighter && <FighterStatus key={fighter.id} fighter={fighter} />)}
        </section>
        <div className="local-pvp-vs">VS</div>
        <section className="local-pvp-side local-pvp-player1">
          <h2>PLAYER 1 <span>TEAM</span></h2>
          {teams.player.map((fighter) => fighter && <FighterStatus key={fighter.id} fighter={fighter} />)}
        </section>
      </div>

      <div className="local-pvp-targets">
        {activeTeam.filter((fighter) => fighter?.health > 0).map((fighter) => (
          <label key={fighter.id}>{fighter.name} TARGET
            <select value={defendingLiving.some((target) => target.id === targetIds[fighter.id]) ? targetIds[fighter.id] : (defendingLiving[0]?.id || "")} onChange={(event) => chooseTarget(fighter.id, event.target.value)}>
              {defendingLiving.map((target) => <option key={target.id} value={target.id}>{target.name}</option>)}
            </select>
          </label>
        ))}
      </div>

      {phase === "defending" && pendingAttack && (
        <section className="local-pvp-defense" role="dialog" aria-live="assertive">
          <p>INCOMING ATTACK</p>
          <h2>{pendingAttack.attackName}</h2>
          <span>{teams[defendingSide].find((fighter) => fighter?.id === pendingAttack.targetId)?.name} — CHOOSE YOUR DEFENSE</span>
          <div className="local-pvp-defense-timer">{defenseTime}s</div>
          <div>
            <button onClick={() => resolveAttack("defend")} disabled={(Number(teams[defendingSide].find((fighter) => fighter?.id === pendingAttack.targetId)?.cooldown) || 0) <= 0}>DEFEND</button>
            <button onClick={() => resolveAttack("evade")}>EVADE</button>
            <button onClick={() => resolveAttack("take-damage")}>TAKE DAMAGE</button>
          </div>
        </section>
      )}

      <section className="local-pvp-attacks">
        <div className="local-pvp-player2-panels">
          {activeSide === "opponent" && teams.opponent.map((fighter) => fighter && <TeamAttackOptions key={fighter.id} fighter={fighter} isActive phase={phase === "defending" ? "defending" : phase} onAttack={startAttack} onFinishTurn={finishFighterTurn} />)}
        </div>
        <div className="local-pvp-player1-panels">
          {activeSide === "player" && teams.player.map((fighter) => fighter && <TeamAttackOptions key={fighter.id} fighter={fighter} isActive phase={phase === "defending" ? "defending" : phase} onAttack={startAttack} onFinishTurn={finishFighterTurn} />)}
        </div>
      </section>

      <section className="local-pvp-log"><h3>COMBAT LOG</h3>{combatLog.map((message, index) => <p key={index}>{message}</p>)}</section>

      {isFinal && <div className="local-pvp-result"><p>{phase === "victory" ? "PLAYER 1 WINS!" : "PLAYER 2 WINS!"}</p><button onClick={resetMatch}>REMATCH</button><button onClick={() => navigate("/")}>MAIN MENU</button></div>}
    </main>
  );
}

function FighterStatus({ fighter }) {
  const hp = Math.max(0, fighter.health);
  const mp = Math.max(0, fighter.mana);
  return (
    <article className={`local-pvp-fighter ${hp <= 0 ? "is-ko" : ""}`}>
      {fighter.image && <img src={fighter.image} alt="" />}
      <div className="local-pvp-fighter-info">
        <strong>{fighter.name}</strong>
        <span>HP {hp}/{fighter.maximumHealth}</span>
        <div className="local-pvp-meter"><i style={{ width: `${Math.max(0, hp / fighter.maximumHealth * 100)}%` }} /></div>
        <span>MP {mp}/{fighter.maximumMana}</span>
        <div className="local-pvp-meter mana"><i style={{ width: `${Math.max(0, mp / fighter.maximumMana * 100)}%` }} /></div>
      </div>
    </article>
  );
}
