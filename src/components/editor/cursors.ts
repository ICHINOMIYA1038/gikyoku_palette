/**
 * カスタムカーソル（SVG data URI）
 * 戯曲エディタ用のテーマカーソル
 */

// 筆ペンカーソル（通常のテキスト入力時）
const penSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
  <path d="M3 21l1.5-4.5L17.5 3.5c.8-.8 2-.8 2.8 0s.8 2 0 2.8L7.5 19.5 3 21z" stroke="%23333" stroke-width="1.5" fill="%23fff"/>
  <path d="M14.5 6.5l3 3" stroke="%23333" stroke-width="1.5"/>
  <circle cx="4" cy="20" r="1" fill="%23333"/>
</svg>`;

// 開いた手（ドラッグハンドルホバー）
const grabSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
  <path d="M8 13V7.5a1.5 1.5 0 013 0V12M11 11.5V6.5a1.5 1.5 0 013 0V12M14 11V8a1.5 1.5 0 013 0v4.5" stroke="%23333" stroke-width="1.2" stroke-linecap="round"/>
  <path d="M17 12.5V14c0 3-2 5-5 5s-5-2-5-5v-2a1.5 1.5 0 013 0V12" stroke="%23333" stroke-width="1.2" stroke-linecap="round"/>
  <path d="M8 12V7.5M11 12V6.5M14 12V8M17 12.5V8" stroke="%23333" stroke-width="1.2" stroke-linecap="round" opacity="0.3"/>
</svg>`;

// 握った手（ドラッグ中）
const grabbingSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
  <path d="M8 12h9c1 0 1.5.5 1.5 1.5V15c0 3-2 5-5 5s-5-2-5-5v-1.5C8.5 12.5 8 12 8 12z" stroke="%23333" stroke-width="1.2" fill="%23fef3c7"/>
  <path d="M8.5 12.5c0-.8.7-1.5 1.5-1.5M11 11c0-.8.7-1.5 1.5-1.5M13.5 10c0-.8.7-1.5 1.5-1.5M16 10.5c0-.8.7-1.5 1.5-1.5" stroke="%23333" stroke-width="1.2" stroke-linecap="round"/>
</svg>`;

export const CURSOR_PEN = `url("data:image/svg+xml,${encodeURIComponent(penSvg.replace(/\n/g, ''))}") 2 22, text`;
export const CURSOR_GRAB = `url("data:image/svg+xml,${encodeURIComponent(grabSvg.replace(/\n/g, ''))}") 12 12, grab`;
export const CURSOR_GRABBING = `url("data:image/svg+xml,${encodeURIComponent(grabbingSvg.replace(/\n/g, ''))}") 12 12, grabbing`;
