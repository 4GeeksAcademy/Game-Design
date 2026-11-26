import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { roster } from "./Main Page/CharacterSelection.jsx";
import { getUnlockedCharacters, addCoins } from "./Currency.js";
import { createWatchBattle, nextWatchAction } from "./WatchBattle.js";
import { getCharacterImage } from "./SkinManager.js";
import { playGameSound, playUISound } from "../audio/audioManager.js";
import TournamentCpuMatch from "./TournamentCpuMatch.jsx";
import "./Tournament.css";

const REWARDS = {
  8: { 1: 100000, 2: 50000, 3: 25000 },
  4: { 1: 50000, 2: 25000, 3: 12500 },
};
const getRewardAmount = (size, place) => REWARDS[size]?.[place] || 0;
const fighterName = (fighter) => fighter?.data?.name || fighter?.name || "Unknown Fighter";
const fighterImage = (fighter) => fighter ? getCharacterImage(fighter.id, fighter.image) : "";
const getRoundLabel = (size, index) => (
  (size === 4 ? ["SEMIFINALS", "FINAL"] : ["QUARTERFINALS", "SEMIFINALS", "FINAL"])[index] || "CHAMPIONSHIP"
);
const copyRounds = (rounds) => rounds.map((round) => round.map((match) => ({
  ...match,
  fighters: [...match.fighters],
})));

function simulateCpuMatch(one, two) {
  const toBot = (fighter) => ({
    ...(fighter.data || fighter),
    image: fighter.image,
    rosterId: fighter.id,
  });
  const battle = createWatchBattle(toBot(one), toBot(two), "Normal", "Normal");
  let steps = 0;

  while (!battle.finished && steps < 3000) {
    nextWatchAction(battle);
    steps += 1;
  }

  if (!battle.finished) {
    const [first, second] = battle.fighters;
    battle.winner = first.health >= second.health ? first.name : second.name;
  }

  if (battle.winner) {
    return battle.winner === battle.fighters[0].name ? one : two;
  }
  return battle.fighters[0].health >= battle.fighters[1].health ? one : two;
}

function makeTournament(size, player) {
  // CPU slots stay empty until START TOURNAMENT is pressed.
  // The player is fixed in the left slot of the opening match.
  const participants = [player, ...Array(size - 1).fill(null)];
  const rounds = [];
  let matchCount = size / 2;
  let roundNumber = 1;

  while (matchCount >= 1) {
    rounds.push(Array.from({ length: matchCount }, (_, index) => ({
      id: "round-" + roundNumber + "-match-" + (index + 1),
      fighters: roundNumber === 1
        ? [participants[index * 2], participants[index * 2 + 1]]
        : [null, null],
      winner: null,
      isPlayerMatch: roundNumber === 1 && (
        participants[index * 2]?.id === player.id ||
        participants[index * 2 + 1]?.id === player.id
      ),
    })));
    matchCount /= 2;
    roundNumber += 1;
  }

  return {
    id: Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7),
    size,
    player,
    participants,
    rounds,
    currentRound: 0,
    displayRoundIndex: 0,
    lastTransitionRoundIndex: -1,
    started: false,
    playerEliminated: false,
    complete: false,
    rewardClaimed: false,
    placementOpportunity: null,
    placementResults: null,
    forcedPlacement: null,
  };
}

function simulateRound(round) {
  round.forEach((match) => {
    if (!match.winner && match.fighters[0] && match.fighters[1]) {
      match.winner = simulateCpuMatch(match.fighters[0], match.fighters[1]);
    }
  });
}

function buildPlacements(tournament) {
  const rounds = tournament.rounds;
  const finalMatch = rounds[rounds.length - 1][0];
  const champion = finalMatch.winner;
  const runnerUp = finalMatch.fighters.find((fighter) => fighter.id !== champion.id);
  const semifinalRound = rounds[rounds.length - 2];
  const semifinalLosers = semifinalRound
    .map((match) => match.fighters.find((fighter) => fighter.id !== match.winner.id))
    .filter(Boolean);

  const bronzeWinner =
    tournament.placementResults?.bronzeWinner ||
    simulateCpuMatch(semifinalLosers[0], semifinalLosers[1]);
  const bronzeLoser = semifinalLosers.find((fighter) => fighter.id !== bronzeWinner.id);
  tournament.thirdPlaceMatch = {
    fighters: semifinalLosers,
    winner: bronzeWinner,
  };

  if (tournament.size === 4) {
    const placements = [champion, runnerUp, bronzeWinner, bronzeLoser];
    if (tournament.forcedPlacement === 3) {
      placements[2] = tournament.player;
      placements[3] = semifinalLosers.find((fighter) => fighter.id !== tournament.player.id);
    }
    return placements;
  }

  const quarterfinalLosers = rounds[0]
    .map((match) => match.fighters.find((fighter) => fighter.id !== match.winner.id))
    .filter(Boolean);
  const quarterPairs = [
    quarterfinalLosers.slice(0, 2),
    quarterfinalLosers.slice(2, 4),
  ];
  const consolationWinners = quarterPairs.map((pair) => simulateCpuMatch(pair[0], pair[1]));
  const consolationLosers = quarterPairs.map((pair, index) =>
    pair.find((fighter) => fighter.id !== consolationWinners[index].id),
  );
  const fifthPlaceWinner = simulateCpuMatch(consolationWinners[0], consolationWinners[1]);
  const seventhPlaceWinner = simulateCpuMatch(consolationLosers[0], consolationLosers[1]);
  const sixthPlace = consolationWinners.find((fighter) => fighter.id !== fifthPlaceWinner.id);
  const eighthPlace = consolationLosers.find((fighter) => fighter.id !== seventhPlaceWinner.id);

  const placements = [
    champion,
    runnerUp,
    bronzeWinner,
    bronzeLoser,
    fifthPlaceWinner,
    sixthPlace,
    seventhPlaceWinner,
    eighthPlace,
  ];

  if (tournament.forcedPlacement === 3) {
    placements[2] = tournament.player;
    placements[3] = semifinalLosers.find((fighter) => fighter.id !== tournament.player.id);
  } else if (tournament.forcedPlacement === 8) {
    const previousPlayerPlace = placements.findIndex(
      (fighter) => fighter?.id === tournament.player.id,
    );
    if (previousPlayerPlace >= 0) {
      placements[previousPlayerPlace] = placements[7];
      placements[7] = tournament.player;
    }
  }

  return placements;
}
function finishTournamentDraft(tournament) {
  const finalMatch = tournament.rounds[tournament.rounds.length - 1][0];
  if (!finalMatch.winner && finalMatch.fighters[0] && finalMatch.fighters[1]) {
    finalMatch.winner = simulateCpuMatch(finalMatch.fighters[0], finalMatch.fighters[1]);
  }
  tournament.complete = true;
  tournament.placements = buildPlacements(tournament);
  tournament.humanPlacement =
    tournament.placements.findIndex((fighter) => fighter.id === tournament.player.id) + 1 ||
    tournament.size;
  return tournament;
}

function completeRemainingMatches(tournament) {
  for (let roundIndex = 0; roundIndex < tournament.rounds.length; roundIndex += 1) {
    const round = tournament.rounds[roundIndex];

    if (roundIndex > 0) {
      const previousWinners = tournament.rounds[roundIndex - 1].map((match) => match.winner);
      round.forEach((match, index) => {
        if (!match.fighters[0] || !match.fighters[1]) {
          match.fighters = [
            previousWinners[index * 2] || null,
            previousWinners[index * 2 + 1] || null,
          ];
          match.isPlayerMatch = match.fighters.some(
            (fighter) => fighter?.id === tournament.player.id,
          );
        }
      });
    }

    if (tournament.playerEliminated) {
      const pendingPlayerMatch = round.find((match) =>
        !match.winner && match.fighters.some((fighter) => fighter?.id === tournament.player.id)
      );
      if (pendingPlayerMatch) {
        pendingPlayerMatch.winner = pendingPlayerMatch.fighters.find(
          (fighter) => fighter.id !== tournament.player.id
        );
      }
    }
    simulateRound(round);
  }

  return finishTournamentDraft(tournament);
}

function TournamentFighter({
  fighter,
  mystery = false,
  player = false,
  eliminated = false,
  winner = false,
  revealing = false,
}) {
  return (
    <div className={[
      "wc-tourney-fighter",
      player ? "player-entry" : "",
      eliminated ? "eliminated" : "",
      winner ? "match-winner" : "",
      revealing ? "is-revealing" : "",
      mystery ? "is-mystery-entry" : "",
    ].filter(Boolean).join(" ")}>
      <div className={"wc-tourney-portrait" + (mystery ? " is-mystery" : "")}>
        {mystery
          ? <span>?</span>
          : fighter
            ? <img src={fighterImage(fighter)} alt={fighterName(fighter)} />
            : <span>—</span>}
      </div>
      <div className="wc-tourney-fighter-meta">
        <span className="wc-tourney-fighter-seed">
          {player ? "PLAYER CONTENDER" : mystery ? "AWAITING DRAW" : "TOURNAMENT CONTENDER"}
        </span>
        <strong className="wc-tourney-fighter-name">
          {mystery ? "UNKNOWN CONTENDER" : fighter ? fighterName(fighter) : "TO BE DECIDED"}
        </strong>
        <div className="wc-tourney-fighter-tags">
          {player && <small>YOU</small>}
          {winner && <small>ADVANCES</small>}
          {eliminated && <small>ELIMINATED</small>}
          {revealing && <small>DRAWING</small>}
        </div>
      </div>
    </div>
  );
}

function TournamentMatch({
  match,
  matchIndex,
  tournament,
  revealing,
  previewFighters,
  onEnterMatch,
  roundLabel,
}) {
  const playerId = tournament.player.id;
  const first = match.fighters[0];
  const second = match.fighters[1];
  const firstIsPlayer = first?.id === playerId;
  const secondIsPlayer = second?.id === playerId;
  const shownFirst = revealing && !firstIsPlayer ? previewFighters?.[0] || first : first;
  const shownSecond = revealing && !secondIsPlayer ? previewFighters?.[1] || second : second;
  const firstMystery = !shownFirst || (!tournament.started && !revealing && !firstIsPlayer);
  const secondMystery = !shownSecond || (!tournament.started && !revealing && !secondIsPlayer);
  const activePlayerMatch = tournament.started && match.isPlayerMatch && !match.winner;
  const winnerIsFirst = match.winner?.id === first?.id;
  const winnerIsSecond = match.winner?.id === second?.id;

  return (
    <article className={"wc-tourney-match" + (activePlayerMatch ? " is-player-match" : "") + (match.winner ? " is-complete" : "")}>
      <div className="wc-tourney-match-heading">
        <span>{roundLabel} · MATCH {String(matchIndex + 1).padStart(2, "0")}</span>
        <span>{match.winner ? "RESULT CONFIRMED" : revealing ? "DRAWING CONTENDERS" : "WINNER ADVANCES"}</span>
      </div>

      <div className="wc-tourney-matchup wc-tourney-vertical-bracket">
        <div className="wc-tourney-head-to-head">
          <TournamentFighter
            fighter={shownFirst}
            mystery={firstMystery}
            player={firstIsPlayer}
            eliminated={Boolean(match.winner && !winnerIsFirst)}
            winner={winnerIsFirst}
            revealing={revealing && !firstIsPlayer}
          />
          <div className="wc-tourney-versus"><span>VS</span></div>
          <TournamentFighter
            fighter={shownSecond}
            mystery={secondMystery}
            player={secondIsPlayer}
            eliminated={Boolean(match.winner && !winnerIsSecond)}
            winner={winnerIsSecond}
            revealing={revealing && !secondIsPlayer}
          />
        </div>

        <div className="wc-tourney-vertical-fork" aria-hidden="true">
          <i className="fork-left" />
          <i className="fork-right" />
          <i className="fork-join" />
          <i className="fork-stem" />
        </div>

        <div className={"wc-tourney-advance-slot" + (match.winner ? " has-winner" : "")}>
          {match.winner ? (
            <>
              <span>ADVANCING TO THE NEXT ROUND</span>
              <div className="wc-tourney-advance-portrait">
                <img src={fighterImage(match.winner)} alt={fighterName(match.winner)} />
              </div>
              <strong>{fighterName(match.winner)}</strong>
              <small>WINNER · MATCH {String(matchIndex + 1).padStart(2, "0")}</small>
            </>
          ) : (
            <>
              <span>WINNER ADVANCES</span>
              <div className="wc-tourney-advance-pending">
                <span>?</span>
                <strong>AWAITING RESULT</strong>
              </div>
              <small>THE BRACKET WILL UPDATE AFTER THIS MATCH</small>
            </>
          )}
        </div>
      </div>

      {activePlayerMatch && (
        <button className="wc-tourney-fight-button" onClick={() => onEnterMatch(match)}>
          ENTER MATCH <span>▶</span>
        </button>
      )}
    </article>
  );
}

function RoundTransition({ transition, onContinue }) {
  if (!transition) return null;

  return (
    <div className={"wc-round-transition phase-" + transition.phase} role="presentation">
      <section className="wc-round-transition-panel" role="dialog" aria-modal="true" aria-labelledby="wcRoundTransitionTitle">
        {transition.phase === "eliminators" && (
          <>
            <p className="wc-round-transition-kicker">{transition.completedRoundLabel} · ROUND COMPLETE</p>
            <h2 id="wcRoundTransitionTitle">ELIMINATED CONTENDERS</h2>
            <p className="wc-round-transition-caption">THEIR CHAMPIONSHIP RUN ENDS HERE</p>
            <div className="wc-round-eliminators">
              {transition.eliminators.map((fighter, index) => (
                <article className="wc-round-eliminator" key={fighter.id} style={{ "--reveal-order": index, animationDelay: (index * 1.12) + "s" }}>
                  <span className="wc-round-eliminator-rank">{String(index + 1).padStart(2, "0")}</span>
                  <img src={fighterImage(fighter)} alt={fighterName(fighter)} />
                  <strong>{fighterName(fighter)}</strong>
                  <small>ELIMINATED</small>
                  <span className="wc-round-eliminator-ko">K.O.</span>
                </article>
              ))}
            </div>
            <span className="wc-round-transition-progress">ADVANCING THE BRACKET…</span>
          </>
        )}

        {transition.phase === "standings" && (
          <>
            <p className="wc-round-transition-kicker">THE ROAD TO THE CROWN CONTINUES</p>
            <h2 id="wcRoundTransitionTitle">{transition.nextRoundLabel}</h2>
            <p className="wc-round-transition-caption">CURRENT STANDINGS · WINNERS MOVE FORWARD</p>
            <div className="wc-round-standings">
              {transition.standings.map((pair, index) => (
                <article className="wc-round-standing-match" key={index} style={{ "--reveal-order": index, animationDelay: (index * 1.12) + "s" }}>
                  <div className="wc-round-standing-fighter">
                    <img src={fighterImage(pair[0])} alt={fighterName(pair[0])} />
                    <strong>{fighterName(pair[0])}</strong>
                  </div>
                  <span>VS</span>
                  <div className="wc-round-standing-fighter">
                    <img src={fighterImage(pair[1])} alt={fighterName(pair[1])} />
                    <strong>{fighterName(pair[1])}</strong>
                  </div>
                  <div className="wc-round-standing-fork" aria-hidden="true"><i /><i /><i /></div>
                </article>
              ))}
            </div>
            <span className="wc-round-transition-progress">THE NEXT MATCHUPS ARE SET</span>
          </>
        )}

        {transition.phase === "ready" && (
          <div className="wc-round-ready">
            <span className="wc-round-ready-emblem">♛</span>
            <p className="wc-round-transition-kicker">THE BRACKET IS SET</p>
            <h2 id="wcRoundTransitionTitle">LET'S START!</h2>
            <p className="wc-round-transition-caption">{transition.nextRoundLabel} AWAIT</p>
            <button type="button" onClick={onContinue}>ENTER THE NEXT ROUND <span>▶</span></button>
          </div>
        )}
      </section>
    </div>
  );
}

function TournamentStartPrompt({ tournament, previewFighters, revealing, onStart, onExit }) {
  const firstRound = tournament.rounds[0] || [];

  return (
    <div className="wc-tourney-start-backdrop">
      <section className="wc-tourney-start-dialog" role="dialog" aria-modal="true" aria-labelledby="wcTourneyStartTitle">
        <p className="wc-tourney-start-kicker">WILD CARDS · GRAND CHAMPIONSHIP</p>
        <h2 id="wcTourneyStartTitle">{revealing ? "THE DRAW IS UNDERWAY" : "THE BRACKET IS READY"}</h2>
        <p className="wc-tourney-start-copy">
          {revealing
            ? "The contenders are being revealed and their opening matches are being locked in."
            : "Review the opening matchups. Your tournament begins when you are ready."}
        </p>

        <div className="wc-tourney-start-preview-heading">
          <span>OPENING ROUND</span>
          <strong>{tournament.size} FIGHTERS · {firstRound.length} MATCHES</strong>
        </div>

        <div className="wc-tourney-start-preview">
          {firstRound.map((match, index) => {
            const preview = previewFighters?.[match.id];
            const first = preview?.[0] || match.fighters[0];
            const second = preview?.[1] || match.fighters[1];
            const firstIsPlayer = first?.id === tournament.player.id;
            const secondIsPlayer = second?.id === tournament.player.id;

            return (
              <article className="wc-tourney-start-match" key={match.id}>
                <span className="wc-tourney-start-match-number">MATCH {String(index + 1).padStart(2, "0")}</span>
                <div className="wc-tourney-start-entrant">
                  <div className="wc-tourney-start-portrait">
                    {first
                      ? <img src={fighterImage(first)} alt={fighterName(first)} />
                      : <span>?</span>}
                  </div>
                  <strong>{first ? fighterName(first) : "UNKNOWN"}</strong>
                  {firstIsPlayer && <small>YOU</small>}
                </div>
                <b className="wc-tourney-start-vs">VS</b>
                <div className="wc-tourney-start-entrant">
                  <div className="wc-tourney-start-portrait">
                    {second
                      ? <img src={fighterImage(second)} alt={fighterName(second)} />
                      : <span>?</span>}
                  </div>
                  <strong>{second ? fighterName(second) : "UNKNOWN"}</strong>
                  {secondIsPlayer && <small>YOU</small>}
                </div>
                <div className="wc-tourney-start-advance" aria-hidden="true">↓</div>
              </article>
            );
          })}
        </div>

        <div className="wc-tourney-start-footer">
          <span>{revealing ? "DRAWING CONTENDERS…" : "ONE CHAMPION WILL CLAIM THE CROWN"}</span>
          <button type="button" onClick={onStart} disabled={revealing}>
            {revealing ? <><i className="wc-tourney-start-spinner" /> DRAWING THE BRACKET…</> : <>START TOURNAMENT <span>▶</span></>}
          </button>
          <button type="button" className="wc-tourney-start-cancel" onClick={onExit} disabled={revealing}>
            ← BACK TO MENU
          </button>
        </div>
      </section>
    </div>
  );
}

function TournamentPlacementList({ placements }) {
  const rankedFighters = (placements || []).slice(3);

  return (
    <aside className="wc-tourney-placement-list">
      <header>
        <span>FINAL RANKINGS</span>
        <strong>THE REST OF THE FIELD</strong>
      </header>
      <div className="wc-tourney-placement-entries">
        {rankedFighters.map((fighter, index) => {
          const rank = index + 4;
          const suffix = rank === 4 ? "TH" : "TH";
          return (
            <article className="wc-tourney-placement-entry" key={fighter?.id || rank}>
              <span className="wc-tourney-placement-rank">{rank}{suffix}</span>
              <div className="wc-tourney-placement-image">
                {fighter
                  ? <img src={fighterImage(fighter)} alt={fighterName(fighter)} />
                  : <span>?</span>}
              </div>
              <div className="wc-tourney-placement-name">
                <strong>{fighter ? fighterName(fighter) : "UNKNOWN FIGHTER"}</strong>
                <small>{rank === 4 ? "FOURTH PLACE" : "TOURNAMENT FINISH"}</small>
              </div>
            </article>
          );
        })}
      </div>
    </aside>
  );
}

function Podium({ placements, showRewards = false, size = 8 }) {
  const podiumOrder = [2, 1, 3];
  return (
    <div className="wc-podium">
      {podiumOrder.map((rank) => {
        const fighter = placements?.[rank - 1];
        return (
          <article className={"wc-podium-place place-" + rank} key={rank}>
            <div className="wc-podium-rank">
              {rank === 1 ? "♛" : rank === 2 ? "Ⅱ" : "Ⅲ"}
            </div>
            {fighter
              ? <img src={fighterImage(fighter)} alt={fighterName(fighter)} />
              : <div className="wc-podium-empty">?</div>}
            <strong>{fighter ? fighterName(fighter) : (rank === 1 ? "THE CHAMPION" : rank === 2 ? "RUNNER-UP" : "THIRD PLACE")}</strong>
            <span>{rank === 1 ? "CHAMPION" : rank + (rank === 2 ? "ND" : "RD") + " PLACE"}</span>
            {showRewards && (
              <b className="wc-podium-prize">
                {getRewardAmount(size, rank).toLocaleString()}
                <small>COINS</small>
              </b>
            )}
            {showRewards && rank === 1 && (
              <i className="wc-podium-bonus">+ FUTURE FIGHTER</i>
            )}
          </article>
        );
      })}
    </div>
  );
}

export default function Tournament() {
  const navigate = useNavigate();
  const location = useLocation();
  const [size, setSize] = useState(4);
  const [selectedId, setSelectedId] = useState("");
  const [tournament, setTournament] = useState(location.state?.tournament || null);
  const [revealing, setRevealing] = useState(false);
  const [revealPreview, setRevealPreview] = useState(null);
  const [showResults, setShowResults] = useState(Boolean(location.state?.showResults));
  const [showEliminationScreen, setShowEliminationScreen] = useState(false);
  const [activeCpuMatch, setActiveCpuMatch] = useState(null);
  const [spectating, setSpectating] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [roundTransition, setRoundTransition] = useState(null);
  const processedMatch = useRef(null);
  const activeCpuResolveRef = useRef(null);
  const skipCpuQueueRef = useRef(false);
  const revealIntervalRef = useRef(null);
  const celebrationPlayedRef = useRef("");
  const roundTransitionResolveRef = useRef(null);
  const unlockedIds = getUnlockedCharacters();
  const unlockedKey = unlockedIds.join("|");
  const available = useMemo(
    () => roster.filter((fighter) => unlockedIds.includes(fighter.id)),
    [unlockedKey],
  );
  const cpuPool = useMemo(
    () => roster.filter((fighter) =>
      !fighter.isFestivalSecret || unlockedIds.includes(fighter.id)
    ),
    [unlockedKey],
  );
  const selectedFighter = available.find((fighter) => fighter.id === selectedId) || available[0];

  function publishTournament(next) {
    setTournament({
      ...next,
      rounds: copyRounds(next.rounds),
    });
  }

  function presentRoundTransition(completedRounds, nextRound, nextRoundIndex, bracketSize) {
    const eliminators = completedRounds.flatMap((round) =>
      round.map((match) => match.fighters.find(
        (fighter) => fighter && fighter.id !== match.winner?.id,
      )).filter(Boolean)
    );
    const standings = nextRound.map((match) => [...match.fighters]);

    if (!eliminators.length || !standings.length) return Promise.resolve();

    setRoundTransition({
      phase: "eliminators",
      completedRoundLabel: bracketSize === 4 ? "SEMIFINALS COMPLETE" : "QUARTERFINALS & SEMIFINALS COMPLETE",
      nextRoundLabel: getRoundLabel(bracketSize, nextRoundIndex),
      eliminators,
      standings,
    });

    playUISound("unlock");
    return new Promise((resolve) => {
      roundTransitionResolveRef.current = resolve;
    });
  }

  function continueRoundTransition() {
    setRoundTransition(null);
    playUISound("confirm");
    const resolve = roundTransitionResolveRef.current;
    roundTransitionResolveRef.current = null;
    resolve?.();
  }

  useEffect(() => {
    if (!roundTransition || roundTransition.phase === "ready") return undefined;

    const nextPhase = roundTransition.phase === "eliminators" ? "standings" : "ready";
    const duration = roundTransition.phase === "eliminators"
      ? Math.max(4200, roundTransition.eliminators.length * 880 + 1900)
      : 3800;
    const timer = window.setTimeout(() => {
      setRoundTransition((current) => current ? { ...current, phase: nextPhase } : current);
      playUISound("click");
    }, duration);

    return () => window.clearTimeout(timer);
  }, [roundTransition?.phase]);

  function completeTournament(next) {
    const finished = finishTournamentDraft(next);
    setTournament(finished);
    setShowEliminationScreen(false);
    setShowResults(true);
    setSpectating(false);
    navigate("/tournament", {
      replace: true,
      state: { tournament: finished, showResults: true },
    });
  }

  async function playCpuRound(round, roundIndex, playerId) {
    const pending = round.filter((match) =>
      !match.winner &&
      match.fighters[0] &&
      match.fighters[1] &&
      !match.fighters.some((fighter) => fighter.id === playerId)
    );

    for (let index = 0; index < pending.length; index += 1) {
      if (skipCpuQueueRef.current) return false;
      const match = pending[index];
      const winner = await new Promise((finishMatch) => {
        activeCpuResolveRef.current = finishMatch;
        setActiveCpuMatch({
          match,
          roundIndex,
          matchNumber: index + 1,
          totalMatches: pending.length,
        });
      });

      if (skipCpuQueueRef.current) return false;

      match.winner = winner || simulateCpuMatch(match.fighters[0], match.fighters[1]);
      setTournament((current) => current ? {
        ...current,
        rounds: copyRounds(current.rounds).map((items, itemRoundIndex) =>
          itemRoundIndex === roundIndex
            ? items.map((item) => item.id === match.id ? { ...item, winner: match.winner } : item)
            : items
        ),
      } : current);
      setActiveCpuMatch(null);
      await new Promise((done) => window.setTimeout(done, 260));
    }

    return true;
  }

  async function finishRemainingCpuRounds(draft, startRoundIndex, forcedPlacement = null) {
    if (forcedPlacement) draft.forcedPlacement = forcedPlacement;
    setShowEliminationScreen(false);
    setSpectating(true);
    skipCpuQueueRef.current = false;

    for (let roundIndex = startRoundIndex; roundIndex < draft.rounds.length; roundIndex += 1) {
      const round = draft.rounds[roundIndex];

      if (roundIndex > 0) {
        const completedRound = draft.rounds[roundIndex - 1];
        const previousWinners = completedRound.map((match) => match.winner);
        round.forEach((match, index) => {
          if (!match.fighters[0] || !match.fighters[1]) {
            match.fighters = [
              previousWinners[index * 2] || null,
              previousWinners[index * 2 + 1] || null,
            ];
          }
          match.isPlayerMatch = false;
        });

        draft.currentRound = roundIndex;
        draft.displayRoundIndex = roundIndex;
        publishTournament(draft);
        const isFinalRound = roundIndex === draft.rounds.length - 1;
        if (isFinalRound && draft.lastTransitionRoundIndex !== roundIndex - 1) {
          draft.lastTransitionRoundIndex = roundIndex - 1;
          await presentRoundTransition(draft.rounds.slice(0, roundIndex), round, roundIndex, draft.size);
          if (skipCpuQueueRef.current) {
            setSpectating(false);
            return;
          }
        }
      } else {
        draft.currentRound = roundIndex;
        draft.displayRoundIndex = roundIndex;
        publishTournament(draft);
      }

      const completed = await playCpuRound(round, roundIndex, draft.player.id);
      if (!completed || skipCpuQueueRef.current) {
        setSpectating(false);
        return;
      }

      publishTournament(draft);
      if (roundIndex === draft.rounds.length - 1) {
        completeTournament(draft);
        return;
      }
    }
  }

  async function advanceAfterPlayerResult(draft, playerStillIn) {
    skipCpuQueueRef.current = false;
    setSpectating(!playerStillIn);

    for (let roundIndex = draft.currentRound; roundIndex < draft.rounds.length; roundIndex += 1) {
      const round = draft.rounds[roundIndex];

      if (roundIndex > 0) {
        const completedRound = draft.rounds[roundIndex - 1];
        const previousWinners = completedRound.map((match) => match.winner);
        round.forEach((match, index) => {
          if (!match.fighters[0] || !match.fighters[1]) {
            match.fighters = [
              previousWinners[index * 2] || null,
              previousWinners[index * 2 + 1] || null,
            ];
          }
          match.isPlayerMatch = !draft.playerEliminated && match.fighters.some(
            (fighter) => fighter?.id === draft.player.id,
          );
        });

        draft.currentRound = roundIndex;
        draft.displayRoundIndex = roundIndex;
        publishTournament(draft);
        const isFinalRound = roundIndex === draft.rounds.length - 1;
        if (isFinalRound && draft.lastTransitionRoundIndex !== roundIndex - 1) {
          draft.lastTransitionRoundIndex = roundIndex - 1;
          await presentRoundTransition(draft.rounds.slice(0, roundIndex), round, roundIndex, draft.size);
          if (skipCpuQueueRef.current) return;
        }
      } else {
        draft.currentRound = roundIndex;
        draft.displayRoundIndex = roundIndex;
        publishTournament(draft);
      }

      const completedCpuMatches = await playCpuRound(round, roundIndex, draft.player.id);
      if (!completedCpuMatches || skipCpuQueueRef.current) return;

      const nextHumanMatch = round.find((match) =>
        match.isPlayerMatch &&
        !match.winner &&
        match.fighters.some((fighter) => fighter?.id === draft.player.id)
      );

      publishTournament(draft);
      if (playerStillIn && nextHumanMatch) {
        setSpectating(false);
        setShowEliminationScreen(false);
        navigate("/tournament", {
          replace: true,
          state: { tournament: draft, showResults: false },
        });
        return;
      }

      if (roundIndex === draft.rounds.length - 1) {
        completeTournament(draft);
        return;
      }
    }
  }

  async function processPlayerResult(incomingTournament, result) {
    const updated = {
      ...incomingTournament,
      rounds: copyRounds(incomingTournament.rounds),
    };

    // A bronze-medal battle is a real player match, separate from the main bracket.
    if (result.placementType === "bronze") {
      const bronzeOpponent = updated.placementOpportunity?.opponent;
      if (!bronzeOpponent) return;
      updated.placementResults = {
        bronzeWinner: result.won ? updated.player : bronzeOpponent,
      };
      updated.placementOpportunity = null;
      playUISound(result.won ? "victory" : "back");
      await finishRemainingCpuRounds(updated, updated.currentRound + 1);
      return;
    }

    const currentRound = updated.rounds[updated.currentRound];
    const match = currentRound?.find((item) => item.id === result.matchId);
    if (!match || match.winner) return;

    const opponent = match.fighters.find((fighter) => fighter.id !== updated.player.id);
    if (!opponent) return;

    match.winner = result.won ? updated.player : opponent;
    updated.playerEliminated = !result.won;
    publishTournament(updated);

    if (!result.won) {
      setShowEliminationScreen(false);
      setSpectating(true);

      // Finish the other matches in the round before offering placement choices.
      const completedRound = await playCpuRound(
        currentRound,
        updated.currentRound,
        updated.player.id,
      );
      if (!completedRound || skipCpuQueueRef.current) return;

      const isSemifinal = updated.currentRound === updated.rounds.length - 2;
      if (isSemifinal) {
        const otherSemifinal = currentRound.find((item) => item.id !== match.id);
        const bronzeOpponent = otherSemifinal?.fighters.find(
          (fighter) => fighter.id !== otherSemifinal.winner?.id,
        );
        updated.placementOpportunity = bronzeOpponent
          ? { type: "bronze", opponent: bronzeOpponent }
          : null;
      } else if (updated.size === 8 && updated.currentRound === 0) {
        updated.placementOpportunity = { type: "consolation" };
      }

      const nextRoundIndex = updated.currentRound + 1;
      if (nextRoundIndex < updated.rounds.length) {
        const nextRound = updated.rounds[nextRoundIndex];
        const previousWinners = currentRound.map((item) => item.winner);
        nextRound.forEach((item, index) => {
          if (!item.fighters[0] || !item.fighters[1]) {
            item.fighters = [
              previousWinners[index * 2] || null,
              previousWinners[index * 2 + 1] || null,
            ];
          }
          item.isPlayerMatch = false;
        });

        updated.displayRoundIndex = nextRoundIndex;
        publishTournament(updated);

        const isFinalRound = nextRoundIndex === updated.rounds.length - 1;
        if (isFinalRound && updated.lastTransitionRoundIndex !== updated.currentRound) {
          updated.lastTransitionRoundIndex = updated.currentRound;
          publishTournament(updated);
          await presentRoundTransition(
            updated.rounds.slice(0, nextRoundIndex),
            nextRound,
            nextRoundIndex,
            updated.size,
          );
          if (skipCpuQueueRef.current) return;
        }
      } else {
        playUISound("back");
        completeTournament(updated);
        return;
      }

      publishTournament(updated);
      setSpectating(false);
      setShowEliminationScreen(true);
      navigate("/tournament", {
        replace: true,
        state: { tournament: updated, showResults: false },
      });
      return;
    }

    playUISound("victory");
    await advanceAfterPlayerResult(updated, true);
  }
  useEffect(() => {
    const result = location.state?.tournamentResult;
    const incomingTournament = location.state?.tournament;
    const resultKey = result && incomingTournament
      ? incomingTournament.id + ":" + result.matchId
      : null;

    if (!result || !incomingTournament || processedMatch.current === resultKey) return;
    processedMatch.current = resultKey;
    processPlayerResult(incomingTournament, result).catch((error) => {
      console.error("[Wild Cards Tournament] Could not process match result:", error);
      setShowEliminationScreen(true);
      setSpectating(false);
    });
  }, [location.state]);

  useEffect(() => () => {
    window.clearInterval(revealIntervalRef.current);
    roundTransitionResolveRef.current?.();
    roundTransitionResolveRef.current = null;
  }, []);

  useEffect(() => {
    if (!showResults || !tournament?.complete || celebrationPlayedRef.current === tournament.id) return;
    celebrationPlayedRef.current = tournament.id;
    playUISound("victory");
    const timer = window.setTimeout(() => playUISound("unlock"), 550);
    return () => window.clearTimeout(timer);
  }, [showResults, tournament?.complete, tournament?.id]);

  function generateBracket() {
    if (!selectedFighter || cpuPool.filter((fighter) => fighter.id !== selectedFighter.id).length < size - 1) return;
    skipCpuQueueRef.current = false;
    processedMatch.current = null;
    celebrationPlayedRef.current = "";
    setShowEliminationScreen(false);
    setRoundTransition(null);
    setRevealing(true);
    playUISound("confirm");
    const next = makeTournament(size, selectedFighter);
    window.setTimeout(() => {
      setTournament(next);
      setShowResults(false);
      setRevealPreview(null);
      setRevealing(false);
      playUISound("confirm");
    }, 1000);
  }

  function createRevealPreview() {
    if (!tournament) return null;
    const pool = cpuPool.filter((fighter) => fighter.id !== tournament.player.id);
    const previews = {};

    tournament.rounds[0].forEach((match) => {
      previews[match.id] = match.fighters.map((fighter) => {
        if (fighter?.id === tournament.player.id) return fighter;
        return pool[Math.floor(Math.random() * pool.length)] || fighter;
      });
    });
    return previews;
  }

  function startTournament() {
    if (!tournament || revealing || tournament.started) return;
    setRevealing(true);
    playUISound("confirm");
    let step = 0;
    window.clearInterval(revealIntervalRef.current);

    // The actual CPU draw happens now, not when the empty bracket was generated.
    const selectedCpu = [...cpuPool]
      .filter((fighter) => fighter.id !== tournament.player.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, tournament.size - 1);
    const finalParticipants = [
      tournament.player,
      selectedCpu[0],
      ...selectedCpu.slice(1).sort(() => Math.random() - 0.5),
    ];

    revealIntervalRef.current = window.setInterval(() => {
      setRevealPreview(createRevealPreview());
      playUISound("click");
      step += 1;

      if (step >= 6) {
        window.clearInterval(revealIntervalRef.current);
        revealIntervalRef.current = null;
        setRevealPreview(null);
        setTournament((current) => {
          if (!current) return current;
          const firstRound = current.rounds[0].map((match, index) => ({
            ...match,
            fighters: [finalParticipants[index * 2], finalParticipants[index * 2 + 1]],
            isPlayerMatch: [finalParticipants[index * 2], finalParticipants[index * 2 + 1]]
              .some((fighter) => fighter?.id === current.player.id),
          }));
          return {
            ...current,
            participants: finalParticipants,
            rounds: [firstRound, ...current.rounds.slice(1)],
            started: true,
          };
        });
        setRevealing(false);
        playUISound("victory");
      }
    }, 350);
  }

  function exitUnstartedTournament() {
    window.clearInterval(revealIntervalRef.current);
    revealIntervalRef.current = null;
    navigate("/");
  }

  function enterMatch(match) {
    const opponent = match.fighters.find((fighter) => fighter.id !== tournament.player.id);
    if (!opponent) return;

    playUISound("confirm");
    navigate("/battle", {
      state: {
        gameMode: "tournament",
        tournament,
        tournamentMatchId: match.id,
        playerId: tournament.player.id,
        opponentId: opponent.id,
        teamSize: "1v1",
        difficulty: "Normal",
        teamControl: "single-player",
        localPvP: false,
        playerCount: 1,
        stageBackground: "arena",
      },
    });
  }


  function enterPlacementMatch() {
    const opponent = tournament?.placementOpportunity?.opponent;
    if (!opponent) return;
    playUISound("confirm");
    navigate("/battle", {
      state: {
        gameMode: "tournament",
        tournament,
        tournamentMatchId: "placement-bronze",
        tournamentPlacement: { type: "bronze" },
        playerId: tournament.player.id,
        opponentId: opponent.id,
        teamSize: "1v1",
        difficulty: "Normal",
        teamControl: "single-player",
        localPvP: false,
        playerCount: 1,
        stageBackground: "arena",
      },
    });
  }

  function finishWatchedCpuMatch(winner) {
    const finishMatch = activeCpuResolveRef.current;
    activeCpuResolveRef.current = null;
    setActiveCpuMatch(null);
    finishMatch?.(winner);
  }

  async function watchRemaining() {
    if (!tournament || spectating) return;
    await finishRemainingCpuRounds(
      {
        ...tournament,
        started: true,
        rounds: copyRounds(tournament.rounds),
      },
      tournament.currentRound + 1,
    );
  }

  async function forfeitPlacement() {
    if (!tournament || spectating) return;
    const guaranteedPlace =
      tournament.placementOpportunity?.type === "bronze" ? 3 : 8;
    await finishRemainingCpuRounds(
      {
        ...tournament,
        started: true,
        rounds: copyRounds(tournament.rounds),
      },
      tournament.currentRound + 1,
      guaranteedPlace,
    );
  }

  function prepareCpuFinish(source = tournament) {
    if (!source) return null;
    const updated = {
      ...source,
      started: true,
      playerEliminated: true,
      rounds: copyRounds(source.rounds),
    };
    const activeRound = updated.rounds[updated.currentRound];
    const pendingPlayerMatch = activeRound?.find(
      (match) => match.isPlayerMatch && !match.winner,
    );

    if (pendingPlayerMatch) {
      pendingPlayerMatch.winner = pendingPlayerMatch.fighters.find(
        (fighter) => fighter.id !== updated.player.id,
      );
    }
    return completeRemainingMatches(updated);
  }

  function leaveTournament() {
    if (!tournament) return;
    roundTransitionResolveRef.current?.();
    roundTransitionResolveRef.current = null;
    setRoundTransition(null);
    skipCpuQueueRef.current = true;
    window.clearInterval(revealIntervalRef.current);
    revealIntervalRef.current = null;
    setRevealPreview(null);
    setRevealing(false);

    let source = tournament;
    if (activeCpuMatch) {
      const winner = simulateCpuMatch(
        activeCpuMatch.match.fighters[0],
        activeCpuMatch.match.fighters[1],
      );
      const rounds = copyRounds(tournament.rounds);
      const activeMatch = rounds[activeCpuMatch.roundIndex]?.find(
        (match) => match.id === activeCpuMatch.match.id,
      );
      if (activeMatch) activeMatch.winner = winner;
      source = { ...tournament, rounds };
      activeCpuResolveRef.current?.(winner);
      activeCpuResolveRef.current = null;
      setActiveCpuMatch(null);
    }
    const finished = prepareCpuFinish(source);
    if (!finished) return;
    setTournament(finished);
    setShowEliminationScreen(false);
    setShowResults(true);
    setSpectating(false);
    navigate("/tournament", {
      replace: true,
      state: { tournament: finished, showResults: true },
    });
  }

  function restartTournament() {
    roundTransitionResolveRef.current?.();
    roundTransitionResolveRef.current = null;
    setRoundTransition(null);
    skipCpuQueueRef.current = true;
    window.clearInterval(revealIntervalRef.current);
    revealIntervalRef.current = null;
    activeCpuResolveRef.current?.(null);
    activeCpuResolveRef.current = null;
    setActiveCpuMatch(null);
    setRestarting(true);
    setTimeout(() => {
      setTournament(null);
      setShowResults(false);
      setShowEliminationScreen(false);
      setSpectating(false);
      setRevealPreview(null);
      setRevealing(false);
      setRestarting(false);
      setSelectedId("");
      setSize(4);
      processedMatch.current = null;
      navigate("/tournament", { replace: true, state: null });
    }, 480);
  }

  function claimReward() {
    const amount = getRewardAmount(tournament.size, tournament.humanPlacement);
    if (!tournament.rewardClaimed && amount > 0) {
      addCoins(amount);
      playGameSound("purchase");
      const updated = { ...tournament, rewardClaimed: true };
      setTournament(updated);
      navigate("/tournament", {
        replace: true,
        state: { tournament: updated, showResults: true },
      });
    }
  }

  if (activeCpuMatch && tournament) {
    const roundLabels = tournament.size === 4
      ? ["SEMIFINALS", "FINAL"]
      : ["QUARTERFINALS", "SEMIFINALS", "FINAL"];
    return (
      <TournamentCpuMatch
        match={activeCpuMatch.match}
        player={tournament.player}
        playerEliminated={tournament.playerEliminated}
        roundLabel={roundLabels[activeCpuMatch.roundIndex] || "CHAMPIONSHIP"}
        matchNumber={activeCpuMatch.matchNumber}
        onComplete={finishWatchedCpuMatch}
        onLeaveTournament={leaveTournament}
        onRestartTournament={restartTournament}
      />
    );
  }

  if (showResults && tournament?.complete) {
    const placement = tournament.humanPlacement;
    const suffix = placement === 1 ? "ST" : placement === 2 ? "ND" : placement === 3 ? "RD" : "TH";
    const reward = getRewardAmount(tournament.size, placement);

    return (
      <main className={"wc-tournament wc-tournament-results" + (restarting ? " is-restarting" : "")}>
        <div className="wc-tourney-confetti" aria-hidden="true">
          {Array.from({ length: 24 }, (_, index) => (
            <i
              key={index}
              style={{
                left: ((index * 37) % 100) + "%",
                animationDelay: ((index % 8) * -0.37) + "s",
                animationDuration: (3.2 + (index % 5) * 0.42) + "s",
              }}
            />
          ))}
        </div>
        <div className="wc-tourney-crown-light" aria-hidden="true" />
        <header className="wc-tourney-header wc-tourney-results-header">
          <span>WILD CARDS</span>
          <span>GRAND CHAMPIONSHIP · FINAL STANDINGS</span>
          <span>TOURNAMENT COMPLETE</span>
        </header>
        <section className="wc-tourney-results-title">
          <p className="wc-tourney-kicker">THE FINAL BELL HAS RUNG</p>
          <h1>THE PODIUM</h1>
          <p>The champion, the podium, and every contender's final position.</p>
        </section>
        <section className="wc-tourney-player-strip wc-tourney-result-player">
          <img src={fighterImage(tournament.player)} alt={fighterName(tournament.player)} />
          <div>
            <small>YOUR TOURNAMENT RESULT</small>
            <strong>{fighterName(tournament.player)}</strong>
          </div>
          <span>{placement}{suffix} PLACE</span>
        </section>
        <section className="wc-tourney-final-standings-layout">
          <Podium placements={tournament.placements} showRewards size={tournament.size} />
          <TournamentPlacementList placements={tournament.placements} />
        </section>
        <section className="wc-tourney-reward-receipt">
          <div>
            <span>YOUR FINISH</span>
            <strong>{placement}{suffix} PLACE</strong>
          </div>
          <div>
            <span>CHAMPIONSHIP PAYOUT</span>
            <strong>{reward.toLocaleString()} <small>COINS</small></strong>
          </div>
          {placement === 1 && (
            <p>Plus a future character unlock, added when the new fighter joins the roster.</p>
          )}
          {placement > 3 && (
            <p>Keep training. Your next run could put you on the podium.</p>
          )}
        </section>
        {reward > 0 && (
          <button
            className="wc-tourney-primary-action"
            onClick={claimReward}
            disabled={tournament.rewardClaimed}
          >
            {tournament.rewardClaimed ? "REWARD CLAIMED ✓" : "CLAIM YOUR REWARD"}
          </button>
        )}
        <button className="wc-tourney-new-run" onClick={restartTournament}>
          START A NEW TOURNAMENT <span>↻</span>
        </button>
      </main>
    );
  }

  if (tournament) {
    const displayRoundIndex = tournament.displayRoundIndex ?? tournament.currentRound;

    return (
      <main className={"wc-tournament wc-tournament-bracket" + (restarting ? " is-restarting" : "")}>
        <header className="wc-tourney-header">
          <button
            className="wc-tourney-exit"
            onClick={tournament.started ? leaveTournament : exitUnstartedTournament}
          >
            {!tournament.started
              ? "← EXIT TO MENU"
              : tournament.playerEliminated
                ? "SKIP TO STANDINGS"
                : "LEAVE & SEE STANDINGS"}
          </button>
          <div className="wc-tourney-header-title">
            <span>WILD CARDS</span>
            <strong>GRAND CHAMPIONSHIP</strong>
          </div>
          <div className="wc-tourney-header-right">
            <span>{tournament.size} CONTENDERS</span>
            {!tournament.started ? (
              <span className="wc-tourney-live-state">{revealing ? "● DRAW IN PROGRESS" : "● BRACKET PREVIEW"}</span>
            ) : (
              <span className="wc-tourney-live-state">● TOURNAMENT LIVE</span>
            )}
          </div>
        </header>

        <div className="wc-tourney-bracket-title">
          <div>
            <p className="wc-tourney-kicker">ONE BRACKET · ONE CHAMPION</p>
            <h1>THE ROAD TO THE CROWN</h1>
          </div>
          <section className="wc-tourney-player-strip">
            <img src={fighterImage(tournament.player)} alt={fighterName(tournament.player)} />
            <div>
              <small>YOUR CONTENDER</small>
              <strong>{fighterName(tournament.player)}</strong>
            </div>
            <span>{tournament.playerEliminated ? "ELIMINATED" : "IN THE RUNNING"}</span>
          </section>
        </div>

        {revealing && (
          <div className="wc-tourney-reveal-status" role="status">
            <span className="wc-tourney-reveal-spinner" />
            <strong>THE CONTENDERS ARE BEING DRAWN</strong>
          </div>
        )}

        <section className="wc-tourney-rounds wc-tourney-current-round" aria-label="Current tournament round">
          <div className="wc-tourney-round-title wc-tourney-current-round-title">
            <span>ROUND {displayRoundIndex + 1} OF {tournament.rounds.length}</span>
            <h2>{getRoundLabel(tournament.size, displayRoundIndex)}</h2>
            <small>{(tournament.rounds[displayRoundIndex] || []).length} MATCH{(tournament.rounds[displayRoundIndex] || []).length === 1 ? "" : "ES"}</small>
          </div>
          <div className="wc-tourney-round-matches wc-tourney-current-round-matches">
            {(tournament.rounds[displayRoundIndex] || []).map((match, matchIndex) => (
              <TournamentMatch
                key={match.id}
                match={match}
                matchIndex={matchIndex}
                tournament={tournament}
                revealing={revealing}
                previewFighters={revealPreview?.[match.id]}
                onEnterMatch={enterMatch}
                roundLabel={getRoundLabel(tournament.size, displayRoundIndex)}
              />
            ))}
          </div>
        </section>

        {tournament.playerEliminated && showEliminationScreen && !tournament.complete && (
          <section className="wc-tourney-elimination-panel">
            <div className="wc-tourney-elimination-mark">K.O.</div>
            <div>
              <strong>{tournament.placementOpportunity?.type === "bronze" ? "A SHOT AT THIRD PLACE REMAINS" : "YOUR RUN HAS ENDED"}</strong>
              <span>
                {tournament.placementOpportunity?.type === "bronze"
                  ? "Play the bronze-medal match to earn third place, or forfeit and secure third automatically."
                  : "Continue to see your final 5th–8th place ranking, or forfeit and accept eighth place."}
              </span>
            </div>
            {tournament.placementOpportunity?.type === "bronze" && (
              <button className="wc-tourney-watch-button" onClick={enterPlacementMatch}>
                PLAY FOR 3RD PLACE
              </button>
            )}
            <button className="wc-tourney-watch-button" onClick={watchRemaining} disabled={spectating}>
              {spectating ? "STARTING WATCH MODE..." : "WATCH REMAINING MATCHES"}
            </button>
            <button className="wc-tourney-skip-button" onClick={forfeitPlacement} disabled={spectating}>
              {tournament.placementOpportunity?.type === "bronze"
                ? "FORFEIT & CLAIM 3RD"
                : "FORFEIT · ACCEPT 8TH"}
            </button>
            <button className="wc-tourney-restart-button" onClick={restartTournament}>
              RESTART
            </button>
          </section>
        )}

        {!tournament.started && (
          <TournamentStartPrompt
            tournament={tournament}
            previewFighters={revealPreview}
            revealing={revealing}
            onStart={startTournament}
            onExit={exitUnstartedTournament}
          />
        )}

        <RoundTransition
          transition={roundTransition}
          onContinue={continueRoundTransition}
        />
      </main>
    );
  }

  return (
    <main className={"wc-tournament wc-tournament-setup" + (restarting ? " is-restarting" : "")}>
      <header className="wc-tourney-header">
        <button className="wc-tourney-exit" onClick={() => navigate("/")}>← MAIN MENU</button>
        <div className="wc-tourney-header-title">
          <span>WILD CARDS</span>
          <strong>GRAND CHAMPIONSHIP</strong>
        </div>
        <span className="wc-tourney-setup-tag">TOURNAMENT MODE</span>
      </header>

      <section className="wc-tourney-setup-title">
        <p className="wc-tourney-kicker">ONE FIGHTER · ONE SHOT AT GLORY</p>
        <h1>ENTER THE TOURNAMENT</h1>
        <p>Choose your bracket size, select your fighter, and fight your way to the crown.</p>
      </section>

      <section className="wc-tourney-size-picker">
        <span className="wc-tourney-section-label">CHAMPIONSHIP FORMAT</span>
        <div>
          <button className={size === 4 ? "active" : ""} onClick={() => setSize(4)}>
            <strong>04</strong><span>FIGHTERS</span><small>2 ROUNDS</small>
          </button>
          <button className={size === 8 ? "active" : ""} onClick={() => setSize(8)}>
            <strong>08</strong><span>FIGHTERS</span><small>3 ROUNDS</small>
          </button>
        </div>
      </section>

      <section className="wc-tourney-character-picker">
        <div className="wc-tourney-section-heading">
          <div>
            <span className="wc-tourney-section-label">CHOOSE YOUR CONTENDER</span>
            <h2>SELECT YOUR FIGHTER</h2>
          </div>
          <span>{available.length} UNLOCKED FIGHTER{available.length === 1 ? "" : "S"}</span>
        </div>
        {available.length > 0 ? (
          <div className="wc-tourney-roster-track">
            {available.map((fighter) => (
              <button
                type="button"
                key={fighter.id}
                className={"wc-tourney-roster-card" + (selectedFighter?.id === fighter.id ? " selected" : "")}
                onClick={() => setSelectedId(fighter.id)}
                aria-pressed={selectedFighter?.id === fighter.id}
              >
                <span className="wc-tourney-roster-image">
                  <img src={fighterImage(fighter)} alt={fighterName(fighter)} />
                  {selectedFighter?.id === fighter.id && <i>✓</i>}
                </span>
                <strong>{fighterName(fighter)}</strong>
                <small>{selectedFighter?.id === fighter.id ? "SELECTED" : "SELECT FIGHTER"}</small>
              </button>
            ))}
          </div>
        ) : (
          <p className="wc-tourney-no-fighters">Unlock a fighter before entering the championship.</p>
        )}
      </section>

      <section className="wc-tourney-prize-section">
        <div className="wc-tourney-section-heading">
          <div>
            <span className="wc-tourney-section-label">THE STAKES</span>
            <h2>CHAMPIONSHIP REWARDS</h2>
          </div>
          <span>CLAIM YOUR PLACE IN HISTORY</span>
        </div>
        <Podium showRewards size={size} />
      </section>

      <footer className="wc-tourney-setup-footer">
        <div>
          <strong>{fighterName(selectedFighter)}</strong>
          <span>YOUR CHAMPIONSHIP PICK</span>
        </div>
        <button className={"wc-tourney-primary-action" + (revealing ? " is-loading" : "")} disabled={!selectedFighter || revealing} onClick={generateBracket}>
          {revealing ? "DRAWING THE CONTENDERS..." : "GENERATE BRACKET"} <span>▶</span>
        </button>
      </footer>
    </main>
  );
}


/* =========================================================
   VERTICAL BRACKET TREE — side-by-side contender cards,
   straight downward fork, then advancing winner.
   ========================================================= */
.wc-tourney-current-round .wc-tourney-matchup.wc-tourney-vertical-bracket {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  padding: 13px 0 3px;
}

.wc-tourney-head-to-head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 46px minmax(0, 1fr);
  align-items: stretch;
  gap: clamp(6px, 1.4vw, 16px);
  width: 100%;
}

.wc-tourney-current-round .wc-tourney-head-to-head .wc-tourney-fighter {
  height: clamp(140px, 17vh, 184px);
  min-height: 140px;
  grid-template-columns: clamp(104px, 14vw, 172px) minmax(0, 1fr);
  gap: 12px;
  padding: 7px;
}

.wc-tourney-current-round .wc-tourney-head-to-head .wc-tourney-portrait {
  min-height: 0;
  height: 100%;
  width: 100%;
  place-items: end center;
}

.wc-tourney-current-round .wc-tourney-head-to-head .wc-tourney-portrait img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center bottom;
}

.wc-tourney-head-to-head .wc-tourney-versus {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 0;
  color: #d9ba73;
  font-size: .7rem;
  writing-mode: vertical-rl;
}

.wc-tourney-head-to-head .wc-tourney-versus::before,
.wc-tourney-head-to-head .wc-tourney-versus::after {
  content: "";
  width: 1px;
  height: 100%;
  min-height: 24px;
  background: linear-gradient(180deg, transparent, #c09b5a, transparent);
}

.wc-tourney-vertical-fork {
  position: relative;
  width: min(220px, 42%);
  height: 38px;
  flex: 0 0 38px;
  margin: 0 auto;
}

.wc-tourney-vertical-fork i {
  position: absolute;
  display: block;
  background: linear-gradient(180deg, #e0c078, #8e713d);
  box-shadow: 0 0 9px #d5ae5d45;
}

.wc-tourney-vertical-fork .fork-left,
.wc-tourney-vertical-fork .fork-right {
  top: 0;
  width: 2px;
  height: 48%;
}

.wc-tourney-vertical-fork .fork-left { left: 8%; }
.wc-tourney-vertical-fork .fork-right { right: 8%; }

.wc-tourney-vertical-fork .fork-join {
  top: 46%;
  left: 8%;
  width: 84%;
  height: 2px;
  background: linear-gradient(90deg, #8e713d, #e0c078, #8e713d);
}

.wc-tourney-vertical-fork .fork-stem {
  top: 46%;
  bottom: 0;
  left: calc(50% - 1px);
  width: 2px;
  background: linear-gradient(180deg, #e0c078, #8e713d);
}

.wc-tourney-current-round .wc-tourney-advance-slot {
  display: grid;
  grid-template-columns: auto 78px minmax(0, 1fr);
  grid-template-rows: auto auto;
  align-items: center;
  justify-content: stretch;
  gap: 3px 12px;
  width: min(540px, 76%);
  min-height: 92px;
  padding: 8px 14px;
  border: 1px solid rgba(201, 168, 100, .5);
  border-radius: 7px;
  background: linear-gradient(100deg, rgba(38, 31, 19, .95), rgba(11, 14, 11, .98));
  box-shadow: 0 6px 16px #0006, inset 0 1px #fff1;
}

.wc-tourney-current-round .wc-tourney-advance-slot > span {
  grid-column: 1 / -1;
  color: #c1a56c;
  font-size: .56rem;
  font-weight: 950;
  letter-spacing: .14em;
  text-align: center;
}

.wc-tourney-current-round .wc-tourney-advance-portrait,
.wc-tourney-current-round .wc-tourney-advance-pending {
  grid-column: 2;
  grid-row: 2;
  width: 72px;
  height: 67px;
  border: 1px solid #d5b56f88;
}

.wc-tourney-current-round .wc-tourney-advance-slot > strong {
  grid-column: 3;
  grid-row: 2;
  color: #f5d991;
  font-size: clamp(.8rem, 1.2vw, 1.03rem);
  text-align: left;
}

.wc-tourney-current-round .wc-tourney-advance-slot > small {
  grid-column: 1;
  grid-row: 2;
  color: #b09255;
  font-size: .48rem;
  font-weight: 900;
  letter-spacing: .07em;
  text-align: right;
}

.wc-tourney-current-round .wc-tourney-advance-pending {
  gap: 0;
}

.wc-tourney-current-round .wc-tourney-advance-pending span {
  font-size: 1.65rem;
  line-height: 1;
}

.wc-tourney-current-round .wc-tourney-advance-pending strong {
  font-size: .48rem;
}

.wc-tourney-current-round .wc-tourney-advance-pending small {
  display: none;
}

.wc-tourney-current-round .wc-tourney-match.is-complete .wc-tourney-vertical-fork .fork-left,
.wc-tourney-current-round .wc-tourney-match.is-complete .wc-tourney-vertical-fork .fork-right {
  animation: wcVerticalForkDown .45s ease-out both;
}

.wc-tourney-current-round .wc-tourney-match.is-complete .wc-tourney-vertical-fork .fork-join {
  animation: wcVerticalForkAcross .4s .16s ease-out both;
}

.wc-tourney-current-round .wc-tourney-match.is-complete .wc-tourney-vertical-fork .fork-stem {
  animation: wcVerticalForkDown .4s .3s ease-out both;
  transform-origin: top;
}

@keyframes wcVerticalForkDown {
  from { transform: scaleY(.05); opacity: .25; }
  to { transform: scaleY(1); opacity: 1; }
}

@keyframes wcVerticalForkAcross {
  from { transform: scaleX(.05); opacity: .25; }
  to { transform: scaleX(1); opacity: 1; }
}

/* Dramatic, sequential eliminator reveal. The next fighter waits for the
   previous fighter's K.O. stamp and portrait animation to complete. */
.wc-round-eliminator {
  position: relative;
  grid-template-columns: 38px 76px minmax(0, 1fr) auto 56px;
  min-height: 88px;
  border-color: rgba(255, 72, 92, .58);
  background:
    radial-gradient(ellipse at 15% 50%, rgba(255, 38, 67, .2), transparent 45%),
    linear-gradient(100deg, #45151e, #17110f 78%);
  box-shadow: inset 4px 0 #f04459, 0 8px 22px #0008;
  animation: wcEliminatorReveal 1.12s cubic-bezier(.12, .82, .22, 1) both;
}

.wc-round-eliminator::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(105deg, transparent 20%, rgba(255, 255, 255, .18) 48%, transparent 72%);
  transform: translateX(-120%);
  animation: wcEliminatorImpact 1.15s calc(var(--reveal-order, 0) * .88s + .2s) ease-out both;
}

.wc-round-eliminator img {
  width: 72px;
  height: 76px;
  filter: grayscale(.85) contrast(1.25) drop-shadow(0 0 9px #ff314966);
  animation: wcEliminatorPortrait 1s cubic-bezier(.16, 1, .3, 1) both;
}

.wc-round-eliminator strong {
  color: #fff0eb;
  font-size: 1rem;
  text-shadow: 0 0 13px #ff315944;
}

.wc-round-eliminator small {
  color: #ff8796;
  font-size: .62rem;
  letter-spacing: .18em;
}

.wc-round-eliminator-ko {
  display: grid;
  place-items: center;
  width: 50px;
  height: 50px;
  border: 2px solid #ff7184;
  border-radius: 50%;
  color: #fff;
  background: radial-gradient(circle, #a62237, #3d0d18 72%);
  box-shadow: 0 0 18px #ff315977, inset 0 0 12px #fff2;
  font-family: Oxanium, Arial, sans-serif;
  font-size: .92rem;
  font-weight: 1000;
  transform: rotate(-12deg) scale(.55);
  opacity: 0;
  animation: wcKoStamp  .52s calc(var(--reveal-order, 0) * .88s + .5s) cubic-bezier(.16, 1, .3, 1) forwards;
}

@keyframes wcEliminatorReveal {
  0% { opacity: 0; transform: translateX(-42px) scale(.92); filter: brightness(2.2); }
  38% { opacity: 1; transform: translateX(7px) scale(1.015); filter: brightness(1.3); }
  58% { transform: translateX(-3px) scale(1); filter: brightness(1); }
  100% { opacity: 1; transform: translateX(0) scale(1); filter: brightness(.9); }
}

@keyframes wcEliminatorPortrait {
  0% { opacity: 0; transform: translateY(-10px) scale(1.22); filter: grayscale(0) brightness(1.7); }
  45% { opacity: 1; transform: translateY(0) scale(1); }
  100% { opacity: .78; filter: grayscale(.85) contrast(1.25); }
}

@keyframes wcEliminatorImpact {
  0% { transform: translateX(-120%); opacity: 0; }
  30% { opacity: .8; }
  100% { transform: translateX(120%); opacity: 0; }
}

@keyframes wcKoStamp {
  0% { opacity: 0; transform: rotate(-18deg) scale(1.8); }
  65% { opacity: 1; transform: rotate(-10deg) scale(.9); }
  100% { opacity: 1; transform: rotate(-10deg) scale(1); }
}

/* Central start-tournament prompt overlays a live bracket preview. */
.wc-tourney-start-backdrop {
  position: fixed;
  z-index: 9000;
  inset: 0;
  display: grid;
  place-items: center;
  overflow-y: auto;
  padding: 18px;
  background: rgba(3, 5, 7, .76);
  backdrop-filter: blur(5px);
  animation: wcRoundTransitionFade .3s ease both;
}

.wc-tourney-start-dialog {
  width: min(900px, 100%);
  max-height: min(92vh, 900px);
  overflow-y: auto;
  padding: clamp(20px, 3vw, 34px);
  border: 1px solid #f0d68b;
  border-radius: 13px 4px;
  color: #f6efdd;
  background:
    radial-gradient(ellipse at 50% 0%, rgba(220, 173, 81, .26), transparent 53%),
    linear-gradient(145deg, #242016, #0b0e0c 70%);
  box-shadow: 0 26px 90px #000e, 0 0 0 5px #d1a84b22, 0 0 45px #dfba6844;
  text-align: center;
  animation: wcRoundPanelEnter .5s cubic-bezier(.16, 1, .3, 1) both;
}

.wc-tourney-start-kicker {
  margin: 0 0 8px;
  color: #f0d48c;
  font-family: Oxanium, Arial, sans-serif;
  font-size: .62rem;
  font-weight: 1000;
  letter-spacing: .2em;
}

.wc-tourney-start-dialog > h2 {
  margin: 0;
  color: #ffedbd;
  font-family: Oxanium, Arial, sans-serif;
  font-size: clamp(1.8rem, 5vw, 3.4rem);
  font-weight: 1000;
  letter-spacing: .08em;
  text-shadow: 0 0 22px #dfb85d55;
}

.wc-tourney-start-copy {
  margin: 8px 0 18px;
  color: #d0c4a8;
  font-size: .78rem;
}

.wc-tourney-start-preview-heading {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 11px;
  border: 1px solid #b18a4c66;
  border-bottom: 0;
  border-radius: 6px 6px 0 0;
  color: #e8d299;
  background: #1d1b13;
  font-family: Oxanium, Arial, sans-serif;
  font-size: .6rem;
  font-weight: 950;
  letter-spacing: .12em;
  text-align: left;
}

.wc-tourney-start-preview {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  padding: 10px;
  border: 1px solid #b18a4c66;
  border-radius: 0 0 6px 6px;
  background: rgba(5, 7, 7, .5);
}

.wc-tourney-start-match {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 28px minmax(0, 1fr) 16px;
  align-items: center;
  gap: 4px;
  min-width: 0;
  min-height: 108px;
  padding: 18px 5px 5px;
  border: 1px solid #ffffff18;
  border-radius: 5px;
  background: linear-gradient(110deg, #22251c, #10120e);
}

.wc-tourney-start-match-number {
  position: absolute;
  top: 5px;
  left: 8px;
  color: #bba16b;
  font-size: .48rem;
  font-weight: 950;
  letter-spacing: .12em;
}

.wc-tourney-start-entrant {
  min-width: 0;
  display: grid;
  grid-template-columns: 49px minmax(0, 1fr);
  grid-template-rows: 1fr auto;
  align-items: center;
  gap: 2px 6px;
  text-align: left;
}

.wc-tourney-start-portrait {
  grid-row: 1 / span 2;
  width: 49px;
  height: 70px;
  display: grid;
  place-items: end center;
  overflow: hidden;
  border: 1px solid #c8a96255;
  border-radius: 3px;
  color: #d1b46f;
  background: radial-gradient(ellipse at 50% 100%, #bd9b5225, transparent 65%), #12140f;
  font-size: 2rem;
  font-weight: 1000;
}

.wc-tourney-start-portrait img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center bottom;
}

.wc-tourney-start-entrant strong {
  min-width: 0;
  overflow: hidden;
  color: #f0e4c6;
  font-size: .58rem;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wc-tourney-start-entrant small {
  color: #63dfff;
  font-size: .44rem;
  font-weight: 1000;
  letter-spacing: .1em;
}

.wc-tourney-start-vs {
  color: #e5c77d;
  font-family: Oxanium, Arial, sans-serif;
  font-size: .62rem;
}

.wc-tourney-start-advance {
  display: grid;
  place-items: center;
  height: 68px;
  border-left: 2px solid #b48e4c;
  color: #f0d488;
  font-size: 1.1rem;
}

.wc-tourney-start-footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 13px;
  margin-top: 18px;
}

.wc-tourney-start-footer > span {
  color: #c5ad78;
  font-size: .59rem;
  font-weight: 900;
  letter-spacing: .16em;
}

.wc-tourney-start-footer button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  width: min(420px, 100%);
  min-height: 58px;
  border: 1px solid #fff0ad;
  border-radius: 7px 3px;
  color: #1a1408;
  background: linear-gradient(110deg, #fff3bd, #e5bd64 60%, #b98537);
  box-shadow: 0 0 0 3px #e3bc6b23, 0 0 28px #efcb774f, 0 7px 20px #0009;
  font-family: Oxanium, Arial, sans-serif;
  font-size: .92rem;
  font-weight: 1000;
  letter-spacing: .15em;
  cursor: pointer;
  transition: transform .16s ease, filter .16s ease, box-shadow .16s ease;
}

.wc-tourney-start-footer button:hover:not(:disabled) {
  filter: brightness(1.1);
  transform: translateY(-2px) scale(1.015);
  box-shadow: 0 0 0 4px #e3bc6b33, 0 0 38px #efcb7777, 0 10px 25px #000b;
}

.wc-tourney-start-footer button:disabled {
  opacity: .75;
  cursor: wait;
}

.wc-tourney-start-footer button > span {
  font-size: 1.1rem;
}

.wc-tourney-start-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #2a2519;
  border-top-color: transparent;
  border-radius: 50%;
  animation: wcStartSpin .7s linear infinite;
}

@keyframes wcStartSpin { to { transform: rotate(360deg); } }

/* Full standings: champion podium at left, every other rank in a right rail. */
.wc-tourney-final-standings-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(235px, 310px);
  align-items: stretch;
  gap: 18px;
  width: min(100%, 1150px);
  margin: 0 auto;
}

.wc-tourney-final-standings-layout .wc-podium {
  min-width: 0;
  align-self: center;
}

.wc-tourney-placement-list {
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 12px;
  border: 1px solid rgba(205, 168, 94, .42);
  border-radius: 7px;
  background: linear-gradient(155deg, #211d14, #0b0d0b 75%);
  box-shadow: 0 10px 26px #0007, inset 0 1px #fff1;
}

.wc-tourney-placement-list > header {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0 3px 10px;
  border-bottom: 1px solid #d1ac6544;
  text-align: left;
}

.wc-tourney-placement-list > header span {
  color: #c7a76a;
  font-size: .54rem;
  font-weight: 950;
  letter-spacing: .18em;
}

.wc-tourney-placement-list > header strong {
  color: #f4e1b2;
  font-family: Oxanium, Arial, sans-serif;
  font-size: .82rem;
  letter-spacing: .08em;
}

.wc-tourney-placement-entries {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding-top: 9px;
}

.wc-tourney-placement-entry {
  display: grid;
  grid-template-columns: 39px 54px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  min-height: 66px;
  padding: 5px;
  border: 1px solid #ffffff18;
  border-radius: 4px;
  background: linear-gradient(100deg, #2a2418, #10120e);
}

.wc-tourney-placement-rank {
  color: #e3c77f;
  font-family: Oxanium, Arial, sans-serif;
  font-size: .78rem;
  font-weight: 1000;
  text-align: center;
}

.wc-tourney-placement-image {
  width: 50px;
  height: 56px;
  display: grid;
  place-items: end center;
  overflow: hidden;
  border: 1px solid #b89a5e55;
  border-radius: 3px;
  background: #11140f;
}

.wc-tourney-placement-image img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center bottom;
}

.wc-tourney-placement-name {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  text-align: left;
}

.wc-tourney-placement-name strong {
  overflow: hidden;
  color: #eee2c5;
  font-size: .72rem;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wc-tourney-placement-name small {
  color: #9e8a60;
  font-size: .47rem;
  font-weight: 900;
  letter-spacing: .12em;
}

@media (max-width: 760px) {
  .wc-tourney-head-to-head {
    grid-template-columns: minmax(0, 1fr) 30px minmax(0, 1fr);
    gap: 5px;
  }

  .wc-tourney-current-round .wc-tourney-head-to-head .wc-tourney-fighter {
    height: 122px;
    min-height: 122px;
    grid-template-columns: 82px minmax(0, 1fr);
    gap: 6px;
    padding: 5px;
  }

  .wc-tourney-current-round .wc-tourney-head-to-head .wc-tourney-fighter-name {
    font-size: .77rem;
  }

  .wc-tourney-current-round .wc-tourney-head-to-head .wc-tourney-fighter-seed {
    font-size: .38rem;
    letter-spacing: .05em;
  }

  .wc-tourney-current-round .wc-tourney-advance-slot {
    width: min(540px, 95%);
  }

  .wc-tourney-final-standings-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .wc-tourney-final-standings-layout .wc-podium {
    width: min(100%, 560px);
    margin-inline: auto;
  }

  .wc-tourney-placement-entries {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .wc-tourney-start-backdrop {
    padding: 9px;
  }

  .wc-tourney-start-dialog {
    padding: 16px 10px;
  }

  .wc-tourney-start-preview {
    grid-template-columns: minmax(0, 1fr);
  }

  .wc-tourney-start-match {
    min-height: 96px;
  }

  .wc-round-eliminator {
    grid-template-columns: 28px 58px minmax(0, 1fr) auto 42px;
    gap: 6px;
    min-height: 70px;
  }

  .wc-round-eliminator img {
    width: 55px;
    height: 60px;
  }

  .wc-round-eliminator-ko {
    width: 39px;
    height: 39px;
    font-size: .72rem;
  }
}
