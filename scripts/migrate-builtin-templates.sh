#!/bin/bash

# Scout Inventory - Migrate Built-in Templates to Database
# This script adds the 8 built-in templates to the database so they can be edited

API_URL="${1:-http://localhost/api}"

echo "========================================"
echo "Migrate Built-in Templates to Database"
echo "========================================"
echo ""
echo "API URL: $API_URL"
echo ""

# Function to make API requests
api_post() {
    curl -s -X POST "$API_URL$1" \
        -H "Content-Type: application/json" \
        -d "$2"
}

echo "Adding built-in templates to database..."
echo ""

# Template 1: Cooking
api_post "/templates" '{
    "name": "Cooking",
    "items": [
        {"name": "Camp stove (2-burner)", "quantity": 1},
        {"name": "Propane tanks (1 lb)", "quantity": 4},
        {"name": "Large pot (10 qt)", "quantity": 1},
        {"name": "Frying pan", "quantity": 2},
        {"name": "Cooking utensils set", "quantity": 1},
        {"name": "Cutting board", "quantity": 2},
        {"name": "Can opener", "quantity": 1},
        {"name": "Dutch oven", "quantity": 1},
        {"name": "Charcoal chimney", "quantity": 1}
    ]
}' > /dev/null
echo "  ✓ Added Cooking template (9 items)"

# Template 2: First Aid
api_post "/templates" '{
    "name": "First Aid",
    "items": [
        {"name": "First aid kit (large)", "quantity": 1},
        {"name": "Instant ice packs", "quantity": 4},
        {"name": "Bandages (assorted)", "quantity": 50},
        {"name": "Medical tape", "quantity": 2},
        {"name": "Antiseptic wipes", "quantity": 20},
        {"name": "Medical gloves (pairs)", "quantity": 10},
        {"name": "Ibuprofen", "quantity": 1},
        {"name": "Antibiotic ointment", "quantity": 2},
        {"name": "CPR mask", "quantity": 1},
        {"name": "Tweezers", "quantity": 1}
    ]
}' > /dev/null
echo "  ✓ Added First Aid template (10 items)"

# Template 3: Dining/Eating
api_post "/templates" '{
    "name": "Dining/Eating",
    "items": [
        {"name": "Plates (heavy duty paper)", "quantity": 50},
        {"name": "Bowls (heavy duty paper)", "quantity": 50},
        {"name": "Forks", "quantity": 30},
        {"name": "Spoons", "quantity": 30},
        {"name": "Knives (plastic)", "quantity": 30},
        {"name": "Cups (disposable)", "quantity": 50},
        {"name": "Paper towel rolls", "quantity": 6},
        {"name": "Napkins (packs)", "quantity": 4},
        {"name": "Trash bags (55 gal)", "quantity": 15},
        {"name": "Dish soap", "quantity": 2},
        {"name": "Sponges", "quantity": 4}
    ]
}' > /dev/null
echo "  ✓ Added Dining/Eating template (11 items)"

# Template 4: Shelter/Tents
api_post "/templates" '{
    "name": "Shelter/Tents",
    "items": [
        {"name": "6-person tent", "quantity": 2},
        {"name": "Tent stakes", "quantity": 20},
        {"name": "Tent repair kit", "quantity": 1},
        {"name": "Ground tarp", "quantity": 3},
        {"name": "Rain fly", "quantity": 2},
        {"name": "Tent mallet", "quantity": 2},
        {"name": "Bungee cords", "quantity": 10}
    ]
}' > /dev/null
echo "  ✓ Added Shelter/Tents template (7 items)"

# Template 5: Tools/Repair
api_post "/templates" '{
    "name": "Tools/Repair",
    "items": [
        {"name": "Hammer", "quantity": 1},
        {"name": "Hatchet", "quantity": 1},
        {"name": "Folding saw", "quantity": 2},
        {"name": "Multi-tool", "quantity": 2},
        {"name": "Duct tape roll", "quantity": 2},
        {"name": "Paracord (100 ft)", "quantity": 2},
        {"name": "Carabiners", "quantity": 10},
        {"name": "Work gloves (pairs)", "quantity": 5},
        {"name": "Zip ties (assorted)", "quantity": 50}
    ]
}' > /dev/null
echo "  ✓ Added Tools/Repair template (9 items)"

# Template 6: Lighting
api_post "/templates" '{
    "name": "Lighting",
    "items": [
        {"name": "LED lantern", "quantity": 4},
        {"name": "Flashlight", "quantity": 6},
        {"name": "Headlamp", "quantity": 3},
        {"name": "AA batteries (pack)", "quantity": 4},
        {"name": "D batteries (pack)", "quantity": 3},
        {"name": "Battery tester", "quantity": 1},
        {"name": "Glow sticks", "quantity": 25}
    ]
}' > /dev/null
echo "  ✓ Added Lighting template (7 items)"

# Template 7: Games/Activities
api_post "/templates" '{
    "name": "Games/Activities",
    "items": [
        {"name": "Frisbee", "quantity": 3},
        {"name": "Football", "quantity": 2},
        {"name": "Soccer ball", "quantity": 1},
        {"name": "Playing cards (deck)", "quantity": 4},
        {"name": "Horseshoe set", "quantity": 1},
        {"name": "Volleyball and net", "quantity": 1}
    ]
}' > /dev/null
echo "  ✓ Added Games/Activities template (6 items)"

# Template 8: Water/Coolers
api_post "/templates" '{
    "name": "Water/Coolers",
    "items": [
        {"name": "5-gallon water jug", "quantity": 3},
        {"name": "Large cooler (48 qt)", "quantity": 2},
        {"name": "Small cooler (28 qt)", "quantity": 2},
        {"name": "Water spigot", "quantity": 2},
        {"name": "Ice packs (reusable)", "quantity": 6}
    ]
}' > /dev/null
echo "  ✓ Added Water/Coolers template (5 items)"

echo ""
echo "========================================"
echo "✓ Migration Completed Successfully!"
echo "========================================"
echo ""
echo "Summary:"
echo "  - 8 templates added to database"
echo "  - 64 template items total"
echo ""
echo "All templates are now editable from the Templates tab!"
echo ""
