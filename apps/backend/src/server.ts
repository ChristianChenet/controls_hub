import { ambiente } from './configuracao/ambiente.js';
import { criarApp } from './app.js';

const app = await criarApp();

await app.listen({
  port: ambiente.porta,
  host: '0.0.0.0'
});

