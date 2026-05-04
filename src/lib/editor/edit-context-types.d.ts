/**
 * EditContext API TypeScript型定義
 * Chrome/Edge 121+ で利用可能
 */

interface EditContextInit {
  text?: string;
  selectionStart?: number;
  selectionEnd?: number;
}

interface TextUpdateEvent extends Event {
  readonly text: string;
  readonly selectionStart: number;
  readonly selectionEnd: number;
  readonly updateRangeStart: number;
  readonly updateRangeEnd: number;
}

interface TextFormatUpdateEvent extends Event {
  getTextFormats(): TextFormat[];
}

interface TextFormat {
  rangeStart: number;
  rangeEnd: number;
  underlineStyle: string;
  underlineThickness: string;
}

interface CharacterBoundsUpdateEvent extends Event {
  readonly rangeStart: number;
  readonly rangeEnd: number;
}

declare class EditContext extends EventTarget {
  constructor(init?: EditContextInit);

  readonly text: string;
  readonly selectionStart: number;
  readonly selectionEnd: number;
  readonly characterBoundsRangeStart: number;

  updateText(rangeStart: number, rangeEnd: number, text: string): void;
  updateSelection(start: number, end: number): void;
  updateControlBounds(controlBounds: DOMRect): void;
  updateSelectionBounds(selectionBounds: DOMRect): void;
  updateCharacterBounds(rangeStart: number, characterBounds: DOMRect[]): void;

  attachedElements(): HTMLElement[];
  characterBounds(): DOMRect[];

  addEventListener(type: "textupdate", listener: (event: TextUpdateEvent) => void): void;
  addEventListener(type: "textformatupdate", listener: (event: TextFormatUpdateEvent) => void): void;
  addEventListener(type: "characterboundsupdate", listener: (event: CharacterBoundsUpdateEvent) => void): void;
  addEventListener(type: "compositionstart", listener: (event: Event) => void): void;
  addEventListener(type: "compositionend", listener: (event: Event) => void): void;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject): void;
}

interface HTMLElement {
  editContext?: EditContext | null;
}
