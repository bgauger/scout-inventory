#!/bin/bash

# Scout Inventory - Add Test Data Script
# This script populates the database with sample boxes, items, and profiles

API_URL="${1:-http://localhost/api}"

echo "======================================"
echo "Adding Test Data to Scout Inventory"
echo "======================================"
echo ""
echo "API URL: $API_URL"
echo ""

# Function to make API requests
api_post() {
    curl -s -X POST "$API_URL$1" \
        -H "Content-Type: application/json" \
        -d "$2"
}

echo "Creating boxes..."

# Box 1 - Cooking
BOX1=$(api_post "/boxes" '{
    "name": "Box 1 - Cooking",
    "color": "#ef4444",
    "notes": "Check propane levels before each trip. Stove #2 needs new igniter.",
    "lastInspection": "2025-10-01",
    "inTrailer": true
}')
BOX1_ID=$(echo $BOX1 | grep -o '"id":[0-9]*' | grep -o '[0-9]*')
echo "  ✓ Created Box 1 - Cooking (ID: $BOX1_ID)"

# Add items to Box 1
api_post "/boxes/$BOX1_ID/items" '{"name":"Camp stove (2-burner)","quantity":2,"needsReplacement":false}' > /dev/null
api_post "/boxes/$BOX1_ID/items" '{"name":"Propane tanks (1 lb)","quantity":8,"needsReplacement":false}' > /dev/null
api_post "/boxes/$BOX1_ID/items" '{"name":"Large pot (10 qt)","quantity":2,"needsReplacement":false}' > /dev/null
api_post "/boxes/$BOX1_ID/items" '{"name":"Frying pans","quantity":3,"needsReplacement":false}' > /dev/null
api_post "/boxes/$BOX1_ID/items" '{"name":"Cooking utensils set","quantity":2,"needsReplacement":false}' > /dev/null
api_post "/boxes/$BOX1_ID/items" '{"name":"Can opener","quantity":2,"needsReplacement":true}' > /dev/null
echo "    Added 6 items to Box 1"

# Box 2 - First Aid
BOX2=$(api_post "/boxes" '{
    "name": "Box 2 - First Aid",
    "color": "#f97316",
    "notes": "Inspect monthly for expired supplies. Check ibuprofen expiration dates.",
    "lastInspection": "2025-09-15",
    "inTrailer": true
}')
BOX2_ID=$(echo $BOX2 | grep -o '"id":[0-9]*' | grep -o '[0-9]*')
echo "  ✓ Created Box 2 - First Aid (ID: $BOX2_ID)"

# Add items to Box 2
api_post "/boxes/$BOX2_ID/items" '{"name":"Large first aid kit","quantity":1,"needsReplacement":false}' > /dev/null
api_post "/boxes/$BOX2_ID/items" '{"name":"Instant ice packs","quantity":6,"needsReplacement":false}' > /dev/null
api_post "/boxes/$BOX2_ID/items" '{"name":"Bandages (assorted)","quantity":100,"needsReplacement":false}' > /dev/null
api_post "/boxes/$BOX2_ID/items" '{"name":"Medical gloves (pairs)","quantity":30,"needsReplacement":false}' > /dev/null
api_post "/boxes/$BOX2_ID/items" '{"name":"Ibuprofen bottles","quantity":2,"needsReplacement":true}' > /dev/null
echo "    Added 5 items to Box 2"

# Box 3 - Dining/Eating
BOX3=$(api_post "/boxes" '{
    "name": "Box 3 - Dining/Eating",
    "color": "#84cc16",
    "notes": "Restock paper goods after each campout",
    "lastInspection": "2025-09-28",
    "inTrailer": true
}')
BOX3_ID=$(echo $BOX3 | grep -o '"id":[0-9]*' | grep -o '[0-9]*')
echo "  ✓ Created Box 3 - Dining/Eating (ID: $BOX3_ID)"

# Add items to Box 3
api_post "/boxes/$BOX3_ID/items" '{"name":"Plates (heavy duty paper)","quantity":100,"needsReplacement":false}' > /dev/null
api_post "/boxes/$BOX3_ID/items" '{"name":"Bowls (heavy duty paper)","quantity":100,"needsReplacement":false}' > /dev/null
api_post "/boxes/$BOX3_ID/items" '{"name":"Forks","quantity":50,"needsReplacement":false}' > /dev/null
api_post "/boxes/$BOX3_ID/items" '{"name":"Paper towel rolls","quantity":12,"needsReplacement":false}' > /dev/null
api_post "/boxes/$BOX3_ID/items" '{"name":"Trash bags (55 gal)","quantity":30,"needsReplacement":false}' > /dev/null
echo "    Added 5 items to Box 3"

# Box 4 - Shelter/Tents
BOX4=$(api_post "/boxes" '{
    "name": "Box 4 - Shelter/Tents",
    "color": "#0ea5e9",
    "notes": "Check all tents for damage after each use.",
    "lastInspection": "2025-09-20",
    "inTrailer": false
}')
BOX4_ID=$(echo $BOX4 | grep -o '"id":[0-9]*' | grep -o '[0-9]*')
echo "  ✓ Created Box 4 - Shelter/Tents (ID: $BOX4_ID)"

# Add items to Box 4
api_post "/boxes/$BOX4_ID/items" '{"name":"6-person tents","quantity":4,"needsReplacement":false}' > /dev/null
api_post "/boxes/$BOX4_ID/items" '{"name":"Tent stakes","quantity":40,"needsReplacement":false}' > /dev/null
api_post "/boxes/$BOX4_ID/items" '{"name":"Ground tarps","quantity":5,"needsReplacement":false}' > /dev/null
api_post "/boxes/$BOX4_ID/items" '{"name":"Rain flies","quantity":4,"needsReplacement":false}' > /dev/null
echo "    Added 4 items to Box 4"

# Box 5 - Tools/Repair
BOX5=$(api_post "/boxes" '{
    "name": "Box 5 - Tools/Repair",
    "color": "#64748b",
    "notes": "Sharpen saws before summer camp.",
    "lastInspection": "2025-08-30",
    "inTrailer": false
}')
BOX5_ID=$(echo $BOX5 | grep -o '"id":[0-9]*' | grep -o '[0-9]*')
echo "  ✓ Created Box 5 - Tools/Repair (ID: $BOX5_ID)"

# Add items to Box 5
api_post "/boxes/$BOX5_ID/items" '{"name":"Hammer","quantity":2,"needsReplacement":false}' > /dev/null
api_post "/boxes/$BOX5_ID/items" '{"name":"Hatchet","quantity":2,"needsReplacement":false}' > /dev/null
api_post "/boxes/$BOX5_ID/items" '{"name":"Multi-tool","quantity":4,"needsReplacement":false}' > /dev/null
api_post "/boxes/$BOX5_ID/items" '{"name":"Duct tape rolls","quantity":4,"needsReplacement":false}' > /dev/null
api_post "/boxes/$BOX5_ID/items" '{"name":"Paracord (100 ft)","quantity":3,"needsReplacement":false}' > /dev/null
echo "    Added 5 items to Box 5"

# Box 6 - Lighting
BOX6=$(api_post "/boxes" '{
    "name": "Box 6 - Lighting",
    "color": "#eab308",
    "notes": "Test all lanterns before trips. Replace old batteries.",
    "lastInspection": "2025-09-10",
    "inTrailer": false
}')
BOX6_ID=$(echo $BOX6 | grep -o '"id":[0-9]*' | grep -o '[0-9]*')
echo "  ✓ Created Box 6 - Lighting (ID: $BOX6_ID)"

# Add items to Box 6
api_post "/boxes/$BOX6_ID/items" '{"name":"LED lanterns","quantity":8,"needsReplacement":false}' > /dev/null
api_post "/boxes/$BOX6_ID/items" '{"name":"Flashlights","quantity":12,"needsReplacement":false}' > /dev/null
api_post "/boxes/$BOX6_ID/items" '{"name":"AA batteries (pack)","quantity":8,"needsReplacement":false}' > /dev/null
api_post "/boxes/$BOX6_ID/items" '{"name":"Glow sticks","quantity":50,"needsReplacement":false}' > /dev/null
echo "    Added 4 items to Box 6"

echo ""
echo "Creating campout profiles..."

# Profile 1 - Weekend Campout
api_post "/profiles" "{
    \"name\": \"Weekend Campout\",
    \"requiredBoxes\": [$BOX1_ID, $BOX2_ID, $BOX3_ID, $BOX4_ID, $BOX5_ID]
}" > /dev/null
echo "  ✓ Created 'Weekend Campout' profile"

# Profile 2 - Summer Camp
api_post "/profiles" "{
    \"name\": \"Summer Camp (Week)\",
    \"requiredBoxes\": [$BOX1_ID, $BOX2_ID, $BOX3_ID, $BOX4_ID, $BOX5_ID, $BOX6_ID]
}" > /dev/null
echo "  ✓ Created 'Summer Camp (Week)' profile"

# Profile 3 - Day Hike
api_post "/profiles" "{
    \"name\": \"Day Hike\",
    \"requiredBoxes\": [$BOX2_ID, $BOX5_ID]
}" > /dev/null
echo "  ✓ Created 'Day Hike' profile"

echo ""
echo "======================================"
echo "✓ Test Data Added Successfully!"
echo "======================================"
echo ""
echo "Summary:"
echo "  - 6 boxes created"
echo "  - 29 items added"
echo "  - 3 campout profiles created"
echo "  - 3 boxes marked as 'in trailer'"
echo ""
echo "Access the app to see your test data!"
echo ""
