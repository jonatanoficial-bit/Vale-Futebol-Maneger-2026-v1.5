// src/ui/screens/slotSelect.js
import { screenSaveSlots } from "./saveSlots.js";

// Compatibilidade: versões antigas chamavam "slotSelect"
export async function screenSlotSelect(ctx) {
  return screenSaveSlots(ctx);
}