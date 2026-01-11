const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'db',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'scout_inventory',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error connecting to the database:', err.stack);
  } else {
    console.log('Successfully connected to database');
    release();
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============== BOX ENDPOINTS ==============

// Get all boxes with their items
app.get('/api/boxes', async (req, res) => {
  try {
    const boxesResult = await pool.query(
      'SELECT * FROM boxes ORDER BY id ASC'
    );

    const boxes = await Promise.all(
      boxesResult.rows.map(async (box) => {
        const itemsResult = await pool.query(
          'SELECT * FROM items WHERE box_id = $1 ORDER BY id ASC',
          [box.id]
        );
        return {
          id: box.id,
          name: box.name,
          color: box.color,
          weight: box.weight,
          notes: box.notes,
          lastInspection: box.last_inspection,
          inTrailer: box.in_trailer,
          items: itemsResult.rows.map(item => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            needsReplacement: item.needs_replacement
          }))
        };
      })
    );

    res.json(boxes);
  } catch (err) {
    console.error('Error fetching boxes:', err);
    res.status(500).json({ error: 'Failed to fetch boxes' });
  }
});

// Get a single box by ID
app.get('/api/boxes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const boxResult = await pool.query('SELECT * FROM boxes WHERE id = $1', [id]);

    if (boxResult.rows.length === 0) {
      return res.status(404).json({ error: 'Box not found' });
    }

    const itemsResult = await pool.query(
      'SELECT * FROM items WHERE box_id = $1 ORDER BY id ASC',
      [id]
    );

    const box = boxResult.rows[0];
    res.json({
      id: box.id,
      name: box.name,
      color: box.color,
      weight: box.weight,
      notes: box.notes,
      lastInspection: box.last_inspection,
      inTrailer: box.in_trailer,
      items: itemsResult.rows.map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        needsReplacement: item.needs_replacement
      }))
    });
  } catch (err) {
    console.error('Error fetching box:', err);
    res.status(500).json({ error: 'Failed to fetch box' });
  }
});

// Create a new box
app.post('/api/boxes', async (req, res) => {
  try {
    const { name, color, weight, notes, lastInspection, inTrailer } = req.body;

    const result = await pool.query(
      'INSERT INTO boxes (name, color, weight, notes, last_inspection, in_trailer) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, color || '#3b82f6', weight || 0, notes || '', lastInspection || null, inTrailer || false]
    );

    const box = result.rows[0];
    res.status(201).json({
      id: box.id,
      name: box.name,
      color: box.color,
      weight: box.weight,
      notes: box.notes,
      lastInspection: box.last_inspection,
      inTrailer: box.in_trailer,
      items: []
    });
  } catch (err) {
    console.error('Error creating box:', err);
    res.status(500).json({ error: 'Failed to create box' });
  }
});

// Update a box
app.put('/api/boxes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, color, weight, notes, lastInspection, inTrailer } = req.body;

    const result = await pool.query(
      'UPDATE boxes SET name = $1, color = $2, weight = $3, notes = $4, last_inspection = $5, in_trailer = $6 WHERE id = $7 RETURNING *',
      [name, color, weight, notes, lastInspection, inTrailer, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Box not found' });
    }

    const box = result.rows[0];
    res.json({
      id: box.id,
      name: box.name,
      color: box.color,
      weight: box.weight,
      notes: box.notes,
      lastInspection: box.last_inspection,
      inTrailer: box.in_trailer
    });
  } catch (err) {
    console.error('Error updating box:', err);
    res.status(500).json({ error: 'Failed to update box' });
  }
});

// Delete a box
app.delete('/api/boxes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM boxes WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Box not found' });
    }

    res.json({ message: 'Box deleted successfully' });
  } catch (err) {
    console.error('Error deleting box:', err);
    res.status(500).json({ error: 'Failed to delete box' });
  }
});

// ============== ITEM ENDPOINTS ==============

// Add an item to a box
app.post('/api/boxes/:boxId/items', async (req, res) => {
  try {
    const { boxId } = req.params;
    const { name, quantity, needsReplacement } = req.body;

    const result = await pool.query(
      'INSERT INTO items (box_id, name, quantity, needs_replacement) VALUES ($1, $2, $3, $4) RETURNING *',
      [boxId, name, quantity || 1, needsReplacement || false]
    );

    const item = result.rows[0];
    res.status(201).json({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      needsReplacement: item.needs_replacement
    });
  } catch (err) {
    console.error('Error adding item:', err);
    res.status(500).json({ error: 'Failed to add item' });
  }
});

// Update an item
app.put('/api/items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, quantity, needsReplacement } = req.body;

    const result = await pool.query(
      'UPDATE items SET name = $1, quantity = $2, needs_replacement = $3 WHERE id = $4 RETURNING *',
      [name, quantity, needsReplacement, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const item = result.rows[0];
    res.json({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      needsReplacement: item.needs_replacement
    });
  } catch (err) {
    console.error('Error updating item:', err);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// Delete an item
app.delete('/api/items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM items WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json({ message: 'Item deleted successfully' });
  } catch (err) {
    console.error('Error deleting item:', err);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// ============== PROFILE ENDPOINTS ==============

// Get all profiles with their box relationships
app.get('/api/profiles', async (req, res) => {
  try {
    const profilesResult = await pool.query('SELECT * FROM profiles ORDER BY id ASC');

    const profiles = await Promise.all(
      profilesResult.rows.map(async (profile) => {
        const boxesResult = await pool.query(
          'SELECT box_id FROM profile_boxes WHERE profile_id = $1',
          [profile.id]
        );
        return {
          id: profile.id,
          name: profile.name,
          requiredBoxes: boxesResult.rows.map(row => row.box_id)
        };
      })
    );

    res.json(profiles);
  } catch (err) {
    console.error('Error fetching profiles:', err);
    res.status(500).json({ error: 'Failed to fetch profiles' });
  }
});

// Create a new profile
app.post('/api/profiles', async (req, res) => {
  try {
    const { name, requiredBoxes } = req.body;

    const result = await pool.query(
      'INSERT INTO profiles (name) VALUES ($1) RETURNING *',
      [name]
    );

    const profile = result.rows[0];

    // Add box relationships if provided
    if (requiredBoxes && requiredBoxes.length > 0) {
      const values = requiredBoxes.map(boxId => `(${profile.id}, ${boxId})`).join(',');
      await pool.query(`INSERT INTO profile_boxes (profile_id, box_id) VALUES ${values}`);
    }

    res.status(201).json({
      id: profile.id,
      name: profile.name,
      requiredBoxes: requiredBoxes || []
    });
  } catch (err) {
    console.error('Error creating profile:', err);
    res.status(500).json({ error: 'Failed to create profile' });
  }
});

// Update a profile
app.put('/api/profiles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, requiredBoxes } = req.body;

    // Update profile name
    const result = await pool.query(
      'UPDATE profiles SET name = $1 WHERE id = $2 RETURNING *',
      [name, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Update box relationships
    if (requiredBoxes !== undefined) {
      await pool.query('DELETE FROM profile_boxes WHERE profile_id = $1', [id]);

      if (requiredBoxes.length > 0) {
        const values = requiredBoxes.map(boxId => `(${id}, ${boxId})`).join(',');
        await pool.query(`INSERT INTO profile_boxes (profile_id, box_id) VALUES ${values}`);
      }
    }

    res.json({
      id: result.rows[0].id,
      name: result.rows[0].name,
      requiredBoxes: requiredBoxes || []
    });
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Delete a profile
app.delete('/api/profiles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM profiles WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json({ message: 'Profile deleted successfully' });
  } catch (err) {
    console.error('Error deleting profile:', err);
    res.status(500).json({ error: 'Failed to delete profile' });
  }
});

// ============== TEMPLATE ENDPOINTS ==============

// Get all templates with their items
app.get('/api/templates', async (req, res) => {
  try {
    const templatesResult = await pool.query('SELECT * FROM templates ORDER BY id ASC');

    const templates = await Promise.all(
      templatesResult.rows.map(async (template) => {
        const itemsResult = await pool.query(
          'SELECT * FROM template_items WHERE template_id = $1 ORDER BY id ASC',
          [template.id]
        );
        return {
          id: template.id,
          name: template.name,
          items: itemsResult.rows.map(item => ({
            name: item.name,
            quantity: item.quantity
          }))
        };
      })
    );

    res.json(templates);
  } catch (err) {
    console.error('Error fetching templates:', err);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// Create a new template
app.post('/api/templates', async (req, res) => {
  try {
    const { name, items } = req.body;

    const result = await pool.query(
      'INSERT INTO templates (name) VALUES ($1) RETURNING *',
      [name]
    );

    const template = result.rows[0];

    // Add template items if provided
    if (items && items.length > 0) {
      for (const item of items) {
        await pool.query(
          'INSERT INTO template_items (template_id, name, quantity) VALUES ($1, $2, $3)',
          [template.id, item.name, item.quantity || 1]
        );
      }
    }

    res.status(201).json({
      id: template.id,
      name: template.name,
      items: items || []
    });
  } catch (err) {
    console.error('Error creating template:', err);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// Update a template
app.put('/api/templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, items } = req.body;

    // Update template name
    const result = await pool.query(
      'UPDATE templates SET name = $1 WHERE id = $2 RETURNING *',
      [name, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Update template items
    if (items !== undefined) {
      await pool.query('DELETE FROM template_items WHERE template_id = $1', [id]);

      if (items.length > 0) {
        for (const item of items) {
          await pool.query(
            'INSERT INTO template_items (template_id, name, quantity) VALUES ($1, $2, $3)',
            [id, item.name, item.quantity || 1]
          );
        }
      }
    }

    res.json({
      id: result.rows[0].id,
      name: result.rows[0].name,
      items: items || []
    });
  } catch (err) {
    console.error('Error updating template:', err);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// Delete a template
app.delete('/api/templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM templates WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({ message: 'Template deleted successfully' });
  } catch (err) {
    console.error('Error deleting template:', err);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Scout Packing API running on port ${PORT}`);
});
