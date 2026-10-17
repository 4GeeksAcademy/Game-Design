import IchigoArenaImage from "../../assets/img/Ichigo.png";

import ExplodingPineconeImage from "../../assets/img/Attack_IMAGES/ExplodingPinecone.jpeg";
import TabascoStarImage from "../../assets/img/Attack_IMAGES/TabascoStar.jpeg";
import FireBirdStarImage from "../../assets/img/Attack_IMAGES/FireBirdStar.jpeg";
import GasStarImage from "../../assets/img/Attack_IMAGES/GasStar.jpeg";
import FakeHammerImage from "../../assets/img/Attack_IMAGES/FakeHammer.jpeg";

const Ichigo = {
  name: "Ichigo Kurosaki",
  image: IchigoArenaImage,

  health: 110,
mana: 75,
maximumMana: 75,
manaRegen: 20,
cooldown: 3,
maximumCooldown: 3,
recovery: 1,
agility: 35,
defense: {
amount: 15,
active: true,
},

attacks: [
{
name: "Zangetsu Slash",
damage: 20,
speed: 40,
cost: 12,
state: true,
buff: {
agility: 3,
},
debuff: {
defense: 3,
},
},

{
  name: "Flash Step",
  damage: 10,
  speed: 50,
  cost: 18,
  state: true,
  buff: {
    agility: 8,
  },
  debuff: {
    agility: 4,
  },
},

{
  name: "Getsuga Tenshō",
  damage: 35,
  speed: 30,
  cost: 30,
  state: true,
  buff: {
    defense: 3,
  },
  debuff: {
    health: 5,
    agility: 3,
  },
},

{
  name: "Bankai: Tensa Zangetsu",
  damage: 45,
  speed: 35,
  cost: 45,
  state: true,
  buff: {
    agility: 10,
    defense: 5,
  },
  debuff: {
    health: 8,
    defense: 5,
  },
},

],
};

export default Ichigo;
