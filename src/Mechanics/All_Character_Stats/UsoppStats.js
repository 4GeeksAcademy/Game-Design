import UsoppArenaImage from "../../assets/img/UsoppArena.png";

import ExplodingPineconeImage from "../../assets/img/Attack_IMAGES/ExplodingPinecone.jpeg";
import TabascoStarImage from "../../assets/img/Attack_IMAGES/TabascoStar.jpeg";
import FireBirdStarImage from "../../assets/img/Attack_IMAGES/FireBirdStar.jpeg";
import GasStarImage from "../../assets/img/Attack_IMAGES/GasStar.jpeg";
import FakeHammerImage from "../../assets/img/Attack_IMAGES/FakeHammer.jpeg";
import Attack6 from "../../assets/img/Attack_IMAGES/I-Can't-Go-On-That-Island Disease.gif"

const Usopp = {
  name: "Ussop",
  image: UsoppArenaImage,

  slot: 5, // Maximum attacks this character can equip.

  health: 100,
  mana: 75,
  maximumMana: 75,
  manaRegen: 15,
  cooldown: 4,
  maximumCooldown: 4,
  recovery: 1,
  agility: 15,
  defense: {
    amount: 15,
    active: true,
  },

  attacks: [
    
    {
    name: "Fake Hammer",
    locked: true,
    unlockCost: 5000,
    image: FakeHammerImage,
    turnCooldown: 3,
    damage: 1,
    speed: 45,
    cost: 3,
    state: true,
    debuff: {
      defense: 8,
      agility: 3,
      cooldown: 2,
    },
    // STUN CONFIGURATION
      stun: {
        type: "all", 
        duration: 1, 
      },

      // Only apply stun if the attack successfully hits.
      stunRequiresHit: true,
  },
{
    name: "I-Can't-Go-On-That-Island Disease",
    locked: true,
    unlockCost: 4000,
    image: Attack6,
    damage: 0,
    speed: 0,
    cost: 14,
    state: true,
    buff: {
      mana: 30,
      cooldown: 3,
      maximumCooldown: 3,
      agility: 40,
    },
  },
  {
    name: "Green Star: Exploding Pinecone",
    image: ExplodingPineconeImage,
    damage: 15,
    speed: 40,
    cost: 8,
    state: true,
    debuff: {
      agility: 5,
      defense: 3,
    },
  },

  {
    name: "Tabasco Star",
    image: TabascoStarImage,
    damage: 10,
    speed: 45,
    cost: 10,
    state: true,
    debuff: {
      health: 3,
      mana: 10,
    },
  },

  {
    name: "Fire Bird Star",
    image: FireBirdStarImage,
    damage: 60,
    speed: 50,
    cost: 20,
    debuffRequiresHit: true,
    state: true,
    debuff: {
      defense: 10,
      cooldown: 1,
    },
  },

  {
    name: "Green Star: Gas Star",
      locked: true,
      unlockCost: 500,
    image: GasStarImage,
    damage: 20,
    speed: 25,
    cost: 15,
    state: true,
    debuff: {
      health: 10,
      defense: 5,
      agility: 15,
    },
  },

  
],
};

export default Usopp;
