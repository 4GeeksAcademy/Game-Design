import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { roster } from "./Main Page/CharacterSelection";
import { attackCharacter } from "./Health.js";
import VictoryScreen from "./VictoryScreen.jsx";
import GameOverScreen from "./GameOverScreen.jsx";

// Give each fighter independent stats and attack objects.
function createBattleFighter(id) {
  const selectedFighter = roster.find((fighter) => fighter.id === id);

  if (!selectedFighter?.data) {
    return null;
  }

  const data = selectedFighter.data;

  return {
    ...data,

    id: selectedFighter.id,
    image: selectedFighter.image ?? data.image,

    // Give this fighter independent health and mana values.
    health: data.health,
    maximumHealth: data.maximumHealth ?? data.health,
    mana: data.mana,
    maximumMana: data.maximumMana ?? data.mana,

    // Copy the defense object so it cannot be shared.
    defense:
      typeof data.defense === "object" && data.defense !== null
        ? { ...data.defense }
        : data.defense,

    // Create new attack objects for this specific fighter.
    attacks: (data.attacks ?? []).map((attack) => ({
      ...attack,
      state: true,
      buff: attack.buff ? { ...attack.buff } : attack.buff,
      debuff: attack.debuff ? { ...attack.debuff } : attack.debuff,
    })),

    // Initialize battle-specific state.
    turnFinished: false,
    blocked: false,
  };
}

function FighterPreview({ fighter, isSelected, onClick, team }) {
  const isPlayer = team === "player";

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: isSelected
          ? `3px solid ${isPlayer ? "#13d5ff" : "#ff3159"}`
          : "1px solid #444",
        borderRadius: "10px",
        padding: "16px",
        background: isSelected ? "#252525" : "#191919",
        color: "white",
        minWidth: 0,
        width: "100%",
        textAlign: "left",
        cursor: fighter.health <= 0 ? "not-allowed" : "pointer",
        opacity: fighter.health <= 0 ? 0.45 : 1,
        boxShadow: isSelected
          ? `0 0 14px ${isPlayer ? "#13d5ff66" : "#ff315966"}`
          : "none",
      }}
    >
      <h3>
        {fighter.name}
        {isSelected ? " ✓" : ""}
      </h3>

      {fighter.image && (
        <img
          src={fighter.image}
          alt={fighter.name}
          style={{
            width: "100%",
            maxWidth: "150px",
            height: "150px",
            objectFit: "contain",
          }}
        />
      )}

      <p>
        Health: {fighter.health} / {fighter.maximumHealth}
      </p>

      <p>
        Mana: {fighter.mana} / {fighter.maximumMana}
      </p>

      <p>
        Defense:{" "}
        {typeof fighter.defense === "object"
          ? (fighter.defense?.amount ?? 0)
          : (fighter.defense ?? 0)}
      </p>

      <p>Agility: {fighter.agility ?? 0}</p>

      <h4>Attacks</h4>

      {fighter.attacks.map((attack, index) => (
        <p key={`${fighter.id}-${index}`}>
          {attack.name} — Damage: {attack.damage ?? 0}, Mana: {attack.cost ?? 0}
        </p>
      ))}
    </button>
  );
}

export default function TeamBattle() {
  const [damageDealt, setDamageDealt] = useState(0);
  const [attacksUsed, setAttacksUsed] = useState(0);
  const [combatMessage, setCombatMessage] = useState(
    "Choose your fighter and target.",
  );
  const location = useLocation();
  const [targetAssignments, setTargetAssignments] = useState({});

  const { playerTeamIds = [], opponentTeamIds = [] } = location.state ?? {};

  const [teams, setTeams] = useState(() => ({
    player: playerTeamIds.map(createBattleFighter),
    opponent: opponentTeamIds.map(createBattleFighter),
  }));

  const [activePlayerId, setActivePlayerId] = useState(
    () => playerTeamIds[0] ?? null,
  );

  const [targetOpponentId, setTargetOpponentId] = useState(
    () => opponentTeamIds[0] ?? null,
  );

  const hasValidTeams =
    teams.player.length === 2 &&
    teams.opponent.length === 2 &&
    teams.player.every(Boolean) &&
    teams.opponent.every(Boolean);

  const bothOpponentsAlive = teams.opponent.every(
    (fighter) => fighter.health > 0,
  );

  const [phase, setPhase] = useState("selecting");
  const [roundTargets, setRoundTargets] = useState({});
  const [roundNumber, setRoundNumber] = useState(1);

  const cpuTurnRunning = useRef(false);

  const getTargetAssignedToOtherFighter = (fighterId) => {
    return Object.entries(targetAssignments).find(
      ([assignedFighterId, assignedTargetId]) =>
        assignedFighterId !== fighterId &&
        assignedTargetId === targetOpponentId,
    );
  };

  useEffect(() => {
    if (phase !== "cpu-selecting") return;

    const timer = setTimeout(() => {
      const livingCPU = teams.opponent.filter((fighter) => fighter.health > 0);

      const livingPlayers = teams.player.filter(
        (fighter) => fighter.health > 0,
      );

      const availablePlayers = [...livingPlayers];
      const cpuTargets = {};

      // Each CPU fighter randomly chooses an available player.
      for (const cpu of livingCPU) {
        if (availablePlayers.length === 0) break;

        const randomIndex = Math.floor(Math.random() * availablePlayers.length);

        const chosenPlayer = availablePlayers.splice(randomIndex, 1)[0];

        cpuTargets[cpu.id] = chosenPlayer.id;
      }

      setRoundTargets((previous) => ({
        ...previous,
        ...cpuTargets,
      }));

      setPhase("fighting");
      setCombatMessage("Both teams have selected their targets. Fight!");
    }, 3000);

    return () => clearTimeout(timer);
  }, [phase, teams.player, teams.opponent]);

  useEffect(() => {
    if (phase !== "cpu-fighting") return;

    // Prevent the same CPU turn from starting twice.
    if (cpuTurnRunning.current) return;

    cpuTurnRunning.current = true;

    let cancelled = false;

    const runCPUTurn = async () => {
      try {
        // Make copies so we can simulate the CPU turn safely.
        let updatedPlayers = teams.player.map((fighter) => ({
          ...fighter,
          defense:
            typeof fighter.defense === "object" && fighter.defense !== null
              ? { ...fighter.defense }
              : fighter.defense,
        }));

        let updatedCPU = teams.opponent.map((fighter) => ({
          ...fighter,
          attacks: fighter.attacks.map((attack) => ({
            ...attack,
            buff: attack.buff ? { ...attack.buff } : attack.buff,
            debuff: attack.debuff ? { ...attack.debuff } : attack.debuff,
          })),
          defense:
            typeof fighter.defense === "object" && fighter.defense !== null
              ? { ...fighter.defense }
              : fighter.defense,
        }));

        setCombatMessage("The CPU team is preparing its attacks!");

        // Let the player see the message before combat starts.
        await new Promise((resolve) => setTimeout(resolve, 1000));

        if (cancelled) return;

        // Each living CPU fighter gets a chance to attack.
        for (let cpuIndex = 0; cpuIndex < updatedCPU.length; cpuIndex++) {
          const cpu = updatedCPU[cpuIndex];

          if (cpu.health <= 0) continue;

          const targetId = roundTargets[cpu.id];

          const defenderIndex = updatedPlayers.findIndex(
            (player) => player.id === targetId && player.health > 0,
          );

          // Skip this CPU if its assigned target has been defeated.
          if (defenderIndex === -1) continue;

          const defender = updatedPlayers[defenderIndex];

          // Find all attacks this CPU can currently afford and use.
          const availableAttacks = cpu.attacks
            .map((attack, index) => ({ attack, index }))
            .filter(
              ({ attack }) =>
                attack.state === true && cpu.mana >= (attack.cost ?? 0),
            );

          // Use one randomly selected available attack.
          if (availableAttacks.length > 0) {
            const randomChoice =
              availableAttacks[
                Math.floor(Math.random() * availableAttacks.length)
              ];

            const result = attackCharacter(randomChoice.attack, cpu, defender);

            if (result) {
              setCombatMessage(
                `${cpu.name} used ${randomChoice.attack.name} on ${defender.name}!`,
              );

              // Update the displayed health, mana, and attack state.
              setTeams({
                player: updatedPlayers.map((fighter) => ({ ...fighter })),
                opponent: updatedCPU.map((fighter) => ({ ...fighter })),
              });

              await new Promise((resolve) => setTimeout(resolve, 1200));

              if (cancelled) return;
            }
          }
        }

        if (cancelled) return;

        // Check whether either team has been defeated.
        const livingPlayers = updatedPlayers.filter(
          (fighter) => fighter.health > 0,
        );

        const livingCPU = updatedCPU.filter((fighter) => fighter.health > 0);

        if (livingPlayers.length === 0) {
          setCombatMessage("Defeat! Your entire team has been defeated.");
          setPhase("defeat");
          return;
        }

        if (livingCPU.length === 0) {
          setCombatMessage("Victory! The entire CPU team has been defeated!");
          setPhase("victory");
          return;
        }

        // Prepare both teams for the next round.
        const resetPlayers = updatedPlayers.map((fighter) => ({
          ...fighter,

          // Restore mana for the next round, without exceeding the maximum.
          mana:
            fighter.health > 0
              ? Math.min(
                  fighter.maximumMana ?? fighter.mana,
                  fighter.mana + (fighter.manaRegen ?? 0),
                )
              : fighter.mana,

          turnFinished: false,

          // Make every attack available again.
          attacks: fighter.attacks.map((attack) => ({
            ...attack,
            state: true,
          })),
        }));

        const resetCPU = updatedCPU.map((fighter) => ({
          ...fighter,

          // Regenerate mana for the next round.
          mana:
            fighter.health > 0
              ? Math.min(
                  fighter.maximumMana ?? fighter.mana,
                  fighter.mana + (fighter.manaRegen ?? 0),
                )
              : fighter.mana,

          turnFinished: false,

          attacks: fighter.attacks.map((attack) => ({
            ...attack,
            state: true,
          })),
        }));
        setTeams({
          player: resetPlayers,
          opponent: resetCPU,
        });

        // Clear the old targets so everyone chooses again.
        setRoundTargets({});
        setTargetAssignments({});

        setRoundNumber((previous) => previous + 1);

        // Reopen target selection for the next round.
        setCombatMessage("A new round begins! Choose your targets.");
        setPhase("selecting");
      } finally {
        cpuTurnRunning.current = false;
      }
    };

    runCPUTurn();

    return () => {
      cancelled = true;
    };
  }, [phase]);

  const selectRoundTarget = (fighterId, opponentId) => {
    const fighter = teams.player.find((fighter) => fighter.id === fighterId);

    const opponent = teams.opponent.find(
      (fighter) => fighter.id === opponentId,
    );

    if (!fighter || !opponent) return;
    if (fighter.health <= 0 || opponent.health <= 0) return;

    const anotherFighterHasTarget = Object.entries(roundTargets).some(
      ([assignedFighterId, assignedOpponentId]) =>
        assignedFighterId !== fighterId && assignedOpponentId === opponentId,
    );

    if (anotherFighterHasTarget) {
      setCombatMessage(
        `${opponent.name} is already assigned to your teammate this round.`,
      );
      return;
    }

    setRoundTargets((previous) => ({
      ...previous,
      [fighterId]: opponentId,
    }));

    setCombatMessage(`${fighter.name} will fight ${opponent.name} this round.`);
  };

  const confirmPlayerTargets = () => {
    const livingPlayers = teams.player.filter((fighter) => fighter.health > 0);

    const livingOpponents = teams.opponent.filter(
      (fighter) => fighter.health > 0,
    );

    const requiredTargets = Math.min(
      livingPlayers.length,
      livingOpponents.length,
    );

    const selectedTargets = livingPlayers.filter(
      (fighter) =>
        roundTargets[fighter.id] &&
        livingOpponents.some(
          (opponent) => opponent.id === roundTargets[fighter.id],
        ),
    ).length;

    if (selectedTargets < requiredTargets) {
      setCombatMessage("Choose your available targets before continuing.");
      return;
    }

    setPhase("cpu-selecting");
    setCombatMessage("Your targets are locked! CPU is choosing...");
  };

  const resolvePlayerTurnStatus = (players, opponents, targets) => {
    const updatedPlayers = players.map((player) => {
      // Defeated fighters are automatically finished.
      if (player.health <= 0) {
        return { ...player, turnFinished: true };
      }

      const targetId = targets[player.id];

      const livingTarget = opponents.find(
        (opponent) => opponent.id === targetId && opponent.health > 0,
      );

      // Skip this fighter if they have no living opponent to attack.
      if (!livingTarget) {
        return { ...player, turnFinished: true };
      }

      return player;
    });

    const allLivingPlayersFinished = updatedPlayers.every(
      (player) => player.health <= 0 || player.turnFinished,
    );

    return { updatedPlayers, allLivingPlayersFinished };
  };

  const finishPlayerTurn = (fighterId) => {
    const fighter = teams.player.find((player) => player.id === fighterId);

    if (!fighter || fighter.health <= 0 || fighter.turnFinished) {
      return;
    }

    const playersAfterFinishing = teams.player.map((player) =>
      player.id === fighterId ? { ...player, turnFinished: true } : player,
    );

    const { updatedPlayers, allLivingPlayersFinished } =
      resolvePlayerTurnStatus(
        playersAfterFinishing,
        teams.opponent,
        roundTargets,
      );

    setTeams((previous) => ({
      ...previous,
      player: updatedPlayers,
    }));

    if (allLivingPlayersFinished) {
      setCombatMessage(
        "Your team has finished its turn! The CPU team is preparing to attack.",
      );
      setPhase("cpu-fighting");
    } else {
      setCombatMessage(
        `${fighter.name} has finished their turn. Your teammate can keep fighting!`,
      );
    }
  };

  const useAttack = (attackIndex) => {
    if (phase !== "fighting") return;

    // Copy fighters and their attacks before combat changes their stats.
    const updatedPlayers = teams.player.map((fighter) => ({
      ...fighter,
      defense:
        typeof fighter.defense === "object" && fighter.defense !== null
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
        typeof fighter.defense === "object" && fighter.defense !== null
          ? { ...fighter.defense }
          : fighter.defense,
      attacks: fighter.attacks.map((attack) => ({
        ...attack,
        buff: attack.buff ? { ...attack.buff } : attack.buff,
        debuff: attack.debuff ? { ...attack.debuff } : attack.debuff,
      })),
    }));

    const attacker = updatedPlayers.find(
      (fighter) => fighter.id === activePlayerId,
    );

    const defender = updatedOpponents.find(
      (fighter) => fighter.id === roundTargets[activePlayerId],
    );

    if (!attacker || !defender) return;

    if (attacker.health <= 0 || attacker.turnFinished) {
      return;
    }

    if (defender.health <= 0) {
      setCombatMessage("That opponent has already been defeated.");
      return;
    }

    const attack = attacker.attacks[attackIndex];

    if (!attack || attack.state !== true) {
      setCombatMessage("That attack has already been used.");
      return;
    }

    const defenderHealthBefore = defender.health;

    const result = attackCharacter(attack, attacker, defender);

    if (!result) {
      setCombatMessage("Not enough mana to use that attack!");
      return;
    }

    const actualDamage = Math.max(
      0,
      defenderHealthBefore - Math.max(0, defender.health),
    );

    setDamageDealt((previous) => previous + actualDamage);
    setAttacksUsed((previous) => previous + 1);

    // If every CPU fighter is defeated, finish the battle immediately.
    const livingOpponents = updatedOpponents.filter(
      (fighter) => fighter.health > 0,
    );

    if (livingOpponents.length === 0) {
      setTeams({
        player: updatedPlayers,
        opponent: updatedOpponents,
      });
      setCombatMessage("Victory! The entire CPU team has been defeated!");
      setPhase("victory");
      return;
    }

    // Automatically finish fighters who no longer have a living target.
    const { updatedPlayers: playersAfterSkips, allLivingPlayersFinished } =
      resolvePlayerTurnStatus(updatedPlayers, updatedOpponents, roundTargets);

    setTeams({
      player: playersAfterSkips,
      opponent: updatedOpponents,
    });

    const automaticallySkipped = playersAfterSkips.some((player) => {
      const previousPlayer = teams.player.find(
        (previous) => previous.id === player.id,
      );

      const hasLivingTarget = updatedOpponents.some(
        (opponent) =>
          opponent.id === roundTargets[player.id] && opponent.health > 0,
      );

      return (
        player.health > 0 &&
        player.turnFinished &&
        !previousPlayer?.turnFinished &&
        !hasLivingTarget
      );
    });

    setCombatMessage(
      `${attacker.name} used ${attack.name} on ${defender.name}!${
        automaticallySkipped
          ? " Fighters without a living target have been automatically skipped."
          : ""
      }`,
    );

    // Start the CPU phase only after every living player is finished.
    if (allLivingPlayersFinished) {
      setCombatMessage(
        `${attacker.name} used ${attack.name}! Your team has no remaining actions. The CPU team is preparing to attack.`,
      );
      setPhase("cpu-fighting");
    }
  };

  const resetBattle = () => {
    setTeams({
      player: playerTeamIds.map(createBattleFighter),
      opponent: opponentTeamIds.map(createBattleFighter),
    });

    setActivePlayerId(playerTeamIds[0] ?? null);
    setTargetOpponentId(opponentTeamIds[0] ?? null);

    setTargetAssignments({});
    setRoundTargets({});
    setRoundNumber(1);

    setDamageDealt(0);
    setAttacksUsed(0);

    setCombatMessage("Choose your fighter and target.");
    setPhase("selecting");
  };

  if (!hasValidTeams) {
    return (
      <div style={{ color: "white", padding: "24px" }}>
        <h2>Unable to load the 2v2 teams</h2>
        <p>
          Return to character selection and choose two fighters for each team.
        </p>
        <p>Player team: {playerTeamIds.join(", ") || "No fighters selected"}</p>
        <p>
          Opponent team: {opponentTeamIds.join(", ") || "No fighters selected"}
        </p>
      </div>
    );
  }

  if (phase === "victory") {
    return (
      <VictoryScreen
        damageDealt={damageDealt}
        attacksUsed={attacksUsed}
        message="Your team has defeated the entire opposing team!"
        onRematch={resetBattle}
      />
    );
  }

  if (phase === "defeat") {
    return (
      <GameOverScreen
        damageDealt={damageDealt}
        attacksUsed={attacksUsed}
        message="Your entire team has been defeated. Fight again!"
        onRematch={resetBattle}
      />
    );
  }

  return (
    <main
      style={{
        background: "#101010",
        color: "white",
        minHeight: "100vh",
        padding: "24px",
      }}
    >
      <h1 style={{ textAlign: "center" }}>
        2v2 Team Battle — Round {roundNumber}
      </h1>

      {(phase === "selecting" || phase === "cpu-selecting") && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.8)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "#191919",
              color: "white",
              border: "2px solid #13d5ff",
              borderRadius: "16px",
              padding: "28px",
              width: "min(90%, 500px)",
              maxHeight: "85vh",
              overflowY: "auto",
              textAlign: "center",
            }}
          >
            <h2>Choose Your Opponents</h2>
            <p>Select one opponent for each living teammate.</p>

            {teams.player
              .filter((fighter) => fighter.health > 0)
              .map((fighter) => (
                <div
                  key={fighter.id}
                  style={{
                    marginBottom: "20px",
                    padding: "12px",
                    border: "1px solid #444",
                    borderRadius: "10px",
                  }}
                >
                  <h3>{fighter.name}</h3>

                  {teams.opponent
                    .filter((opponent) => opponent.health > 0)
                    .map((opponent) => {
                      const claimedByTeammate = Object.entries(
                        roundTargets,
                      ).some(
                        ([assignedFighterId, assignedOpponentId]) =>
                          assignedFighterId !== fighter.id &&
                          assignedOpponentId === opponent.id,
                      );

                      const selected = roundTargets[fighter.id] === opponent.id;

                      return (
                        <button
                          key={opponent.id}
                          type="button"
                          disabled={claimedByTeammate}
                          onClick={() =>
                            selectRoundTarget(fighter.id, opponent.id)
                          }
                          style={{
                            display: "block",
                            width: "100%",
                            marginTop: "8px",
                            padding: "12px",
                            borderRadius: "8px",
                            border: selected
                              ? "2px solid #13d5ff"
                              : "1px solid #555",
                            background: selected ? "#163746" : "#252525",
                            color: "white",
                            cursor: claimedByTeammate
                              ? "not-allowed"
                              : "pointer",
                            opacity: claimedByTeammate ? 0.45 : 1,
                          }}
                        >
                          {opponent.name}
                          {selected ? " ✓ Selected" : ""}
                          {claimedByTeammate ? " — Teammate's target" : ""}
                        </button>
                      );
                    })}
                </div>
              ))}

            <button
              type="button"
              disabled={phase !== "selecting"}
              onClick={confirmPlayerTargets}
            >
              {phase === "selecting"
                ? "Confirm Targets"
                : "CPU is selecting..."}
            </button>

            <p>{combatMessage}</p>
          </div>
        </div>
      )}

      {/* CPU TEAM */}
      <section>
        <h2>CPU TEAM</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: "12px",
          }}
        >
          {teams.opponent.map((fighter) => (
            <FighterPreview
              key={fighter.id}
              fighter={fighter}
              team="opponent"
              isSelected={roundTargets[fighter.id] != null}
              onClick={() => {}}
            />
          ))}
        </div>
      </section>

      {/* PLAYER TEAM */}
      <section>
        <h2>PLAYER TEAM</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: "12px",
          }}
        >
          {teams.player.map((fighter) => (
            <FighterPreview
              key={fighter.id}
              fighter={fighter}
              team="player"
              isSelected={fighter.id === activePlayerId}
              onClick={() => {
                if (fighter.health <= 0) return;
                setActivePlayerId(fighter.id);
                const assignedTarget = roundTargets[fighter.id];
                if (assignedTarget) {
                  setTargetOpponentId(assignedTarget);
                }
              }}
            />
          ))}
        </div>
      </section>

      {/* ACTIVE PLAYER'S ATTACKS */}
      <section>
        <h2>
          {teams.player.find((fighter) => fighter.id === activePlayerId)?.name}
          's Attacks
        </h2>

        <p>{combatMessage}</p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: "12px",
          }}
        >
          {(
            teams.player.find((fighter) => fighter.id === activePlayerId)
              ?.attacks ?? []
          ).map((attack, index) => (
            <button
              key={`${activePlayerId}-${index}`}
              type="button"
              disabled={
                phase !== "fighting" ||
                teams.player.find((fighter) => fighter.id === activePlayerId)
                  ?.turnFinished ||
                attack.state !== true ||
                (teams.player.find((fighter) => fighter.id === activePlayerId)
                  ?.mana ?? 0) < (attack.cost ?? 0)
              }
              onClick={() => useAttack(index)}
            >
              <strong>{attack.name}</strong>
              <p>Damage: {attack.damage ?? 0}</p>
              <p>Mana cost: {attack.cost ?? 0}</p>
            </button>
          ))}
        </div>

        <button
          type="button"
          disabled={
            phase !== "fighting" ||
            teams.player.find((fighter) => fighter.id === activePlayerId)
              ?.health <= 0 ||
            teams.player.find((fighter) => fighter.id === activePlayerId)
              ?.turnFinished
          }
          onClick={() => finishPlayerTurn(activePlayerId)}
          style={{
            marginTop: "20px",
            padding: "14px 24px",
            background: "#13d5ff",
            color: "#101010",
            border: "none",
            borderRadius: "8px",
            fontWeight: "bold",
            fontSize: "16px",
            cursor: "pointer",
          }}
        >
          {teams.player.find((fighter) => fighter.id === activePlayerId)
            ?.turnFinished
            ? "Turn Finished"
            : "Finish Turn"}
        </button>
      </section>
    </main>
  );
}
