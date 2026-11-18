/// <reference types="vite/client" />

declare module 'virtual:zooloo-tokens.css';
declare module '*.module.css' {
  const classes: Readonly<Record<string, string>>;
  export default classes;
}
