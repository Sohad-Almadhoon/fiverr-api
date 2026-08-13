// Single source of truth for gig categories on the API side. The client has a
// mirrored list with the display labels and images.
// The app previously offered only 4 values (animation/web/design/music) while
// the navbar and home page advertised ten different ones, so nothing lined up.
export const CATEGORIES = [
  "graphics-design",
  "digital-marketing",
  "writing-translation",
  "video-animation",
  "music-audio",
  "programming-tech",
  "ai-services",
  "business",
  "data",
  "photography",
  "lifestyle",
];

export const isValidCategory = (cat) => CATEGORIES.includes(cat);
