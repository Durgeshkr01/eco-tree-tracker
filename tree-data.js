// Indian Tree Species Database with Agricultural Information
const treeSpeciesData = [
    // Popular Indian Trees
    { name: "Neem (Azadirachta indica)", scientific: "Azadirachta indica", common: "Neem", avgHeight: 15, avgDBH: 40,
      info: { uses: "Medicinal (antibacterial, antifungal), Natural pesticide, Air purifier, Fertilizer",
              benefits: "Releases oxygen 24/7, Improves soil fertility, Provides shade, Pest control in farms",
              fact: "One Neem tree can cool surroundings equivalent to 10 ACs running 20 hours! Neem cake is excellent organic fertilizer." }},
    { name: "Mango (Mangifera indica)", scientific: "Mangifera indica", common: "Mango", avgHeight: 20, avgDBH: 50,
      info: { uses: "Fruit production, Timber for furniture, Medicinal leaves, Shade tree in farms",
              benefits: "High CO₂ absorption, Wildlife habitat, Economic value ₹50,000-1,00,000/tree/year",
              fact: "A mature mango tree produces 200-300 kg fruits/year and can live 100+ years! India is world's largest mango producer." }},
    { name: "Peepal (Ficus religiosa)", scientific: "Ficus religiosa", common: "Peepal/Sacred Fig", avgHeight: 25, avgDBH: 60,
      info: { uses: "Sacred tree, Ayurvedic medicine (bark, leaves), Air purification",
              benefits: "Releases oxygen even at NIGHT (unique!), Absorbs 2.5 tons CO₂/year, Supports 100+ bird species",
              fact: "Peepal is one of the FEW trees that releases oxygen 24 hours! Planted near temples for this reason." }},
    { name: "Banyan (Ficus benghalensis)", scientific: "Ficus benghalensis", common: "Banyan", avgHeight: 25, avgDBH: 80,
      info: { uses: "National tree of India, Medicinal latex, Massive shade provider, Aerial roots for soil binding",
              benefits: "One tree = mini forest, Supports entire ecosystems, Temperature reduction 5-8°C below",
              fact: "The Great Banyan in Kolkata covers 3.5 acres with 3,600 aerial roots - looks like a forest but is ONE tree!" }},
    { name: "Neem Tree", scientific: "Azadirachta indica", common: "Neem", avgHeight: 15, avgDBH: 40,
      info: { uses: "Medicinal (antibacterial, antifungal), Natural pesticide, Air purifier, Fertilizer",
              benefits: "Releases oxygen 24/7, Improves soil fertility, Provides shade, Pest control in farms",
              fact: "One Neem tree can cool surroundings equivalent to 10 ACs running 20 hours! Neem cake is excellent organic fertilizer." }},
    { name: "Jamun (Syzygium cumini)", scientific: "Syzygium cumini", common: "Jamun/Black Plum", avgHeight: 18, avgDBH: 45,
      info: { uses: "Fruit for diabetes control, Timber, Medicinal seeds & bark, Honey production",
              benefits: "Controls blood sugar, Excellent timber, Supports bee population",
              fact: "Jamun seeds powder reduces blood sugar by 30%! Used in Ayurveda for 3000+ years for diabetes." }},
    { name: "Ashoka (Saraca asoca)", scientific: "Saraca asoca", common: "Ashoka", avgHeight: 10, avgDBH: 25,
      info: { uses: "Sacred tree, Ornamental, Medicinal bark for women's health problems",
              benefits: "Beautiful flowering, Air purification, Cultural significance",
              fact: "Ashoka means 'without sorrow' in Sanskrit - Queen Sita rested under this tree. Bark treats menstrual disorders." }},
    { name: "Gulmohar (Delonix regia)", scientific: "Delonix regia", common: "Gulmohar/Flame Tree", avgHeight: 12, avgDBH: 35,
      info: { uses: "Avenue tree, Ornamental, Shade provider, Flowers used for dye",
              benefits: "Cools surroundings by 5-7°C, Nitrogen fixation in soil, Beautiful red flowers",
              fact: "Gulmohar's flame-red flowers bloom in peak summer (May-June) when most needed for cooling!" }},
    { name: "Amaltas (Cassia fistula)", scientific: "Cassia fistula", common: "Amaltas/Golden Shower", avgHeight: 15, avgDBH: 30,
      info: { uses: "State flower of Kerala, Medicinal pods (laxative), Ornamental, Timber",
              benefits: "Attracts pollinators, Air purification, Ayurvedic medicine",
              fact: "Golden shower of flowers in April-May! Fruit pulp is natural laxative used in Ayurveda." }},
    { name: "Teak (Tectona grandis)", scientific: "Tectona grandis", common: "Teak/Sagwan", avgHeight: 30, avgDBH: 70,
      info: { uses: "Premium timber (₹2000-5000/cubic ft), Ship building, Furniture, Veneer",
              benefits: "Excellent investment (matures in 20-25 years), Massive CO₂ storage, Soil conservation",
              fact: "Teak wood is naturally water-resistant and termite-proof! One acre teak plantation = ₹50-80 lakhs after 25 years." }},
    
    // Fruit Trees
    { name: "Coconut (Cocos nucifera)", scientific: "Cocos nucifera", common: "Coconut", avgHeight: 20, avgDBH: 25,
      info: { uses: "Fruit, Oil, Coir fiber, Toddy, Shell crafts - EVERY part is useful!",
              benefits: "Coastal erosion control, Year-round income, Drought tolerant",
              fact: "Coconut is called 'Kalpavriksha' (wish-fulfilling tree) - gives 50-200 coconuts/year for 80+ years!" }},
    { name: "Guava (Psidium guajava)", scientific: "Psidium guajava", common: "Guava/Amrud", avgHeight: 8, avgDBH: 20,
      info: { uses: "Vitamin C rich fruit, Medicinal leaves for diarrhea, Timber, Jam/Jelly",
              benefits: "Fast growing, Multiple harvests (2-3/year), Low maintenance",
              fact: "Guava has 4x more Vitamin C than orange! Guava leaves tea controls diabetes & diarrhea." }},
    { name: "Papaya (Carica papaya)", scientific: "Carica papaya", common: "Papaya", avgHeight: 6, avgDBH: 15,
      info: { uses: "Fruit rich in papain enzyme, Meat tenderizer, Latex for medicine",
              benefits: "Fruits in just 6-8 months! High nutrition, Digestive aid",
              fact: "Papaya contains papain enzyme - used in medicine, meat tenderizing & even treating wounds!" }},
    { name: "Jackfruit (Artocarpus heterophyllus)", scientific: "Artocarpus heterophyllus", common: "Jackfruit/Kathal", avgHeight: 20, avgDBH: 50,
      info: { uses: "World's largest tree fruit (up to 35kg!), Timber, Vegetable when raw, Meat substitute",
              benefits: "High protein vegan meat alternative, Massive CO₂ absorption, Long lifespan",
              fact: "Jackfruit is being promoted as 'miracle crop' - raw jackfruit tastes like pulled pork! Kerala's state fruit." }},
    { name: "Tamarind (Tamarindus indica)", scientific: "Tamarindus indica", common: "Tamarind/Imli", avgHeight: 25, avgDBH: 60,
      info: { uses: "Culinary (chutneys, sambhar), Wood polish, Medicinal, Fodder",
              benefits: "Lives 200+ years, Drought resistant, Fixes nitrogen in soil",
              fact: "Tamarind tree can produce fruits for 200+ years! Seeds are used to polish brass & copper." }},
    { name: "Pomegranate (Punica granatum)", scientific: "Punica granatum", common: "Pomegranate/Anar", avgHeight: 6, avgDBH: 15,
      info: { uses: "Antioxidant-rich fruit, Heart health, Medicinal peel, Dye from flowers",
              benefits: "High commercial value (₹80-150/kg), Drought tolerant, Export quality",
              fact: "Pomegranate peel has more antioxidants than the fruit! Maharashtra produces 60% of India's pomegranates." }},
    { name: "Custard Apple (Annona squamosa)", scientific: "Annona squamosa", common: "Custard Apple/Sitaphal", avgHeight: 6, avgDBH: 18,
      info: { uses: "Sweet delicious fruit, Seeds as natural insecticide, Oil from seeds",
              benefits: "Low maintenance, Good income, Nutritious fruit",
              fact: "Custard apple seeds are TOXIC - used as natural insecticide & fish poison in traditional farming!" }},
    { name: "Lemon (Citrus limon)", scientific: "Citrus limon", common: "Lemon/Nimbu", avgHeight: 5, avgDBH: 12,
      info: { uses: "Vitamin C source, Culinary, Cleaning agent, Medicinal, Beverages",
              benefits: "Year-round production, High demand, Multiple uses",
              fact: "One lemon tree produces 500-600 lemons/year! Lemon juice + baking soda = natural cleaner." }},
    
    // Medicinal Trees
    { name: "Amla (Phyllanthus emblica)", scientific: "Phyllanthus emblica", common: "Amla/Indian Gooseberry", avgHeight: 12, avgDBH: 30,
      info: { uses: "HIGHEST Vitamin C fruit, Chyawanprash main ingredient, Hair oil, Pickles",
              benefits: "Immunity booster, Anti-aging, Hair growth, Diabetes control",
              fact: "Amla has 20x more Vitamin C than orange & doesn't lose it when dried! Used in Triphala." }},
    { name: "Arjuna (Terminalia arjuna)", scientific: "Terminalia arjuna", common: "Arjuna", avgHeight: 25, avgDBH: 55,
      info: { uses: "Heart disease treatment (bark), Timber, Silk worm rearing (Tasar silk)",
              benefits: "Strengthens heart muscles, Controls BP & cholesterol, Antioxidant",
              fact: "Arjuna bark is THE BEST natural medicine for heart in Ayurveda - as effective as modern heart drugs!" }},
    { name: "Harad (Terminalia chebula)", scientific: "Terminalia chebula", common: "Harad/Haritaki", avgHeight: 20, avgDBH: 45,
      info: { uses: "King of Medicines in Ayurveda, Digestive aid, Anti-aging, Triphala ingredient",
              benefits: "Detoxification, Immunity boost, Cures 100+ diseases in Ayurveda",
              fact: "Called 'King of Medicines' - Buddha is often shown holding Haritaki fruit! One of 3 fruits in Triphala." }},
    { name: "Baheda (Terminalia bellirica)", scientific: "Terminalia bellirica", common: "Baheda/Bibhitaki", avgHeight: 20, avgDBH: 45,
      info: { uses: "Triphala ingredient, Respiratory health, Hair care, Eye health",
              benefits: "Clears respiratory tract, Improves vision, Promotes hair growth",
              fact: "Baheda fruit is essential in Triphala - the most famous Ayurvedic formulation for overall health!" }},
    { name: "Tulsi Plant (Ocimum sanctum)", scientific: "Ocimum sanctum", common: "Tulsi/Holy Basil", avgHeight: 1, avgDBH: 2,
      info: { uses: "Sacred plant, Immunity booster, Stress relief (adaptogen), Antibacterial",
              benefits: "Air purification, Mosquito repellent, Religious significance",
              fact: "Tulsi releases oxygen for 20 hours/day & ozone for 4 hours! Worshipped in 80 million Indian homes." }},
    
    // Timber & Commercial Trees
    { name: "Sal (Shorea robusta)", scientific: "Shorea robusta", common: "Sal/Sakhu", avgHeight: 35, avgDBH: 80 },
    { name: "Sheesham (Dalbergia sissoo)", scientific: "Dalbergia sissoo", common: "Sheesham/Indian Rosewood", avgHeight: 25, avgDBH: 60 },
    { name: "Bamboo (Bambusoideae)", scientific: "Bambusoideae", common: "Bamboo/Baans", avgHeight: 15, avgDBH: 10 },
    { name: "Eucalyptus (Eucalyptus globulus)", scientific: "Eucalyptus globulus", common: "Eucalyptus/Safeda", avgHeight: 40, avgDBH: 70 },
    { name: "Casuarina (Casuarina equisetifolia)", scientific: "Casuarina equisetifolia", common: "Casuarina/Whistling Pine", avgHeight: 30, avgDBH: 50 },
    
    // Ornamental Trees
    { name: "Badam (Terminalia catappa)", scientific: "Terminalia catappa", common: "Indian Almond/Badam", avgHeight: 15, avgDBH: 40 },
    { name: "Kachnar (Bauhinia variegata)", scientific: "Bauhinia variegata", common: "Kachnar/Mountain Ebony", avgHeight: 12, avgDBH: 30 },
    { name: "Siris (Albizia lebbeck)", scientific: "Albizia lebbeck", common: "Siris/Woman's Tongue", avgHeight: 20, avgDBH: 50 },
    { name: "Bougainvillea", scientific: "Bougainvillea glabra", common: "Bougainvillea", avgHeight: 5, avgDBH: 8 },
    { name: "Frangipani (Plumeria)", scientific: "Plumeria rubra", common: "Frangipani/Champa", avgHeight: 6, avgDBH: 15 },
    
    // Forest Trees
    { name: "Sandalwood (Santalum album)", scientific: "Santalum album", common: "Sandalwood/Chandan", avgHeight: 12, avgDBH: 30 },
    { name: "Mahua (Madhuca longifolia)", scientific: "Madhuca longifolia", common: "Mahua", avgHeight: 20, avgDBH: 50 },
    { name: "Malabar Neem (Melia dubia)", scientific: "Melia dubia", common: "Malabar Neem", avgHeight: 20, avgDBH: 45 },
    { name: "Khejri (Prosopis cineraria)", scientific: "Prosopis cineraria", common: "Khejri/Shami", avgHeight: 12, avgDBH: 35 },
    { name: "Babul (Acacia nilotica)", scientific: "Acacia nilotica", common: "Babul/Kikar", avgHeight: 15, avgDBH: 40 },
    
    // Palm Trees
    { name: "Date Palm (Phoenix dactylifera)", scientific: "Phoenix dactylifera", common: "Date Palm/Khajoor", avgHeight: 20, avgDBH: 30 },
    { name: "Betel Nut (Areca catechu)", scientific: "Areca catechu", common: "Betel Nut/Supari", avgHeight: 18, avgDBH: 20 },
    { name: "Palmyra Palm (Borassus flabellifer)", scientific: "Borassus flabellifer", common: "Palmyra Palm/Taal", avgHeight: 25, avgDBH: 35 },
    
    // Flowering Trees
    { name: "Jacaranda (Jacaranda mimosifolia)", scientific: "Jacaranda mimosifolia", common: "Jacaranda", avgHeight: 15, avgDBH: 40 },
    { name: "Silk Cotton (Bombax ceiba)", scientific: "Bombax ceiba", common: "Silk Cotton/Semal", avgHeight: 30, avgDBH: 70 },
    { name: "Indian Coral (Erythrina indica)", scientific: "Erythrina indica", common: "Indian Coral/Pangara", avgHeight: 12, avgDBH: 30 },
    { name: "Parijat (Nyctanthes arbor-tristis)", scientific: "Nyctanthes arbor-tristis", common: "Parijat/Night Jasmine", avgHeight: 8, avgDBH: 20 },
    
    // Other Common Trees
    { name: "Bottle Palm (Hyophorbe lagenicaulis)", scientific: "Hyophorbe lagenicaulis", common: "Bottle Palm", avgHeight: 8, avgDBH: 25 },
    { name: "Pine (Pinus roxburghii)", scientific: "Pinus roxburghii", common: "Chir Pine", avgHeight: 35, avgDBH: 65 },
    { name: "Deodar (Cedrus deodara)", scientific: "Cedrus deodara", common: "Deodar/Himalayan Cedar", avgHeight: 40, avgDBH: 80 },
    { name: "Oak (Quercus)", scientific: "Quercus leucotrichophora", common: "Banj Oak", avgHeight: 25, avgDBH: 55 },
    { name: "Cypress (Cupressus)", scientific: "Cupressus sempervirens", common: "Cypress", avgHeight: 30, avgDBH: 50 },
    { name: "Juniper (Juniperus)", scientific: "Juniperus indica", common: "Himalayan Juniper", avgHeight: 15, avgDBH: 35 }
];

// Load tree species into dropdown
function loadTreeSpecies() {
    const select = document.getElementById('treeSpecies');
    
    // Sort alphabetically
    const sortedTrees = treeSpeciesData.sort((a, b) => a.name.localeCompare(b.name));
    
    sortedTrees.forEach((tree, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = tree.name;
        select.appendChild(option);
    });
}

// Get tree data by index
function getTreeData(index) {
    return treeSpeciesData[index];
}

// Load species on page load
document.addEventListener('DOMContentLoaded', loadTreeSpecies);
