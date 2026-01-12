// src/ui/screens/start.js
// Compatibilidade: versões antigas importavam "start.js".
// A tela de entrada atual está em "splash.js".

import { screenSplash } from "./splash.js";

// Mantém o nome esperado por bootstrap/router antigos
export const screenStart = screenSplash;