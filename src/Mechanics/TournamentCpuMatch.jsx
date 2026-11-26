import React, { useEffect, useRef, useState } from "react";
import { createWatchBattle, nextWatchAction } from "./WatchBattle.js";
import { getCharacterImage } from "./SkinManager.js";
import { playGameSound, playUISound } from "../audio/audioManager.js";
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

function HealthMeter({ fighter, color }) {
  const health = Math.max(0, Number(fighter?.health) || 0);
  const maximum = Math.max(1, Number(fighter?.maximumHealth) || 1);
  const percent = Math.max(0, Math.min(100, (health / maximum) * 100));
  return (
    <div className="wc-cpu-health">
      <div><span>HEALTH</span><strong>{Math.ceil(health)} / {maximum}</strong></div>
      <div className="wc-cpu-health-track">
        <i style={{ width: percent + "%", background: color }} />
      </div>
    </div>
  );
}

export default function TournamentCpuMatch({
  match,
  player,
  playerEliminated = false,
  roundLabel,
  matchNumber,
  onComplete,
  onLeaveTournament,
}) {
  const battleRef = useRef(null);
  const completedRef = useRef(false);
  const [battleView, setBattleView] = useState(null);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    if (!match?.fighters?.[0] || !match?.fighters?.[1]) return;
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
    setSpeed(1);
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
        playUISound("victory");
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
    if (!battleView?.finished || completedRef.current) return undefined;
    const timer = window.setTimeout(() => finishMatch(), 1400);
    return () => window.clearTimeout(timer);
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
    if (battle.finished) {
      window.setTimeout(finishMatch, 250);
    }
  }

  const [first, second] = battleView?.fighters || [];
  const action = battleView?.currentAction;
  const actionClass = (fighter) => {
    if (!fighter || !action) return "";
    if (action.attackerId === fighter.id && action.action !== "skipped") return " is-attacking";
    if (action.defenderId === fighter.id && action.action === "evade") return " is-evading";
    if (action.defenderId === fighter.id && action.damage > 0) return " is-taking-hit";
    return "";
  };

  return (
    <main className="wc-cpu-watch">
      <header className="wc-cpu-watch-header">
        <div className="wc-cpu-watch-brand">
          <span>WILD CARDS</span>
          <strong>TOURNAMENT SPECTATOR</strong>
        </div>
        <div className="wc-cpu-watch-round">
          <small>{roundLabel}</small>
          <strong>MATCH {String(matchNumber).padStart(2, "0")}</strong>
        </div>
        <button type="button" className="wc-cpu-leave" onClick={onLeaveTournament}>
          LEAVE TOURNAMENT
        </button>
      </header>

      <section className="wc-cpu-player-persistent">
        <img src={imageOf(player)} alt={nameOf(player)} />
        <div>
          <small>YOUR TOURNAMENT CONTENDER</small>
          <strong>{nameOf(player)}</strong>
        </div>
        <span>{playerEliminated ? "ELIMINATED · STILL IN THE CHAMPIONSHIP STORY" : "AWAITING YOUR NEXT MATCH"}</span>
      </section>

      <section className="wc-cpu-watch-title">
        <p>THE ROAD TO THE CROWN</p>
        <h1>CPU SHOWDOWN</h1>
        <span>THE BRACKET MOVES ON · WATCH THE CONTENDERS FIGHT</span>
      </section>

      <section className="wc-cpu-arena">
        <div className="wc-cpu-arena-lights" />
        <div className={"wc-cpu-fighter-side wc-cpu-left" + actionClass(first) + (first?.health <= 0 ? " is-knocked-out" : "")}>
          <div className="wc-cpu-portrait">
            {first && <img src={imageOf(match.fighters[0])} alt={nameOf(match.fighters[0])} />}
          </div>
          <h2>{nameOf(match.fighters[0])}</h2>
          {first && <HealthMeter fighter={first} color="#13d5ff" />}
          <span className="wc-cpu-side-tag">CONTENDER A</span>
        </div>

        <div className="wc-cpu-versus-panel">
          <span className="wc-cpu-versus">VS</span>
          <div className={"wc-cpu-action" + (battleView?.finished ? " finished" : "")} key={battleView?.log?.length || 0}>
            {battleView?.finished
              ? (battleView.winner ? nameOf(match.fighters.find((fighter) => fighter.data?.name === battleView.winner || fighter.name === battleView.winner)) + " WINS" : "MATCH DRAW")
              : action
                ? action.action === "skipped"
                  ? action.attackerName + " SKIPS"
                  : action.attackerName + " · " + (action.attackName || action.action).toUpperCase()
                : "THE FIGHT BEGINS"}
          </div>
          <p>
            {battleView?.finished
              ? "MATCH COMPLETE"
              : action
                ? action.action === "evade" ? "EVADED THE ATTACK"
                  : action.action === "defend" ? "DEFENDED · " + action.damage + " DAMAGE"
                    : action.damage + " DAMAGE DEALT"
                : "CONTENDERS ARE READY"}
          </p>
        </div>

        <div className={"wc-cpu-fighter-side wc-cpu-right" + actionClass(second) + (second?.health <= 0 ? " is-knocked-out" : "")}>
          <div className="wc-cpu-portrait">
            {second && <img src={imageOf(match.fighters[1])} alt={nameOf(match.fighters[1])} />}
          </div>
          <h2>{nameOf(match.fighters[1])}</h2>
          {second && <HealthMeter fighter={second} color="#ff3159" />}
          <span className="wc-cpu-side-tag">CONTENDER B</span>
        </div>
      </section>

      <section className="wc-cpu-playback">
        <div className="wc-cpu-playback-main">
          {!battleView?.finished && (
            <button type="button" className="wc-cpu-control-primary" onClick={() => setPlaying((value) => !value)}>
              {playing ? "Ⅱ PAUSE" : "▶ RESUME"}
            </button>
          )}
          {battleView?.finished && (
            <button type="button" className="wc-cpu-control-primary" onClick={finishMatch}>
              CONTINUE THE BRACKET ▶
            </button>
          )}
          {!battleView?.finished && (
            <button type="button" className="wc-cpu-control-secondary" onClick={skipMatch}>
              SKIP THIS MATCH
            </button>
          )}
        </div>
        <div className="wc-cpu-speed">
          <span>PLAYBACK</span>
          {SPEEDS.map((option, index) => (
            <button
              type="button"
              key={option.label}
              className={speed === index ? "active" : ""}
              onClick={() => setSpeed(index)}
            >{option.label}</button>
          ))}
        </div>
      </section>

      <section className="wc-cpu-log">
        <div className="wc-cpu-log-heading">
          <span>LIVE COMBAT FEED</span>
          <small>{battleView?.log?.length || 0} ACTIONS RECORDED</small>
        </div>
        <div className="wc-cpu-log-list">
          {(battleView?.log || []).slice(-3).reverse().map((entry, index) => (
            <div className="wc-cpu-log-entry" key={battleView.log.length - index}>
              <span>R{entry.round}</span>
              <p>
                <strong>{entry.attackerName}</strong>
                {entry.action === "skipped"
                  ? " had no available attack."
                  : " used " + entry.attackName + " against " + (entry.defenderName || "their opponent") + " · " + entry.damage + " damage"}
              </p>
            </div>
          ))}
          {!battleView?.log?.length && <p className="wc-cpu-log-empty">The first attack is moments away...</p>}
        </div>
      </section>

      {battleView?.finished && (
        <div className="wc-cpu-finish-stamp">
          <span>✓</span>
          <strong>MATCH COMPLETE</strong>
          <small>ADVANCING THE TOURNAMENT</small>
        </div>
      )}
    </main>
  );
}
