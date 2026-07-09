import { createPortal } from 'react-dom';

// ============================================================
// /src/components/SheetPortal.jsx
// ------------------------------------------------------------
// Monte son contenu directement dans <body>, en dehors de toute
// hiérarchie DOM parente — jamais à l'intérieur d'un conteneur
// `overflow-y: auto` (comme EcranSuperpose) ou d'un ancêtre animé
// par `transform` (comme les sections "animate-rise").
//
// Une sheet en `position: fixed` reste théoriquement positionnée
// par rapport à la fenêtre — mais sur Safari iOS, imbriquée dans un
// ancêtre qui défile, son repositionnement peut ne pas se déclencher
// tant qu'un autre événement (l'apparition du clavier, par exemple)
// ne force pas un nouveau rendu. Le Portal élimine le problème à la
// racine : la sheet n'est plus jamais un DESCENDANT d'un conteneur
// défilant ou transformé.
// ============================================================
export function SheetPortal({ children }) {
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}
