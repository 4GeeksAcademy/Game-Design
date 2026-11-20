import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { roster } from "./CharacterSelection.jsx";
import { getUnlockedCharacters } from "../Currency.js";
import { skins } from "../Skins.js";

import {
  getOwnedSkins,
  getEquippedSkin,
  getEquippedSkins,
  getCharacterImage,
  equipSkin,
  unequipSkin,
} from "../SkinManager.js";

import "./Inventory.css";

const rarityTiers = [
  { id: "common", label: "COMMON" },
  { id: "uncommon", label: "UNCOMMON" },
  { id: "rare", label: "RARE" },
  { id: "epic", label: "EPIC" },
  { id: "legendary", label: "LEGENDARY" },
];

function getRarity(skin) {
  return (skin.rarity ?? "common").toLowerCase();
}

function SkinGallery({
  ownedSkinIds,
  equippedSkins,
  onEquipSkin,
  onUnequipSkin,
}) {
  return (
    <section className="inventory-gallery-section">
      <div className="inventory-welcome">
        <h2>SKIN COLLECTION</h2>

        <p>
          Explore every alternate appearance available in Wild Cards.
          Unlock rare costumes, customize your fighters, and build your
          collection.
        </p>

        <span className="inventory-character-count">
          {ownedSkinIds.length} / {skins.length} SKINS OWNED
        </span>
      </div>

      {/* RARITY KEY */}
      <section className="skin-rarity-key">
        <div className="inventory-section-heading">
          <h3>RARITY GUIDE</h3>
        </div>

        <div className="skin-rarity-list">
          {rarityTiers.map((rarity) => (
            <span
              key={rarity.id}
              className={`skin-rarity-badge rarity-${rarity.id}`}
            >
              {rarity.label}
            </span>
          ))}
        </div>

        <p>Higher rarity skins are generally more difficult to obtain.</p>
      </section>

      {/* ALL REGISTERED SKINS */}
      <section className="inventory-gallery">
        <div className="inventory-section-heading">
          <h3>ALL AVAILABLE SKINS</h3>
          <span>{skins.length} RELEASED</span>
        </div>

        {skins.length > 0 ? (
          <div className="inventory-skin-grid">
            {skins.map((skin) => {
              const isOwned = ownedSkinIds.includes(skin.id);

              const isEquipped = equippedSkins[skin.characterId] === skin.id;

              const character = roster.find(
                (fighter) => fighter.id === skin.characterId,
              );

              const rarity = getRarity(skin);

              return (
                <article
                  className={`inventory-skin-card ${
                    isOwned ? "skin-owned" : "skin-locked"
                  }`}
                  key={skin.id}
                >
                  <div className="inventory-skin-image">
                    <img src={skin.image} alt={skin.name} />

                    {!isOwned && (
                      <div className="inventory-skin-lock">
                        <span>🔒</span>
                        <strong>LOCKED</strong>
                      </div>
                    )}

                    {isEquipped && (
                      <span className="inventory-skin-equipped">EQUIPPED</span>
                    )}
                  </div>

                  <div className="inventory-skin-info">
                    <span className={`skin-rarity-badge rarity-${rarity}`}>
                      {rarity.toUpperCase()}
                    </span>

                    <strong>{skin.name}</strong>

                    <span className="inventory-skin-character">
                      {character?.data.name ?? skin.characterId}
                    </span>

                    <p>{skin.description}</p>

                    {isOwned ? (
                      isEquipped ? (
                        <button
                          type="button"
                          className="inventory-skin-button unequip"
                          onClick={() => onUnequipSkin(skin.characterId)}
                        >
                          UNEQUIP
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="inventory-skin-button equip"
                          onClick={() => onEquipSkin(skin)}
                        >
                          EQUIP SKIN
                        </button>
                      )
                    ) : (
                      <button
                        type="button"
                        className="inventory-skin-button locked"
                        disabled
                      >
                        NOT UNLOCKED
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="inventory-empty">
            <span>◇</span>
            <h3>NO SKINS RELEASED</h3>
            <p>New skins will appear here when they are added to the game.</p>
          </div>
        )}
      </section>
    </section>
  );
}


const EFFECT_LABELS = {
  maximumHealth: "MAX HEALTH", maximumMana: "MAX MANA",
  manaRegen: "MANA REGEN", health: "HEALTH", mana: "MANA",
  defense: "DEFENSE", agility: "AGILITY", cooldown: "COOLDOWN",
  maximumCooldown: "MAX COOLDOWN", recovery: "RECOVERY",
  damage: "DAMAGE", speed: "SPEED", cost: "MANA COST",
};

function formatEffectValue(value) {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "YES" : "NO";
  if (typeof value === "number") return value > 0 ? `+${value}` : String(value);
  return String(value);
}

function EffectDetails({ title, value, tone = "neutral" }) {
  if (value === null || value === undefined || value === false) return null;
  if (typeof value !== "object") {
    return (
      <div className={`inventory-effect-card ${tone}`}>
        <strong>{title}</strong><span>{formatEffectValue(value)}</span>
      </div>
    );
  }

  const entries = Object.entries(value).filter(([, item]) =>
    item !== null && item !== undefined && item !== false
  );
  if (!entries.length) return null;

  return (
    <section className={`inventory-effect-group ${tone}`}>
      <h4>{title}</h4>
      <div className="inventory-effect-grid">
        {entries.map(([key, item]) => {
          const label = EFFECT_LABELS[key] ?? key.replace(/([A-Z])/g, " $1").toUpperCase();
          if (item && typeof item === "object" && !Array.isArray(item)) {
            return <EffectDetails key={key} title={label} value={item} tone={tone} />;
          }
          if (Array.isArray(item)) {
            return (
              <div className="inventory-effect-card" key={key}>
                <strong>{label}</strong><span>{item.map(String).join(", ")}</span>
              </div>
            );
          }
          return (
            <div className="inventory-effect-card" key={key}>
              <strong>{label}</strong><span>{formatEffectValue(item)}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function AttackDetails({ attack, characterName, onClose }) {
  if (!attack) return null;
  const hasEffects = ["buff", "debuff", "heal", "stun", "sacrifice",
    "attackModifiers", "characterModifiers"].some((key) => attack[key]);
  const knownKeys = new Set(["id", "name", "image", "description", "damage",
    "speed", "cost", "state", "buff", "debuff", "heal", "stun", "sacrifice",
    "attackModifiers", "characterModifiers", "duration", "uses", "remainingUses",
    "turnCooldown", "cooldownRemaining", "buffRequiresHit", "debuffRequiresHit",
    "stunRequiresHit"]);
  const extraDetails = Object.fromEntries(
    Object.entries(attack).filter(([key, value]) =>
      !knownKeys.has(key) && value !== undefined && value !== null && value !== false
    )
  );

  return (
    <div className="inventory-attack-modal-backdrop" onClick={onClose}>
      <section className="inventory-attack-modal" role="dialog" aria-modal="true"
        aria-label={attack.name + " details"} onClick={(event) => event.stopPropagation()}>
        <button type="button" className="inventory-attack-close" onClick={onClose}
          aria-label="Close attack details">×</button>
        <div className="inventory-attack-modal-heading">
          {attack.image ? <img src={attack.image} alt={attack.name} /> : (
            <div className="inventory-attack-no-image">NO ARTWORK</div>
          )}
          <div>
            <p>{characterName} · MOVE BREAKDOWN</p>
            <h2>{attack.name}</h2>
            {attack.description && <span>{attack.description}</span>}
          </div>
        </div>

        <div className="inventory-attack-core-stats">
          <div><span>DAMAGE</span><strong>{attack.damage ?? 0}</strong></div>
          <div><span>SPEED</span><strong>{attack.speed ?? 0}</strong></div>
          <div><span>MANA COST</span><strong>{attack.cost ?? 0}</strong></div>
          {attack.uses !== undefined && <div><span>USES</span><strong>{attack.uses}</strong></div>}
          {attack.turnCooldown > 0 && <div><span>COOLDOWN</span><strong>{attack.turnCooldown} TURNS</strong></div>}
          {attack.duration > 0 && <div><span>DURATION</span><strong>{attack.duration} TURNS</strong></div>}
        </div>

        {attack.buff && <EffectDetails title="BUFFS · SELF ENHANCEMENTS" value={attack.buff} tone="positive" />}
        {attack.debuff && <EffectDetails title="DEBUFFS · OPPONENT PENALTIES" value={attack.debuff} tone="negative" />}
        {attack.heal && <EffectDetails title="HEALING · SUPPORT EFFECTS" value={attack.heal} tone="positive" />}
        {attack.stun && <EffectDetails title="STUN · DISABLED OPPONENT ATTACKS" value={attack.stun} tone="warning" />}
        {attack.sacrifice && <EffectDetails title="SACRIFICE · USER COST" value={attack.sacrifice} tone="negative" />}
        {attack.attackModifiers && <EffectDetails title="ATTACK MODIFIERS" value={attack.attackModifiers} tone="modifier" />}
        {attack.characterModifiers && <EffectDetails title="CHARACTER STAT MODIFIERS" value={attack.characterModifiers} tone="modifier" />}
        {attack.buffRequiresHit && <p className="inventory-effect-note">Self-buffs only activate when this attack successfully connects.</p>}
        {attack.debuffRequiresHit && <p className="inventory-effect-note">Debuffs only apply when this attack successfully connects.</p>}
        {attack.stunRequiresHit && <p className="inventory-effect-note">Stun only applies when this attack successfully connects.</p>}
        {Object.keys(extraDetails).length > 0 && <EffectDetails title="ADDITIONAL ATTACK EFFECTS" value={extraDetails} />}
        {!hasEffects && Object.keys(extraDetails).length === 0 && (
          <p className="inventory-no-effects">This move has no additional buffs, debuffs, healing, stun, or stat modifiers.</p>
        )}
      </section>
    </div>
  );
}

function Inventory() {
  const navigate = useNavigate();

  // Load the player's unlocked characters.
  const [unlockedIds, setUnlockedIds] = useState(() => getUnlockedCharacters());

  // Track the character currently being viewed.
  const [selectedCharacterId, setSelectedCharacterId] = useState(null);

  // Track skin ownership and equipment.
  const [ownedSkinIds, setOwnedSkinIds] = useState(() => getOwnedSkins());

  const [equippedSkins, setEquippedSkins] = useState(() => getEquippedSkins());

  const [activeTab, setActiveTab] = useState("characters");
  const [selectedAttack, setSelectedAttack] = useState(null);

  // Refresh character and skin data.
  useEffect(() => {
    const updateUnlocks = () => {
      setUnlockedIds(getUnlockedCharacters());
    };

    const updateSkins = () => {
      setOwnedSkinIds(getOwnedSkins());
      setEquippedSkins(getEquippedSkins());
    };

    window.addEventListener("unlocksUpdated", updateUnlocks);
    window.addEventListener("skinsUpdated", updateSkins);

    return () => {
      window.removeEventListener("unlocksUpdated", updateUnlocks);
      window.removeEventListener("skinsUpdated", updateSkins);
    };
  }, []);

  // Only display characters the player owns.
  const ownedCharacters = roster.filter((fighter) =>
    unlockedIds.includes(fighter.id),
  );

  // Find the selected character using their ID.
  const selectedCharacter =
    ownedCharacters.find((fighter) => fighter.id === selectedCharacterId) ??
    null;

  // Automatically select the first owned character.
  useEffect(() => {
    if (ownedCharacters.length === 0) {
      setSelectedCharacterId(null);
      return;
    }

    const selectionStillOwned = ownedCharacters.some(
      (fighter) => fighter.id === selectedCharacterId,
    );

    if (!selectionStillOwned) {
      setSelectedCharacterId(ownedCharacters[0].id);
    }
  }, [unlockedIds, selectedCharacterId]);

  // Get the skins belonging to the selected character.
  const characterSkins = selectedCharacter
    ? skins.filter((skin) => skin.characterId === selectedCharacter.id)
    : [];

  // Get the selected character's equipped skin.
  const equippedSkinId = selectedCharacter
    ? getEquippedSkin(selectedCharacter.id)
    : null;

  // Equip or remove a skin.
  const handleEquipSkin = (skin) => {
    const success = equipSkin(skin.id);

    if (success) {
      setOwnedSkinIds(getOwnedSkins());
      setEquippedSkins(getEquippedSkins());
    }
  };

  const handleUnequipSkin = (characterId) => {
    const success = unequipSkin(characterId);

    if (success) {
      setOwnedSkinIds(getOwnedSkins());
      setEquippedSkins(getEquippedSkins());
    }
  };

  // Show the currently equipped artwork in the profile portrait.
  const selectedCharacterImage = selectedCharacter
    ? getCharacterImage(selectedCharacter.id, selectedCharacter.image)
    : null;

  return (
    <main className="inventory-screen">
      <header className="inventory-header">
        <button className="inventory-back-button" onClick={() => navigate("/")}>
          ← BACK
        </button>

        <div className="inventory-title">
          <p>YOUR COLLECTION</p>
          <h1>INVENTORY</h1>
        </div>
      </header>

      <nav className="inventory-navigation">
        <button
          className={`inventory-tab ${
            activeTab === "characters" ? "active" : ""
          }`}
          onClick={() => setActiveTab("characters")}
        >
          CHARACTERS
        </button>

        <button
          className={`inventory-tab ${activeTab === "gallery" ? "active" : ""}`}
          onClick={() => setActiveTab("gallery")}
        >
          SKIN GALLERY
        </button>

        <button className="inventory-tab" disabled>
          ATTACKS
          <span>COMING SOON</span>
        </button>
      </nav>

      <section className="inventory-content">
        {activeTab === "characters" ? (
          <>
            <div className="inventory-welcome">
              <h2>YOUR FIGHTERS</h2>

              <p>
                Select a character to explore their attacks, available costumes,
                and customization options.
              </p>

              <span className="inventory-character-count">
                {ownedCharacters.length} FIGHTERS OWNED
              </span>
            </div>

            {/* OWNED CHARACTER COLLECTION */}
            <section className="inventory-character-section">
              <div className="inventory-section-heading">
                <h3>CHARACTER COLLECTION</h3>

                <span>{ownedCharacters.length} OWNED</span>
              </div>

              {ownedCharacters.length > 0 ? (
                <div className="inventory-character-grid">
                  {ownedCharacters.map((fighter) => (
                    <button
                      key={fighter.id}
                      type="button"
                      className={`inventory-character-card ${
                        selectedCharacterId === fighter.id ? "selected" : ""
                      }`}
                      onClick={() => setSelectedCharacterId(fighter.id)}
                    >
                      <div className="inventory-character-image">
                        <img src={fighter.image} alt={fighter.data.name} />
                      </div>

                      <div className="inventory-character-info">
                        <strong>{fighter.data.name}</strong>
                        <span>{fighter.description}</span>
                      </div>

                      {selectedCharacterId === fighter.id && (
                        <span className="inventory-selected-label">
                          SELECTED
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="inventory-empty">
                  <span>⚔</span>
                  <h3>NO FIGHTERS FOUND</h3>
                  <p>Unlock a character to add them to your collection.</p>
                </div>
              )}
            </section>

            {/* SELECTED CHARACTER DETAILS */}
            {selectedCharacter && (
              <section className="inventory-character-details">
                <div className="inventory-details-heading">
                  <p>CHARACTER PROFILE</p>
                  <h2>{selectedCharacter.data.name}</h2>
                  <span>{selectedCharacter.description}</span>
                </div>

                <div className="inventory-details-layout">
                  <div className="inventory-details-portrait">
                    <img
                      src={selectedCharacterImage}
                      alt={selectedCharacter.data.name}
                    />

                    {equippedSkinId && (
                      <span className="inventory-equipped-portrait-label">
                        SKIN EQUIPPED
                      </span>
                    )}
                  </div>

                  <div className="inventory-details-content">
                    <h3>COMBAT INFORMATION</h3>

                    <div className="inventory-character-stats">
                      <div>
                        <span>HEALTH</span>
                        <strong>{selectedCharacter.data.health}</strong>
                      </div>

                      <div>
                        <span>MANA</span>
                        <strong>{selectedCharacter.data.maximumMana}</strong>
                      </div>

                      <div>
                        <span>AGILITY</span>
                        <strong>{selectedCharacter.data.agility}</strong>
                      </div>
                    </div>

                    <h3>AVAILABLE ATTACKS</h3>

                    <div className="inventory-attacks-list">
                      {Array.isArray(selectedCharacter.data.attacks) &&
                        selectedCharacter.data.attacks.map((attack) => (
                          <button
                            type="button"
                            className="inventory-attack-item"
                            key={attack.id ?? attack.name}
                            onClick={() => setSelectedAttack(attack)}
                            aria-label={`View ${attack.name} effects and details`}
                          >
                            {attack.image && <img className="inventory-attack-thumb" src={attack.image} alt="" />}
                            <span className="inventory-attack-name"><strong>{attack.name}</strong><small>VIEW MOVE DETAILS</small></span>
                            <span>{attack.damage ?? 0} DAMAGE <b>↗</b></span>
                          </button>
                        ))}
                    </div>

                    {selectedAttack && (
                      <AttackDetails
                        attack={selectedAttack}
                        characterName={selectedCharacter.data.name}
                        onClose={() => setSelectedAttack(null)}
                      />
                    )}

                    {/* CHARACTER SKINS */}
                    <section className="inventory-skins-section">
                      <div className="inventory-skins-heading">
                        <div>
                          <p>CUSTOMIZATION</p>
                          <h3>CHARACTER SKINS</h3>
                        </div>

                        <span>
                          {
                            characterSkins.filter((skin) =>
                              ownedSkinIds.includes(skin.id),
                            ).length
                          }{" "}
                          / {characterSkins.length} OWNED
                        </span>
                      </div>

                      {characterSkins.length > 0 ? (
                        <div className="inventory-skin-grid">
                          {characterSkins.map((skin) => {
                            const isOwned = ownedSkinIds.includes(skin.id);
                            const isEquipped =
                              equippedSkins[selectedCharacter.id] === skin.id;

                            return (
                              <article
                                className={`inventory-skin-card ${
                                  isOwned ? "skin-owned" : "skin-locked"
                                }`}
                                key={skin.id}
                              >
                                <div className="inventory-skin-image">
                                  <img src={skin.image} alt={skin.name} />

                                  {!isOwned && (
                                    <div className="inventory-skin-lock">
                                      <span>🔒</span>
                                      <strong>LOCKED</strong>
                                    </div>
                                  )}

                                  {isEquipped && (
                                    <span className="inventory-skin-equipped">
                                      EQUIPPED
                                    </span>
                                  )}
                                </div>

                                <div className="inventory-skin-info">
                                  <strong>{skin.name}</strong>

                                  <span
                                    className={`skin-rarity-badge rarity-${getRarity(skin)}`}
                                  >
                                    {getRarity(skin).toUpperCase()}
                                  </span>

                                  <p>{skin.description}</p>

                                  {isOwned ? (
                                    isEquipped ? (
                                      <button
                                        type="button"
                                        className="inventory-skin-button unequip"
                                        onClick={() =>
                                          handleUnequipSkin(
                                            selectedCharacter.id,
                                          )
                                        }
                                      >
                                        UNEQUIP
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        className="inventory-skin-button equip"
                                        onClick={() => handleEquipSkin(skin)}
                                      >
                                        EQUIP SKIN
                                      </button>
                                    )
                                  ) : (
                                    <button
                                      type="button"
                                      className="inventory-skin-button locked"
                                      disabled
                                    >
                                      NOT UNLOCKED
                                    </button>
                                  )}
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="inventory-no-skins">
                          <span>◇</span>
                          <p>
                            No alternate skins have been released for this
                            character yet.
                          </p>
                        </div>
                      )}
                    </section>
                  </div>
                </div>
              </section>
            )}
          </>
        ) : (
          <SkinGallery
            ownedSkinIds={ownedSkinIds}
            equippedSkins={equippedSkins}
            onEquipSkin={handleEquipSkin}
            onUnequipSkin={handleUnequipSkin}
          />
        )}
      </section>
    </main>
  );
}

export default Inventory;
