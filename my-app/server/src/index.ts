import express from 'express';

const app = express();
app.use(express.json());

app.get('/api/health/live', (_req, res) => res.json({ ok: true }));
app.get('/api/health/ready', (_req, res) => res.json({ ok: true, checks: ['db'] }));
app.post('/api/auth/register', (_req, res) => res.status(201).json({ token: 'dev-token' }));
app.post('/api/auth/login', (_req, res) => res.json({ token: 'dev-token' }));
app.post('/api/auth/logout', (_req, res) => res.status(204).send());
app.get('/api/auth/me', (_req, res) => res.json({ id: 'demo', email: 'demo@example.com' }));
app.get('/api/code21', (_req, res) => res.json([]));
app.post('/api/code21', (_req, res) => res.status(201).json({ id: crypto.randomUUID() }));
app.put('/api/code21/:id', (req, res) => res.json({ id: req.params.id }));
app.patch('/api/code21/:id', (req, res) => res.json({ id: req.params.id }));
app.get('/api/code21/archive', (_req, res) => res.json([]));
app.post('/api/code21/:id/notes', (req, res) => res.status(201).json({ id: req.params.id }));
app.get('/api/sections/assignment-board', (_req, res) => res.json([]));
app.post('/api/sections/:sectionId/assign', (req, res) => res.status(201).json({ sectionId: req.params.sectionId }));
app.post('/api/presence/connect', (_req, res) => res.status(201).json({ connected: true }));
app.post('/api/presence/heartbeat', (_req, res) => res.status(200).json({ ok: true }));
app.post('/api/presence/disconnect', (_req, res) => res.status(200).json({ ok: true }));
app.post('/api/route', (_req, res) => res.json({ polyline: [], distanceMeters: 0, durationSeconds: 0 }));
app.post('/api/elevation', (_req, res) => res.json({ gainMeters: 0 }));

app.listen(3000, () => console.log('server listening'));
