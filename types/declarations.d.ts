// Ambient type declarations for non-TypeScript asset modules and package CSS

declare module "highlight.js/styles/*.css" {
  const content: string;
  export default content;
}

declare module "*.css" {
  const content: string;
  export default content;
}

