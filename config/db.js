import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3307,
    dialect: 'mysql',
    logging: false,
    dialectOptions: {
      connectTimeout: 60000,
    },
    pool: {
      max: 2,
      min: 0,
      acquire: 60000,
      idle: 5000,
      evict: 5000
    }
  }
);

export const connectDB = async (retries = 5) => {
  for (let i = 0; i < retries; i++) {
    try {
      await sequelize.authenticate();
      console.log('✓ MySQL Database Connected successfully.');
      return;
    } catch (error) {
      console.error(`❌ DB connect attempt ${i + 1}/${retries} failed:`, error.message);
      if (i < retries - 1) {
        const wait = (i + 1) * 3000;
        console.log(`⏳ Retrying in ${wait / 1000}s...`);
        await new Promise(r => setTimeout(r, wait));
      } else {
        throw error;
      }
    }
  }
};

export default sequelize;