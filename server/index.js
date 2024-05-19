const keys = require('./keys');

// Express App Setup
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Postgres Client Setup
const { Pool } = require('pg');
const pgClient = new Pool({
  user: keys.pgUser,
  host: keys.pgHost,
  database: keys.pgDatabase,
  password: keys.pgPassword,
  port: keys.pgPort,
  ssl:
    process.env.NODE_ENV !== 'production'
      ? false
      : { rejectUnauthorized: false },
});

pgClient.on('connect', (client) => {
  client
    .query('CREATE TABLE IF NOT EXISTS values (number INT)')
    .catch((err) => console.error(err));
});

// Redis Client Setup using ioredis
const Redis = require('ioredis');
const redisClient = new Redis({
  host: keys.redisHost,
  port: keys.redisPort,
  retryStrategy: times => Math.min(times * 100, 1000),
});

// Duplicate the Redis client for publishing
const redisPublisher = new Redis({
  host: keys.redisHost,
  port: keys.redisPort,
  retryStrategy: times => Math.min(times * 100, 1000),
});

// Express route handlers

app.get('/', (req, res) => {
  res.send('Hi');
});

app.get('/values/all', async (req, res) => {
  const values = await pgClient.query('SELECT * from values');
  res.send(values.rows);
});

app.get('/values/current', async (req, res) => {
  try {
    const values = await redisClient.hgetall('values');
    res.send(values);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.post('/values', async (req, res) => {
  const index = req.body.index;

  if (parseInt(index) > 40) {
    return res.status(422).send('Index too high');
  }

  try {
    await redisClient.hset('values', index, 'Nothing yet!');
    await redisPublisher.publish('insert', index);
    await pgClient.query('INSERT INTO values(number) VALUES($1)', [index]);
    res.send({ working: true });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.listen(5000, (err) => {
  console.log('Listening');
});
