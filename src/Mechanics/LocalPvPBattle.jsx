import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { roster } from "./Main Page/CharacterSelection.jsx";
import { getCharacterImage } from "./SkinManager.js";
import { getEquippedAttacks, getAttackDisplayName } from "./AttackLoadouts.js";
import TeamAttackOptions from "./TeamAttackOptions.jsx";
import AttackOptions from "./AttackOptions.jsx";
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
import { getDamageThreat, getSpeedThreat } from "./AttackThreat.js";
import "./LocalPvPBattle.css";

const TURN_SECONDS = 20;
const DEFENSE_SECONDS = 10;

function createFighter(id, applyLoadout = true) {
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
    attacks: (applyLoadout ? getEquippedAttacks(selected.id, data.attacks ?? [], data.slot) : (data.attacks ?? [])).map((attack) => ({ ...attack, name: getAttackDisplayName(attack) })).map((attack) => ({
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
    player: playerIds.map((id) => createFighter(id, true)),
    opponent: opponentIds.map((id) => createFighter(id, true)),
  }));
  const [activeSide, setActiveSide] = useState("player");
  const [phase, setPhase] = useState("fighting");
  const [round, setRound] = useState(1);
  const [turnTime, setTurnTime] = useState(TURN_SECONDS);
  const [defenseTime, setDefenseTime] = useState(DEFENSE_SECONDS);
  const [pendingAttack, setPendingAttack] = useState(null);
  const [attackQueue, setAttackQueue] = useState([]);
  const [attackPhaseComplete, setAttackPhaseComplete] = useState(false);
  const [combatLog, setCombatLog] = useState(["ROUND 1 — PLAYER 1'S TURN"]);
  const [targetIds, setTargetIds] = useState({});
  const [healTargetIds, setHealTargetIds] = useState({});
  const [showRoundIntro, setShowRoundIntro] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const resolvedRef = useRef(false);
  const attackQueueRef = useRef([]);
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
    if (phase !== "fighting" || attackPhaseComplete || isFinal || isPaused) return;
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
  }, [phase, activeSide, attackPhaseComplete, round, isPaused]);

  useEffect(() => {
    if (phase !== "defending" || !pendingAttack || isPaused) return;
    setDefenseTime(defenseTimeRef.current);
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
  }, [phase, pendingAttack, isPaused]);

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
      if (key === "escape") { event.preventDefault(); setIsPaused((value) => !value); return; }
      if (isPaused) return;
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
          if ((!defendingFighter || getModifiedCharacterStat(defendingFighter, "cooldown") <= 0)) return;
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
      if (phase !== "fighting" || attackPhaseComplete) return;
      const renderDefensePrompt = (fighter) => {
    if (phase !== "defending" || !pendingAttack || fighter?.id !== pendingAttack.targetId) return null;
    const canDefend = getModifiedCharacterStat(fighter, "cooldown") > 0;
    return (
      <div className="local-pvp-defense-anchor" role="dialog" aria-live="assertive">
        <div className="local-pvp-defense-top"><span>⚠ INCOMING ATTACK</span><strong>{defenseTime}s</strong></div>
        <h3>{pendingAttack.attackName}</h3>
        {pendingAttack.attackImage && <img src={pendingAttack.attackImage} alt={pendingAttack.attackName} />}
        <p>{pendingAttack.damage} DAMAGE · {pendingAttack.speed} SPEED</p>
        <div className="local-pvp-defense-actions">
          <button disabled={!canDefend} onClick={() => resolveAttack("defend")}>🛡 BLOCK</button>
          <button onClick={() => resolveAttack("evade")}>💨 EVADE</button>
          <button onClick={() => resolveAttack("take-damage")}>💥 TAKE DAMAGE</button>
        </div>
      </div>
    );
  };

  const renderSide = (side, label) => (
    <section className={`local-pvp-team-side local-pvp-${side}`}>
      <header><span>{label}</span><strong>{side === activeSide && phase === "fighting" && !attackPhaseComplete ? "ATTACK PHASE" : side === defendingSide && phase === "defending" ? "DEFENDING" : "READY"}</strong></header>
      <div className="local-pvp-team-fighters">
        {teams[side].map((fighter) => fighter && (
          <article key={fighter.id} className={`local-pvp-combatant ${fighter.health <= 0 ? "is-ko" : ""} ${fighter.id === pendingAttack?.targetId && phase === "defending" ? "is-targeted" : ""}`}>
            <div className="local-pvp-combatant-image">
              <img src={fighter.image} alt={fighter.name} />
              {fighter.health <= 0 && <span className="local-pvp-ko-label">K.O.</span>}
            </div>
            <div className="local-pvp-combatant-data">
              <h3>{fighter.name}</h3>
              <div className="local-pvp-resource-label"><span>HP</span><b>{Math.max(0, fighter.health)}/{fighter.maximumHealth}</b></div>
              <div className="local-pvp-resource-track"><i className="hp" style={{width: `${Math.max(0, fighter.health / fighter.maximumHealth * 100)}%`}} /></div>
              <div className="local-pvp-resource-label"><span>MP</span><b>{Math.max(0, fighter.mana)}/{fighter.maximumMana}</b></div>
              <div className="local-pvp-resource-track"><i className="mp" style={{width: `${Math.max(0, fighter.mana / fighter.maximumMana * 100)}%`}} /></div>
              {side === activeSide && phase === "fighting" && !attackPhaseComplete && fighter.health > 0 && (
                <button className="local-pvp-finish-button" disabled={fighter.turnFinished} onClick={() => finishFighterTurn(fighter.id)}>{fighter.turnFinished ? "ACTION COMPLETE" : "FINISH ATTACKS"}</button>
              )}
            </div>
            {renderDefensePrompt(fighter)}
          </article>
        ))}
      </div>
    </section>
  );

  const renderAttackCenter = () => {
    if (phase !== "fighting" || attackPhaseComplete || isPaused) return null;
    const fighters = activeTeam.filter((fighter) => fighter && fighter.health > 0 && !fighter.turnFinished);
    return (
      <section className="local-pvp-attack-center">
        <div className="local-pvp-center-heading">
          <span>PLAYER {activeSide === "player" ? "1" : "2"} CONTROL</span>
          <h2>CHOOSE YOUR ATTACK</h2>
          <p>{turnTime}s TO QUEUE · MULTIPLE ATTACKS ALLOWED</p>
        </div>
        {isTeamMatch ? (
          <div className="local-pvp-attack-panels">
            {fighters.map((fighter) => (
              <div className="local-pvp-attack-panel-wrap" key={fighter.id}>
                <TeamAttackOptions fighter={fighter} isActive phase="fighting" onAttack={startAttack} onFinishTurn={finishFighterTurn} />
              </div>
            ))}
          </div>
        ) : (
          fighters.map((fighter) => {
            const rival = teams[defendingSide][0];
            return <AttackOptions key={fighter.id} character={fighter} opponent={rival} setCharacter={() => {}} setOpponent={() => {}} setDamageDealt={() => {}} setAttacksUsed={() => {}} currentTurn="player" showCombatMessage={() => {}} openingTurnActive={round === 1} localPvP playerKey={activeSide === "player" ? "player1" : "player2"} canAttack onPvPAttack={(index, selectedIds) => startAttack(fighter.id, index, selectedIds)} />;
          })
        )}
      </section>
    );
  };

  return (
    <main className="local-pvp-screen">
      <FestivalChallengePopup />
      <header className="local-pvp-header">
        <button className="local-pvp-nav-button" onClick={() => setIsPaused(true)}>Ⅱ PAUSE</button>
        <div className="local-pvp-match-title"><strong>ROUND {round}</strong><span>{isTeamMatch ? "2 VS 2 LOCAL BATTLE" : "1 VS 1 LOCAL BATTLE"}</span></div>
        <div className={`local-pvp-clock ${turnTime <= 5 ? "timer-danger" : ""}`}><small>PLAYER {activeSide === "player" ? "1" : "2"} ATTACK PHASE</small><strong>{attackPhaseComplete ? "DEFENSE" : `${turnTime}s`}</strong></div>
      </header>

      <div className="local-pvp-battlefield">
        {renderSide("player", "PLAYER 1")}
        <div className="local-pvp-center-column">
          <div className="local-pvp-versus-mark">VS</div>
          {renderAttackCenter()}
          <div className="local-pvp-queue-status">
            <strong>{attackQueue.length}</strong>
            <span>{attackQueue.length === 1 ? "ATTACK QUEUED" : "ATTACKS QUEUED"}</span>
            {phase === "fighting" && !attackPhaseComplete && <button onClick={() => endTeamTurn(false)}>END ATTACK PHASE</button>}
            {phase === "defending" && <small>RESOLVE EVERY INCOMING ATTACK</small>}
          </div>
        </div>
        {renderSide("opponent", "PLAYER 2")}
      </div>

      {showRoundIntro && <div className="local-pvp-round-intro">ROUND {round}<span>PLAYER 1 VS PLAYER 2</span></div>}
      {isPaused && !isFinal && <section className="local-pvp-pause-overlay" role="dialog" aria-modal="true"><div className="local-pvp-pause-panel"><span>WILD CARDS</span><h2>PAUSED</h2><button onClick={() => setIsPaused(false)}>RESUME MATCH</button><button onClick={resetMatch}>RESTART MATCH</button><button onClick={() => navigate("/character-select")}>CHARACTER SELECT</button><button onClick={() => navigate("/")}>MAIN MENU</button></div></section>}
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
