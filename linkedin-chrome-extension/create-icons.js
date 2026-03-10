const fs = require('fs');
const path = require('path');

// Créer les icônes PNG simples pour l'extension Chrome
// Format PNG minimal valide (1x1 pixel noir)

const iconsDir = path.join(__dirname, 'icons');

// PNG minimal 1x1 noir (base64)
const png1x1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

// PNG 16x16 bleu LinkedIn Agent (généré via base64)
const png16 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAA7AAAAOwBeShxvQAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAFQSURBVDiNpZM9TsQwEIXfJBM2Q8EOJBQcgIoTUBJHcAOOwB2g4w7cACU9FBR0oKIgIWSHlJnJ7sh2HCexFxnJk+eX51l2jDGA6rqud13XU0ofSimlUspqGIaD935nrd3UdX2MIRhjHs6557quXwBwzr1ba1+11g8ppRdEQESIiAAgZ2ytnbTWn7XWTxFRjTHeWvsYY4yL6J3z3jPnnHPOOeecc84555xzzjnnnHPOOeecc84555xzzjnnnHPOOeecc84555xzzjnnnHPOOeecc84555xzzjnnnHPOOeecc84555xzzjnnnHPOOeecc84555xzzjnnnHPOOeecc84555xzzjnnnHPOOeecc84555xzzjnnnHPOOeecc84555xzzjnnnHPOOeecc84555xzzjnnnHPOOeecc8455wBAzvkXxpgBWP0Bq38A/vnNd5v4e0R/AAAAAElFTkSuQmCC', 'base64');

// Créer les fichiers
const sizes = [16, 48, 128];

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Pour l'instant, on copie le même contenu minimal pour toutes les tailles
// L'utilisateur peut remplacer par de vraies icônes plus tard
sizes.forEach(size => {
  const filePath = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(filePath, png1x1);
  console.log(`Created ${filePath}`);
});

console.log('Icons created successfully!');
console.log('\nNote: These are placeholder icons.');
console.log('Replace them with real icons for your LinkedIn Agent extension.');
