
export const START_NAVBAR_HEIGHT = 4.8
export const END_NAVBAR_HEIGHT = 3.2

export const TITLE_START_FONT_SIZE = 4.8;
export const TITLE_END_FONT_SIZE = 2.4;

export const TITLE_TOP_START_POSITION = 0.0001;
export const TITLE_TOP_END_POSITION = 43;

export const TITLE_START_WIDTH = 100;
export const TITLE_END_WIDTH = 28;

// function calculateExponentialNewValue(startValue, endValue, scrollPercent, delayFactor=1){
//     scrollPercent = scrollPercent ** delayFactor;
//     return (endValue**scrollPercent) * (startValue ** (1-scrollPercent))
// }

function calculateLinearNewValue(startValue, endValue, scrollPercent, delayFactor=1){
    scrollPercent = scrollPercent ** 1;
    return startValue + ((endValue - startValue) * scrollPercent)
}

export function calculateNewValueAfterScroll(startValue, endValue, scrollPercent, delayFactor){
    return calculateLinearNewValue(startValue, endValue, scrollPercent, delayFactor)
}