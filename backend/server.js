import express from 'express';
import cors from 'cors';
import transactionRoutes from './routes/transactions.js';
import budgetRoutes from './routes/budgets.js';
import statsRoutes from './routes/stats.js';
import { initDatabase } from './models/database.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api/transactions', transactionRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/stats', statsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

initDatabase();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
