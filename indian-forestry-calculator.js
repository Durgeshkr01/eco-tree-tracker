// Indian Forestry Calculator
// Chave et al. (2014) based AGB methods with forest-type carbon fractions

class IndianForestryCalculator {
    constructor() {
        this.OXYGEN_PER_PERSON_YEAR = 730; // kg O2/person/year
        this.CAR_EMISSION_PER_KM = 0.12; // kg CO2/km
        this.HOME_ENERGY_PER_DAY = 10; // kg CO2/day

        // Built-in fallback wood density values (g/cm^3)
        this.woodDensity = {
            Neem: 0.68,
            Mango: 0.56,
            Peepal: 0.51,
            Banyan: 0.48,
            Jamun: 0.72,
            Ashoka: 0.65,
            Gulmohar: 0.62,
            Amaltas: 0.59,
            Teak: 0.55,
            Coconut: 0.45,
            Guava: 0.74,
            Papaya: 0.35,
            Jackfruit: 0.60,
            Tamarind: 0.81,
            Pomegranate: 0.70,
            "Custard Apple": 0.55,
            Lemon: 0.68,
            Amla: 0.71,
            Arjuna: 0.78,
            Harad: 0.83,
            Baheda: 0.79,
            Tulsi: 0.40,
            Sal: 0.86,
            Sheesham: 0.77,
            Eucalyptus: 0.69,
            Bamboo: 0.60,
            Pine: 0.52,
            Deodar: 0.56,
            Oak: 0.75,
            Babul: 0.76,
            "Neem Tree": 0.68,
            default: 0.60
        };

        this.archiveDensityMap = new Map();
        this.archiveDensityLoadPromise = null;
    }

    normalizeSpeciesName(value) {
        return (value || "")
            .replace(/\(.*?\)/g, " ")
            .replace(/\u00A0/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();
    }

    extractCommonName(speciesName) {
        const match = (speciesName || "").match(/^([^(]+)/);
        return match ? match[1].trim() : (speciesName || "").trim();
    }

    getBuiltInWoodDensity(speciesName) {
        const commonName = this.extractCommonName(speciesName);
        return this.woodDensity[commonName] || this.woodDensity.default;
    }

    async loadWoodDensityArchive() {
        if (this.archiveDensityLoadPromise) {
            return this.archiveDensityLoadPromise;
        }

        this.archiveDensityLoadPromise = (async () => {
            try {
                const [occRes, measRes] = await Promise.all([
                    fetch("archive/occurrences.txt", { cache: "no-store" }),
                    fetch("archive/measurements or facts.txt", { cache: "no-store" })
                ]);

                if (!occRes.ok || !measRes.ok) {
                    throw new Error("Archive files not accessible");
                }

                const [occText, measText] = await Promise.all([occRes.text(), measRes.text()]);

                const occurrenceToTaxon = new Map();
                const occLines = occText.split(/\r?\n/).filter(Boolean);
                for (let i = 1; i < occLines.length; i++) {
                    const cols = occLines[i].split("\t");
                    const occurrenceId = (cols[0] || "").trim();
                    const taxonId = (cols[1] || "").trim();
                    if (occurrenceId && taxonId) {
                        occurrenceToTaxon.set(occurrenceId, taxonId);
                    }
                }

                const sumByTaxon = new Map();
                const countByTaxon = new Map();
                const measurementLines = measText.split(/\r?\n/).filter(Boolean);

                for (let i = 1; i < measurementLines.length; i++) {
                    const cols = measurementLines[i].split("\t");
                    const occurrenceId = (cols[1] || "").trim();
                    const measurementType = (cols[5] || "").trim();
                    const measurementValue = parseFloat(cols[6]);

                    if (!occurrenceId || !Number.isFinite(measurementValue)) {
                        continue;
                    }

                    // OBA_1000040 corresponds to wood density trait in this archive.
                    if (measurementType && !measurementType.includes("OBA_1000040")) {
                        continue;
                    }

                    const taxonId = occurrenceToTaxon.get(occurrenceId);
                    if (!taxonId) {
                        continue;
                    }

                    sumByTaxon.set(taxonId, (sumByTaxon.get(taxonId) || 0) + measurementValue);
                    countByTaxon.set(taxonId, (countByTaxon.get(taxonId) || 0) + 1);
                }

                this.archiveDensityMap.clear();
                sumByTaxon.forEach((sum, taxon) => {
                    const count = countByTaxon.get(taxon) || 1;
                    const avgDensity = sum / count;
                    this.archiveDensityMap.set(this.normalizeSpeciesName(taxon), avgDensity);
                });

                console.log(`Archive wood density loaded for ${this.archiveDensityMap.size} taxa`);
                return true;
            } catch (error) {
                console.warn("Archive wood density not loaded. Falling back to built-in values.", error);
                return false;
            }
        })();

        return this.archiveDensityLoadPromise;
    }

    getWoodDensityDetails(speciesName, scientificName = null) {
        const scientificKey = this.normalizeSpeciesName(scientificName);
        if (scientificKey && this.archiveDensityMap.has(scientificKey)) {
            return {
                density: this.archiveDensityMap.get(scientificKey),
                source: "Archive scientific match"
            };
        }

        const speciesKey = this.normalizeSpeciesName(speciesName);
        if (speciesKey && this.archiveDensityMap.has(speciesKey)) {
            return {
                density: this.archiveDensityMap.get(speciesKey),
                source: "Archive species match"
            };
        }

        const builtInDensity = this.getBuiltInWoodDensity(speciesName);
        const commonName = this.extractCommonName(speciesName);
        const source = this.woodDensity[commonName] ? "Built-in species value" : "Built-in default";

        return {
            density: builtInDensity,
            source
        };
    }

    convertCircumferenceToDiameter(circumferenceCm) {
        return circumferenceCm / Math.PI;
    }

    // Method 1 (no height): AGB = 0.0673 x (rho x D^2)^1.02
    // Method 2 (height):    AGB = 0.0673 x (rho x D^2 x H)^0.976
    calculateAGB_Chave2014(dbhCm, woodDensity, heightM = null, method = "method1") {
        const D = Math.max(dbhCm, 0.0001);
        const rho = Math.max(woodDensity, 0.0001);

        if (method === "method2" && heightM && heightM > 0) {
            return 0.0673 * Math.pow(rho * Math.pow(D, 2) * heightM, 0.976);
        }

        return 0.0673 * Math.pow(rho * Math.pow(D, 2), 1.02);
    }

    calculateBGB(agb, dbhCm) {
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

    calculateTotalBiomass(agb, bgb) {
        return agb + bgb;
    }

    calculateCarbonFromAGB(agb, forestType = "broadleaf") {
        const carbonFraction = forestType === "coniferous" ? 0.50 : 0.47;
        return {
            carbon: agb * carbonFraction,
            carbonFraction
        };
    }

    calculateCO2(carbonKg) {
        return carbonKg * 3.67;
    }

    calculateOxygen(carbonKg, dbhCm) {
        let activityFactor;
        if (dbhCm < 20) {
            activityFactor = 0.8;
        } else if (dbhCm < 50) {
            activityFactor = 1.0;
        } else {
            activityFactor = 0.9;
        }

        return carbonKg * 2.67 * activityFactor;
    }

    calculatePollutionAbsorption(co2Kg, dbhCm) {
        const baseAbsorption = co2Kg * 0.025;
        const sizeMultiplier = Math.min(1.5, 0.5 + (dbhCm / 100));
        return baseAbsorption * sizeMultiplier;
    }

    calculateEquivalents(co2Kg, oxygenKg) {
        return {
            people: (oxygenKg / this.OXYGEN_PER_PERSON_YEAR).toFixed(2),
            carKm: (co2Kg / this.CAR_EMISSION_PER_KM).toFixed(0),
            homeDays: (co2Kg / this.HOME_ENERGY_PER_DAY).toFixed(1)
        };
    }

    calculate(circumferenceCm, speciesName = null, heightM = null, options = {}) {
        const method = options.method === "method2" ? "method2" : "method1";
        const forestType = options.forestType === "coniferous" ? "coniferous" : "broadleaf";

        const dbhCm = this.convertCircumferenceToDiameter(circumferenceCm);

        let woodDensityDetails = this.getWoodDensityDetails(speciesName, options.scientificName);
        const manualWoodDensity = Number(options.woodDensityOverride);
        if (Number.isFinite(manualWoodDensity) && manualWoodDensity > 0) {
            woodDensityDetails = {
                density: manualWoodDensity,
                source: "Manual input"
            };
        }

        const effectiveHeight = method === "method2" ? Number(heightM) : null;
        const agb = this.calculateAGB_Chave2014(dbhCm, woodDensityDetails.density, effectiveHeight, method);
        const bgb = this.calculateBGB(agb, dbhCm);
        const totalBiomass = this.calculateTotalBiomass(agb, bgb);

        const carbonDetails = this.calculateCarbonFromAGB(agb, forestType);
        const carbon = carbonDetails.carbon;
        const co2 = this.calculateCO2(carbon);
        const oxygen = this.calculateOxygen(carbon, dbhCm);
        const pollution = this.calculatePollutionAbsorption(co2, dbhCm);
        const equivalents = this.calculateEquivalents(co2, oxygen);

        const methodLabel = method === "method2"
            ? "Method 2 (AGB = 0.0673 x (rho D^2 H)^0.976)"
            : "Method 1 (AGB = 0.0673 x (rho D^2)^1.02)";

        return {
            method: methodLabel,
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
            equivalents,
            inputs: {
                circumference: Number(circumferenceCm).toFixed(2),
                dbh: dbhCm.toFixed(2),
                species: speciesName || "Unknown",
                woodDensity: woodDensityDetails.density.toFixed(3),
                woodDensitySource: woodDensityDetails.source,
                height: (method === "method2" && Number.isFinite(effectiveHeight) && effectiveHeight > 0)
                    ? effectiveHeight.toFixed(2)
                    : "Not used",
                method,
                methodLabel,
                forestType,
                carbonFraction: carbonDetails.carbonFraction.toFixed(2)
            }
        };
    }

    getMethodExplanation() {
        return {
            title: "Chave (2014) Biomass Method",
            description: "Supports both height-free and height-based Chave allometric equations with species wood density.",
            steps: [
                "1. Circumference to DBH at 1.37m standard height",
                "2. Wood density lookup (archive data with built-in fallback)",
                "3. Method 1: AGB = 0.0673 x (rho D^2)^1.02",
                "4. Method 2: AGB = 0.0673 x (rho D^2 H)^0.976",
                "5. Carbon from AGB using selected forest type fraction",
                "6. CO2, oxygen, and impact equivalents"
            ]
        };
    }
}

const indianCalculator = new IndianForestryCalculator();
console.log("Indian Forestry Calculator loaded (Chave 2014 methods)");
