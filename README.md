# EcoTree Tracker 🌳

Calculate tree's carbon absorption, oxygen production & environmental impact

## Features ✨

- 🌳 **50+ Indian Tree Species** database
- 📊 **Industry-Standard Calculations** - Based on validated allometric equations (Chave et al. 2005, IPCC Guidelines)
- 💨 **CO₂ & Oxygen Tracking** - Annual sequestration & production
- 💰 **Economic Value** - Carbon credit calculations in ₹
- 📱 **PWA Support** - Install on phone/desktop
- 💾 **History Tracking** - Save calculations locally
- 📄 **PDF Export** - Download & share results
- 🎨 **Responsive Design** - Mobile, tablet, desktop

## Live Demo 🚀

[View Live App](https://durgeshkr01.github.io/eco-tree-tracker/)

## Tech Stack 🛠️

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **PWA**: Service Worker, Manifest
- **Backend**: Firebase (Firestore, Hosting)
- **Libraries**: html2pdf.js, Font Awesome

## Installation 📲

### Option 1: Install as PWA
Visit the live demo and click **"Install App"** button

### Option 2: Run Locally
```bash
# Clone repository
git clone https://github.com/Durgeshkr01/eco-tree-tracker.git

# Navigate to directory
cd eco-tree-tracker

# Start local server
python -m http.server 8000

# Open browser
http://localhost:8000
```

## How to Use 📖

1. **Select Tree Species** from dropdown (50+ Indian trees)
2. **Enter Height** (supports meters/feet/cm)
3. **Enter DBH** - Diameter at Breast Height (cm/inches)
4. **Optional**: Add age and location
5. **Click Calculate** to see results
6. **Download PDF** or **Share** results

## Calculations 🔬

Based on **Indian Forestry Standards** (Forest Survey of India + International Methods):

### Methods Used:
1. **Chave et al. (2005)** - Tropical Forest Allometric Equations
   - AGB = exp(-2.977 + 2.568 × ln(ρ × D²))
   
2. **FSI Volume-Based Method** - Species-specific volume tables
   - Uses Biomass Expansion Factor (BEF) = 1.6
   
3. **Brown (1989)** - IPCC Pantropical Equation
   - AGB = exp(-2.134 + 2.530 × ln(D)) × (ρ/0.60)

### Weighted Average:
- **Final AGB** = (Chave × 50%) + (FSI × 30%) + (Brown × 20%)
- **BGB** (Below-Ground) = AGB × 0.15-0.25 (size-dependent)
- **Carbon Stored** = Total Biomass × 0.47 (IPCC standard)
- **CO₂ Equivalent** = Carbon × 3.67 (molecular weight ratio)
- **O₂ Production** = Carbon × 2.67 × Activity Factor

### Species-Specific:
- **Wood Density (ρ)**: Uses actual values for 50+ Indian tree species
- **Root Ratio**: Varies with tree size (15-25%)
- **O₂ Activity**: Adjusted for tree maturity

## Tree Species Database 🌲

Includes popular Indian trees:
- Neem, Mango, Peepal, Banyan
- Teak, Sal, Sheesham, Bamboo
- Fruit trees: Coconut, Guava, Jackfruit
- Medicinal: Amla, Arjuna, Tulsi
- And 40+ more species

## Screenshots 📸

*(Add screenshots here after deployment)*

## Firebase Setup 🔥

1. Create Firebase project
2. Enable Firestore & Hosting
3. Update `firebase-config.js` with your credentials
4. Deploy:
```bash
firebase login
firebase init hosting
firebase deploy
```

## Contributing 🤝

Contributions are welcome! Feel free to:
- Add more tree species
- Improve calculations
- Fix bugs
- Enhance UI/UX

## License 📄

MIT License - feel free to use for your projects

## Author 👨‍💻

**Durgesh Kumar**
- GitHub: [@Durgeshkr01](https://github.com/Durgeshkr01)

## Acknowledgments 🙏

- Research paper for biomass calculation formulas
- Font Awesome for icons
- Firebase for hosting & backend

---

Made with 💚 for a greener planet 🌍
