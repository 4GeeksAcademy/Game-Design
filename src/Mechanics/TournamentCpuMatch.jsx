import React, { useEffect, useRef, useState } from "react";
import { createWatchBattle, nextWatchAction } from "./WatchBattle.js";
import { getCharacterImage } from "./SkinManager.js";
import { getModifiedCharacterStat } from "./Modifiers.js";
import { playGameSound, playUISound } from "../audio/audioManager.js";
import "./BattleUI.css";
import "./TournamentCpuMatch.css";

const SPEEDS = [
  { label: "1×", delay: 920 },
  { label: "2×", delay: 460 },
  { label: "4×", delay: 180 },
];

const nameOf = (fighter) => fighter?.data?.name || fighter?.name || "Fighter";
const imageOf = (fighter) => fighter ? getCharacterImage(fighter.id, fighter.image) : "";

function createSnapshot(battle) {
  const fighters = battle.fighters.map((fighter) => ({
    ...fighter,
    defense: fighter.defense && typeof fighter.defense === "object"
      ? { ...fighter.defense }
      : fighter.defense,
    attacks: (fighter.attacks || []).map((attack) => ({ ...attack })),
  }));

  return {
    ...battle,
    fighters,
    log: [...battle.log],
    currentAction: battle.currentAction ? { ...battle.currentAction } : null,
  };
}

function resolveWinner(battle, match) {
  const [first, second] = battle.fighters;

  if (battle.winner) {
    return battle.winner === first.name ? match.fighters[0] : match.fighters[1];
  }

  return first.health >= second.health ? match.fighters[0] : match.fighters[1];
}

function ResourceBar({ label, value, maximum, type }) {
  const max = Math.max(1, Number(maximum) || 1);
  const current = Math.max(0, Number(value) || 0);
  const percent = Math.max(0, Math.min(100, (current / max) * 100));

  return (
    <div className={"solo-resource-row solo-resource-" + type}>
      <span>{label}</span>
      <div className="solo-resource-track">
        <div className="solo-resource-fill" style={{ width: percent + "%" }} />
      </div>
      <b>{current}/{max}</b>
    </div>
  );
}

function Segments({ label, value, maximum, type }) {
  const max = Math.min(10, Math.max(0, Math.floor(Number(maximum) || 0)));
  const current = Math.max(0, Math.min(max, Math.floor(Number(value) || 0)));

  return (
    <div className={"solo-segment-row " + type}>
      <span>{label}</span>
      <div className="solo-segments">
        {Array.from({ length: max }, (_, index) => (
          <i key={index} className={index < current ? "filled" : ""} />
        ))}
        {!max && <small>—</small>}
      </div>
      <b>{current}/{max}</b>
    </div>
  );
}

function getFighterEffect(fighter, action) {
  if (!fighter || !action || action.defenderId !== fighter.id) return null;

  if (action.action === "evade" || action.evaded) {
    return { type: "evaded", message: "EVADED!" };
  }

  if (action.action === "defend") {
    return { type: "blocked", damage: action.damage, message: "BLOCKED!" };
  }

  if (action.damage > 0) {
    return {
      type: "damage",
      damage: action.damage,
      message: action.damage >= 70 ? "HEAVY HIT!" : "",
    };
  }

  return null;
}

function FighterBattleSide({ fighter, source, side, label, action }) {
  if (!fighter) return <div className="wc-cpu-fighter-loading">LOADING CONTENDER…</div>;

  const isOpponent = side === "opponent";
  const cooldown = getModifiedCharacterStat(fighter, "cooldown");
  const cooldownMax = getModifiedCharacterStat(fighter, "maximumCooldown") || 3;
  const recovery = getModifiedCharacterStat(fighter, "recovery");
  const effect = getFighterEffect(fighter, action);
  const isAttacking = action?.attackerId === fighter.id && action.action !== "skipped";
  const stunnedCount = (fighter.attacks || []).filter(
    (attack) => (attack.stunned?.remainingRounds ?? 0) > 0,
  ).length;
  const hasStun = stunnedCount > 0;

  return (
    <div
      id={isOpponent ? "opponentSection" : "characterSection"}
      className={
        "solo-fighter-section " +
        (isOpponent ? "opponent-fighter-section" : "player-fighter-section") +
        (isAttacking ? " wc-cpu-is-attacking" : "") +
        (fighter.health <= 0 ? " wc-cpu-is-knocked-out" : "")
      }
    >
      <div
        id={isOpponent ? "opponent" : "character"}
        className="solo-fighter-unit battle-status-panel"
      >
        <div className="solo-fighter-hud">
          <div className="solo-fighter-name-row">
            <h2 id={isOpponent ? "opponentName" : "characterName"}>{fighter.name}</h2>
            <span>{label}</span>
          </div>
          <ResourceBar label="HP" value={fighter.health} maximum={fighter.maximumHealth} type="health" />
          <ResourceBar label="MP" value={fighter.mana} maximum={fighter.maximumMana} type="mana" />
          <div className="solo-segment-group">
            <Segments label="CD" value={cooldown} maximum={cooldownMax} type="cooldown" />
            <Segments label="REC" value={recovery} maximum={10} type="recovery" />
          </div>
        </div>

        <div className="solo-hud-pointer" aria-hidden="true" />

        <div
          role="group"
          tabIndex={0}
          className={"solo-fighter-art" + (effect ? " combat-effect-" + effect.type : "")}
          aria-label={fighter.name + " tournament fighter"}
        >
          <div className={"solo-portrait-wrapper" + (hasStun ? " fighter-stunned" : "")}>
            <img
              key={(action?.attackerId || "idle") + "-" + (action?.round || 0) + "-" + (action?.attackName || "")}
              src={imageOf(source)}
              id={isOpponent ? "opponentImage" : "characterImage"}
              alt={fighter.name}
            />
            {hasStun && (
              <span className="solo-stun-status">
                <strong>STUNNED!</strong>
                <small>{stunnedCount} ATTACK{stunnedCount === 1 ? "" : "S"} DISABLED</small>
              </span>
            )}
          </div>

          {effect && (
            <div className={"solo-impact-overlay impact-" + effect.type}>
              {effect.damage > 0 && (
                <strong className="solo-damage-number damage-tier-effective">
                  -{effect.damage}
                </strong>
              )}
              {effect.message && <span>{effect.message}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function findAttackForAction(fighter, action) {
  if (!fighter || !action?.attackName) return null;

  return (fighter.attacks || []).find(
    (attack) => attack.name === action.attackName,
  ) || null;
}

export default function TournamentCpuMatch({
  match,
  player,
  playerEliminated = false,
  roundLabel,
  matchNumber,
  onComplete,
  onLeaveTournament,
  onRestartTournament,
}) {
  const battleRef = useRef(null);
  const completedRef = useRef(false);
  const [battleView, setBattleView] = useState(null);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(0);

  useEffect(() => {
    if (!match?.fighters?.[0] || !match?.fighters?.[1]) return undefined;

    const toBot = (fighter) => ({
      ...(fighter.data || fighter),
      image: fighter.image,
      rosterId: fighter.id,
    });

    const battle = createWatchBattle(
      toBot(match.fighters[0]),
      toBot(match.fighters[1]),
      "Normal",
      "Normal",
    );

    battleRef.current = battle;
    completedRef.current = false;
    setBattleView(createSnapshot(battle));
    setPlaying(true);
    setSpeed(0);
    playUISound("confirm");

    return () => {
      battleRef.current = null;
    };
  }, [match?.id]);

  useEffect(() => {
    if (!playing || !battleRef.current || battleView?.finished) return undefined;

    const timer = window.setTimeout(() => {
      const updated = nextWatchAction(battleRef.current);
      battleRef.current = updated;
      setBattleView(createSnapshot(updated));

      if (updated.finished) {
        setPlaying(false);
      } else if (updated.currentAction?.action === "defend") {
        playUISound("block");
      } else if (updated.currentAction?.action === "evade") {
        playUISound("click");
      } else if (updated.currentAction?.damage > 0) {
        playGameSound("attack");
      }
    }, SPEEDS[speed].delay);

    return () => window.clearTimeout(timer);
  }, [playing, speed, battleView]);

  useEffect(() => {
    if (!battleView?.finished) return;
    setPlaying(false);
    playUISound("victory");
  }, [battleView?.finished]);

  function finishMatch() {
    if (completedRef.current || !battleRef.current) return;

    completedRef.current = true;
    const winner = resolveWinner(battleRef.current, match);
    playUISound("confirm");
    onComplete?.(winner);
  }

  function skipMatch() {
    if (!battleRef.current || completedRef.current) return;

    let battle = battleRef.current;
    let guard = 0;

    while (!battle.finished && guard < 3000) {
      battle = nextWatchAction(battle);
      guard += 1;
    }

    battleRef.current = battle;
    setBattleView(createSnapshot(battle));
    setPlaying(false);
  }

  const fighters = battleView?.fighters || [];
  const first = fighters[0];
  const second = fighters[1];
  const action = battleView?.currentAction;
  const attackOwner = action
    ? fighters.find((fighter) => fighter.id === action.attackerId)
    : null;
  const activeAttack = findAttackForAction(attackOwner, action);
  const recentActions = (battleView?.log || []).slice(-5).reverse();
  const winnerParticipant = battleView?.finished
    ? resolveWinner(battleView, match)
    : null;
  const winnerIndex = winnerParticipant?.id === match?.fighters?.[1]?.id ? 1 : 0;
  const loserIndex = 1 - winnerIndex;
  const winnerSnapshot = fighters[winnerIndex];
  const loserSnapshot = fighters[loserIndex];
  const isKnockout = Boolean(battleView?.finished && loserSnapshot?.health <= 0);

  const actionText = !action
    ? "THE MATCH IS STARTING"
    : action.action === "skipped"
      ? action.attackerName + " HAS NO AVAILABLE MOVE"
      : action.action === "evade" || action.evaded
        ? action.defenderName + " EVADED " + action.attackerName + "'S ATTACK"
        : action.action === "defend"
          ? action.defenderName + " BLOCKED THE ATTACK"
          : action.attackerName + " USED " + (action.attackName || "AN ATTACK");

  return (
    <main className="wc-cpu-watch">
      <header className="wc-cpu-tournament-header">
        <div className="wc-cpu-brand">
          <span>WILD CARDS</span>
          <strong>TOURNAMENT ARENA</strong>
        </div>

        <div className="wc-cpu-player-persistent">
          <img src={imageOf(player)} alt={nameOf(player)} />
          <div>
            <small>YOUR TOURNAMENT CONTENDER</small>
            <strong>{nameOf(player)}</strong>
          </div>
          <span>{playerEliminated ? "ELIMINATED" : "STILL IN THE BRACKET"}</span>
        </div>

        <div className="wc-cpu-match-meta">
          <small>{roundLabel}</small>
          <strong>MATCH {String(matchNumber).padStart(2, "0")}</strong>
        </div>

        <div className="wc-cpu-header-actions">
          <button
            type="button"
            className="wc-cpu-tool-button"
            onClick={() => setPlaying((value) => !value)}
            disabled={Boolean(battleView?.finished)}
          >
            {playing ? "Ⅱ PAUSE" : "▶ RESUME"}
          </button>
          <button
            type="button"
            className="wc-cpu-tool-button"
            onClick={skipMatch}
            disabled={Boolean(battleView?.finished)}
          >
            SKIP
          </button>
          <div className="wc-cpu-speed" aria-label="Simulation speed">
            {SPEEDS.map((option, index) => (
              <button
                type="button"
                key={option.label}
                className={speed === index ? "active" : ""}
                onClick={() => setSpeed(index)}
                aria-pressed={speed === index}
              >
                {option.label}
              </button>
            ))}
          </div>
          <button type="button" className="wc-cpu-exit-button" onClick={onRestartTournament}>
            RESTART
          </button>
          <button type="button" className="wc-cpu-exit-button" onClick={onLeaveTournament}>
            LEAVE
          </button>
        </div>
      </header>

      <div id="gameContainer" className="wc-cpu-game-container">
        <div id="battleLayout" className="wc-cpu-battle-layout">
          <header className="solo-battle-header wc-cpu-battle-header">
            <div className="solo-team-label solo-opponent-label">
              <span className="wc-cpu-side-name">{nameOf(match.fighters[0])}</span>
              <small>CONTENDER A</small>
            </div>
            <h1>WILD CARDS <span>{roundLabel}</span></h1>
            <div className="solo-team-label solo-player-label">
              <span className="wc-cpu-side-name">{nameOf(match.fighters[1])}</span>
              <small>CONTENDER B</small>
            </div>
          </header>

          <div id="battleArena" className="wc-cpu-battle-arena">
            <div className="wc-cpu-arena-grid" aria-hidden="true" />
            <FighterBattleSide
              fighter={first}
              source={match.fighters[0]}
              side="opponent"
              label="CPU A"
              action={action}
            />

            <div className="wc-cpu-live-action" key={(battleView?.log?.length || 0) + "-action"}>
              <span>LIVE COMBAT</span>
              <strong>{actionText}</strong>
              {action && (
                <small>
                  {action.action === "skipped"
                    ? "TURN PASSED"
                    : (action.damage || 0) + " DAMAGE"}
                </small>
              )}
            </div>

            <FighterBattleSide
              fighter={second}
              source={match.fighters[1]}
              side="player"
              label="CPU B"
              action={action}
            />
          </div>

          <section id="combatLog" className="wc-cpu-combat-log">
            <div id="combatLogHeader">
              <h4>📜 Combat Log</h4>
              <span>{battleView?.log?.length || 0} events</span>
            </div>
            <div id="combatLogEntries">
              {!recentActions.length ? (
                <p id="emptyCombatLog">The tournament match is about to begin…</p>
              ) : (
                recentActions.map((entry, index) => (
                  <div
                    className={
                      "combat-log-entry " +
                      (entry.action === "skipped" ? "skipped" : entry.damage > 0 ? "hit" : "attack")
                    }
                    key={(battleView.log.length - index) + "-" + entry.round}
                  >
                    <span className="combat-log-time">ROUND {entry.round}</span>
                    <span className="combat-log-text">
                      <strong>{entry.attackerName}</strong>
                      {entry.action === "skipped"
                        ? " had no move available."
                        : " used " + (entry.attackName || "an action") +
                          " · " + (entry.damage || 0) + " damage"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>

          <section id="battleAttackPanel" className="wc-cpu-attack-panel">
            <section id="attackSection">
              <div id="attack">
                <div id="attackHeader">RECENT BOT MOVES</div>
                <div id="attackBody">
                  <div id="attackList">
                    {recentActions.length ? recentActions.slice(0, 4).map((entry, index) => {
                      const owner = fighters.find((fighter) => fighter.id === entry.attackerId);
                      const move = findAttackForAction(owner, entry);
                      return (
                        <div className="attack-card-wrapper wc-cpu-attack-card" key={entry.round + "-" + entry.attackerId + "-" + index}>
                          <div className="attack-card">
                            {move?.image ? (
                              <img className="attack-image" src={move.image} alt="" />
                            ) : (
                              <div className="wc-cpu-attack-image-placeholder">⚔</div>
                            )}
                            <h5>{entry.attackName || (entry.action || "ACTION").toUpperCase()}</h5>
                            <div className="attack-stats">
                              <div className="attack-damage">
                                <span>{entry.damage > 0 ? "DAMAGE " + entry.damage : entry.action.toUpperCase()}</span>
                              </div>
                              <div className="attack-speed">
                                <span>{move ? "SPEED " + move.speed : "ROUND " + entry.round}</span>
                              </div>
                            </div>
                            <div className="attack-cost">
                              <span className="attack-mana-cost">
                                {move ? "◆ " + move.cost + " MANA" : owner?.name || "BOT ACTION"}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }) : (
                      <div className="wc-cpu-empty-moves">
                        <strong>READY TO FIGHT</strong>
                        <span>The first bot move will appear here</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="wc-cpu-panel-footer">
                <span>{playing ? "SIMULATION LIVE" : battleView?.finished ? "MATCH COMPLETE" : "SIMULATION PAUSED"}</span>
                <span>PLAYBACK {SPEEDS[speed].label}</span>
              </div>
            </section>
          </section>
        </div>
      </div>

      {battleView?.finished && (
        <div className="wc-cpu-ko-backdrop" role="presentation">
          <section className="wc-cpu-ko-dialog" role="dialog" aria-modal="true" aria-labelledby="wcCpuKoTitle">
            <p className="wc-cpu-ko-eyebrow">TOURNAMENT RESULT · {roundLabel}</p>
            <h2 id="wcCpuKoTitle">{isKnockout ? "K.O.!" : "MATCH COMPLETE"}</h2>
            <p className="wc-cpu-ko-subtitle">
              {nameOf(winnerParticipant)} ADVANCES TO THE NEXT ROUND
            </p>

            <div className="wc-cpu-ko-matchup">
              <div className="wc-cpu-ko-fighter is-winner">
                <span>WINNER</span>
                <img src={imageOf(winnerParticipant)} alt={nameOf(winnerParticipant)} />
                <strong>{nameOf(winnerParticipant)}</strong>
                <small>{Math.max(0, winnerSnapshot?.health || 0)} HP LEFT</small>
              </div>
              <b className="wc-cpu-ko-vs">VS</b>
              <div className="wc-cpu-ko-fighter is-defeated">
                <span>DEFEATED</span>
                <img src={imageOf(match.fighters[loserIndex])} alt={nameOf(match.fighters[loserIndex])} />
                <strong>{nameOf(match.fighters[loserIndex])}</strong>
                <small>{Math.max(0, loserSnapshot?.health || 0)} HP LEFT</small>
              </div>
            </div>

            <div className="wc-cpu-ko-options">
              <p>WHAT WOULD YOU LIKE TO DO?</p>
              <button type="button" className="wc-cpu-ko-continue" onClick={finishMatch}>
                CONTINUE TO BRACKET <span>▶</span>
              </button>
              <div className="wc-cpu-ko-secondary">
                <button type="button" onClick={onRestartTournament}>RESTART TOURNAMENT</button>
                <button type="button" onClick={onLeaveTournament}>LEAVE TOURNAMENT</button>
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
