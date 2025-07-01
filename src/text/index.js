import rawText from "./text.json";

const mediaURL =
  "https://raw.githubusercontent.com/sumanth-tangirala/personal-webpage/main/media";
const docsURL = `https://docs.google.com/viewer?url=${mediaURL}/docs`;
const imgURL = `${mediaURL}/img`;

const updatedText = JSON.stringify(rawText)
  .replaceAll("%MEDIA_URL%", mediaURL)
  .replaceAll("%DEBUG_LOCAL_IMG_URL%", "/debug_imgs")
  .replaceAll("%IMG_URL%", imgURL)
  .replaceAll("%DOCS_URL%", docsURL);

export default JSON.parse(updatedText);
