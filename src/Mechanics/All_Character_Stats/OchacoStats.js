import OchacoArenaImage from "../../assets/img/Ochaco.png";

import ExplodingPineconeImage from "../../assets/img/Attack_IMAGES/ExplodingPinecone.jpeg";
import TabascoStarImage from "../../assets/img/Attack_IMAGES/TabascoStar.jpeg";
import FireBirdStarImage from "../../assets/img/Attack_IMAGES/FireBirdStar.jpeg";
import GasStarImage from "../../assets/img/Attack_IMAGES/GasStar.jpeg";
import FakeHammerImage from "../../assets/img/Attack_IMAGES/FakeHammer.jpeg";

const Ochaco = {
  name: "Ochaco Uraraka",
  image: OchacoArenaImage,

  health: 100,
  mana: 65,
  maximumMana: 65,
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
    cost: 30,
    state: true,
    debuff: {
      defense: 10,
      cooldown: 1,
    },
  },

  {
    name: "Green Star: Gas Star",
    image: GasStarImage,
    damage: 20,
    speed: 25,
    cost: 18,
    state: true,
    debuff: {
      health: 10,
      defense: 5,
      agility: 15,
    },
  },

  {
    name: "Fake Hammer",
    image: FakeHammerImage,
    damage: 1,
    speed: 30,
    cost: 10,
    state: true,
    debuff: {
      defense: 8,
      agility: 3,
      cooldown: 2,
    },
  },
],
};

export default Ochaco;
