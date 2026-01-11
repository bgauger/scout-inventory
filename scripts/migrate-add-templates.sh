#!/bin/bash

# Scout Inventory - Database Migration Script
# Adds templates and template_items tables to existing database

echo "========================================"
echo "Scout Inventory - Add Templates Tables"
echo "========================================"
echo ""
echo "This script will add the templates tables to your existing database."
echo ""

# Run the migration SQL directly in the database container
docker exec -i scout_db psql -U postgres scout_inventory <<'EOF'
-- Templates table (for item templates)
CREATE TABLE IF NOT EXISTS templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Template items table
CREATE TABLE IF NOT EXISTS template_items (
    id SERIAL PRIMARY KEY,
    template_id INTEGER NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    quantity INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for better performance
CREATE INDEX IF NOT EXISTS idx_template_items_template ON template_items(template_id);

-- Updated timestamp trigger for templates
CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

EOF

if [ $? -eq 0 ]; then
    echo ""
    echo "========================================"
    echo "✓ Migration Completed Successfully!"
    echo "========================================"
    echo ""
    echo "Templates tables have been added to your database."
    echo "You can now create custom templates in the app!"
    echo ""
else
    echo ""
    echo "========================================"
    echo "✗ Migration Failed"
    echo "========================================"
    echo ""
    echo "Please check the error messages above."
    echo ""
fi
