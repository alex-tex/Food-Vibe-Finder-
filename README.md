![24_15_53_1831](https://github.com/user-attachments/assets/dc0eb78b-8718-4643-95ef-4133ce509292)


# Food Vibe Finder

Trouvez le spot parfait selon votre mood. Décrivez l’ambiance, le style ou l’envie (“cozy, épicé, street-food, brunch chill”), et l’appli classe les lieux proches grâce à Gemini et OpenStreetMap/Leaflet.

- Carte: Leaflet + tuiles OSM
- Recherche: autour d’un centre (votre position ou un lieu saisi)
- Classement: Gemini (modèle configurable), score 0–100% par adéquation au “vibe”

## Prérequis

- Navigateur moderne (Chrome, Edge, Firefox)
- Une clé d’API Gemini (Google AI)
  - Obtenez une clé sur https://aistudio.google.com/
  - Dans les restrictions de la clé, autorisez temporairement les “HTTP referrers” (localhost) pour le dev local

## Installation

Cloner le repo et ouvrir dans VS Code  

## Configuration de la clé Gemini (obligatoire)

L’app appelle l’API Gemini côté client. Remplacez le placeholder "GEMINI_API_KEY" dans `Scripts/ai.js` par votre clé gemini.
