/**
 * カスタムカーソル（SVG data URI）
 * 戯曲エディタ用のテーマカーソル
 */

// 筆ペンカーソル
export const CURSOR_PEN = `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><path d='M3 21l1.5-4.5L17.5 3.5c.8-.8 2-.8 2.8 0s.8 2 0 2.8L7.5 19.5 3 21z' stroke='%23333' stroke-width='1.5' fill='white'/><path d='M14.5 6.5l3 3' stroke='%23333' stroke-width='1.5'/><circle cx='4' cy='20' r='1' fill='%23333'/></svg>") 2 22, text`;

// 開いた手（ドラッグハンドルホバー）
export const CURSOR_GRAB = `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><path d='M9 14V9a1 1 0 012 0v5m0-4V7a1 1 0 012 0v5m0-3V8a1 1 0 012 0v5m0-2v-1a1 1 0 012 0v4c0 3-2 5-5 5s-4-1.5-4-4v-2a1 1 0 012 0v1' stroke='%23333' stroke-width='1.2' fill='none'/></svg>") 12 12, grab`;

// 握った手（ドラッグ中）
export const CURSOR_GRABBING = `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><rect x='7' y='11' width='11' height='8' rx='3' stroke='%23333' stroke-width='1.2' fill='%23fef3c7'/><path d='M9 11c0-1 .5-1.5 1-1.5M11.5 10c0-1 .5-1.5 1-1.5M14 9.5c0-1 .5-1.5 1-1.5M16.5 10c0-1 .5-1.5 1-1.5' stroke='%23333' stroke-width='1' fill='none'/></svg>") 12 12, grabbing`;
