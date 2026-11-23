// The robot's looks, to choose between (right-click it). Each is described
// in ./shared.js.
import pixel from "./pixel";
import hexapod from "./hexapod";
import quad from "./quad";
import blueprint from "./blueprint";
import snake from "./snake";

export const LOOKS = [pixel, hexapod, quad, blueprint, snake];
export const DEFAULT_LOOK = "pixel";

// Not "robot-look", which held the looks tried while choosing them
const STORAGE_KEY = "robot";

// The look asked for in the address (?robot=hexapod), else the last one
// chosen, else the default
export const chosenLook = () => {
  let id = new URLSearchParams(window.location.search).get("robot");
  if (!LOOKS.some((look) => look.id === id)) {
    try {
      id = window.localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      id = null;
    }
  }
  return LOOKS.find((look) => look.id === id) || LOOKS.find((look) => look.id === DEFAULT_LOOK);
};

export const rememberLook = (id) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch (error) {
    // private mode: the choice lasts this visit
  }
};
