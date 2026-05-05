import type { KeyboardEvent as ReactKeyboardEvent } from "react";

/**
 * แปลง keydown จากสแกนเนอร์แบบ keyboard wedge เมื่อ Windows ตั้งคีย์บอร์ดเป็นไทย
 * ให้ได้อักษรแบบ US QWERTY (จาก e.code) แทน e.key ที่กลายเป็นภาษาไทย
 */

const DIGIT_SHIFT: Record<string, [string, string]> = {
  Digit0: ["0", ")"],
  Digit1: ["1", "!"],
  Digit2: ["2", "@"],
  Digit3: ["3", "#"],
  Digit4: ["4", "$"],
  Digit5: ["5", "%"],
  Digit6: ["6", "^"],
  Digit7: ["7", "&"],
  Digit8: ["8", "*"],
  Digit9: ["9", "("],
};

const PUNCT_SHIFT: Record<string, [string, string]> = {
  Minus: ["-", "_"],
  Equal: ["=", "+"],
  BracketLeft: ["[", "{"],
  BracketRight: ["]", "}"],
  Backslash: ["\\", "|"],
  Semicolon: [";", ":"],
  Quote: ["'", '"'],
  Comma: [",", "<"],
  Period: [".", ">"],
  Slash: ["/", "?"],
  Backquote: ["`", "~"],
  IntlBackslash: ["\\", "|"],
};

export type BarcodeScanKeyResult =
  | { kind: "none" }
  | { kind: "backspace" }
  | { kind: "append"; ch: string };

export function barcodeScanKeydown(ev: ReactKeyboardEvent<HTMLInputElement>): BarcodeScanKeyResult {
  if (ev.nativeEvent.isComposing) return { kind: "none" };
  if (ev.ctrlKey || ev.metaKey || ev.altKey) return { kind: "none" };

  const { code, shiftKey } = ev;

  if (code === "Backspace") return { kind: "backspace" };
  if (code === "Enter" || code === "NumpadEnter") return { kind: "none" };

  if (code === "Space") return { kind: "append", ch: " " };

  if (code.startsWith("Numpad")) {
    if (code === "NumpadDecimal") return { kind: "append", ch: "." };
    if (code === "NumpadDivide") return { kind: "append", ch: "/" };
    if (code === "NumpadMultiply") return { kind: "append", ch: "*" };
    if (code === "NumpadSubtract") return { kind: "append", ch: "-" };
    if (code === "NumpadAdd") return { kind: "append", ch: "+" };
    const d = code.replace("Numpad", "");
    if (/^\d$/.test(d)) return { kind: "append", ch: d };
    return { kind: "none" };
  }

  const ds = DIGIT_SHIFT[code];
  if (ds) return { kind: "append", ch: shiftKey ? ds[1] : ds[0] };

  if (/^Key[A-Z]$/.test(code)) {
    const l = code.slice(3).toLowerCase();
    return { kind: "append", ch: shiftKey ? l.toUpperCase() : l };
  }

  const p = PUNCT_SHIFT[code];
  if (p) return { kind: "append", ch: shiftKey ? p[1] : p[0] };

  return { kind: "none" };
}
