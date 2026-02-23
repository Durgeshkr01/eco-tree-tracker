// Indian Forestry Calculator
// Based on Forest Survey of India (FSI) & Chave et al. (2005, 2014) Methods
// Allometric Equations for Indian Tropical/Subtropical Forests

class IndianForestryCalculator {
    constructor() {
        // Indian Carbon Market Price (₹/ton CO2)
        this.CARBON_PRICE_PER_TON = 1800; // Updated 2026 Indian carbon credit price
        this.OXYGEN_PER_PERSON_YEAR = 730; // kg O2/person/year
        this.CAR_EMISSION_PER_KM = 0.12; // kg CO2/km
        this.HOME_ENERGY_PER_DAY = 10; // kg CO2/day
        
        // Species-specific Wood Density (ρ) in g/cm³ - FSI Data
        this.woodDensity = {
            // Common Indian Trees (Scientific names)
            'Neem': 0.68,
            'Mango': 0.56,
            'Peepal': 0.51,
            'Banyan': 0.48,
            'Jamun': 0.72,
            'Ashoka': 0.65,
            'Gulmohar': 0.62,
            'Amaltas': 0.59,
            'Teak': 0.55,  // Premium timber
            'Coconut': 0.45,
            'Guava': 0.74,
            'Papaya': 0.35, // Soft wood
            'Jackfruit': 0.60,
            'Tamarind': 0.81, // Very dense
            'Pomegranate': 0.70,
            'Custard Apple': 0.55,
            'Lemon': 0.68,
            'Amla': 0.71,
            'Arjuna': 0.78, // Very dense medicinal tree
            'Harad': 0.83,
            'Baheda': 0.79,
            'Tulsi': 0.40, // Herb/shrub
            'Sal': 0.86,  // Heavy hardwood
            'Sheesham': 0.77,
            'Eucalyptus': 0.69,
            'Bamboo': 0.60,
            'Pine': 0.52,
            'Deodar': 0.56,
            'Oak': 0.75,
            'Babul': 0.76,
            'Neem Tree': 0.68,
            'default': 0.60  // Average for tropical trees
        };
        
        // Growth form factors
        this.BREAST_HEIGHT = 1.37; // meters (DBH measurement standard)
    }

    // Get wood density for species
    getWoodDensity(speciesName) {
        if (!speciesName) return this.woodDensity['default'];
        
        // Extract common name (e.g., "Neem (Azadirachta indica)" → "Neem")
        const match = speciesName.match(/^([^(]+)/);
        const commonName = match ? match[1].trim() : speciesName;
        
        return this.woodDensity[commonName] || this.woodDensity['default'];
    }

    // Convert Circumference to DBH (Diameter at Breast Height)
    convertCircumferenceToDiameter(circumferenceCm) {
        // Formula: DBH = Circumference / π
        return circumferenceCm / Math.PI;
    }

    // METHOD 1: Chave et al. (2005) - For Dry Tropical Forests (Most of India)
    // Formula: AGB = 0.0509 × ρ × D²H (when height is known)
    // Without height: AGB = exp(-2.977 + ln(ρD²) × 2.568)
    calculateAGB_Chave(dbhCm, woodDensity, heightM = null) {
        const dbhM = dbhCm / 100; // Convert cm to meters
        
        if (heightM) {
            // With height measurement
            // AGB (kg) = 0.0509 × ρ × D² × H
            const agb = 0.0509 * woodDensity * Math.pow(dbhM, 2) * heightM;
            return agb;
        } else {
            // Without height (DBH-only) - Modified Chave equation
            // AGB (kg) = exp(-2.977 + 2.568 × ln(ρ × D²))
            const agb = Math.exp(-2.977 + 2.568 * Math.log(woodDensity * Math.pow(dbhM, 2)));
            return agb;
        }
    }

    // METHOD 2: FSI Volume-based Method
    // Uses species-specific volume tables → biomass
    calculateAGB_FSI(dbhCm, woodDensity, heightM = null) {
        const dbhM = dbhCm / 100;
        
        // FSI Volume equation (simplified): V = 0.5 × π × (D/2)² × H × form_factor
        // Without height, estimate: H ≈ 2.5 × D^0.6 (for tropical trees)
        const estimatedHeight = heightM || (2.5 * Math.pow(dbhM, 0.6));
        const formFactor = 0.45; // Average form factor for Indian trees
        
        const volume = 0.5 * Math.PI * Math.pow(dbhM / 2, 2) * estimatedHeight * formFactor; // m³
        const BEF = 1.6; // Biomass Expansion Factor (FSI standard)
        
        // AGB = Volume × Wood Density × BEF
        const agb = volume * (woodDensity * 1000) * BEF; // kg
        return agb;
    }

    // METHOD 3: Brown (1989) - Pantropical equation (used by IPCC)
    calculateAGB_Brown(dbhCm, woodDensity) {
        const dbhM = dbhCm / 100;
        // AGB (kg) = exp(-2.134 + 2.530 × ln(D))
        // Modified with wood density adjustment
        const agb = Math.exp(-2.134 + 2.530 * Math.log(dbhM * 100)) * (woodDensity / 0.60);
        return agb;
    }

    // INDIAN WEIGHTED AVERAGE METHOD (Combines all 3)
    calculateAGB_Indian(dbhCm, woodDensity, heightM = null) {
        const agb_chave = this.calculateAGB_Chave(dbhCm, woodDensity, heightM);
        const agb_fsi = this.calculateAGB_FSI(dbhCm, woodDensity, heightM);
        const agb_brown = this.calculateAGB_Brown(dbhCm, woodDensity);
        
        // Weighted average (Chave 50%, FSI 30%, Brown 20%)
        const agb = (agb_chave * 0.50) + (agb_fsi * 0.30) + (agb_brown * 0.20);
        return agb;
    }

    // Calculate Below-Ground Biomass (Roots)
    calculateBGB(agb, dbhCm) {
        // FSI uses root-to-shoot ratio based on tree size
        // Small trees (DBH < 20cm): 25%
        // Medium trees (20-50cm): 20%
        // Large trees (>50cm): 15%
        
        let rootRatio;
        if (dbhCm < 20) {
            rootRatio = 0.25;
        } else if (dbhCm < 50) {
            rootRatio = 0.20;
        } else {
            rootRatio = 0.15;
        }
        
        return agb * rootRatio;
    }

    // Calculate Total Biomass
    calculateTotalBiomass(agb, bgb) {
        return agb + bgb;
    }

    // Calculate Carbon Stored (IPCC Method)
    calculateCarbon(totalBiomass) {
        // IPCC Default: 47% of dry biomass is carbon
        // FSI uses 45% for Indian tropical trees
        const CARBON_FRACTION = 0.47; // IPCC standard
        return totalBiomass * CARBON_FRACTION;
    }

    // Calculate CO2 Equivalent
    calculateCO2(carbonKg) {
        // Molecular weight conversion: CO2/C = 44/12 = 3.67
        return carbonKg * 3.67;
    }

    // Calculate Annual Oxygen Production
    calculateOxygen(carbonKg, dbhCm) {
        // Oxygen production varies with tree size and photosynthetic rate
        // Formula: O2 = C × 2.67 × Activity_Factor
        
        // Activity factor based on tree size (larger = more leaves = more O2)
        let activityFactor;
        if (dbhCm < 20) {
            activityFactor = 0.8; // Young tree
        } else if (dbhCm < 50) {
            activityFactor = 1.0; // Mature tree
        } else {
            activityFactor = 0.9; // Old tree (slower metabolism)
        }
        
        // O2 = C × 2.67 (stoichiometric ratio) × activity factor
        return carbonKg * 2.67 * activityFactor;
    }

    // Calculate Air Pollution Absorption (Indian Urban Context)
    calculatePollutionAbsorption(co2Kg, dbhCm) {
        // Indian cities have high pollution - trees absorb PM2.5, NOx, SO2
        // Absorption capacity increases with leaf area (proportional to DBH²)
        
        const baseAbsorption = co2Kg * 0.025; // 2.5% of CO2 sequestration
        const sizeMultiplier = Math.min(1.5, 0.5 + (dbhCm / 100)); // Larger trees absorb more
        
        return baseAbsorption * sizeMultiplier;
    }

    // Calculate Economic Value (Indian Carbon Market)
    calculateEconomicValue(co2Kg) {
        const co2Tons = co2Kg / 1000;
        return co2Tons * this.CARBON_PRICE_PER_TON;
    }

    // Calculate Environmental Equivalents
    calculateEquivalents(co2Kg, oxygenKg) {
        return {
            people: (oxygenKg / this.OXYGEN_PER_PERSON_YEAR).toFixed(2),
            carKm: (co2Kg / this.CAR_EMISSION_PER_KM).toFixed(0),
            homeDays: (co2Kg / this.HOME_ENERGY_PER_DAY).toFixed(1)
        };
    }

    // MAIN CALCULATION METHOD
    calculate(circumferenceCm, speciesName = null, heightM = null) {
        // Step 1: Convert to DBH
        const dbhCm = this.convertCircumferenceToDiameter(circumferenceCm);
        
        // Step 2: Get wood density
        const woodDensity = this.getWoodDensity(speciesName);
        
        // Step 3: Calculate Above-Ground Biomass (Indian weighted method)
        const agb = this.calculateAGB_Indian(dbhCm, woodDensity, heightM);
        
        // Step 4: Calculate Below-Ground Biomass
        const bgb = this.calculateBGB(agb, dbhCm);
        
        // Step 5: Total Biomass
        const totalBiomass = this.calculateTotalBiomass(agb, bgb);
        
        // Step 6: Carbon Storage
        const carbon = this.calculateCarbon(totalBiomass);
        
        // Step 7: CO2 Equivalent
        const co2 = this.calculateCO2(carbon);
        
        // Step 8: Oxygen Production
        const oxygen = this.calculateOxygen(carbon, dbhCm);
        
        // Step 9: Pollution Absorption
        const pollution = this.calculatePollutionAbsorption(co2, dbhCm);
        
        // Step 10: Economic Value
        const economicValue = this.calculateEconomicValue(co2);
        
        // Step 11: Equivalents
        const equivalents = this.calculateEquivalents(co2, oxygen);

        return {
            method: 'Indian Forestry Standard (FSI + Chave + Brown)',
            biomass: {
                total: totalBiomass.toFixed(2),
                aboveGround: agb.toFixed(2),
                belowGround: bgb.toFixed(2)
            },
            carbon: carbon.toFixed(2),
            co2: co2.toFixed(2),
            co2Tonnes: (co2 / 1000).toFixed(3),
            oxygen: oxygen.toFixed(2),
            pollution: pollution.toFixed(2),
            economicValue: economicValue.toFixed(2),
            equivalents: equivalents,
            inputs: {
                circumference: circumferenceCm.toFixed(2),
                dbh: dbhCm.toFixed(2),
                species: speciesName || 'Unknown',
                woodDensity: woodDensity.toFixed(2),
                height: heightM ? heightM.toFixed(2) : 'Estimated'
            }
        };
    }

    // Get calculation explanation
    getMethodExplanation() {
        return {
            title: "Indian Forestry Calculation Method",
            description: "Based on Forest Survey of India (FSI) guidelines and internationally recognized allometric equations calibrated for Indian tropical/subtropical forests.",
            steps: [
                "1. Circumference → DBH (Diameter at Breast Height at 1.37m)",
                "2. Species-specific Wood Density from FSI database",
                "3. Above-Ground Biomass using combined Chave (2005), FSI Volume, and Brown (1989) equations",
                "4. Below-Ground Biomass using FSI root-to-shoot ratios (15-25% based on tree size)",
                "5. Carbon Storage = 47% of Total Biomass (IPCC standard)",
                "6. CO₂ Equivalent = Carbon × 3.67 (molecular weight ratio)",
                "7. O₂ Production = Carbon × 2.67 × Activity Factor",
                "8. Air Pollution Absorption (PM2.5, NOx, SO2) based on leaf area",
                "9. Economic Value using Indian Carbon Credit prices (₹1800/ton CO₂)"
            ],
            references: [
                "Forest Survey of India (FSI) - State of Forest Report 2023",
                "Chave et al. (2005) - Tree allometry and improved estimation of carbon stocks",
                "Brown (1989) - Pantropical equations for estimating biomass",
                "IPCC Guidelines for National Greenhouse Gas Inventories (2006)"
            ]
        };
    }
}

// Create global instance
const indianCalculator = new IndianForestryCalculator();
console.log("✅ Indian Forestry Calculator loaded - FSI + Chave + Brown methods active");
