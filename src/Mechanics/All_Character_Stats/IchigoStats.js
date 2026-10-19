import IchigoArenaImage from "../../assets/img/Ichigo.png";

import ExplodingPineconeImage from "../../assets/img/Attack_IMAGES/ExplodingPinecone.jpeg";
import TabascoStarImage from "../../assets/img/Attack_IMAGES/TabascoStar.jpeg";
import FireBirdStarImage from "../../assets/img/Attack_IMAGES/FireBirdStar.jpeg";
import GasStarImage from "../../assets/img/Attack_IMAGES/GasStar.jpeg";
import FakeHammerImage from "../../assets/img/Attack_IMAGES/FakeHammer.jpeg";

const Ichigo = {
  name: "Ichigo Kurosaki",
  image: IchigoArenaImage,

  health: 115,
mana: 200,
maximumMana: 200,
manaRegen: 70,
cooldown: 3,
maximumCooldown: 3,
recovery: 1,
agility: 50,
defense: {
amount: 25,
active: true,
},

attacks: [

{
  name: "Flash Step",
  damage: 5,
  speed: 50,
  cost: 14,
  state: true,
  buff: {
    agility: 15,
  },
  debuff: {
    agility: 6,
  },
},

{
name: "Zangetsu Slash",
damage: 55,
speed: 40,
cost: 21,
state: true,
buff: {
agility: 3,
},
debuff: {
defense: 3,
},
},


{
  name: "Getsuga Tenshō",
  damage: 60,
  speed: 40,
  cost: 25,
  state: true,
  buff: {
    mana: 15,
  },
  debuff: {
    health: 5,
    agility: 3,
  },
},

{
  name: "Gran Rey Cero",
  damage: 45,
  speed: 45,
  cost: 40,
  state: true,
  buff: {},
  debuff: {
    agility: 2,
  },
},

{
  name: "Bankai: Tensa Zangetsu",
  damage: 10,
  speed: 40,
  cost: 70,
  state: true,
  buff: {
    mana: 180,
    agility: 50,
    defense: 5,
    maximumCooldown: 2,
    cooldown: 2,
    recovery: 2
  },
},

],
};

export default Ichigo;
