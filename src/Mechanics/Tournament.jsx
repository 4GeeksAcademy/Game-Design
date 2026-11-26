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
function getTournamentUsername(tournament) {
  let savedUsername = "";
  try {
    savedUsername = typeof window !== "undefined"
      ? (window.localStorage.getItem("wildCardsUsername") || "")
      : "";
  } catch {
    savedUsername = "";
  }
  return String(
    tournament?.username ||
    tournament?.player?.username ||
    tournament?.player?.userName ||
    savedUsername ||
    "PLAYER 1"
  ).trim().replace(/^@/, "") || "PLAYER 1";
}
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



function resolveCpuWinner(one, two) {
  if (!one) return two || null;
  if (!two) return one || null;
  try {
    return simulateCpuMatch(one, two) || one;
  } catch (error) {
    console.error("[Wild Cards Tournament] Placement simulation failed; using a stable fallback:", error);
    return one;
  }
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

function getPlaceLabel(place) {
  const suffix = place === 1 ? "ST" : place === 2 ? "ND" : place === 3 ? "RD" : "TH";
  return `${place}${suffix} PLACE`;
}

// Resolve placement matches once when the elimination board is revealed. Reuse
// those results later so the podium cannot contradict the reveal animation.
function getEliminationRankings(tournament) {
  const rounds = tournament.rounds || [];
  const semifinalRound = rounds[rounds.length - 2] || [];
  const semifinalLosers = semifinalRound
    .map((match) => (match.fighters || []).find(
      (fighter) => fighter && fighter.id !== match.winner?.id,
    ))
    .filter(Boolean);
  const placementResults = { ...(tournament.placementResults || {}) };
  const bronzePending = tournament.placementOpportunity?.type === "bronze" &&
    !placementResults.bronzeWinner;
  const entries = [];

  if (tournament.size === 8) {
    const quarterfinalLosers = (rounds[0] || [])
      .map((match) => (match.fighters || []).find(
        (fighter) => fighter && fighter.id !== match.winner?.id,
      ))
      .filter(Boolean);
    const quarterPairs = [
      quarterfinalLosers.slice(0, 2),
      quarterfinalLosers.slice(2, 4),
    ];
    const consolationWinners = quarterPairs.map((pair, index) =>
      placementResults.consolationWinners?.[index] ||
      resolveCpuWinner(pair[0], pair[1])
    );
    const consolationLosers = quarterPairs.map((pair, index) =>
      pair.find((fighter) => fighter.id !== consolationWinners[index]?.id) || null
    );

    if (
      quarterfinalLosers.length === 4 &&
      consolationWinners.every(Boolean) &&
      consolationLosers.every(Boolean)
    ) {
      const fifthPlaceWinner = placementResults.fifthPlaceWinner ||
        resolveCpuWinner(consolationWinners[0], consolationWinners[1]);
      const seventhPlaceWinner = placementResults.seventhPlaceWinner ||
        resolveCpuWinner(consolationLosers[0], consolationLosers[1]);
      const sixthPlace = consolationWinners.find((fighter) => fighter.id !== fifthPlaceWinner?.id);
      const eighthPlace = consolationLosers.find((fighter) => fighter.id !== seventhPlaceWinner?.id);

      if (fifthPlaceWinner && seventhPlaceWinner && sixthPlace && eighthPlace) {
        placementResults.consolationWinners = consolationWinners;
        placementResults.fifthPlaceWinner = fifthPlaceWinner;
        placementResults.seventhPlaceWinner = seventhPlaceWinner;
        entries.push(
          { fighter: eighthPlace, place: 8, rankLabel: getPlaceLabel(8), detail: "FINAL TOURNAMENT POSITION" },
          { fighter: seventhPlaceWinner, place: 7, rankLabel: getPlaceLabel(7), detail: "FINAL TOURNAMENT POSITION" },
          { fighter: sixthPlace, place: 6, rankLabel: getPlaceLabel(6), detail: "FINAL TOURNAMENT POSITION" },
          { fighter: fifthPlaceWinner, place: 5, rankLabel: getPlaceLabel(5), detail: "FINAL TOURNAMENT POSITION" },
        );
      } else {
        quarterfinalLosers.forEach((fighter) => entries.push({
          fighter,
          place: null,
          rankLabel: "5TH–8TH",
          detail: "QUARTERFINAL ELIMINATION",
        }));
      }
    } else {
      // Keep the semifinal recap available even if a consolation pairing is incomplete.
      quarterfinalLosers.forEach((fighter) => entries.push({
        fighter,
        place: null,
        rankLabel: "5TH–8TH",
        detail: "QUARTERFINAL ELIMINATION",
      }));
    }
  }

  if (bronzePending) {
    semifinalLosers.forEach((fighter) => entries.push({
      fighter,
      place: null,
      rankLabel: "3RD / 4TH",
      detail: "BRONZE-MEDAL MATCH PENDING",
      pending: true,
    }));
  } else if (semifinalLosers.length === 2) {
    const bronzeWinner = placementResults.bronzeWinner ||
      resolveCpuWinner(semifinalLosers[0], semifinalLosers[1]);
    const bronzeLoser = semifinalLosers.find((fighter) => fighter.id !== bronzeWinner?.id);
    if (bronzeWinner && bronzeLoser) {
      placementResults.bronzeWinner = bronzeWinner;
      entries.push(
        { fighter: bronzeLoser, place: 4, rankLabel: getPlaceLabel(4), detail: "FINAL TOURNAMENT POSITION" },
        { fighter: bronzeWinner, place: 3, rankLabel: getPlaceLabel(3), detail: "FINAL TOURNAMENT POSITION" },
      );
    } else {
      semifinalLosers.forEach((fighter) => entries.push({
        fighter,
        place: null,
        rankLabel: "3RD / 4TH",
        detail: "SEMIFINAL ELIMINATION",
      }));
    }
  } else {
    semifinalLosers.forEach((fighter) => entries.push({
      fighter,
      place: null,
      rankLabel: "3RD / 4TH",
      detail: "SEMIFINAL ELIMINATION",
    }));
  }

  return {
    entries: entries.filter((entry) => entry.fighter),
    placementResults,
  };
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
    resolveCpuWinner(semifinalLosers[0], semifinalLosers[1]);
  const bronzeLoser = semifinalLosers.find((fighter) => fighter.id !== bronzeWinner.id);
  tournament.thirdPlaceMatch = {
    fighters: semifinalLosers,
    winner: bronzeWinner,
  };

  if (tournament.size === 4) {
    const placements = [champion, runnerUp, bronzeWinner, bronzeLoser];
    const bronzeOpponent = semifinalLosers.find((fighter) => fighter.id !== tournament.player.id);
    if (tournament.forcedPlacement === 3) {
      placements[2] = tournament.player;
      placements[3] = bronzeOpponent;
    } else if (tournament.forcedPlacement === 4) {
      placements[2] = bronzeOpponent;
      placements[3] = tournament.player;
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
  const consolationWinners = quarterPairs.map((pair, index) =>
    tournament.placementResults?.consolationWinners?.[index] ||
    resolveCpuWinner(pair[0], pair[1]),
  );
  const consolationLosers = quarterPairs.map((pair, index) =>
    pair.find((fighter) => fighter.id !== consolationWinners[index].id),
  );
  const fifthPlaceWinner = tournament.placementResults?.fifthPlaceWinner ||
    resolveCpuWinner(consolationWinners[0], consolationWinners[1]);
  const seventhPlaceWinner = tournament.placementResults?.seventhPlaceWinner ||
    resolveCpuWinner(consolationLosers[0], consolationLosers[1]);
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
  } else if (tournament.forcedPlacement === 4) {
    placements[2] = semifinalLosers.find((fighter) => fighter.id !== tournament.player.id);
    placements[3] = tournament.player;
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
    ].filter(Boolean).join(" ")}>
      <div className={"wc-tourney-portrait" + (mystery ? " is-mystery" : "")}>
        {mystery
          ? <span>?</span>
          : fighter
            ? <img src={fighterImage(fighter)} alt={fighterName(fighter)} />
            : <span>—</span>}
      </div>
      <span className="wc-tourney-fighter-name">
        {mystery ? "UNKNOWN CONTENDER" : fighter ? fighterName(fighter) : "TO BE DECIDED"}
      </span>
      {player && <small>YOU</small>}
      {winner && <small>WINNER</small>}
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
    <article className={"wc-tourney-match" + (activePlayerMatch ? " is-player-match" : "")}>
      <div className="wc-tourney-match-heading">
        <span>{roundLabel} · MATCH {String(matchIndex + 1).padStart(2, "0")}</span>
        <span>{match.winner ? "COMPLETE" : revealing ? "DRAWING CONTENDERS" : "WINNER ADVANCES"}</span>
      </div>
      <div className="wc-tourney-matchup">
        <TournamentFighter
          fighter={shownFirst}
          mystery={firstMystery}
          player={firstIsPlayer}
          eliminated={Boolean(match.winner && !winnerIsFirst)}
          winner={winnerIsFirst}
          revealing={revealing && !firstIsPlayer}
        />
        <span className="wc-tourney-versus">VS</span>
        <TournamentFighter
          fighter={shownSecond}
          mystery={secondMystery}
          player={secondIsPlayer}
          eliminated={Boolean(match.winner && !winnerIsSecond)}
          winner={winnerIsSecond}
          revealing={revealing && !secondIsPlayer}
        />
      </div>
      <div className={"wc-tourney-advance-fork" + (match.winner ? " is-complete" : "")}>
        <div className="wc-tourney-fork-lines" aria-hidden="true">
          <i className="fork-branch fork-branch-left" />
          <i className="fork-branch fork-branch-right" />
          <i className="fork-bridge" />
          <i className="fork-stem" />
        </div>
        <div className={"wc-tourney-advance-card" + (match.winner ? " has-winner" : "")}>
          {match.winner ? (
            <>
              <img src={fighterImage(match.winner)} alt={fighterName(match.winner)} />
              <div>
                <small className="wc-tourney-advance-card-label">ADVANCES TO NEXT ROUND</small>
                <strong>{fighterName(match.winner)}</strong>
                <small>WINNER · ADVANCING</small>
              </div>
            </>
          ) : (
            <>
              <span className="wc-tourney-advance-card-crown">♛</span>
              <div>
                <small>ADVANCEMENT SLOT</small>
                <strong>WINNER ADVANCES</strong>
              </div>
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
            <p className="wc-round-transition-kicker">{transition.completedRoundLabel} · FINAL PLACEMENTS</p>
            <h2 id="wcRoundTransitionTitle">ELIMINATED CONTENDERS</h2>
            <p className="wc-round-transition-caption">EVERY ELIMINATED FIGHTER · FINAL TOURNAMENT PLACEMENTS</p>
            <div className="wc-round-eliminators">
              {transition.eliminators.map((entry, index) => (
                <article
                  className={
                    "wc-round-eliminator" +
                    (index <= transition.revealIndex ? " is-visible" : "") +
                    (index === transition.revealIndex ? " is-revealing" : "")
                  }
                  key={entry.fighter.id}
                >
                  <span className="wc-round-eliminator-rank">{entry.rankLabel}</span>
                  <img src={fighterImage(entry.fighter)} alt={fighterName(entry.fighter)} />
                  <div className="wc-round-eliminator-details">
                    <strong>{fighterName(entry.fighter)}</strong>
                    <small>{entry.detail}</small>
                  </div>
                  <span className={"wc-round-eliminator-status" + (entry.pending ? " is-pending" : "")}>
                    {entry.pending ? "PENDING" : "ELIMINATED"}
                  </span>
                </article>
              ))}
            </div>
            <span className="wc-round-transition-progress">PLACEMENTS CONFIRMED · NEXT ROUND READY</span>
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
                  <div className="wc-round-standing-fork" aria-hidden="true">
                    <i /><i /><i />
                  </div>
                </article>
              ))}
            </div>
            <span className="wc-round-transition-progress">FINALISTS LOCKED IN</span>
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

  function presentRoundTransition(completedRounds, nextRound, nextRoundIndex, bracketSize, sourceTournament) {
    let ranking = {
      entries: [],
      placementResults: { ...(sourceTournament.placementResults || {}) },
    };

    try {
      ranking = getEliminationRankings(sourceTournament);
    } catch (error) {
      console.error("[Wild Cards Tournament] Could not calculate exact elimination places:", error);
    }

    const standings = (nextRound || []).map((match) => [...(match.fighters || [])]);
    const fallbackEliminators = (completedRounds || [])
      .flatMap((round) => round.map((match) => ({
        fighter: (match.fighters || []).find(
          (fighter) => fighter && fighter.id !== match.winner?.id,
        ),
        place: null,
        rankLabel: "ELIMINATED",
        detail: "FINAL TOURNAMENT POSITION",
      })))
      .filter((entry) => entry.fighter);
    const eliminators = ranking.entries?.length ? ranking.entries : fallbackEliminators;

    sourceTournament.placementResults = ranking.placementResults || sourceTournament.placementResults || {};
    publishTournament(sourceTournament);

    if (!standings.length || !eliminators.length) {
      console.warn("[Wild Cards Tournament] The round transition had no complete matchup or elimination data.");
      return Promise.resolve();
    }

    // Keep the completed round visible long enough for each winner's fork to draw.
    sourceTournament.displayRoundIndex = Math.max(0, nextRoundIndex - 1);
    publishTournament(sourceTournament);
    await new Promise((resolve) => window.setTimeout(resolve, 1500));

    setRoundTransition({
      phase: "eliminators",
      revealIndex: 0,
      completedRoundLabel: bracketSize === 4 ? "SEMIFINALS COMPLETE" : "QUARTERFINALS & SEMIFINALS COMPLETE",
      nextRoundLabel: getRoundLabel(bracketSize, nextRoundIndex),
      eliminators,
      standings,
    });

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

    if (roundTransition.phase === "eliminators") {
      const lastEntry = roundTransition.revealIndex >= roundTransition.eliminators.length - 1;
      const timer = window.setTimeout(() => {
        setRoundTransition((current) => {
          if (!current || current.phase !== "eliminators") return current;
          return lastEntry
            ? { ...current, phase: "standings" }
            : { ...current, revealIndex: current.revealIndex + 1 };
        });
      }, 900);
      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(() => {
      setRoundTransition((current) => current ? { ...current, phase: "ready" } : current);
      playUISound("click");
    }, 4800);

    return () => window.clearTimeout(timer);
  }, [roundTransition?.phase, roundTransition?.revealIndex]);

  function completeTournament(next) {
    const finished = next?.complete && Array.isArray(next.placements)
      ? next
      : finishTournamentDraft(next);
    setTournament(finished);
    setShowEliminationScreen(false);
    setShowResults(true);
    setSpectating(false);
    setRoundTransition(null);
    setActiveCpuMatch(null);
    skipCpuQueueRef.current = true;
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
          await presentRoundTransition(draft.rounds.slice(0, roundIndex), round, roundIndex, draft.size, draft);
          if (skipCpuQueueRef.current) {
            setSpectating(false);
            return;
          }
          draft.displayRoundIndex = roundIndex;
          publishTournament(draft);
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
          await presentRoundTransition(draft.rounds.slice(0, roundIndex), round, roundIndex, draft.size, draft);
          if (skipCpuQueueRef.current) return;
          draft.displayRoundIndex = roundIndex;
          publishTournament(draft);
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
        ...(updated.placementResults || {}),
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
            updated,
          );
          if (skipCpuQueueRef.current) return;
          updated.displayRoundIndex = nextRoundIndex;
          publishTournament(updated);
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

  function forfeitPlacement() {
    if (!tournament || spectating) return;
    const guaranteedPlace =
      tournament.placementOpportunity?.type === "bronze" ? 4 : 8;

    // Forfeit is not Watch Mode: resolve unfinished matches immediately and
    // open the final podium without mounting the CPU battle screen.
    skipCpuQueueRef.current = true;
    roundTransitionResolveRef.current?.();
    roundTransitionResolveRef.current = null;
    setRoundTransition(null);

    const finished = completeRemainingMatches({
      ...tournament,
      started: true,
      playerEliminated: true,
      forcedPlacement: guaranteedPlace,
      rounds: copyRounds(tournament.rounds),
    });

    playUISound("back");
    completeTournament(finished);
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

  if (tournament?.complete) {
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
    const roundLabels = tournament.size === 4
      ? ["SEMIFINALS", "FINAL"]
      : ["QUARTERFINALS", "SEMIFINALS", "FINAL"];
    const requestedRoundIndex = Number.isInteger(tournament.displayRoundIndex)
      ? tournament.displayRoundIndex
      : (tournament.currentRound || 0);
    const activeRoundIndex = Math.min(
      Math.max(0, requestedRoundIndex),
      Math.max(0, tournament.rounds.length - 1),
    );
    const activeRound = tournament.rounds[activeRoundIndex] || [];

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
          <section className="wc-tourney-player-card" aria-label="Your tournament player card">
            <div className="wc-tourney-player-card-art">
              <img src={fighterImage(tournament.player)} alt={fighterName(tournament.player)} />
              <span>WILD CARDS · PLAYER CARD</span>
            </div>
            <div className="wc-tourney-player-card-copy">
              <small>@{getTournamentUsername(tournament)}</small>
              <strong>{fighterName(tournament.player)}</strong>
              <span>{tournament.playerEliminated ? "ELIMINATED" : "IN THE RUNNING"}</span>
            </div>
          </section>
        </div>

        {revealing && (
          <div className="wc-tourney-reveal-status" role="status">
            <span className="wc-tourney-reveal-spinner" />
            <strong>THE CONTENDERS ARE BEING DRAWN</strong>
          </div>
        )}

        <section className="wc-tourney-rounds wc-tourney-single-round" aria-label={roundLabels[activeRoundIndex] + " matchups"}>
          <section className="wc-tourney-round" key={activeRoundIndex}>
            <div className="wc-tourney-round-title">
              <span>ROUND {activeRoundIndex + 1} OF {tournament.rounds.length}</span>
              <h2>{roundLabels[activeRoundIndex] || "CHAMPIONSHIP"}</h2>
              <small>{activeRound.length} MATCH{activeRound.length === 1 ? "" : "ES"}</small>
            </div>
            <div className="wc-tourney-round-matches">
              {activeRound.map((match, matchIndex) => (
                <TournamentMatch
                  key={match.id}
                  match={match}
                  matchIndex={matchIndex}
                  tournament={tournament}
                  revealing={revealing}
                  previewFighters={revealPreview?.[match.id]}
                  onEnterMatch={enterMatch}
                  roundLabel={roundLabels[activeRoundIndex] || "CHAMPIONSHIP"}
                />
              ))}
            </div>
          </section>
        </section>

        {tournament.playerEliminated && showEliminationScreen && !tournament.complete && (
          <section className="wc-tourney-elimination-panel">
            <div className="wc-tourney-elimination-mark">K.O.</div>
            <div>
              <strong>{tournament.placementOpportunity?.type === "bronze" ? "A SHOT AT THIRD PLACE REMAINS" : "YOUR RUN HAS ENDED"}</strong>
              <span>
                {tournament.placementOpportunity?.type === "bronze"
                  ? "Play the bronze-medal match to earn third place, or forfeit and accept fourth."
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
                ? "FORFEIT · ACCEPT 4TH"
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
