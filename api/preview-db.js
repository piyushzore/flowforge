import { Pool } from 'pg';
import mysql from 'mysql2/promise';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type, host, port, user, password, database, table } = req.body;

  if (!type || !host || !user || !password || !database || !table) {
    return res.status(400).json({ error: 'Missing required connection configuration parameters.' });
  }

  try {
    let rows = [];
    let schemaFields = [];

    if (type === 'postgres') {
      const pool = new Pool({
        host,
        port: parseInt(port || '5432'),
        user,
        password,
        database,
        ssl: { rejectUnauthorized: false } // Common for cloud DBs
      });
      
      const client = await pool.connect();
      try {
        const result = await client.query(`SELECT * FROM ${table} LIMIT 100`);
        rows = result.rows;
        
        schemaFields = result.fields.map(f => {
          // Simplistic type mapping
          let fieldType = 'String';
          switch (f.dataTypeID) {
            case 20: // int8
            case 21: // int2
            case 23: // int4
              fieldType = 'Integer';
              break;
            case 700: // float4
            case 701: // float8
            case 1700: // numeric
              fieldType = 'Decimal';
              break;
            case 16: // bool
              fieldType = 'Boolean';
              break;
            case 1082: // date
            case 1114: // timestamp
            case 1184: // timestamptz
              fieldType = 'Timestamp';
              break;
            case 114: // json
            case 3802: // jsonb
              fieldType = 'JSON';
              break;
          }
          return { name: f.name, type: fieldType };
        });
      } finally {
        client.release();
        await pool.end();
      }
    } else if (type === 'mysql') {
      const connection = await mysql.createConnection({
        host,
        port: parseInt(port || '3306'),
        user,
        password,
        database
      });
      
      const [results, fields] = await connection.execute(`SELECT * FROM ${table} LIMIT 100`);
      rows = results;
      
      schemaFields = fields.map(f => {
        let fieldType = 'String';
        switch (f.type) {
          case 1: // TINY
          case 2: // SHORT
          case 3: // LONG
          case 8: // LONGLONG
          case 9: // INT24
            fieldType = 'Integer';
            break;
          case 4: // FLOAT
          case 5: // DOUBLE
          case 246: // NEWDECIMAL
            fieldType = 'Decimal';
            break;
          case 7: // TIMESTAMP
          case 10: // DATE
          case 12: // DATETIME
            fieldType = 'Timestamp';
            break;
          case 245: // JSON
            fieldType = 'JSON';
            break;
        }
        return { name: f.name, type: fieldType };
      });
      
      await connection.end();
    } else {
      return res.status(400).json({ error: `Unsupported database type: ${type}` });
    }

    return res.status(200).json({ rows, schema: schemaFields });
  } catch (error) {
    console.error('Database connection error:', error);
    return res.status(500).json({ error: error.message || 'Failed to connect to the database.' });
  }
}
